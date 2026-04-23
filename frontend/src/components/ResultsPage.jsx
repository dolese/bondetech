import React, { useState } from "react";
import { AnalysisPanel } from "./AnalysisPanel";
import { ResultSheet } from "./ResultSheet";
import { MonthlyAveragePanel } from "./MonthlyAveragePanel";
import { useViewport } from "../utils/useViewport";

export function ResultsPage({ classData, computed, onOpenReportCard }) {
  const [tab, setTab] = useState("analysis");
  const { isMobile } = useViewport();
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
        background: "#f4f7ff",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 12,
          background: "#fff",
          borderBottom: "2px solid #d0dcf8",
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
              border: "2px solid #d0dcf8",
              background: tab === btn.key ? "#003366" : "#fff",
              color: tab === btn.key ? "#fff" : "#666",
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
