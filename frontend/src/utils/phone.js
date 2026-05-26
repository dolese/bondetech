export function normalizeTzPhoneDraft(value) {
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

export function normalizeTzPhoneListInline(value) {
  const seen = new Set();
  return String(value ?? "")
    .split(/[\n,;]+/)
    .map((entry) => normalizeTzPhoneDraft(entry))
    .filter((entry) => {
      if (!entry || seen.has(entry)) return false;
      seen.add(entry);
      return true;
    })
    .join(", ");
}

export function normalizeTzPhoneListDraft(value) {
  return String(value ?? "")
    .split(/[\s,;\n]+/)
    .map((entry) => normalizeTzPhoneDraft(entry))
    .filter(Boolean)
    .join("\n");
}

export function parseTzPhoneList(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((entry) => normalizeTzPhoneDraft(entry))
          .filter(Boolean),
      ),
    );
  }
  return Array.from(
    new Set(
      String(value ?? "")
        .split(/[\s,;\n]+/)
        .map((entry) => normalizeTzPhoneDraft(entry))
        .filter(Boolean),
    ),
  );
}

export function buildPhoneCollection(primaryValue, listValue) {
  const list = parseTzPhoneList(listValue);
  const primary = normalizeTzPhoneDraft(primaryValue);
  if (primary) {
    return [primary, ...list.filter((entry) => entry !== primary)];
  }
  return list;
}

export function phonesToDraft(value) {
  return Array.isArray(value) ? value.map((entry) => normalizeTzPhoneDraft(entry)).filter(Boolean).join("\n") : "";
}
