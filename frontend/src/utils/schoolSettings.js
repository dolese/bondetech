import { DEFAULT_EXAM_TYPE, DEFAULT_SCHOOL } from "./constants";

const CLASS_REPORT_KEYS = ["form", "term", "exam", "year", "reportInstruction"];
const LEGACY_BONDE_LOGO = "/asset/bonde.jpg";
const ACTIVE_BONDE_LOGO = "/asset/bonde.png";

function normalizeLogoSrc(src, fallback) {
  const value = String(src ?? fallback ?? "").trim();
  return value === LEGACY_BONDE_LOGO ? ACTIVE_BONDE_LOGO : value;
}

export function normalizeSchoolSettings(input = {}) {
  const exportBranding = {
    ...(DEFAULT_SCHOOL.export_branding ?? {}),
    ...(input.export_branding ?? input.exportBranding ?? {}),
  };
  exportBranding.leftLogoSrc = normalizeLogoSrc(
    exportBranding.leftLogoSrc,
    DEFAULT_SCHOOL.export_branding?.leftLogoSrc
  );
  exportBranding.rightLogoSrc = normalizeLogoSrc(
    exportBranding.rightLogoSrc,
    DEFAULT_SCHOOL.export_branding?.rightLogoSrc
  );

  return {
    ...DEFAULT_SCHOOL,
    ...input,
    export_branding: exportBranding,
    reportInstruction: String(input.reportInstruction ?? DEFAULT_SCHOOL.reportInstruction ?? "").trim(),
  };
}

export function mergeClassSchoolInfo(classInfo = {}, schoolSettings = {}) {
  const globalSettings = normalizeSchoolSettings(schoolSettings);
  const localInfo = classInfo && typeof classInfo === "object" ? classInfo : {};

  return {
    ...globalSettings,
    form: localInfo.form ?? globalSettings.form,
    term: localInfo.term ?? globalSettings.term,
    exam: localInfo.exam ?? globalSettings.exam ?? DEFAULT_EXAM_TYPE,
    year: localInfo.year ?? globalSettings.year,
    reportInstruction: String(
      localInfo.reportInstruction ?? localInfo.report_instruction ?? globalSettings.reportInstruction ?? ""
    ).trim(),
    export_branding: {
      ...(globalSettings.export_branding ?? {}),
    },
  };
}

export function extractClassSchoolInfoOverrides(schoolInfo = {}) {
  const source = schoolInfo && typeof schoolInfo === "object" ? schoolInfo : {};
  const next = {};
  CLASS_REPORT_KEYS.forEach((key) => {
    if (source[key] !== undefined) {
      next[key] = key === "reportInstruction" ? String(source[key] ?? "").trim() : source[key];
    }
  });
  if (!next.exam) next.exam = DEFAULT_EXAM_TYPE;
  return next;
}
