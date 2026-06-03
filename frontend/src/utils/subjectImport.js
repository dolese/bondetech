const SUBJECT_ALIAS_GROUPS = [
  ["AGR", "AGRICULTURE", "AGRICULTURALSCIENCE", "AGRICSCIENCE"],
  ["B/MATH", "BMATH", "BMATHS", "BASICMATH", "BASICMATHEMATICS"],
  ["MATH", "MATHEMATICS"],
  ["BIO", "BIOS", "BIOLOGY"],
  ["CHEM", "CHEMISTRY"],
  ["PHYS", "PHYSICS"],
  ["ENG", "ENGLISH"],
  ["KISW", "KISWAHILI"],
  ["GEO", "GEOGRAPHY"],
  ["HIST", "HISTORY"],
  ["CIV", "CIVICS"],
  ["BS", "BUSINESSSTUDIES"],
  ["EDK", "EDUCATION"],
];

export function normalizeSubjectImportKey(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function buildAliasLookup() {
  const lookup = new Map();
  SUBJECT_ALIAS_GROUPS.forEach((group) => {
    const canonical = normalizeSubjectImportKey(group[0]);
    group.forEach((entry) => {
      lookup.set(normalizeSubjectImportKey(entry), canonical);
    });
  });
  return lookup;
}

const SUBJECT_ALIAS_LOOKUP = buildAliasLookup();

function canonicalizeAlias(value) {
  const key = normalizeSubjectImportKey(value);
  return SUBJECT_ALIAS_LOOKUP.get(key) || key;
}

export function getSubjectImportAliases(subjectName) {
  const raw = String(subjectName ?? "").trim();
  const key = normalizeSubjectImportKey(raw);
  const aliases = new Set();
  if (!key) return aliases;

  aliases.add(key);
  aliases.add(canonicalizeAlias(raw));

  if (key.length >= 3) aliases.add(key.slice(0, 3));
  if (key.length >= 4) aliases.add(key.slice(0, 4));

  const words = raw
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (words.length > 1) {
    aliases.add(words.map((part) => part[0]).join(""));
    aliases.add(normalizeSubjectImportKey(words.join("")));
  }

  return aliases;
}

export function findImportedSubjectColumn(headers = [], subjectName) {
  const normalizedHeaders = headers.map((header) => canonicalizeAlias(header));
  const aliases = Array.from(getSubjectImportAliases(subjectName)).map(canonicalizeAlias);

  for (const alias of aliases) {
    const exactIndex = normalizedHeaders.findIndex((header) => header === alias);
    if (exactIndex >= 0) return exactIndex;
  }

  const normalizedName = normalizeSubjectImportKey(subjectName);
  if (normalizedName) {
    const fuzzyIndex = normalizedHeaders.findIndex(
      (header) =>
        header === normalizedName ||
        header.startsWith(normalizedName) ||
        normalizedName.startsWith(header)
    );
    if (fuzzyIndex >= 0) return fuzzyIndex;
  }

  return -1;
}
