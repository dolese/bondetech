const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const {
  searchStudentsDirectory,
  getStudentProfileByIndexNo,
  getStudentProfileByIdentifier,
} = require("../../lib/studentDirectory");

router.get("/search", async (req, res) => {
  try {
    const results = await searchStudentsDirectory(getDb(), req.query || {});
    res.json(results);
  } catch (err) {
    res.status(/q \(search query\) is required/i.test(err.message) ? 400 : 500).json({ error: err.message });
  }
});

router.get("/:indexNo/profile", async (req, res) => {
  try {
    const profile = await getStudentProfileByIdentifier(
      getDb(),
      {
        indexNo: decodeURIComponent(req.params.indexNo || ""),
        admissionNo: req.query?.admissionNo || "",
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
