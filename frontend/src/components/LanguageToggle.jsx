import { useEffect, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const options = [
    { value: "en", label: "English", short: "EN" },
    { value: "sw", label: "Kiswahili", short: "SW" },
  ];

  return (
    <div
      ref={rootRef}
      title={t("language")}
      style={{
        position: "relative",
        display: "inline-flex",
        fontFamily: "'Plus Jakarta Sans', 'Segoe UI Variable', 'Segoe UI', sans-serif",
      }}
    >
      <button
        type="button"
        aria-label={t("language")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          width: compact ? 34 : 38,
          height: compact ? 34 : 38,
          borderRadius: "50%",
          border: dark ? "1px solid rgba(255,255,255,0.16)" : "1px solid #d8e4ff",
          background: dark ? "rgba(255,255,255,0.16)" : "rgba(37,99,235,0.1)",
          color: dark ? "#ffffff" : "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: dark ? "none" : "inset 0 1px 0 rgba(255,255,255,0.72)",
        }}
      >
        <GlobeIcon />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={t("language")}
          style={{
            position: "absolute",
            top: compact ? 40 : 44,
            right: 0,
            minWidth: 140,
            padding: 6,
            borderRadius: 14,
            background: dark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.96)",
            border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(203,213,225,0.9)",
            boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            zIndex: 40,
          }}
        >
          {options.map((option) => {
            const active = language === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLanguage(option.value);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: active ? 800 : 700,
                  letterSpacing: 0.15,
                  cursor: "pointer",
                  background: active
                    ? (dark ? "rgba(37,99,235,0.24)" : "#dbeafe")
                    : "transparent",
                  color: active
                    ? (dark ? "#ffffff" : "#1d4ed8")
                    : (dark ? "rgba(255,255,255,0.88)" : "#334155"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  textAlign: "left",
                }}
              >
                <span>{option.label}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>{option.short}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
