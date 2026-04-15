const { getDb } = require("../../../_lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../_lib/http");
const { formatCno, sanitizeScores, sanitizeText, reserveCnoRange } = require("../../../_lib/students");

const parseStudent = (doc, classId) => {
  const data = doc.data();
  return {
    id: doc.id,
    classId,
    indexNo: data.index_no || "",
    name: data.name || "",
    stream: data.stream || "",
    sex: data.sex || "M",
    status: data.status || "present",
    scores: Array.isArray(data.scores) ? data.scores : [],
    createdAt: data.created_at || null,
  };
};

module.exports = async (req, res) => {
  const db = getDb();
  const classId = req.query.id;
  const classRef = db.collection("classes").doc(classId);

  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    return sendJson(res, 404, { error: "Class not found" });
  }

  if (req.method === "GET") {
    try {
      const snap = await classRef.collection("students").orderBy("index_no", "asc").get();
      return sendJson(res, 200, snap.docs.map((doc) => parseStudent(doc, classId)));
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const data = classSnap.data();
      const subjects = Array.isArray(data.subjects) ? data.subjects : [];

      const name = sanitizeText(body.name);
      if (!name) return sendJson(res, 400, { error: "Student name is required" });

      const sex = body.sex === "F" ? "F" : "M";
      const status = ["present", "absent", "incomplete"].includes(body.status) ? body.status : "present";
      const stream = sanitizeText(body.stream);

      let indexNo = sanitizeText(body.indexNo);
      if (!indexNo) {
        const start = await reserveCnoRange(db, classRef, 1);
        indexNo = formatCno(start);
      }

      const scores = sanitizeScores(body.scores, subjects.length);

      const created_at = new Date().toISOString();
      const studentRef = await classRef.collection("students").add({
        index_no: indexNo,
        name,
        stream,
        sex,
        status,
        scores,
        created_at,
      });

      await classRef.update({
        student_count: Number(data.student_count || 0) + 1,
      });

      const created = await studentRef.get();
      return sendJson(res, 201, parseStudent(created, classId));
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
