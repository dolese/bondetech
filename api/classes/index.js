const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");

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
    published: data.published || false,
    publishedAt: data.published_at || null,
    monthly_exams: Array.isArray(data.monthly_exams) ? data.monthly_exams : [],
  };
};

module.exports = async (req, res) => {
  const db = getDb();

  if (req.method === "GET") {
    try {
      const includeArchived = req.query.includeArchived === "true";
      const snapshot = await db.collection("classes").orderBy("created_at", "asc").get();
      const classes = snapshot.docs
        .map(parseClass)
        .filter(c => includeArchived || !c.archived);
      return sendJson(res, 200, classes);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const name = (body.name || "New Class").trim() || "New Class";
      const schoolInfo = body.schoolInfo || DEFAULT_SCHOOL;
      const subjects = Array.isArray(body.subjects) ? body.subjects : DEFAULT_SUBJECTS;
      const year = body.year || schoolInfo.year || "2026";
      const form = body.form || schoolInfo.form || "Form I";
      const created_at = new Date().toISOString();

      const docRef = await db.collection("classes").add({
        name,
        school_info: schoolInfo,
        subjects,
        year,
        form,
        created_at,
        student_count: 0,
        cno_counter: 0,
      });

      const created = await docRef.get();
      return sendJson(res, 201, parseClass(created));
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
