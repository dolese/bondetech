export const premiumFontStack = "'Inter', 'Segoe UI Variable', 'Segoe UI', sans-serif";
export const displayFontStack = "'Newsreader', 'IBM Plex Serif', Georgia, serif";

// Clean flat theme. Brand navy (#0f2d6e / #1d4ed8) + amber accent. No glassmorphism.
const FLAT_BORDER = "1px solid #e2e8f0";
const FLAT_SHADOW = "0 1px 2px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.06)";
const clampRadius = (radius, fallback) => {
  const r = typeof radius === "number" ? radius : fallback;
  return Math.min(r, 16);
};

export const pageBackground = "linear-gradient(180deg, #f8fafc 0%, #f6f8fc 100%)";

export function glassPanelStyle({ compact = false, dense = false, padding, radius } = {}) {
  return {
    background: "#ffffff",
    border: FLAT_BORDER,
    boxShadow: FLAT_SHADOW,
    borderRadius: clampRadius(radius, dense ? 12 : compact ? 14 : 16),
    padding: padding ?? (dense ? 15 : compact ? 18 : 22),
  };
}

// Signature preserved for callers; tint/blur/opacity args are accepted but the
// surface is now a flat white card regardless, for a clean professional look.
export function liquidGlassStyle({
  padding = 18,
  radius = 16,
  tint = "blue",
  blur = 26,
  borderOpacity = 0.72,
  shadowOpacity = 0.06,
} = {}) {
  return {
    borderRadius: clampRadius(radius, 16),
    padding,
    border: FLAT_BORDER,
    background: "#ffffff",
    boxShadow: `0 1px 2px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,${shadowOpacity})`,
  };
}

export function softCardStyle({ padding = 14, radius = 12 } = {}) {
  return {
    borderRadius: clampRadius(radius, 12),
    border: FLAT_BORDER,
    background: "#ffffff",
    boxShadow: FLAT_SHADOW,
    padding,
  };
}

export function fieldStyle({ background = "#ffffff" } = {}) {
  return {
    borderRadius: 10,
    border: FLAT_BORDER,
    padding: "10px 12px",
    fontSize: 14,
    color: "#0f172a",
    background,
    outline: "none",
  };
}

export function primaryButtonStyle({ compact = false } = {}) {
  return {
    border: "none",
    borderRadius: compact ? 8 : 10,
    background: "#1d4ed8",
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: "0.01em",
    padding: compact ? "10px 14px" : "12px 16px",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(15,23,42,0.10)",
    transition: "background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
  };
}

export function secondaryButtonStyle({ compact = false } = {}) {
  return {
    border: FLAT_BORDER,
    borderRadius: compact ? 8 : 10,
    background: "#ffffff",
    color: "#334155",
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: "0.01em",
    padding: compact ? "10px 14px" : "12px 16px",
    cursor: "pointer",
    transition: "background 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
  };
}

export function pillStyle({ tone = "slate" } = {}) {
  const tones = {
    teal: { color: "#0f766e", background: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.22)" },
    blue: { color: "#1d4ed8", background: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.22)" },
    green: { color: "#15803d", background: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.22)" },
    amber: { color: "#b45309", background: "rgba(251,191,36,0.16)", border: "rgba(245,158,11,0.22)" },
    red: { color: "#b91c1c", background: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.2)" },
    slate: { color: "#475569", background: "rgba(226,232,240,0.7)", border: "rgba(203,213,225,0.84)" },
  };
  const active = tones[tone] || tones.slate;
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    borderRadius: 999,
    border: `1px solid ${active.border}`,
    background: active.background,
    color: active.color,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
  };
}
