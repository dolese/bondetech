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

function ChevronIcon({ open = false, width = 14, height = 14 }) {
  return (
    <SvgIcon width={width} height={height} strokeWidth={2.3}>
      {open ? <path d="m6 9 6 6 6-6" /> : <path d="m9 6 6 6-6 6" />}
    </SvgIcon>
  );
}

function PlusIcon() {
  return (
    <SvgIcon width={14} height={14} strokeWidth={2.3}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </SvgIcon>
  );
}

function navIcon(key) {
  switch (key) {
    case "dashboard":
      return (
        <SvgIcon>
          <path d="M4 11.8 12 5l8 6.8" />
          <path d="M7 10.7v8.3h10v-8.3" />
        </SvgIcon>
      );
    case "students":
      return (
        <SvgIcon>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.7 18c1.3-3.2 9.3-3.2 10.6 0" />
          <path d="M18 8v6" />
          <path d="M15 11h6" />
        </SvgIcon>
      );
    case "student-management":
      return (
        <SvgIcon>
          <rect x="4.5" y="4.5" width="15" height="15" rx="2.8" />
          <path d="M9 9h2.2" />
          <path d="M9 13h2.2" />
          <path d="M14 9h2.5" />
          <path d="M14 13h2.5" />
          <path d="M9 17h7.5" />
        </SvgIcon>
      );
    case "teachers":
      return (
        <SvgIcon>
          <path d="M3.5 8 12 4l8.5 4-8.5 4-8.5-4Z" />
          <path d="M7 10.3v4.4c0 1.6 2.2 2.9 5 2.9s5-1.3 5-2.9v-4.4" />
          <path d="M20 9.6v5" />
        </SvgIcon>
      );
    case "results":
      return (
        <SvgIcon>
          <rect x="5.5" y="4.5" width="13" height="15" rx="2.3" />
          <path d="M8.5 8.5h7" />
          <path d="M8.5 12h7" />
          <path d="M8.5 15.5h4.5" />
        </SvgIcon>
      );
    case "timetable":
      return (
        <SvgIcon>
          <rect x="4.5" y="5" width="15" height="14" rx="2.5" />
          <path d="M8 3.8v3" />
          <path d="M16 3.8v3" />
          <path d="M4.5 9.2h15" />
          <path d="M8 12.4h2.5" />
          <path d="M13.2 12.4h2.8" />
          <path d="M8 15.8h4.2" />
        </SvgIcon>
      );
    case "parents":
      return (
        <SvgIcon>
          <circle cx="8" cy="9" r="2.5" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M3.8 18c1-2.6 7.4-2.6 8.4 0" />
          <path d="M11.8 18c1-2.6 7.4-2.6 8.4 0" />
        </SvgIcon>
      );
    case "reports":
      return (
        <SvgIcon>
          <path d="M6 18V9" />
          <path d="M11 18V5" />
          <path d="M16 18v-7" />
          <path d="M21 18v-4" />
        </SvgIcon>
      );
    case "settings":
      return (
        <SvgIcon>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.8a7 7 0 0 0-1.7-1L14.5 3h-5L9 5.8a7 7 0 0 0-1.7 1L4.9 6l-2 3.5L5 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.5 2.4-.8a7 7 0 0 0 1.7 1l.5 2.8h5l.5-2.8a7 7 0 0 0 1.7-1l2.4.8 2-3.5L18.9 13c.1-.3.1-.7.1-1Z" />
        </SvgIcon>
      );
    case "account":
      return (
        <SvgIcon>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.2 18c1.4-3.8 12.2-3.8 13.6 0" />
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

function sectionLabelStyle() {
  return {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  };
}

function buildNavSections(navItems, accountLabel, accountSubtitle, t) {
  const visible = new Map(navItems.map((item) => [item.key, item]));
  const sectionOrder = [
    {
      title: t("academicsSection"),
      items: ["students", "student-management", "teachers", "results", "timetable"],
    },
    {
      title: t("communicationSection"),
      items: ["parents"],
    },
    {
      title: t("reportsSection"),
      items: ["reports"],
    },
    {
      title: t("systemSection"),
      items: ["settings", "account"],
    },
  ];

  return sectionOrder
    .map((section) => ({
      ...section,
      items: section.items
        .map((key) =>
          key === "account"
            ? { key: "account", label: accountLabel, requiresClass: false, subtitle: accountSubtitle }
            : visible.get(key)
        )
        .filter(Boolean),
    }))
    .filter((section) => section.items.length > 0);
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
  accountSubtitle,
  navItems,
  canCreateClasses = false,
  classesHeading,
  onClose,
  onToggleYear,
  onAddClass,
  onPickClass,
  onSetPage,
}) {
  const { t } = useI18n();
  const academicYear = useMemo(() => currentAcademicYear(classesByYear), [classesByYear]);
  const streamSequence = streams.length ? streams : ["A", "B", "C", "D", "E", "F"];
  const navSections = useMemo(
    () => buildNavSections(navItems, accountLabel, accountSubtitle, t),
    [accountLabel, accountSubtitle, navItems, t]
  );

  const navButtonStyle = (active, disabled, hasSubtitle = false) => ({
    border: "none",
    borderRadius: active ? 20 : 18,
    padding: hasSubtitle ? "12px 14px" : "10px 12px",
    textAlign: "left",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.46 : 1,
    background: active ? "linear-gradient(135deg, #edf4ff, #f5f9ff)" : "transparent",
    color: active ? "#2563eb" : "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    boxShadow: active ? "0 14px 30px rgba(37,99,235,0.10), inset 0 1px 0 rgba(255,255,255,0.92)" : "none",
    transition: "background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
  });

  const renderNavButton = (item) => {
    const active = page === item.key;
    const disabled = item.requiresClass !== false && !activeClass;
    const subtitle = item.subtitle || "";
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
        style={navButtonStyle(active, disabled, Boolean(subtitle))}
      >
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            color: "#2563eb",
            background: active ? "rgba(37,99,235,0.10)" : "linear-gradient(180deg, #f8fbff, #f1f5ff)",
            border: "1px solid rgba(226,232,240,0.72)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
            flexShrink: 0,
          }}
        >
          {navIcon(item.key)}
        </span>
        <span style={{ minWidth: 0, display: "grid", gap: subtitle ? 4 : 0 }}>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 15,
              fontWeight: active ? 900 : 800,
              color: active ? "#2563eb" : "#0f172a",
            }}
          >
            {item.key === "dashboard" ? t("dashboard") : item.label}
          </span>
          {subtitle ? (
            <span
              style={{
                fontSize: 12,
                color: "#94a3b8",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: 600,
              }}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
      </button>
    );
  };

  return (
    <>
      {isMobile && sideOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.28)", zIndex: 19 }}
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
          background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
          flexShrink: 0,
          boxShadow: "0 24px 54px rgba(15,23,42,0.12)",
          borderRight: "1px solid rgba(226,232,240,0.9)",
        }}
      >
        <div
          style={{
            width: 282,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
            padding: isMobile ? "22px 18px 18px" : "26px 22px 20px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "4px 4px 18px",
            }}
          >
            <div
              style={{
                width: 66,
                height: 66,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#fff",
                border: "1px solid rgba(226,232,240,0.9)",
                boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
                flexShrink: 0,
              }}
            >
              <img
                src="/asset/bonde.png"
                alt="Bonde Secondary School logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
                BONDE OS
              </div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginTop: 4 }}>
                {t("resultSystem")}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingRight: 2 }}>
            <div style={{ display: "grid", gap: 4 }}>
              {renderNavButton({ key: "dashboard", label: t("dashboard"), requiresClass: false })}
            </div>

            <div style={{ display: "grid", gap: 18, marginTop: 20 }}>
              {navSections.map((section) => (
                <div key={section.title} style={{ display: "grid", gap: 12 }}>
                  <div style={{ ...sectionLabelStyle(), padding: "0 6px" }}>{section.title}</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {section.items.map(renderNavButton)}
                  </div>
                  <div style={{ height: 1, background: "linear-gradient(90deg, rgba(226,232,240,0), rgba(226,232,240,1), rgba(226,232,240,0))" }} />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ ...sectionLabelStyle(), padding: "0 6px", marginBottom: 12 }}>
                {(classesHeading || t("classesSection")).toUpperCase()}
              </div>

              <div
                id="nav-classes-group"
                style={{
                  borderRadius: 24,
                  border: "1px solid rgba(226,232,240,0.92)",
                  background: "linear-gradient(180deg, #fcfdff, #f7faff)",
                  boxShadow: "0 14px 34px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.92)",
                  padding: "12px",
                  display: "grid",
                  gap: 10,
                }}
              >
                {classesByYear.map(([year, yearClasses]) => (
                  <div
                    key={year}
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(226,232,240,0.92)",
                      background: "#ffffff",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
                      padding: "10px",
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
                      <span style={{ color: "#0f172a", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
                        <ChevronIcon open={expandedYears.has(year)} width={13} height={13} />
                        {year}
                      </span>
                      {canCreateClasses ? (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            const nextForm =
                              forms.find(
                                (form) =>
                                  !yearClasses.some(
                                    (cls) =>
                                      cls.form === form &&
                                      String(cls.stream || "").trim().toUpperCase() === streamSequence[0]
                                  )
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
                            borderRadius: 12,
                            width: 30,
                            height: 30,
                            background: "#eff6ff",
                            color: "#2563eb",
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <PlusIcon />
                        </button>
                      ) : null}
                    </div>

                    {expandedYears.has(year) ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        {forms.map((form) => {
                          const formClasses = yearClasses
                            .filter((item) => item.form === form)
                            .sort((left, right) =>
                              String(left.stream || "").localeCompare(String(right.stream || ""), "en")
                            );
                          const formHasAny = formClasses.length > 0;
                          const representativeClass = formClasses[0] || null;
                          const totalStudents = formClasses.reduce(
                            (sum, cls) => sum + Number(cls.studentCount ?? cls.students?.length ?? 0),
                            0
                          );
                          const active = formClasses.some((cls) => cls.id === activeId) && isClassPage;

                          return formHasAny ? (
                            <button
                              key={form}
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
                                background: active ? "linear-gradient(135deg, #edf4ff, #f5f9ff)" : "#f8fbff",
                                color: active ? "#2563eb" : "#0f172a",
                                boxShadow: active ? "0 10px 24px rgba(37,99,235,0.10)" : "none",
                              }}
                              title={`${form} ${year}`}
                            >
                              <span style={{ fontSize: 13, fontWeight: active ? 900 : 800 }}>{form}</span>
                              <span
                                style={{
                                  minWidth: 30,
                                  height: 24,
                                  padding: "0 8px",
                                  borderRadius: 999,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: active ? "rgba(37,99,235,0.12)" : "#ffffff",
                                  color: active ? "#2563eb" : "#64748b",
                                  fontSize: 11,
                                  fontWeight: 900,
                                  border: "1px solid rgba(226,232,240,0.84)",
                                }}
                              >
                                {totalStudents}
                              </span>
                            </button>
                          ) : canCreateClasses ? (
                            <button
                              key={form}
                              onClick={() => onAddClass({ year, form, stream: streamSequence[0] })}
                              style={{
                                border: "1px dashed rgba(148,163,184,0.55)",
                                borderRadius: 12,
                                padding: "9px 10px",
                                textAlign: "left",
                                cursor: "pointer",
                                background: "#ffffff",
                                color: "#64748b",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              Create {form}
                            </button>
                          ) : (
                            <div
                              key={form}
                              style={{
                                border: "1px dashed rgba(203,213,225,0.85)",
                                borderRadius: 12,
                                padding: "9px 10px",
                                color: "#94a3b8",
                                fontSize: 12,
                                fontWeight: 700,
                                background: "#ffffff",
                              }}
                            >
                              No assigned stream
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}

                {unorganizedClasses.length > 0 ? (
                  <div
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(226,232,240,0.92)",
                      background: "#ffffff",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
                      padding: "10px",
                    }}
                  >
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
                      {t("unorganized")}
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
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
                            background: cls.id === activeId && isClassPage ? "linear-gradient(135deg, #edf4ff, #f5f9ff)" : "#f8fbff",
                            color: cls.id === activeId && isClassPage ? "#2563eb" : "#0f172a",
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 800 }}>{cls.name}</span>
                          <span style={{ color: "#64748b", fontSize: 11, fontWeight: 900 }}>
                            {cls.studentCount ?? cls.students?.length ?? 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              borderRadius: 24,
              border: "1px solid rgba(226,232,240,0.92)",
              background: "linear-gradient(180deg, #fcfdff, #f7faff)",
              boxShadow: "0 16px 36px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
              padding: "16px",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={sectionLabelStyle()}>Academic Year</div>
            <div
              style={{
                height: 48,
                borderRadius: 16,
                border: "1px solid rgba(226,232,240,0.92)",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px",
                color: "#0f172a",
                fontSize: 15,
                fontWeight: 900,
                boxShadow: "0 10px 26px rgba(15,23,42,0.04)",
              }}
            >
              <span>{academicYear}</span>
              <span style={{ color: "#64748b" }}>
                <ChevronIcon open width={15} height={15} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
