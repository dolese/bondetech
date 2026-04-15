import React, { useMemo, useRef, useState } from "react";
import { GRADE_COLORS, DIVISION_COLORS, DEFAULT_SCHOOL } from "../utils/constants";
import { getGradePoints } from "../utils/grading";
import { useViewport } from "../utils/useViewport";
import { exportElementToPdf } from "../utils/pdfExport";

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function Dashboard({ allComputed, onOpenClass }) {
  const { isMobile, isTablet } = useViewport();
  const [filterYear, setFilterYear] = useState("all");
  const [filterForm, setFilterForm] = useState("all");
  const summaryRef = useRef(null);

  const normalize = (val) => (val ?? "").toString().trim();
  const yearOptions = useMemo(() => {
    const years = allComputed.map(c => normalize(c.year)).filter(Boolean);
    return Array.from(new Set(years)).sort();
  }, [allComputed]);

  const formOptions = useMemo(() => {
    const forms = allComputed.map(c => normalize(c.form)).filter(Boolean);
    return Array.from(new Set(forms)).sort();
  }, [allComputed]);

  const filtered = useMemo(() => {
    return allComputed.filter(cl => {
      const y = normalize(cl.year);
      const f = normalize(cl.form);
      if (filterYear !== "all" && y !== filterYear) return false;
      if (filterForm !== "all" && f !== filterForm) return false;
      return true;
    });
  }, [allComputed, filterYear, filterForm]);

  const allStudents = filtered.flatMap(c => c.computed ?? []);
  const present = allStudents.filter(s => s.total !== null);
  const complete = present.filter(s => s.div !== null);
  
  const divCounts = { I: 0, II: 0, III: 0, IV: 0, "0": 0 };
  present.forEach(s => {
    if (s.div) divCounts[s.div]++;
  });
  
  const top10 = [...present].sort((a, b) => b.total - a.total).slice(0, 10);
  const passRate = complete.length
    ? Math.round(complete.filter(s => s.div !== "0").length / complete.length * 100)
    : 0;

  const subjPerf = {};
  filtered.forEach(cl => {
    (cl.subjects ?? []).forEach((subj, si) => {
      if (!subjPerf[subj]) subjPerf[subj] = { total: 0, count: 0 };
      (cl.computed ?? []).forEach(s => {
        const sc = s.grades?.[si]?.score;
        if (sc != null) {
          subjPerf[subj].total += sc;
          subjPerf[subj].count++;
        }
      });
    });
  });
  
  const subjAvg = Object.entries(subjPerf)
    .filter(([, v]) => v.count > 0)
    .map(([k, v]) => ({ subj: k, avg: Number((v.total / v.count).toFixed(1)) }))
    .sort((a, b) => b.avg - a.avg);

  const studentClassMap = {};
  allComputed.forEach(cl => {
    (cl.computed ?? []).forEach(s => {
      studentClassMap[s.id] = cl.name;
    });
  });

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    pageTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: 900,
      color: "#003366",
      margin: "0 0 14px",
      paddingBottom: 8,
      borderBottom: "2px solid #d0dcf8",
    },
    kpiRow: {
      display: "flex",
      gap: isMobile ? 8 : 10,
      flexWrap: "wrap",
      marginBottom: 14,
    },
    kpiCard: {
      flex: 1,
      minWidth: isMobile ? 140 : 110,
      background: "#fff",
      borderRadius: 10,
      padding: "10px 12px",
      boxShadow: "0 1px 6px rgba(0,51,102,0.08)",
      display: "flex",
      flexDirection: "column",
      gap: 3,
      borderLeft: "4px solid",
    },
    dashGrid: {
      display: "grid",
      gridTemplateColumns: isTablet ? "1fr" : "1fr 1fr",
      gap: 12,
    },
    card: {
      background: "#fff",
      borderRadius: 10,
      padding: isMobile ? 10 : 12,
      boxShadow: "0 1px 6px rgba(0,51,102,0.07)",
    },
    cardT: {
      margin: "0 0 10px",
      fontSize: 13,
      fontWeight: 800,
      color: "#003366",
      borderBottom: "1.5px solid #e4ecff",
      paddingBottom: 6,
    },
    filterRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
      margin: "4px 0 10px",
    },
    select: {
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #cbd8f3",
      background: "#fff",
      fontSize: 11,
      fontWeight: 700,
      color: "#003366",
    },
    miniBtn: {
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #003366",
      background: "#003366",
      color: "#fff",
      fontSize: 11,
      fontWeight: 700,
      cursor: "pointer",
    },
  };

  const summaryLabel = `${filterYear === "all" ? "All Years" : filterYear} • ${
    filterForm === "all" ? "All Forms" : filterForm
  }`;

  return (
    <div style={styles.panel}>
      <h2 style={styles.pageTitle}>📊 School Dashboard</h2>
      <div style={{ fontSize: 11, color: "#667", marginTop: -8, marginBottom: 6 }}>
        Overview across selected classes and subjects.
      </div>

      <div style={{ ...styles.filterRow, ...(isMobile ? { alignItems: "stretch" } : {}) }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#003366" }}>Filter:</span>
        <select
          style={{ ...styles.select, ...(isMobile ? { width: "100%" } : {}) }}
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          <option value="all">All Years</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          style={{ ...styles.select, ...(isMobile ? { width: "100%" } : {}) }}
          value={filterForm}
          onChange={(e) => setFilterForm(e.target.value)}
        >
          <option value="all">All Forms</option>
          {formOptions.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <button
          style={{ ...styles.miniBtn, ...(isMobile ? { width: "100%" } : {}) }}
          onClick={() => {
            const date = new Date().toISOString().slice(0, 10);
            const name = `summary-${summaryLabel.replace(/\s+/g, "-")}-${date}.pdf`;
            exportElementToPdf(summaryRef.current, name);
          }}
        >
          📄 Export Summary
        </button>
      </div>

      {!allComputed.length && (
        <div
          style={{
            background: "#fff",
            border: "1px dashed #c8d8f8",
            borderRadius: 8,
            padding: 16,
            textAlign: "center",
            color: "#666",
            fontSize: 12,
          }}
        >
          No classes yet. Create a class to start tracking results.
        </div>
      )}
      
      <div
        ref={summaryRef}
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: isMobile ? 10 : 12,
          boxShadow: "0 1px 6px rgba(0,51,102,0.06)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: "#003366", marginBottom: 8 }}>
          📌 Summary: {summaryLabel}
        </div>
        <div style={styles.kpiRow}>
          {[
            ["🏫", "Classes", filtered.length, "#003366"],
            ["👥", "Students", allStudents.length, "#0b6b3a"],
            ["✅", "Present", present.length, "#0077aa"],
            ["🏆", "Div I", divCounts["I"], "#b8860b"],
            ["📈", "Pass Rate", passRate + "%", "#5a2d82"],
          ].map(([icon, label, val, color]) => (
            <div
              key={label}
              style={{
                ...styles.kpiCard,
                borderLeftColor: color,
                ...(isMobile ? { flex: "1 1 45%" } : {}),
              }}
            >
              <div style={{ fontSize: 22 }}>{icon}</div>
              <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color }}>{val}</div>
              <div
                style={{
                  fontSize: 10,
                  color: "#888",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.dashGrid}>
        {/* Classes Overview Table */}
        <div style={{ ...styles.card, gridColumn: isTablet ? "span 1" : "span 2" }}>
          <h3 style={styles.cardT}>🏫 Classes Overview ({summaryLabel})</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: isMobile ? 10 : 11,
                minWidth: isMobile ? 720 : "auto",
              }}
            >
              <thead>
                <tr style={{ background: "#003366", color: "#fff" }}>
                  {[
                    "Class",
                    "Students",
                    "Present",
                    "Div I",
                    "Div II",
                    "Div III",
                    "Div IV",
                    "Div 0",
                    "Pass%",
                    "Top Student",
                    "",
                  ].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: "4px 6px",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: 10,
                        border: "1px solid #224488",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cl, ri) => {
                  const pres = (cl.computed ?? []).filter(
                    s => s.total !== null
                  );
                  const d = dv => pres.filter(s => s.div === dv).length;
                  const clComplete = pres.filter(s => s.div !== null);
                  const pass = clComplete.length
                    ? Math.round(
                        (clComplete.filter(s => s.div !== "0").length / clComplete.length) *
                          100
                      )
                    : 0;
                  const top = [...pres].sort((a, b) => b.total - a.total)[0];

                  return (
                    <tr
                      key={cl.id}
                      style={{
                        background: ri % 2 === 0 ? "#fff" : "#f4f7ff",
                      }}
                    >
                      <td
                        style={{
                          padding: "3px 6px",
                          textAlign: "center",
                          border: "1px solid #cbd8f3",
                          fontWeight: 700,
                          color: "#003366",
                        }}
                      >
                        {cl.name}
                      </td>
                      <td
                        style={{
                          padding: "3px 6px",
                          textAlign: "center",
                          border: "1px solid #cbd8f3",
                        }}
                      >
                        {cl.students?.length ?? 0}
                      </td>
                      <td
                        style={{
                          padding: "3px 6px",
                          textAlign: "center",
                          border: "1px solid #cbd8f3",
                        }}
                      >
                        {pres.length}
                      </td>
                      {["I", "II", "III", "IV", "0"].map(dv => (
                        <td
                          key={dv}
                          style={{
                            padding: "3px 6px",
                            textAlign: "center",
                            border: "1px solid #cbd8f3",
                            color: DIVISION_COLORS[dv],
                            fontWeight: 700,
                          }}
                        >
                          {d(dv)}
                        </td>
                      ))}
                      <td
                        style={{
                          padding: "3px 6px",
                          textAlign: "center",
                          border: "1px solid #cbd8f3",
                          fontWeight: 700,
                          color: pass >= 50 ? "#0b6b3a" : "#8b2500",
                        }}
                      >
                        {pass}%
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          textAlign: "center",
                          border: "1px solid #cbd8f3",
                          fontSize: 10,
                        }}
                      >
                        {top?.name ?? "–"}
                      </td>
                      <td
                        style={{
                          padding: "3px 6px",
                          textAlign: "center",
                          border: "1px solid #cbd8f3",
                        }}
                      >
                        <button
                          onClick={() => onOpenClass(cl.id)}
                          style={{
                            background: "#003366",
                            color: "#fff",
                            border: "none",
                            borderRadius: 5,
                            padding: "3px 10px",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 11,
                            height: 24,
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={11}
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: "#aaa",
                      }}
                    >
                      No classes yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Division Distribution */}
        <div style={styles.card}>
          <h3 style={styles.cardT}>📊 Division Distribution</h3>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 18,
              height: 130,
              justifyContent: "center",
              marginTop: 12,
            }}
          >
            {Object.entries(divCounts).map(([div, count]) => {
              const max = Math.max(...Object.values(divCounts), 1);
              return (
                <div
                  key={div}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: DIVISION_COLORS[div] }}>
                    {count}
                  </span>
                  <div
                    style={{
                      width: 38,
                      borderRadius: "4px 4px 0 0",
                      background: DIVISION_COLORS[div],
                      height: Math.max((count / max) * 90, 4),
                      transition: "height 0.5s",
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: DIVISION_COLORS[div] }}>
                    Div {div}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subject Averages */}
        <div style={styles.card}>
          <h3 style={styles.cardT}>📚 Subject Averages</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {subjAvg.slice(0, 9).map(({ subj, avg }) => {
              const col = avg >= 65 ? "#0b6b3a" : avg >= 45 ? "#0077aa" : avg >= 30 ? "#8b2500" : "#6b0000";
              return (
                <div key={subj} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 9,
                      width: 66,
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#555",
                      flexShrink: 0,
                    }}
                  >
                    {subj}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      background: "#e8edf5",
                      borderRadius: 4,
                      height: 13,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${avg}%`,
                        height: "100%",
                        background: col,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: col,
                      width: 28,
                      flexShrink: 0,
                    }}
                  >
                    {avg}
                  </span>
                </div>
              );
            })}
            {!subjAvg.length && (
              <div style={{ color: "#aaa", fontSize: 12, textAlign: "center", padding: 20 }}>
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Top 10 Students */}
        <div style={{ ...styles.card, gridColumn: "span 2" }}>
          <h3 style={styles.cardT}>🏆 Top 10 Students</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 11,
              }}
            >
              <thead>
                <tr style={{ background: "#003366", color: "#fff" }}>
                  {["#", "Name", "Class", "Sex", "Total", "Avg", "Grade", "Division", "Points"].map(
                    h => (
                      <th
                        key={h}
                        style={{
                          padding: "5px 6px",
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: 10,
                          border: "1px solid #224488",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {top10.map((s, i) => (
                  <tr key={s.id} style={{ background: i === 0 ? "#fffbe6" : i % 2 === 0 ? "#fff" : "#f4f7ff" }}>
                    <td
                      style={{
                        padding: "4px 6px",
                        border: "1px solid #cbd8f3",
                        fontWeight: 800,
                        color: i < 3 ? "#b8860b" : "#555",
                      }}
                    >
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        border: "1px solid #cbd8f3",
                        fontWeight: 700,
                      }}
                    >
                      {s.name}
                    </td>
                    <td style={{ padding: "4px 6px", border: "1px solid #cbd8f3", color: "#003366" }}>
                      {studentClassMap[s.id] ?? ""}
                    </td>
                    <td style={{ padding: "4px 6px", border: "1px solid #cbd8f3" }}>{s.sex}</td>
                    <td style={{ padding: "4px 6px", border: "1px solid #cbd8f3", fontWeight: 800 }}>
                      {s.total}
                    </td>
                    <td style={{ padding: "4px 6px", border: "1px solid #cbd8f3" }}>{s.avg}</td>
                    <td
                      style={{
                        padding: "4px 6px",
                        border: "1px solid #cbd8f3",
                        fontWeight: 800,
                        color: GRADE_COLORS[s.agrd],
                      }}
                    >
                      {s.agrd}
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        border: "1px solid #cbd8f3",
                        fontWeight: 800,
                        color: DIVISION_COLORS[s.div],
                      }}
                    >
                      {s.div}
                    </td>
                    <td style={{ padding: "4px 6px", border: "1px solid #cbd8f3" }}>{s.points}</td>
                  </tr>
                ))}
                {!top10.length && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: "#aaa",
                      }}
                    >
                      No student data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
