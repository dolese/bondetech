const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");
const { resolveSessionUser, canReadClassData, canManageClasses, canManageStudents } = require("../../lib/auth");
const { ALLOWED_FORMS, createClassRecord, deleteClassRecord, listClasses, updateClassRecord } = require("../../lib/classes");
const {
  assignUnassignedStudentsToClass,
  bulkMoveStudentsToClass,
  listUnassignedStudents,
  unassignStudentsFromStreams,
} = require("../../lib/classStudents");

function buildFormsPayload(classes, unassigned, year) {
  return {
    year,
    forms: ALLOWED_FORMS.map((form) => {
      const streams = classes.filter((cls) => cls.form === form);
      return {
        form,
        active: streams.some((stream) => !stream.archived && stream.streamStatus !== "inactive"),
        streamCount: streams.filter((stream) => !stream.archived).length,
        totalStudents: streams.reduce((sum, stream) => sum + Number(stream.studentCount || 0), 0),
        unassignedCount: unassigned.filter((student) => student.form === form).length,
        streams,
      };
    }),
    unassigned,
  };
}

module.exports = async (req, res) => {
  const db = getDb();
  let user;
  try {
    user = await resolveSessionUser(db, req);
  } catch (err) {
    return sendJson(res, 401, { error: err.message });
  }
  if (!user) return sendJson(res, 401, { error: "Authentication required" });
  const classId = String(req.query?.id || "").trim();

  try {
    if (req.method === "GET") {
      if (!canReadClassData(user.role)) return sendJson(res, 403, { error: "You do not have permission to view forms and streams" });
      const year = String(req.query?.year || new Date().getFullYear()).trim();
      const form = String(req.query?.form || "").trim();
      const [allClasses, unassigned] = await Promise.all([
        listClasses(db, { includeArchived: true }),
        canManageStudents(user.role) ? listUnassignedStudents(db, { year, form }) : [],
      ]);
      const classes = allClasses.filter((cls) => cls.year === year && (!form || cls.form === form));
      return sendJson(res, 200, buildFormsPayload(classes, unassigned, year));
    }

    const body = await readJsonBody(req);
    if (req.method === "POST") {
      if (!canManageClasses(user.role)) return sendJson(res, 403, { error: "Only administrators can create streams" });
      return sendJson(res, 201, await createClassRecord(db, body || {}));
    }
    if (req.method === "PUT") {
      if (!canManageClasses(user.role)) return sendJson(res, 403, { error: "Only administrators can edit streams" });
      return sendJson(res, 200, await updateClassRecord(db, classId, body || {}));
    }
    if (req.method === "DELETE") {
      if (!canManageClasses(user.role)) return sendJson(res, 403, { error: "Only administrators can disable streams" });
      return sendJson(res, 200, await deleteClassRecord(db, classId));
    }
    if (req.method === "PATCH") {
      if (!canManageStudents(user.role)) return sendJson(res, 403, { error: "You do not have permission to assign students to streams" });
      const action = String(body?.action || "").trim();
      if (action === "bulk-assign") return sendJson(res, 200, await bulkMoveStudentsToClass(db, body.assignments, body.targetClassId));
      if (action === "unassign") return sendJson(res, 200, await unassignStudentsFromStreams(db, body.assignments));
      if (action === "assign-unassigned") return sendJson(res, 200, await assignUnassignedStudentsToClass(db, body.unassignedIds, body.targetClassId));
      return sendJson(res, 400, { error: "Unsupported stream assignment action" });
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    const status = /not found/i.test(err.message) ? 404 : /already exists/i.test(err.message) ? 409 : /required|capacity|published|inactive|match|limited|students|must|select|different/i.test(err.message) ? 400 : 500;
    return sendJson(res, status, { error: err.message });
  }
};
