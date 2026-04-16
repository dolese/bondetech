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

// ── Classes ───────────────────────────────────────────────────────────────────
export const API = {
  // Classes
  getClasses:     ()          => get("/classes"),
  getClass:       (id)        => get(`/classes/${id}`),
  createClass:    (data)      => post("/classes", data),
  updateClass:    (id, data)  => put(`/classes/${id}`, data),
  deleteClass:    (id)        => del(`/classes/${id}`),

  // Students
  addStudent:     (cid, data) => post(`/classes/${cid}/students`, data),
  bulkImport:     (cid, students, examType) => post(`/classes/${cid}/students/bulk`, { students, examType }),
  updateStudent:  (cid, sid, data) => put(`/classes/${cid}/students/${sid}`, data),
  deleteStudent:  (cid, sid)  => del(`/classes/${cid}/students/${sid}`),

  // Utilities
  fetchCsvFromUrl: (url) => post("/proxy-csv", { url }),

  // Health
  health:         ()          => get("/health"),
};
