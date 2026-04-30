import { useI18n } from "../i18n";

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
      }}
    >
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
