const { getDb } = require("../../../../lib/firebaseAdmin");
const { sendJson } = require("../../../../lib/http");
const { resolveSessionUser, canViewAudit } = require("../../../../lib/auth");

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

  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    return sendJson(res, 404, { error: "Class not found" });
  }

  const limit = Math.min(parseInt(req.query.limit || "100", 10) || 100, 500);

  try {
    const snap = await db
      .collection("audit_logs")
      .where("classId", "==", classId)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();

    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return sendJson(res, 200, logs);
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
};
