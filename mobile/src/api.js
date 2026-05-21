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

export function getStudentProfile(indexNo) {
  return request(`/students/${encodeURIComponent(indexNo)}/profile`);
}

export function getHomepageOverview() {
  return request("/stats?overview=1");
}
