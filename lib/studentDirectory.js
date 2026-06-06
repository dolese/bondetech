const { isValidAdmissionNo, sanitizeAdmissionNo } = require("./students");

const findClasses = async (db, { form = "", year = "", includeArchived = false, publishedOnly = false } = {}) => {
  let classQuery = db.collection("classes");
  if (year) classQuery = classQuery.where("year", "==", year);
  if (form) classQuery = classQuery.where("form", "==", form);
  if (publishedOnly) classQuery = classQuery.where("published", "==", true);

  let classesSnap;
  if (includeArchived) {
    classesSnap = await classQuery.get();
  } else {
    try {
      classesSnap = await classQuery.where("archived", "!=", true).get();
    } catch {
      classesSnap = await classQuery.get();
    }
  }

  return classesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((cls) => includeArchived || !cls.archived)
    .filter((cls) => !publishedOnly || cls.published === true);
};

const searchStudentsDirectory = async (db, { q, form = "", year = "", limit = 50, publishedOnly = false } = {}) => {
  const query = String(q || "").trim();
  if (!query) {
    throw new Error("q (search query) is required");
  }

  const maxResults = Math.min(parseInt(limit || "50", 10) || 50, 200);
  const classes = await findClasses(db, { form: String(form || "").trim(), year: String(year || "").trim(), publishedOnly });
  const qLower = query.toLowerCase();
  const results = [];

  for (const cls of classes) {
    if (results.length >= maxResults) break;

    const studentsSnap = await db.collection("classes").doc(cls.id).collection("students").get();
    studentsSnap.docs.forEach((doc) => {
      if (results.length >= maxResults) return;
      const data = doc.data();
      const rawName = String(data.name || "");
      const rawIndex = String(data.index_no || "");
      const rawAdmission = String(data.admission_no || "");
      const nameLower = rawName.toLowerCase();
      const normalizedName = nameLower.replace(/[^a-z0-9]+/g, " ").trim();
      const queryTokens = qLower.split(/\s+/).filter(Boolean);
      const nameMatch =
        nameLower.includes(qLower) ||
        normalizedName.includes(qLower) ||
        queryTokens.every((token) => normalizedName.includes(token));
      const indexMatch = rawIndex.toLowerCase().includes(qLower);
      const admissionMatch = rawAdmission.toLowerCase().includes(qLower);
      if (!nameMatch && !indexMatch && !admissionMatch) return;
      results.push({
        studentId: doc.id,
        classId: cls.id,
        className: cls.name || "",
        form: cls.form || "",
        year: cls.year || "",
        stream: cls.stream || "",
        indexNo: data.index_no || "",
        admissionNo: data.admission_no || "",
        name: data.name || "",
        sex: data.sex || "M",
        status: data.status || "present",
      });
    });
  }

  return results.slice(0, maxResults);
};

const sortProfileEntries = (entries = []) =>
  entries.sort((a, b) => {
    const yearA = Number(a.year) || 0;
    const yearB = Number(b.year) || 0;
    if (yearA !== yearB) return yearA - yearB;
    return a.form.localeCompare(b.form);
  });

const buildProfileFromEntries = (entries, { indexNo = "", admissionNo = "" } = {}) => {
  const sortedEntries = sortProfileEntries(entries.slice());
  const latestEntry = sortedEntries[sortedEntries.length - 1] || {};
  const profileName =
    sortedEntries.map((entry) => entry.name).find(Boolean) || "";
  const profileSex =
    sortedEntries.map((entry) => entry.sex).find(Boolean) || "M";
  const profileAdmissionNo =
    sortedEntries.map((entry) => entry.admissionNo).find(Boolean) || admissionNo || "";
  const profileIndexNo =
    latestEntry.indexNo ||
    sortedEntries.map((entry) => entry.indexNo).find(Boolean) ||
    indexNo ||
    "";

  return {
    indexNo: profileIndexNo,
    admissionNo: profileAdmissionNo,
    name: profileName,
    sex: profileSex,
    entries: sortedEntries.map((entry) => ({
      classId: entry.classId,
      className: entry.className,
      form: entry.form,
      year: entry.year,
      stream: entry.stream,
      indexNo: entry.indexNo,
      admissionNo: entry.admissionNo,
      status: entry.status,
      remarks: entry.remarks,
      examScores: entry.examScores,
      subjects: entry.subjects,
    })),
  };
};

const collectEntriesByStudentMatch = async (db, matcher, { publishedOnly = false } = {}) => {
  const classes = await findClasses(db, { publishedOnly });
  const entries = [];

  for (const cls of classes) {
    const snap = await db.collection("classes").doc(cls.id).collection("students").get();
    snap.docs.forEach((doc) => {
      const data = doc.data();
      if (!matcher(data)) return;
      entries.push({
        classId: cls.id,
        className: cls.name || "",
        form: cls.form || "",
        year: cls.year || "",
        stream: cls.stream || "",
        indexNo: data.index_no || "",
        admissionNo: data.admission_no || "",
        name: data.name || "",
        sex: data.sex || "M",
        status: data.status || "present",
        remarks: data.remarks || "",
        examScores:
          data.exam_scores && typeof data.exam_scores === "object" ? data.exam_scores : {},
        subjects: Array.isArray(cls.subjects) ? cls.subjects : [],
      });
    });
  }

  return entries;
};

const getStudentEntryByRecord = async (db, { classId = "", studentId = "", publishedOnly = false } = {}) => {
  const normalizedClassId = String(classId || "").trim();
  const normalizedStudentId = String(studentId || "").trim();
  if (!normalizedClassId || !normalizedStudentId) return null;

  const classDoc = await db.collection("classes").doc(normalizedClassId).get();
  if (!classDoc.exists) return null;
  const cls = { id: classDoc.id, ...classDoc.data() };
  if (cls.archived) return null;
  if (publishedOnly && cls.published !== true) return null;

  const studentDoc = await db
    .collection("classes")
    .doc(normalizedClassId)
    .collection("students")
    .doc(normalizedStudentId)
    .get();
  if (!studentDoc.exists) return null;
  const data = studentDoc.data();
  return {
    classId: cls.id,
    className: cls.name || "",
    form: cls.form || "",
    year: cls.year || "",
    stream: cls.stream || "",
    indexNo: data.index_no || "",
    admissionNo: data.admission_no || "",
    name: data.name || "",
    sex: data.sex || "M",
    status: data.status || "present",
    remarks: data.remarks || "",
    examScores: data.exam_scores && typeof data.exam_scores === "object" ? data.exam_scores : {},
    subjects: Array.isArray(cls.subjects) ? cls.subjects : [],
  };
};

const getStudentProfileByIdentifier = async (db, { indexNo = "", admissionNo = "", classId = "", studentId = "", publishedOnly = false } = {}) => {
  const normalizedIndexNo = String(indexNo || "").trim();
  const normalizedAdmissionNo = sanitizeAdmissionNo(admissionNo || "");
  const normalizedClassId = String(classId || "").trim();
  const normalizedStudentId = String(studentId || "").trim();
  if (!normalizedIndexNo && !normalizedAdmissionNo && !(normalizedClassId && normalizedStudentId)) {
    throw new Error("indexNo, admissionNo, or classId + studentId is required");
  }
  if (normalizedAdmissionNo && !isValidAdmissionNo(normalizedAdmissionNo)) {
    throw new Error(
      "Admission number must use the format SCHOOLCODE-YEAR-SEQUENCE, for example BSS-2026-0001"
    );
  }

  const matchOpts = { publishedOnly };
  let entries = [];

  if (normalizedClassId && normalizedStudentId) {
    const exactEntry = await getStudentEntryByRecord(db, {
      classId: normalizedClassId,
      studentId: normalizedStudentId,
      publishedOnly,
    });
    if (!exactEntry) {
      throw new Error("Student not found");
    }
    if (exactEntry.admissionNo) {
      entries = await collectEntriesByStudentMatch(
        db,
        (data) => String(data.admission_no || "").trim().toUpperCase() === String(exactEntry.admissionNo || "").trim().toUpperCase(),
        matchOpts
      );
    }
    if (!entries.length) {
      entries = [exactEntry];
    }
  } else {
    entries = normalizedAdmissionNo
      ? await collectEntriesByStudentMatch(
        db,
        (data) => String(data.admission_no || "").trim().toUpperCase() === normalizedAdmissionNo,
        matchOpts
      )
      : await collectEntriesByStudentMatch(
        db,
        (data) => String(data.index_no || "").trim().toUpperCase() === normalizedIndexNo.toUpperCase(),
        matchOpts
      );
  }

  if (!entries.length) {
    throw new Error("Student not found");
  }

  if (!normalizedAdmissionNo && !(normalizedClassId && normalizedStudentId)) {
    const discoveredAdmissionNo = entries.map((entry) => entry.admissionNo).find(Boolean) || "";
    if (discoveredAdmissionNo) {
      const admissionEntries = await collectEntriesByStudentMatch(
        db,
        (data) => String(data.admission_no || "").trim().toUpperCase() === discoveredAdmissionNo,
        matchOpts
      );
      if (admissionEntries.length) {
        entries = admissionEntries;
      }
    }
  }

  return buildProfileFromEntries(entries, {
    indexNo: normalizedIndexNo,
    admissionNo: normalizedAdmissionNo || entries.map((entry) => entry.admissionNo).find(Boolean) || "",
  });
};

const getStudentProfileByIndexNo = async (db, indexNo) =>
  getStudentProfileByIdentifier(db, { indexNo });

module.exports = {
  searchStudentsDirectory,
  getStudentProfileByIndexNo,
  getStudentProfileByIdentifier,
};
