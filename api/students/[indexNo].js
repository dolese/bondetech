const { getDb } = require("../../_lib/firebaseAdmin");
const { sendJson } = require("../../_lib/http");

/**
 * GET /api/students/:indexNo/profile
 *
 * Returns a consolidated profile for the student identified by their index
 * number.  The response aggregates every class the student has appeared in,
 * along with all per-exam scores stored under that class.
 *
 * Response shape:
 * {
 *   indexNo: string,
 *   name: string,
 *   sex: string,
 *   entries: [
 *     {
 *       classId, className, form, year,
 *       stream, status, remarks,
 *       examScores: { [examType]: score[] },
 *       subjects: string[],
 *     }
 *   ]
 * }
 */
module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const indexNo = (req.query.indexNo || "").trim();
  if (!indexNo) {
    return sendJson(res, 400, { error: "indexNo is required" });
  }

  const db = getDb();

  // Load all non-archived classes
  let classesSnap;
  try {
    classesSnap = await db.collection("classes").where("archived", "!=", true).get();
  } catch {
    classesSnap = await db.collection("classes").get();
  }

  const classes = classesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => !c.archived);

  const entries = [];
  let profileName = "";
  let profileSex = "M";

  for (const cls of classes) {
    const snap = await db
      .collection("classes")
      .doc(cls.id)
      .collection("students")
      .where("index_no", "==", indexNo)
      .limit(1)
      .get();

    if (snap.empty) continue;

    const doc = snap.docs[0];
    const d = doc.data();

    if (!profileName && d.name) profileName = d.name;
    if (!profileSex && d.sex) profileSex = d.sex;

    entries.push({
      classId: cls.id,
      className: cls.name || "",
      form: cls.form || "",
      year: cls.year || "",
      stream: d.stream || "",
      status: d.status || "present",
      remarks: d.remarks || "",
      examScores:
        d.exam_scores && typeof d.exam_scores === "object" ? d.exam_scores : {},
      subjects: Array.isArray(cls.subjects) ? cls.subjects : [],
    });
  }

  if (!entries.length) {
    return sendJson(res, 404, { error: "Student not found" });
  }

  // Sort entries by year then form
  entries.sort((a, b) => {
    const ya = Number(a.year) || 0;
    const yb = Number(b.year) || 0;
    if (ya !== yb) return ya - yb;
    return a.form.localeCompare(b.form);
  });

  return sendJson(res, 200, {
    indexNo,
    name: profileName,
    sex: profileSex,
    entries,
  });
};
