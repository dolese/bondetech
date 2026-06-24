import React, { useEffect, useMemo, useState } from "react";
import { AnalysisPanel } from "./AnalysisPanel";
import { ResultSheet } from "./ResultSheet";
import { useViewport } from "../utils/useViewport";
import { useI18n } from "../i18n";
import { glassPanelStyle, pillStyle } from "../utils/designSystem";
import { buildFormWorkspace } from "../utils/formClassAggregation";

const FORM_ORDER = ["Form I", "Form II", "Form III", "Form IV"];

function compareForms(left, right) {
  const leftIndex = FORM_ORDER.indexOf(String(left || "").trim());
  const rightIndex = FORM_ORDER.indexOf(String(right || "").trim());
  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  }
  return String(left || "").localeCompare(String(right || ""), undefined, { numeric: true, sensitivity: "base" });
}

function TabIcon({ children }) {
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
      {children}
    </svg>
  );
}

function ChartIcon() {
  return (
    <TabIcon>
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-8" />
      <path d="M22 19v-3" />
    </TabIcon>
  );
}

function SheetIcon() {
  return (
    <TabIcon>
      <rect x="5" y="4" width="14" height="16" rx="2.4" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </TabIcon>
  );
}

export function ResultsPage({
  classData,
  computed,
  allClasses = [],
  onOpenReportCard,
  onHydrateClasses,
}) {
  const [tab, setTab] = useState("analysis");
  const [selectedForm, setSelectedForm] = useState(() => String(classData?.form || "").trim());
  const [isFormLoading, setIsFormLoading] = useState(false);
  const { isMobile } = useViewport();
  const { t } = useI18n();
  const topOffset = isMobile ? 52 : 46;
  const panel = glassPanelStyle({
    compact: isMobile,
    dense: isMobile,
    padding: isMobile ? 12 : 16,
    radius: 22,
  });

  const tabs = [
    { key: "analysis", label: t("resultsTabAnalysis", "Analysis"), icon: <ChartIcon /> },
    { key: "sheet", label: t("resultsTabSheet", "Result Sheet"), icon: <SheetIcon /> },
  ];
  const targetYear = String(classData?.year || "").trim();
  const availableForms = useMemo(() => {
    const forms = Array.from(
      new Set(
        (allClasses || [])
          .filter((cls) => String(cls.year || "").trim() === targetYear)
          .map((cls) => String(cls.form || "").trim())
          .filter(Boolean),
      ),
    );
    return forms.sort(compareForms);
  }, [allClasses, targetYear]);

  useEffect(() => {
    if (!availableForms.length) {
      if (selectedForm !== String(classData?.form || "").trim()) {
        setSelectedForm(String(classData?.form || "").trim());
      }
      return;
    }
    if (!selectedForm || !availableForms.includes(selectedForm)) {
      setSelectedForm(
        availableForms.includes(String(classData?.form || "").trim())
          ? String(classData?.form || "").trim()
          : availableForms[0],
      );
    }
  }, [availableForms, classData?.form, selectedForm]);

  const selectedFormClasses = useMemo(
    () =>
      (allClasses || []).filter(
        (cls) =>
          String(cls.year || "").trim() === targetYear &&
          String(cls.form || "").trim() === String(selectedForm || "").trim(),
      ),
    [allClasses, selectedForm, targetYear],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateForm = async () => {
      if (!onHydrateClasses || !selectedFormClasses.length) {
        setIsFormLoading(false);
        return;
      }
      const needsHydration = selectedFormClasses.filter((cls) => !(cls.students?.length));
      if (!needsHydration.length) {
        setIsFormLoading(false);
        return;
      }
      setIsFormLoading(true);
      try {
        await onHydrateClasses(needsHydration.map((cls) => cls.id));
      } catch (error) {
        console.error("[ResultsPage] Failed to hydrate form workspace", error);
      } finally {
        if (!cancelled) setIsFormLoading(false);
      }
    };

    hydrateForm();
    return () => {
      cancelled = true;
    };
  }, [onHydrateClasses, selectedFormClasses]);

  const localFormWorkspace = useMemo(() => {
    if (!selectedFormClasses.length) return null;
    const anchorClass = selectedFormClasses[0];
    return buildFormWorkspace(
      selectedFormClasses,
      anchorClass,
      classData?.school_info?.exam || "",
    );
  }, [classData?.school_info?.exam, selectedFormClasses]);

  const activeWorkspace =
    localFormWorkspace && String(selectedForm || "").trim()
      ? localFormWorkspace
      : { classData, computed };
  const activeClassData = activeWorkspace.classData || classData;
  const activeComputed = activeWorkspace.computed || computed;
  const streamCount = selectedFormClasses.length || 1;
  const totalStudents = activeClassData?.students?.length ?? activeComputed?.length ?? 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        background: "#f4f7ff",
      }}
    >
      <div
        style={{
          ...panel,
          display: "grid",
          gap: 12,
          margin: isMobile ? 10 : 14,
          marginBottom: 0,
          position: "sticky",
          top: topOffset,
          zIndex: 15,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
            <div>
            <div style={{ ...pillStyle({ tone: "blue" }), display: "inline-flex" }}>
              {t("resultSheets", "Result Sheets")}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: isMobile ? 20 : 24,
                fontWeight: 800,
                color: "#102a43",
              }}
            >
              {activeClassData?.form || classData.form} {activeClassData?.year || classData.year}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#607086" }}>
              View form-wide analysis and official result sheets across all streams in one workspace.
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gap: 8,
              width: isMobile ? "100%" : "minmax(280px, auto)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "minmax(180px, 220px) auto auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <label
                style={{
                  display: "grid",
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {t("resultsFormContext", "Form Context")}
                </span>
                <select
                  value={selectedForm}
                  onChange={(event) => setSelectedForm(event.target.value)}
                  disabled={!availableForms.length}
                  style={{
                    minHeight: 42,
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,0.28)",
                    background: "rgba(255,255,255,0.92)",
                    padding: "0 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0f172a",
                    outline: "none",
                  }}
                >
                  {(availableForms.length ? availableForms : [String(classData?.form || "").trim()].filter(Boolean)).map((form) => (
                    <option key={form} value={form}>
                      {[form, targetYear].filter(Boolean).join(" ")}
                    </option>
                  ))}
                </select>
              </label>
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(191,219,254,0.6)",
                  background: "rgba(239,246,255,0.88)",
                  padding: "10px 12px",
                  minWidth: isMobile ? "100%" : 120,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t("resultsActiveStreams", "Active Streams")}
                </div>
                <div style={{ marginTop: 3, fontSize: 18, fontWeight: 800, color: "#102a43" }}>{streamCount}</div>
              </div>
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(191,219,254,0.6)",
                  background: "rgba(255,255,255,0.92)",
                  padding: "10px 12px",
                  minWidth: isMobile ? "100%" : 140,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t("resultsStudents", "Students")}
                </div>
                <div style={{ marginTop: 3, fontSize: 18, fontWeight: 800, color: "#102a43" }}>{totalStudents}</div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                width: "100%",
              }}
            >
            {tabs.map((btn) => {
              const active = tab === btn.key;
              return (
                <button
                  key={btn.key}
                  onClick={() => setTab(btn.key)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: active
                      ? "1px solid rgba(14,116,144,0.22)"
                      : "1px solid rgba(148,163,184,0.24)",
                    background: active
                      ? "linear-gradient(135deg, rgba(14,116,144,0.96), rgba(37,99,235,0.92))"
                      : "rgba(255,255,255,0.74)",
                    color: active ? "#fff" : "#334155",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 13,
                    transition: "all 0.2s",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    flex: isMobile ? "1 1 calc(50% - 4px)" : "0 0 auto",
                  }}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      <div
        style={
          tab === "sheet"
            ? {
                display: "block",
                width: "100%",
                paddingTop: isMobile ? 10 : 14,
                overflowY: "auto",
                flex: 1,
              }
            : {
                flex: 1,
                display: "flex",
                minHeight: 0,
                paddingTop: isMobile ? 10 : 14,
              }
        }
      >
        {isFormLoading ? (
          <div
            style={{
              margin: isMobile ? 10 : 14,
              padding: isMobile ? 18 : 22,
              borderRadius: 20,
              border: "1px solid rgba(191,219,254,0.55)",
              background: "rgba(255,255,255,0.9)",
              color: "#475569",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {t("resultsLoadingForm", "Loading the selected form workspace across all streams...")}
          </div>
        ) : (
          <>
            {tab === "analysis" && (
              <AnalysisPanel classData={activeClassData} computed={activeComputed} />
            )}
            {tab === "sheet" && (
              <ResultSheet
                classData={activeClassData}
                computed={activeComputed}
                onOpenReportCard={onOpenReportCard}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
