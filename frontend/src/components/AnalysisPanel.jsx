import React, { useMemo } from "react";
import { GRADE_COLORS, DIVISION_COLORS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import { useTheme } from "../utils/ThemeContext";
import { themeColors } from "../utils/themeColors";

export function AnalysisPanel({ classData, computed }) {
  const present = (computed ?? []).filter(s => s.total !== null);
  const { isMobile } = useViewport();
  const { dark } = useTheme();
  const t = themeColors(dark);

  if (!present.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, background: t.bgPage, flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: t.header }}>
          📊 Analysis & Statistics
        </h2>
        <div
          style={{
            background: t.bgCard,
            border: `1px dashed ${t.borderDash}`,
            borderRadius: 8,
            padding: 16,
            textAlign: "center",
            color: t.textMuted,
            fontSize: 12,
          }}
        >
          No results yet. Enter student scores to unlock analysis.
        </div>
      </div>
    );
  }

  // Gender breakdown
  const maleStudents = present.filter(s => s.sex === "M");
  const femaleStudents = present.filter(s => s.sex === "F");
  const getMaleAvg = () => {
    const total = maleStudents.reduce((sum, s) => sum + (s.total || 0), 0);
    return maleStudents.length > 0 ? (total / maleStudents.length).toFixed(1) : 0;
  };
  const getFemaleAvg = () => {
    const total = femaleStudents.reduce((sum, s) => sum + (s.total || 0), 0);
    return femaleStudents.length > 0 ? (total / femaleStudents.length).toFixed(1) : 0;
  };

  // Subject Performance
  const subjPerf = {};
  (classData.subjects ?? []).forEach((subj, si) => {
    const scores = (computed ?? [])
      .filter(s => s.grades?.[si]?.score != null)
      .map(s => s.grades[si].score);
    if (scores.length > 0) {
      subjPerf[subj] = {
        avg: (scores.reduce((a, b) => a + b) / scores.length).toFixed(1),
        min: Math.min(...scores),
        max: Math.max(...scores),
        count: scores.length,
      };
    }
  });

  // Division statistics
  const divStats = {};
  ["I", "II", "III", "IV"].forEach(div => {
    const students = present.filter(s => s.div === div);
    divStats[div] = {
      count: students.length,
      percent:
        present.length > 0
          ? Math.round((students.length / present.length) * 100)
          : 0,
      avg:
        students.length > 0
          ? (students.reduce((sum, s) => sum + (s.total || 0), 0) / students.length).toFixed(1)
          : 0,
    };
  });

  // Score distribution
  const scoreRanges = {
    "90-100": 0,
    "80-89": 0,
    "70-79": 0,
    "60-69": 0,
    "50-59": 0,
    "40-49": 0,
    "0-39": 0,
  };
  present.forEach(s => {
    if (s.total >= 90) scoreRanges["90-100"]++;
    else if (s.total >= 80) scoreRanges["80-89"]++;
    else if (s.total >= 70) scoreRanges["70-79"]++;
    else if (s.total >= 60) scoreRanges["60-69"]++;
    else if (s.total >= 50) scoreRanges["50-59"]++;
    else if (s.total >= 40) scoreRanges["40-49"]++;
    else scoreRanges["0-39"]++;
  });

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      padding: isMobile ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 0,
      minWidth: 0,
      background: t.bgPage,
    },
    card: {
      background: t.bgCard,
      borderRadius: 10,
      padding: isMobile ? 10 : 12,
      boxShadow: "0 1px 6px rgba(0,51,102,0.07)",
    },
    cardTitle: {
      margin: "0 0 12px",
      fontSize: isMobile ? 11 : 12,
      fontWeight: 800,
      color: t.header,
      borderBottom: `1.5px solid ${t.borderLight}`,
      paddingBottom: 6,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 12,
    },
  };

  return (
    <div style={styles.panel}>
      <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 900, color: t.header }}>
        📊 Analysis & Statistics
      </h2>
      <div style={{ fontSize: 11, color: t.textMuted, marginTop: -4 }}>
        Performance breakdowns for this class.
      </div>

      <div style={styles.grid}>
        {/* Gender Comparison */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>👫 Gender Comparison</h3>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#0077aa" }}>
                {maleStudents.length}
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2, fontWeight: 700 }}>
                Male Students
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.header, marginTop: 8 }}>
                {getMaleAvg()} avg
              </div>
            </div>
            <div style={{ fontSize: 2, color: t.border }}></div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#c041a3" }}>
                {femaleStudents.length}
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2, fontWeight: 700 }}>
                Female Students
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.header, marginTop: 8 }}>
                {getFemaleAvg()} avg
              </div>
            </div>
          </div>
        </div>

        {/* Division breakdown */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🏆 Division Distribution</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {["I", "II", "III", "IV"].map(div => (
              <div key={div} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    width: 60,
                    fontWeight: 700,
                    color: t.text,
                  }}
                >
                  Div {div}
                </span>
                <div
                  style={{
                    flex: 1,
                    background: t.bgCardAlt,
                    borderRadius: 4,
                    height: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${divStats[div].percent}%`,
                      height: "100%",
                      background: DIVISION_COLORS[div],
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: DIVISION_COLORS[div],
                    minWidth: 50,
                    textAlign: "right",
                  }}
                >
                  {divStats[div].count} ({divStats[div].percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Performance */}
        <div style={{ ...styles.card, gridColumn: isMobile ? "span 1" : "span 2" }}>
          <h3 style={styles.cardTitle}>📚 Subject Performance</h3>
          <div style={{ overflowX: "auto", minWidth: 0 }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 10,
              }}
            >
              <thead>
                <tr style={{ background: t.tableHeader, color: "#fff" }}>
                  {["Subject", "Avg", "Min", "Max", "Coverage"].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: "5px 6px",
                        textAlign: "center",
                        fontWeight: 700,
                        border: `1px solid ${t.tableHeader}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(subjPerf).map(([subj, stats], i) => {
                  const avg = Number(stats.avg);
                  const avgColor = avg >= 60 ? "#0b6b3a" : avg >= 40 ? "#0077aa" : "#8b2500";
                  return (
                    <tr
                      key={subj}
                      style={{ background: i % 2 === 0 ? t.rowEven : t.rowOdd }}
                    >
                      <td
                        style={{
                          padding: "4px 6px",
                          border: `1px solid ${t.borderTable}`,
                          fontWeight: 700,
                          color: t.text,
                        }}
                      >
                        {subj}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          border: `1px solid ${t.borderTable}`,
                          textAlign: "center",
                          fontWeight: 700,
                          color: avgColor,
                        }}
                      >
                        {stats.avg}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          border: `1px solid ${t.borderTable}`,
                          textAlign: "center",
                          color: t.text,
                        }}
                      >
                        {stats.min}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          border: `1px solid ${t.borderTable}`,
                          textAlign: "center",
                          color: t.text,
                        }}
                      >
                        {stats.max}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          border: `1px solid ${t.borderTable}`,
                          textAlign: "center",
                          color: t.text,
                        }}
                      >
                        {stats.count} / {present.length}
                      </td>
                    </tr>
                  );
                })}
                {!Object.keys(subjPerf).length && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: t.textMuted,
                        border: `1px solid ${t.borderTable}`,
                      }}
                    >
                      No scores entered yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Score Distribution */}
        <div style={{ ...styles.card, gridColumn: isMobile ? "span 1" : "span 2" }}>
          <h3 style={styles.cardTitle}>📈 Score Distribution</h3>
          <div style={{ overflowX: "auto", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 12,
              height: 140,
              justifyContent: "space-around",
              marginTop: 12,
              minWidth: 280,
            }}
          >
            {Object.entries(scoreRanges).map(([range, count]) => {
              const max = Math.max(...Object.values(scoreRanges), 1);
              const colorMap = {
                "90-100": "#b8860b",
                "80-89": "#0b6b3a",
                "70-79": "#0077aa",
                "60-69": "#5a2d82",
                "50-59": "#c77a00",
                "40-49": "#8b5a00",
                "0-39": "#8b2500",
              };
              return (
                <div
                  key={range}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>
                    {count}
                  </span>
                  <div
                    style={{
                      width: 32,
                      borderRadius: "4px 4px 0 0",
                      background: colorMap[range],
                      height: Math.max((count / max) * 100, 4),
                      transition: "height 0.5s",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: t.textMuted,
                      textAlign: "center",
                      width: 40,
                    }}
                  >
                    {range}
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
