const DEFAULT_BEEM_SMS_ENDPOINT = "https://apisms.beem.africa/v1/send";
const DEFAULT_BATCH_SIZE = 200;

function getBeemSmsConfig() {
  const apiKey = String(process.env.BEEM_API_KEY || process.env.BEEM_SMS_API_KEY || "").trim();
  const secretKey = String(process.env.BEEM_SECRET_KEY || process.env.BEEM_SMS_SECRET_KEY || "").trim();
  const senderId = String(process.env.BEEM_SENDER_ID || process.env.BEEM_SMS_SENDER_ID || "").trim();
  const endpoint = String(process.env.BEEM_SMS_ENDPOINT || DEFAULT_BEEM_SMS_ENDPOINT).trim() || DEFAULT_BEEM_SMS_ENDPOINT;
  const batchSize = Math.max(1, Math.min(parseInt(process.env.BEEM_SMS_BATCH_SIZE || `${DEFAULT_BATCH_SIZE}`, 10) || DEFAULT_BATCH_SIZE, 500));

  return {
    apiKey,
    secretKey,
    senderId,
    endpoint,
    batchSize,
    configured: Boolean(apiKey && secretKey),
  };
}

function normalizeSmsPhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  const noPlus = digits.startsWith("+") ? digits.slice(1) : digits;
  if (/^255\d{9}$/.test(noPlus)) return noPlus;
  if (/^0\d{9}$/.test(noPlus)) return `255${noPlus.slice(1)}`;
  if (/^[67]\d{8}$/.test(noPlus)) return `255${noPlus}`;
  if (/^255\d+$/.test(noPlus)) return noPlus;
  return noPlus.replace(/\D/g, "");
}

function normalizeRecipients(recipients = []) {
  const deduped = new Map();

  (Array.isArray(recipients) ? recipients : []).forEach((entry, index) => {
    const phone = normalizeSmsPhone(entry?.phone || entry?.dest_addr || entry);
    if (!phone) return;
    if (!deduped.has(phone)) {
      deduped.set(phone, {
        recipient_id: String(entry?.recipient_id || entry?.id || index + 1),
        dest_addr: phone,
      });
    }
  });

  return Array.from(deduped.values());
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function parseGatewayResponse(response) {
  const text = await response.text();
  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  if (!text) return null;
  if (!isJson) return { message: text };
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function sendBeemSmsBatch({ message, recipients, senderId = "", scheduleTime = "" }) {
  const config = getBeemSmsConfig();
  if (!config.configured) {
    throw new Error("Beem Africa SMS is not configured. Set BEEM_API_KEY and BEEM_SECRET_KEY.");
  }
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) {
    throw new Error("SMS message is required");
  }
  const normalizedRecipients = normalizeRecipients(recipients);
  if (!normalizedRecipients.length) {
    throw new Error("At least one valid SMS recipient is required");
  }

  const payload = {
    source_addr: String(senderId || config.senderId || "").trim(),
    encoding: 0,
    schedule_time: String(scheduleTime || "").trim(),
    message: cleanMessage,
    recipients: normalizedRecipients,
  };

  const auth = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString("base64");
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseGatewayResponse(response);
  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Beem Africa SMS request failed with HTTP ${response.status}`
    );
  }

  return {
    status: response.status,
    data,
    senderId: payload.source_addr,
    scheduled: payload.schedule_time,
    recipients: normalizedRecipients.length,
  };
}

async function sendBeemSms({ message, recipients, senderId = "", scheduleTime = "" }) {
  const config = getBeemSmsConfig();
  const normalizedRecipients = normalizeRecipients(recipients);
  if (!normalizedRecipients.length) {
    throw new Error("At least one valid SMS recipient is required");
  }

  const batches = chunkArray(normalizedRecipients, config.batchSize);
  const results = [];
  let valid = 0;
  let invalid = 0;
  let duplicates = normalizedRecipients.length - recipients.length;

  for (let index = 0; index < batches.length; index += 1) {
    const batchRecipients = batches[index];
    const result = await sendBeemSmsBatch({
      message,
      recipients: batchRecipients,
      senderId,
      scheduleTime,
    });
    results.push({
      batch: index + 1,
      recipients: batchRecipients.length,
      requestId: result.data?.request_id || result.data?.requestId || null,
      code: result.data?.code ?? null,
      message: result.data?.message || "Submitted",
      raw: result.data,
    });
    valid += Number(result.data?.valid ?? batchRecipients.length);
    invalid += Number(result.data?.invalid ?? 0);
    duplicates += Number(result.data?.duplicates ?? 0);
  }

  return {
    successful: results.every((entry) => Number(entry.code || 100) === 100),
    senderId: String(senderId || config.senderId || "").trim(),
    totalRequested: normalizedRecipients.length,
    batchCount: results.length,
    valid,
    invalid,
    duplicates,
    results,
  };
}

async function sendBeemSmsJobs({ jobs, senderId = "", scheduleTime = "" }) {
  const jobList = Array.isArray(jobs) ? jobs : [];
  if (!jobList.length) {
    throw new Error("At least one SMS job is required");
  }

  const results = [];
  let totalRequested = 0;
  let valid = 0;
  let invalid = 0;
  let duplicates = 0;

  for (let index = 0; index < jobList.length; index += 1) {
    const job = jobList[index] || {};
    const result = await sendBeemSms({
      message: job.message,
      recipients: job.recipients,
      senderId: job.senderId || senderId,
      scheduleTime: job.scheduleTime || scheduleTime,
    });
    totalRequested += Number(result.totalRequested || 0);
    valid += Number(result.valid || 0);
    invalid += Number(result.invalid || 0);
    duplicates += Number(result.duplicates || 0);
    results.push({
      job: index + 1,
      key: job.key || `job-${index + 1}`,
      recipientName: job.recipientName || "",
      recipientPhone: job.recipientPhone || "",
      message: job.message || "",
      ...result,
    });
  }

  return {
    successful: results.every((entry) => entry.successful !== false),
    senderId: String(senderId || getBeemSmsConfig().senderId || "").trim(),
    totalRequested,
    valid,
    invalid,
    duplicates,
    batchCount: results.reduce((sum, entry) => sum + Number(entry.batchCount || 0), 0),
    jobCount: results.length,
    results,
  };
}

module.exports = {
  getBeemSmsConfig,
  normalizeSmsPhone,
  normalizeRecipients,
  sendBeemSms,
  sendBeemSmsJobs,
};
