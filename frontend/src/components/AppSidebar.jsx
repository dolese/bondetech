import { useMemo } from "react";
import { useI18n } from "../i18n";

function currentAcademicYear(classesByYear) {
  const years = classesByYear.map(([year]) => String(year || "")).filter(Boolean).sort();
  return years[years.length - 1] || new Date().getFullYear().toString();
}

function SidebarCrest() {
  return (
    <svg viewBox="0 0 120 120" width="112" height="112" aria-hidden="true">
      <defs>
        <linearGradient id="crestRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#1f3c88" />
        </linearGradient>
        <linearGradient id="crestBook" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1f3c88" />
          <stop offset="100%" stopColor="#0f8b8d" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="#ffffff" />
      <circle cx="60" cy="60" r="54" fill="none" stroke="url(#crestRing)" strokeWidth="6" />
      <circle cx="60" cy="60" r="41" fill="#f8fbff" stroke="#dbe7f5" strokeWidth="2" />
      <path d="M28 26h64" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
      <text x="60" y="24" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ef4444">
        BONDE SECONDARY SCHOOL
      </text>
      <path d="M46 46c-5 0-10 1-14 4v27c4-3 9-4 14-4 5 0 9 1 14 4V50c-5-3-9-4-14-4Z" fill="#ffffff" stroke="url(#crestBook)" strokeWidth="3" />
      <path d="M74 46c-5 0-9 1-14 4v27c5-3 9-4 14-4s10 1 14 4V50c-4-3-9-4-14-4Z" fill="#ffffff" stroke="url(#crestBook)" strokeWidth="3" />
      <path d="M60 36c3 0 7 4 7 8 0 3-2 5-4 7l-3 4-3-4c-2-2-4-4-4-7 0-4 4-8 7-8Z" fill="#ef4444" />
      <path d="M56 43h8" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 40v7" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M26 92h68" stroke="#0f8b8d" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
      <text x="60" y="101" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1f3c88">
        Better Future Starts Here
      </text>
    </svg>
  );
}

function SvgIcon({ children, width = 18, height = 18, strokeWidth = 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ChevronIcon({ open = false }) {
  return (
    <SvgIcon width={14} height={14} strokeWidth={2.4}>
      {open ? <path d="m6 9 6 6 6-6" /> : <path d="m9 6 6 6-6 6" />}
    </SvgIcon>
  );
}

function PlusIcon() {
  return (
    <SvgIcon width={14} height={14} strokeWidth={2.3}>
      <path d="M7 3.5v7" />
      <path d="M3.5 7h7" />
    </SvgIcon>
  );
}

function navIcon(key) {
  switch (key) {
    case "dashboard":
      return (
        <SvgIcon>
          <path d="M4 12 12 5l8 7" />
          <path d="M6 10v9h12v-9" />
        </SvgIcon>
      );
    case "students":
      return (
        <SvgIcon>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 18c1.2-3.1 9.8-3.1 11 0" />
          <path d="M18 7v6" />
          <path d="M15 10h6" />
        </SvgIcon>
      );
    case "results":
      return (
        <SvgIcon>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </SvgIcon>
      );
    case "reports":
      return (
        <SvgIcon>
          <path d="M5 19V8" />
          <path d="M10 19V5" />
          <path d="M15 19v-7" />
          <path d="M20 19v-4" />
        </SvgIcon>
      );
    case "settings":
      return (
        <SvgIcon>
          <circle cx="12" cy="12" r="3.4" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.8a7 7 0 0 0-1.7-1L14.5 3h-5L9 5.8a7 7 0 0 0-1.7 1L4.9 6l-2 3.5L5 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.5 2.4-.8a7 7 0 0 0 1.7 1l.5 2.8h5l.5-2.8a7 7 0 0 0 1.7-1l2.4.8 2-3.5L18.9 13c.1-.3.1-.7.1-1Z" />
        </SvgIcon>
      );
    case "account":
      return (
        <SvgIcon>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19c1.5-4 12.5-4 14 0" />
        </SvgIcon>
      );
    default:
      return (
        <SvgIcon>
          <circle cx="12" cy="12" r="2.5" />
        </SvgIcon>
      );
  }
}

export function AppSidebar({
  isMobile,
  sideOpen,
  topBarHeight,
  sidebarWidth,
  page,
  activeId,
  activeClass,
  isClassPage,
  classesByYear,
  expandedYears,
  forms,
  unorganizedClasses,
  accountLabel,
  navItems,
  onClose,
  onToggleYear,
  onAddClass,
  onPickClass,
  onSetPage,
}) {
  const { t } = useI18n();
  const academicYear = useMemo(() => currentAcademicYear(classesByYear), [classesByYear]);

  return (
    <>
      {isMobile && sideOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.48)", zIndex: 19 }}
          onClick={onClose}
        />
      )}

      <div
        style={{
          width: isMobile ? sidebarWidth : sideOpen ? sidebarWidth : 0,
          overflow: "hidden",
          transition: isMobile ? "transform 0.25s ease" : "width 0.25s ease",
          position: isMobile ? "fixed" : "relative",
          top: isMobile ? topBarHeight : 0,
          left: 0,
          height: isMobile ? `calc(100vh - ${topBarHeight}px)` : "auto",
          zIndex: isMobile ? 20 : "auto",
          transform: isMobile && !sideOpen ? `translateX(-${sidebarWidth}px)` : "translateX(0)",
          background:
            "radial-gradient(circle at top left, rgba(20,184,166,0.26), transparent 28%), linear-gradient(180deg, #08536a 0%, #083f55 45%, #062f43 100%)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 248,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            padding: "18px 14px 16px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "grid",
              justifyItems: "center",
              gap: 10,
              paddingBottom: 18,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 118,
                height: 118,
                borderRadius: "50%",
                background: "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(231,244,255,0.94))",
                border: "4px solid rgba(255,255,255,0.14)",
                boxShadow: "0 18px 38px rgba(0,0,0,0.18)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <SidebarCrest />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>{t("resultSystem")}</div>
              <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 13, marginTop: 4 }}>Admin Panel</div>
            </div>
          </div>

          <button
            onClick={() => {
              onSetPage("dashboard");
              onClose();
            }}
            style={{
              border: "none",
              borderRadius: 16,
              padding: "14px 16px",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background:
                page === "dashboard"
                  ? "linear-gradient(135deg, rgba(17,201,194,0.92), rgba(16,152,171,0.92))"
                  : "rgba(255,255,255,0.06)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 800,
              boxShadow: page === "dashboard" ? "0 14px 30px rgba(17,201,194,0.22)" : "none",
              marginBottom: 18,
            }}
          >
            {navIcon("dashboard")}
            {t("dashboard")}
          </button>

          <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, fontWeight: 800, letterSpacing: 1.6, marginBottom: 10 }}>
            MANAGEMENT
          </div>

          <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            {navItems.map((item) => {
              const active = page === item.key;
              const disabled = !activeClass;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    if (!disabled) {
                      onSetPage(item.key);
                      onClose();
                    }
                  }}
                  disabled={disabled}
                  style={{
                    border: "none",
                    borderRadius: 14,
                    padding: "11px 12px",
                    textAlign: "left",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.42 : 1,
                    background: active ? "rgba(255,255,255,0.12)" : "transparent",
                    color: active ? "#fff" : "rgba(255,255,255,0.88)",
                    fontSize: 14,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {navIcon(item.key)}
                  {item.label}
                </button>
              );
            })}

            <button
              onClick={() => {
                onSetPage("account");
                onClose();
              }}
              style={{
                border: "none",
                borderRadius: 14,
                padding: "11px 12px",
                textAlign: "left",
                cursor: "pointer",
                background: page === "account" ? "rgba(255,255,255,0.12)" : "transparent",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {navIcon("account")}
              {accountLabel}
            </button>
          </div>

          <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, fontWeight: 800, letterSpacing: 1.6, marginBottom: 10 }}>
            CLASSES
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 8, paddingRight: 2 }}>
            {classesByYear.map(([year, yearClasses]) => (
              <div
                key={year}
                style={{
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "10px 10px 8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    cursor: "pointer",
                    marginBottom: expandedYears.has(year) ? 8 : 0,
                  }}
                  onClick={() => onToggleYear(year)}
                >
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                    <ChevronIcon open={expandedYears.has(year)} />
                    {year}
                  </span>
                  {yearClasses.length < forms.length && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        const nextForm = forms.find((form) => !yearClasses.some((cls) => cls.form === form));
                        if (nextForm) onAddClass({ year, form: nextForm });
                      }}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        width: 22,
                        height: 22,
                        background: "rgba(17,201,194,0.18)",
                        color: "#6ff6ea",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <PlusIcon />
                    </button>
                  )}
                </div>

                {expandedYears.has(year) && (
                  <div style={{ display: "grid", gap: 4 }}>
                    {forms.map((form) => {
                      const cls = yearClasses.find((item) => item.form === form);
                      const active = cls && cls.id === activeId && isClassPage;
                      return (
                        <button
                          key={form}
                          onClick={() => {
                            if (cls) {
                              onPickClass(cls);
                            } else {
                              onAddClass({ year, form });
                            }
                          }}
                          style={{
                            border: "none",
                            borderRadius: 12,
                            padding: "9px 10px",
                            textAlign: "left",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            background: active ? "rgba(17,201,194,0.16)" : "rgba(255,255,255,0.04)",
                            color: cls ? "#fff" : "rgba(255,255,255,0.44)",
                            outline: active ? "1px solid rgba(111,246,234,0.35)" : "none",
                          }}
                          title={cls ? cls.name : `${t("selectClass")} ${form} ${year}`}
                        >
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{form}</span>
                          <span
                            style={{
                              borderRadius: 999,
                              padding: cls ? "3px 8px" : "0 4px",
                              background: cls ? "rgba(255,255,255,0.08)" : "transparent",
                              fontSize: 11,
                              fontWeight: 800,
                              color: cls ? "#7ef2e8" : "#6ff6ea",
                            }}
                          >
                            {cls ? cls.studentCount ?? cls.students?.length ?? 0 : "+"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {unorganizedClasses.length > 0 && (
              <div
                style={{
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "10px",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                  {t("unorganized")}
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  {unorganizedClasses.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => onPickClass(cls)}
                      style={{
                        border: "none",
                        borderRadius: 12,
                        padding: "9px 10px",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        background: cls.id === activeId && isClassPage ? "rgba(17,201,194,0.16)" : "rgba(255,255,255,0.04)",
                        color: "#fff",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{cls.name}</span>
                      <span style={{ color: "#7ef2e8", fontSize: 11, fontWeight: 800 }}>
                        {cls.studentCount ?? cls.students?.length ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 16,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, marginBottom: 4 }}>
                Academic Year
              </div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>
                {academicYear}
              </div>
            </div>
            <div style={{ color: "#d6fbf6", display: "flex", alignItems: "center" }}>
              <ChevronIcon open />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
