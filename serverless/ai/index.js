const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");
const { resolveSessionUser, canReadClassData } = require("../../lib/auth");
const { getClassWithStudents } = require("../../lib/classes");
const { buildAiSystemPrompt } = require("../../lib/aiPrompt");
const { getAiToolDefinitions, executeAiTool } = require("../../lib/aiTools");

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5";

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
  if (!process.env.OPENAI_API_KEY) {
    return sendJson(res, 503, { error: "OPENAI_API_KEY is not configured on the server" });
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

    const createResponse = async (payload) => {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.error || "OpenAI request failed");
      }
      return data;
    };

    let response = await createResponse({
      model: DEFAULT_MODEL,
      instructions,
      tools: getAiToolDefinitions(),
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
          const result = await executeAiTool(db, currentUser, call);
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

    return sendJson(res, 200, {
      reply: response?.output_text || "I could not generate a response.",
      model: DEFAULT_MODEL,
    });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || "Unable to complete AI request" });
  }
};
