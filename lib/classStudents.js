const {
  parseStudent,
  DEFAULT_EXAM_TYPE,
  getClassSnapshot,
  assertClassResultsEditable,
  parseClass,
} = require("./classes");
const {
  formatCno,
  formatTemporaryCno,
  isValidAdmissionNo,
  sanitizeAdmissionNo,
  sanitizeScores,
  sanitizeText,
  loadExistingStudentsByIndexNo,
  loadExistingStudentsByAdmissionNo,
  findStudentByAdmissionNo,
} = require("./students");
const { normalizeTzPhone } = require("./phone");

const VALID_STATUSES = ["present", "absent", "incomplete"];
const MAX_BULK_STREAM_STUDENTS = 200;
const VALID_ENROLLMENT_STATUSES = [
  "active",
  "promoted",
  "transferred",
  "graduated",
  "repeater",
  "left",
];

const normalizeParentPhone = (value) => {
  const raw = sanitizeText(value ?? "");
  if (!raw) return "";
  const normalized = normalizeTzPhone(raw);
  if (!normalized) {
    throw new Error("Guardian phone number must be a valid Tanzania mobile number, for example 255712345678");
  }
  return normalized;
};
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

const normalizeEnrollmentStatus = (value, fallback = "active") => {
  const normalized = sanitizeText(value || "").toLowerCase();
  return VALID_ENROLLMENT_STATUSES.includes(normalized) ? normalized : fallback;
};

const sanitizeConduct = (value) => {
  const raw = value && typeof value === "object" ? value : {};
  return CONDUCT_KEYS.reduce((acc, key) => {
    const normalized = sanitizeText(raw[key] ?? "").toUpperCase();
    acc[key] = VALID_CONDUCT_GRADES.has(normalized) ? normalized : "";
    return acc;
  }, {});
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

const getFormClassSnapshots = async (db, { year = "", form = "" } = {}) => {
  const normalizedYear = sanitizeText(year || "");
  const normalizedForm = sanitizeText(form || "");
  if (!normalizedYear || !normalizedForm) return [];
  const snapshot = await db
    .collection("classes")
    .where("year", "==", normalizedYear)
    .where("form", "==", normalizedForm)
    .get();
  return snapshot.docs.filter(
    (doc) =>
      !doc.data().archived &&
      String(doc.data().stream_status || "active").trim().toLowerCase() !== "inactive",
  );
};

const parseStableCno = (value) => {
  const raw = sanitizeText(value || "").toUpperCase();
  const match = raw.match(/^S6509\/(\d+)$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const compareStudentsForStableCnoOrder = (left, right) => {
  const leftStableCno = parseStableCno(left.data.index_no);
  const rightStableCno = parseStableCno(right.data.index_no);
  if (leftStableCno != null && rightStableCno != null) {
    return leftStableCno - rightStableCno;
  }
  if (leftStableCno != null) return -1;
  if (rightStableCno != null) return 1;

  const leftName = sanitizeText(left.data.name || "");
  const rightName = sanitizeText(right.data.name || "");
  const nameDiff = leftName.localeCompare(rightName, "en", { sensitivity: "base" });
  if (nameDiff !== 0) return nameDiff;

  const leftAdmission = sanitizeAdmissionNo(left.data.admission_no || "");
  const rightAdmission = sanitizeAdmissionNo(right.data.admission_no || "");
  const admissionDiff = leftAdmission.localeCompare(rightAdmission, "en", { sensitivity: "base", numeric: true });
  if (admissionDiff !== 0) return admissionDiff;

  const leftIndex = sanitizeText(left.data.index_no || "");
  const rightIndex = sanitizeText(right.data.index_no || "");
  const indexDiff = leftIndex.localeCompare(rightIndex, "en", { sensitivity: "base", numeric: true });
  if (indexDiff !== 0) return indexDiff;

  return `${left.classRef.id}:${left.ref.id}`.localeCompare(`${right.classRef.id}:${right.ref.id}`, "en");
};

const compareStudentsForGroupedCnoOrder = (left, right) => {
  const leftSexRank = left.data.sex === "F" ? 0 : 1;
  const rightSexRank = right.data.sex === "F" ? 0 : 1;
  if (leftSexRank !== rightSexRank) return leftSexRank - rightSexRank;
  return compareStudentsForStableCnoOrder(left, right);
};

const syncFormCnosForClass = async (db, classId, options = {}) => {
  const { classSnap } = await getClassSnapshot(db, classId);
  const baseData = classSnap.data();
  const classDocs = await getFormClassSnapshots(db, {
    year: baseData.year,
    form: baseData.form,
  });

  classDocs.forEach((doc) => {
    assertClassResultsEditable(
      doc,
      "Results are published for this form. Unpublish them before regenerating CNO values.",
    );
  });

  const allStudents = [];
  for (const classDoc of classDocs) {
    const studentsSnap = await classDoc.ref.collection("students").get();
    studentsSnap.docs.forEach((doc) => {
      allStudents.push({
        classRef: classDoc.ref,
        classId: classDoc.id,
        ref: doc.ref,
        data: doc.data(),
      });
    });
  }

  allStudents.sort(options.groupBySex ? compareStudentsForGroupedCnoOrder : compareStudentsForStableCnoOrder);

  const updates = [];
  let femaleCount = 0;
  let maleCount = 0;

  allStudents.forEach((entry, index) => {
    if (entry.data.sex === "F") femaleCount += 1;
    else maleCount += 1;

    const nextIndexNo = formatCno(index + 1);
    if (sanitizeText(entry.data.index_no || "") !== nextIndexNo) {
      updates.push({ ref: entry.ref, updates: { index_no: nextIndexNo } });
    }
  });

  for (let index = 0; index < updates.length; index += 400) {
    const batch = db.batch();
    updates.slice(index, index + 400).forEach(({ ref, updates: docUpdates }) => {
      batch.update(ref, docUpdates);
    });
    await batch.commit();
  }

  const totalStudents = allStudents.length;
  const now = new Date().toISOString();
  for (let index = 0; index < classDocs.length; index += 400) {
    const batch = db.batch();
    classDocs.slice(index, index + 400).forEach((doc) => {
      batch.update(doc.ref, {
        cno_counter: totalStudents,
        updated_at: now,
      });
    });
    await batch.commit();
  }

  return {
    success: true,
    total: totalStudents,
    updated: updates.length,
    unchanged: totalStudents - updates.length,
    femaleCount,
    maleCount,
    classCount: classDocs.length,
    year: sanitizeText(baseData.year || ""),
    form: sanitizeText(baseData.form || ""),
  };
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
  const enrollmentStatus = normalizeEnrollmentStatus(payload.enrollmentStatus ?? payload.enrollment_status, "active");
  const status = normalizeStatus(payload.status, "present");
  const dateOfBirth = sanitizeText(payload.dateOfBirth ?? "");
  const parentName = sanitizeText(payload.parentName ?? "");
  const parentPhone = normalizeParentPhone(
    payload.parentPhone ?? payload.parent_phone ?? payload.guardianPhone ?? "",
  );
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
    indexNo = formatTemporaryCno(`${classId}-${Date.now()}`);
  }

  const scores = sanitizeScores(payload.scores, subjects.length);
  const studentData = {
    index_no: indexNo,
    admission_no: admissionNo,
    name,
    sex,
    enrollment_status: enrollmentStatus,
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

  await syncFormCnosForClass(db, classId);
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
  if (typeof payload.enrollmentStatus === "string" || typeof payload.enrollment_status === "string") {
    updates.enrollment_status = normalizeEnrollmentStatus(
      payload.enrollmentStatus ?? payload.enrollment_status,
      prevData.enrollment_status || "active"
    );
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
  const parentPhoneInput = payload.parentPhone ?? payload.parent_phone ?? payload.guardianPhone;
  if (typeof parentPhoneInput === "string") {
    updates.parent_phone = normalizeParentPhone(parentPhoneInput);
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
  const shouldResequence = ["index_no", "name", "sex"].some((key) =>
    Object.prototype.hasOwnProperty.call(updates, key)
  );
  if (shouldResequence) {
    await syncFormCnosForClass(db, classId);
  }
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
  await syncFormCnosForClass(db, classId);
  return { success: true };
};

const assertTargetStreamAvailable = (targetClassSnap, incomingCount = 1) => {
  const data = targetClassSnap.data();
  if (data.archived || String(data.stream_status || "active").toLowerCase() !== "active") {
    throw new Error("Target stream is inactive");
  }
  const capacity = Number(data.stream_capacity || 0);
  const currentCount = Number(data.student_count || 0);
  if (capacity > 0 && currentCount + incomingCount > capacity) {
    throw new Error(`Target stream capacity is ${capacity}; only ${Math.max(0, capacity - currentCount)} places remain`);
  }
};

const buildMovedStudentData = ({ studentData, sourceClass, sourceClassId, studentId, targetClassSnap, indexNo }) => {
  const targetSubjectCount = getSubjects(targetClassSnap).length;
  const existingExamScores =
    studentData.exam_scores && typeof studentData.exam_scores === "object" ? studentData.exam_scores : {};
  const examScores = Object.fromEntries(
    Object.entries(existingExamScores).map(([examType, scores]) => [
      sanitizeText(examType || ""),
      sanitizeScores(scores, targetSubjectCount),
    ]),
  );
  const targetOptionalSubjects = new Set(
    getOptionalSubjectNames(targetClassSnap).map((entry) => entry.toLowerCase()),
  );
  const optionalSubjects = (Array.isArray(studentData.optional_subjects) ? studentData.optional_subjects : [])
    .map((entry) => sanitizeText(entry || ""))
    .filter((entry) => entry && targetOptionalSubjects.has(entry.toLowerCase()));
  const movedAt = new Date().toISOString();
  const sourceLabel = sourceClass.name || `${sourceClass.form} ${sourceClass.stream} ${sourceClass.year}`.trim();
  return {
    ...studentData,
    index_no: sanitizeText(indexNo || studentData.index_no || "") || formatTemporaryCno(`${sourceClassId}-${studentId}-${Date.now()}`),
    admission_no: sanitizeAdmissionNo(studentData.admission_no || ""),
    optional_subjects: optionalSubjects,
    exam_scores: examScores,
    scores: sanitizeScores(examScores[DEFAULT_EXAM_TYPE] || studentData.scores || [], targetSubjectCount),
    updated_at: movedAt,
    stream_transfer_from: { classId: sourceClassId, classLabel: sourceLabel, studentId, movedAt },
  };
};

const bulkMoveStudentsToClass = async (db, assignments = [], targetClassId) => {
  const normalizedTargetClassId = sanitizeText(targetClassId || "");
  const normalizedAssignments = Array.from(
    new Map(
      (Array.isArray(assignments) ? assignments : []).map((entry) => {
        const sourceClassId = sanitizeText(entry?.sourceClassId || entry?.classId || "");
        const studentId = sanitizeText(entry?.studentId || entry?.id || "");
        return [`${sourceClassId}:${studentId}`, { sourceClassId, studentId }];
      }),
    ).values(),
  ).filter((entry) => entry.sourceClassId && entry.studentId);
  if (!normalizedTargetClassId || !normalizedAssignments.length) {
    throw new Error("Target stream and at least one student are required");
  }
  if (normalizedAssignments.length > MAX_BULK_STREAM_STUDENTS) {
    throw new Error(`Bulk stream assignment is limited to ${MAX_BULK_STREAM_STUDENTS} students at a time`);
  }
  if (normalizedAssignments.some((entry) => entry.sourceClassId === normalizedTargetClassId)) {
    throw new Error("Students already in the target stream must be removed from the selection");
  }

  const { classRef: targetClassRef, classSnap: targetClassSnap } = await getClassSnapshot(db, normalizedTargetClassId);
  assertClassResultsEditable(targetClassSnap, "Results are published for the target stream. Unpublish them before moving students.");
  assertTargetStreamAvailable(targetClassSnap, normalizedAssignments.length);
  const targetClass = parseClass(targetClassSnap);
  const loaded = await Promise.all(
    normalizedAssignments.map(async ({ sourceClassId, studentId }) => {
      const snapshot = await getStudentSnapshot(db, sourceClassId, studentId);
      assertClassResultsEditable(snapshot.classSnap, "Results are published for a source stream. Unpublish them before moving students.");
      const sourceClass = parseClass(snapshot.classSnap);
      if (sourceClass.year !== targetClass.year || sourceClass.form !== targetClass.form) {
        throw new Error("Students can only be reassigned between streams of the same form and year");
      }
      return { sourceClassId, studentId, sourceClass, ...snapshot };
    }),
  );

  const targetStudentsSnap = await targetClassRef.collection("students").get();
  const targetAdmissions = new Set(
    targetStudentsSnap.docs.map((doc) => sanitizeAdmissionNo(doc.data().admission_no || "")).filter(Boolean),
  );
  const incomingAdmissions = new Set();
  loaded.forEach(({ studentSnap }) => {
    const admissionNo = sanitizeAdmissionNo(studentSnap.data().admission_no || "");
    if (!admissionNo) return;
    if (targetAdmissions.has(admissionNo) || incomingAdmissions.has(admissionNo)) {
      throw new Error(`Target stream already has admission number ${admissionNo}`);
    }
    incomingAdmissions.add(admissionNo);
  });

  const batch = db.batch();
  const sourceCounts = new Map();
  const moved = loaded.map((entry, index) => {
    const targetStudentRef = targetClassRef.collection("students").doc();
    const movedStudent = buildMovedStudentData({
      studentData: entry.studentSnap.data(),
      sourceClass: entry.sourceClass,
      sourceClassId: entry.sourceClassId,
      studentId: entry.studentId,
      targetClassSnap,
      indexNo: formatTemporaryCno(`${normalizedTargetClassId}-${index + 1}-${Date.now()}`),
    });
    batch.set(targetStudentRef, movedStudent);
    batch.delete(entry.studentRef);
    const countEntry = sourceCounts.get(entry.sourceClassId) || {
      ref: entry.classRef,
      current: Number(entry.classSnap.data().student_count || 0),
      moved: 0,
    };
    countEntry.moved += 1;
    sourceCounts.set(entry.sourceClassId, countEntry);
    return { name: sanitizeText(entry.studentSnap.data().name || ""), sourceClassId: entry.sourceClassId };
  });
  sourceCounts.forEach((entry) => {
    batch.update(entry.ref, { student_count: Math.max(0, entry.current - entry.moved), updated_at: new Date().toISOString() });
  });
  batch.update(targetClassRef, {
    student_count: Number(targetClassSnap.data().student_count || 0) + loaded.length,
    updated_at: new Date().toISOString(),
  });
  await batch.commit();
  await syncFormCnosForClass(db, normalizedTargetClassId);

  return {
    success: true,
    moved: moved.length,
    students: moved,
    targetClassId: normalizedTargetClassId,
    targetClass: targetClass.name || `${targetClass.form} ${targetClass.stream} ${targetClass.year}`.trim(),
  };
};

const moveStudentToClass = async (db, sourceClassId, studentId, targetClassId) => {
  const result = await bulkMoveStudentsToClass(db, [{ sourceClassId, studentId }], targetClassId);
  return {
    ...result,
    sourceClassId: sanitizeText(sourceClassId || ""),
    studentName: result.students[0]?.name || "",
    movedAt: new Date().toISOString(),
  };
};

const listUnassignedStudents = async (db, { year = "", form = "" } = {}) => {
  const snap = await db.collection("unassigned_students").orderBy("unassigned_at", "desc").get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((entry) => (!year || entry.year === year) && (!form || entry.form === form));
};

const unassignStudentsFromStreams = async (db, assignments = []) => {
  const normalized = Array.from(
    new Map(
      (Array.isArray(assignments) ? assignments : []).map((entry) => {
        const sourceClassId = sanitizeText(entry?.sourceClassId || entry?.classId || "");
        const studentId = sanitizeText(entry?.studentId || entry?.id || "");
        return [`${sourceClassId}:${studentId}`, { sourceClassId, studentId }];
      }),
    ).values(),
  ).filter((entry) => entry.sourceClassId && entry.studentId);
  if (!normalized.length) throw new Error("Select at least one student to unassign");
  if (normalized.length > MAX_BULK_STREAM_STUDENTS) throw new Error(`Bulk unassignment is limited to ${MAX_BULK_STREAM_STUDENTS} students at a time`);

  const loaded = await Promise.all(
    normalized.map(async ({ sourceClassId, studentId }) => {
      const snapshot = await getStudentSnapshot(db, sourceClassId, studentId);
      assertClassResultsEditable(snapshot.classSnap, "Results are published for a source stream. Unpublish them before unassigning students.");
      return { sourceClassId, studentId, sourceClass: parseClass(snapshot.classSnap), ...snapshot };
    }),
  );
  const batch = db.batch();
  const sourceCounts = new Map();
  const now = new Date().toISOString();
  loaded.forEach((entry) => {
    const unassignedRef = db.collection("unassigned_students").doc();
    batch.set(unassignedRef, {
      year: entry.sourceClass.year,
      form: entry.sourceClass.form,
      previous_stream: entry.sourceClass.stream,
      source_class_id: entry.sourceClassId,
      source_student_id: entry.studentId,
      student: entry.studentSnap.data(),
      name: sanitizeText(entry.studentSnap.data().name || ""),
      admission_no: sanitizeAdmissionNo(entry.studentSnap.data().admission_no || ""),
      sex: entry.studentSnap.data().sex === "F" ? "F" : "M",
      unassigned_at: now,
    });
    batch.delete(entry.studentRef);
    const countEntry = sourceCounts.get(entry.sourceClassId) || {
      ref: entry.classRef,
      current: Number(entry.classSnap.data().student_count || 0),
      moved: 0,
    };
    countEntry.moved += 1;
    sourceCounts.set(entry.sourceClassId, countEntry);
  });
  sourceCounts.forEach((entry) => batch.update(entry.ref, {
    student_count: Math.max(0, entry.current - entry.moved),
    updated_at: now,
  }));
  await batch.commit();
  if (loaded[0]?.sourceClassId) {
    await syncFormCnosForClass(db, loaded[0].sourceClassId);
  }
  return { success: true, unassigned: loaded.length };
};

const assignUnassignedStudentsToClass = async (db, unassignedIds = [], targetClassId) => {
  const ids = Array.from(new Set((Array.isArray(unassignedIds) ? unassignedIds : []).map((id) => sanitizeText(id)).filter(Boolean)));
  if (!ids.length || !targetClassId) throw new Error("Target stream and unassigned students are required");
  if (ids.length > MAX_BULK_STREAM_STUDENTS) throw new Error(`Bulk assignment is limited to ${MAX_BULK_STREAM_STUDENTS} students at a time`);
  const { classRef: targetClassRef, classSnap: targetClassSnap } = await getClassSnapshot(db, targetClassId);
  assertClassResultsEditable(targetClassSnap, "Results are published for the target stream. Unpublish them before assigning students.");
  assertTargetStreamAvailable(targetClassSnap, ids.length);
  const targetClass = parseClass(targetClassSnap);
  const unassigned = await Promise.all(ids.map(async (id) => {
    const ref = db.collection("unassigned_students").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Unassigned student not found");
    const data = snap.data();
    if (data.year !== targetClass.year || data.form !== targetClass.form) {
      throw new Error("Unassigned students must match the target form and academic year");
    }
    return { id, ref, data };
  }));
  const existingSnap = await targetClassRef.collection("students").get();
  const admissions = new Set(existingSnap.docs.map((doc) => sanitizeAdmissionNo(doc.data().admission_no || "")).filter(Boolean));
  unassigned.forEach((entry) => {
    const admissionNo = sanitizeAdmissionNo(entry.data.admission_no || entry.data.student?.admission_no || "");
    if (admissionNo && admissions.has(admissionNo)) throw new Error(`Target stream already has admission number ${admissionNo}`);
    if (admissionNo) admissions.add(admissionNo);
  });
  const batch = db.batch();
  unassigned.forEach((entry, index) => {
    const studentData = entry.data.student && typeof entry.data.student === "object" ? entry.data.student : {};
    const targetStudentRef = targetClassRef.collection("students").doc();
    batch.set(targetStudentRef, buildMovedStudentData({
      studentData,
      sourceClass: { name: "Unassigned", form: entry.data.form, stream: "", year: entry.data.year },
      sourceClassId: entry.data.source_class_id || "unassigned",
      studentId: entry.data.source_student_id || entry.id,
      targetClassSnap,
      indexNo: formatTemporaryCno(`${targetClassId}-${index + 1}-${Date.now()}`),
    }));
    batch.delete(entry.ref);
  });
  batch.update(targetClassRef, {
    student_count: Number(targetClassSnap.data().student_count || 0) + unassigned.length,
    updated_at: new Date().toISOString(),
  });
  await batch.commit();
  await syncFormCnosForClass(db, targetClassId);
  return { success: true, assigned: unassigned.length, targetClassId };
};

const reorderStudentsBySexAndRegenerateCnos = async (db, classId) => {
  return syncFormCnosForClass(db, classId, { groupBySex: true });
};

const bulkImportStudents = async (db, classId, rawStudents, rawExamType) => {
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

  const validStudents = students.filter((student) => sanitizeText(student.name || ""));
  const requestedIndexNos = validStudents
    .map((student) => sanitizeText(student.indexNo || ""))
    .filter(Boolean);
  const requestedAdmissionNos = validStudents
    .map((student) => sanitizeAdmissionNo(student.admissionNo ?? student.admission_no ?? ""))
    .filter(Boolean);
  const existingByIndexNo = await loadExistingStudentsByIndexNo(classRef, requestedIndexNos);
  const existingByAdmissionNo = await loadExistingStudentsByAdmissionNo(classRef, requestedAdmissionNos);
  const createdAt = new Date().toISOString();
  const toCreate = [];
  const toUpdate = [];
  let skipped = 0;

  for (const raw of validStudents) {
    const name = sanitizeText(raw.name || "");
    if (!name) continue;

    const incomingIndexNo = sanitizeText(raw.indexNo || "");
    const existingByIndex = incomingIndexNo ? existingByIndexNo[incomingIndexNo] : null;
    const newSex = raw.sex === "F" ? "F" : "M";
    const newStatus = normalizeStatus(raw.status, "present");
    const newAdmissionNo = sanitizeAdmissionNo(raw.admissionNo ?? raw.admission_no ?? "");
    const existingByAdmission = newAdmissionNo ? existingByAdmissionNo[newAdmissionNo] : null;
    if (
      existingByIndex &&
      existingByAdmission &&
      existingByIndex.ref.id !== existingByAdmission.ref.id
    ) {
      throw new Error(
        `Imported row for ${name} points to different students by CNO and Admission Number`
      );
    }
    const existing = existingByAdmission || existingByIndex;
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
        normalizeEnrollmentStatus(raw.enrollmentStatus ?? raw.enrollment_status, existingData.enrollment_status || "active") !==
          (existingData.enrollment_status || "active") ||
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
          enrollment_status: normalizeEnrollmentStatus(
            raw.enrollmentStatus ?? raw.enrollment_status,
            existingData.enrollment_status || "active"
          ),
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
        toUpdate.push({ ref: existing.ref, updates });
      } else {
        skipped += 1;
      }
      continue;
    }

    const finalIndexNo = incomingIndexNo || formatTemporaryCno(`${classId}-${toCreate.length + 1}-${Date.now()}`);
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
      enrollment_status: normalizeEnrollmentStatus(raw.enrollmentStatus ?? raw.enrollment_status, "active"),
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

  await syncFormCnosForClass(db, classId);

  return {
    success: true,
    created: toCreate.length,
    updated: toUpdate.length,
    skipped,
  };
};

const promoteStudentsToClass = async (db, sourceClassId, targetClassId) => {
  const normalizedSourceClassId = sanitizeText(sourceClassId || "");
  const normalizedTargetClassId = sanitizeText(targetClassId || "");
  if (!normalizedSourceClassId || !normalizedTargetClassId) {
    throw new Error("Source class and target class are required");
  }
  if (normalizedSourceClassId === normalizedTargetClassId) {
    throw new Error("Source class and target class must be different");
  }

  const { classRef: sourceClassRef, classSnap: sourceClassSnap } = await getClassSnapshot(
    db,
    normalizedSourceClassId
  );
  const { classRef: targetClassRef, classSnap: targetClassSnap } = await getClassSnapshot(
    db,
    normalizedTargetClassId
  );

  assertClassResultsEditable(
    targetClassSnap,
    "Results are published for the target class. Unpublish them before promotion or rollover."
  );

  const sourceClass = parseClass(sourceClassSnap);
  const targetClass = parseClass(targetClassSnap);
  const sourceStudentsSnap = await sourceClassRef.collection("students").orderBy("index_no", "asc").get();
  const targetStudentsSnap = await targetClassRef.collection("students").get();
  const targetOptionalSubjects = new Set(getOptionalSubjectNames(targetClassSnap).map((entry) => entry.toLowerCase()));
  const targetByAdmissionNo = new Map();
  const targetByIndexNo = new Map();

  targetStudentsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const admissionNo = sanitizeText(data.admission_no || "").toUpperCase();
    const indexNo = sanitizeText(data.index_no || "").toUpperCase();
    if (admissionNo) targetByAdmissionNo.set(admissionNo, { ref: doc.ref, data, id: doc.id });
    if (indexNo) targetByIndexNo.set(indexNo, { ref: doc.ref, data, id: doc.id });
  });

  const sourceStudents = sourceStudentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const toCreate = [];
  const toUpdate = [];
  let skipped = 0;
  const now = new Date().toISOString();

  sourceStudents.forEach((student) => {
    const admissionNo = sanitizeText(student.admission_no || "").toUpperCase();
    const indexNo = sanitizeText(student.index_no || "").toUpperCase();
    const match = admissionNo
      ? targetByAdmissionNo.get(admissionNo)
      : indexNo
      ? targetByIndexNo.get(indexNo)
      : null;
    const optionalSubjects = (Array.isArray(student.optional_subjects) ? student.optional_subjects : [])
      .map((entry) => sanitizeText(entry || ""))
      .filter((entry) => entry && targetOptionalSubjects.has(entry.toLowerCase()));

    if (match) {
      const updates = {
        admission_no: admissionNo || "",
        name: sanitizeText(student.name || ""),
        sex: student.sex === "F" ? "F" : "M",
        enrollment_status: normalizeEnrollmentStatus(student.enrollment_status || "active", "active"),
        date_of_birth: sanitizeText(student.date_of_birth || ""),
        parent_name: sanitizeText(student.parent_name || ""),
        parent_phone: sanitizeText(student.parent_phone || ""),
        address: sanitizeText(student.address || ""),
        previous_school: sanitizeText(student.previous_school || ""),
        optional_subjects: optionalSubjects,
        updated_at: now,
        rollover_from: {
          classId: normalizedSourceClassId,
          classLabel: sourceClass.name || `${sourceClass.form} ${sourceClass.stream} ${sourceClass.year}`.trim(),
          studentId: student.id,
          rolledAt: now,
        },
      };
      toUpdate.push({ ref: match.ref, updates });
      return;
    }

    toCreate.push({
      admission_no: admissionNo || "",
      name: sanitizeText(student.name || ""),
      sex: student.sex === "F" ? "F" : "M",
      enrollment_status: "active",
      status: "present",
      date_of_birth: sanitizeText(student.date_of_birth || ""),
      parent_name: sanitizeText(student.parent_name || ""),
      parent_phone: sanitizeText(student.parent_phone || ""),
      address: sanitizeText(student.address || ""),
      previous_school: sanitizeText(student.previous_school || ""),
      remarks: "",
      conduct: sanitizeConduct({}),
      optional_subjects: optionalSubjects,
      exam_scores: {},
      scores: [],
      created_at: now,
      rollover_from: {
        classId: normalizedSourceClassId,
        classLabel: sourceClass.name || `${sourceClass.form} ${sourceClass.stream} ${sourceClass.year}`.trim(),
        studentId: student.id,
        rolledAt: now,
      },
    });
  });

  if (!toCreate.length && !toUpdate.length) {
    return {
      success: true,
      sourceClass: sourceClass.name || normalizedSourceClassId,
      targetClass: targetClass.name || normalizedTargetClassId,
      totalSourceStudents: sourceStudents.length,
      created: 0,
      updated: 0,
      skipped,
    };
  }

  toCreate.forEach((student, index) => {
    student.index_no = formatTemporaryCno(`${normalizedTargetClassId}-${index + 1}-${Date.now()}`);
  });

  for (let index = 0; index < toUpdate.length; index += 400) {
    const batch = db.batch();
    toUpdate.slice(index, index + 400).forEach(({ ref, updates }) => batch.update(ref, updates));
    await batch.commit();
  }

  for (let index = 0; index < toCreate.length; index += 400) {
    const batch = db.batch();
    toCreate.slice(index, index + 400).forEach((student) => {
      batch.set(targetClassRef.collection("students").doc(), student);
    });
    await batch.commit();
  }

  if (toCreate.length > 0) {
    await targetClassRef.update({
      student_count: Number(targetClassSnap.data().student_count || 0) + toCreate.length,
    });
  }

  await syncFormCnosForClass(db, normalizedTargetClassId);

  return {
    success: true,
    sourceClass: sourceClass.name || normalizedSourceClassId,
    targetClass: targetClass.name || normalizedTargetClassId,
    totalSourceStudents: sourceStudents.length,
    created: toCreate.length,
    updated: toUpdate.length,
    skipped,
  };
};

// --- Duplicate detection & cleanup -----------------------------------------
// Duplicates arise when the same student is imported more than once and the
// import cannot match an existing record (blank/mismatched CNO and no admission
// number). Grouping is by normalized name because that is the only field the
// duplicate copies reliably share.
const normalizeNameKey = (value) =>
  sanitizeText(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ");

const countFilledScores = (scores) =>
  (Array.isArray(scores) ? scores : []).filter(
    (value) => value !== "" && value !== null && value !== undefined
  ).length;

const summarizeExamScores = (examScores) => {
  const map = examScores && typeof examScores === "object" ? examScores : {};
  const filledExams = [];
  let totalFilled = 0;
  for (const [exam, scores] of Object.entries(map)) {
    const filled = countFilledScores(scores);
    if (filled > 0) {
      filledExams.push(exam);
      totalFilled += filled;
    }
  }
  return { filledExams, totalFilled };
};

// Comparable timestamp for "which upload is newer". `created_at` is written as
// an ISO string on import; undated docs sort oldest.
const createdAtValue = (data) => {
  const raw = data?.created_at || data?.createdAt || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Within a duplicate group, decide which copy to keep: newest upload first,
// then the one carrying the most marks, then a real (non-temporary) CNO, then
// a stable id tie-break.
const rankKeepFirst = (a, b) => {
  if (b.createdAtValue !== a.createdAtValue) return b.createdAtValue - a.createdAtValue;
  if (b.totalFilled !== a.totalFilled) return b.totalFilled - a.totalFilled;
  const aTmp = a.indexNo.startsWith("TMP-") ? 1 : 0;
  const bTmp = b.indexNo.startsWith("TMP-") ? 1 : 0;
  if (aTmp !== bTmp) return aTmp - bTmp;
  return a.id.localeCompare(b.id);
};

const findDuplicateStudentGroups = async (db, classId) => {
  const { classRef } = await getClassSnapshot(db, classId);
  const studentsSnap = await classRef.collection("students").get();

  const byName = new Map();
  studentsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const key = normalizeNameKey(data.name || "");
    if (!key) return;
    if (!byName.has(key)) byName.set(key, []);
    const { filledExams, totalFilled } = summarizeExamScores(data.exam_scores);
    byName.get(key).push({
      id: doc.id,
      name: sanitizeText(data.name || ""),
      indexNo: sanitizeText(data.index_no || ""),
      admissionNo: sanitizeText(data.admission_no || ""),
      sex: data.sex === "F" ? "F" : "M",
      createdAt: data.created_at || null,
      createdAtValue: createdAtValue(data),
      filledExams,
      totalFilled,
    });
  });

  const groups = [];
  let removableCount = 0;
  let reviewCount = 0;
  for (const members of byName.values()) {
    if (members.length < 2) continue;
    const sorted = members.slice().sort(rankKeepFirst);
    const [keep, ...remove] = sorted;
    // A name collision is only a safe auto-duplicate when the copies are
    // clearly the same person. Two or more DISTINCT admission numbers means
    // these are different students who happen to share a name — flag for
    // manual review and never auto-remove them.
    const distinctAdmissions = new Set(
      members.map((m) => m.admissionNo).filter(Boolean)
    );
    if (distinctAdmissions.size >= 2) {
      reviewCount += 1;
      groups.push({ name: keep.name, review: true, keep, remove: [], members: sorted });
    } else {
      removableCount += remove.length;
      groups.push({ name: keep.name, review: false, keep, remove });
    }
  }
  groups.sort((a, b) => a.name.localeCompare(b.name, "en"));

  return {
    classId,
    totalStudents: studentsSnap.size,
    groupCount: groups.filter((g) => !g.review).length,
    reviewCount,
    removableCount,
    groups,
  };
};

// True when a value carries no meaningful data and may be backfilled from a
// duplicate copy being removed.
const isEmptyValue = (value) => {
  if (value === "" || value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};

// A single score slot is empty (backfillable) only when blank/null/undefined.
// 0 and "ABS" are real marks and must never be treated as empty.
const isEmptyScore = (value) => value === "" || value === null || value === undefined;

const MERGE_TEXT_FIELDS = [
  "admission_no",
  "date_of_birth",
  "parent_name",
  "parent_phone",
  "address",
  "previous_school",
  "remarks",
];

// Consolidate the copies being removed into the kept record so no marks or
// details are lost. The kept (newest) record wins wherever it already has data;
// removed copies (newest-first) only backfill fields the kept record is missing.
const buildMergeUpdates = (keepData, removeDatas) => {
  const ordered = removeDatas
    .slice()
    .sort((a, b) => createdAtValue(b) - createdAtValue(a));
  const updates = {};

  for (const field of MERGE_TEXT_FIELDS) {
    if (!isEmptyValue(keepData[field])) continue;
    const donor = ordered.find((d) => !isEmptyValue(d[field]));
    if (donor) updates[field] = donor[field];
  }

  if (isEmptyValue(keepData.conduct)) {
    const donor = ordered.find((d) => !isEmptyValue(d.conduct));
    if (donor) updates.conduct = donor.conduct;
  }
  if (isEmptyValue(keepData.optional_subjects)) {
    const donor = ordered.find((d) => !isEmptyValue(d.optional_subjects));
    if (donor) updates.optional_subjects = donor.optional_subjects;
  }

  // Per-exam, per-subject scores: the kept (newest) record wins for any subject
  // slot it already has a mark in; every other slot is backfilled from the
  // removed copies (newest-first). This merges complementary marks in the same
  // exam instead of dropping a whole exam just because the kept copy has one
  // subject filled. Legacy docs store the default exam's marks only in the
  // top-level `scores` field (parseStudent uses it as the DEFAULT_EXAM_TYPE
  // fallback), so fold that into the effective exam_scores for both sides.
  const effectiveExamScores = (data) => {
    const map =
      data.exam_scores && typeof data.exam_scores === "object"
        ? { ...data.exam_scores }
        : {};
    if (!Array.isArray(map[DEFAULT_EXAM_TYPE]) && Array.isArray(data.scores)) {
      map[DEFAULT_EXAM_TYPE] = data.scores;
    }
    return map;
  };

  const keepExamScores = effectiveExamScores(keepData);
  const donorExamScores = ordered.map(effectiveExamScores);
  let examScoresChanged = false;
  const examTypes = new Set();
  donorExamScores.forEach((map) => {
    Object.keys(map).forEach((exam) => examTypes.add(exam));
  });
  for (const exam of examTypes) {
    const donorArrays = donorExamScores
      .map((map) => map[exam])
      .filter((arr) => Array.isArray(arr));
    if (!donorArrays.length) continue;
    const merged = Array.isArray(keepExamScores[exam]) ? keepExamScores[exam].slice() : [];
    const maxLen = Math.max(merged.length, ...donorArrays.map((arr) => arr.length));
    let slotChanged = false;
    for (let i = 0; i < maxLen; i += 1) {
      if (!isEmptyScore(merged[i])) continue; // kept record's own mark wins
      const donorArr = donorArrays.find((arr) => !isEmptyScore(arr[i]));
      if (donorArr) {
        merged[i] = donorArr[i];
        slotChanged = true;
      }
    }
    // Also adopt the exam wholesale if the kept record didn't have it at all.
    if (slotChanged || !Array.isArray(keepExamScores[exam])) {
      if (merged.some((value) => !isEmptyScore(value))) {
        keepExamScores[exam] = merged;
        examScoresChanged = true;
      }
    }
  }
  if (examScoresChanged) {
    updates.exam_scores = keepExamScores;
    // Keep the legacy top-level mirror of the default exam in sync.
    if (countFilledScores(keepExamScores[DEFAULT_EXAM_TYPE]) > 0) {
      updates.scores = keepExamScores[DEFAULT_EXAM_TYPE];
    }
  }

  return updates;
};

// Merge each group's removed copies into its kept record, then delete the
// copies. `groups` is [{ keepId, removeIds: [...] }]. The operation is
// all-or-nothing: everything is validated (existence, no overlap, publish
// state) before any write happens.
const dedupeStudents = async (db, classId, groups = []) => {
  const { classRef, classSnap } = await getClassSnapshot(db, classId);
  assertClassResultsEditable(
    classSnap,
    "Results are published for this class. Unpublish them before removing students."
  );
  // syncFormCnosForClass (run after the writes) re-checks every stream in this
  // form/year and throws if any sibling is published. Preflight that check here
  // so a published sibling fails the request before anything is written.
  const formClassDocs = await getFormClassSnapshots(db, {
    year: classSnap.data().year,
    form: classSnap.data().form,
  });
  formClassDocs.forEach((doc) => {
    assertClassResultsEditable(
      doc,
      "Results are published for another stream in this form. Unpublish them before removing duplicates."
    );
  });

  const normalizedGroups = (Array.isArray(groups) ? groups : [])
    .map((group) => ({
      keepId: sanitizeText(group?.keepId || ""),
      removeIds: Array.from(
        new Set(
          (Array.isArray(group?.removeIds) ? group.removeIds : [])
            .map((id) => sanitizeText(id || ""))
            .filter(Boolean)
        )
      ),
    }))
    .filter((group) => group.keepId && group.removeIds.length);

  if (!normalizedGroups.length) {
    throw new Error("At least one duplicate is required to remove");
  }

  // No id may appear twice (as keep or remove) across the whole request.
  const seen = new Set();
  for (const group of normalizedGroups) {
    for (const id of [group.keepId, ...group.removeIds]) {
      if (seen.has(id)) {
        throw new Error("A student cannot be referenced more than once");
      }
      seen.add(id);
    }
  }

  // Load every referenced doc up front; abort if any is missing.
  const refFor = (id) => classRef.collection("students").doc(id);
  const loaded = new Map();
  await Promise.all(
    [...seen].map(async (id) => {
      const ref = refFor(id);
      const snap = await ref.get();
      loaded.set(id, { ref, snap });
    })
  );
  if ([...loaded.values()].some(({ snap }) => !snap.exists)) {
    throw new Error("One or more selected students no longer exist in this class");
  }

  // Apply merges + deletes in batches.
  const removeRefs = [];
  const writes = [];
  for (const group of normalizedGroups) {
    const keep = loaded.get(group.keepId);
    const removeDatas = group.removeIds.map((id) => loaded.get(id).snap.data());
    const updates = buildMergeUpdates(keep.snap.data(), removeDatas);
    if (Object.keys(updates).length) {
      writes.push({ type: "update", ref: keep.ref, updates });
    }
    group.removeIds.forEach((id) => {
      removeRefs.push(loaded.get(id).ref);
      writes.push({ type: "delete", ref: loaded.get(id).ref });
    });
  }

  for (let index = 0; index < writes.length; index += 400) {
    const batch = db.batch();
    writes.slice(index, index + 400).forEach((write) => {
      if (write.type === "delete") batch.delete(write.ref);
      else batch.update(write.ref, write.updates);
    });
    await batch.commit();
  }

  await classRef.update({
    student_count: Math.max(0, Number(classSnap.data().student_count || 0) - removeRefs.length),
  });
  await syncFormCnosForClass(db, classId);

  return { success: true, deleted: removeRefs.length };
};

module.exports = {
  DEFAULT_EXAM_TYPE,
  getStudentSnapshot,
  findDuplicateStudentGroups,
  dedupeStudents,
  listStudents,
  createStudentRecord,
  updateStudentRecord,
  deleteStudentRecord,
  moveStudentToClass,
  bulkMoveStudentsToClass,
  listUnassignedStudents,
  unassignStudentsFromStreams,
  assignUnassignedStudentsToClass,
  bulkImportStudents,
  reorderStudentsBySexAndRegenerateCnos,
  promoteStudentsToClass,
};
