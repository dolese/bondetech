// ── API Base ──────────────────────────────────────────────────────────────────
const BASE = "/api";

async function request(method, url, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + url, opts);
  const text = await res.text();
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = text && isJson ? JSON.parse(text) : (text ? { message: text } : null);
  if (!res.ok) throw new Error((data && (data.error || data.message)) || "Server error");
  return data ?? {};
}

const get  = (url)        => request("GET",    url);
const post = (url, body)  => request("POST",   url, body);
const put  = (url, body)  => request("PUT",    url, body);
const del  = (url)        => request("DELETE", url);
const patch = (url, body) => request("PATCH",  url, body);

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
  getStudentProfile: (indexNo)  => get(`/students/${encodeURIComponent(indexNo)}/profile`),

  // Backup & Restore
  backup:          ()           => get("/backup"),
  restore:         (data)       => post("/restore", data),

  // Utilities
  fetchCsvFromUrl: (url)        => post("/proxy-csv", { url }),

  // Health
  health:          ()           => get("/health"),

  // Stats (public)
  getStats:        ()           => get("/stats"),
};
