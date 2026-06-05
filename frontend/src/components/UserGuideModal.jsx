import React, { useEffect, useMemo, useState } from "react";
import { useViewport } from "../utils/useViewport";
import {
  glassPanelStyle,
  pageBackground,
  premiumFontStack,
  primaryButtonStyle,
  softCardStyle,
} from "../utils/designSystem";

function buildGuideSections({
  role,
  canAccessClassData,
  canManageUsers,
  canViewSettings,
  hasActiveClass,
  activeClassLabel,
}) {
  const classLabel = activeClassLabel || "an active class";

  return [
    {
      id: "overview",
      title: "Overview",
      icon: "OV",
      description: "What this portal is for and the fastest way to move around it.",
      points: [
        "Use the sidebar to move between dashboard, classes, results, reports, timetable, and settings.",
        "Use the top search area or press Ctrl+K / Cmd+K to open the command palette.",
        "Open Account to manage your profile, password, and role-specific tools.",
      ],
      actions: [
        { label: "Open Dashboard", action: "dashboard" },
        { label: "Open Search Palette", action: "search" },
        { label: "Open Account", action: "account" },
      ],
    },
    {
      id: "navigation",
      title: "Navigation & Search",
      icon: "NS",
      description: "How to find pages, classes, students, and staff quickly.",
      points: [
        "The command palette searches pages, classes, and managed users from one place.",
        "The sidebar groups classes by academic year, so you can expand a year and select a class directly.",
        "On mobile, use the menu button to open the sidebar and the logout button to sign out quickly.",
      ],
      tips: [
        "Shortcut: Ctrl+K / Cmd+K opens global search.",
        "The top search surface now opens the command palette when clicked on desktop.",
      ],
      actions: [
        { label: "Open Search Palette", action: "search" },
      ],
    },
    canAccessClassData
      ? {
          id: "students",
          title: "Student Entry",
          icon: "ST",
          description: "Daily class operations for adding students, entering marks, and maintaining class records.",
          points: [
            `Open ${classLabel} to manage students, bulk marks, imports, and class-level report instructions.`,
            "Use Bulk Scores for fast mark entry across the whole class.",
            "Use Imports to update existing students safely by CNO and add only new students.",
            "Marks are normalized to the allowed range of 00 to 100.",
          ],
          tips: [
            "Delete student buttons are restricted by role.",
            "Class report instructions (Maagizo) are saved at class level and appear on all report cards for that class.",
          ],
          actions: [
            { label: "Open Students", action: "students", disabled: !hasActiveClass },
            { label: "Open Results", action: "results", disabled: !hasActiveClass },
          ],
        }
      : null,
    canAccessClassData
      ? {
          id: "results",
          title: "Results & Reports",
          icon: "RS",
          description: "How marks become result sheets and report cards.",
          points: [
            "Enter or import marks per exam, then open Results to inspect calculated totals, averages, grades, and division.",
            "Use Reports to open student report cards and result sheets for export or printing.",
            "Composite exams use the configured partner exam logic instead of asking you to re-enter duplicate marks.",
          ],
          tips: [
            "Result sheets are optimized for formal print exports.",
            "Student report cards use the saved school branding and class-specific report instructions.",
          ],
          actions: [
            { label: "Open Reports", action: "reports", disabled: !hasActiveClass },
            { label: "Open Results", action: "results", disabled: !hasActiveClass },
          ],
        }
      : null,
    canAccessClassData
      ? {
          id: "timetable",
          title: "Timetable",
          icon: "TT",
          description: "School-wide timetable setup and class scheduling.",
          points: [
            "Set active days, periods, rooms, teacher availability, and class subject targets before building timetables.",
            "Use the class timetable editor to assign subjects, teachers, and rooms.",
            "The master timetable shows the school-wide schedule grouped by day, form, and stream.",
          ],
          tips: [
            "Teacher and room conflicts are highlighted automatically.",
            "Shared timetable periods such as break or school activities are handled differently from lesson slots.",
          ],
          actions: [
            { label: "Open Timetable", action: "timetable", disabled: !hasActiveClass },
          ],
        }
      : null,
    canManageUsers
      ? {
          id: "people",
          title: "People & Accounts",
          icon: "US",
          description: "Managing real users, teachers, and parent records.",
          points: [
            "Teachers come from real admin-created user accounts.",
            "Parents are derived from guardian information entered during student registration.",
            "Use the People pages to inspect contacts and linked records without editing student marks directly.",
          ],
          actions: [
            { label: "Open Teachers", action: "teachers" },
            { label: "Open Parents", action: "parents" },
          ],
        }
      : null,
    canViewSettings
      ? {
          id: "settings",
          title: "Settings, Backup & Publishing",
          icon: "CF",
          description: "School-wide controls for branding, configuration, publishing, and safety.",
          points: [
            "Use Settings to maintain school identity, export branding, subjects, exam structures, and backups.",
            "Publishing controls decide which classes are visible for public result search.",
            "Backup and restore tools are intended for administrators and protected operations.",
          ],
          actions: [
            { label: "Open Settings", action: "settings", disabled: !hasActiveClass },
          ],
        }
      : null,
  ].filter(Boolean);
}

function GuideActionButton({ item, onRun }) {
  return (
    <button
      type="button"
      disabled={item.disabled}
      onClick={() => onRun(item.action)}
      style={{
        ...(item.disabled
          ? {
              ...softCardStyle({ padding: "10px 14px", radius: 12 }),
              color: "#94a3b8",
              cursor: "not-allowed",
            }
          : {
              ...primaryButtonStyle({ compact: true }),
              background: "linear-gradient(135deg, #2563eb, #0f8b8d)",
              cursor: "pointer",
            }),
        fontSize: 12,
        fontWeight: 800,
        cursor: item.disabled ? "not-allowed" : "pointer",
        fontFamily: premiumFontStack,
      }}
    >
      {item.label}
    </button>
  );
}

export function UserGuideModal({
  onClose,
  role = "",
  canAccessClassData = false,
  canManageUsers = false,
  canViewSettings = false,
  hasActiveClass = false,
  activeClassLabel = "",
  onNavigate,
  onOpenSearch,
}) {
  const { isMobile } = useViewport();
  const [activeTab, setActiveTab] = useState("overview");
  const [query, setQuery] = useState("");
  const uiFont = premiumFontStack;

  const sections = useMemo(
    () =>
      buildGuideSections({
        role,
        canAccessClassData,
        canManageUsers,
        canViewSettings,
        hasActiveClass,
        activeClassLabel,
      }),
    [activeClassLabel, canAccessClassData, canManageUsers, canViewSettings, hasActiveClass, role]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sections;
    return sections.filter((section) => {
      const blob = [
        section.title,
        section.description,
        ...(section.points || []),
        ...(section.tips || []),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(normalized);
    });
  }, [query, sections]);

  useEffect(() => {
    if (!filteredSections.some((section) => section.id === activeTab)) {
      setActiveTab(filteredSections[0]?.id || "overview");
    }
  }, [activeTab, filteredSections]);

  const activeSection =
    filteredSections.find((section) => section.id === activeTab) ||
    filteredSections[0] ||
    sections[0];

  const runAction = (action) => {
    if (action === "search") {
      onClose();
      onOpenSearch?.();
      return;
    }
    onClose();
    onNavigate?.(action);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(15,23,42,0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 40,
        fontFamily: uiFont,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          ...glassPanelStyle({ compact: isMobile, dense: isMobile, radius: isMobile ? 0 : 28, padding: 0 }),
          borderRadius: isMobile ? 0 : 24,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
          maxHeight: isMobile ? "100dvh" : "88vh",
          minHeight: isMobile ? "100dvh" : "auto",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            width: isMobile ? "100%" : 300,
            background: isMobile ? pageBackground : "rgba(248,250,252,0.84)",
            borderRight: isMobile ? "none" : "1px solid #e2e8f0",
            borderBottom: isMobile ? "1px solid #e2e8f0" : "none",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              padding: isMobile
                ? "max(18px, env(safe-area-inset-top)) 16px 14px"
                : "24px 20px 16px",
              position: "sticky",
              top: 0,
              zIndex: 2,
              background: "rgba(248,250,252,0.94)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 800, color: "#0f172a" }}>
              User Guide
            </h2>
            <p style={{ margin: "4px 0 10px", fontSize: isMobile ? 12 : 13, color: "#64748b" }}>
              Practical help for your current role and workflow.
            </p>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guide topics..."
              style={{
                width: "100%",
                ...softCardStyle({ padding: "10px 12px", radius: 12 }),
                fontSize: 13,
                boxSizing: "border-box",
                fontFamily: uiFont,
              }}
            />
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              padding: isMobile ? "0 10px 12px" : "0 12px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "row" : "column",
                gap: isMobile ? 8 : 4,
                overflowX: "auto",
                paddingBottom: isMobile ? 8 : 0,
                scrollSnapType: isMobile ? "x proximity" : "none",
                overscrollBehaviorX: isMobile ? "contain" : "auto",
              }}
            >
              {filteredSections.map((section) => {
                const isActive = activeTab === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: isMobile ? "auto" : "100%",
                      padding: isMobile ? "12px 14px" : "12px 16px",
                      border: "none",
                      background: isActive ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.36)",
                      color: isActive ? "#1d4ed8" : "#475569",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: isActive ? 800 : 600,
                      fontSize: 14,
                      transition: "all 0.2s",
                      whiteSpace: isMobile ? "nowrap" : "normal",
                      minWidth: isMobile ? 176 : "100%",
                      minHeight: isMobile ? 44 : "auto",
                      flexShrink: 0,
                      scrollSnapAlign: isMobile ? "start" : "none",
                    }}
                  >
                    <span
                      style={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: 9,
                        background: isActive ? "rgba(37,99,235,0.18)" : "rgba(226,232,240,0.9)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {section.icon}
                    </span>
                    <span style={{ display: "grid", gap: 2 }}>
                      <span>{section.title}</span>
                      {!isMobile && (
                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                          {section.description}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}

              {!filteredSections.length && (
                <div style={{ padding: "12px 8px", fontSize: 13, color: "#64748b" }}>
                  No guide sections match "{query}".
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: isMobile
                ? "max(18px, env(safe-area-inset-top)) 16px 18px"
                : "24px 32px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "center",
              flexDirection: isMobile ? "column" : "row",
              gap: 12,
              position: "sticky",
              top: 0,
              zIndex: 2,
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobile ? 19 : 22,
                  fontWeight: 800,
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    minWidth: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "#e2e8f0",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {activeSection?.icon || "UG"}
                </span>
                {activeSection?.title || "Guide"}
              </h3>
              <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>
                Role: <strong style={{ color: "#0f172a" }}>{role || "staff"}</strong>
                {hasActiveClass ? ` | Active class: ${activeClassLabel}` : ""}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                border: "none",
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748b",
                fontWeight: 800,
                fontSize: 16,
                flexShrink: 0,
                alignSelf: isMobile ? "stretch" : "auto",
                borderRadius: isMobile ? 12 : "50%",
                width: isMobile ? "100%" : 32,
              }}
              title="Close Guide"
            >
              {isMobile ? "Close Guide" : "X"}
            </button>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              padding: isMobile
                ? "18px 16px max(24px, env(safe-area-inset-bottom))"
                : "28px 32px 32px",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              fontSize: isMobile ? 14 : 15,
              color: "#334155",
              lineHeight: 1.6,
            }}
          >
            {activeSection && (
              <>
                <div
                  style={{
                    ...softCardStyle({ padding: "16px 18px", radius: 18 }),
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
                    Why this section matters
                  </div>
                  <div style={{ fontSize: 14, color: "#475569" }}>{activeSection.description}</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                    Key steps
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {activeSection.points.map((point) => (
                      <li key={point} style={{ marginBottom: 8 }}>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {activeSection.tips?.length ? (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                      Tips
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {activeSection.tips.map((tip) => (
                        <div
                          key={tip}
                          style={{
                            ...softCardStyle({ padding: "12px 14px", radius: 14 }),
                            background: "linear-gradient(180deg, rgba(239,246,255,0.98), rgba(224,242,254,0.82))",
                            color: "#1e3a8a",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeSection.actions?.length ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                      Quick actions
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, max-content))",
                        gap: 10,
                        alignItems: "start",
                      }}
                    >
                      {activeSection.actions.map((item) => (
                        <GuideActionButton key={`${activeSection.id}-${item.label}`} item={item} onRun={runAction} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
