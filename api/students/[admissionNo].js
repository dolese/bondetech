const { getDb } = require("../../lib/firebaseAdmin");
const { sendJson } = require("../../lib/http");
const { getStudentProfileByAdmissionNo } = require("../../lib/studentDirectory");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  try {
    const profile = await getStudentProfileByAdmissionNo(getDb(), req.query.admissionNo || "");
    return sendJson(res, 200, profile);
  } catch (err) {
    const status = /admissionno is required/i.test(err.message)
      ? 400
      : /student not found/i.test(err.message)
      ? 404
      : 500;
    return sendJson(res, status, { error: err.message });
  }
};
