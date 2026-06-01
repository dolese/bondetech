const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
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

async function requireAuth(req, res, next) {
  try {
    const user = await resolveSessionUser(getDb(), req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    req.authUser = user;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

router.use(requireAuth);

router.post("/chat", async (req, res) => {
  if (!canReadClassData(req.authUser?.role)) {
    return res.status(403).json({ error: "You do not have permission to use the AI assistant" });
  }
  try {
    assertAiRateLimit(req.authUser, req);
  } catch (err) {
    return res.status(err.status || 429).json({ error: err.message });
  }

  const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = rawMessages
    .map((entry) => ({
      role: entry?.role === "assistant" ? "assistant" : "user",
      content: String(entry?.content || "").trim(),
    }))
    .filter((entry) => entry.content)
    .slice(-12);

  if (!messages.length) {
    return res.status(400).json({ error: "At least one chat message is required" });
  }

  const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  const actionMode = context.actionMode === true;
  const responseLanguage = String(context.responseLanguage || "en").trim() === "sw" ? "sw" : "en";
  const guardianTone = ["formal", "concise", "urgent"].includes(String(context.guardianTone || "").trim().toLowerCase())
    ? String(context.guardianTone || "").trim().toLowerCase()
    : "formal";
  let activeClass = null;
  if (context.activeClassId) {
    try {
      activeClass = await getClassWithStudents(getDb(), context.activeClassId);
    } catch {
      activeClass = null;
    }
  }

  const instructions = buildAiSystemPrompt({
    user: req.authUser,
    activeClass,
    activeExam: String(context.activeExam || "").trim(),
    actionMode,
    responseLanguage,
    guardianTone,
  });
  try {
    const toolDefinitions = getAiToolDefinitions({ actionMode });
    const toolCalls = [];
    let actionDraft = null;
    const response = await runAiConversation({
      instructions,
      messages,
      toolDefinitions,
      executeTool: async (call) => {
        try {
          const result = await executeAiTool(getDb(), req.authUser, call);
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
    await recordAiAuditLog(getDb(), {
      user: req.authUser,
      actionMode,
      responseLanguage,
      guardianTone,
      activeClassId: activeClass?.id || context.activeClassId || "",
      activeExam: String(context.activeExam || "").trim(),
      promptPreview: messages[messages.length - 1]?.content || "",
      toolCalls,
      provider: response.provider,
      model: response.model,
      ip: req.headers?.["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "",
      userAgent: req.headers?.["user-agent"] || "",
      outcome: "success",
    });

    return res.json({
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
      await recordAiAuditLog(getDb(), {
        user: req.authUser,
        actionMode,
        responseLanguage,
        guardianTone,
        activeClassId: activeClass?.id || context.activeClassId || "",
        activeExam: String(context.activeExam || "").trim(),
        promptPreview: messages[messages.length - 1]?.content || "",
        outcome: "error",
        error: err.message || "Unable to complete AI request",
        ip: req.headers?.["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "",
        userAgent: req.headers?.["user-agent"] || "",
      });
    } catch (_) {}
    return res.status(err.status || 500).json({ error: err.message || "Unable to complete AI request" });
  }
});

module.exports = router;
