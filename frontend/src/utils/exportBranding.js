import { DEFAULT_SCHOOL } from "./constants";

const DEFAULT_EXPORT_BRANDING = DEFAULT_SCHOOL.export_branding;

export function getExportBranding(schoolInfo = {}) {
  const rawBranding = schoolInfo.export_branding ?? schoolInfo.exportBranding ?? {};
  const branding = {
    ...DEFAULT_EXPORT_BRANDING,
    ...rawBranding,
  };

  return {
    leftLogoSrc: branding.leftLogoSrc || DEFAULT_EXPORT_BRANDING.leftLogoSrc,
    rightLogoSrc: branding.rightLogoSrc || DEFAULT_EXPORT_BRANDING.rightLogoSrc,
    headerName: (branding.headerName || schoolInfo.name || DEFAULT_SCHOOL.name || "").trim(),
    headerSubtitle: (branding.headerSubtitle || schoolInfo.authority || DEFAULT_SCHOOL.authority || "").trim(),
    headerAddress: (
      branding.headerAddress ||
      (schoolInfo.district ? `P.O. BOX 03, ${schoolInfo.district}` : "") ||
      "P.O. BOX 03, MUHEZA"
    ).trim(),
  };
}

export function updateExportBranding(schoolInfo = {}, partial = {}) {
  return {
    ...schoolInfo,
    export_branding: {
      ...(DEFAULT_EXPORT_BRANDING ?? {}),
      ...(schoolInfo.export_branding ?? schoolInfo.exportBranding ?? {}),
      ...partial,
    },
  };
}
