const { isValidAdmissionNo, sanitizeAdmissionNo } = require("./students");

const findClasses = async (db, { form = "", year = "", includeArchived = false } = {}) => {
  let classQuery = db.collection("classes");
  if (year) classQuery = classQuery.where("year", "==", year);
  if (form) classQuery = classQuery.where("form", "==", form);

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
    .filter((cls) => includeArchived || !cls.archived);
};

const searchStudentsDirectory = async (db, { q, form = "", year = "", limit = 50 } = {}) => {
  const query = String(q || "").trim();
  if (!query) {
    throw new Error("q (search query) is required");
  }

  const maxResults = Math.min(parseInt(limit || "50", 10) || 50, 200);
  const classes = await findClasses(db, { form: String(form || "").trim(), year: String(year || "").trim() });
  const qLower = query.toLowerCase();
  const results = [];

  for (const cls of classes) {
    if (results.length >= maxResults) break;

    const nameEnd = query + "\uf8ff";
    let nameSnap;
    try {
      nameSnap = await db
        .collection("classes")
        .doc(cls.id)
        .collection("students")
        .where("name", ">=", query)
        .where("name", "<", nameEnd)
        .limit(maxResults)
        .get();
    } catch {
      nameSnap = { docs: [] };
    }

    const indexEnd = query + "\uf8ff";
    let indexSnap;
    try {
      indexSnap = await db
        .collection("classes")
        .doc(cls.id)
        .collection("students")
        .where("index_no", ">=", query)
        .where("index_no", "<", indexEnd)
        .limit(maxResults)
        .get();
    } catch {
      indexSnap = { docs: [] };
    }

    const admissionEnd = query + "\uf8ff";
    let admissionSnap;
    try {
      admissionSnap = await db
        .collection("classes")
        .doc(cls.id)
        .collection("students")
        .where("admission_no", ">=", query)
        .where("admission_no", "<", admissionEnd)
        .limit(maxResults)
        .get();
    } catch {
      admissionSnap = { docs: [] };
    }

    const seen = new Set();
    const addResult = (doc) => {
      if (seen.has(doc.id)) return;
      seen.add(doc.id);
      const data = doc.data();
      const nameMatch = (data.name || "").toLowerCase().includes(qLower);
      const indexMatch = (data.index_no || "").toLowerCase().includes(qLower);
      const admissionMatch = (data.admission_no || "").toLowerCase().includes(qLower);
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
    };

    nameSnap.docs.forEach(addResult);
    indexSnap.docs.forEach(addResult);
    admissionSnap.docs.forEach(addResult);
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

const collectEntriesByStudentMatch = async (db, matcher) => {
  const classes = await findClasses(db);
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

const getStudentProfileByIdentifier = async (db, { indexNo = "", admissionNo = "" } = {}) => {
  const normalizedIndexNo = String(indexNo || "").trim();
  const normalizedAdmissionNo = sanitizeAdmissionNo(admissionNo || "");
  if (!normalizedIndexNo && !normalizedAdmissionNo) {
    throw new Error("indexNo or admissionNo is required");
  }
  if (normalizedAdmissionNo && !isValidAdmissionNo(normalizedAdmissionNo)) {
    throw new Error(
      "Admission number must use the format SCHOOLCODE-YEAR-SEQUENCE, for example BSS-2026-0001"
    );
  }

  let entries = normalizedAdmissionNo
    ? await collectEntriesByStudentMatch(
        db,
        (data) => String(data.admission_no || "").trim().toUpperCase() === normalizedAdmissionNo
      )
    : await collectEntriesByStudentMatch(
        db,
        (data) => String(data.index_no || "").trim().toUpperCase() === normalizedIndexNo.toUpperCase()
      );

  if (!entries.length) {
    throw new Error("Student not found");
  }

  if (!normalizedAdmissionNo) {
    const discoveredAdmissionNo = entries.map((entry) => entry.admissionNo).find(Boolean) || "";
    if (discoveredAdmissionNo) {
      const admissionEntries = await collectEntriesByStudentMatch(
        db,
        (data) => String(data.admission_no || "").trim().toUpperCase() === discoveredAdmissionNo
      );
      if (admissionEntries.length) {
        entries = admissionEntries;
      }
    }
  }

  return buildProfileFromEntries(entries, {
    indexNo: normalizedIndexNo,
    admissionNo: normalizedAdmissionNo,
  });
};

const getStudentProfileByIndexNo = async (db, indexNo) =>
  getStudentProfileByIdentifier(db, { indexNo });

module.exports = {
  searchStudentsDirectory,
  getStudentProfileByIndexNo,
  getStudentProfileByIdentifier,
};
