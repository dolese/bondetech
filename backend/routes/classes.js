const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const {
  validateStudentMiddleware,
  validateClassMiddleware,
} = require("../validation");
const {
  resolveSessionUser,
  canReadClassData,
  canManageClasses,
  canManageStudents,
  canDeleteStudents,
  canViewAudit,
} = require("../../lib/auth");
const {
  listClasses,
  deleteClassRecord,
  restoreClassRecord,
  createClassRecord,
  updateClassRecord,
  getClassWithStudents,
  setClassPublishedState,
  getClassAuditLogs,
} = require("../../lib/classes");
const {
  listStudents,
  createStudentRecord,
  bulkImportStudents,
  updateStudentRecord,
  deleteStudentRecord,
} = require("../../lib/classStudents");

const requireAuth = async (req, res, next) => {
  try {
    const user = await resolveSessionUser(getDb(), req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    req.authUser = user;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

const requireRole = (predicate, message) => (req, res, next) => {
  if (!req.authUser || !predicate(req.authUser.role)) {
    return res.status(403).json({ error: message });
  }
  next();
};

router.use(requireAuth);

router.get("/", requireRole(canReadClassData, "You do not have permission to view classes"), async (req, res) => {
  try {
    const classes = await listClasses(getDb(), {
      includeArchived: req.query.includeArchived === "true",
    });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireRole(canReadClassData, "You do not have permission to view classes"), async (req, res) => {
  try {
    const cls = await getClassWithStudents(getDb(), req.params.id);
    res.json(cls);
  } catch (err) {
    res.status(/class not found/i.test(err.message) ? 404 : 500).json({ error: err.message });
  }
});

router.post(
  "/",
  requireRole(canManageClasses, "Only administrators can create classes"),
  validateClassMiddleware,
  async (req, res) => {
  try {
    const created = await createClassRecord(getDb(), req.body || {});
    res.status(201).json(created);
  } catch (err) {
    const status = /already exists/i.test(err.message)
      ? 409
      : /form must be/i.test(err.message)
      ? 400
      : 500;
    res.status(status).json({ error: err.message });
  }
});

router.put("/:id", requireRole(canManageClasses, "Only administrators can update classes"), async (req, res) => {
  try {
    const updated = await updateClassRecord(getDb(), req.params.id, req.body || {});
    res.json(updated);
  } catch (err) {
    const status = /class not found/i.test(err.message)
      ? 404
      : /already exists/i.test(err.message)
      ? 409
      : /form must be/i.test(err.message)
      ? 400
      : 500;
    res.status(status).json({ error: err.message });
  }
});

router.delete("/:id", requireRole(canManageClasses, "Only administrators can delete classes"), async (req, res) => {
  try {
    const result = await deleteClassRecord(getDb(), req.params.id, {
      permanent: req.query.permanent === "true",
    });
    res.json(result);
  } catch (err) {
    res.status(/class not found/i.test(err.message) ? 404 : 500).json({ error: err.message });
  }
});

router.patch("/:id", requireRole(canManageClasses, "Only administrators can restore classes"), async (req, res) => {
  try {
    const restored = await restoreClassRecord(getDb(), req.params.id);
    res.json(restored);
  } catch (err) {
    res.status(/class not found/i.test(err.message) ? 404 : 500).json({ error: err.message });
  }
});

router.get(
  "/:id/students",
  requireRole(canReadClassData, "You do not have permission to view students"),
  async (req, res) => {
  try {
    const result = await listStudents(getDb(), req.params.id, req.query || {});
    res.json(result);
  } catch (err) {
    res.status(/class not found/i.test(err.message) ? 404 : 500).json({ error: err.message });
  }
});

router.post(
  "/:id/students",
  requireRole(canManageStudents, "You do not have permission to add students"),
  validateStudentMiddleware,
  async (req, res) => {
  try {
    const created = await createStudentRecord(getDb(), req.params.id, req.body || {});
    res.status(201).json(created);
  } catch (err) {
    const status = /class not found/i.test(err.message)
      ? 404
      : /student name is required/i.test(err.message)
      ? 400
      : 500;
    res.status(status).json({ error: err.message });
  }
});

router.post("/:id/students/bulk", requireRole(canManageStudents, "You do not have permission to import students"), async (req, res) => {
  try {
    const result = await bulkImportStudents(
      getDb(),
      req.params.id,
      req.body?.students,
      req.body?.examType
    );
    res.status(201).json(result);
  } catch (err) {
    const status = /class not found/i.test(err.message)
      ? 404
      : /non-empty array/i.test(err.message)
      ? 400
      : 500;
    res.status(status).json({ error: err.message });
  }
});

router.put(
  "/:id/students/:sid",
  requireRole(canManageStudents, "You do not have permission to update students"),
  validateStudentMiddleware,
  async (req, res) => {
  try {
    const updated = await updateStudentRecord(getDb(), req.params.id, req.params.sid, req.body || {});
    res.json(updated);
  } catch (err) {
    res.status(/class not found|student not found/i.test(err.message) ? 404 : 500).json({ error: err.message });
  }
});

router.delete("/:id/students/:sid", requireRole(canDeleteStudents, "Only administrators can delete students"), async (req, res) => {
  try {
    const result = await deleteStudentRecord(getDb(), req.params.id, req.params.sid);
    res.json(result);
  } catch (err) {
    res.status(/class not found|student not found/i.test(err.message) ? 404 : 500).json({ error: err.message });
  }
});

router.post("/:id/publish", requireRole(canManageClasses, "Only administrators can publish results"), async (req, res) => {
  try {
    const result = await setClassPublishedState(getDb(), req.params.id, true);
    res.json(result);
  } catch (err) {
    res.status(/class not found/i.test(err.message) ? 404 : 500).json({ error: err.message });
  }
});

router.delete("/:id/publish", requireRole(canManageClasses, "Only administrators can publish results"), async (req, res) => {
  try {
    const result = await setClassPublishedState(getDb(), req.params.id, false);
    res.json(result);
  } catch (err) {
    res.status(/class not found/i.test(err.message) ? 404 : 500).json({ error: err.message });
  }
});

router.get("/:id/audit", requireRole(canViewAudit, "Only administrators can view the audit log"), async (req, res) => {
  try {
    const logs = await getClassAuditLogs(getDb(), req.params.id, req.query.limit);
    res.json(logs);
  } catch (err) {
    res.status(/class not found/i.test(err.message) ? 404 : 500).json({ error: err.message });
  }
});

module.exports = router;