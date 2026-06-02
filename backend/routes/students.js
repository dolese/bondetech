const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { resolveSessionUser } = require("../../lib/auth");
const {
  searchStudentsDirectory,
  getStudentProfileByIndexNo,
  getStudentProfileByIdentifier,
} = require("../../lib/studentDirectory");

async function resolveOptionalAuth(req) {
  try {
    return await resolveSessionUser(getDb(), req);
  } catch {
    return null;
  }
}

router.get("/search", async (req, res) => {
  try {
    const user = await resolveOptionalAuth(req);
    const publishedOnly = !user;
    const results = await searchStudentsDirectory(getDb(), { ...(req.query || {}), publishedOnly });
    res.json(results);
  } catch (err) {
    res.status(/q \(search query\) is required/i.test(err.message) ? 400 : 500).json({ error: err.message });
  }
});

router.get("/:indexNo/profile", async (req, res) => {
  try {
    const user = await resolveOptionalAuth(req);
    const publishedOnly = !user;
    const profile = await getStudentProfileByIdentifier(
      getDb(),
      {
        indexNo: req.query?.indexNo || decodeURIComponent(req.params.indexNo || ""),
        admissionNo: req.query?.admissionNo || "",
        publishedOnly,
      }
    );
    res.json(profile);
  } catch (err) {
    const status = /indexno or admissionno is required/i.test(err.message)
      ? 400
      : /student not found/i.test(err.message)
      ? 404
      : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
