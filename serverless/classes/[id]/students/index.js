const { getDb } = require("../../../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../../../lib/http");
const {
  resolveSessionUser,
  canManageStudents,
  canReadClassData,
  canManageClasses,
  canAccessClassRecord,
} = require("../../../../lib/auth");
const {
  listStudents,
  createStudentRecord,
  reorderStudentsBySexAndRegenerateCnos,
  promoteStudentsToClass,
} = require("../../../../lib/classStudents");
const {
  getClassSnapshot,
  parseClass,
} = require("../../../../lib/classes");

module.exports = async (req, res) => {
  const db = getDb();
  const classId = req.query.id;
  let currentUser;

  try {
    currentUser = await resolveSessionUser(db, req);
  } catch (err) {
    return sendJson(res, 401, { error: err.message });
  }
  if (!currentUser) {
    return sendJson(res, 401, { error: "Authentication required" });
  }

  if (req.method === "GET") {
    if (!canReadClassData(currentUser.role)) {
      return sendJson(res, 403, { error: "You do not have permission to view students" });
    }
    try {
      if (currentUser.role === "teacher") {
        const { classSnap } = await getClassSnapshot(db, classId);
        if (!canAccessClassRecord(currentUser, parseClass(classSnap))) {
          return sendJson(res, 403, { error: "You do not have permission to view this class" });
        }
      }
      const result = await listStudents(db, classId, req.query || {});
      return sendJson(res, 200, result);
    } catch (err) {
      const status = /class not found/i.test(err.message) ? 404 : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  if (req.method === "POST") {
    if (!canManageStudents(currentUser.role)) {
      return sendJson(res, 403, { error: "You do not have permission to add students" });
    }
    try {
      if (currentUser.role === "teacher") {
        const { classSnap } = await getClassSnapshot(db, classId);
        if (!canAccessClassRecord(currentUser, parseClass(classSnap))) {
          return sendJson(res, 403, { error: "You do not have permission to manage this class" });
        }
      }
      const body = await readJsonBody(req);
      const created = await createStudentRecord(db, classId, body);
      return sendJson(res, 201, created);
    } catch (err) {
      const status = /class not found/i.test(err.message)
        ? 404
        : /student name is required/i.test(err.message)
        ? 400
        : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  if (req.method === "PATCH") {
    if (!canManageClasses(currentUser.role)) {
      return sendJson(res, 403, { error: "Only administrators can run rollover and CNO actions" });
    }
    try {
      const body = await readJsonBody(req);
      const action = String(body?.action || "").trim();
      let result;
      if (action === "reorder-cnos") {
        result = await reorderStudentsBySexAndRegenerateCnos(db, classId);
      } else if (action === "promote-rollover") {
        result = await promoteStudentsToClass(db, classId, body?.targetClassId);
      } else {
        return sendJson(res, 400, { error: "Unsupported student action" });
      }
      return sendJson(res, 200, result);
    } catch (err) {
      const status = /class not found/i.test(err.message)
        ? 404
        : /required|different|published/i.test(err.message)
        ? 400
        : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
};
