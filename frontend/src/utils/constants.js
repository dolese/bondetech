// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Default values
export const DEFAULT_SUBJECTS = [
  "CIV",
  "HTZ",
  "HIST",
  "GEO",
  "KISW",
  "ENG",
  "BIOS",
  "B/MATH",
  "CHEM",
  "PHYS",
  "BS",
];

export const DEFAULT_SCHOOL = {
  name: "BONDE SECONDARY SCHOOL",
  authority: "PRIME MINISTER'S OFFICE",
  region: "TANGA",
  district: "MUHEZA DC",
  form: "Form I",
  term: "I",
  exam: "Mid-Term Exam",
  year: "2026",
};

// Grade colors & backgrounds
export const GRADE_COLORS = {
  A: "#1a6b2f", // Dark green
  B: "#0b4f9e", // Dark blue  
  C: "#7a5800", // Brown
  D: "#8b2500", // Dark orange
  F: "#6b0000", // Dark red
};

export const GRADE_BACKGROUNDS = {
  A: "#d4f7e0", // Light green
  B: "#d0e4ff", // Light blue
  C: "#fff3cc", // Light yellow
  D: "#ffe0cc", // Light orange
  F: "#ffd0d0", // Light red
};

// Division colors
export const DIVISION_COLORS = {
  "I": "#003366",  // Dark blue
  "II": "#005a99", // Blue
  "III": "#0099cc", // Light blue
  "IV": "#44aadd", // Lighter blue
  "0": "#999",     // Gray
};

// Grade points (for GPA calculation)
export const GRADE_POINTS = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  F: 5,
};

// API endpoints
export const API_BASE = "/api";

// Status options
export const STATUS_OPTIONS = [
  { label: "Present", value: "PRES" },
  { label: "Absent", value: "ABS" },
  { label: "Incomplete", value: "INC" },
];

// Sex options
export const SEX_OPTIONS = [
  { label: "Male", value: "M" },
  { label: "Female", value: "F" },
];

// Score ranges for analysis
export const SCORE_RANGES = [
  { label: "90–100", min: 90, max: 100, color: "#1a6b2f" },
  { label: "75–89", min: 75, max: 89, color: "#0b4f9e" },
  { label: "65–74", min: 65, max: 74, color: "#0077aa" },
  { label: "45–64", min: 45, max: 64, color: "#7a5800" },
  { label: "30–44", min: 30, max: 44, color: "#8b2500" },
  { label: "0–29", min: 0, max: 29, color: "#6b0000" },
];
