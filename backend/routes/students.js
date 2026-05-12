const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const {
  searchStudentsDirectory,
  getStudentProfileByAdmissionNo,
} = require("../../lib/studentDirectory");

router.get("/search", async (req, res) => {
  try {
    const results = await searchStudentsDirectory(getDb(), req.query || {});
    res.json(results);
  } catch (err) {
    res.status(/q \(search query\) is required/i.test(err.message) ? 400 : 500).json({ error: err.message });
  }
});

router.get("/:admissionNo/profile", async (req, res) => {
  try {
    const profile = await getStudentProfileByAdmissionNo(
      getDb(),
      decodeURIComponent(req.params.admissionNo || "")
    );
    res.json(profile);
  } catch (err) {
    const status = /admissionno is required/i.test(err.message)
      ? 400
      : /student not found/i.test(err.message)
      ? 404
      : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
