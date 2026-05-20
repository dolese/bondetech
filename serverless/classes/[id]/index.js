const { getDb } = require("../../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../lib/http");
const { resolveSessionUser, canReadClassData, canManageClasses } = require("../../../lib/auth");
const {
  getClassWithStudents,
  updateClassRecord,
  deleteClassRecord,
  restoreClassRecord,
} = require("../../../lib/classes");

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
      return sendJson(res, 403, { error: "You do not have permission to view classes" });
    }
    try {
      const cls = await getClassWithStudents(db, classId);
      return sendJson(res, 200, cls);
    } catch (err) {
      const status = /class not found/i.test(err.message) ? 404 : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  if (req.method === "PUT") {
    if (!canManageClasses(currentUser.role)) {
      return sendJson(res, 403, { error: "Only administrators can update classes" });
    }
    try {
      const body = await readJsonBody(req);
      const updated = await updateClassRecord(db, classId, body);
      return sendJson(res, 200, updated);
    } catch (err) {
      const status = /class not found/i.test(err.message)
        ? 404
        : /already exists/i.test(err.message)
        ? 409
        : /form must be/i.test(err.message)
        ? 400
        : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  if (req.method === "DELETE") {
    if (!canManageClasses(currentUser.role)) {
      return sendJson(res, 403, { error: "Only administrators can delete classes" });
    }
    try {
      const result = await deleteClassRecord(db, classId, {
        permanent: req.query.permanent === "true",
      });
      return sendJson(res, 200, result);
    } catch (err) {
      const status = /class not found/i.test(err.message) ? 404 : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  // PATCH used for restore (un-archive)
  if (req.method === "PATCH") {
    if (!canManageClasses(currentUser.role)) {
      return sendJson(res, 403, { error: "Only administrators can restore classes" });
    }
    try {
      const restored = await restoreClassRecord(db, classId);
      return sendJson(res, 200, restored);
    } catch (err) {
      const status = /class not found/i.test(err.message) ? 404 : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
