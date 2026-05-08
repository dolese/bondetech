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

export const EXAM_TYPES = [
  { label: "March Exam", value: "March Exam" },
  { label: "Pre-Mock Exam", value: "Pre-Mock Exam" },
  { label: "Mock Exam", value: "Mock Exam" },
  { label: "Pre-Necta Exam", value: "Pre-Necta Exam" },
  { label: "Terminal Exam", value: "Terminal Exam" },
  { label: "September Exam", value: "September Exam" },
  { label: "Annual Exam", value: "Annual Exam" },
];

export const DEFAULT_EXAM_TYPE = EXAM_TYPES[0].value;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTHLY_EXAM_PREFIX = "Monthly - ";

// Returns the exam type key used in examScores for a monthly exam
export const getMonthlyExamKey = (month) => `${MONTHLY_EXAM_PREFIX}${month}`;

export const DEFAULT_SCHOOL = {
  name: "BONDE SECONDARY SCHOOL",
  authority: "PRIME MINISTER'S OFFICE",
  region: "TANGA",
  district: "MUHEZA DC",
  academicPhone: "",
  headmasterPhone: "+255 123 456 789",
  email: "info@bondessecondary.sc.tz",
  address: "Muheza, Tanga, Tanzania",
  postal: "P.O. Box 03 Muheza",
  form: "Form I",
  term: "I",
  exam: "March Exam",
  year: String(new Date().getFullYear()),
  export_branding: {
    leftLogoSrc: "/asset/Tz.jpg",
    rightLogoSrc: "/asset/bonde.png",
    headerName: "",
    headerSubtitle: "",
    headerAddress: "",
  },
  reportInstruction: "",
  timetable: {
    days: [
      { id: "monday", label: "Monday", shortLabel: "Mon", enabled: true },
      { id: "tuesday", label: "Tuesday", shortLabel: "Tue", enabled: true },
      { id: "wednesday", label: "Wednesday", shortLabel: "Wed", enabled: true },
      { id: "thursday", label: "Thursday", shortLabel: "Thu", enabled: true },
      { id: "friday", label: "Friday", shortLabel: "Fri", enabled: true },
    ],
    periods: [
      { id: "period-1", label: "Period 1", shortLabel: "P1", start: "07:30", end: "08:10", type: "lesson" },
      { id: "period-2", label: "Period 2", shortLabel: "P2", start: "08:10", end: "08:50", type: "lesson" },
      { id: "short-break", label: "Break", shortLabel: "BR", start: "08:50", end: "09:10", type: "break" },
      { id: "period-3", label: "Period 3", shortLabel: "P3", start: "09:10", end: "09:50", type: "lesson" },
      { id: "period-4", label: "Period 4", shortLabel: "P4", start: "09:50", end: "10:30", type: "lesson" },
      { id: "lunch", label: "Lunch", shortLabel: "LN", start: "10:30", end: "11:00", type: "break" },
      { id: "period-5", label: "Period 5", shortLabel: "P5", start: "11:00", end: "11:40", type: "lesson" },
      { id: "period-6", label: "Period 6", shortLabel: "P6", start: "11:40", end: "12:20", type: "lesson" },
      { id: "period-7", label: "Period 7", shortLabel: "P7", start: "12:20", end: "13:00", type: "lesson" },
    ],
  },
};

export const USER_ROLE_OPTIONS = [
  { label: "Administrator", value: "admin" },
  { label: "Academic", value: "academic" },
  { label: "Teacher", value: "teacher" },
  { label: "Parent", value: "parent" },
  { label: "Student", value: "student" },
];

export const formatUserRole = (role) =>
  USER_ROLE_OPTIONS.find((option) => option.value === role)?.label || "User";

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

// Composite exam config: exam types that combine two sittings ((midterm + exam) / 2).
// Keys are the composite exam values; values define the default midterm partner.
export const COMPOSITE_EXAM_CONFIG = {
  "Terminal Exam": {
    partnerExam: "March Exam",
    label: "March + Terminal",
  },
  "September Exam": {
    partnerExam: "Pre-Mock Exam",
    label: "Pre-Mock + September",
  },
  "Annual Exam": {
    partnerExam: "September Exam",
    label: "September + Annual",
  },
};

// Returns the composite config entry for an exam type, merging any per-class overrides.
// Returns null when the exam type is not a composite exam.
export const getCompositeEntry = (examType, classCompositeConfig = {}) => {
  const defaults = COMPOSITE_EXAM_CONFIG[examType];
  if (!defaults) return null;
  const override = classCompositeConfig[examType] ?? {};
  return { ...defaults, ...override };
};

// API endpoints
export const API_BASE = "/api";

// Status options
export const STATUS_OPTIONS = [
  { label: "Present", value: "present" },
  { label: "Absent", value: "absent" },
  { label: "Incomplete", value: "incomplete" },
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
