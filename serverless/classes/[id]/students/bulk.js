const { getDb } = require("../../../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../../lib/http");
const { resolveSessionUser, canManageStudents } = require("../../../../lib/auth");
const { bulkImportStudents } = require("../../../../lib/classStudents");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

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
  if (!canManageStudents(currentUser.role)) {
    return sendJson(res, 403, { error: "You do not have permission to import students" });
  }

  try {
    const body = await readJsonBody(req);
    const result = await bulkImportStudents(db, classId, body.students, body.examType);
    return sendJson(res, 200, result);
  } catch (err) {
    const status = /class not found/i.test(err.message)
      ? 404
      : /non-empty array/i.test(err.message)
      ? 400
      : 500;
    return sendJson(res, status, { error: err.message });
  }
};
