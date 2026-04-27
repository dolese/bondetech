import React, { useState } from "react";
import { AnalysisPanel } from "./AnalysisPanel";
import { ResultSheet } from "./ResultSheet";
import { MonthlyAveragePanel } from "./MonthlyAveragePanel";
import { useViewport } from "../utils/useViewport";
import { useTheme } from "../utils/ThemeContext";
import { themeColors } from "../utils/themeColors";

export function ResultsPage({ classData, computed, onOpenReportCard }) {
  const [tab, setTab] = useState("analysis");
  const { isMobile } = useViewport();
  const { dark } = useTheme();
  const t = themeColors(dark);
  const topOffset = isMobile ? 52 : 46;

  const hasMonthly = Array.isArray(classData.monthly_exams) && classData.monthly_exams.length > 0;

  const tabs = [
    { key: "analysis", label: "📊 Analysis" },
    { key: "sheet", label: "📄 Sheet" },
    ...(hasMonthly ? [{ key: "monthly", label: "📅 Monthly" }] : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        background: t.bgPage,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 12,
          background: t.bgCard,
          borderBottom: `2px solid ${t.border}`,
          boxShadow: "0 1px 4px rgba(0,51,102,0.05)",
          flexWrap: "wrap",
          position: "sticky",
          top: topOffset,
          zIndex: 15,
        }}
      >
        {tabs.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setTab(btn.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: `2px solid ${t.border}`,
              background: tab === btn.key ? t.tableHeader : t.bgCard,
              color: tab === btn.key ? "#fff" : t.textMuted,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              transition: "all 0.2s",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
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
        {tab === "monthly" && (
          <MonthlyAveragePanel classData={classData} />
        )}
      </div>
    </div>
  );
}
