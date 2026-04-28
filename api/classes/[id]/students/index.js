const { getDb } = require("../../../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../../lib/http");
const { formatCno, sanitizeScores, sanitizeText, reserveCnoRange } = require("../../../../lib/students");
const { resolveSessionUser, canManageStudents, canReadClassData } = require("../../../../lib/auth");

const DEFAULT_EXAM_TYPE = "March Exam";

const parseStudent = (doc, classId) => {
  const data = doc.data();
  const examScores = (data.exam_scores && typeof data.exam_scores === "object") ? data.exam_scores : {};
  const legacyScores = Array.isArray(data.scores) ? data.scores : [];
  return {
    id: doc.id,
    classId,
    indexNo: data.index_no || "",
    name: data.name || "",
    sex: data.sex || "M",
    status: data.status || "present",
    scores: Array.isArray(examScores[DEFAULT_EXAM_TYPE]) ? examScores[DEFAULT_EXAM_TYPE] : legacyScores,
    examScores,
    remarks: data.remarks || "",
    createdAt: data.created_at || null,
  };
};

module.exports = async (req, res) => {
  const db = getDb();
  const classId = req.query.id;
  const classRef = db.collection("classes").doc(classId);
  let currentUser;

  try {
    currentUser = await resolveSessionUser(db, req);
  } catch (err) {
    return sendJson(res, 401, { error: err.message });
  }
  if (!currentUser) {
    return sendJson(res, 401, { error: "Authentication required" });
  }

  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    return sendJson(res, 404, { error: "Class not found" });
  }

  if (req.method === "GET") {
    if (!canReadClassData(currentUser.role)) {
      return sendJson(res, 403, { error: "You do not have permission to view students" });
    }
    try {
      const search = (req.query.search || "").trim();
      const page = Math.max(1, parseInt(req.query.page || "1", 10));
      const limit = Math.min(parseInt(req.query.limit || "200", 10) || 200, 500);

      if (search) {
        // Client-side search — load all students and filter
        const snap = await classRef.collection("students").orderBy("index_no", "asc").get();
        const qLower = search.toLowerCase();
        const all = snap.docs.map((doc) => parseStudent(doc, classId));
        const filtered = all.filter(
          (s) =>
            s.name.toLowerCase().includes(qLower) ||
            s.indexNo.toLowerCase().includes(qLower)
        );
        const offset = (page - 1) * limit;
        return sendJson(res, 200, {
          students: filtered.slice(offset, offset + limit),
          total: filtered.length,
          page,
          limit,
        });
      }

      // Cursor-based pagination using index_no ordering
      let query = classRef.collection("students").orderBy("index_no", "asc").limit(limit);
      if (req.query.cursor) {
        // cursor is the last index_no from the previous page
        const cursorVal = req.query.cursor;
        query = query.startAfter(cursorVal);
      }

      const snap = await query.get();
      const students = snap.docs.map((doc) => parseStudent(doc, classId));
      const nextCursor =
        students.length === limit ? students[students.length - 1].indexNo : null;

      return sendJson(res, 200, { students, nextCursor, page, limit });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === "POST") {
    if (!canManageStudents(currentUser.role)) {
      return sendJson(res, 403, { error: "You do not have permission to add students" });
    }
    try {
      const body = await readJsonBody(req);
      const data = classSnap.data();
      const subjects = Array.isArray(data.subjects) ? data.subjects : [];

      const name = sanitizeText(body.name);
      if (!name) return sendJson(res, 400, { error: "Student name is required" });

      const sex = body.sex === "F" ? "F" : "M";
      const status = ["present", "absent", "incomplete"].includes(body.status) ? body.status : "present";

      let indexNo = sanitizeText(body.indexNo);
      if (!indexNo) {
        const start = await reserveCnoRange(db, classRef, 1);
        indexNo = formatCno(start);
      }

      const scores = sanitizeScores(body.scores, subjects.length);
      const remarks = sanitizeText(body.remarks ?? "");
      const examType = sanitizeText(body.examType || DEFAULT_EXAM_TYPE);
      const examScores = { [examType]: scores };
      const studentData = {
        index_no: indexNo,
        name,
        sex,
        status,
        exam_scores: examScores,
        remarks,
        created_at: new Date().toISOString(),
      };
      if (examType === DEFAULT_EXAM_TYPE) studentData.scores = scores;

      const studentRef = await classRef.collection("students").add(studentData);

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
