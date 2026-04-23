/**
 * Returns a theme palette object based on the dark flag.
 * Use like: const t = themeColors(dark);
 * Then reference: t.bgCard, t.text, etc.
 */
export const themeColors = (dark) => ({
  // Page / structural backgrounds
  bgPage:      dark ? "#0f172a" : "#e8edf5",
  bgSidebar:   dark ? "#010913" : "#001a3d",   // sidebar stays dark in both modes
  bgTopbar:    dark ? "rgba(1,9,20,0.95)" : "rgba(0,51,102,0.88)",

  // Content backgrounds
  bgCard:      dark ? "#1e293b" : "#fff",
  bgCardAlt:   dark ? "#152030" : "#f4f7ff",
  bgCardAlts:  dark ? "#12192a" : "#f7f9ff",   // very subtle alt
  bgInput:     dark ? "#0d1520" : "#fff",
  bgDisabled:  dark ? "#1a2540" : "#f0f4ff",

  // Text
  text:        dark ? "#e2e8f0" : "#1a1a2e",
  textMuted:   dark ? "#94a3b8" : "#666",
  textSubtle:  dark ? "#6b7fa3" : "#888",
  textMid:     dark ? "#8899aa" : "#555",
  header:      dark ? "#7ab3ff" : "#003366",
  headerLight: dark ? "#58a6ff" : "#0b4f9e",

  // Borders
  border:      dark ? "#334155" : "#d0dcf8",
  borderCard:  dark ? "#21262d" : "#d0dcf8",
  borderLight: dark ? "#2d3f55" : "#e4ecff",
  borderInput: dark ? "#334155" : "#ccd6f0",
  borderDash:  dark ? "#2d3f55" : "#c8d8f8",
  borderTable: dark ? "#334155" : "#cbd8f3",

  // Table rows
  rowEven:     dark ? "#1e293b" : "#fff",
  rowOdd:      dark ? "#152030" : "#f4f7ff",

  // Table header stays brand blue in both modes
  tableHeader: "#003366",

  // Overlay / modal
  overlay:     dark ? "rgba(0,0,0,0.75)" : "rgba(0,51,102,0.6)",
});
