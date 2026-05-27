const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { resolveSessionUser, canReadClassData } = require("../../lib/auth");
const { getClassWithStudents } = require("../../lib/classes");
const { buildAiSystemPrompt } = require("../../lib/aiPrompt");
const { getAiToolDefinitions, executeAiTool } = require("../../lib/aiTools");

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5";

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "OPENAI_API_KEY is not configured on the server" });
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

  const createResponse = async (payload) => {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || "OpenAI request failed");
    }
    return data;
  };

  try {
    const toolDefinitions = getAiToolDefinitions();
    let response = await createResponse({
      model: DEFAULT_MODEL,
      instructions,
      tools: toolDefinitions,
      input: messages.map((entry) => ({
        role: entry.role,
        content: [{ type: "input_text", text: entry.content }],
      })),
    });

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const toolCalls = Array.isArray(response?.output)
        ? response.output.filter((item) => item.type === "function_call")
        : [];
      if (!toolCalls.length) break;

      const toolOutputs = [];
      for (const call of toolCalls) {
        try {
          const result = await executeAiTool(getDb(), req.authUser, call);
          toolOutputs.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(result),
          });
        } catch (err) {
          toolOutputs.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify({ error: err.message }),
          });
        }
      }

      response = await createResponse({
        model: DEFAULT_MODEL,
        previous_response_id: response.id,
        input: toolOutputs,
      });
    }

    return res.json({
      reply: response?.output_text || "I could not generate a response.",
      model: DEFAULT_MODEL,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unable to complete AI request" });
  }
});

module.exports = router;
