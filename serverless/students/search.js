const { getDb } = require("../../lib/firebaseAdmin");
const { sendJson } = require("../../lib/http");
const { resolveSessionUser } = require("../../lib/auth");
const { searchStudentsDirectory } = require("../../lib/studentDirectory");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  try {
    let user = null;
    try { user = await resolveSessionUser(getDb(), req); } catch { /* unauthenticated */ }
    const publishedOnly = !user;
    const results = await searchStudentsDirectory(getDb(), { ...(req.query || {}), publishedOnly });
    return sendJson(res, 200, results);
  } catch (err) {
    const status = /q \(search query\) is required/i.test(err.message) ? 400 : 500;
    return sendJson(res, status, { error: err.message });
  }
};
