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

module.exports = {
  CNO_PREFIX,
  formatCno,
  sanitizeScores,
  sanitizeText,
  reserveCnoRange,
};
