const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");
const { resolveSessionUser, canReadClassData } = require("../../lib/auth");
const { getClassWithStudents } = require("../../lib/classes");
const { buildAiSystemPrompt } = require("../../lib/aiPrompt");
const { getAiToolDefinitions, executeAiTool } = require("../../lib/aiTools");
const { runAiConversation } = require("../../lib/aiProviders");

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
    });
    const response = await runAiConversation({
      instructions,
      messages,
      toolDefinitions: getAiToolDefinitions(),
      executeTool: (call) => executeAiTool(db, currentUser, call),
    });

    return sendJson(res, 200, {
      reply: response.reply,
      model: response.model,
      provider: response.provider,
    });
  } catch (err) {
    return sendJson(res, err.status || 500, { error: err.message || "Unable to complete AI request" });
  }
};
