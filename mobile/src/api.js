import { API_BASE_URL } from "./config";

function buildHeaders(token = "") {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, { method = "GET", token = "", body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  const data = text && isJson ? JSON.parse(text) : text ? { message: text } : {};

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Server error");
  }

  return data;
}

function buildStudentProfilePath(target) {
  const ref = target && typeof target === "object" ? target : { indexNo: target };
  const indexNo = String(ref?.indexNo || ref?.linkedIndexNo || "").trim();
  const admissionNo = String(ref?.admissionNo || "").trim().toUpperCase();
  const identifier = indexNo || admissionNo;
  if (!identifier) {
    throw new Error("Student profile target is required");
  }
  const params = new URLSearchParams();
  if (admissionNo) params.set("admissionNo", admissionNo);
  const qs = params.toString();
  return `/students/${encodeURIComponent(identifier)}/profile${qs ? `?${qs}` : ""}`;
}

export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function getSession(token) {
  return request("/auth/me", { token });
}

export function getClasses(token) {
  return request("/classes", { token });
}

export function getClassById(classId, token) {
  return request(`/classes/${encodeURIComponent(classId)}`, { token });
}

export function getStudentProfile(target) {
  return request(buildStudentProfilePath(target));
}

export function getHomepageOverview() {
  return request("/stats?overview=1");
}

export function getSmsGatewayStatus(token, opts = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", opts.limit);
  if (opts.indexNo) params.set("indexNo", opts.indexNo);
  if (opts.phone) params.set("phone", opts.phone);
  const qs = params.toString();
  return request(`/sms${qs ? `?${qs}` : ""}`, { token });
}

export function getSmsHistory(token, opts = {}) {
  return getSmsGatewayStatus(token, opts);
}
