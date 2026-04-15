import React, { useState } from "react";
import { EntryPanel } from "./EntryPanel";
import { AnalysisPanel } from "./AnalysisPanel";
import { ResultSheet } from "./ResultSheet";
import { useViewport } from "../utils/useViewport";

export function ClassWorkspace({
  classData,
  computed,
  onShowModal,
  onUpdateStudent,
  onDeleteStudent,
  onAddStudent,
  onUpdateSchool,
  onUpdateSubjects,
  onUpdateClassMeta,
  onOpenReportCard,
}) {
  const [tab, setTab] = useState("entry"); // entry, analysis, sheet
  const { isMobile } = useViewport();
  const topOffset = isMobile ? 52 : 46;

  const tabButtons = [
    { key: "entry", label: "📝 Entry", icon: "✎" },
    { key: "analysis", label: "📊 Analysis", icon: "📈" },
    { key: "sheet", label: "📄 Sheet", icon: "🖨" },
  ];

  const styles = {
    workspace: {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      height: "100%",
      background: "#f4f7ff",
    },
    tabbar: {
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
    },
    tabBtn: {
      padding: "8px 16px",
      borderRadius: 6,
      border: "2px solid #d0dcf8",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
      color: "#666",
      transition: "all 0.2s",
    },
    tabBtnActive: {
      borderColor: "#003366",
      background: "#003366",
      color: "#fff",
    },
    content: {
      flex: 1,
      display: "flex",
      minHeight: 0,
    },
  };

  return (
    <div style={styles.workspace}>
      {/* Tab Navigation */}
      <div style={styles.tabbar}>
        {tabButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setTab(btn.key)}
            style={{
              ...styles.tabBtn,
              ...(tab === btn.key ? styles.tabBtnActive : {}),
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        {tab === "entry" && (
          <EntryPanel
            classId={classData.id}
            classData={classData}
            computed={computed}
            onShowModal={onShowModal}
            onUpdateStudent={onUpdateStudent}
            onDeleteStudent={onDeleteStudent}
            onAddStudent={onAddStudent}
            onUpdateSchool={onUpdateSchool}
            onUpdateSubjects={onUpdateSubjects}
            onUpdateClassMeta={onUpdateClassMeta}
          />
        )}
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
