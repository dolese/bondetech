import React, { useState } from "react";
import { EXAM_TYPES, getMonthlyExamKey } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import { glassPanelStyle, pillStyle, primaryButtonStyle } from "../utils/designSystem";

const EXAM_META = {
  "March Exam": { icon: "SE", color: "#0b6b3a", bg: "#e6f9ee", border: "#7dd3a8" },
  "Pre-Mock Exam": { icon: "PM", color: "#7c3aed", bg: "#f3e8ff", border: "#c4b5fd" },
  "Mock Exam": { icon: "MK", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  "Pre-Necta Exam": { icon: "PN", color: "#0891b2", bg: "#cffafe", border: "#67e8f9" },
  "Terminal Exam": { icon: "TE", color: "#0b4f9e", bg: "#e4eeff", border: "#7aabf7" },
  "September Exam": { icon: "SP", color: "#7a5800", bg: "#fff8e1", border: "#f7d47a" },
  "Annual Exam": { icon: "AE", color: "#6b0055", bg: "#fce8f7", border: "#e89de0" },
};

const MONTHLY_META = { icon: "ME", color: "#1a5276", bg: "#eaf4fb", border: "#7fb3d3" };

export function ExamPickerScreen({ classData, onPick, onCancel }) {
  const { isMobile, isTablet, isXs } = useViewport();
  const [hoveredExam, setHoveredExam] = useState(null);

  const monthlyExams = Array.isArray(classData?.monthly_exams) ? classData.monthly_exams : [];

  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.58)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      backdropFilter: "blur(8px)",
      padding: isMobile ? 12 : 18,
    },
    box: {
      ...glassPanelStyle({ compact: isMobile, dense: isMobile, radius: isMobile ? 24 : 30 }),
      width: isMobile ? "100%" : 760,
      maxWidth: "100%",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    topRow: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 14,
      flexWrap: "wrap",
      marginBottom: 18,
    },
    heading: {
      fontSize: isMobile ? 24 : 30,
      fontWeight: 900,
      color: "#0f172a",
      lineHeight: 1.05,
    },
    sub: {
      fontSize: 13,
      color: "#64748b",
      marginTop: 6,
      lineHeight: 1.7,
      maxWidth: 520,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: isXs
        ? "1fr"
        : isMobile
        ? "repeat(2, minmax(0, 1fr))"
        : isTablet
        ? "repeat(3, minmax(0, 1fr))"
        : "repeat(4, minmax(0, 1fr))",
      gap: 12,
      marginBottom: 18,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: 900,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      marginBottom: 10,
    },
    cancelBtn: {
      ...primaryButtonStyle({ compact: true }),
      width: isMobile ? "100%" : "auto",
      background: "#eef3fb",
      color: "#475569",
      border: "1px solid rgba(214,226,245,0.95)",
      boxShadow: "none",
    },
  };

  const className = classData
    ? [classData.form, classData.stream, classData.year].filter(Boolean).join(" ").trim()
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
          background: isActive
            ? `linear-gradient(180deg, ${meta.bg}, #ffffff)`
            : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
          border: `1.5px solid ${isActive ? meta.color : "rgba(214,226,245,0.95)"}`,
          borderRadius: 20,
          padding: isMobile ? "12px 12px" : "14px 14px",
          cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          alignItems: "center",
          gap: 12,
          transition: "transform 0.14s, box-shadow 0.14s, border-color 0.14s",
          transform: hoveredExam === examValue ? "translateY(-1px)" : "none",
          boxShadow:
            hoveredExam === examValue
              ? `0 14px 26px ${meta.color}22`
              : isActive
              ? `0 10px 24px ${meta.color}1f`
              : "0 6px 16px rgba(15,23,42,0.06)",
          outline: "none",
          width: "100%",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: isMobile ? 38 : 42,
            height: isMobile ? 38 : 42,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.92)",
            color: meta.color,
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.6,
            border: `1px solid ${meta.border}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          {meta.icon}
        </span>
        <span style={{ display: "grid", gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>
            {label}
          </span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={pillStyle({ tone: isActive ? "blue" : "slate" })}>
              {isActive ? "Current exam" : "Available"}
            </span>
            <span style={{ fontSize: 11, color: meta.color, fontWeight: 700 }}>
              {examValue}
            </span>
          </span>
        </span>
      </button>
    );
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.box} onClick={(e) => e.stopPropagation()} tabIndex={0}>
        <div style={styles.topRow}>
          <div>
            <div style={{ ...pillStyle({ tone: "blue" }), display: "inline-flex" }}>Exam Workspace</div>
            <div style={styles.heading}>Select Exam</div>
            <div style={styles.sub}>
              {className
                ? `Choose the exam you want to work with for ${className}.`
                : "Choose the exam you want to work with."}
            </div>
          </div>
          {className ? (
            <div style={{ ...pillStyle({ tone: "teal" }), alignSelf: "flex-start" }}>{className}</div>
          ) : null}
        </div>

        <div style={styles.sectionLabel}>Standard Exams</div>
        <div style={styles.grid}>
          {EXAM_TYPES.map((examType) => {
            const meta = EXAM_META[examType.value] ?? {
              icon: "EX",
              color: "#003366",
              bg: "#f4f7ff",
              border: "#d0dcf8",
            };
            return renderExamButton(examType.value, meta, examType.label);
          })}
        </div>

        {monthlyExams.length > 0 && (
          <>
            <div style={styles.sectionLabel}>Monthly Exams</div>
            <div style={styles.grid}>
              {monthlyExams.map((month) => {
                const key = getMonthlyExamKey(month);
                return renderExamButton(key, MONTHLY_META, month);
              })}
            </div>
          </>
        )}

        <button style={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
