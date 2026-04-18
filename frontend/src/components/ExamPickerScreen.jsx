import React, { useState } from "react";
import { EXAM_TYPES, getMonthlyExamKey } from "../utils/constants";
import { useViewport } from "../utils/useViewport";

const EXAM_META = {
  "March Exam":     { icon: "🌱", color: "#0b6b3a", bg: "#e6f9ee", border: "#7dd3a8" },
  "Terminal Exam":  { icon: "📘", color: "#0b4f9e", bg: "#e4eeff", border: "#7aabf7" },
  "September Exam": { icon: "🍂", color: "#7a5800", bg: "#fff8e1", border: "#f7d47a" },
  "Annual Exam":    { icon: "🏆", color: "#6b0055", bg: "#fce8f7", border: "#e89de0" },
};

const MONTHLY_META = { icon: "📅", color: "#1a5276", bg: "#eaf4fb", border: "#7fb3d3" };

export function ExamPickerScreen({ classData, onPick, onCancel }) {
  const { isMobile } = useViewport();
  const [hoveredExam, setHoveredExam] = useState(null);

  const monthlyExams = Array.isArray(classData?.monthly_exams)
    ? classData.monthly_exams
    : [];

  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,20,60,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      backdropFilter: "blur(3px)",
    },
    box: {
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
      padding: isMobile ? 16 : 28,
      width: isMobile ? "92vw" : 480,
      maxWidth: "96vw",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    heading: {
      fontSize: isMobile ? 16 : 19,
      fontWeight: 900,
      color: "#003366",
      marginBottom: 4,
    },
    sub: {
      fontSize: 11,
      color: "#667",
      marginBottom: 18,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 800,
      color: "#667",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    cancelBtn: {
      width: "100%",
      padding: "9px",
      borderRadius: 8,
      border: "1px solid #d0dcf8",
      background: "#f4f7ff",
      color: "#555",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
    },
  };

  const className = classData
    ? `${classData.form ?? ""} ${classData.year ?? ""}`.trim()
    : "";

  const renderExamButton = (examValue, meta, label) => {
    const isActive = classData?.school_info?.exam === examValue;
    return (
      <button
        key={examValue}
        onClick={() => onPick(examValue)}
        onMouseEnter={() => setHoveredExam(examValue)}
        onMouseLeave={() => setHoveredExam(null)}
        style={{
          background: meta.bg,
          border: `2px solid ${isActive ? meta.color : meta.border}`,
          borderRadius: 10,
          padding: "14px 10px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          transition: "transform 0.12s, box-shadow 0.12s",
          transform: hoveredExam === examValue ? "translateY(-2px)" : "",
          boxShadow: hoveredExam === examValue
            ? `0 4px 14px ${meta.color}44`
            : isActive ? `0 0 0 3px ${meta.color}44` : "0 1px 4px rgba(0,0,0,0.07)",
          outline: "none",
        }}
      >
        <span style={{ fontSize: 28 }}>{meta.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, textAlign: "center", lineHeight: 1.3 }}>
          {label}
        </span>
        {isActive && (
          <span style={{ fontSize: 9, fontWeight: 700, color: meta.color, background: `${meta.color}1a`, borderRadius: 99, padding: "2px 8px" }}>
            Last used
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <div style={styles.heading}>📋 Select Exam</div>
        <div style={styles.sub}>
          {className ? `Choose the exam you want to work with for ${className}.` : "Choose the exam you want to work with."}
        </div>

        {/* Standard exams */}
        <div style={styles.sectionLabel}>Standard Exams</div>
        <div style={{ ...styles.grid, marginBottom: monthlyExams.length ? 16 : 16 }}>
          {EXAM_TYPES.map(et => {
            const meta = EXAM_META[et.value] ?? { icon: "📋", color: "#003366", bg: "#f4f7ff", border: "#d0dcf8" };
            return renderExamButton(et.value, meta, et.label);
          })}
        </div>

        {/* Monthly exams (if any are enabled for this Form) */}
        {monthlyExams.length > 0 && (
          <>
            <div style={styles.sectionLabel}>Monthly Exams</div>
            <div style={{ ...styles.grid, marginBottom: 16 }}>
              {monthlyExams.map((month) => {
                const key = getMonthlyExamKey(month);
                return renderExamButton(key, MONTHLY_META, `${month}`);
              })}
            </div>
          </>
        )}

        <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
