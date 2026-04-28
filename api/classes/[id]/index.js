const { getDb } = require("../../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../lib/http");

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
    archived: data.archived || false,
    published: data.published || false,
    publishedAt: data.published_at || null,
    monthly_exams: Array.isArray(data.monthly_exams) ? data.monthly_exams : [],
  };
};

const parseStudent = (doc, classId) => {
  const data = doc.data();
  const examScores = (data.exam_scores && typeof data.exam_scores === "object") ? data.exam_scores : {};
  const legacyScores = Array.isArray(data.scores) ? data.scores : [];
  return {
    id: doc.id,
    classId,
    indexNo: data.index_no || "",
    name: data.name || "",
    sex: data.sex || "M",
    status: data.status || "present",
    scores: Array.isArray(examScores["March Exam"]) ? examScores["March Exam"] : legacyScores,
    examScores,
    createdAt: data.created_at || null,
  };
};

const remapScores = (oldSubjects, newSubjects, scores) => {
  return newSubjects.map((subj) => {
    const idx = oldSubjects.indexOf(subj);
    return idx >= 0 ? (scores[idx] ?? "") : "";
  });
};

const updateStudentsInBatches = async (db, students, updater) => {
  const chunks = [];
  for (let i = 0; i < students.length; i += 400) {
    chunks.push(students.slice(i, i + 400));
  }

  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((doc) => {
      const updates = updater(doc);
      if (updates) {
        batch.update(doc.ref, updates);
      }
    });
    await batch.commit();
  }
};

module.exports = async (req, res) => {
  const db = getDb();
  const classId = req.query.id;

  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    return sendJson(res, 404, { error: "Class not found" });
  }

  if (req.method === "GET") {
    try {
      const studentsSnap = await classRef.collection("students").orderBy("index_no", "asc").get();
      const students = studentsSnap.docs.map((doc) => parseStudent(doc, classId));
      return sendJson(res, 200, {
        ...parseClass(classSnap),
        students,
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === "PUT") {
    try {
      const body = await readJsonBody(req);
      const data = classSnap.data();
      const updates = {};

      if (typeof body.name === "string") updates.name = body.name.trim() || data.name;
      if (body.schoolInfo) updates.school_info = body.schoolInfo;
      if (Array.isArray(body.subjects)) updates.subjects = body.subjects;
      if (body.year) updates.year = body.year;
      if (body.form) updates.form = body.form;
      if (Array.isArray(body.monthlyExams)) {
        updates.monthly_exams = body.monthlyExams.filter(
          (m) => typeof m === "string" && m.trim()
        );
      }

      if (Array.isArray(body.subjects)) {
        const oldSubjects = Array.isArray(data.subjects) ? data.subjects : [];
        const newSubjects = body.subjects;
        if (JSON.stringify(oldSubjects) !== JSON.stringify(newSubjects)) {
          const studentsSnap = await classRef.collection("students").get();
          await updateStudentsInBatches(db, studentsSnap.docs, (doc) => {
            const d = doc.data();
            const remappedScores = remapScores(oldSubjects, newSubjects, d.scores || []);
            const existingExamScores = (d.exam_scores && typeof d.exam_scores === "object") ? d.exam_scores : {};
            const remappedExamScores = {};
            for (const [exam, sc] of Object.entries(existingExamScores)) {
              remappedExamScores[exam] = remapScores(oldSubjects, newSubjects, Array.isArray(sc) ? sc : []);
            }
            return { scores: remappedScores, exam_scores: remappedExamScores };
          });
        }
      }

      if (Object.keys(updates).length === 0) {
        const unchanged = await classRef.get();
        return sendJson(res, 200, parseClass(unchanged));
      }

      await classRef.update(updates);
      const updated = await classRef.get();
      return sendJson(res, 200, parseClass(updated));
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      // Soft-delete: mark as archived instead of permanently deleting.
      // Pass ?permanent=true to perform a hard delete (admin use only).
      if (req.query.permanent === "true") {
        const studentsSnap = await classRef.collection("students").get();
        const chunks = [];
        for (let i = 0; i < studentsSnap.docs.length; i += 400) {
          chunks.push(studentsSnap.docs.slice(i, i + 400));
        }
        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }
        await classRef.delete();
      } else {
        await classRef.update({ archived: true, archived_at: new Date().toISOString() });
      }
      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // PATCH used for restore (un-archive)
  if (req.method === "PATCH") {
    try {
      await classRef.update({ archived: false, archived_at: null });
      const updated = await classRef.get();
      return sendJson(res, 200, parseClass(updated));
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
