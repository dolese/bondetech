const DEFAULT_BEEM_SMS_ENDPOINT = "https://apisms.beem.africa/v1/send";
const DEFAULT_BEEM_DLR_ENDPOINT = "https://dlrapi.beem.africa/public/v1/delivery-reports";
const DEFAULT_BATCH_SIZE = 200;

function getBeemSmsConfig() {
  const apiKey = String(process.env.BEEM_API_KEY || process.env.BEEM_SMS_API_KEY || "").trim();
  const secretKey = String(process.env.BEEM_SECRET_KEY || process.env.BEEM_SMS_SECRET_KEY || "").trim();
  const senderId = String(process.env.BEEM_SENDER_ID || process.env.BEEM_SMS_SENDER_ID || "").trim();
  const endpoint = String(process.env.BEEM_SMS_ENDPOINT || DEFAULT_BEEM_SMS_ENDPOINT).trim() || DEFAULT_BEEM_SMS_ENDPOINT;
  const deliveryEndpoint = String(process.env.BEEM_SMS_DLR_ENDPOINT || DEFAULT_BEEM_DLR_ENDPOINT).trim() || DEFAULT_BEEM_DLR_ENDPOINT;
  const batchSize = Math.max(1, Math.min(parseInt(process.env.BEEM_SMS_BATCH_SIZE || `${DEFAULT_BATCH_SIZE}`, 10) || DEFAULT_BATCH_SIZE, 500));

  return {
    apiKey,
    secretKey,
    senderId,
    endpoint,
    deliveryEndpoint,
    batchSize,
    configured: Boolean(apiKey && secretKey),
  };
}

function normalizeSmsPhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/[^\d+]/g, "");
  const noPlus = compact.startsWith("+") ? compact.slice(1) : compact;
  const digits = noPlus.replace(/\D/g, "");

  // Beem examples and best-practice docs consistently use Tanzanian
  // international mobile format: 255 + 9 digits (typically 6/7 prefix).
  if (/^255[67]\d{8}$/.test(digits)) return digits;
  if (/^0[67]\d{8}$/.test(digits)) return `255${digits.slice(1)}`;
  if (/^[67]\d{8}$/.test(digits)) return `255${digits}`;
  return "";
}

function normalizeRecipients(recipients = []) {
  const deduped = new Map();
  const seenStudents = new Set();

  (Array.isArray(recipients) ? recipients : []).forEach((entry, index) => {
    const phone = normalizeSmsPhone(entry?.phone || entry?.dest_addr || entry);
    if (!phone) return;
    const admissionNo = String(entry?.admissionNo || entry?.admission_no || "").trim().toUpperCase();
    const classId = String(entry?.classId || entry?.class_id || "").trim();
    const studentId = String(entry?.studentId || entry?.student_id || "").trim();
    const indexNo = String(entry?.indexNo || entry?.recipientIndexNo || "").trim();
    const studentKey = admissionNo
      ? `admission:${admissionNo}`
      : classId && studentId
      ? `record:${classId}:${studentId}`
      : classId && indexNo
      ? `index:${classId}:${indexNo}`
      : "";
    if (studentKey && seenStudents.has(studentKey)) return;
    const rawRecipientId = Number(entry?.recipient_id ?? entry?.id ?? index + 1);
    const recipientId = Number.isFinite(rawRecipientId) && rawRecipientId > 0 ? rawRecipientId : index + 1;
    if (!deduped.has(phone)) {
      if (studentKey) seenStudents.add(studentKey);
      deduped.set(phone, {
        recipient_id: recipientId,
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

function normalizeDeliveryStatus(value) {
  const status = String(value || "").trim().toUpperCase();
  if (status === "DELIVERED") return "delivered";
  if (status === "UNDELIVERED" || status === "FAILED" || status === "REJECTED") return "failed";
  return "pending";
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
  let duplicates = Math.max(0, (Array.isArray(recipients) ? recipients.length : 0) - normalizedRecipients.length);

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
      recipientPhones: batchRecipients.map((entry) => entry.dest_addr),
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

async function getBeemDeliveryReport({ requestId, phone }) {
  const config = getBeemSmsConfig();
  if (!config.configured) {
    throw new Error("Beem Africa SMS is not configured. Set BEEM_API_KEY and BEEM_SECRET_KEY.");
  }
  const normalizedPhone = normalizeSmsPhone(phone);
  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedPhone || !normalizedRequestId) {
    throw new Error("Delivery report requires a valid phone and request ID");
  }

  const url = new URL(config.deliveryEndpoint);
  url.searchParams.set("dest_addr", normalizedPhone);
  url.searchParams.set("request_id", normalizedRequestId);
  const auth = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString("base64");
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });
  const data = await parseGatewayResponse(response);
  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `Beem delivery report failed with HTTP ${response.status}`,
    );
  }
  const reports = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [data];
  const report = reports.find((entry) => normalizeSmsPhone(entry?.dest_addr || entry?.phone) === normalizedPhone)
    || reports[0]
    || {};
  return {
    phone: normalizedPhone,
    requestId: String(report.request_id || report.requestId || normalizedRequestId),
    providerStatus: String(report.status || "PENDING").trim().toUpperCase(),
    status: normalizeDeliveryStatus(report.status),
    raw: report,
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
  normalizeDeliveryStatus,
  getBeemDeliveryReport,
  sendBeemSms,
  sendBeemSmsJobs,
};
