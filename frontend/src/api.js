// ── API Base ──────────────────────────────────────────────────────────────────
const BASE = "/api";
const AUTH_TOKEN_KEY = "bonde-auth-token";
const AUTH_SESSION_TOKEN_KEY = "bonde-auth-token-session";

export function getStoredAuthToken() {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem(AUTH_TOKEN_KEY) ||
    window.sessionStorage.getItem(AUTH_SESSION_TOKEN_KEY) ||
    ""
  );
}

export function storeAuthToken(token, rememberMe) {
  if (typeof window === "undefined") return;
  if (rememberMe) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.sessionStorage.removeItem(AUTH_SESSION_TOKEN_KEY);
  } else {
    window.sessionStorage.setItem(AUTH_SESSION_TOKEN_KEY, token);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function clearStoredAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_SESSION_TOKEN_KEY);
}

async function request(method, url, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  const token = getStoredAuthToken();
  if (token) {
    opts.headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + url, opts);
  const text = await res.text();
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = text && isJson ? JSON.parse(text) : (text ? { message: text } : null);
  if (!res.ok) throw new Error((data && (data.error || data.message)) || "Server error");
  return data ?? {};
}

async function requestBinary(method, url, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  const token = getStoredAuthToken();
  if (token) {
    opts.headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + url, opts);
  const buffer = await res.arrayBuffer();
  if (!res.ok) {
    let message = "Server error";
    try {
      const text = new TextDecoder().decode(buffer);
      const maybeJson = JSON.parse(text);
      message = maybeJson?.error || maybeJson?.message || text || message;
    } catch {
      // ignore parse failures and keep generic error
    }
    throw new Error(message);
  }
  return {
    buffer,
    contentType: res.headers.get("content-type") || "",
    contentLength: res.headers.get("content-length") || "",
  };
}

const get  = (url)        => request("GET",    url);
const post = (url, body)  => request("POST",   url, body);
const put  = (url, body)  => request("PUT",    url, body);
const del  = (url)        => request("DELETE", url);
const patch = (url, body) => request("PATCH",  url, body);

function buildStudentProfileUrl(target) {
  const ref = target && typeof target === "object" ? target : { indexNo: target };
  const indexNo = String(ref?.indexNo || ref?.linkedIndexNo || "").trim();
  const admissionNo = String(ref?.admissionNo || "").trim().toUpperCase();
  if (!indexNo && !admissionNo) {
    throw new Error("Student profile target is required");
  }
  const pathIdentifier = indexNo || "_";
  const params = new URLSearchParams();
  if (indexNo) params.set("indexNo", indexNo);
  if (admissionNo) params.set("admissionNo", admissionNo);
  const qs = params.toString();
  return `/students/${encodeURIComponent(pathIdentifier)}/profile${qs ? `?${qs}` : ""}`;
}

// ── Classes ───────────────────────────────────────────────────────────────────
export const API = {
  // Classes
  getClasses:     (opts = {})   => get(`/classes${opts.includeArchived ? "?includeArchived=true" : ""}`),
  getClass:       (id)          => get(`/classes/${id}`),
  createClass:    (data)        => post("/classes", data),
  updateClass:    (id, data)    => put(`/classes/${id}`, data),
  deleteClass:    (id)          => del(`/classes/${id}`),
  restoreClass:   (id)          => patch(`/classes/${id}`),

  // Publish
  publishClass:   (id)          => post(`/classes/${id}/publish`),
  unpublishClass: (id)          => del(`/classes/${id}/publish`),

  // Audit log
  getAuditLog:    (id, limit)   => get(`/classes/${id}/audit${limit ? `?limit=${limit}` : ""}`),

  // Students
  getStudents:    (cid, opts = {}) => {
    const params = new URLSearchParams();
    if (opts.search) params.set("search", opts.search);
    if (opts.page)   params.set("page", opts.page);
    if (opts.limit)  params.set("limit", opts.limit);
    if (opts.cursor) params.set("cursor", opts.cursor);
    const qs = params.toString();
    return get(`/classes/${cid}/students${qs ? `?${qs}` : ""}`);
  },
  addStudent:     (cid, data)   => post(`/classes/${cid}/students`, data),
  bulkImport:     (cid, students, examType) => post(`/classes/${cid}/students/bulk`, { students, examType }),
  reorderStudentCnos: (cid)     => patch(`/classes/${cid}/students`, { action: "reorder-cnos" }),
  promoteStudents: (cid, targetClassId) => patch(`/classes/${cid}/students`, { action: "promote-rollover", targetClassId }),
  moveStudentToClass: (cid, studentId, targetClassId) => patch(`/classes/${cid}/students`, { action: "move-stream", studentId, targetClassId }),
  updateStudent:  (cid, sid, data) => put(`/classes/${cid}/students/${sid}`, data),
  deleteStudent:  (cid, sid)    => del(`/classes/${cid}/students/${sid}`),

  // Student search & profile
  searchStudents: (q, opts = {}) => {
    const params = new URLSearchParams({ q });
    if (opts.form)  params.set("form", opts.form);
    if (opts.year)  params.set("year", opts.year);
    if (opts.limit) params.set("limit", opts.limit);
    return get(`/students/search?${params.toString()}`);
  },
  getStudentProfile: (target)   => get(buildStudentProfileUrl(target)),
  aiChat:          (data)       => post("/ai/chat", data),

  // Backup & Restore
  backup:          ()           => get("/backup"),
  restore:         (data)       => post("/restore", data),

  // Utilities
  fetchCsvFromUrl: (url)        => post("/proxy-csv", { url }),
  fetchFileFromUrl: (url)       => requestBinary("POST", "/proxy-csv", { url }),
  getSmsGatewayStatus: (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", opts.limit);
    if (opts.indexNo) params.set("indexNo", opts.indexNo);
    if (opts.phone) params.set("phone", opts.phone);
    const qs = params.toString();
    return get(`/sms${qs ? `?${qs}` : ""}`);
  },
  getSmsHistory: (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", opts.limit);
    if (opts.indexNo) params.set("indexNo", opts.indexNo);
    if (opts.phone) params.set("phone", opts.phone);
    const qs = params.toString();
    return get(`/sms${qs ? `?${qs}` : ""}`);
  },
  sendSms:         (data)       => post("/sms", data),

  // Health
  health:          ()           => get("/health"),

  // Stats (public)
  getStats:        ()           => get("/stats"),
  getHomepageOverview: ()       => get("/stats?overview=1"),
  getHomepageContent: ()        => get("/stats?homepageContent=1"),
  saveHomepageContent: (data)   => put("/stats?homepageContent=1", data),
  getSchoolSettings: ()         => get("/stats?schoolSettings=1"),
  saveSchoolSettings: (data)    => put("/stats?schoolSettings=1", data),

  // Auth
  login:           (data)       => post("/auth/login", data),
  getSession:      ()           => get("/auth/me"),
  updateMyProfile: (data)       => patch("/auth/me", data),
  changeMyPassword:(data)       => post("/auth/change-password", data),
  listUsers:       ()           => get("/auth/users"),
  createUser:      (data)       => post("/auth/users", data),
  updateUser:      (username, data) => put(`/auth/users/${encodeURIComponent(username)}`, data),
  getAuthLogs:     (limit)      => get(`/auth/logs${limit ? `?limit=${limit}` : ""}`),
};
