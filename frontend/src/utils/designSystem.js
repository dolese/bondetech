export const premiumFontStack = "'Inter', 'Segoe UI Variable', 'Segoe UI', sans-serif";
export const displayFontStack = "'IBM Plex Serif', Georgia, serif";

export const pageBackground =
  "radial-gradient(circle at top left, rgba(191,219,254,0.34), transparent 24%), radial-gradient(circle at top right, rgba(186,230,253,0.28), transparent 22%), linear-gradient(180deg, #f7fafc 0%, #eff5fb 100%)";

export function glassPanelStyle({ compact = false, dense = false, padding, radius } = {}) {
  return {
    background: "linear-gradient(135deg, rgba(255,255,255,0.82), rgba(244,248,255,0.64))",
    border: "1px solid rgba(255,255,255,0.78)",
    boxShadow: "0 24px 56px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
    backdropFilter: "blur(22px) saturate(140%)",
    WebkitBackdropFilter: "blur(22px) saturate(140%)",
    borderRadius: radius ?? (dense ? 22 : compact ? 26 : 30),
    padding: padding ?? (dense ? 15 : compact ? 18 : 22),
  };
}

export function liquidGlassStyle({
  padding = 18,
  radius = 24,
  tint = "blue",
  blur = 26,
  borderOpacity = 0.72,
  shadowOpacity = 0.12,
} = {}) {
  const palettes = {
    blue: {
      glow: "rgba(59,130,246,0.14)",
      glowSoft: "rgba(14,165,233,0.09)",
      surfaceTop: "rgba(255,255,255,0.88)",
      surfaceBottom: "rgba(239,246,255,0.62)",
    },
    amber: {
      glow: "rgba(245,158,11,0.14)",
      glowSoft: "rgba(251,191,36,0.10)",
      surfaceTop: "rgba(255,255,255,0.88)",
      surfaceBottom: "rgba(255,250,235,0.64)",
    },
    slate: {
      glow: "rgba(148,163,184,0.12)",
      glowSoft: "rgba(226,232,240,0.10)",
      surfaceTop: "rgba(255,255,255,0.88)",
      surfaceBottom: "rgba(248,250,252,0.66)",
    },
  };
  const active = palettes[tint] || palettes.blue;
  return {
    borderRadius: radius,
    padding,
    border: `1px solid rgba(255,255,255,${borderOpacity})`,
    background: `
      radial-gradient(circle at top left, ${active.glow}, transparent 34%),
      radial-gradient(circle at bottom right, ${active.glowSoft}, transparent 38%),
      linear-gradient(180deg, ${active.surfaceTop}, ${active.surfaceBottom})
    `,
    boxShadow: `
      0 22px 54px rgba(15,23,42,${shadowOpacity}),
      0 8px 24px rgba(255,255,255,0.18) inset,
      inset 0 1px 0 rgba(255,255,255,0.92)
    `,
    backdropFilter: `blur(${blur}px) saturate(150%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(150%)`,
  };
}

export function softCardStyle({ padding = 14, radius = 18 } = {}) {
  return {
    borderRadius: radius,
    border: "1px solid rgba(214,226,245,0.9)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(242,247,255,0.88))",
    boxShadow: "0 14px 34px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.86)",
    padding,
  };
}

export function fieldStyle({ background = "rgba(255,255,255,0.84)" } = {}) {
  return {
    borderRadius: 14,
    border: "1px solid rgba(214,226,245,0.92)",
    padding: "12px 14px",
    fontSize: 14,
    color: "#0f172a",
    background,
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.76)",
  };
}

export function primaryButtonStyle({ compact = false } = {}) {
  return {
    border: "none",
    borderRadius: compact ? 12 : 14,
    background: "linear-gradient(135deg, #1d4ed8, #0f8b8d)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    padding: compact ? "10px 14px" : "12px 16px",
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(29,78,216,0.18)",
  };
}

export function secondaryButtonStyle({ compact = false } = {}) {
  return {
    border: "1px solid rgba(203,213,225,0.92)",
    borderRadius: compact ? 12 : 14,
    background: "rgba(255,255,255,0.84)",
    color: "#334155",
    fontWeight: 800,
    fontSize: 13,
    padding: compact ? "10px 14px" : "12px 16px",
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

export function pillStyle({ tone = "slate" } = {}) {
  const tones = {
    teal: { color: "#0f766e", background: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.22)" },
    blue: { color: "#1d4ed8", background: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.22)" },
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
    fontWeight: 800,
    letterSpacing: "0.02em",
  };
}
