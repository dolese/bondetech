const DEFAULT_SUBJECTS = [
  "CIV", "HTZ", "HIST", "GEO", "KISW",
  "ENG", "BIOS", "B/MATH", "CHEM", "PHYS", "BS",
];

const DEFAULT_SCHOOL = {
  name: "BONDE SECONDARY SCHOOL",
  authority: "PRIME MINISTER'S OFFICE",
  region: "TANGA",
  district: "MUHEZA DC",
  form: "Form I",
  term: "I",
  exam: "Mid-Term Exam",
  year: "2026",
};

const DEFAULT_EXAM_TYPE = "March Exam";
const ALLOWED_FORMS = ["Form I", "Form II", "Form III", "Form IV"];

const normalizeMonthlyExams = (monthlyExams) =>
  Array.isArray(monthlyExams)
    ? monthlyExams.filter((value) => typeof value === "string" && value.trim())
    : [];

const parseClass = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    schoolInfo: data.school_info || {},
    subjects: data.subjects || [],
    year: data.year || "",
    form: data.form || "",
    createdAt: data.created_at || null,
    studentCount: data.student_count || 0,
    archived: data.archived || false,
    archivedAt: data.archived_at || null,
    published: data.published || false,
    publishedAt: data.published_at || null,
    monthly_exams: normalizeMonthlyExams(data.monthly_exams),
  };
};

const parseStudent = (doc, classId, examType = DEFAULT_EXAM_TYPE) => {
  const data = doc.data();
  const examScores =
    data.exam_scores && typeof data.exam_scores === "object" ? data.exam_scores : {};
  const legacyScores = Array.isArray(data.scores) ? data.scores : [];

  return {
    id: doc.id,
    classId,
    indexNo: data.index_no || "",
    name: data.name || "",
    sex: data.sex || "M",
    status: data.status || "present",
    scores: Array.isArray(examScores[examType]) ? examScores[examType] : legacyScores,
    examScores,
    remarks: data.remarks || "",
    createdAt: data.created_at || null,
  };
};

const remapScores = (oldSubjects, newSubjects, scores) =>
  newSubjects.map((subject) => {
    const index = oldSubjects.indexOf(subject);
    return index >= 0 ? scores[index] ?? "" : "";
  });

const updateDocsInBatches = async (db, docs, updater) => {
  for (let index = 0; index < docs.length; index += 400) {
    const batch = db.batch();
    docs.slice(index, index + 400).forEach((doc) => {
      const updates = updater(doc);
      if (updates) {
        batch.update(doc.ref, updates);
      }
    });
    await batch.commit();
  }
};

const getClassRef = (db, classId) => db.collection("classes").doc(String(classId || ""));

const getClassSnapshot = async (db, classId) => {
  const classRef = getClassRef(db, classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    throw new Error("Class not found");
  }
  return { classRef, classSnap };
};

const ensureUniqueClass = async (db, { year, form, excludeId = "" }) => {
  const duplicate = await db
    .collection("classes")
    .where("year", "==", year)
    .where("form", "==", form)
    .limit(1)
    .get();

  if (!duplicate.empty && duplicate.docs[0].id !== excludeId) {
    throw new Error(`A class for ${form} ${year} already exists`);
  }
};

const listClasses = async (db, { includeArchived = false } = {}) => {
  const snapshot = await db.collection("classes").orderBy("created_at", "asc").get();
  return snapshot.docs
    .map(parseClass)
    .filter((item) => includeArchived || !item.archived);
};

const getClassWithStudents = async (db, classId) => {
  const { classRef, classSnap } = await getClassSnapshot(db, classId);
  const studentsSnap = await classRef.collection("students").orderBy("index_no", "asc").get();

  return {
    ...parseClass(classSnap),
    students: studentsSnap.docs.map((doc) => parseStudent(doc, classId)),
  };
};

const createClassRecord = async (db, payload = {}) => {
  const schoolInfo = payload.schoolInfo || DEFAULT_SCHOOL;
  const year = payload.year || schoolInfo.year || DEFAULT_SCHOOL.year;
  const form = payload.form || schoolInfo.form || DEFAULT_SCHOOL.form;

  if (!ALLOWED_FORMS.includes(form)) {
    throw new Error(`Form must be one of: ${ALLOWED_FORMS.join(", ")}`);
  }

  await ensureUniqueClass(db, { year, form });

  const docRef = await db.collection("classes").add({
    name: String(payload.name || "New Class").trim() || "New Class",
    school_info: schoolInfo,
    subjects: Array.isArray(payload.subjects) ? payload.subjects : DEFAULT_SUBJECTS,
    year,
    form,
    created_at: new Date().toISOString(),
    student_count: 0,
    cno_counter: 0,
  });

  const created = await docRef.get();
  return parseClass(created);
};

const updateClassRecord = async (db, classId, payload = {}) => {
  const { classRef, classSnap } = await getClassSnapshot(db, classId);
  const current = classSnap.data();
  const updates = {};

  if (typeof payload.name === "string") {
    updates.name = payload.name.trim() || current.name;
  }
  if (payload.schoolInfo) {
    updates.school_info = payload.schoolInfo;
  }
  if (Array.isArray(payload.subjects)) {
    updates.subjects = payload.subjects;
  }
  if (payload.year) {
    updates.year = payload.year;
  }
  if (payload.form) {
    if (!ALLOWED_FORMS.includes(payload.form)) {
      throw new Error(`Form must be one of: ${ALLOWED_FORMS.join(", ")}`);
    }
    updates.form = payload.form;
  }
  if (Array.isArray(payload.monthlyExams)) {
    updates.monthly_exams = normalizeMonthlyExams(payload.monthlyExams);
  }

  const nextYear = updates.year || current.year;
  const nextForm = updates.form || current.form;
  if (
    (updates.year && updates.year !== current.year) ||
    (updates.form && updates.form !== current.form)
  ) {
    await ensureUniqueClass(db, { year: nextYear, form: nextForm, excludeId: classId });
  }

  if (Array.isArray(payload.subjects)) {
    const oldSubjects = Array.isArray(current.subjects) ? current.subjects : [];
    const newSubjects = payload.subjects;
    if (JSON.stringify(oldSubjects) !== JSON.stringify(newSubjects)) {
      const studentsSnap = await classRef.collection("students").get();
      await updateDocsInBatches(db, studentsSnap.docs, (doc) => {
        const data = doc.data();
        const remappedScores = remapScores(oldSubjects, newSubjects, data.scores || []);
        const examScores =
          data.exam_scores && typeof data.exam_scores === "object" ? data.exam_scores : {};
        const remappedExamScores = {};

        for (const [exam, scores] of Object.entries(examScores)) {
          remappedExamScores[exam] = remapScores(
            oldSubjects,
            newSubjects,
            Array.isArray(scores) ? scores : []
          );
        }

        return {
          scores: remappedScores,
          exam_scores: remappedExamScores,
        };
      });
    }
  }

  if (Object.keys(updates).length === 0) {
    return parseClass(classSnap);
  }

  await classRef.update(updates);
  const updated = await classRef.get();
  return parseClass(updated);
};

const deleteClassRecord = async (db, classId, { permanent = false } = {}) => {
  const { classRef } = await getClassSnapshot(db, classId);

  if (permanent) {
    const studentsSnap = await classRef.collection("students").get();
    for (let index = 0; index < studentsSnap.docs.length; index += 400) {
      const batch = db.batch();
      studentsSnap.docs.slice(index, index + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    await classRef.delete();
    return { success: true, archived: false, deleted: true };
  }

  await classRef.update({
    archived: true,
    archived_at: new Date().toISOString(),
  });
  return { success: true, archived: true, deleted: false };
};

const restoreClassRecord = async (db, classId) => {
  const { classRef } = await getClassSnapshot(db, classId);
  await classRef.update({
    archived: false,
    archived_at: null,
  });
  const updated = await classRef.get();
  return parseClass(updated);
};

const setClassPublishedState = async (db, classId, published) => {
  const { classRef } = await getClassSnapshot(db, classId);
  if (published) {
    const publishedAt = new Date().toISOString();
    await classRef.update({ published: true, published_at: publishedAt });
    return { published: true, published_at: publishedAt };
  }

  await classRef.update({ published: false, published_at: null });
  return { published: false, published_at: null };
};

const getClassAuditLogs = async (db, classId, limit = 100) => {
  await getClassSnapshot(db, classId);
  const finalLimit = Math.min(parseInt(limit || "100", 10) || 100, 500);
  const snap = await db
    .collection("audit_logs")
    .where("classId", "==", classId)
    .orderBy("updatedAt", "desc")
    .limit(finalLimit)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

module.exports = {
  DEFAULT_SUBJECTS,
  DEFAULT_SCHOOL,
  DEFAULT_EXAM_TYPE,
  ALLOWED_FORMS,
  parseClass,
  parseStudent,
  remapScores,
  updateDocsInBatches,
  listClasses,
  getClassWithStudents,
  createClassRecord,
  updateClassRecord,
  deleteClassRecord,
  restoreClassRecord,
  setClassPublishedState,
  getClassAuditLogs,
  getClassSnapshot,
};
