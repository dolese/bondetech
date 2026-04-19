const { getDb } = require("../../../_lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../_lib/http");
const { formatCno, sanitizeScores, sanitizeText, reserveCnoRange } = require("../../../_lib/students");

const DEFAULT_EXAM_TYPE = "March Exam";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const db = getDb();
  const classId = req.query.id;
  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    return sendJson(res, 404, { error: "Class not found" });
  }

  try {
    const body = await readJsonBody(req);
    const students = Array.isArray(body.students) ? body.students : [];
    if (!students.length) {
      return sendJson(res, 400, { error: "students must be a non-empty array" });
    }

    const examType = sanitizeText(body.examType || DEFAULT_EXAM_TYPE);
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

    // Rows that need a new CNO (new students with no indexNo).
    const needsCno = validStudents.filter((s) => !sanitizeText(s.indexNo || ""));
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

      const incomingIndexNo = sanitizeText(raw.indexNo || "");
      const existing = incomingIndexNo ? existingByIndexNo[incomingIndexNo] : null;

      const newSex = raw.sex === "F" ? "F" : "M";
      const newStatus = ["present", "absent", "incomplete"].includes(raw.status)
        ? raw.status
        : "present";
      const newRemarks = sanitizeText(raw.remarks || "");
      const newScores = sanitizeScores(
        Array.isArray(raw.scores) ? raw.scores : Array(subjects.length).fill(""),
        subjects.length
      );

      if (existing) {
        const ed = existing.data;
        const existingExamScores = (ed.exam_scores && typeof ed.exam_scores === "object") ? ed.exam_scores : {};
        const existingExamScoreForType = existingExamScores[examType] ?? [];
        const changed =
          name !== (ed.name || "") ||
          newSex !== (ed.sex || "M") ||
          newStatus !== (ed.status || "present") ||
          newRemarks !== (ed.remarks || "") ||
          JSON.stringify(newScores) !== JSON.stringify(existingExamScoreForType);

        if (changed) {
          toUpdate.push({
            ref: existing.ref,
            updates: {
              name,
              sex: newSex,
              status: newStatus,
              remarks: newRemarks,
              scores: newScores,
              exam_scores: { ...existingExamScores, [examType]: newScores },
            },
          });
        } else {
          skipped += 1;
        }
      } else {
        const finalIndexNo = incomingIndexNo || formatCno(cursor++);
        toCreate.push({
          index_no: finalIndexNo,
          name,
          sex: newSex,
          status: newStatus,
          scores: newScores,
          exam_scores: { [examType]: newScores },
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

    return sendJson(res, 200, {
      success: true,
      created: toCreate.length,
      updated: toUpdate.length,
      skipped,
    });
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
};
