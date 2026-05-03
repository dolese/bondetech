const { parseStudent, DEFAULT_EXAM_TYPE, getClassSnapshot } = require("./classes");
const {
  formatCno,
  sanitizeScores,
  sanitizeText,
  reserveCnoRange,
  loadExistingStudentsByIndexNo,
} = require("./students");

const VALID_STATUSES = ["present", "absent", "incomplete"];

const normalizeStatus = (value, fallback = "present") =>
  VALID_STATUSES.includes(value) ? value : fallback;

const getSubjects = (classSnap) => {
  const data = classSnap.data();
  return Array.isArray(data.subjects) ? data.subjects : [];
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
        student.indexNo.toLowerCase().includes(qLower)
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
  const classData = classSnap.data();
  const subjects = getSubjects(classSnap);

  const name = sanitizeText(payload.name || "");
  if (!name) {
    throw new Error("Student name is required");
  }

  const sex = payload.sex === "F" ? "F" : "M";
  const status = normalizeStatus(payload.status, "present");
  const remarks = sanitizeText(payload.remarks ?? "");
  const examType = sanitizeText(payload.examType || DEFAULT_EXAM_TYPE);

  let indexNo = sanitizeText(payload.indexNo);
  if (!indexNo) {
    const start = await reserveCnoRange(db, classRef, 1);
    indexNo = formatCno(start);
  }

  const scores = sanitizeScores(payload.scores, subjects.length);
  const studentData = {
    index_no: indexNo,
    name,
    sex,
    status,
    exam_scores: { [examType]: scores },
    remarks,
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

const buildStudentUpdates = (classSnap, studentSnap, payload = {}) => {
  const subjects = getSubjects(classSnap);
  const prevData = studentSnap.data();
  const updates = {};

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
  const { studentRef, studentSnap, classSnap } = await getStudentSnapshot(db, classId, studentId);
  const updates = buildStudentUpdates(classSnap, studentSnap, payload);

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
  await studentRef.delete();
  await classRef.update({
    student_count: Math.max(0, Number(classSnap.data().student_count || 0) - 1),
  });
  return { success: true };
};

const bulkImportStudents = async (db, classId, rawStudents, rawExamType) => {
  const { classRef, classSnap } = await getClassSnapshot(db, classId);
  const students = Array.isArray(rawStudents) ? rawStudents : [];
  if (!students.length) {
    throw new Error("students must be a non-empty array");
  }

  const classData = classSnap.data();
  const subjects = getSubjects(classSnap);
  const examType = sanitizeText(rawExamType || DEFAULT_EXAM_TYPE);

  const validStudents = students.filter((student) => sanitizeText(student.name || ""));
  const requestedIndexNos = validStudents
    .map((student) => sanitizeText(student.indexNo || ""))
    .filter(Boolean);
  const existingByIndexNo = await loadExistingStudentsByIndexNo(classRef, requestedIndexNos);
  const needsCno = validStudents.filter((student) => !sanitizeText(student.indexNo || ""));
  let cursor = needsCno.length > 0 ? await reserveCnoRange(db, classRef, needsCno.length) : 0;

  const createdAt = new Date().toISOString();
  const toCreate = [];
  const toUpdate = [];
  let skipped = 0;

  for (const raw of validStudents) {
    const name = sanitizeText(raw.name || "");
    if (!name) continue;

    const incomingIndexNo = sanitizeText(raw.indexNo || "");
    const existing = incomingIndexNo ? existingByIndexNo[incomingIndexNo] : null;
    const newSex = raw.sex === "F" ? "F" : "M";
    const newStatus = normalizeStatus(raw.status, "present");
    const newRemarks = sanitizeText(raw.remarks || "");
    const newScores = sanitizeScores(
      Array.isArray(raw.scores) ? raw.scores : Array(subjects.length).fill(""),
      subjects.length
    );

    if (existing) {
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
      const changed =
        name !== (existingData.name || "") ||
        newSex !== (existingData.sex || "M") ||
        newStatus !== (existingData.status || "present") ||
        newRemarks !== (existingData.remarks || "") ||
        JSON.stringify(newScores) !== JSON.stringify(existingExamScoreForType);

      if (changed) {
        const updates = {
          name,
          sex: newSex,
          status: newStatus,
          remarks: newRemarks,
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
      continue;
    }

    const finalIndexNo = incomingIndexNo || formatCno(cursor++);
    const studentData = {
      index_no: finalIndexNo,
      name,
      sex: newSex,
      status: newStatus,
      exam_scores: { [examType]: newScores },
      remarks: newRemarks,
      created_at: createdAt,
    };
    if (examType === DEFAULT_EXAM_TYPE) {
      studentData.scores = newScores;
    }
    toCreate.push(studentData);
  }

  for (let index = 0; index < toUpdate.length; index += 400) {
    const batch = db.batch();
    toUpdate.slice(index, index + 400).forEach(({ ref, updates }) => batch.update(ref, updates));
    await batch.commit();
  }

  for (let index = 0; index < toCreate.length; index += 400) {
    const batch = db.batch();
    toCreate.slice(index, index + 400).forEach((doc) => {
      batch.set(classRef.collection("students").doc(), doc);
    });
    await batch.commit();
  }

  if (toCreate.length > 0) {
    await classRef.update({
      student_count: Number(classData.student_count || 0) + toCreate.length,
    });
  }

  return {
    success: true,
    created: toCreate.length,
    updated: toUpdate.length,
    skipped,
  };
};

module.exports = {
  DEFAULT_EXAM_TYPE,
  getStudentSnapshot,
  listStudents,
  createStudentRecord,
  updateStudentRecord,
  deleteStudentRecord,
  bulkImportStudents,
};
