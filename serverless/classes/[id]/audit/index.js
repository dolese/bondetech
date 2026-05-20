const { getDb } = require("../../../../lib/firebaseAdmin");
const { sendJson } = require("../../../../lib/http");
const { resolveSessionUser, canViewAudit } = require("../../../../lib/auth");
const { getClassAuditLogs } = require("../../../../lib/classes");

/**
 * GET /api/classes/:id/audit
 *
 * Returns the audit log entries for a class, newest first.
 * Optional ?limit=<n> (default 100, max 500).
 *
 * Each entry:
 *   { id, classId, studentId, studentName, action, field,
 *     oldValue, newValue, updatedBy, updatedAt }
 */
module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

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
  if (!canViewAudit(currentUser.role)) {
    return sendJson(res, 403, { error: "Only administrators can view the audit log" });
  }
  const classId = req.query.id;

  try {
    const logs = await getClassAuditLogs(db, classId, req.query.limit);
    return sendJson(res, 200, logs);
  } catch (err) {
    const status = /class not found/i.test(err.message) ? 404 : 500;
    return sendJson(res, status, { error: err.message });
  }
};
