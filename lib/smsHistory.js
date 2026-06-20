function cleanString(value) {
  return String(value || "").trim();
}

function uniqueStrings(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => cleanString(value))
        .filter(Boolean)
    )
  );
}

function recipientIdentity(entry = {}) {
  const admissionNo = cleanString(entry.admissionNo || entry.admission_no).toUpperCase();
  if (admissionNo) return `admission:${admissionNo}`;
  const classId = cleanString(entry.classId || entry.class_id);
  const studentId = cleanString(entry.studentId || entry.student_id || entry.id);
  if (classId && studentId) return `record:${classId}:${studentId}`;
  const indexNo = cleanString(entry.indexNo || entry.recipientIndexNo);
  const classLabel = cleanString(entry.classLabel);
  if (indexNo) return `index:${classLabel}:${indexNo}`;
  return `phone:${cleanString(entry.phone || entry.dest_addr)}`;
}

function dedupeRecipientsByStudent(recipients = []) {
  const deduped = new Map();
  recipients.forEach((entry) => {
    const key = recipientIdentity(entry);
    if (!key || deduped.has(key)) return;
    deduped.set(key, entry);
  });
  return Array.from(deduped.values());
}

function buildRequestIdByPhone(result = {}) {
  const byPhone = new Map();
  const resultEntries = Array.isArray(result.results) ? result.results : [];
  resultEntries.forEach((entry) => {
    const batches = Array.isArray(entry?.results) ? entry.results : [entry];
    batches.forEach((batch) => {
      const requestId = cleanString(batch?.requestId || batch?.request_id);
      const phones = Array.isArray(batch?.recipientPhones)
        ? batch.recipientPhones
        : [entry?.recipientPhone || batch?.recipientPhone].filter(Boolean);
      phones.forEach((phone) => {
        const normalizedPhone = cleanString(phone);
        if (normalizedPhone && requestId) byPhone.set(normalizedPhone, requestId);
      });
    });
  });
  return byPhone;
}

function summarizeDeliveryStatuses(deliveries = []) {
  return (Array.isArray(deliveries) ? deliveries : []).reduce(
    (summary, entry) => {
      const status = ["delivered", "failed", "pending"].includes(entry?.status)
        ? entry.status
        : "pending";
      summary[status] += 1;
      return summary;
    },
    { delivered: 0, failed: 0, pending: 0 },
  );
}

function aggregateDeliveryStatus(summary = {}) {
  if (Number(summary.pending || 0) > 0) return "pending";
  if (Number(summary.failed || 0) > 0) return "failed";
  if (Number(summary.delivered || 0) > 0) return "delivered";
  return "failed";
}

function buildSmsLogEntry({ body = {}, result = {}, currentUser = {} } = {}) {
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
  const combinedRecipients = jobs.length
    ? jobs.flatMap((job) =>
        (Array.isArray(job.recipients) ? job.recipients : []).map((entry) => ({
          phone: entry?.phone || entry?.dest_addr || "",
          admissionNo: entry?.admissionNo || entry?.admission_no || "",
          studentId: entry?.studentId || entry?.student_id || "",
          classId: entry?.classId || entry?.class_id || meta.classId || "",
          indexNo: entry?.indexNo || entry?.recipientIndexNo || job?.recipientIndexNo || "",
          studentName: entry?.studentName || job?.recipientName || "",
          parentName: entry?.parentName || job?.recipientParentName || "",
          classLabel: entry?.classLabel || job?.classLabel || meta.classLabel || "",
        }))
      )
    : recipients.map((entry) => ({
        phone: entry?.phone || entry?.dest_addr || "",
        admissionNo: entry?.admissionNo || entry?.admission_no || "",
        studentId: entry?.studentId || entry?.student_id || "",
        classId: entry?.classId || entry?.class_id || meta.classId || "",
        indexNo: entry?.indexNo || "",
        studentName: entry?.studentName || "",
        parentName: entry?.parentName || "",
        classLabel: entry?.classLabel || meta.classLabel || "",
      }));
  const uniqueRecipients = dedupeRecipientsByStudent(combinedRecipients);

  const fallbackMessage = cleanString(body.message || meta.messagePreview);
  const previewMessages = jobs.length
    ? jobs.map((job) => cleanString(job.message)).filter(Boolean)
    : fallbackMessage
    ? [fallbackMessage]
    : [];
  const resultEntries = Array.isArray(result.results) ? result.results : [];
  const requestIds = uniqueStrings(
    resultEntries.flatMap((entry) => {
      if (Array.isArray(entry?.results)) {
        return entry.results.map((item) => item?.requestId || item?.request_id || "");
      }
      return [entry?.requestId || entry?.request_id || ""];
    }),
  );
  const resultCodes = uniqueStrings(
    resultEntries.flatMap((entry) => {
      if (Array.isArray(entry?.results)) {
        return entry.results.map((item) => String(item?.code ?? ""));
      }
      return [String(entry?.code ?? "")];
    }),
  );
  const requestIdByPhone = buildRequestIdByPhone(result);
  const deliveries = uniqueRecipients.map((entry) => {
    const phone = cleanString(entry.phone);
    return {
      key: recipientIdentity(entry),
      phone,
      request_id: requestIdByPhone.get(phone) || "",
      status: result.successful === false ? "failed" : "pending",
      provider_status: result.successful === false ? "SUBMISSION_FAILED" : "PENDING",
      student_id: cleanString(entry.studentId),
      admission_no: cleanString(entry.admissionNo),
      index_no: cleanString(entry.indexNo),
      student_name: cleanString(entry.studentName),
      guardian_name: cleanString(entry.parentName),
      class_id: cleanString(entry.classId),
      class_label: cleanString(entry.classLabel),
      updated_at: new Date().toISOString(),
    };
  });
  const deliverySummary = summarizeDeliveryStatuses(deliveries);

  return {
    created_at: new Date().toISOString(),
    requested_by: {
      username: cleanString(currentUser.username),
      displayName: cleanString(currentUser.displayName),
      role: cleanString(currentUser.role),
    },
    mode: cleanString(meta.mode || (jobs.length ? "results" : "custom")) || "custom",
    scope: cleanString(meta.scope || ""),
    sender_id: cleanString(body.senderId || result.senderId),
    schedule_time: cleanString(body.scheduleTime),
    successful: result.successful !== false,
    total_requested: Number(result.totalRequested || recipients.length || combinedRecipients.length || 0),
    valid: Number(result.valid || 0),
    invalid: Number(result.invalid || 0),
    duplicates: Number(result.duplicates || 0),
    batch_count: Number(result.batchCount || 0),
    job_count: Number(result.jobCount || jobs.length || 0),
    gateway_status: aggregateDeliveryStatus(deliverySummary),
    delivered: deliverySummary.delivered,
    failed: deliverySummary.failed,
    pending: deliverySummary.pending,
    error_message: cleanString(result.error || result.message),
    year: cleanString(meta.year),
    form: cleanString(meta.form),
    class_id: cleanString(meta.classId),
    class_label: cleanString(meta.classLabel),
    exam: cleanString(meta.exam),
    language: cleanString(meta.language),
    message_preview: previewMessages[0] || "",
    preview_messages: previewMessages.slice(0, 3),
    recipient_phones: uniqueStrings(uniqueRecipients.map((entry) => entry.phone)),
    recipient_index_nos: uniqueStrings(uniqueRecipients.map((entry) => entry.indexNo)),
    recipient_names: uniqueStrings(uniqueRecipients.map((entry) => entry.studentName)),
    guardian_names: uniqueStrings(uniqueRecipients.map((entry) => entry.parentName)),
    class_labels: uniqueStrings(uniqueRecipients.map((entry) => entry.classLabel)),
    deliveries,
    request_ids: requestIds,
    result_codes: resultCodes,
    gateway_result_preview: resultEntries.slice(0, 4),
  };
}

async function saveSmsHistory(db, params = {}) {
  const logEntry = buildSmsLogEntry(params);
  const ref = await db.collection("sms_logs").add(logEntry);
  return { id: ref.id, ...logEntry };
}

async function refreshPendingSmsHistory(
  db,
  { getDeliveryReport, minAgeMs = 5 * 60 * 1000, maxChecks = 50 } = {},
) {
  if (typeof getDeliveryReport !== "function") return { checked: 0, updated: 0 };
  const snap = await db.collection("sms_logs").orderBy("created_at", "desc").limit(100).get();
  const now = Date.now();
  let checked = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    if (checked >= maxChecks) break;
    const data = doc.data();
    const createdAt = Date.parse(data.created_at || "");
    if (Number.isFinite(createdAt) && now - createdAt < minAgeMs) continue;
    const deliveries = Array.isArray(data.deliveries) ? data.deliveries : [];
    let changed = false;
    const nextDeliveries = await Promise.all(
      deliveries.map(async (entry) => {
        if (entry?.status !== "pending" || !entry?.request_id || !entry?.phone || checked >= maxChecks) {
          return entry;
        }
        checked += 1;
        try {
          const report = await getDeliveryReport({ requestId: entry.request_id, phone: entry.phone });
          const next = {
            ...entry,
            status: report.status,
            provider_status: report.providerStatus,
            updated_at: new Date().toISOString(),
          };
          changed = changed || next.status !== entry.status || next.provider_status !== entry.provider_status;
          return next;
        } catch (err) {
          return {
            ...entry,
            last_check_error: cleanString(err.message),
            updated_at: new Date().toISOString(),
          };
        }
      }),
    );
    if (!changed) continue;
    const summary = summarizeDeliveryStatuses(nextDeliveries);
    await doc.ref.update({
      deliveries: nextDeliveries,
      delivered: summary.delivered,
      failed: summary.failed,
      pending: summary.pending,
      gateway_status: aggregateDeliveryStatus(summary),
      delivery_checked_at: new Date().toISOString(),
    });
    updated += 1;
  }
  return { checked, updated };
}

async function listSmsHistory(db, { limit = 20, indexNo = "", phone = "" } = {}) {
  const max = Math.min(Math.max(parseInt(limit || "20", 10) || 20, 1), 100);
  const requestedIndexNo = cleanString(indexNo);
  const requestedPhone = cleanString(phone);

  const snap = await db.collection("sms_logs").orderBy("created_at", "desc").limit(100).get();
  let rows = snap.docs.map((doc) => {
    const data = doc.data();
    const fallbackPending = data.gateway_status === "submitted"
      ? Number(data.valid || data.total_requested || 0)
      : 0;
    return {
      id: doc.id,
      ...data,
      delivered: Number(data.delivered || 0),
      failed: Number(data.failed || (data.successful === false ? data.total_requested || 1 : 0)),
      pending: Number(data.pending ?? fallbackPending),
      gateway_status: data.gateway_status === "submitted" ? "pending" : data.gateway_status,
    };
  });

  if (requestedIndexNo) {
    rows = rows.filter((entry) =>
      Array.isArray(entry.recipient_index_nos) && entry.recipient_index_nos.includes(requestedIndexNo)
    );
  }

  if (requestedPhone) {
    rows = rows.filter((entry) =>
      Array.isArray(entry.recipient_phones) && entry.recipient_phones.includes(requestedPhone)
    );
  }

  return rows.slice(0, max);
}

module.exports = {
  buildSmsLogEntry,
  dedupeRecipientsByStudent,
  summarizeDeliveryStatuses,
  saveSmsHistory,
  refreshPendingSmsHistory,
  listSmsHistory,
};
