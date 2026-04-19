const { getDb } = require("../_lib/firebaseAdmin");
const { sendJson } = require("../_lib/http");

/**
 * GET /api/students/search?q=<name_or_index>&form=<form>&year=<year>&limit=<n>
 *
 * Searches across all classes for students matching a name prefix or index_no
 * prefix.  Optional `form` and `year` filters narrow the search to specific
 * classes.
 *
 * Returns up to `limit` (default 50, max 200) results as:
 *   [{ studentId, classId, className, form, year, indexNo, name, sex }]
 */
module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const q = (req.query.q || "").trim();
  if (!q) {
    return sendJson(res, 400, { error: "q (search query) is required" });
  }

  const formFilter = (req.query.form || "").trim();
  const yearFilter = (req.query.year || "").trim();
  const limit = Math.min(parseInt(req.query.limit || "50", 10) || 50, 200);

  const db = getDb();

  // Step 1: load class list (excluding archived)
  let classQuery = db.collection("classes").where("archived", "!=", true);
  if (formFilter) classQuery = classQuery.where("form", "==", formFilter);
  if (yearFilter) classQuery = classQuery.where("year", "==", yearFilter);

  let classesSnap;
  try {
    classesSnap = await classQuery.get();
  } catch {
    // Fallback: Firestore != operator requires an index; fall back to full scan
    let fallback = db.collection("classes");
    if (formFilter) fallback = fallback.where("form", "==", formFilter);
    if (yearFilter) fallback = fallback.where("year", "==", yearFilter);
    classesSnap = await fallback.get();
  }

  const classes = classesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => !c.archived);

  const qLower = q.toLowerCase();
  const results = [];

  for (const cls of classes) {
    if (results.length >= limit) break;

    // Appending '\uf8ff' (a high Unicode private-use character) as the upper
    // bound creates an inclusive prefix range in Firestore that works correctly
    // for any query length, including single-character queries.
    const nameEnd = q + "\uf8ff";
    let studentSnap;
    try {
      // Try prefix-range on name field first
      studentSnap = await db
        .collection("classes")
        .doc(cls.id)
        .collection("students")
        .where("name", ">=", q)
        .where("name", "<", nameEnd)
        .limit(limit)
        .get();
    } catch {
      studentSnap = { docs: [] };
    }

    // Also search by index_no prefix
    const idxEnd = q + "\uf8ff";
    let idxSnap;
    try {
      idxSnap = await db
        .collection("classes")
        .doc(cls.id)
        .collection("students")
        .where("index_no", ">=", q)
        .where("index_no", "<", idxEnd)
        .limit(limit)
        .get();
    } catch {
      idxSnap = { docs: [] };
    }

    const seen = new Set();
    const addResult = (doc) => {
      if (seen.has(doc.id)) return;
      seen.add(doc.id);
      const d = doc.data();
      // Additional client-side filter for case-insensitive partial match
      const nameMatch = (d.name || "").toLowerCase().includes(qLower);
      const idxMatch = (d.index_no || "").toLowerCase().includes(qLower);
      if (!nameMatch && !idxMatch) return;
      results.push({
        studentId: doc.id,
        classId: cls.id,
        className: cls.name || "",
        form: cls.form || "",
        year: cls.year || "",
        indexNo: d.index_no || "",
        name: d.name || "",
        sex: d.sex || "M",
      });
    };

    studentSnap.docs.forEach(addResult);
    idxSnap.docs.forEach(addResult);
  }

  return sendJson(res, 200, results.slice(0, limit));
};
