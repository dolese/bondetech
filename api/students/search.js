const { getDb } = require("../../lib/firebaseAdmin");
const { sendJson } = require("../../lib/http");
const { searchStudentsDirectory } = require("../../lib/studentDirectory");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  try {
    const results = await searchStudentsDirectory(getDb(), req.query || {});
    return sendJson(res, 200, results);
  } catch (err) {
    const status = /q \(search query\) is required/i.test(err.message) ? 400 : 500;
    return sendJson(res, status, { error: err.message });
  }
};
