const { getDb } = require("../_lib/firebaseAdmin");
const { sendJson } = require("../_lib/http");

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
 *       students: [ { id, index_no, name, sex, stream, status, scores,
 *                     exam_scores, remarks, created_at } ]
 *     }
 *   ]
 * }
 */
module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

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
};
