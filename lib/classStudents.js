const {
  parseStudent,
  DEFAULT_EXAM_TYPE,
  getClassSnapshot,
  assertClassResultsEditable,
} = require("./classes");
const {
  formatCno,
  sanitizeScores,
  sanitizeText,
  reserveCnoRange,
  loadExistingStudentsByIndexNo,
  loadExistingStudentsByAdmissionNo,
  normalizeAdmissionNo,
  generateFallbackAdmissionNo,
} = require("./students");

const VALID_STATUSES = ["present", "absent", "incomplete"];
const CONDUCT_KEYS = [
  "utendajiKazi",
  "nidhamNaUtii",
  "utunzajiMali",
  "uongozi",
  "michezo",
  "ushirikiano",
];

const normalizeStatus = (value, fallback = "present") =>
  VALID_STATUSES.includes(value) ? value : fallback;

const sanitizeConduct = (value) => {
  const raw = value && typeof value === "object" ? value : {};
  return CONDUCT_KEYS.reduce((acc, key) => {
    acc[key] = sanitizeText(raw[key] ?? "");
    return acc;
  }, {});
};

const getSubjects = (classSnap) => {
  const data = classSnap.data();
  return Array.isArray(data.subjects) ? data.subjects : [];
};

const EXPORT_SIGNATURE = "bondetech-export-students-v1";

const resolveAdmissionNo = (studentData = {}, fallbackId = "") => {
  return normalizeAdmissionNo(
    studentData.admissionNo ?? studentData.admission_no ?? studentData.indexNo ?? studentData.index_no ?? "",
    fallbackId ? generateFallbackAdmissionNo(fallbackId) : ""
  );
};

const ensureAdmissionNosInClass = async (db, classRef) => {
  const snapshot = await classRef.collection("students").get();
  const updates = [];
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const admissionNo = resolveAdmissionNo(data, doc.id);
    if (!normalizeAdmissionNo(data.admission_no || "")) {
      updates.push({ ref: doc.ref, updates: { admission_no: admissionNo } });
    }
  });

  for (let index = 0; index < updates.length; index += 400) {
    const batch = db.batch();
    updates.slice(index, index + 400).forEach(({ ref, updates: docUpdates }) => batch.update(ref, docUpdates));
    await batch.commit();
  }
};

const ensureUniqueAdmissionNoInClass = async (classRef, admissionNo, excludeStudentId = "") => {
  const normalized = normalizeAdmissionNo(admissionNo || "");
  if (!normalized) {
    throw new Error("Admission number is required");
  }
  const snap = await classRef.collection("students").where("admission_no", "==", normalized).limit(2).get();
  const duplicate = snap.docs.find((doc) => doc.id !== excludeStudentId);
  if (duplicate) {
    throw new Error("Admission number already exists in this class");
  }
};

const getStudentSnapshot = async (db, classId, studentId) => {
  const { classRef, classSnap } = await getClassSnapshot(db, classId);
  const studentRef = classRef.collection("students").doc(String(studentId || ""));
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) {
    throw new Error("Student not found");
  }
  return { classRef, classSnap, studentRef, studentSnap };
};

const listStudents = async (db, classId, options = {}) => {
  const { classRef } = await getClassSnapshot(db, classId);
  await ensureAdmissionNosInClass(db, classRef);
  const search = String(options.search || "").trim();
  const page = Math.max(1, parseInt(options.page || "1", 10));
  const limit = Math.min(parseInt(options.limit || "200", 10) || 200, 500);
  const cursor = String(options.cursor || "").trim();

  if (search) {
    const snap = await classRef.collection("students").orderBy("index_no", "asc").get();
    const qLower = search.toLowerCase();
    const all = snap.docs.map((doc) => parseStudent(doc, classId));
    const filtered = all.filter(
      (student) =>
        student.name.toLowerCase().includes(qLower) ||
        student.indexNo.toLowerCase().includes(qLower) ||
        String(student.admissionNo || "").toLowerCase().includes(qLower)
    );
    const offset = (page - 1) * limit;
    return {
      students: filtered.slice(offset, offset + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  let query = classRef.collection("students").orderBy("index_no", "asc").limit(limit);
  if (cursor) {
    query = query.startAfter(cursor);
  }

  const snap = await query.get();
  const students = snap.docs.map((doc) => parseStudent(doc, classId));
  const nextCursor = students.length === limit ? students[students.length - 1].indexNo : null;

  return { students, nextCursor, page, limit };
};

const createStudentRecord = async (db, classId, payload = {}) => {
  const { classRef, classSnap } = await getClassSnapshot(db, classId);
  await ensureAdmissionNosInClass(db, classRef);
  const classData = classSnap.data();
  const subjects = getSubjects(classSnap);
  assertClassResultsEditable(
    classSnap,
    "Results are published for this class. Unpublish them before adding students or marks.",
  );

  const name = sanitizeText(payload.name || "");
  if (!name) {
    throw new Error("Student name is required");
  }
  const admissionNo = normalizeAdmissionNo(payload.admissionNo ?? payload.admission_no ?? "");
  if (!admissionNo) {
    throw new Error("Admission number is required");
  }
  await ensureUniqueAdmissionNoInClass(classRef, admissionNo);

  const sex = payload.sex === "F" ? "F" : "M";
  const status = normalizeStatus(payload.status, "present");
  const dateOfBirth = sanitizeText(payload.dateOfBirth ?? "");
  const parentName = sanitizeText(payload.parentName ?? "");
  const parentPhone = sanitizeText(payload.parentPhone ?? "");
  const address = sanitizeText(payload.address ?? "");
  const previousSchool = sanitizeText(payload.previousSchool ?? "");
  const remarks = sanitizeText(payload.remarks ?? "");
  const conduct = sanitizeConduct(payload.conduct);
  const examType = sanitizeText(payload.examType || DEFAULT_EXAM_TYPE);

  let indexNo = sanitizeText(payload.indexNo);
  if (!indexNo) {
    const start = await reserveCnoRange(db, classRef, 1);
    indexNo = formatCno(start);
  }

  const scores = sanitizeScores(payload.scores, subjects.length);
  const studentData = {
    admission_no: admissionNo,
    index_no: indexNo,
    name,
    sex,
    status,
    date_of_birth: dateOfBirth,
    parent_name: parentName,
    parent_phone: parentPhone,
    address,
    previous_school: previousSchool,
    exam_scores: { [examType]: scores },
    remarks,
    conduct,
    created_at: new Date().toISOString(),
  };
  if (examType === DEFAULT_EXAM_TYPE) {
    studentData.scores = scores;
  }

  const studentRef = await classRef.collection("students").add(studentData);
  await classRef.update({
    student_count: Number(classData.student_count || 0) + 1,
  });

  const created = await studentRef.get();
  return parseStudent(created, classId);
};

const buildStudentUpdates = async (classRef, classSnap, studentSnap, payload = {}) => {
  const subjects = getSubjects(classSnap);
  const prevData = studentSnap.data();
  const updates = {};
  const prevAdmissionNo = resolveAdmissionNo(prevData, studentSnap.id);
  const incomingAdmissionNo = normalizeAdmissionNo(payload.admissionNo ?? payload.admission_no ?? "");

  if (incomingAdmissionNo) {
    if (normalizeAdmissionNo(prevData.admission_no || "") && incomingAdmissionNo !== prevAdmissionNo) {
      throw new Error("Admission number is immutable and cannot be changed");
    }
    await ensureUniqueAdmissionNoInClass(classRef, incomingAdmissionNo, studentSnap.id);
    updates.admission_no = incomingAdmissionNo;
  } else if (!normalizeAdmissionNo(prevData.admission_no || "")) {
    updates.admission_no = prevAdmissionNo;
  }

  if (typeof payload.indexNo === "string") {
    updates.index_no = sanitizeText(payload.indexNo, prevData.index_no);
  }
  if (typeof payload.name === "string") {
    updates.name = sanitizeText(payload.name, prevData.name);
  }
  if (payload.sex) {
    updates.sex = payload.sex === "F" ? "F" : "M";
  }
  if (payload.status) {
    updates.status = normalizeStatus(payload.status, prevData.status || "present");
  }
  if (typeof payload.dateOfBirth === "string") {
    updates.date_of_birth = sanitizeText(payload.dateOfBirth, prevData.date_of_birth);
  }
  if (typeof payload.parentName === "string") {
    updates.parent_name = sanitizeText(payload.parentName, prevData.parent_name);
  }
  if (typeof payload.parentPhone === "string") {
    updates.parent_phone = sanitizeText(payload.parentPhone, prevData.parent_phone);
  }
  if (typeof payload.address === "string") {
    updates.address = sanitizeText(payload.address, prevData.address);
  }
  if (typeof payload.previousSchool === "string") {
    updates.previous_school = sanitizeText(payload.previousSchool, prevData.previous_school);
  }
  if (Array.isArray(payload.scores)) {
    const newScores = sanitizeScores(payload.scores, subjects.length);
    const examType = sanitizeText(payload.examType || DEFAULT_EXAM_TYPE);
    const existingExamScores =
      prevData.exam_scores && typeof prevData.exam_scores === "object"
        ? prevData.exam_scores
        : {};
    updates.exam_scores = { ...existingExamScores, [examType]: newScores };
    if (examType === DEFAULT_EXAM_TYPE) {
      updates.scores = newScores;
    } else if (Array.isArray(existingExamScores[DEFAULT_EXAM_TYPE])) {
      updates.scores = existingExamScores[DEFAULT_EXAM_TYPE];
    }
  }
  if (typeof payload.remarks === "string") {
    updates.remarks = sanitizeText(payload.remarks);
  }
  if (payload.conduct && typeof payload.conduct === "object") {
    updates.conduct = sanitizeConduct(payload.conduct);
  }

  return updates;
};

const writeStudentAuditLog = async (db, classId, prevData, updates, payload = {}) => {
  try {
    const updatedBy = sanitizeText(payload._updatedBy || "");
    const auditEntry = {
      classId,
      studentId: payload.id || "",
      studentName: updates.name || prevData.name || "",
      action: "update",
      changes: Object.keys(updates).reduce((acc, key) => {
        if (key !== "exam_scores") {
          acc[key] = { from: prevData[key] ?? null, to: updates[key] };
        }
        return acc;
      }, {}),
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
    await db.collection("audit_logs").add(auditEntry);
  } catch {
    // Audit logging is best-effort only.
  }
};

const updateStudentRecord = async (db, classId, studentId, payload = {}) => {
  const { classRef, studentRef, studentSnap, classSnap } = await getStudentSnapshot(db, classId, studentId);
  await ensureAdmissionNosInClass(db, classRef);
  assertClassResultsEditable(
    classSnap,
    "Results are published for this class. Unpublish them before editing students or marks.",
  );
  const updates = await buildStudentUpdates(classRef, classSnap, studentSnap, payload);

  if (Object.keys(updates).length === 0) {
    return parseStudent(studentSnap, classId);
  }

  await studentRef.update(updates);
  await writeStudentAuditLog(db, classId, studentSnap.data(), updates, {
    ...payload,
    id: studentId,
  });
  const updated = await studentRef.get();
  return parseStudent(updated, classId);
};

const deleteStudentRecord = async (db, classId, studentId) => {
  const { classRef, classSnap, studentRef } = await getStudentSnapshot(db, classId, studentId);
  assertClassResultsEditable(
    classSnap,
    "Results are published for this class. Unpublish them before deleting students.",
  );
  await studentRef.delete();
  await classRef.update({
    student_count: Math.max(0, Number(classSnap.data().student_count || 0) - 1),
  });
  return { success: true };
};

const reorderStudentsBySexAndRegenerateCnos = async (db, classId) => {
  const { classRef, classSnap } = await getClassSnapshot(db, classId);
  assertClassResultsEditable(
    classSnap,
    "Results are published for this class. Unpublish them before reordering CNO values.",
  );
  const snapshot = await classRef.collection("students").get();
  const docs = snapshot.docs.map((doc) => ({
    ref: doc.ref,
    data: doc.data(),
  }));

  docs.sort((left, right) => {
    const leftSexRank = left.data.sex === "F" ? 0 : 1;
    const rightSexRank = right.data.sex === "F" ? 0 : 1;
    if (leftSexRank !== rightSexRank) return leftSexRank - rightSexRank;

    const leftIndex = sanitizeText(left.data.index_no || "");
    const rightIndex = sanitizeText(right.data.index_no || "");
    if (leftIndex && rightIndex && leftIndex !== rightIndex) {
      return leftIndex.localeCompare(rightIndex, "en");
    }

    const leftName = sanitizeText(left.data.name || "");
    const rightName = sanitizeText(right.data.name || "");
    if (leftName !== rightName) {
      return leftName.localeCompare(rightName, "en");
    }

    return left.ref.id.localeCompare(right.ref.id, "en");
  });

  const updates = [];
  let femaleCount = 0;
  let maleCount = 0;

  docs.forEach((entry, index) => {
    if (entry.data.sex === "F") femaleCount += 1;
    else maleCount += 1;

    const nextIndexNo = formatCno(index + 1);
    if (sanitizeText(entry.data.index_no || "") !== nextIndexNo) {
      updates.push({
        ref: entry.ref,
        updates: { index_no: nextIndexNo },
      });
    }
  });

  for (let index = 0; index < updates.length; index += 400) {
    const batch = db.batch();
    updates.slice(index, index + 400).forEach(({ ref, updates: docUpdates }) => {
      batch.update(ref, docUpdates);
    });
    await batch.commit();
  }

  await classRef.update({
    cno_counter: docs.length,
  });

  return {
    success: true,
    total: docs.length,
    updated: updates.length,
    unchanged: docs.length - updates.length,
    femaleCount,
    maleCount,
  };
};

const bulkImportStudents = async (db, classId, rawStudents, rawExamType) => {
  const { classRef, classSnap } = await getClassSnapshot(db, classId);
  await ensureAdmissionNosInClass(db, classRef);
  assertClassResultsEditable(
    classSnap,
    "Results are published for this class. Unpublish them before importing students or marks.",
  );
  const students = Array.isArray(rawStudents) ? rawStudents : [];
  if (!students.length) {
    throw new Error("students must be a non-empty array");
  }

  const subjects = getSubjects(classSnap);
  const examType = sanitizeText(rawExamType || DEFAULT_EXAM_TYPE);
  const requestedAdmissionNos = Array.from(
    new Set(
      students
        .map((student) => resolveAdmissionNo(student))
        .filter(Boolean)
    )
  );
  const requestedIndexNos = Array.from(
    new Set(
      students
        .map((student) => sanitizeText(student.indexNo ?? student.index_no ?? ""))
        .filter(Boolean)
    )
  );
  const [existingByAdmissionNo, existingByIndexNo] = await Promise.all([
    loadExistingStudentsByAdmissionNo(classRef, requestedAdmissionNos),
    loadExistingStudentsByIndexNo(classRef, requestedIndexNos),
  ]);
  const toUpdate = [];
  let matched = 0;
  let rejected = 0;
  let skipped = 0;

  for (const raw of students) {
    const incomingAdmissionNo = resolveAdmissionNo(raw);
    const incomingIndexNo = sanitizeText(raw.indexNo ?? raw.index_no ?? "");
    const existing =
      (incomingAdmissionNo ? existingByAdmissionNo[incomingAdmissionNo] : null) ||
      (incomingIndexNo ? existingByIndexNo[incomingIndexNo] : null);
    if (!existing) {
      rejected += 1;
      continue;
    }
    matched += 1;

    const newScores = sanitizeScores(
      Array.isArray(raw.scores) ? raw.scores : Array(subjects.length).fill(""),
      subjects.length
    );
    const existingData = existing.data;
    const existingExamScores =
      existingData.exam_scores && typeof existingData.exam_scores === "object"
        ? existingData.exam_scores
        : {};
    const existingDefaultScores = Array.isArray(existingExamScores[DEFAULT_EXAM_TYPE])
      ? existingExamScores[DEFAULT_EXAM_TYPE]
      : Array.isArray(existingData.scores)
      ? existingData.scores
      : [];
    const existingExamScoreForType =
      existingExamScores[examType] ??
      (examType === DEFAULT_EXAM_TYPE ? existingDefaultScores : []);
    const changed = JSON.stringify(newScores) !== JSON.stringify(existingExamScoreForType);

    if (changed) {
      const updates = {
        exam_scores: { ...existingExamScores, [examType]: newScores },
      };
      if (examType === DEFAULT_EXAM_TYPE) {
        updates.scores = newScores;
      } else if (Array.isArray(existingExamScores[DEFAULT_EXAM_TYPE])) {
        updates.scores = existingExamScores[DEFAULT_EXAM_TYPE];
      }
      toUpdate.push({ ref: existing.ref, updates });
    } else {
      skipped += 1;
    }
  }

  for (let index = 0; index < toUpdate.length; index += 400) {
    const batch = db.batch();
    toUpdate.slice(index, index + 400).forEach(({ ref, updates }) => batch.update(ref, updates));
    await batch.commit();
  }

  return {
    success: true,
    created: 0,
    matched,
    updated: toUpdate.length,
    rejected,
    skipped,
  };
};

module.exports = {
  DEFAULT_EXAM_TYPE,
  EXPORT_SIGNATURE,
  getStudentSnapshot,
  listStudents,
  createStudentRecord,
  updateStudentRecord,
  deleteStudentRecord,
  bulkImportStudents,
  reorderStudentsBySexAndRegenerateCnos,
};
