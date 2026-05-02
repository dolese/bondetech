const crypto = require("node:crypto");

const USER_ROLES = ["admin", "teacher", "parent", "student"];
const SELF_EDITABLE_FIELDS = ["displayName", "email", "phone", "linkedIndexNo"];
const ADMIN_EDITABLE_FIELDS = ["displayName", "role", "email", "phone", "linkedIndexNo", "active"];

function normalizeUsername(value) {
  return String(value || "").trim();
}

function normalizeUserId(username) {
  return normalizeUsername(username).toLowerCase();
}

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return USER_ROLES.includes(role) ? role : "teacher";
}

function normalizeOptional(value) {
  const text = String(value || "").trim();
  return text || "";
}

function requireString(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(`${label} is required`);
  }
  return text;
}

function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  return value;
}

function getBootstrapAdminCredentials() {
  const username = normalizeUsername(process.env.BOOTSTRAP_ADMIN_USERNAME);
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || "");
  if (!username || !password) {
    return null;
  }
  return {
    username,
    password,
    displayName: normalizeOptional(process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME) || "System Administrator",
  };
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return { hash, salt, iterations };
}

function verifyPassword(password, userRecord) {
  const expected = userRecord?.password?.hash;
  const salt = userRecord?.password?.salt;
  const iterations = Number(userRecord?.password?.iterations || 120000);
  if (!expected || !salt || !password) return false;
  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function getSessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_PROJECT_ID ||
    "bonde-results-session-secret"
  );
}

function base64urlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function base64urlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signTokenPayload(payload) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function createSessionToken(user, rememberMe = false) {
  const expiresInMs = rememberMe ? 1000 * 60 * 60 * 24 * 14 : 1000 * 60 * 60 * 12;
  const payload = JSON.stringify({
    uid: user.id,
    role: user.role,
    username: user.username,
    linkedIndexNo: user.linkedIndexNo || "",
    exp: Date.now() + expiresInMs,
  });
  const body = base64urlEncode(payload);
  const signature = signTokenPayload(body);
  return `${body}.${signature}`;
}

function verifySessionToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) {
    throw new Error("Invalid session token");
  }
  const expected = signTokenPayload(body);
  if (signature.length !== expected.length) {
    throw new Error("Invalid session token");
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid session token");
  }
  const payload = JSON.parse(base64urlDecode(body));
  if (!payload?.uid || !payload?.exp || Date.now() > Number(payload.exp)) {
    throw new Error("Session expired");
  }
  return payload;
}

function getBearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

function getRequestMeta(req = {}) {
  return {
    ip:
      req?.headers?.["x-forwarded-for"] ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      "",
    userAgent: req?.headers?.["user-agent"] || "",
  };
}

function toPublicUser(record) {
  if (!record) return null;
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName || record.username,
    role: normalizeRole(record.role),
    email: record.email || "",
    phone: record.phone || "",
    linkedIndexNo: record.linkedIndexNo || "",
    active: record.active !== false,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    lastLoginAt: record.lastLoginAt || null,
    createdBy: record.createdBy || "",
    mustChangePassword: record.mustChangePassword === true,
    passwordChangedAt: record.passwordChangedAt || null,
    lastPasswordResetAt: record.lastPasswordResetAt || null,
  };
}

async function getUsersCollection(db) {
  return db.collection("users");
}

async function getUserByUsername(db, username) {
  const userId = normalizeUserId(username);
  if (!userId) return null;
  const snap = await (await getUsersCollection(db)).doc(userId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function getUserById(db, userId) {
  if (!userId) return null;
  const snap = await (await getUsersCollection(db)).doc(String(userId)).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function hasAnyUsers(db) {
  const snap = await (await getUsersCollection(db)).limit(1).get();
  return !snap.empty;
}

async function recordAuthLog(db, payload = {}) {
  const event = {
    username: normalizeUsername(payload.username || ""),
    userId: payload.userId || "",
    role: payload.role || "",
    status: payload.status || "info",
    action: payload.action || "login",
    reason: payload.reason || "",
    ip: String(payload.ip || ""),
    userAgent: String(payload.userAgent || ""),
    createdAt: new Date().toISOString(),
  };
  await db.collection("auth_logs").add(event);
}

async function bootstrapFirstAdmin(db, { username, password, rememberMe = false }, reqMeta = {}) {
  const hasUsers = await hasAnyUsers(db);
  if (hasUsers) return null;

  const configured = getBootstrapAdminCredentials();
  if (!configured) {
    throw new Error(
      "Bootstrap administrator credentials are not configured. Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD."
    );
  }
  const normalizedUsername = requireString(username, "Username");
  const passwordValue = requireString(password, "Password");
  if (
    normalizeUserId(normalizedUsername) !== normalizeUserId(configured.username) ||
    passwordValue !== configured.password
  ) {
    await recordAuthLog(db, {
      username: normalizedUsername,
      status: "failed",
      action: "bootstrap",
      reason: "Invalid bootstrap administrator credentials",
      ...reqMeta,
    });
    throw new Error("Invalid bootstrap administrator credentials");
  }

  const userId = normalizeUserId(normalizedUsername);
  const now = new Date().toISOString();
  const userData = {
    username: normalizedUsername,
    displayName: configured.displayName || normalizedUsername,
    role: "admin",
    email: "",
    phone: "",
    linkedIndexNo: "",
    active: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    createdBy: "bootstrap",
    mustChangePassword: false,
    passwordChangedAt: now,
    lastPasswordResetAt: null,
    password: createPasswordHash(passwordValue),
  };

  await (await getUsersCollection(db)).doc(userId).set(userData);
  await recordAuthLog(db, {
    username: normalizedUsername,
    userId,
    role: "admin",
    status: "success",
    action: "bootstrap",
    reason: "Bootstrap administrator created",
    ...reqMeta,
  });
  const publicUser = toPublicUser({ id: userId, ...userData });
  return {
    user: publicUser,
    token: createSessionToken(publicUser, rememberMe),
    bootstrap: true,
  };
}

async function loginUser(db, { username, password, rememberMe = false }, reqMeta = {}) {
  const bootstrap = await bootstrapFirstAdmin(db, { username, password, rememberMe }, reqMeta);
  if (bootstrap) return bootstrap;

  const normalizedUsername = requireString(username, "Username");
  const passwordValue = requireString(password, "Password");
  const user = await getUserByUsername(db, normalizedUsername);
  if (!user || !verifyPassword(passwordValue, user)) {
    await recordAuthLog(db, {
      username: normalizedUsername,
      status: "failed",
      action: "login",
      reason: "Invalid username or password",
      ...reqMeta,
    });
    throw new Error("Invalid username or password");
  }
  if (!user.active) {
    await recordAuthLog(db, {
      username: normalizedUsername,
      userId: user.id,
      role: user.role,
      status: "failed",
      action: "login",
      reason: "User account is inactive",
      ...reqMeta,
    });
    throw new Error("This user account is inactive");
  }

  const lastLoginAt = new Date().toISOString();
  await (await getUsersCollection(db)).doc(user.id).update({ lastLoginAt, updatedAt: lastLoginAt });
  const publicUser = toPublicUser({ ...user, lastLoginAt, updatedAt: lastLoginAt });
  await recordAuthLog(db, {
    username: normalizedUsername,
    userId: user.id,
    role: publicUser.role,
    status: "success",
    action: "login",
    reason: publicUser.mustChangePassword ? "Password change required" : "Authenticated",
    ...reqMeta,
  });

  return {
    user: publicUser,
    token: createSessionToken(publicUser, rememberMe),
    bootstrap: false,
  };
}

async function resolveSessionUser(db, req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const payload = verifySessionToken(token);
  const user = await getUserById(db, payload.uid);
  if (!user || user.active === false) {
    throw new Error("Session user not found");
  }
  return toPublicUser(user);
}

function canReadClassData(role) {
  return role === "admin" || role === "teacher";
}

function canManageClasses(role) {
  return role === "admin";
}

function canManageStudents(role) {
  return role === "admin" || role === "teacher";
}

function canDeleteStudents(role) {
  return role === "admin";
}

function canViewAudit(role) {
  return role === "admin";
}

function canManageUsers(role) {
  return role === "admin";
}

function assertRole(user, predicate, message) {
  if (!user || !predicate(user.role)) {
    throw new Error(message || "You do not have permission for this action");
  }
}

async function listUsers(db, currentUser) {
  assertRole(currentUser, canManageUsers, "Only administrators can view users");
  const snap = await (await getUsersCollection(db)).orderBy("createdAt", "asc").get();
  return snap.docs.map((doc) => toPublicUser({ id: doc.id, ...doc.data() }));
}

async function createManagedUser(db, adminUser, input) {
  assertRole(adminUser, canManageUsers, "Only administrators can create users");

  const username = requireString(input.username, "Username");
  const password = validatePassword(input.password);
  const role = normalizeRole(input.role || "teacher");
  const userId = normalizeUserId(username);
  const existing = await getUserById(db, userId);
  if (existing) {
    throw new Error("A user with that username already exists");
  }

  const now = new Date().toISOString();
  const userData = {
    username,
    displayName: normalizeOptional(input.displayName) || username,
    role,
    email: normalizeOptional(input.email),
    phone: normalizeOptional(input.phone),
    linkedIndexNo: normalizeOptional(input.linkedIndexNo),
    active: input.active !== false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    createdBy: adminUser.username,
    mustChangePassword: input.mustChangePassword !== false,
    passwordChangedAt: null,
    lastPasswordResetAt: now,
    password: createPasswordHash(password),
  };

  await (await getUsersCollection(db)).doc(userId).set(userData);
  return toPublicUser({ id: userId, ...userData });
}

async function updateManagedUser(db, adminUser, username, input) {
  assertRole(adminUser, canManageUsers, "Only administrators can update users");
  const existing = await getUserByUsername(db, username);
  if (!existing) {
    throw new Error("User not found");
  }

  const updates = {};
  ADMIN_EDITABLE_FIELDS.forEach((field) => {
    if (!(field in input)) return;
    if (field === "role") updates.role = normalizeRole(input.role);
    else if (field === "active") updates.active = input.active !== false;
    else updates[field] = normalizeOptional(input[field]);
  });

  if (input.password) {
    updates.password = createPasswordHash(validatePassword(input.password));
    updates.mustChangePassword = input.mustChangePassword !== false;
    updates.lastPasswordResetAt = new Date().toISOString();
  }

  updates.updatedAt = new Date().toISOString();
  await (await getUsersCollection(db)).doc(existing.id).update(updates);
  return toPublicUser({ ...existing, ...updates });
}

async function updateOwnProfile(db, currentUser, input) {
  if (!currentUser) throw new Error("Authentication required");
  const existing = await getUserById(db, currentUser.id);
  if (!existing) throw new Error("User not found");

  const updates = {};
  SELF_EDITABLE_FIELDS.forEach((field) => {
    if (!(field in input)) return;
    updates[field] = normalizeOptional(input[field]);
  });
  updates.updatedAt = new Date().toISOString();

  await (await getUsersCollection(db)).doc(existing.id).update(updates);
  return toPublicUser({ ...existing, ...updates });
}

async function changeOwnPassword(db, currentUser, currentPassword, newPassword) {
  if (!currentUser) throw new Error("Authentication required");
  const existing = await getUserById(db, currentUser.id);
  if (!existing) throw new Error("User not found");
  if (!verifyPassword(requireString(currentPassword, "Current password"), existing)) {
    throw new Error("Current password is incorrect");
  }

  const password = validatePassword(newPassword);
  const now = new Date().toISOString();
  const updates = {
    password: createPasswordHash(password),
    updatedAt: now,
    mustChangePassword: false,
    passwordChangedAt: now,
  };
  await (await getUsersCollection(db)).doc(existing.id).update(updates);
  return toPublicUser({ ...existing, ...updates });
}

async function listAuthLogs(db, currentUser, limit = 100) {
  assertRole(currentUser, canManageUsers, "Only administrators can view login activity");
  const finalLimit = Math.min(parseInt(limit || "100", 10) || 100, 200);
  const snap = await db
    .collection("auth_logs")
    .orderBy("createdAt", "desc")
    .limit(finalLimit)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  USER_ROLES,
  normalizeRole,
  normalizeUsername,
  createSessionToken,
  resolveSessionUser,
  loginUser,
  listUsers,
  listAuthLogs,
  createManagedUser,
  updateManagedUser,
  updateOwnProfile,
  changeOwnPassword,
  getRequestMeta,
  canReadClassData,
  canManageClasses,
  canManageStudents,
  canDeleteStudents,
  canViewAudit,
  canManageUsers,
  assertRole,
  toPublicUser,
};
