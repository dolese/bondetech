const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");
const { getHomepageOverview } = require("../../lib/homepageOverview");
const { resolveSessionUser, canManageClasses } = require("../../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const requestUrl = new URL(req.url || "/api/stats", "https://bonde-results.local");

  // Also handles GET /api/health (routed here via vercel.json rewrite)
  if (requestUrl.pathname.startsWith("/api/health")) {
    return sendJson(res, 200, {
      status: "ok",
      time: new Date().toISOString(),
      app: "BONDE Result System",
    });
  }

  if (requestUrl.pathname.startsWith("/api/backup")) {
    let currentUser;
    try {
      currentUser = await resolveSessionUser(getDb(), req);
    } catch (err) {
      return sendJson(res, 401, { error: err.message });
    }
    if (!currentUser || !canManageClasses(currentUser.role)) {
      return sendJson(res, 403, { error: "Only administrators can export backups" });
    }
    try {
      const db = getDb();
      const classesSnap = await db.collection("classes").orderBy("created_at", "asc").get();

      const classes = await Promise.all(
        classesSnap.docs.map(async (classDoc) => {
          const cls = { id: classDoc.id, ...classDoc.data() };
          const studentsSnap = await classDoc.ref.collection("students").orderBy("index_no", "asc").get();
          cls.students = studentsSnap.docs.map((studentDoc) => ({
            id: studentDoc.id,
            ...studentDoc.data(),
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

  if (requestUrl.pathname.startsWith("/api/restore")) {
    let currentUser;
    try {
      currentUser = await resolveSessionUser(getDb(), req);
    } catch (err) {
      return sendJson(res, 401, { error: err.message });
    }
    if (!currentUser || !canManageClasses(currentUser.role)) {
      return sendJson(res, 403, { error: "Only administrators can restore backups" });
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

    try {
      const db = getDb();
      let created = 0;
      let skipped = 0;

      for (const cls of body.classes) {
        if (!cls.id) {
          skipped += 1;
          continue;
        }

        const classRef = db.collection("classes").doc(cls.id);
        const existingSnap = await classRef.get();

        if (existingSnap.exists) {
          skipped += 1;
        } else {
          const { students: _students, id: _id, ...classData } = cls;
          await classRef.set(classData);
          created += 1;
        }

        const students = Array.isArray(cls.students) ? cls.students : [];
        for (let i = 0; i < students.length; i += 400) {
          const batch = db.batch();
          students.slice(i, i + 400).forEach((student) => {
            if (!student.id) return;
            const { id: _sid, ...studentData } = student;
            batch.set(classRef.collection("students").doc(student.id), studentData, { merge: true });
          });
          await batch.commit();
        }
      }

      return sendJson(res, 200, { created, skipped });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  try {
    const db = getDb();

    if (requestUrl.searchParams.get("overview") === "1") {
      const overview = await getHomepageOverview(db);
      return sendJson(res, 200, overview);
    }

    const classesSnap = await db
      .collection("classes")
      .where("archived", "==", false)
      .get();

    let totalStudents = 0;
    let latestYear = "";

    classesSnap.docs.forEach((doc) => {
      const data = doc.data();
      totalStudents += Number(data.student_count || 0);
      if (
        data.year &&
        (!latestYear || Number(data.year) > Number(latestYear))
      ) {
        latestYear = data.year;
      }
    });

    return sendJson(res, 200, {
      totalStudents,
      totalClasses: classesSnap.size,
      latestYear,
    });
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
};
