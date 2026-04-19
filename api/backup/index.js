const { getDb } = require("../_lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../_lib/http");

/**
 * GET /api/backup
 *
 * Exports a full JSON snapshot of all classes (including archived) and their
 * student sub-collections.  The response body is a JSON object of the shape:
 *
 * {
 *   exportedAt: ISO string,
 *   version: 1,
 *   classes: [
 *     {
 *       id, name, form, year, subjects, school_info, archived, published,
 *       created_at, student_count, cno_counter,
 *       students: [ { id, index_no, name, sex, status, scores,
 *                     exam_scores, remarks, created_at } ]
 *     }
 *   ]
 * }
 *
 * POST /api/restore  (routed here via vercel.json rewrite)
 *
 * Accepts the JSON produced by GET /api/backup and writes it back to
 * Firestore.  Existing documents (same ID) are skipped — this is a
 * non-destructive import.
 *
 * Request body: { classes: [...] }  (same shape as backup output)
 * Response:     { created: n, skipped: n }
 */
module.exports = async (req, res) => {
  if (req.method === "GET") {
    const db = getDb();

    try {
      const classesSnap = await db.collection("classes").orderBy("created_at", "asc").get();

      const classes = await Promise.all(
        classesSnap.docs.map(async (classDoc) => {
          const cls = { id: classDoc.id, ...classDoc.data() };

          const studentsSnap = await classDoc.ref
            .collection("students")
            .orderBy("index_no", "asc")
            .get();

          cls.students = studentsSnap.docs.map((s) => ({
            id: s.id,
            ...s.data(),
          }));

          return cls;
        })
      );

      return sendJson(res, 200, {
        exportedAt: new Date().toISOString(),
        version: 1,
        classes,
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON body" });
    }

    if (!Array.isArray(body.classes)) {
      return sendJson(res, 400, { error: "classes must be an array" });
    }

    const db = getDb();
    let created = 0;
    let skipped = 0;

    for (const cls of body.classes) {
      if (!cls.id) { skipped++; continue; }

      const classRef = db.collection("classes").doc(cls.id);
      const existingSnap = await classRef.get();

      if (existingSnap.exists) {
        skipped++;
      } else {
        const { students: _students, id: _id, ...classData } = cls;
        await classRef.set(classData);
        created++;
      }

      // Restore students regardless of whether the class doc was new
      // (allows partial student restores if class already existed).
      const students = Array.isArray(cls.students) ? cls.students : [];
      for (let i = 0; i < students.length; i += 400) {
        const batch = db.batch();
        students.slice(i, i + 400).forEach((student) => {
          if (!student.id) return;
          const { id: _sid, ...studentData } = student;
          const ref = classRef.collection("students").doc(student.id);
          // merge:true preserves any fields already on the student document that
          // are not present in the backup snapshot (e.g. fields added after the
          // backup was taken), so restore is always additive and non-destructive.
          batch.set(ref, studentData, { merge: true });
        });
        await batch.commit();
      }
    }

    return sendJson(res, 200, { created, skipped });
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
