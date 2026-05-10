import { useI18n } from "../i18n";

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3.8 9h16.4" />
      <path d="M3.8 15h16.4" />
      <path d="M12 3c2.6 2.8 4 5.8 4 9s-1.4 6.2-4 9c-2.6-2.8-4-5.8-4-9s1.4-6.2 4-9Z" />
    </svg>
  );
}

export function LanguageToggle({ compact = false, dark = false }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      title={t("language")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: compact ? 3 : 4,
        borderRadius: 999,
        background: dark ? "rgba(255,255,255,0.14)" : "#eef3ff",
        border: dark ? "1px solid rgba(255,255,255,0.16)" : "1px solid #d8e4ff",
        boxShadow: dark ? "none" : "inset 0 1px 0 rgba(255,255,255,0.72)",
        fontFamily: "'Plus Jakarta Sans', 'Segoe UI Variable', 'Segoe UI', sans-serif",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: compact ? 24 : 28,
          height: compact ? 24 : 28,
          borderRadius: "50%",
          background: dark ? "rgba(255,255,255,0.16)" : "rgba(37,99,235,0.1)",
          color: dark ? "#ffffff" : "#2563eb",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <GlobeIcon />
      </span>
      {[
        { value: "en", label: "EN" },
        { value: "sw", label: "SW" },
      ].map((option) => {
        const active = language === option.value;
        return (
          <button
            key={option.value}
            onClick={() => setLanguage(option.value)}
            style={{
              border: "none",
              borderRadius: 999,
              padding: compact ? "5px 8px" : "6px 10px",
              fontSize: compact ? 10 : 11,
              fontWeight: 800,
              letterSpacing: 0.2,
              cursor: "pointer",
              background: active
                ? (dark ? "#fff" : "#2563eb")
                : "transparent",
              color: active
                ? (dark ? "#0f2d6e" : "#fff")
                : (dark ? "rgba(255,255,255,0.86)" : "#46607d"),
            }}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
