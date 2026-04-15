const { getDb } = require("../../../_lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../_lib/http");
const { formatCno, sanitizeScores, sanitizeText, reserveCnoRange } = require("../../../_lib/students");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const db = getDb();
  const classId = req.query.id;
  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    return sendJson(res, 404, { error: "Class not found" });
  }

  try {
    const body = await readJsonBody(req);
    const students = Array.isArray(body.students) ? body.students : [];
    if (!students.length) {
      return sendJson(res, 400, { error: "students must be a non-empty array" });
    }

    const data = classSnap.data();
    const subjects = Array.isArray(data.subjects) ? data.subjects : [];

    const missingCount = students.filter((s) => !sanitizeText(s.indexNo)).length;
    const start = missingCount > 0 ? await reserveCnoRange(db, classRef, missingCount) : null;
    let cursor = start || 0;

    const created_at = new Date().toISOString();
    const batches = [];
    for (let i = 0; i < students.length; i += 400) {
      batches.push(students.slice(i, i + 400));
    }

    let created = 0;
    for (const chunk of batches) {
      const batch = db.batch();
      chunk.forEach((raw) => {
        const name = sanitizeText(raw.name);
        if (!name) return;

        let indexNo = sanitizeText(raw.indexNo);
        if (!indexNo) {
          indexNo = formatCno(cursor);
          cursor += 1;
        }

        const studentRef = classRef.collection("students").doc();
        batch.set(studentRef, {
          index_no: indexNo,
          name,
          stream: sanitizeText(raw.stream),
          sex: raw.sex === "F" ? "F" : "M",
          status: ["present", "absent", "incomplete"].includes(raw.status) ? raw.status : "present",
          scores: sanitizeScores(raw.scores, subjects.length),
          remarks: sanitizeText(raw.remarks ?? ""),
          created_at,
        });
        created += 1;
      });
      await batch.commit();
    }

    if (created > 0) {
      await classRef.update({
        student_count: Number(data.student_count || 0) + created,
      });
    }

    return sendJson(res, 200, { success: true, count: created });
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
};
