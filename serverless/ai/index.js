const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");
const { resolveSessionUser, canReadClassData } = require("../../lib/auth");
const { getClassWithStudents } = require("../../lib/classes");
const { buildAiSystemPrompt } = require("../../lib/aiPrompt");
const { getAiToolDefinitions, executeAiTool } = require("../../lib/aiTools");
const { runAiConversation } = require("../../lib/aiProviders");
const {
  assertAiRateLimit,
  buildAiCitations,
  buildAiConfidence,
  recordAiAuditLog,
} = require("../../lib/aiGovernance");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const db = getDb();
  let currentUser;
  try {
    currentUser = await resolveSessionUser(db, req);
  } catch (err) {
    return sendJson(res, 401, { error: err.message });
  }
  if (!currentUser) {
    return sendJson(res, 401, { error: "Authentication required" });
  }
  if (!canReadClassData(currentUser.role)) {
    return sendJson(res, 403, { error: "You do not have permission to use the AI assistant" });
  }
  try {
    assertAiRateLimit(currentUser, req);
  } catch (err) {
    return sendJson(res, err.status || 429, { error: err.message });
  }

  try {
    const body = await readJsonBody(req);
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const messages = rawMessages
      .map((entry) => ({
        role: entry?.role === "assistant" ? "assistant" : "user",
        content: String(entry?.content || "").trim(),
      }))
      .filter((entry) => entry.content)
      .slice(-12);

    if (!messages.length) {
      return sendJson(res, 400, { error: "At least one chat message is required" });
    }

    const context = body?.context && typeof body.context === "object" ? body.context : {};
    const actionMode = context.actionMode === true;
    const responseLanguage = String(context.responseLanguage || "en").trim() === "sw" ? "sw" : "en";
    const guardianTone = ["formal", "concise", "urgent"].includes(String(context.guardianTone || "").trim().toLowerCase())
      ? String(context.guardianTone || "").trim().toLowerCase()
      : "formal";
    let activeClass = null;
    if (context.activeClassId) {
      try {
        activeClass = await getClassWithStudents(db, context.activeClassId);
      } catch {
        activeClass = null;
      }
    }

    const instructions = buildAiSystemPrompt({
      user: currentUser,
      activeClass,
      activeExam: String(context.activeExam || "").trim(),
      actionMode,
      responseLanguage,
      guardianTone,
    });
    const toolCalls = [];
    let actionDraft = null;
    const response = await runAiConversation({
      instructions,
      messages,
      toolDefinitions: getAiToolDefinitions({ actionMode }),
      executeTool: async (call) => {
        try {
          const result = await executeAiTool(db, currentUser, call);
          toolCalls.push({ name: call?.name || "", status: "success" });
          if (call?.name === "build_guardian_contact_queue") {
            actionDraft = result;
          }
          return result;
        } catch (err) {
          toolCalls.push({ name: call?.name || "", status: "error", error: err.message || "Tool failed" });
          throw err;
        }
      },
    });
    const citations = buildAiCitations({
      activeClass,
      activeExam: String(context.activeExam || "").trim(),
      toolCalls,
      actionMode,
    });
    const confidence = buildAiConfidence({ citations, toolCalls });
    await recordAiAuditLog(db, {
      user: currentUser,
      actionMode,
      responseLanguage,
      guardianTone,
      activeClassId: activeClass?.id || context.activeClassId || "",
      activeExam: String(context.activeExam || "").trim(),
      promptPreview: messages[messages.length - 1]?.content || "",
      toolCalls,
      provider: response.provider,
      model: response.model,
      ip: req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "",
      userAgent: req.headers?.["user-agent"] || "",
      outcome: "success",
    });

    return sendJson(res, 200, {
      reply: response.reply,
      model: response.model,
      provider: response.provider,
      meta: {
        citations,
        confidence,
        actionDraft,
      },
    });
  } catch (err) {
    try {
      const body = typeof req.body === "object" ? req.body : {};
      const context = body?.context && typeof body.context === "object" ? body.context : {};
      await recordAiAuditLog(db, {
        user: currentUser,
        actionMode: context.actionMode === true,
        responseLanguage: String(context.responseLanguage || "en").trim() === "sw" ? "sw" : "en",
        guardianTone: String(context.guardianTone || "formal"),
        activeClassId: String(context.activeClassId || ""),
        activeExam: String(context.activeExam || "").trim(),
        outcome: "error",
        error: err.message || "Unable to complete AI request",
        ip: req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "",
        userAgent: req.headers?.["user-agent"] || "",
      });
    } catch (_) {}
    return sendJson(res, err.status || 500, { error: err.message || "Unable to complete AI request" });
  }
};
