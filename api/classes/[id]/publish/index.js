const { getDb } = require("../../../../lib/firebaseAdmin");
const { sendJson } = require("../../../../lib/http");

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
  const classId = req.query.id;
  const classRef = db.collection("classes").doc(classId);

  const snap = await classRef.get();
  if (!snap.exists) {
    return sendJson(res, 404, { error: "Class not found" });
  }

  try {
    if (req.method === "DELETE") {
      await classRef.update({ published: false, published_at: null });
      return sendJson(res, 200, { published: false });
    }

    const published_at = new Date().toISOString();
    await classRef.update({ published: true, published_at });
    return sendJson(res, 200, { published: true, published_at });
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
};
