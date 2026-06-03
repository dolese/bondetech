const CNO_PREFIX = "S6509";
const ADMISSION_NO_SCHOOL_CODE = "BSS";
const ADMISSION_NO_PATTERN = /^[A-Z0-9]+-\d{4}-\d{4,}$/;

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

const sanitizeAdmissionNo = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const raw = value.trim().toUpperCase();
  if (!raw) return fallback;
  if (/^\d{4}-\d{1,}$/.test(raw)) {
    return `${ADMISSION_NO_SCHOOL_CODE}-${raw}`;
  }
  if (/^BSS(?=\d{4}-\d{1,}$)/.test(raw)) {
    return `${ADMISSION_NO_SCHOOL_CODE}-${raw.slice(3)}`;
  }
  if (raw.startsWith(`${ADMISSION_NO_SCHOOL_CODE}--`)) {
    return `${ADMISSION_NO_SCHOOL_CODE}-${raw.slice(5)}`;
  }
  return raw;
};

const isValidAdmissionNo = (value) => {
  const normalized = sanitizeAdmissionNo(value || "");
  return !normalized || ADMISSION_NO_PATTERN.test(normalized);
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

const loadExistingStudentsByAdmissionNo = async (classRef, admissionNos) => {
  const cleaned = Array.from(
    new Set(
      (Array.isArray(admissionNos) ? admissionNos : [])
        .map((value) => sanitizeAdmissionNo(value || ""))
        .filter(Boolean)
    )
  );

  const existingByAdmissionNo = {};
  if (!cleaned.length) return existingByAdmissionNo;

  for (const chunk of chunkArray(cleaned, 30)) {
    const snapshot = await classRef
      .collection("students")
      .where("admission_no", "in", chunk)
      .get();
    snapshot.docs.forEach((doc) => {
      const admissionNo = sanitizeAdmissionNo(doc.data().admission_no || "");
      if (admissionNo) {
        existingByAdmissionNo[admissionNo] = { ref: doc.ref, data: doc.data() };
      }
    });
  }

  return existingByAdmissionNo;
};

const findStudentByAdmissionNo = async (
  db,
  admissionNo,
  { excludeClassId = "", excludeStudentId = "" } = {}
) => {
  const normalizedAdmissionNo = sanitizeAdmissionNo(admissionNo || "");
  if (!normalizedAdmissionNo) return null;

  const isExcluded = (classId, studentId) =>
    String(classId || "") === String(excludeClassId || "") &&
    String(studentId || "") === String(excludeStudentId || "");

  try {
    const snapshot = await db
      .collectionGroup("students")
      .where("admission_no", "==", normalizedAdmissionNo)
      .limit(10)
      .get();

    for (const doc of snapshot.docs) {
      const classId = doc.ref.parent?.parent?.id || "";
      if (isExcluded(classId, doc.id)) continue;
      return {
        ref: doc.ref,
        data: doc.data(),
        classId,
        studentId: doc.id,
      };
    }
  } catch {
    const classesSnap = await db.collection("classes").get();
    for (const classDoc of classesSnap.docs) {
      const classId = classDoc.id;
      const snapshot = await classDoc.ref
        .collection("students")
        .where("admission_no", "==", normalizedAdmissionNo)
        .limit(10)
        .get();
      for (const doc of snapshot.docs) {
        if (isExcluded(classId, doc.id)) continue;
        return {
          ref: doc.ref,
          data: doc.data(),
          classId,
          studentId: doc.id,
        };
      }
    }
  }

  return null;
};

module.exports = {
  CNO_PREFIX,
  ADMISSION_NO_SCHOOL_CODE,
  ADMISSION_NO_PATTERN,
  formatCno,
  sanitizeAdmissionNo,
  isValidAdmissionNo,
  sanitizeScores,
  sanitizeText,
  reserveCnoRange,
  loadExistingStudentsByIndexNo,
  loadExistingStudentsByAdmissionNo,
  findStudentByAdmissionNo,
};
