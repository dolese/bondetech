const { getDb } = require("../../../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../../lib/http");
const { resolveSessionUser, canManageStudents, canDeleteStudents } = require("../../../../lib/auth");
const {
  updateStudentRecord,
  deleteStudentRecord,
} = require("../../../../lib/classStudents");

module.exports = async (req, res) => {
  const db = getDb();
  const classId = req.query.id;
  const studentId = req.query.sid;
  let currentUser;

  try {
    currentUser = await resolveSessionUser(db, req);
  } catch (err) {
    return sendJson(res, 401, { error: err.message });
  }
  if (!currentUser) {
    return sendJson(res, 401, { error: "Authentication required" });
  }

  if (req.method === "PUT") {
    if (!canManageStudents(currentUser.role)) {
      return sendJson(res, 403, { error: "You do not have permission to update students" });
    }
    try {
      const body = await readJsonBody(req);
      const updated = await updateStudentRecord(db, classId, studentId, body);
      return sendJson(res, 200, updated);
    } catch (err) {
      const status = /class not found|student not found/i.test(err.message) ? 404 : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  if (req.method === "DELETE") {
    if (!canDeleteStudents(currentUser.role)) {
      return sendJson(res, 403, { error: "Only administrators can delete students" });
    }
    try {
      const result = await deleteStudentRecord(db, classId, studentId);
      return sendJson(res, 200, result);
    } catch (err) {
      const status = /class not found|student not found/i.test(err.message) ? 404 : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
