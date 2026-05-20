const { getDb } = require("../../../../lib/firebaseAdmin");
const { sendJson } = require("../../../../lib/http");
const { resolveSessionUser, canManageClasses } = require("../../../../lib/auth");
const { setClassPublishedState } = require("../../../../lib/classes");

/**
 * POST /api/classes/:id/publish
 *
 * Marks a class's results as published by setting:
 *   { published: true, published_at: <ISO timestamp> }
 *
 * DELETE /api/classes/:id/publish  (unpublish)
 *   { published: false, published_at: null }
 */
module.exports = async (req, res) => {
  if (req.method !== "POST" && req.method !== "DELETE") {
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
  if (!canManageClasses(currentUser.role)) {
    return sendJson(res, 403, { error: "Only administrators can publish results" });
  }
  const classId = req.query.id;

  try {
    const result = await setClassPublishedState(db, classId, req.method === "POST");
    return sendJson(res, 200, result);
  } catch (err) {
    const status = /class not found/i.test(err.message) ? 404 : 500;
    return sendJson(res, status, { error: err.message });
  }
};
