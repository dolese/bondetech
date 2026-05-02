const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");
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

module.exports = async (req, res) => {
  const db = getDb();
  const action = String(req.query.action || "").trim();

  try {
    if (action === "login" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = await loginUser(db, body, getRequestMeta(req));
      return sendJson(res, 200, result);
    }

    const currentUser = await resolveSessionUser(db, req);
    if (!currentUser) {
      return sendJson(res, 401, { error: "Authentication required" });
    }

    if (action === "me" && req.method === "GET") {
      return sendJson(res, 200, { user: currentUser });
    }

    if (action === "me" && req.method === "PATCH") {
      const body = await readJsonBody(req);
      const user = await updateOwnProfile(db, currentUser, body);
      return sendJson(res, 200, { user });
    }

    if (action === "change-password" && req.method === "POST") {
      const body = await readJsonBody(req);
      const user = await changeOwnPassword(db, currentUser, body.currentPassword, body.newPassword);
      return sendJson(res, 200, { success: true, user });
    }

    if (action === "users" && req.method === "GET") {
      const users = await listUsers(db, currentUser);
      return sendJson(res, 200, { users });
    }

    if (action === "users" && req.method === "POST") {
      const body = await readJsonBody(req);
      const user = await createManagedUser(db, currentUser, body);
      return sendJson(res, 201, { user });
    }

    if (action === "user" && req.method === "PUT") {
      const username = String(req.query.username || "").trim();
      const body = await readJsonBody(req);
      const user = await updateManagedUser(db, currentUser, username, body);
      return sendJson(res, 200, { user });
    }

    if (action === "logs" && req.method === "GET") {
      const logs = await listAuthLogs(db, currentUser, req.query.limit);
      return sendJson(res, 200, { logs });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    const status = /authentication required|invalid session|session expired/i.test(err.message)
      ? 401
      : /permission|administrator/i.test(err.message)
      ? 403
      : /not found/i.test(err.message)
      ? 404
      : /required|invalid|password/i.test(err.message)
      ? 400
      : 500;
    return sendJson(res, status, { error: err.message });
  }
};
