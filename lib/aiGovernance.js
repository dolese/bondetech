"use strict";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;
const rateLimitBuckets = new Map();

function nowMs() {
  return Date.now();
}

function cleanOldBuckets(now = nowMs()) {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (now - bucket.windowStart > WINDOW_MS) {
      rateLimitBuckets.delete(key);
    }
  }
}

function makeRateKey(user, req) {
  const username = String(user?.username || "unknown");
  const ip = String(req?.headers?.["x-forwarded-for"] || req?.ip || req?.socket?.remoteAddress || "");
  return `${username}:${ip}`;
}

function assertAiRateLimit(user, req) {
  const now = nowMs();
  cleanOldBuckets(now);
  const key = makeRateKey(user, req);
  const existing = rateLimitBuckets.get(key);
  if (!existing || now - existing.windowStart > WINDOW_MS) {
    rateLimitBuckets.set(key, { count: 1, windowStart: now });
    return { remaining: MAX_REQUESTS_PER_WINDOW - 1, limit: MAX_REQUESTS_PER_WINDOW, windowMs: WINDOW_MS };
  }
  existing.count += 1;
  if (existing.count > MAX_REQUESTS_PER_WINDOW) {
    const err = new Error("Rate limit exceeded for AI chat. Please wait and try again.");
    err.status = 429;
    throw err;
  }
  return {
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - existing.count),
    limit: MAX_REQUESTS_PER_WINDOW,
    windowMs: WINDOW_MS,
  };
}

function buildAiCitations({ activeClass = null, activeExam = "", toolCalls = [], actionMode = false }) {
  return {
    classId: activeClass?.id || "",
    classLabel:
      [activeClass?.form, activeClass?.stream, activeClass?.year].filter(Boolean).join(" ").trim() ||
      activeClass?.name ||
      "",
    examType: String(activeExam || activeClass?.schoolInfo?.exam || activeClass?.school_info?.exam || "").trim(),
    studentCount: Number(activeClass?.studentCount || activeClass?.student_count || activeClass?.students?.length || 0),
    toolsUsed: (toolCalls || []).map((call) => call.name),
    actionMode,
  };
}

function buildAiConfidence({ citations, toolCalls = [] }) {
  if (!toolCalls.length) {
    return {
      level: "low",
      reasons: ["No tool calls were used; response may be generic."],
    };
  }
  const failedCalls = toolCalls.filter((call) => call.status !== "success");
  if (failedCalls.length > 0) {
    return {
      level: "medium",
      reasons: [
        `${failedCalls.length} tool call(s) returned an error.`,
        citations?.studentCount ? `Context had ${citations.studentCount} student records.` : "Limited context was available.",
      ],
    };
  }
  return {
    level: "high",
    reasons: [
      "Response was grounded in successful tool calls.",
      citations?.studentCount ? `Context included ${citations.studentCount} student records.` : "Context included selected class and exam metadata.",
    ],
  };
}

async function recordAiAuditLog(db, payload = {}) {
  const event = {
    username: String(payload?.user?.username || ""),
    role: String(payload?.user?.role || ""),
    actionMode: payload?.actionMode === true,
    responseLanguage: String(payload?.responseLanguage || "en"),
    guardianTone: String(payload?.guardianTone || "formal"),
    activeClassId: String(payload?.activeClassId || ""),
    activeExam: String(payload?.activeExam || ""),
    promptPreview: String(payload?.promptPreview || "").slice(0, 500),
    toolCalls: Array.isArray(payload?.toolCalls) ? payload.toolCalls : [],
    outcome: String(payload?.outcome || "success"),
    error: String(payload?.error || ""),
    provider: String(payload?.provider || ""),
    model: String(payload?.model || ""),
    ip: String(payload?.ip || ""),
    userAgent: String(payload?.userAgent || ""),
    createdAt: new Date().toISOString(),
  };
  await db.collection("ai_audit_logs").add(event);
}

module.exports = {
  assertAiRateLimit,
  buildAiCitations,
  buildAiConfidence,
  recordAiAuditLog,
};
