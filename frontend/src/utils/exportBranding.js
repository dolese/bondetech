import { DEFAULT_SCHOOL } from "./constants";

const DEFAULT_EXPORT_BRANDING = DEFAULT_SCHOOL.export_branding;
const LEGACY_BONDE_LOGO = "/asset/bonde.jpg";
const ACTIVE_BONDE_LOGO = "/asset/bonde.png";

function normalizeLogoSrc(src, fallback) {
  const value = String(src ?? fallback ?? "").trim();
  return value === LEGACY_BONDE_LOGO ? ACTIVE_BONDE_LOGO : value;
}

export function getExportBranding(schoolInfo = {}) {
  const rawBranding = schoolInfo.export_branding ?? schoolInfo.exportBranding ?? {};
  const branding = {
    ...DEFAULT_EXPORT_BRANDING,
    ...rawBranding,
  };

  return {
    leftLogoSrc: normalizeLogoSrc(branding.leftLogoSrc, DEFAULT_EXPORT_BRANDING.leftLogoSrc),
    rightLogoSrc: normalizeLogoSrc(branding.rightLogoSrc, DEFAULT_EXPORT_BRANDING.rightLogoSrc),
    headerName: (branding.headerName || schoolInfo.name || DEFAULT_SCHOOL.name || "").trim(),
    headerSubtitle: (branding.headerSubtitle || schoolInfo.authority || DEFAULT_SCHOOL.authority || "").trim(),
    headerAddress: (
      branding.headerAddress ||
      (schoolInfo.district ? `P.O. BOX 03, ${schoolInfo.district}` : "") ||
      "P.O. BOX 03, MUHEZA"
    ).trim(),
  };
}

export function getResultSheetBranding(schoolInfo = {}) {
  const branding = getExportBranding(schoolInfo);
  const leftLogo = normalizeLogoSrc(
    branding.leftLogoSrc,
    DEFAULT_EXPORT_BRANDING.leftLogoSrc
  );
  const rightLogo = normalizeLogoSrc(
    branding.rightLogoSrc,
    DEFAULT_EXPORT_BRANDING.rightLogoSrc
  );

  return {
    ...branding,
    leftLogoSrc: leftLogo,
    rightLogoSrc: rightLogo,
    footerMotto: "Better Future Starts Here",
  };
}

export function updateExportBranding(schoolInfo = {}, partial = {}) {
  return {
    ...schoolInfo,
    export_branding: {
      ...(DEFAULT_EXPORT_BRANDING ?? {}),
      ...(schoolInfo.export_branding ?? schoolInfo.exportBranding ?? {}),
      ...Object.fromEntries(
        Object.entries(partial).map(([key, value]) => [
          key,
          key.toLowerCase().includes("logosrc") ? normalizeLogoSrc(value, DEFAULT_EXPORT_BRANDING[key]) : value,
        ])
      ),
    },
  };
}
