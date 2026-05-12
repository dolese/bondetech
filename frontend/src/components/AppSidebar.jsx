import { useMemo } from "react";
import { useI18n } from "../i18n";

function currentAcademicYear(classesByYear) {
  const years = classesByYear.map(([year]) => String(year || "")).filter(Boolean).sort();
  return years[years.length - 1] || new Date().getFullYear().toString();
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
    case "student-management":
      return (
        <SvgIcon>
          <rect x="4.5" y="4.5" width="15" height="15" rx="2.4" />
          <circle cx="9" cy="10" r="2.2" />
          <path d="M6.5 16c.8-2 4.2-2 5 0" />
          <path d="M15.5 8.5h3" />
          <path d="M15.5 12h3" />
          <path d="M15.5 15.5h2.2" />
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
    case "timetable":
      return (
        <SvgIcon>
          <rect x="4.5" y="5" width="15" height="14" rx="2.4" />
          <path d="M8 3.8v3" />
          <path d="M16 3.8v3" />
          <path d="M4.5 9.2h15" />
          <path d="M8 12.4h3" />
          <path d="M13.2 12.4h2.8" />
          <path d="M8 15.8h2.8" />
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
    case "teachers":
      return (
        <SvgIcon>
          <path d="M3.5 8 12 4l8.5 4-8.5 4-8.5-4Z" />
          <path d="M7 10.2v4.3c0 1.6 2.2 3 5 3s5-1.4 5-3v-4.3" />
          <path d="M20 9.5v5" />
        </SvgIcon>
      );
    case "parents":
      return (
        <SvgIcon>
          <circle cx="8" cy="8" r="2.5" />
          <circle cx="16" cy="8" r="2.5" />
          <path d="M3.8 18c1-2.7 7.4-2.7 8.4 0" />
          <path d="M11.8 18c1-2.7 7.4-2.7 8.4 0" />
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
  streams = [],
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
  const streamSequence = streams.length ? streams : ["A", "B", "C", "D", "E", "F"];
  const shellShadow = "0 24px 60px rgba(2, 12, 27, 0.34)";
  const panelSurface = "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.045))";
  const panelBorder = "1px solid rgba(255,255,255,0.1)";
  const panelInset = "inset 0 1px 0 rgba(255,255,255,0.08)";
  const sectionLabelStyle = {
    color: "rgba(226,247,244,0.58)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.9,
    padding: "0 4px",
  };
  const navSections = useMemo(() => {
    const visible = new Map(navItems.map((item) => [item.key, item]));
    const sectionOrder = [
      {
        title: t("academicsSection").toUpperCase(),
        items: ["students", "student-management", "teachers", "results", "timetable"],
      },
      {
        title: t("communicationSection").toUpperCase(),
        items: ["parents"],
      },
      {
        title: t("reportsSection").toUpperCase(),
        items: ["reports"],
      },
      {
        title: t("systemSection").toUpperCase(),
        items: ["settings", "account"],
      },
    ];
    return sectionOrder
      .map((section) => ({
        ...section,
        items: section.items
          .map((key) => (key === "account" ? { key: "account", label: accountLabel, requiresClass: false } : visible.get(key)))
          .filter(Boolean),
      }))
      .filter((section) => section.items.length > 0);
  }, [accountLabel, navItems, t]);

  const renderNavButton = (item) => {
    const active = page === item.key;
    const disabled = item.requiresClass !== false && !activeClass;
    return (
      <button
        key={item.key}
        id={`nav-${item.key}`}
        onClick={() => {
          if (!disabled) {
            onSetPage(item.key);
            onClose();
          }
        }}
        disabled={disabled}
        style={{
          border: "none",
          borderRadius: 16,
          padding: "10px 12px",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.42 : 1,
          background: active
            ? "linear-gradient(135deg, rgba(30, 196, 184, 0.28), rgba(29, 126, 168, 0.22))"
            : "rgba(255,255,255,0.035)",
          color: active ? "#fff" : "rgba(255,255,255,0.88)",
          fontSize: 14,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          boxShadow: active
            ? "inset 0 0 0 1px rgba(130,248,236,0.18), 0 12px 26px rgba(6, 37, 52, 0.18)"
            : "inset 0 1px 0 rgba(255,255,255,0.03)",
          transition: "background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            color: active ? "#dffef8" : "rgba(214, 251, 246, 0.86)",
            background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
            boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
            flexShrink: 0,
          }}
        >
          {navIcon(item.key)}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
        {active && (
          <span
            style={{
              marginLeft: "auto",
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "#7ef2e8",
              boxShadow: "0 0 0 4px rgba(126,242,232,0.16)",
              flexShrink: 0,
            }}
          />
        )}
      </button>
    );
  };

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
            "radial-gradient(circle at 12% 0%, rgba(34,211,196,0.24), transparent 24%), radial-gradient(circle at 86% 14%, rgba(59,130,246,0.16), transparent 18%), linear-gradient(180deg, #082f45 0%, #07293c 34%, #061e31 100%)",
          flexShrink: 0,
          boxShadow: shellShadow,
        }}
      >
        <div
          style={{
            width: 248,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
            padding: "16px 14px 16px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "grid",
              justifyItems: "center",
              gap: 11,
              padding: "14px 12px 18px",
              borderRadius: 26,
              background: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: `${panelInset}, 0 18px 34px rgba(0,0,0,0.16)`,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 94,
                height: 94,
                borderRadius: "50%",
                background: "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(231,244,255,0.94))",
                border: "4px solid rgba(255,255,255,0.18)",
                boxShadow: "0 18px 32px rgba(0,0,0,0.2)",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              <img
                src="/asset/bonde.png"
                alt="Bonde Secondary School logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: "rgba(127, 243, 232, 0.12)",
                  color: "#bffbf2",
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  marginBottom: 10,
                }}
              >
                BONDE OS
              </div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, letterSpacing: -0.3 }}>{t("resultSystem")}</div>
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12.5, marginTop: 4 }}>{t("administrativeWorkspace")}</div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingRight: 2 }}>
            <button
              id="nav-dashboard"
              onClick={() => {
                onSetPage("dashboard");
                onClose();
              }}
              style={{
                border: "none",
                borderRadius: 18,
                padding: "14px 16px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background:
                  page === "dashboard"
                    ? "linear-gradient(135deg, rgba(29,196,184,0.94), rgba(26,127,170,0.94))"
                    : panelSurface,
                border: page === "dashboard" ? "1px solid rgba(140,251,241,0.16)" : panelBorder,
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                boxShadow:
                  page === "dashboard"
                    ? "0 16px 30px rgba(16, 121, 152, 0.28), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : `${panelInset}, 0 14px 30px rgba(0,0,0,0.12)`,
                marginBottom: 18,
                width: "100%",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: page === "dashboard" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                  flexShrink: 0,
                }}
              >
                {navIcon("dashboard")}
              </span>
              <span>{t("dashboard")}</span>
              <span
                style={{
                  marginLeft: "auto",
                  color: "rgba(255,255,255,0.86)",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 1.1,
                }}
              >
                  {t("homeBadge").toUpperCase()}
                </span>
              </button>

            <div style={{ display: "grid", gap: 12, marginBottom: 14 }}>
              {navSections.map((section) => (
                <div
                  key={section.title}
                  style={{
                    borderRadius: 20,
                    background: panelSurface,
                    border: panelBorder,
                    boxShadow: `${panelInset}, 0 14px 30px rgba(0,0,0,0.12)`,
                    padding: "11px 10px 9px",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0 4px" }}>
                    <div style={sectionLabelStyle}>{section.title}</div>
                    <span
                      style={{
                        minWidth: 24,
                        height: 24,
                        padding: "0 8px",
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.05)",
                        color: "rgba(223,254,248,0.82)",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {section.items.length}
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {section.items.map(renderNavButton)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...sectionLabelStyle, marginBottom: 10 }}>
              {t("classesSection").toUpperCase()}
            </div>

            <div id="nav-classes-group" style={{ display: "grid", gap: 8 }}>
              {classesByYear.map(([year, yearClasses]) => (
                <div
                  key={year}
                  style={{
                    borderRadius: 20,
                    background: panelSurface,
                    border: panelBorder,
                    boxShadow: `${panelInset}, 0 14px 30px rgba(0,0,0,0.12)`,
                    padding: "11px 10px 9px",
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
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 6 }}>
                      <ChevronIcon open={expandedYears.has(year)} />
                      {year}
                    </span>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        const nextForm =
                          forms.find(
                            (form) =>
                              !yearClasses.some(
                                (cls) =>
                                  cls.form === form &&
                                  String(cls.stream || "").trim().toUpperCase() === streamSequence[0],
                              ),
                          ) || forms[0];
                        const usedStreams = yearClasses
                          .filter((cls) => cls.form === nextForm)
                          .map((cls) => String(cls.stream || "").trim().toUpperCase());
                        const nextStream =
                          streamSequence.find((candidate) => !usedStreams.includes(candidate)) ||
                          streamSequence[streamSequence.length - 1];
                        onAddClass({ year, form: nextForm, stream: nextStream });
                      }}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        width: 26,
                        height: 26,
                        background: "rgba(17,201,194,0.16)",
                        color: "#96f8ef",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                      }}
                    >
                      <PlusIcon />
                    </button>
                  </div>

                  {expandedYears.has(year) && (
                    <div style={{ display: "grid", gap: 4 }}>
                      {forms.map((form) => {
                        const formClasses = yearClasses
                          .filter((item) => item.form === form)
                          .sort((left, right) =>
                            String(left.stream || "").localeCompare(String(right.stream || ""), "en"),
                          );
                        const formHasAny = formClasses.length > 0;
                        const representativeClass = formClasses[0] || null;
                        const totalStudents = formClasses.reduce(
                          (sum, cls) => sum + Number(cls.studentCount ?? cls.students?.length ?? 0),
                          0,
                        );
                        const active = formClasses.some((cls) => cls.id === activeId) && isClassPage;
                        return (
                          <div
                            key={form}
                            style={{
                              borderRadius: 14,
                              padding: "8px",
                              display: "grid",
                              gap: 7,
                              background: "rgba(255,255,255,0.035)",
                              color: "#fff",
                            }}
                          >
                            {formHasAny ? (
                              <button
                                onClick={() => representativeClass && onPickClass(representativeClass)}
                                style={{
                                  border: "none",
                                  borderRadius: 14,
                                  padding: "10px 12px",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  background: active
                                    ? "linear-gradient(135deg, rgba(29,196,184,0.22), rgba(29,126,168,0.18))"
                                    : "rgba(255,255,255,0.055)",
                                  color: "#fff",
                                  outline: active ? "1px solid rgba(111,246,234,0.26)" : "none",
                                  boxShadow: active ? "0 10px 22px rgba(8, 36, 50, 0.16)" : "none",
                                }}
                                title={`${form} ${year}`}
                              >
                                <span style={{ fontSize: 13, fontWeight: 800 }}>{form}</span>
                                <span
                                  style={{
                                    minWidth: 28,
                                    height: 24,
                                    padding: "0 8px",
                                    borderRadius: 999,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "rgba(255,255,255,0.08)",
                                    color: "#7ef2e8",
                                    fontSize: 11,
                                    fontWeight: 900,
                                  }}
                                >
                                  {totalStudents}
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onAddClass({ year, form, stream: streamSequence[0] })}
                                style={{
                                  border: "1px dashed rgba(111,246,234,0.28)",
                                  borderRadius: 12,
                                  padding: "8px 10px",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  background: "rgba(255,255,255,0.02)",
                                  color: "rgba(255,255,255,0.62)",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                Create {form}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {unorganizedClasses.length > 0 && (
                <div
                  style={{
                    borderRadius: 20,
                    background: panelSurface,
                    border: panelBorder,
                    boxShadow: `${panelInset}, 0 14px 30px rgba(0,0,0,0.12)`,
                    padding: "10px",
                  }}
                >
                  <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
                    {t("unorganized")}
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {unorganizedClasses.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => onPickClass(cls)}
                        style={{
                          border: "none",
                          borderRadius: 14,
                          padding: "9px 10px",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          background:
                            cls.id === activeId && isClassPage
                              ? "linear-gradient(135deg, rgba(29,196,184,0.22), rgba(29,126,168,0.18))"
                              : "rgba(255,255,255,0.05)",
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
          </div>

          <div
            style={{
              marginTop: 16,
              borderRadius: 22,
              border: panelBorder,
              background: "linear-gradient(135deg, rgba(14, 160, 150, 0.22), rgba(14, 92, 126, 0.24))",
              padding: "15px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 34px rgba(0,0,0,0.18)",
            }}
          >
            <div>
              <div style={{ color: "rgba(231,255,251,0.72)", fontSize: 11, fontWeight: 800, letterSpacing: 1.1, marginBottom: 4 }}>
                Academic Year
              </div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>
                {academicYear}
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 16,
                background: "rgba(255,255,255,0.1)",
                color: "#d6fbf6",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ChevronIcon open />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
