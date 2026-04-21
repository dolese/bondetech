const express = require("express");
const router = express.Router();
const { getDb } = require("../db");

// ── GET /api/students/search?q=&form=&year=&limit= ────────────────────────────
// Public search across all classes. Matches on index_no or name (case-insensitive).
router.get("/search", async (req, res) => {
  try {
    const db = getDb();
    const q = (req.query.q || "").trim().toLowerCase();
    const form = (req.query.form || "").trim();
    const year = (req.query.year || "").trim();
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    if (!q) {
      return res.status(400).json({ error: "Search query (q) is required" });
    }

    // Fetch classes, optionally filtered by form/year
    let classQuery = db.collection("classes");
    if (year) classQuery = classQuery.where("year", "==", year);
    if (form) classQuery = classQuery.where("form", "==", form);
    const classesSnap = await classQuery.get();

    const results = [];

    for (const classDoc of classesSnap.docs) {
      if (results.length >= limit) break;
      const classData = classDoc.data();

      const studentsSnap = await classDoc.ref
        .collection("students")
        .orderBy("index_no", "asc")
        .get();

      for (const studentDoc of studentsSnap.docs) {
        if (results.length >= limit) break;
        const data = studentDoc.data();
        const indexNo = (data.index_no || "").toLowerCase();
        const name = (data.name || "").toLowerCase();

        if (indexNo.includes(q) || name.includes(q)) {
          results.push({
            id: studentDoc.id,
            classId: classDoc.id,
            className: classData.name || "",
            form: classData.form || "",
            year: classData.year || "",
            indexNo: data.index_no || "",
            name: data.name || "",
            sex: data.sex || "M",
            status: data.status || "present",
          });
        }
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/students/:indexNo/profile ─────────────────────────────────────────
// Returns a student's full academic history across all classes.
router.get("/:indexNo/profile", async (req, res) => {
  try {
    const db = getDb();
    const indexNo = decodeURIComponent(req.params.indexNo || "").trim();

    if (!indexNo) {
      return res.status(400).json({ error: "Index number is required" });
    }

    const classesSnap = await db.collection("classes").get();

    let studentInfo = null;
    const entries = [];

    for (const classDoc of classesSnap.docs) {
      const classData = classDoc.data();

      const studentsSnap = await classDoc.ref
        .collection("students")
        .where("index_no", "==", indexNo)
        .limit(1)
        .get();

      if (!studentsSnap.empty) {
        const studentDoc = studentsSnap.docs[0];
        const data = studentDoc.data();

        if (!studentInfo) {
          studentInfo = {
            indexNo: data.index_no || "",
            name: data.name || "",
            sex: data.sex || "M",
          };
        }

        entries.push({
          classId: classDoc.id,
          className: classData.name || "",
          form: classData.form || "",
          year: classData.year || "",
          subjects: Array.isArray(classData.subjects) ? classData.subjects : [],
          examScores:
            data.exam_scores && typeof data.exam_scores === "object"
              ? data.exam_scores
              : {},
          status: data.status || "present",
          remarks: data.remarks || "",
        });
      }
    }

    if (!studentInfo) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Sort entries by year ascending
    entries.sort((a, b) => {
      if (a.year < b.year) return -1;
      if (a.year > b.year) return 1;
      return 0;
    });

    res.json({ ...studentInfo, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
