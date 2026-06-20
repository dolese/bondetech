const express = require("express");
const { getDb } = require("../db");
const { resolveSessionUser, canReadClassData } = require("../../lib/auth");
const {
  getBeemSmsConfig,
  getBeemDeliveryReport,
  sendBeemSms,
  sendBeemSmsJobs,
} = require("../../lib/beemSms");
const { listSmsHistory, refreshPendingSmsHistory, saveSmsHistory } = require("../../lib/smsHistory");

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

router.get("/", async (req, res) => {
  const config = getBeemSmsConfig();
  if (config.configured && req.query?.refreshDelivery === "true") {
    await refreshPendingSmsHistory(getDb(), { getDeliveryReport: getBeemDeliveryReport });
  }
  const history = await listSmsHistory(getDb(), {
    limit: req.query?.limit || 20,
    indexNo: req.query?.indexNo || "",
    phone: req.query?.phone || "",
  });
  return res.json({
    configured: config.configured,
    senderId: config.senderId,
    endpoint: config.endpoint,
    batchSize: config.batchSize,
    history,
  });
});

router.post("/", async (req, res) => {
  try {
    const result = Array.isArray(req.body?.jobs) && req.body.jobs.length
      ? await sendBeemSmsJobs({
          jobs: req.body.jobs.map((job, index) => ({
            key: job.key || `job-${index + 1}`,
            recipientName: job.recipientName || "",
            recipientPhone: job.recipientPhone || "",
            message: job.message,
            recipients: job.recipients,
            senderId: job.senderId,
            scheduleTime: job.scheduleTime,
          })),
          senderId: req.body?.senderId,
          scheduleTime: req.body?.scheduleTime,
        })
      : await sendBeemSms({
          message: req.body?.message,
          recipients: req.body?.recipients,
          senderId: req.body?.senderId,
          scheduleTime: req.body?.scheduleTime,
        });
    const historyEntry = await saveSmsHistory(getDb(), { body: req.body, result, currentUser: req.currentUser });
    return res.json({
      ...result,
      historyEntry,
      requestedBy: req.currentUser.username,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    try {
      await saveSmsHistory(getDb(), {
        body: req.body || {},
        result: { successful: false, error: err.message, totalRequested: 0 },
        currentUser: req.currentUser,
      });
    } catch {
      // Delivery failure remains the primary error if history persistence also fails.
    }
    const status = /required|valid|configured/i.test(err.message) ? 400 : 502;
    return res.status(status).json({ error: err.message });
  }
});

module.exports = router;
