const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");
const { resolveSessionUser, canReadClassData, canManageClasses } = require("../../lib/auth");
const { listClasses, createClassRecord } = require("../../lib/classes");

module.exports = async (req, res) => {
  const db = getDb();
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
      const includeArchived = req.query.includeArchived === "true";
      const classes = await listClasses(db, { includeArchived });
      return sendJson(res, 200, classes);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === "POST") {
    if (!canManageClasses(currentUser.role)) {
      return sendJson(res, 403, { error: "Only administrators can create classes" });
    }
    try {
      const body = await readJsonBody(req);
      const created = await createClassRecord(db, body);
      return sendJson(res, 201, created);
    } catch (err) {
      const status = /already exists/i.test(err.message)
        ? 409
        : /form must be/i.test(err.message)
        ? 400
        : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
