import React, { useMemo } from "react";
import { DIVISION_COLORS, GRADE_COLORS, MONTHLY_EXAM_PREFIX } from "../utils/constants";
import { computeStudent, withPositions } from "../utils/grading";
import { useViewport } from "../utils/useViewport";
import { useTheme } from "../utils/ThemeContext";
import { themeColors } from "../utils/themeColors";

/**
 * MonthlyAveragePanel
 *
 * Aggregates scores across all enabled monthly exams for each student and
 * shows a ranked table of per-subject monthly averages plus an overall
 * term-average division.
 *
 * Props:
 *   classData   – the active class object (with students[], subjects[], monthly_exams[])
 */
export function MonthlyAveragePanel({ classData }) {
  const { isMobile } = useViewport();
  const { dark } = useTheme();
  const t = themeColors(dark);

  const subjects  = classData.subjects ?? [];
  const students  = classData.students ?? [];
  const monthlyExams = Array.isArray(classData.monthly_exams) ? classData.monthly_exams : [];
  const monthlyKeys  = monthlyExams.map(m => `${MONTHLY_EXAM_PREFIX}${m}`);

  // Compute per-student monthly averages
  const aggregated = useMemo(() => {
    if (!monthlyKeys.length) return [];

    const studentsWithAvg = students.map(student => {
      // Collect score arrays from every enabled monthly exam
      const scoreArrays = monthlyKeys.map(key => student.examScores?.[key] ?? []);

      // Average each subject position across all monthly exams
      const avgScores = subjects.map((_, si) => {
        const vals = scoreArrays
          .map(arr => {
            const raw = arr[si];
            if (raw === "" || raw === null || raw === undefined) return null;
            if (typeof raw === "string" && raw.toUpperCase() === "ABS") return null;
            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
          })
          .filter(v => v !== null);
        return vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : "";
      });

      return { ...student, scores: avgScores };
    });

    return withPositions(studentsWithAvg, subjects);
  }, [students, monthlyKeys, subjects]);

  const present = aggregated.filter(s => s.total !== null).sort((a, b) => (a.posn ?? 999) - (b.posn ?? 999));

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 0,
      background: t.bgPage,
    },
    heading: {
      margin: "0 0 4px",
      fontSize: 14,
      fontWeight: 800,
      color: t.header,
    },
    sub: {
      fontSize: 11,
      color: t.textMuted,
      marginBottom: 8,
    },
    empty: {
      background: t.bgCard,
      border: `1px dashed ${t.borderDash}`,
      borderRadius: 8,
      padding: 24,
      textAlign: "center",
      color: t.textMuted,
      fontSize: 12,
    },
    monthChips: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8,
    },
    chip: {
      background: t.bgCardAlt,
      border: `1px solid ${t.border}`,
      borderRadius: 999,
      padding: "3px 10px",
      fontSize: 10,
      fontWeight: 700,
      color: t.header,
    },
    th: {
      padding: "6px 5px",
      background: t.tableHeader,
      color: "#fff",
      border: `1px solid ${t.tableHeader}`,
      fontWeight: 700,
      textAlign: "center",
      fontSize: 9,
    },
    td: {
      padding: "5px",
      border: `1px solid ${t.borderTable}`,
      textAlign: "center",
      fontSize: 9,
      color: t.text,
    },
  };

  if (!monthlyKeys.length) {
    return (
      <div style={styles.panel}>
        <h3 style={styles.heading}>📅 Monthly Exam Averages</h3>
        <div style={styles.empty}>
          No monthly exams enabled for this class. Enable monthly exams in{" "}
          <strong>Settings → Monthly Exams</strong>.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <h3 style={styles.heading}>📅 Monthly Exam Averages</h3>
      <div style={styles.sub}>
        Per-subject scores averaged across all enabled monthly exams ({monthlyExams.length} month{monthlyExams.length !== 1 ? "s" : ""}).
        Division is calculated from the averaged totals.
      </div>

      <div style={styles.monthChips}>
        {monthlyExams.map(m => (
          <span key={m} style={styles.chip}>{m}</span>
        ))}
      </div>

      {!present.length ? (
        <div style={styles.empty}>
          No monthly exam scores recorded yet for this class.
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: t.bgCard, borderRadius: 8, boxShadow: `0 1px 6px rgba(0,0,0,0.07)` }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: isMobile ? 560 : "auto", fontSize: 9 }}>
            <thead>
              <tr>
                {["Pos", "CNO", "Name", "Sex", ...subjects, "Avg Total", "Avg Avg", "Grade", "Division"].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {present.map((s, ri) => (
                <tr key={s.id} style={{ background: ri % 2 === 0 ? t.rowEven : t.rowOdd }}>
                  <td style={{ ...styles.td, fontWeight: 800 }}>{s.posn ?? "–"}</td>
                  <td style={{ ...styles.td, fontFamily: "monospace" }}>{s.index_no ?? s.indexNo ?? "–"}</td>
                  <td style={{ ...styles.td, textAlign: "left", fontWeight: 600 }}>{s.name}</td>
                  <td style={styles.td}>{s.sex}</td>
                  {subjects.map((_, i) => {
                    const g = s.grades?.[i];
                    const display = g?.raw === "ABS" ? "ABS" : (g?.score != null ? g.score : "–");
                    return (
                      <td key={i} style={{ ...styles.td, color: g?.grade ? GRADE_COLORS[g.grade] : t.textMuted }}>
                        {display}
                      </td>
                    );
                  })}
                  <td style={{ ...styles.td, fontWeight: 700 }}>{s.total ?? "–"}</td>
                  <td style={styles.td}>{s.avg ?? "–"}</td>
                  <td style={{ ...styles.td, fontWeight: 800, color: GRADE_COLORS[s.agrd] }}>{s.agrd ?? "–"}</td>
                  <td style={{ ...styles.td, fontWeight: 800, color: DIVISION_COLORS[s.div] }}>{s.div ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 10, color: t.textMuted, textAlign: "center", paddingTop: 4 }}>
        {present.length} student{present.length !== 1 ? "s" : ""} with monthly exam data
      </div>
    </div>
  );
}
