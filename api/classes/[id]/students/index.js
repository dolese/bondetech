const { getDb } = require("../../../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../../lib/http");
const { resolveSessionUser, canManageStudents, canReadClassData } = require("../../../../lib/auth");
const {
  listStudents,
  createStudentRecord,
} = require("../../../../lib/classStudents");

module.exports = async (req, res) => {
  const db = getDb();
  const classId = req.query.id;
  let currentUser;

  try {
    currentUser = await resolveSessionUser(db, req);
  } catch (err) {
    return sendJson(res, 401, { error: err.message });
  }
  if (!currentUser) {
    return sendJson(res, 401, { error: "Authentication required" });
  }

  if (req.method === "GET") {
    if (!canReadClassData(currentUser.role)) {
      return sendJson(res, 403, { error: "You do not have permission to view students" });
    }
    try {
      const result = await listStudents(db, classId, req.query || {});
      return sendJson(res, 200, result);
    } catch (err) {
      const status = /class not found/i.test(err.message) ? 404 : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  if (req.method === "POST") {
    if (!canManageStudents(currentUser.role)) {
      return sendJson(res, 403, { error: "You do not have permission to add students" });
    }
    try {
      const body = await readJsonBody(req);
      const created = await createStudentRecord(db, classId, body);
      return sendJson(res, 201, created);
    } catch (err) {
      const status = /class not found/i.test(err.message)
        ? 404
        : /student name is required/i.test(err.message)
        ? 400
        : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
