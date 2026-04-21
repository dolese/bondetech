const { getDb } = require("../_lib/firebaseAdmin");
const { sendJson } = require("../_lib/http");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const db = getDb();
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
