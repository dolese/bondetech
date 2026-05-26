const { DEFAULT_SCHOOL } = require("./classes");
const { normalizeTimetableSettings } = require("./timetable");

const SCHOOL_SETTINGS_COLLECTION = "site_settings";
const SCHOOL_SETTINGS_DOC = "school";
const LEGACY_BONDE_LOGO = "/asset/bonde.jpg";
const ACTIVE_BONDE_LOGO = "/asset/bonde.png";

function normalizeTzPhoneDraft(value) {
  const raw = String(value || "");
  const compact = raw.replace(/[^\d+]/g, "").trim();
  if (!compact) return "";

  const noPlus = compact.startsWith("+") ? compact.slice(1) : compact;
  const digits = noPlus.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("255")) return `255${digits.slice(3)}`;
  if ("255".startsWith(digits)) return "255";
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  return `255${digits}`;
}

function normalizeLogoSrc(src, fallback) {
  const value = String(src || fallback || "").trim();
  return value === LEGACY_BONDE_LOGO ? ACTIVE_BONDE_LOGO : value;
}

function normalizePhoneDraft(value) {
  const raw = String(value ?? "");
  const compact = raw.replace(/[^\d+]/g, "").trim();
  if (!compact) return "";
  const noPlus = compact.startsWith("+") ? compact.slice(1) : compact;
  const digits = noPlus.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("255")) return `255${digits.slice(3)}`;
  if ("255".startsWith(digits)) return "255";
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  return `255${digits}`;
}

function normalizePhoneList(value) {
  return Array.from(
    new Set(
      (Array.isArray(value) ? value : String(value ?? "").split(/[\s,;\n]+/))
        .map((entry) => normalizePhoneDraft(entry))
        .filter(Boolean)
    )
  );
}

function normalizePhoneCollection(primaryValue, listValue) {
  const list = normalizePhoneList(listValue);
  const primary = normalizePhoneDraft(primaryValue);
  if (primary) {
    return [primary, ...list.filter((entry) => entry !== primary)];
  }
  return list;
}

function normalizeSchoolSettings(input = {}) {
  const exportBranding = {
    ...(DEFAULT_SCHOOL.export_branding || {}),
    ...(input.export_branding || input.exportBranding || {}),
  };
  exportBranding.leftLogoSrc = normalizeLogoSrc(
    exportBranding.leftLogoSrc,
    DEFAULT_SCHOOL.export_branding && DEFAULT_SCHOOL.export_branding.leftLogoSrc
  );
  exportBranding.rightLogoSrc = normalizeLogoSrc(
    exportBranding.rightLogoSrc,
    DEFAULT_SCHOOL.export_branding && DEFAULT_SCHOOL.export_branding.rightLogoSrc
  );

  const academicPhones = normalizePhoneCollection(
    input.academicPhone ?? DEFAULT_SCHOOL.academicPhone,
    input.academicPhones ?? []
  );
  const headmasterPhones = normalizePhoneCollection(
    input.headmasterPhone ?? DEFAULT_SCHOOL.headmasterPhone,
    input.headmasterPhones ?? []
  );

  return {
    ...DEFAULT_SCHOOL,
    ...input,
    academicPhone: academicPhones[0] || "",
    academicPhones,
    headmasterPhone: headmasterPhones[0] || "",
    headmasterPhones,
    export_branding: exportBranding,
    reportInstruction: String(input.reportInstruction || "").trim(),
    timetable: normalizeTimetableSettings(input.timetable),
  };
}

function getSchoolSettingsRef(db) {
  return db.collection(SCHOOL_SETTINGS_COLLECTION).doc(SCHOOL_SETTINGS_DOC);
}

async function deriveLegacySchoolSettings(db) {
  const snapshot = await db.collection("classes").orderBy("created_at", "asc").limit(1).get();
  if (snapshot.empty) {
    return normalizeSchoolSettings(DEFAULT_SCHOOL);
  }
  const legacyInfo = snapshot.docs[0].data()?.school_info || {};
  return normalizeSchoolSettings(legacyInfo);
}

async function getSchoolSettings(db) {
  const snapshot = await getSchoolSettingsRef(db).get();
  if (snapshot.exists) {
    return normalizeSchoolSettings(snapshot.data());
  }
  return deriveLegacySchoolSettings(db);
}

async function saveSchoolSettings(db, input = {}, actor = null) {
  const payload = normalizeSchoolSettings(input);
  const now = new Date().toISOString();
  const record = {
    ...payload,
    updated_at: now,
    updated_by: actor?.username || "",
  };
  await getSchoolSettingsRef(db).set(record, { merge: true });
  return payload;
}

module.exports = {
  normalizeSchoolSettings,
  getSchoolSettings,
  saveSchoolSettings,
};
