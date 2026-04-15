const express = require("express");
const router = express.Router();
const { getDb, saveDb } = require("../db");
const {
  validateStudentMiddleware,
  validateClassMiddleware,
  sanitizeScores,
} = require("../validation");

// ── Helpers ───────────────────────────────────────────────────────────────────
const execQuery = (sql, params = []) => {
  const db = getDb();
  try {
    const result = db.exec(sql, params);
    return result.length > 0 ? result[0] : { columns: [], values: [] };
  } catch (err) {
    throw err;
  }
};

const runQuery = (sql, params = []) => {
  const db = getDb();
  db.run(sql, params);
  saveDb();
};

const rowToObj = (row, columns) => {
  const obj = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
};

const rowsToObjs = (rows, columns) => {
  return rows.map(row => rowToObj(row, columns));
};

const CNO_PREFIX = "S6509";

const formatCno = (num) => `${CNO_PREFIX}/${String(num).padStart(4, "0")}`;

const getNextCno = (classId) => {
  const result = execQuery(
    "SELECT index_no FROM students WHERE class_id = ? AND index_no LIKE ?",
    [classId, `${CNO_PREFIX}/%`]
  );
  const rows = rowsToObjs(result.values, result.columns);
  let max = 0;
  rows.forEach((row) => {
    const match = String(row.index_no ?? "").match(/\/(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  });
  return max + 1;
};

const parseClass = (row) => ({
  id: row.id,
  name: row.name,
  schoolInfo: JSON.parse(row.school_info),
  subjects: JSON.parse(row.subjects),
  year: row.year,
  form: row.form,
  createdAt: row.created_at,
  studentCount: row.student_count ?? 0,
});

const parseStudent = (row) => ({
  id: row.id,
  classId: row.class_id,
  indexNo: row.index_no,
  name: row.name,
  stream: row.stream,
  sex: row.sex,
  status: row.status,
  scores: JSON.parse(row.scores),
  createdAt: row.created_at,
});

// ── GET /api/classes ── List all classes ──────────────────────────────────────
router.get("/", (req, res) => {
  try {
    const result = execQuery(`
      SELECT c.id, c.name, c.school_info, c.subjects, c.year, c.form, c.created_at, COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at ASC
    `);
    
    const rows = rowsToObjs(result.values, result.columns);
    res.json(rows.map(parseClass));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/classes/:id ── Single class with students ────────────────────────
router.get("/:id", (req, res) => {
  try {
    const clsResult = execQuery("SELECT * FROM classes WHERE id = ?", [req.params.id]);
    if (clsResult.values.length === 0) return res.status(404).json({ error: "Class not found" });
    
    const cls = rowToObj(clsResult.values[0], clsResult.columns);

    const studResult = execQuery(
      "SELECT * FROM students WHERE class_id = ? ORDER BY index_no ASC",
      [req.params.id]
    );
    
    const students = rowsToObjs(studResult.values, studResult.columns);

    res.json({
      ...parseClass(cls),
      students: students.map(parseStudent),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/classes ── Create class ─────────────────────────────────────────
router.post("/", validateClassMiddleware, (req, res) => {
  try {
    const { name = "New Class", schoolInfo = {}, subjects = [], year = "2026", form = "Form I" } = req.body;
    runQuery(
      "INSERT INTO classes (name, school_info, subjects, year, form) VALUES (?, ?, ?, ?, ?)",
      [name, JSON.stringify(schoolInfo), JSON.stringify(subjects), year, form]
    );

    // Get the last inserted row
    const result = execQuery("SELECT * FROM classes ORDER BY rowid DESC LIMIT 1");
    const cls = rowToObj(result.values[0], result.columns);
    res.status(201).json(parseClass(cls));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/classes/:id ── Update class ──────────────────────────────────────
router.put("/:id", (req, res) => {
  try {
    const clsResult = execQuery("SELECT * FROM classes WHERE id = ?", [req.params.id]);
    if (clsResult.values.length === 0) return res.status(404).json({ error: "Class not found" });
    
    const cls = rowToObj(clsResult.values[0], clsResult.columns);
    const { name, schoolInfo, subjects, year, form } = req.body;

    // If subjects changed, update student scores arrays accordingly
    if (subjects) {
      const oldSubjects = JSON.parse(cls.subjects);
      const newSubjects = subjects;

      if (JSON.stringify(oldSubjects) !== JSON.stringify(newSubjects)) {
        const studResult = execQuery("SELECT * FROM students WHERE class_id = ?", [req.params.id]);
        const students = rowsToObjs(studResult.values, studResult.columns);

        for (const st of students) {
          const oldScores = JSON.parse(st.scores);
          // Map old scores to new subject positions
          const newScores = newSubjects.map((subj) => {
            const oldIdx = oldSubjects.indexOf(subj);
            return oldIdx >= 0 ? (oldScores[oldIdx] ?? "") : "";
          });
          runQuery("UPDATE students SET scores = ? WHERE id = ?", [JSON.stringify(newScores), st.id]);
        }
      }
    }

    runQuery(`
      UPDATE classes
      SET name = COALESCE(?, name),
          school_info = COALESCE(?, school_info),
          subjects = COALESCE(?, subjects),
          year = COALESCE(?, year),
          form = COALESCE(?, form)
      WHERE id = ?
    `, [
      name ?? null,
      schoolInfo ? JSON.stringify(schoolInfo) : null,
      subjects ? JSON.stringify(subjects) : null,
      year ?? null,
      form ?? null,
      req.params.id
    ]);

    const updated = execQuery("SELECT * FROM classes WHERE id = ?", [req.params.id]);
    const updatedCls = rowToObj(updated.values[0], updated.columns);
    res.json(parseClass(updatedCls));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/classes/:id ── Delete class ───────────────────────────────────
router.delete("/:id", (req, res) => {
  try {
    const clsResult = execQuery("SELECT id FROM classes WHERE id = ?", [req.params.id]);
    if (clsResult.values.length === 0) return res.status(404).json({ error: "Class not found" });

    runQuery("DELETE FROM classes WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/classes/:id/students ── All students in a class ─────────────────
router.get("/:id/students", (req, res) => {
  try {
    const result = execQuery(
      "SELECT * FROM students WHERE class_id = ? ORDER BY index_no ASC",
      [req.params.id]
    );
    const rows = rowsToObjs(result.values, result.columns);
    res.json(rows.map(parseStudent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/classes/:id/students ── Add one student ────────────────────────
router.post("/:id/students", validateStudentMiddleware, (req, res) => {
  try {
    const clsResult = execQuery("SELECT * FROM classes WHERE id = ?", [req.params.id]);
    if (clsResult.values.length === 0) return res.status(404).json({ error: "Class not found" });
    
    const cls = rowToObj(clsResult.values[0], clsResult.columns);
    const subjects = JSON.parse(cls.subjects);
    const { indexNo = "", name = "", stream = "", sex = "M", status = "present", scores } = req.body;
    const finalIndex = indexNo && String(indexNo).trim() ? String(indexNo).trim() : formatCno(getNextCno(req.params.id));
    const finalScores = scores ? sanitizeScores(scores) : Array(subjects.length).fill("");

    runQuery(`
      INSERT INTO students (class_id, index_no, name, stream, sex, status, scores)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.params.id, finalIndex, name, stream, sex, status, JSON.stringify(finalScores)]);

    const result = execQuery("SELECT * FROM students ORDER BY rowid DESC LIMIT 1");
    const student = rowToObj(result.values[0], result.columns);
    res.status(201).json(parseStudent(student));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/classes/:id/students/bulk ── Bulk import students ───────────────
router.post("/:id/students/bulk", (req, res) => {
  try {
    const clsResult = execQuery("SELECT * FROM classes WHERE id = ?", [req.params.id]);
    if (clsResult.values.length === 0) return res.status(404).json({ error: "Class not found" });

    const { students } = req.body;
    if (!Array.isArray(students)) return res.status(400).json({ error: "students must be an array" });

    const errors = [];
    let validCount = 0;

    let nextCno = getNextCno(req.params.id);
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const validation = require("../validation").validateStudent(s);
      
      if (!validation.valid) {
        errors.push({ row: i + 1, errors: validation.errors });
        continue;
      }

      try {
        const { sanitizeScores } = require("../validation");
        const providedIndex = s.indexNo ?? "";
        const finalIndex = String(providedIndex).trim() ? String(providedIndex).trim() : formatCno(nextCno++);
        runQuery(
          `INSERT INTO students (class_id, index_no, name, stream, sex, status, scores)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            req.params.id,
            finalIndex,
            s.name ?? "",
            s.stream ?? "",
            s.sex ?? "M",
            s.status ?? "present",
            JSON.stringify(sanitizeScores(s.scores ?? []))
          ]
        );
        validCount++;
      } catch (insertErr) {
        errors.push({ row: i + 1, error: insertErr.message });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Bulk import completed with errors",
        details: {
          imported: validCount,
          failed: errors.length,
          errors: errors.slice(0, 10), // Show first 10 errors
        },
      });
    }

    const all = execQuery("SELECT * FROM students WHERE class_id = ? ORDER BY index_no ASC", [req.params.id]);
    const rows = rowsToObjs(all.values, all.columns);
    res.status(201).json(rows.map(parseStudent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/classes/:id/students/:sid ── Update student ─────────────────────
router.put("/:id/students/:sid", validateStudentMiddleware, (req, res) => {
  try {
    const stResult = execQuery("SELECT * FROM students WHERE id = ? AND class_id = ?", [req.params.sid, req.params.id]);
    if (stResult.values.length === 0) return res.status(404).json({ error: "Student not found" });

    const { indexNo, name, stream, sex, status, scores } = req.body;
    runQuery(`
      UPDATE students SET
        index_no = COALESCE(?, index_no),
        name     = COALESCE(?, name),
        stream   = COALESCE(?, stream),
        sex      = COALESCE(?, sex),
        status   = COALESCE(?, status),
        scores   = COALESCE(?, scores)
      WHERE id = ?
    `, [
      indexNo ?? null,
      name ?? null,
      stream ?? null,
      sex ?? null,
      status ?? null,
      scores ? JSON.stringify(sanitizeScores(scores)) : null,
      req.params.sid
    ]);

    const updated = execQuery("SELECT * FROM students WHERE id = ?", [req.params.sid]);
    const updatedStudent = rowToObj(updated.values[0], updated.columns);
    res.json(parseStudent(updatedStudent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/classes/:id/students/:sid ── Delete student ──────────────────
router.delete("/:id/students/:sid", (req, res) => {
  try {
    runQuery("DELETE FROM students WHERE id = ? AND class_id = ?", [req.params.sid, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
