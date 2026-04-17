const { getDb } = require("../_lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../_lib/http");

/**
 * POST /api/restore
 *
 * Accepts the JSON produced by GET /api/backup and writes it back to
 * Firestore.  Existing documents (same ID) are skipped — this is a
 * non-destructive import.
 *
 * Request body: { classes: [...] }  (same shape as backup output)
 * Response:     { created: n, skipped: n }
 */
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

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
        batch.set(ref, studentData, { merge: false });
      });
      await batch.commit();
    }
  }

  return sendJson(res, 200, { created, skipped });
};
