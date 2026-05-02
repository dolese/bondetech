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

    const seen = new Set();
    const addResult = (doc) => {
      if (seen.has(doc.id)) return;
      seen.add(doc.id);
      const data = doc.data();
      const nameMatch = (data.name || "").toLowerCase().includes(qLower);
      const indexMatch = (data.index_no || "").toLowerCase().includes(qLower);
      if (!nameMatch && !indexMatch) return;
      results.push({
        studentId: doc.id,
        classId: cls.id,
        className: cls.name || "",
        form: cls.form || "",
        year: cls.year || "",
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

const getStudentProfileByIndexNo = async (db, indexNo) => {
  const normalizedIndexNo = String(indexNo || "").trim();
  if (!normalizedIndexNo) {
    throw new Error("indexNo is required");
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
      .where("index_no", "==", normalizedIndexNo)
      .limit(1)
      .get();

    if (snap.empty) continue;

    const doc = snap.docs[0];
    const data = doc.data();

    if (!profileName && data.name) profileName = data.name;
    if (!profileSex && data.sex) profileSex = data.sex;

    entries.push({
      classId: cls.id,
      className: cls.name || "",
      form: cls.form || "",
      year: cls.year || "",
      status: data.status || "present",
      remarks: data.remarks || "",
      examScores:
        data.exam_scores && typeof data.exam_scores === "object" ? data.exam_scores : {},
      subjects: Array.isArray(cls.subjects) ? cls.subjects : [],
    });
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
    indexNo: normalizedIndexNo,
    name: profileName,
    sex: profileSex || "M",
    entries,
  };
};

module.exports = {
  searchStudentsDirectory,
  getStudentProfileByIndexNo,
};
