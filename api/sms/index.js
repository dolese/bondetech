const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");
const { resolveSessionUser, canReadClassData } = require("../../lib/auth");
const { getBeemSmsConfig, normalizeRecipients, sendBeemSms } = require("../../lib/beemSms");

module.exports = async (req, res) => {
  let currentUser;
  try {
    currentUser = await resolveSessionUser(getDb(), req);
  } catch (err) {
    return sendJson(res, 401, { error: err.message });
  }

  if (!currentUser) {
    return sendJson(res, 401, { error: "Authentication required" });
  }
  if (!canReadClassData(currentUser.role)) {
    return sendJson(res, 403, { error: "You do not have permission to use SMS" });
  }

  if (req.method === "GET") {
    const config = getBeemSmsConfig();
    return sendJson(res, 200, {
      configured: config.configured,
      senderId: config.senderId,
      endpoint: config.endpoint,
      batchSize: config.batchSize,
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const normalizedRecipients = normalizeRecipients(body.recipients);
    const result = await sendBeemSms({
      message: body.message,
      recipients: normalizedRecipients,
      senderId: body.senderId,
      scheduleTime: body.scheduleTime,
    });
    return sendJson(res, 200, {
      ...result,
      requestedBy: currentUser.username,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    const status = /required|valid|configured/i.test(err.message) ? 400 : 502;
    return sendJson(res, status, { error: err.message });
  }
};
