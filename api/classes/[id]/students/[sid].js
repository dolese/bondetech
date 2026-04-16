const { getDb } = require("../../../_lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../_lib/http");
const { sanitizeScores, sanitizeText } = require("../../../_lib/students");

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
    examScores: (data.exam_scores && typeof data.exam_scores === "object") ? data.exam_scores : {},
    remarks: data.remarks || "",
    createdAt: data.created_at || null,
  };
};

module.exports = async (req, res) => {
  const db = getDb();
  const classId = req.query.id;
  const studentId = req.query.sid;

  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    return sendJson(res, 404, { error: "Class not found" });
  }

  const studentRef = classRef.collection("students").doc(studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) {
    return sendJson(res, 404, { error: "Student not found" });
  }

  if (req.method === "PUT") {
    try {
      const body = await readJsonBody(req);
      const data = classSnap.data();
      const subjects = Array.isArray(data.subjects) ? data.subjects : [];

      const updates = {};
      if (typeof body.indexNo === "string") updates.index_no = sanitizeText(body.indexNo, studentSnap.data().index_no);
      if (typeof body.name === "string") updates.name = sanitizeText(body.name, studentSnap.data().name);
      if (typeof body.stream === "string") updates.stream = sanitizeText(body.stream, studentSnap.data().stream);
      if (body.sex) updates.sex = body.sex === "F" ? "F" : "M";
      if (body.status) {
        updates.status = ["present", "absent", "incomplete"].includes(body.status) ? body.status : studentSnap.data().status;
      }
      if (Array.isArray(body.scores)) {
        const newScores = sanitizeScores(body.scores, subjects.length);
        updates.scores = newScores;
        const examType = sanitizeText(body.examType || "March Exam");
        const existingExamScores = (studentSnap.data().exam_scores && typeof studentSnap.data().exam_scores === "object")
          ? studentSnap.data().exam_scores
          : {};
        updates.exam_scores = { ...existingExamScores, [examType]: newScores };
      }
      if (typeof body.remarks === "string") updates.remarks = sanitizeText(body.remarks);

      await studentRef.update(updates);
      const updated = await studentRef.get();
      return sendJson(res, 200, parseStudent(updated, classId));
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      await studentRef.delete();
      const data = classSnap.data();
      await classRef.update({
        student_count: Math.max(0, Number(data.student_count || 0) - 1),
      });
      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
