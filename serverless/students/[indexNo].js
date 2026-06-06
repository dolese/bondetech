const { getDb } = require("../../lib/firebaseAdmin");
const { sendJson } = require("../../lib/http");
const { resolveSessionUser } = require("../../lib/auth");
const { getStudentProfileByIdentifier } = require("../../lib/studentDirectory");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  try {
    let user = null;
    try { user = await resolveSessionUser(getDb(), req); } catch { /* unauthenticated */ }
    const publishedOnly = !user;
    const profile = await getStudentProfileByIdentifier(getDb(), {
      indexNo: req.query.indexNo || "",
      admissionNo: req.query.admissionNo || "",
      classId: req.query.classId || "",
      studentId: req.query.studentId || "",
      publishedOnly,
    });
    return sendJson(res, 200, profile);
  } catch (err) {
    const status = /indexno, admissionno, or classid \+ studentid is required/i.test(err.message)
      ? 400
      : /student not found/i.test(err.message)
      ? 404
      : 500;
    return sendJson(res, status, { error: err.message });
  }
};
