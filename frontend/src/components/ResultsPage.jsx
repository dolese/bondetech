import React, { useState } from "react";
import { AnalysisPanel } from "./AnalysisPanel";
import { ResultSheet } from "./ResultSheet";
import { useViewport } from "../utils/useViewport";
import { useI18n } from "../i18n";
import { glassPanelStyle, pillStyle } from "../utils/designSystem";

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

export function ResultsPage({ classData, computed, onOpenReportCard }) {
  const [tab, setTab] = useState("analysis");
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
              {classData.form} {classData.year}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#607086" }}>
              View class analysis and official result sheets from one class workspace.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              width: isMobile ? "100%" : "auto",
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

      <div
        style={
          tab === "sheet"
            ? {
                display: "block",
                width: "100%",
                paddingTop: isMobile ? 10 : 14,
              }
            : {
                flex: 1,
                display: "flex",
                minHeight: 0,
                paddingTop: isMobile ? 10 : 14,
              }
        }
      >
        {tab === "analysis" && (
          <AnalysisPanel classData={classData} computed={computed} />
        )}
        {tab === "sheet" && (
          <ResultSheet
            classData={classData}
            computed={computed}
            onOpenReportCard={onOpenReportCard}
          />
        )}
      </div>
    </div>
  );
}
