import React, { useEffect, useState } from "react";
import { API } from "../api";
import { computeStudent } from "../utils/grading";
import { GRADE_COLORS, DIVISION_COLORS, EXAM_TYPES, MONTHLY_EXAM_PREFIX } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import { useTheme } from "../utils/ThemeContext";
import { themeColors } from "../utils/themeColors";

// ─── Exam ordering for the trend chart ───────────────────────────────────────
const STANDARD_ORDER = EXAM_TYPES.map(e => e.value);
const examSortKey = (examType) => {
  const si = STANDARD_ORDER.indexOf(examType);
  if (si !== -1) return si * 1000;
  // Monthly exams come after standard; sort by month name position
  const month = examType.replace(MONTHLY_EXAM_PREFIX, "");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const mi = months.indexOf(month);
  return 4000 + (mi !== -1 ? mi : 99);
};

// ─── SVG Trend Chart ─────────────────────────────────────────────────────────
function ExamTrendChart({ points, dark }) {
  const t = themeColors(dark);
  if (!points.length) return null;

  const W = 480, H = 140, PAD_L = 38, PAD_R = 16, PAD_T = 16, PAD_B = 36;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const maxVal = Math.max(...points.map(p => p.total), 1);
  const minVal = Math.min(...points.map(p => p.total), 0);
  const range  = Math.max(maxVal - minVal, 1);

  const xs = points.map((_, i) =>
    PAD_L + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  );
  const ys = points.map(p =>
    PAD_T + innerH - ((p.total - minVal) / range) * innerH
  );

  // Build SVG path
  const linePath = points.length === 1
    ? `M ${xs[0]} ${ys[0]}`
    : xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");

  // Area fill path (close back to baseline)
  const baseline = PAD_T + innerH;
  const areaPath = points.length === 1
    ? `M ${xs[0]} ${ys[0]} L ${xs[0]} ${baseline} Z`
    : linePath + ` L ${xs[xs.length - 1].toFixed(1)} ${baseline} L ${xs[0].toFixed(1)} ${baseline} Z`;

  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = minVal + (range / gridSteps) * i;
    const y = PAD_T + innerH - ((val - minVal) / range) * innerH;
    return { y: y.toFixed(1), label: Math.round(val) };
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", maxWidth: W, height: "auto", display: "block" }}
      aria-label="Exam score trend chart"
    >
      {/* Grid lines */}
      {gridLines.map(({ y, label }) => (
        <g key={y}>
          <line
            x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
            stroke={dark ? "#334155" : "#e4ecff"} strokeWidth={1} strokeDasharray="3 3"
          />
          <text x={PAD_L - 4} y={Number(y) + 3.5} textAnchor="end" fontSize={8}
            fill={t.textMuted}>{label}</text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="#3b82f6" fillOpacity={dark ? 0.15 : 0.08} />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots + labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xs[i].toFixed(1)} cy={ys[i].toFixed(1)} r={5} fill="#3b82f6" stroke={t.bgCard} strokeWidth={2} />
          <text
            x={xs[i].toFixed(1)} y={(ys[i] - 9).toFixed(1)}
            textAnchor="middle" fontSize={9} fontWeight="700" fill={dark ? "#93c5fd" : "#1d4ed8"}
          >{p.total}</text>
          {/* X-axis label */}
          <text
            x={xs[i].toFixed(1)} y={H - 4}
            textAnchor="middle" fontSize={8} fill={t.textMuted}
          >{p.shortLabel}</text>
        </g>
      ))}

      {/* Division badges */}
      {points.map((p, i) => p.div && (
        <rect
          key={`div-${i}`}
          x={xs[i] - 8} y={ys[i] + 8} width={16} height={10} rx={3}
          fill={DIVISION_COLORS[p.div] ?? "#999"} opacity={0.9}
        />
      ))}
      {points.map((p, i) => p.div && (
        <text
          key={`divt-${i}`}
          x={xs[i].toFixed(1)} y={(ys[i] + 16).toFixed(1)}
          textAnchor="middle" fontSize={7} fontWeight="800" fill="#fff"
        >{p.div}</text>
      ))}
    </svg>
  );
}

/**
 * StudentProfilePage
 *
 * Displays a full academic history for a student identified by their index
 * number.  For each class/exam the student appeared in, it shows per-subject
 * scores, grades, totals, and division.
 *
 * Props:
 *   indexNo  – the student's candidate number
 *   onBack   – called when the user clicks "Back"
 */
export function StudentProfilePage({ indexNo, onBack }) {
  const { isMobile } = useViewport();
  const { dark } = useTheme();
  const t = themeColors(dark);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!indexNo) return;
    setLoading(true);
    setError(null);
    API.getStudentProfile(indexNo)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [indexNo]);

  // Build chart data points from all entries × exams
  const trendPoints = React.useMemo(() => {
    if (!profile?.entries?.length) return [];
    const pts = [];
    profile.entries.forEach(entry => {
      Object.entries(entry.examScores ?? {}).forEach(([examType, scores]) => {
        const fakeStudent = {
          id: `${entry.classId}-${examType}`,
          name: profile.name,
          sex: profile.sex,
          status: entry.status,
          scores,
        };
        const comp = computeStudent(fakeStudent, entry.subjects);
        if (comp.total !== null) {
          const shortLabel = examType.startsWith(MONTHLY_EXAM_PREFIX)
            ? examType.replace(MONTHLY_EXAM_PREFIX, "").slice(0, 3)
            : examType.replace(/ Exam$/, "").slice(0, 4);
          pts.push({
            examType,
            label: examType,
            shortLabel,
            total: comp.total,
            avg: comp.avg,
            div: comp.div,
            year: entry.year,
            form: entry.form,
            sortKey: examSortKey(examType) + Number(entry.year ?? 0) * 100000,
          });
        }
      });
    });
    return pts.sort((a, b) => a.sortKey - b.sortKey);
  }, [profile]);

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? 10 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minHeight: 0,
      background: t.bgPage,
    },
    backBtn: {
      padding: "6px 14px",
      borderRadius: 6,
      border: `1px solid ${t.border}`,
      background: t.bgCard,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
      color: t.header,
      alignSelf: "flex-start",
    },
    card: {
      background: t.bgCard,
      border: `1px solid ${t.borderCard}`,
      borderRadius: 10,
      padding: isMobile ? 12 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: 800,
      color: t.header,
      borderBottom: `1.5px solid ${t.borderLight}`,
      paddingBottom: 6,
      marginBottom: 4,
    },
    th: {
      padding: "6px 8px",
      background: t.tableHeader,
      color: "#fff",
      fontWeight: 700,
      fontSize: 10,
      textAlign: "center",
      border: `1px solid ${t.tableHeader}`,
    },
    td: {
      padding: "5px 7px",
      border: `1px solid ${t.borderTable}`,
      fontSize: 10,
      textAlign: "center",
      color: t.text,
    },
  };

  if (loading) {
    return (
      <div style={styles.panel}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={{ color: t.textMuted, fontSize: 12 }}>Loading profile…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.panel}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={{ color: "#8b2500", fontSize: 12 }}>{error}</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={styles.panel}>
      <button style={styles.backBtn} onClick={onBack}>← Back to Dashboard</button>

      <div style={styles.card}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 900, color: t.header }}>
            {profile.name || "Unknown Student"}
          </h2>
          <div style={{ fontSize: 12, color: t.textMuted }}>
            CNO: <strong style={{ color: t.text }}>{profile.indexNo}</strong> · Sex: {profile.sex === "F" ? "Female" : "Male"}
          </div>
        </div>
      </div>

      {/* ── Progress Trend Chart ─────────────────────────────────────────── */}
      {trendPoints.length >= 2 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>📈 Score Trend Across Exams</div>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>
            Total score per exam in chronological order (standard exams → monthly exams).
          </div>
          <ExamTrendChart points={trendPoints} dark={dark} />
        </div>
      )}

      {profile.entries.length === 0 ? (
        <div style={{ fontSize: 12, color: t.textMuted }}>No academic records found.</div>
      ) : (
        profile.entries.map((entry, ei) => {
          const examEntries = Object.entries(entry.examScores ?? {});
          return (
            <div key={`${entry.classId}-${ei}`} style={styles.card}>
              <div style={styles.cardTitle}>
                📚 {entry.className} — {entry.form} {entry.year}
              </div>

              {examEntries.length === 0 ? (
                <div style={{ fontSize: 11, color: t.textMuted }}>No exam scores recorded.</div>
              ) : (
                examEntries.map(([examType, scores]) => {
                  const fakeStudent = {
                    id: `${entry.classId}-${entry.form}-${examType}`,
                    name: profile.name,
                    sex: profile.sex,
                    status: entry.status,
                    scores,
                    remarks: entry.remarks,
                  };
                  const computed = computeStudent(fakeStudent, entry.subjects);

                  return (
                    <div key={examType} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMid, marginBottom: 6 }}>
                        Exam: {examType}
                        {computed.div && (
                          <span
                            style={{
                              marginLeft: 8,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: DIVISION_COLORS[computed.div] ?? "#999",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            Div {computed.div}
                          </span>
                        )}
                        {computed.total !== null && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: t.textSubtle }}>
                            Total: {computed.total} · Avg: {computed.avg}
                          </span>
                        )}
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ borderCollapse: "collapse", fontSize: 10, minWidth: 400 }}>
                          <thead>
                            <tr>
                              {entry.subjects.map(s => (
                                <th key={s} style={styles.th}>{s}</th>
                              ))}
                              <th style={styles.th}>Total</th>
                              <th style={styles.th}>Avg</th>
                              <th style={styles.th}>Grade</th>
                              <th style={styles.th}>Div</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {entry.subjects.map((_, i) => {
                                const g = computed.grades?.[i];
                                const display = g?.raw === "ABS" ? "ABS" : (g?.score ?? "–");
                                return (
                                  <td key={i} style={styles.td}>{display}</td>
                                );
                              })}
                              <td style={{ ...styles.td, fontWeight: 700 }}>{computed.total ?? "–"}</td>
                              <td style={styles.td}>{computed.avg ?? "–"}</td>
                              <td style={{ ...styles.td, fontWeight: 800, color: GRADE_COLORS[computed.agrd] }}>
                                {computed.agrd ?? "–"}
                              </td>
                              <td style={{ ...styles.td, fontWeight: 800, color: DIVISION_COLORS[computed.div] }}>
                                {computed.div ?? "–"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {entry.remarks && entry.remarks.trim() && (
                        <div style={{ marginTop: 4, fontSize: 10, color: t.textMid }}>
                          <strong>Remarks:</strong> {entry.remarks.trim()}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

