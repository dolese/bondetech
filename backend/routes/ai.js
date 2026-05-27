const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { resolveSessionUser, canReadClassData } = require("../../lib/auth");
const { getClassWithStudents } = require("../../lib/classes");
const { buildAiSystemPrompt } = require("../../lib/aiPrompt");
const { getAiToolDefinitions, executeAiTool } = require("../../lib/aiTools");
const { runAiConversation } = require("../../lib/aiProviders");

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
  });
  try {
    const toolDefinitions = getAiToolDefinitions();
    const response = await runAiConversation({
      instructions,
      messages,
      toolDefinitions,
      executeTool: (call) => executeAiTool(getDb(), req.authUser, call),
    });

    return res.json({
      reply: response.reply,
      model: response.model,
      provider: response.provider,
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "Unable to complete AI request" });
  }
});

module.exports = router;
