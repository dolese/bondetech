const {
  parseStudent,
  DEFAULT_EXAM_TYPE,
  getClassSnapshot,
  assertClassResultsEditable,
} = require("./classes");
const {
  formatCno,
  isValidAdmissionNo,
  sanitizeAdmissionNo,
  sanitizeScores,
  sanitizeText,
  reserveCnoRange,
  loadExistingStudentsByIndexNo,
  findStudentByAdmissionNo,
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
const VALID_CONDUCT_GRADES = new Set(["A", "B", "C"]);

const normalizeStatus = (value, fallback = "present") =>
  VALID_STATUSES.includes(value) ? value : fallback;

const sanitizeConduct = (value) => {
  const raw = value && typeof value === "object" ? value : {};
  return CONDUCT_KEYS.reduce((acc, key) => {
    const normalized = sanitizeText(raw[key] ?? "").toUpperCase();
    acc[key] = VALID_CONDUCT_GRADES.has(normalized) ? normalized : "";
    return acc;
  }, {});
};

const compareMarks = (left, right) => {
  const normalize = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (typeof value === "string" && value.toUpperCase() === "ABS") return "ABS";
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : value;
  };
  return normalize(left) === normalize(right);
};

const getSubjects = (classSnap) => {
  const data = classSnap.data();
  return Array.isArray(data.subjects) ? data.subjects : [];
};

const getOptionalSubjectNames = (classSnap) => {
  const data = classSnap.data();
  const subjects = getSubjects(classSnap);
  const metadata = Array.isArray(data.subject_metadata) ? data.subject_metadata : [];
  const byName = new Map(
    metadata.flatMap((entry) => {
      const name = sanitizeText(entry?.name || entry?.subject || "");
      if (!name) return [];
      const type = sanitizeText(entry?.type || "compulsory").toLowerCase();
      return [[name.toLowerCase(), type === "optional" ? "optional" : "compulsory"]];
    }),
  );
  return subjects.filter((subject) => byName.get(String(subject || "").trim().toLowerCase()) === "optional");
};

const sanitizeOptionalSubjects = (value, classSnap) => {
  const allowed = new Set(getOptionalSubjectNames(classSnap).map((entry) => entry.toLowerCase()));
  return Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => sanitizeText(entry || ""))
        .filter((entry) => entry && allowed.has(entry.toLowerCase())),
    ),
  );
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
  const optionalSubjects = sanitizeOptionalSubjects(payload.optionalSubjects, classSnap);
  const admissionNo = sanitizeAdmissionNo(payload.admissionNo ?? payload.admission_no ?? "");
  if (!isValidAdmissionNo(admissionNo)) {
    throw new Error("Admission number must use the format SCHOOLCODE-YEAR-SEQUENCE, for example BSS-2026-0001");
  }

  if (admissionNo) {
    const existingAdmission = await findStudentByAdmissionNo(db, admissionNo);
    if (existingAdmission) {
      throw new Error("Admission number already exists for another student");
    }
  }

  let indexNo = sanitizeText(payload.indexNo);
  if (!indexNo) {
    const start = await reserveCnoRange(db, classRef, 1);
    indexNo = formatCno(start);
  }

  const scores = sanitizeScores(payload.scores, subjects.length);
  const studentData = {
    index_no: indexNo,
    admission_no: admissionNo,
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
    optional_subjects: optionalSubjects,
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
  const admissionPayload =
    typeof payload.admissionNo === "string"
      ? payload.admissionNo
      : typeof payload.admission_no === "string"
      ? payload.admission_no
      : null;
  if (typeof admissionPayload === "string") {
    const normalizedAdmissionNo = sanitizeAdmissionNo(admissionPayload);
    if (!isValidAdmissionNo(normalizedAdmissionNo)) {
      throw new Error("Admission number must use the format SCHOOLCODE-YEAR-SEQUENCE, for example BSS-2026-0001");
    }
    updates.admission_no = normalizedAdmissionNo;
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
  if (Array.isArray(payload.optionalSubjects)) {
    updates.optional_subjects = sanitizeOptionalSubjects(payload.optionalSubjects, classSnap);
  }

  return updates;
};

const writeStudentAuditLog = async (db, classId, classSnap, prevData, updates, payload = {}) => {
  try {
    const updatedBy = sanitizeText(payload._updatedBy || "");
    const source = sanitizeText(payload._changeSource || "single-edit") || "single-edit";
    const examType = sanitizeText(payload.examType || DEFAULT_EXAM_TYPE) || DEFAULT_EXAM_TYPE;
    const subjects = getSubjects(classSnap);
    const scoreChanges = {};
    const previousExamScores =
      prevData.exam_scores && typeof prevData.exam_scores === "object" ? prevData.exam_scores : {};
    const nextExamScores =
      updates.exam_scores && typeof updates.exam_scores === "object" ? updates.exam_scores : null;
    if (nextExamScores) {
      const previousScores = Array.isArray(previousExamScores[examType]) ? previousExamScores[examType] : [];
      const nextScores = Array.isArray(nextExamScores[examType]) ? nextExamScores[examType] : [];
      const max = Math.max(subjects.length, previousScores.length, nextScores.length);
      for (let index = 0; index < max; index += 1) {
        const from = previousScores[index] ?? null;
        const to = nextScores[index] ?? null;
        if (compareMarks(from, to)) continue;
        const subject = sanitizeText(subjects[index] || `SUBJECT_${index + 1}`);
        scoreChanges[`score:${examType}:${subject}`] = {
          from,
          to,
          examType,
          subject,
          source,
        };
      }
    }
    const auditEntry = {
      classId,
      studentId: payload.id || "",
      studentName: updates.name || prevData.name || "",
      action: source,
      changes: Object.keys(updates).reduce((acc, key) => {
        if (key !== "exam_scores") {
          acc[key] = { from: prevData[key] ?? null, to: updates[key] };
        }
        return acc;
      }, scoreChanges),
      updatedBy,
      source,
      examType,
      updatedAt: new Date().toISOString(),
    };
    await db.collection("audit_logs").add(auditEntry);
  } catch {
    // Audit logging is best-effort only.
  }
};

const updateStudentRecord = async (db, classId, studentId, payload = {}) => {
  const { studentRef, studentSnap, classSnap } = await getStudentSnapshot(db, classId, studentId);
  assertClassResultsEditable(
    classSnap,
    "Results are published for this class. Unpublish them before editing students or marks.",
  );
  const updates = buildStudentUpdates(classSnap, studentSnap, payload);
  const currentAdmissionNo = sanitizeText(studentSnap.data().admission_no || "");
  const admissionProvided = Object.prototype.hasOwnProperty.call(updates, "admission_no");
  const nextAdmissionNo =
    admissionProvided
      ? sanitizeText(updates.admission_no || "")
      : currentAdmissionNo;

  if (nextAdmissionNo && nextAdmissionNo !== currentAdmissionNo) {
    const existingAdmission = await findStudentByAdmissionNo(db, nextAdmissionNo, {
      excludeClassId: classId,
      excludeStudentId: studentId,
    });
    if (existingAdmission) {
      throw new Error("Admission number already exists for another student");
    }
  }

  if (Object.keys(updates).length === 0) {
    return parseStudent(studentSnap, classId);
  }

  await studentRef.update(updates);
  await writeStudentAuditLog(db, classId, classSnap, studentSnap.data(), updates, {
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

const bulkImportStudents = async (db, classId, rawStudents, rawExamType, rawMeta = {}) => {
  const { classRef, classSnap } = await getClassSnapshot(db, classId);
  assertClassResultsEditable(
    classSnap,
    "Results are published for this class. Unpublish them before importing students or marks.",
  );
  const students = Array.isArray(rawStudents) ? rawStudents : [];
  if (!students.length) {
    throw new Error("students must be a non-empty array");
  }

  const classData = classSnap.data();
  const subjects = getSubjects(classSnap);
  const examType = sanitizeText(rawExamType || DEFAULT_EXAM_TYPE);
  const auditMeta = {
    _updatedBy: sanitizeText(rawMeta.updatedBy || rawMeta._updatedBy || ""),
    _changeSource: sanitizeText(rawMeta.source || rawMeta._changeSource || "bulk-save") || "bulk-save",
    examType,
  };

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
    const newAdmissionNo = sanitizeAdmissionNo(raw.admissionNo ?? raw.admission_no ?? "");
    if (!isValidAdmissionNo(newAdmissionNo)) {
      throw new Error("Admission number must use the format SCHOOLCODE-YEAR-SEQUENCE, for example BSS-2026-0001");
    }
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
        (newAdmissionNo && newAdmissionNo !== sanitizeText(existingData.admission_no || "")) ||
        newRemarks !== (existingData.remarks || "") ||
        JSON.stringify(newScores) !== JSON.stringify(existingExamScoreForType);

      if (changed) {
        if (newAdmissionNo && newAdmissionNo !== sanitizeText(existingData.admission_no || "")) {
          const existingAdmission = await findStudentByAdmissionNo(db, newAdmissionNo, {
            excludeClassId: classId,
            excludeStudentId: existing.ref.id,
          });
          if (existingAdmission) {
            throw new Error(`Admission number ${newAdmissionNo} already exists for another student`);
          }
        }
        const updates = {
          name,
          sex: newSex,
          status: newStatus,
          remarks: newRemarks,
          exam_scores: { ...existingExamScores, [examType]: newScores },
        };
        if (newAdmissionNo) {
          updates.admission_no = newAdmissionNo;
        }
        if (examType === DEFAULT_EXAM_TYPE) {
          updates.scores = newScores;
        } else if (Array.isArray(existingExamScores[DEFAULT_EXAM_TYPE])) {
          updates.scores = existingExamScores[DEFAULT_EXAM_TYPE];
        }
        toUpdate.push({
          ref: existing.ref,
          studentId: existing.ref.id,
          prevData: existingData,
          updates,
          payload: auditMeta,
        });
      } else {
        skipped += 1;
      }
      continue;
    }

    const finalIndexNo = incomingIndexNo || formatCno(cursor++);
    if (newAdmissionNo) {
      const existingAdmission = await findStudentByAdmissionNo(db, newAdmissionNo);
      if (existingAdmission) {
        throw new Error(`Admission number ${newAdmissionNo} already exists for another student`);
      }
    }
    const studentData = {
      index_no: finalIndexNo,
      admission_no: newAdmissionNo,
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

  for (const entry of toUpdate) {
    await writeStudentAuditLog(db, classId, classSnap, entry.prevData, entry.updates, {
      ...entry.payload,
      id: entry.studentId,
    });
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
  reorderStudentsBySexAndRegenerateCnos,
};
