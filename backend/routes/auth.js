const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const {
  resolveSessionUser,
  loginUser,
  listUsers,
  listAuthLogs,
  createManagedUser,
  updateManagedUser,
  updateOwnProfile,
  changeOwnPassword,
  getRequestMeta,
} = require("../../lib/auth");

router.post("/login", async (req, res) => {
  try {
    const result = await loginUser(getDb(), req.body || {}, getRequestMeta(req));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.use(async (req, res, next) => {
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
});

router.get("/me", async (req, res) => {
  res.json({ user: req.authUser });
});

router.patch("/me", async (req, res) => {
  try {
    const user = await updateOwnProfile(getDb(), req.authUser, req.body || {});
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/change-password", async (req, res) => {
  try {
    const user = await changeOwnPassword(
      getDb(),
      req.authUser,
      req.body?.currentPassword,
      req.body?.newPassword
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await listUsers(getDb(), req.authUser);
    res.json({ users });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

router.post("/users", async (req, res) => {
  try {
    const user = await createManagedUser(getDb(), req.authUser, req.body || {});
    res.status(201).json({ user });
  } catch (err) {
    res.status(/administrator/i.test(err.message) ? 403 : 400).json({ error: err.message });
  }
});

router.put("/users/:username", async (req, res) => {
  try {
    const user = await updateManagedUser(getDb(), req.authUser, req.params.username, req.body || {});
    res.json({ user });
  } catch (err) {
    const status = /not found/i.test(err.message) ? 404 : /administrator/i.test(err.message) ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.get("/logs", async (req, res) => {
  try {
    const logs = await listAuthLogs(getDb(), req.authUser, req.query.limit);
    res.json({ logs });
  } catch (err) {
    res.status(/administrator/i.test(err.message) ? 403 : 400).json({ error: err.message });
  }
});

module.exports = router;
