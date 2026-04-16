const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const {
  validateStudentMiddleware,
  validateClassMiddleware,
  sanitizeScores,
  sanitizeText,
  ALLOWED_FORMS,
} = require("../validation");

// ── Constants ─────────────────────────────────────────────────────────────────
const CNO_PREFIX = "S6509";

const formatCno = (num) => `${CNO_PREFIX}/${String(num).padStart(4, "0")}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseClass = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    schoolInfo: data.school_info || {},
    subjects: data.subjects || [],
    year: data.year || "",
    form: data.form || "",
    createdAt: data.created_at || null,
    studentCount: data.student_count || 0,
  };
};

const parseStudent = (doc, classId) => {
  const data = doc.data();
  return {
    id: doc.id,
    classId,
    indexNo: data.index_no || "",
    name: data.name || "",
    stream: data.stream || "",
    sex: data.sex || "M",
    status: data.status || "present",
    scores: Array.isArray(data.scores) ? data.scores : [],
    remarks: data.remarks || "",
    createdAt: data.created_at || null,
  };
};

const remapScores = (oldSubjects, newSubjects, scores) =>
  newSubjects.map((subj) => {
    const idx = oldSubjects.indexOf(subj);
    return idx >= 0 ? (scores[idx] ?? "") : "";
  });

// Reserve a sequential CNO range atomically using a Firestore transaction.
const reserveCnoRange = async (db, classRef, count) => {
  if (count <= 0) return 0;
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(classRef);
    if (!snap.exists) throw new Error("Class not found");
    const current = Number(snap.data().cno_counter || 0);
    tx.update(classRef, { cno_counter: current + count });
    return current + 1;
  });
};

// Commit Firestore batch writes split into chunks of ≤ 400 operations.
const commitInBatches = async (db, docs, updater) => {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach((doc) => {
      const updates = updater(doc);
      if (updates) batch.update(doc.ref, updates);
    });
    await batch.commit();
  }
};

// ── GET /api/classes ── List all classes ──────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("classes").orderBy("created_at", "asc").get();
    res.json(snapshot.docs.map(parseClass));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/classes/:id ── Single class with students ────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const classRef = db.collection("classes").doc(req.params.id);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: "Class not found" });

    const studentsSnap = await classRef
      .collection("students")
      .orderBy("index_no", "asc")
      .get();

    res.json({
      ...parseClass(classSnap),
      students: studentsSnap.docs.map((doc) => parseStudent(doc, req.params.id)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/classes ── Create class ─────────────────────────────────────────
router.post("/", validateClassMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const {
      name = "New Class",
      schoolInfo = {},
      subjects = [],
      year = "2026",
      form = "Form I",
    } = req.body;

    const dupSnap = await db.collection("classes")
      .where("year", "==", year)
      .where("form", "==", form)
      .limit(1)
      .get();
    if (!dupSnap.empty) {
      return res.status(409).json({ error: `A class for ${form} ${year} already exists` });
    }

    const docRef = await db.collection("classes").add({
      name: name.trim() || "New Class",
      school_info: schoolInfo,
      subjects,
      year,
      form,
      created_at: new Date().toISOString(),
      student_count: 0,
      cno_counter: 0,
    });

    const created = await docRef.get();
    res.status(201).json(parseClass(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/classes/:id ── Update class ──────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const db = getDb();
    const classRef = db.collection("classes").doc(req.params.id);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: "Class not found" });

    const data = classSnap.data();
    const { name, schoolInfo, subjects, year, form } = req.body;
    const updates = {};

    if (typeof name === "string") updates.name = name.trim() || data.name;
    if (schoolInfo) updates.school_info = schoolInfo;
    if (Array.isArray(subjects)) updates.subjects = subjects;
    if (year) updates.year = year;
    if (form) updates.form = form;

    // If year or form changed, ensure no duplicate (year, form) combination
    const newYear = updates.year || data.year;
    const newForm = updates.form || data.form;
    if ((updates.year && updates.year !== data.year) || (updates.form && updates.form !== data.form)) {
      if (!ALLOWED_FORMS.includes(newForm)) {
        return res.status(400).json({ error: "Form must be one of: Form I, Form II, Form III, Form IV" });
      }
      const dupSnap = await db.collection("classes")
        .where("year", "==", newYear)
        .where("form", "==", newForm)
        .limit(1)
        .get();
      if (!dupSnap.empty && dupSnap.docs[0].id !== req.params.id) {
        return res.status(409).json({ error: `A class for ${newForm} ${newYear} already exists` });
      }
    }

    // Remap student scores if subjects changed
    if (Array.isArray(subjects)) {
      const oldSubjects = Array.isArray(data.subjects) ? data.subjects : [];
      if (JSON.stringify(oldSubjects) !== JSON.stringify(subjects)) {
        const studentsSnap = await classRef.collection("students").get();
        await commitInBatches(db, studentsSnap.docs, (doc) => ({
          scores: remapScores(oldSubjects, subjects, doc.data().scores || []),
        }));
      }
    }

    await classRef.update(updates);
    const updated = await classRef.get();
    res.json(parseClass(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/classes/:id ── Delete class ───────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const db = getDb();
    const classRef = db.collection("classes").doc(req.params.id);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: "Class not found" });

    // Delete all students in batches, then the class document
    const studentsSnap = await classRef.collection("students").get();
    for (let i = 0; i < studentsSnap.docs.length; i += 400) {
      const batch = db.batch();
      studentsSnap.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    await classRef.delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/classes/:id/students ── All students in a class ─────────────────
router.get("/:id/students", async (req, res) => {
  try {
    const db = getDb();
    const classRef = db.collection("classes").doc(req.params.id);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: "Class not found" });

    const snap = await classRef.collection("students").orderBy("index_no", "asc").get();
    res.json(snap.docs.map((doc) => parseStudent(doc, req.params.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/classes/:id/students ── Add one student ────────────────────────
router.post("/:id/students", validateStudentMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const classRef = db.collection("classes").doc(req.params.id);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: "Class not found" });

    const data = classSnap.data();
    const subjects = Array.isArray(data.subjects) ? data.subjects : [];

    const name = sanitizeText(req.body.name || "");
    if (!name) return res.status(400).json({ error: "Student name is required" });

    const sex = req.body.sex === "F" ? "F" : "M";
    const status = ["present", "absent", "incomplete"].includes(req.body.status)
      ? req.body.status
      : "present";
    const stream = sanitizeText(req.body.stream || "");
    const remarks = sanitizeText(req.body.remarks || "");

    let indexNo = sanitizeText(req.body.indexNo || "");
    if (!indexNo) {
      const start = await reserveCnoRange(db, classRef, 1);
      indexNo = formatCno(start);
    }

    const scores = sanitizeScores(
      Array.isArray(req.body.scores) ? req.body.scores : Array(subjects.length).fill("")
    );

    const studentRef = await classRef.collection("students").add({
      index_no: indexNo,
      name,
      stream,
      sex,
      status,
      scores,
      remarks,
      created_at: new Date().toISOString(),
    });

    await classRef.update({ student_count: Number(data.student_count || 0) + 1 });

    const created = await studentRef.get();
    res.status(201).json(parseStudent(created, req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/classes/:id/students/bulk ── Bulk upsert students ──────────────
// Matching logic: if an incoming row carries an indexNo that matches an existing
// student's index_no the student is updated (when data changed) or skipped
// (when nothing changed).  Rows without an indexNo or with an indexNo that does
// not yet exist are created as new students.
router.post("/:id/students/bulk", async (req, res) => {
  try {
    const db = getDb();
    const classRef = db.collection("classes").doc(req.params.id);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: "Class not found" });

    const { students } = req.body;
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: "students must be an array" });
    }

    const data = classSnap.data();
    const subjects = Array.isArray(data.subjects) ? data.subjects : [];

    // Build an index_no → { ref, data } map from existing students.
    const existingSnap = await classRef.collection("students").get();
    const existingByIndexNo = {};
    existingSnap.docs.forEach((doc) => {
      const iNo = (doc.data().index_no || "").trim();
      if (iNo) existingByIndexNo[iNo] = { ref: doc.ref, data: doc.data() };
    });

    const validStudents = students.filter((s) => sanitizeText(s.name || ""));

    // Separate rows that need a new CNO (new students with no indexNo).
    const needsCno = validStudents.filter(
      (s) => !sanitizeText(s.indexNo || "") && !existingByIndexNo[sanitizeText(s.indexNo || "")]
    );
    let cursor =
      needsCno.length > 0
        ? await reserveCnoRange(db, classRef, needsCno.length)
        : 0;

    const created_at = new Date().toISOString();
    const toCreate = [];
    const toUpdate = [];
    let skipped = 0;

    for (const raw of validStudents) {
      const name = sanitizeText(raw.name || "");
      if (!name) continue;

      const incomingIndexNo = sanitizeText(raw.indexNo || "");
      const existing = incomingIndexNo ? existingByIndexNo[incomingIndexNo] : null;

      const newStream = sanitizeText(raw.stream || "");
      const newSex = raw.sex === "F" ? "F" : "M";
      const newStatus = ["present", "absent", "incomplete"].includes(raw.status)
        ? raw.status
        : "present";
      const newRemarks = sanitizeText(raw.remarks || "");
      const newScores = sanitizeScores(
        Array.isArray(raw.scores) ? raw.scores : Array(subjects.length).fill("")
      );

      if (existing) {
        const ed = existing.data;
        const changed =
          name !== (ed.name || "") ||
          newStream !== (ed.stream || "") ||
          newSex !== (ed.sex || "M") ||
          newStatus !== (ed.status || "present") ||
          newRemarks !== (ed.remarks || "") ||
          JSON.stringify(newScores) !== JSON.stringify(ed.scores || []);

        if (changed) {
          toUpdate.push({
            ref: existing.ref,
            updates: { name, stream: newStream, sex: newSex, status: newStatus, remarks: newRemarks, scores: newScores },
          });
        } else {
          skipped += 1;
        }
      } else {
        // New student — assign a CNO if none provided.
        let finalIndexNo = incomingIndexNo || formatCno(cursor++);
        toCreate.push({
          index_no: finalIndexNo,
          name,
          stream: newStream,
          sex: newSex,
          status: newStatus,
          scores: newScores,
          remarks: newRemarks,
          created_at,
        });
      }
    }

    // Commit updates in batches.
    for (let i = 0; i < toUpdate.length; i += 400) {
      const batch = db.batch();
      toUpdate.slice(i, i + 400).forEach(({ ref, updates }) => batch.update(ref, updates));
      await batch.commit();
    }

    // Commit creates in batches.
    for (let i = 0; i < toCreate.length; i += 400) {
      const batch = db.batch();
      toCreate.slice(i, i + 400).forEach((doc) => {
        batch.set(classRef.collection("students").doc(), doc);
      });
      await batch.commit();
    }

    if (toCreate.length > 0) {
      await classRef.update({
        student_count: Number(data.student_count || 0) + toCreate.length,
      });
    }

    res.status(201).json({
      success: true,
      created: toCreate.length,
      updated: toUpdate.length,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/classes/:id/students/:sid ── Update student ─────────────────────
router.put("/:id/students/:sid", validateStudentMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const classRef = db.collection("classes").doc(req.params.id);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: "Class not found" });

    const studentRef = classRef.collection("students").doc(req.params.sid);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) return res.status(404).json({ error: "Student not found" });

    const subjects = Array.isArray(classSnap.data().subjects) ? classSnap.data().subjects : [];
    const existing = studentSnap.data();
    const updates = {};

    if (typeof req.body.indexNo === "string")
      updates.index_no = sanitizeText(req.body.indexNo) || existing.index_no;
    if (typeof req.body.name === "string")
      updates.name = sanitizeText(req.body.name) || existing.name;
    if (typeof req.body.stream === "string")
      updates.stream = sanitizeText(req.body.stream);
    if (req.body.sex) updates.sex = req.body.sex === "F" ? "F" : "M";
    if (req.body.status) {
      updates.status = ["present", "absent", "incomplete"].includes(req.body.status)
        ? req.body.status
        : existing.status;
    }
    if (Array.isArray(req.body.scores))
      updates.scores = sanitizeScores(req.body.scores.slice(0, subjects.length));
    if (typeof req.body.remarks === "string")
      updates.remarks = sanitizeText(req.body.remarks);

    await studentRef.update(updates);
    const updated = await studentRef.get();
    res.json(parseStudent(updated, req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/classes/:id/students/:sid ── Delete student ──────────────────
router.delete("/:id/students/:sid", async (req, res) => {
  try {
    const db = getDb();
    const classRef = db.collection("classes").doc(req.params.id);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: "Class not found" });

    const studentRef = classRef.collection("students").doc(req.params.sid);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) return res.status(404).json({ error: "Student not found" });

    await studentRef.delete();
    await classRef.update({
      student_count: Math.max(0, Number(classSnap.data().student_count || 0) - 1),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

