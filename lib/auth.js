const crypto = require("node:crypto");
const { isValidAdmissionNo, sanitizeAdmissionNo, sanitizeText } = require("./students");

const USER_ROLES = ["admin", "academic", "teacher", "parent", "student"];
const SELF_EDITABLE_FIELDS = ["displayName", "email", "phone", "linkedIndexNo", "linkedStudents"];
const ADMIN_EDITABLE_FIELDS = ["displayName", "role", "email", "phone", "linkedIndexNo", "linkedStudents", "active", "teacherRoles", "teacherAssignments"];

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

function normalizeLinkedStudentEntry(value) {
  if (typeof value === "string") {
    const raw = normalizeOptional(value).toUpperCase();
    if (!raw) return null;
    const admissionNo = sanitizeAdmissionNo(raw);
    if (admissionNo && isValidAdmissionNo(admissionNo)) {
      return { admissionNo, indexNo: "" };
    }
    return { admissionNo: "", indexNo: raw };
  }

  if (!value || typeof value !== "object") return null;

  const admissionNo = sanitizeAdmissionNo(
    value.admissionNo ?? value.admission_no ?? value.admission ?? ""
  );
  const indexNo = sanitizeText(value.indexNo ?? value.index_no ?? value.index ?? "").toUpperCase();

  if (admissionNo && !isValidAdmissionNo(admissionNo)) {
    throw new Error(
      "Linked student admission numbers must use the format SCHOOLCODE-YEAR-SEQUENCE, for example BSS-2026-0001"
    );
  }
  if (!admissionNo && !indexNo) return null;

  return {
    admissionNo: admissionNo || "",
    indexNo,
  };
}

function normalizeLinkedStudents(value, legacyLinkedIndexNo = "") {
  const candidates = [];
  if (Array.isArray(value)) {
    candidates.push(...value);
  } else if (value && typeof value === "object") {
    candidates.push(value);
  } else if (typeof value === "string") {
    candidates.push(
      ...String(value)
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    );
  }

  if (!candidates.length && legacyLinkedIndexNo) {
    candidates.push(legacyLinkedIndexNo);
  }

  const deduped = [];
  const seen = new Set();
  candidates.forEach((entry) => {
    const normalized = normalizeLinkedStudentEntry(entry);
    if (!normalized) return;
    const key = `${normalized.admissionNo}::${normalized.indexNo}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(normalized);
  });
  return deduped;
}

function derivePrimaryLinkedIndexNo(linkedStudents = [], fallback = "") {
  return (
    linkedStudents.find((entry) => entry.indexNo)?.indexNo ||
    normalizeOptional(fallback).toUpperCase() ||
    ""
  );
}

function normalizeTeacherRoles(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    classTeacher: source.classTeacher === true,
    subjectTeacher: source.subjectTeacher === true,
  };
}

function normalizeTeacherAssignments(value) {
  const source = value && typeof value === "object" ? value : {};
  const classTeacherClassId = normalizeOptional(source.classTeacherClassId);
  const subjectAssignments = Array.isArray(source.subjectAssignments)
    ? source.subjectAssignments
        .map((entry) => ({
          classId: normalizeOptional(entry?.classId),
          subject: normalizeOptional(entry?.subject).toUpperCase(),
        }))
        .filter((entry) => entry.classId && entry.subject)
        .filter(
          (entry, index, collection) =>
            collection.findIndex(
              (candidate) =>
                candidate.classId === entry.classId && candidate.subject === entry.subject
            ) === index
        )
    : [];

  return {
    classTeacherClassId,
    subjectAssignments,
  };
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
  const linkedStudents = normalizeLinkedStudents(record.linkedStudents, record.linkedIndexNo);
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName || record.username,
    role: normalizeRole(record.role),
    email: record.email || "",
    phone: record.phone || "",
    linkedIndexNo: derivePrimaryLinkedIndexNo(linkedStudents, record.linkedIndexNo),
    linkedStudents,
    linkedIndexNos: linkedStudents.map((entry) => entry.indexNo).filter(Boolean),
    teacherRoles: normalizeTeacherRoles(record.teacherRoles),
    teacherAssignments: normalizeTeacherAssignments(record.teacherAssignments),
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
    linkedStudents: [],
    teacherRoles: normalizeTeacherRoles({}),
    teacherAssignments: normalizeTeacherAssignments({}),
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
  return role === "admin" || role === "academic" || role === "teacher";
}

function canManageClasses(role) {
  return role === "admin";
}

function canManageStudents(role) {
  return role === "admin" || role === "academic" || role === "teacher";
}

function canDeleteStudents(role) {
  return role === "admin" || role === "academic";
}

function canViewAudit(role) {
  return role === "admin";
}

function canManageUsers(role) {
  return role === "admin";
}

function userTeacherKeys(user) {
  return [user?.username, user?.displayName]
    .map((value) => normalizeOptional(value).toLowerCase())
    .filter(Boolean);
}

function getTeacherAssignedClassIds(user) {
  const assignments = normalizeTeacherAssignments(user?.teacherAssignments);
  return new Set(
    [
      assignments.classTeacherClassId,
      ...assignments.subjectAssignments.map((entry) => entry.classId),
    ].filter(Boolean)
  );
}

function teacherMatchesTimetable(user, timetable) {
  const teacherKeys = new Set(userTeacherKeys(user));
  if (!teacherKeys.size) return false;
  return Object.values(timetable?.entries || {}).some((entry) =>
    teacherKeys.has(
      normalizeOptional(entry?.teacherUsername || entry?.teacherName).toLowerCase()
    )
  );
}

function canAccessClassRecord(user, classRecord) {
  if (!user || !classRecord) return false;
  if (user.role === "admin" || user.role === "academic") return true;
  if (user.role !== "teacher") return false;

  const classId = String(classRecord.id || "").trim();
  const assignedClassIds = getTeacherAssignedClassIds(user);
  if (classId && assignedClassIds.has(classId)) {
    return true;
  }

  return teacherMatchesTimetable(user, classRecord.timetable);
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
  const linkedStudents = normalizeLinkedStudents(input.linkedStudents, input.linkedIndexNo);
  const userData = {
    username,
    displayName: normalizeOptional(input.displayName) || username,
    role,
    email: normalizeOptional(input.email),
    phone: normalizeOptional(input.phone),
    linkedIndexNo: derivePrimaryLinkedIndexNo(linkedStudents, input.linkedIndexNo),
    linkedStudents,
    teacherRoles: normalizeTeacherRoles(input.teacherRoles),
    teacherAssignments: normalizeTeacherAssignments(input.teacherAssignments),
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
    else if (field === "teacherRoles") updates.teacherRoles = normalizeTeacherRoles(input.teacherRoles);
    else if (field === "teacherAssignments") updates.teacherAssignments = normalizeTeacherAssignments(input.teacherAssignments);
    else if (field === "linkedStudents" || field === "linkedIndexNo") {
      const linkedStudents = normalizeLinkedStudents(
        field === "linkedStudents" ? input.linkedStudents : undefined,
        field === "linkedIndexNo" ? input.linkedIndexNo : ""
      );
      updates.linkedStudents = linkedStudents;
      updates.linkedIndexNo = derivePrimaryLinkedIndexNo(
        linkedStudents,
        field === "linkedIndexNo" ? input.linkedIndexNo : ""
      );
    }
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
    if (field === "linkedStudents" || field === "linkedIndexNo") {
      const linkedStudents = normalizeLinkedStudents(
        field === "linkedStudents" ? input.linkedStudents : undefined,
        field === "linkedIndexNo" ? input.linkedIndexNo : ""
      );
      updates.linkedStudents = linkedStudents;
      updates.linkedIndexNo = derivePrimaryLinkedIndexNo(
        linkedStudents,
        field === "linkedIndexNo" ? input.linkedIndexNo : ""
      );
    } else {
      updates[field] = normalizeOptional(input[field]);
    }
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
  canAccessClassRecord,
  getTeacherAssignedClassIds,
  teacherMatchesTimetable,
  normalizeTeacherAssignments,
  assertRole,
  toPublicUser,
};
