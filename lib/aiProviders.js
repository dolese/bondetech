"use strict";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function buildProviderError(message, status, code) {
  const error = new Error(message);
  error.status = status || 500;
  error.code = code || "";
  return error;
}

function toOpenAiInputMessages(messages = []) {
  return messages.map((entry) => ({
    role: entry.role,
    content: [
      {
        type: entry.role === "assistant" ? "output_text" : "input_text",
        text: entry.content,
      },
    ],
  }));
}

function toGeminiHistory(messages = []) {
  return messages.map((entry) => ({
    role: entry.role === "assistant" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));
}

function sanitizeGeminiSchema(schema = {}) {
  const next = {};
  if (schema.type) next.type = schema.type;
  if (schema.description) next.description = schema.description;
  if (Array.isArray(schema.enum)) next.enum = schema.enum;
  if (Array.isArray(schema.required)) next.required = schema.required;
  if (schema.items && typeof schema.items === "object") {
    next.items = sanitizeGeminiSchema(schema.items);
  }
  if (schema.properties && typeof schema.properties === "object") {
    next.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, sanitizeGeminiSchema(value)])
    );
  }
  return next;
}

function toGeminiTools(toolDefinitions = []) {
  return [
    {
      functionDeclarations: toolDefinitions
        .filter((tool) => tool?.type === "function" && tool?.name)
        .map((tool) => ({
          name: tool.name,
          description: tool.description || "",
          parameters: sanitizeGeminiSchema(
            tool.parameters || { type: "object", properties: {} }
          ),
        })),
    },
  ];
}

function extractGeminiFunctionCalls(content) {
  return (content?.parts || [])
    .map((part) => part?.functionCall)
    .filter(Boolean);
}

function extractGeminiText(response) {
  const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
  const texts = [];
  candidates.forEach((candidate) => {
    (candidate?.content?.parts || []).forEach((part) => {
      if (typeof part?.text === "string" && part.text.trim()) {
        texts.push(part.text);
      }
    });
  });
  return texts.join("\n").trim();
}

async function callOpenAi(payload, apiKey) {
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
    throw buildProviderError(
      data?.error?.message || data?.error || "OpenAI request failed",
      response.status,
      data?.error?.code || ""
    );
  }
  return data;
}

async function callGemini(model, payload, apiKey) {
  const response = await fetch(`${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw buildProviderError(
      data?.error?.message || data?.error || "Gemini request failed",
      response.status,
      data?.error?.status || ""
    );
  }
  return data;
}

function shouldFallbackToGemini(error) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (code === "insufficient_quota") return true;
  if (status === 429 && (message.includes("quota") || message.includes("billing") || message.includes("credits") || message.includes("current quota"))) {
    return true;
  }
  return false;
}

async function runOpenAiConversation({
  apiKey,
  model = DEFAULT_OPENAI_MODEL,
  instructions,
  messages,
  toolDefinitions,
  executeTool,
}) {
  let response = await callOpenAi(
    {
      model,
      instructions,
      tools: toolDefinitions,
      input: toOpenAiInputMessages(messages),
    },
    apiKey
  );

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const toolCalls = Array.isArray(response?.output)
      ? response.output.filter((item) => item.type === "function_call")
      : [];
    if (!toolCalls.length) break;

    const toolOutputs = [];
    for (const call of toolCalls) {
      try {
        const result = await executeTool(call);
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

    response = await callOpenAi(
      {
        model,
        previous_response_id: response.id,
        input: toolOutputs,
      },
      apiKey
    );
  }

  return {
    provider: "openai",
    model,
    reply: response?.output_text || "I could not generate a response.",
  };
}

async function runGeminiConversation({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  instructions,
  messages,
  toolDefinitions,
  executeTool,
}) {
  const history = toGeminiHistory(messages);
  const tools = toGeminiTools(toolDefinitions);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await callGemini(
      model,
      {
        system_instruction: {
          parts: [{ text: instructions }],
        },
        tools,
        tool_config: {
          function_calling_config: {
            mode: "AUTO",
          },
        },
        contents: history,
      },
      apiKey
    );

    const candidateContent = response?.candidates?.[0]?.content || null;
    const functionCalls = extractGeminiFunctionCalls(candidateContent);
    if (candidateContent) {
      history.push(candidateContent);
    }

    if (!functionCalls.length) {
      return {
        provider: "gemini",
        model,
        reply: extractGeminiText(response) || "I could not generate a response.",
      };
    }

    const functionResponseParts = [];
    for (const call of functionCalls) {
      try {
        const result = await executeTool({
          name: call.name,
          arguments: JSON.stringify(call.args || {}),
        });
        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { result },
          },
        });
      } catch (err) {
        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { error: err.message },
          },
        });
      }
    }

    history.push({
      role: "user",
      parts: functionResponseParts,
    });
  }

  return {
    provider: "gemini",
    model,
    reply: "I could not generate a response.",
  };
}

async function runAiConversation({
  instructions,
  messages,
  toolDefinitions,
  executeTool,
}) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openAiKey && !geminiKey) {
    throw buildProviderError(
      "No AI provider is configured. Set OPENAI_API_KEY or GEMINI_API_KEY on the server.",
      503
    );
  }

  if (openAiKey) {
    try {
      return await runOpenAiConversation({
        apiKey: openAiKey,
        model: DEFAULT_OPENAI_MODEL,
        instructions,
        messages,
        toolDefinitions,
        executeTool,
      });
    } catch (err) {
      if (!geminiKey || !shouldFallbackToGemini(err)) {
        throw err;
      }
    }
  }

  if (!geminiKey) {
    throw buildProviderError("GEMINI_API_KEY is not configured on the server", 503);
  }

  return runGeminiConversation({
    apiKey: geminiKey,
    model: DEFAULT_GEMINI_MODEL,
    instructions,
    messages,
    toolDefinitions,
    executeTool,
  });
}

module.exports = {
  runAiConversation,
  shouldFallbackToGemini,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_GEMINI_MODEL,
};
