const CNO_PREFIX = "S6509";

const formatCno = (num) => `${CNO_PREFIX}/${String(num).padStart(4, "0")}`;

const sanitizeScore = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "string" && value.toUpperCase() === "ABS") return "ABS";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return Math.min(100, Math.max(0, num));
};

const sanitizeScores = (scores, length) => {
  const arr = Array.isArray(scores) ? scores : [];
  const cleaned = arr.map(sanitizeScore);
  if (typeof length === "number") {
    while (cleaned.length < length) cleaned.push("");
    if (cleaned.length > length) cleaned.length = length;
  }
  return cleaned;
};

const sanitizeText = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  return value.trim();
};

const reserveCnoRange = async (db, classRef, count) => {
  if (count <= 0) return null;
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(classRef);
    if (!snap.exists) throw new Error("Class not found");
    const data = snap.data();
    const current = Number(data.cno_counter || 0);
    const start = current + 1;
    const next = current + count;
    tx.update(classRef, { cno_counter: next });
    return start;
  });
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const loadExistingStudentsByIndexNo = async (classRef, indexNos) => {
  const cleaned = Array.from(
    new Set(
      (Array.isArray(indexNos) ? indexNos : [])
        .map((value) => sanitizeText(value || ""))
        .filter(Boolean)
    )
  );

  const existingByIndexNo = {};
  if (!cleaned.length) return existingByIndexNo;

  for (const chunk of chunkArray(cleaned, 30)) {
    const snapshot = await classRef
      .collection("students")
      .where("index_no", "in", chunk)
      .get();
    snapshot.docs.forEach((doc) => {
      const indexNo = sanitizeText(doc.data().index_no || "");
      if (indexNo) {
        existingByIndexNo[indexNo] = { ref: doc.ref, data: doc.data() };
      }
    });
  }

  return existingByIndexNo;
};

module.exports = {
  CNO_PREFIX,
  formatCno,
  sanitizeScores,
  sanitizeText,
  reserveCnoRange,
  loadExistingStudentsByIndexNo,
};
