const { getDb } = require("../../lib/firebaseAdmin");
const { sendJson } = require("../../lib/http");
const { getHomepageOverview } = require("../../lib/homepageOverview");

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
