const { getDb } = require("../../../../lib/firebaseAdmin");
const { sendJson } = require("../../../../lib/http");
const { resolveSessionUser, canDeleteStudents } = require("../../../../lib/auth");
const { findDuplicateStudentGroups } = require("../../../../lib/classStudents");

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

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!canDeleteStudents(currentUser.role)) {
    return sendJson(res, 403, { error: "Only administrators and academic staff can review duplicate students" });
  }

  try {
    const result = await findDuplicateStudentGroups(db, classId);
    return sendJson(res, 200, result);
  } catch (err) {
    const status = /class not found/i.test(err.message) ? 404 : 500;
    return sendJson(res, status, { error: err.message });
  }
};
