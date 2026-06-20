/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  // Preflight is OFF for now so the not-yet-migrated screens keep their
  // existing inline-style look untouched. Turn this on once every screen
  // has been migrated to the token system.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Brand navy/blue — the single source of truth for the BONDE identity.
        brand: {
          50: "#eff5ff",
          100: "#dbe7fe",
          200: "#bdd0fc",
          300: "#8eb0f9",
          400: "#5a86f3",
          500: "#2563eb", // primary action
          600: "#1d4ed8",
          700: "#1e40af",
          800: "#173b74", // deep panels
          900: "#0f2d6e", // hero
          950: "#0a1f4d",
        },
        // Accent — used sparingly for the single most important CTA.
        accent: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI Variable", "Segoe UI", "sans-serif"],
        display: ["IBM Plex Serif", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.06)",
        elevated: "0 10px 30px rgba(15,23,42,0.10)",
      },
    },
  },
  plugins: [],
};
