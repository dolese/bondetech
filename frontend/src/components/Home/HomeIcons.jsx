import React from "react";

const ICON_PATHS = {
  results: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  performance: (
    <>
      <path d="M4 18V6" />
      <path d="M9 18V10" />
      <path d="M14 18V8" />
      <path d="M19 18V4" />
    </>
  ),
  timetable: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  announcements: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  reports: (
    <>
      <path d="M7 4h7l4 4v12H7z" />
      <path d="M14 4v4h4M10 13h5M10 17h5" />
    </>
  ),
  login: (
    <>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 4h5v16h-5" />
    </>
  ),
  students: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M18 8h3M19.5 6.5v3" />
    </>
  ),
  classes: (
    <>
      <path d="M4 7h16" />
      <path d="M6 7V5h12v2" />
      <path d="M6 10h12v8H6z" />
      <path d="M10 13h4" />
    </>
  ),
  exam: (
    <>
      <path d="M7 5h10l2 3-7 11-7-11z" />
      <path d="M9 11l2 2 4-4" />
    </>
  ),
  published: (
    <>
      <path d="M5 12l4 4L19 6" />
      <path d="M4 12a8 8 0 1 1 2.3 5.7" />
    </>
  ),
  forms: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  monthly: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
      <path d="M9 14h2M13 14h2" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="5" />
      <path d="M14 14l6 6" />
    </>
  ),
  notice: (
    <>
      <path d="M6 18h12" />
      <path d="M8 18V8l8-3v13" />
    </>
  ),
  secure: (
    <>
      <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
      <path d="M9.5 11.5l2 2 3.5-4" />
    </>
  ),
  mobile: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 17h2" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 19h14" />
    </>
  ),
  support: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2.2-2.5 4" />
      <circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none" />
    </>
  ),
};

function inferIcon(name, label = "") {
  if (ICON_PATHS[name]) return name;
  const value = String(label).toLowerCase();
  if (value.includes("student")) return "students";
  if (value.includes("class")) return "classes";
  if (value.includes("exam")) return "exam";
  if (value.includes("publish")) return "published";
  if (value.includes("form")) return "forms";
  if (value.includes("month")) return "monthly";
  if (value.includes("announce") || value.includes("notice")) return "announcements";
  if (value.includes("result")) return "results";
  if (value.includes("search")) return "search";
  if (value.includes("mobile")) return "mobile";
  if (value.includes("download")) return "download";
  if (value.includes("secure")) return "secure";
  if (value.includes("performance")) return "performance";
  return "results";
}

export function HomeIcon({ name, label, size = 18, stroke = 1.9, color = "currentColor" }) {
  const iconName = inferIcon(name, label);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[iconName]}
    </svg>
  );
}
