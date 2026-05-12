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

const normalizeIdentity = (value) => String(value || "").trim();

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
        admissionNo: data.admission_no || data.index_no || "",
        indexNo: data.index_no || "",
        name: data.name || "",
        sex: data.sex || "M",
        status: data.status || "present",
      });
    };

    nameSnap.docs.forEach(addResult);
    indexSnap.docs.forEach(addResult);
  }

  return results.slice(0, maxResults);
};

const getStudentProfileByAdmissionNo = async (db, admissionNoOrLegacyIndex) => {
  const normalizedIdentity = normalizeIdentity(admissionNoOrLegacyIndex);
  if (!normalizedIdentity) {
    throw new Error("admissionNo is required");
  }

  const classes = await findClasses(db);
  const entries = [];
  let profileName = "";
  let profileSex = "";

  for (const cls of classes) {
    const snap = await db
      .collection("classes")
      .doc(cls.id)
      .collection("students")
      .where("admission_no", "==", normalizedIdentity)
      .limit(1)
      .get();
    const finalSnap = snap.empty
      ? await db
          .collection("classes")
          .doc(cls.id)
          .collection("students")
          .where("index_no", "==", normalizedIdentity)
          .limit(1)
          .get()
      : snap;

    if (finalSnap.empty) continue;

    const doc = finalSnap.docs[0];
    const data = doc.data();
    const currentAdmissionNo = data.admission_no || data.index_no || "";

    if (!profileName && data.name) profileName = data.name;
    if (!profileSex && data.sex) profileSex = data.sex;

    entries.push({
      classId: cls.id,
      className: cls.name || "",
      form: cls.form || "",
      year: cls.year || "",
      stream: cls.stream || "",
      indexNo: data.index_no || "",
      status: data.status || "present",
      remarks: data.remarks || "",
      examScores:
        data.exam_scores && typeof data.exam_scores === "object" ? data.exam_scores : {},
      subjects: Array.isArray(cls.subjects) ? cls.subjects : [],
    });

    if (!data.admission_no && currentAdmissionNo) {
      await doc.ref.update({ admission_no: currentAdmissionNo });
    }
  }

  if (!entries.length) {
    throw new Error("Student not found");
  }

  entries.sort((a, b) => {
    const yearA = Number(a.year) || 0;
    const yearB = Number(b.year) || 0;
    if (yearA !== yearB) return yearA - yearB;
    return a.form.localeCompare(b.form);
  });

  return {
    admissionNo: normalizedIdentity,
    name: profileName,
    sex: profileSex || "M",
    entries,
  };
};

module.exports = {
  searchStudentsDirectory,
  getStudentProfileByAdmissionNo,
};
