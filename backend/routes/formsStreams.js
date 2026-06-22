const express = require("express");
const { getDb } = require("../db");
const {
  resolveSessionUser,
  canReadClassData,
  canManageClasses,
  canManageStudents,
} = require("../../lib/auth");
const {
  ALLOWED_FORMS,
  createClassRecord,
  deleteClassRecord,
  listClasses,
  updateClassRecord,
} = require("../../lib/classes");
const {
  assignUnassignedStudentsToClass,
  bulkMoveStudentsToClass,
  listUnassignedStudents,
  unassignStudentsFromStreams,
} = require("../../lib/classStudents");

const router = express.Router();

router.use(async (req, res, next) => {
  try {
    const user = await resolveSessionUser(getDb(), req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    req.authUser = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

function buildFormsPayload(classes, unassigned, year) {
  return {
    year,
    forms: ALLOWED_FORMS.map((form) => {
      const streams = classes.filter((cls) => cls.form === form);
      const currentStreams = streams.filter((stream) => !stream.archived);
      const activeStreams = currentStreams.filter((stream) => stream.streamStatus !== "inactive");
      const archivedStreams = streams.filter((stream) => stream.archived);
      const unassignedCount = unassigned.filter((student) => student.form === form).length;
      return {
        form,
        active: activeStreams.length > 0,
        streamCount: currentStreams.length,
        totalStudents: activeStreams.reduce((sum, stream) => sum + Number(stream.studentCount || 0), 0),
        archivedCount: archivedStreams.length,
        archivedStudentCount: archivedStreams.reduce((sum, stream) => sum + Number(stream.studentCount || 0), 0),
        invalidStreamCount: currentStreams.filter((stream) => !/^[A-Z]$/.test(String(stream.stream || ""))).length,
        unassignedCount,
        streams,
      };
    }),
    unassigned,
  };
}

router.get("/", async (req, res) => {
  if (!canReadClassData(req.authUser.role)) {
    return res.status(403).json({ error: "You do not have permission to view forms and streams" });
  }
  try {
    const year = String(req.query.year || new Date().getFullYear()).trim();
    const form = String(req.query.form || "").trim();
    const [allClasses, unassigned] = await Promise.all([
      listClasses(getDb(), { includeArchived: true }),
      canManageStudents(req.authUser.role) ? listUnassignedStudents(getDb(), { year, form }) : [],
    ]);
    const classes = allClasses.filter((cls) => cls.year === year && (!form || cls.form === form));
    return res.json(buildFormsPayload(classes, unassigned, year));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  if (!canManageClasses(req.authUser.role)) {
    return res.status(403).json({ error: "Only administrators can create streams" });
  }
  try {
    const created = await createClassRecord(getDb(), req.body || {});
    return res.status(201).json(created);
  } catch (err) {
    const status = /already exists/i.test(err.message) ? 409 : /must|capacity|status/i.test(err.message) ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  if (!canManageClasses(req.authUser.role)) {
    return res.status(403).json({ error: "Only administrators can edit streams" });
  }
  try {
    const updated = await updateClassRecord(getDb(), req.params.id, req.body || {});
    return res.json(updated);
  } catch (err) {
    const status = /not found/i.test(err.message) ? 404 : /already exists/i.test(err.message) ? 409 : /must|capacity|students/i.test(err.message) ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  if (!canManageClasses(req.authUser.role)) {
    return res.status(403).json({ error: "Only administrators can delete streams" });
  }
  try {
    const result = await deleteClassRecord(getDb(), req.params.id, { permanent: true });
    return res.json(result);
  } catch (err) {
    const status = /not found/i.test(err.message) ? 404 : /move all students/i.test(err.message) ? 409 : 500;
    return res.status(status).json({ error: err.message });
  }
});

router.patch("/", async (req, res) => {
  if (!canManageStudents(req.authUser.role)) {
    return res.status(403).json({ error: "You do not have permission to assign students to streams" });
  }
  try {
    const action = String(req.body?.action || "").trim();
    if (action === "bulk-assign") {
      return res.json(await bulkMoveStudentsToClass(getDb(), req.body.assignments, req.body.targetClassId));
    }
    if (action === "unassign") {
      return res.json(await unassignStudentsFromStreams(getDb(), req.body.assignments));
    }
    if (action === "assign-unassigned") {
      return res.json(await assignUnassignedStudentsToClass(getDb(), req.body.unassignedIds, req.body.targetClassId));
    }
    return res.status(400).json({ error: "Unsupported stream assignment action" });
  } catch (err) {
    const status = /not found/i.test(err.message) ? 404 : /required|capacity|published|inactive|match|already|limited|select|different/i.test(err.message) ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
});

module.exports = router;
