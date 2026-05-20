const express = require("express");
const { getDb } = require("../db");
const { resolveSessionUser, canReadClassData } = require("../../lib/auth");
const { getBeemSmsConfig, normalizeRecipients, sendBeemSms } = require("../../lib/beemSms");

const router = express.Router();

router.use(async (req, res, next) => {
  try {
    const currentUser = await resolveSessionUser(getDb(), req);
    if (!currentUser) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!canReadClassData(currentUser.role)) {
      return res.status(403).json({ error: "You do not have permission to use SMS" });
    }
    req.currentUser = currentUser;
    return next();
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

router.get("/", (req, res) => {
  const config = getBeemSmsConfig();
  return res.json({
    configured: config.configured,
    senderId: config.senderId,
    endpoint: config.endpoint,
    batchSize: config.batchSize,
  });
});

router.post("/", async (req, res) => {
  try {
    const normalizedRecipients = normalizeRecipients(req.body?.recipients);
    const result = await sendBeemSms({
      message: req.body?.message,
      recipients: normalizedRecipients,
      senderId: req.body?.senderId,
      scheduleTime: req.body?.scheduleTime,
    });
    return res.json({
      ...result,
      requestedBy: req.currentUser.username,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    const status = /required|valid|configured/i.test(err.message) ? 400 : 502;
    return res.status(status).json({ error: err.message });
  }
});

module.exports = router;
