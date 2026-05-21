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

function buildSmsLogEntry({ body = {}, result = {}, currentUser = {} } = {}) {
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
  const combinedRecipients = jobs.length
    ? jobs.flatMap((job) =>
        (Array.isArray(job.recipients) ? job.recipients : []).map((entry) => ({
          phone: entry?.phone || entry?.dest_addr || "",
          indexNo: entry?.indexNo || entry?.recipientIndexNo || job?.recipientIndexNo || "",
          studentName: entry?.studentName || job?.recipientName || "",
          parentName: entry?.parentName || job?.recipientParentName || "",
          classLabel: entry?.classLabel || job?.classLabel || meta.classLabel || "",
        }))
      )
    : recipients.map((entry) => ({
        phone: entry?.phone || entry?.dest_addr || "",
        indexNo: entry?.indexNo || "",
        studentName: entry?.studentName || "",
        parentName: entry?.parentName || "",
        classLabel: entry?.classLabel || meta.classLabel || "",
      }));

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
    gateway_status: result.successful !== false ? "submitted" : "warnings",
    year: cleanString(meta.year),
    form: cleanString(meta.form),
    class_id: cleanString(meta.classId),
    class_label: cleanString(meta.classLabel),
    exam: cleanString(meta.exam),
    language: cleanString(meta.language),
    message_preview: previewMessages[0] || "",
    preview_messages: previewMessages.slice(0, 3),
    recipient_phones: uniqueStrings(combinedRecipients.map((entry) => entry.phone)),
    recipient_index_nos: uniqueStrings(combinedRecipients.map((entry) => entry.indexNo)),
    recipient_names: uniqueStrings(combinedRecipients.map((entry) => entry.studentName)),
    guardian_names: uniqueStrings(combinedRecipients.map((entry) => entry.parentName)),
    class_labels: uniqueStrings(combinedRecipients.map((entry) => entry.classLabel)),
    request_ids: requestIds,
    result_codes: resultCodes,
    gateway_result_preview: resultEntries.slice(0, 4),
  };
}

async function saveSmsHistory(db, params = {}) {
  const logEntry = buildSmsLogEntry(params);
  await db.collection("sms_logs").add(logEntry);
  return logEntry;
}

async function listSmsHistory(db, { limit = 20, indexNo = "", phone = "" } = {}) {
  const max = Math.min(Math.max(parseInt(limit || "20", 10) || 20, 1), 100);
  const requestedIndexNo = cleanString(indexNo);
  const requestedPhone = cleanString(phone);

  const snap = await db.collection("sms_logs").orderBy("created_at", "desc").limit(100).get();
  let rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

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
  saveSmsHistory,
  listSmsHistory,
};
