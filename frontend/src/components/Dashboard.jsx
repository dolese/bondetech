import React, { useMemo, useRef, useState, useCallback } from "react";
import { GRADE_COLORS, DIVISION_COLORS, DEFAULT_SCHOOL } from "../utils/constants";
import { getGradePoints } from "../utils/grading";
import { useViewport } from "../utils/useViewport";
import { exportElementToPdf } from "../utils/pdfExport";
import { API } from "../api";
import { useTheme } from "../utils/ThemeContext";
import { themeColors } from "../utils/themeColors";

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function Dashboard({ allComputed, onOpenClass, onViewProfile }) {
  const { isMobile, isTablet, isLarge } = useViewport();
  const { dark } = useTheme();
  const t = themeColors(dark);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterForm, setFilterForm] = useState("all");
  const summaryRef = useRef(null);

  // Global student search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const handleSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) { setSearchResults(null); return; }
    setSearching(true);
    setSearchError(null);
    try {
      const results = await API.searchStudents(trimmed, { limit: 30 });
      setSearchResults(results);
    } catch (e) {
      setSearchError(e.message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

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
  const totalStudentCount = filtered.reduce((sum, c) => sum + (c.studentCount ?? 0), 0);
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

  // Class ranking by pass rate (for chart)
  const classRankings = useMemo(() => {
    return filtered
      .map(cl => {
        const scoredStudents = (cl.computed ?? []).filter(s => s.total !== null);
        const complete = scoredStudents.filter(s => s.div !== null);
        const pass = complete.length
          ? Math.round(complete.filter(s => s.div !== "0").length / complete.length * 100)
          : 0;
        const avg = scoredStudents.length
          ? Number((scoredStudents.reduce((s, st) => s + (st.total || 0), 0) / scoredStudents.length).toFixed(1))
          : 0;
        return { name: cl.name, passRate: pass, avg, studentCount: scoredStudents.length };
      })
      .filter(c => c.studentCount > 0)
      .sort((a, b) => b.passRate - a.passRate);
  }, [filtered]);

  // School-wide JSON backup export
  const exportAllData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      classes: allComputed.map(({ computed: _computed, ...rest }) => rest),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `school-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRankBadge = (position) => {
    if (position === 0) return "🥇";
    if (position === 1) return "🥈";
    if (position === 2) return "🥉";
    return String(position + 1);
  };

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
    pageTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: 900,
      color: t.header,
      margin: "0 0 14px",
      paddingBottom: 8,
      borderBottom: `2px solid ${t.border}`,
    },
    kpiRow: {
      display: "flex",
      gap: isMobile ? 8 : 10,
      flexWrap: isLarge ? "nowrap" : "wrap",
      marginBottom: 14,
    },
    kpiCard: {
      flex: 1,
      minWidth: isLarge ? 0 : isMobile ? 140 : 110,
      background: t.bgCard,
      borderRadius: 10,
      padding: isLarge ? "14px 16px" : "10px 12px",
      boxShadow: "0 1px 6px rgba(0,51,102,0.08)",
      display: "flex",
      flexDirection: "column",
      gap: 3,
      borderLeft: "4px solid",
    },
    dashGrid: {
      display: "grid",
      gridTemplateColumns: isLarge ? "1fr 1fr 1fr" : isMobile ? "1fr" : "1fr 1fr",
      gap: 12,
    },
    card: {
      background: t.bgCard,
      borderRadius: 10,
      padding: isMobile ? 10 : 12,
      boxShadow: "0 1px 6px rgba(0,51,102,0.07)",
    },
    cardT: {
      margin: "0 0 10px",
      fontSize: 13,
      fontWeight: 800,
      color: t.header,
      borderBottom: `1.5px solid ${t.borderLight}`,
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
      border: `1px solid ${t.borderInput}`,
      background: t.bgInput,
      fontSize: 11,
      fontWeight: 700,
      color: t.header,
    },
    miniBtn: {
      padding: "6px 10px",
      borderRadius: 8,
      border: `1px solid ${t.tableHeader}`,
      background: t.tableHeader,
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
      <div style={{ fontSize: 11, color: t.textMuted, marginTop: -8, marginBottom: 6 }}>
        Overview across selected classes and subjects.
      </div>

      {/* Global student search */}
      <div style={{
        background: t.bgCard,
        borderRadius: 10,
        padding: isMobile ? 10 : 14,
        boxShadow: "0 1px 6px rgba(0,51,102,0.07)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: t.header }}>🔍 Search Students</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Name or index number…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(searchQuery); }}
            style={{
              flex: 1,
              minWidth: 160,
              padding: "7px 10px",
              borderRadius: 7,
              border: `1px solid ${t.borderInput}`,
              fontSize: 12,
              background: t.bgInput,
              color: t.text,
            }}
          />
          <button
            onClick={() => handleSearch(searchQuery)}
            disabled={searching || !searchQuery.trim()}
            style={{
              padding: "7px 16px",
              borderRadius: 7,
              border: "none",
              background: searching ? "#999" : t.tableHeader,
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: searching ? "not-allowed" : "pointer",
            }}
          >
            {searching ? "Searching…" : "Search"}
          </button>
          {searchResults !== null && (
            <button
              onClick={() => { setSearchResults(null); setSearchQuery(""); setSearchError(null); }}
              style={{
                padding: "7px 12px",
                borderRadius: 7,
                border: `1px solid ${t.border}`,
                background: t.bgCard,
                fontSize: 12,
                cursor: "pointer",
                color: t.textMuted,
              }}
            >
              Clear
            </button>
          )}
        </div>
        {searchError && <div style={{ fontSize: 11, color: "#8b2500" }}>{searchError}</div>}
        {searchResults !== null && (
          searchResults.length === 0 ? (
            <div style={{ fontSize: 11, color: t.textMuted }}>No students found.</div>
          ) : isMobile ? (
            /* Mobile search result cards */
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {searchResults.map((s, i) => (
                <div key={`${s.classId}-${s.studentId}`} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: i % 2 === 0 ? t.rowEven : t.rowOdd,
                  border: `1px solid ${t.borderLight}`, borderRadius: 7, padding: "8px 10px",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: t.header, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>
                      <span style={{ fontFamily: "monospace" }}>{s.indexNo}</span>
                      {" · "}{s.className} · {s.form} {s.year}
                    </div>
                  </div>
                  {onViewProfile && s.indexNo && (
                    <button
                      onClick={() => onViewProfile(s.indexNo)}
                      style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: t.tableHeader, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: 8 }}
                    >
                      Profile
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {["CNO", "Name", "Sex", "Class", "Form", "Year", ""].map(h => (
                      <th key={h} style={{
                        padding: "5px 8px",
                        background: t.tableHeader,
                        color: "#fff",
                        fontWeight: 700,
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((s, i) => (
                    <tr key={`${s.classId}-${s.studentId}`} style={{ background: i % 2 === 0 ? t.rowEven : t.rowOdd }}>
                      <td style={{ padding: "5px 8px", borderBottom: `1px solid ${t.borderLight}`, fontFamily: "monospace", color: t.text }}>{s.indexNo}</td>
                      <td style={{ padding: "5px 8px", borderBottom: `1px solid ${t.borderLight}`, fontWeight: 600, color: t.text }}>{s.name}</td>
                      <td style={{ padding: "5px 8px", borderBottom: `1px solid ${t.borderLight}`, color: t.text }}>{s.sex}</td>
                      <td style={{ padding: "5px 8px", borderBottom: `1px solid ${t.borderLight}`, color: t.text }}>{s.className}</td>
                      <td style={{ padding: "5px 8px", borderBottom: `1px solid ${t.borderLight}`, color: t.text }}>{s.form}</td>
                      <td style={{ padding: "5px 8px", borderBottom: `1px solid ${t.borderLight}`, color: t.text }}>{s.year}</td>
                      <td style={{ padding: "5px 8px", borderBottom: `1px solid ${t.borderLight}` }}>
                        {onViewProfile && s.indexNo && (
                          <button
                            onClick={() => onViewProfile(s.indexNo)}
                            style={{
                              padding: "3px 10px",
                              borderRadius: 5,
                              border: "none",
                              background: t.tableHeader,
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Profile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <div style={{ ...styles.filterRow, ...(isMobile ? { alignItems: "stretch" } : {}) }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: t.header }}>Filter:</span>
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
        <button
          style={{ ...styles.miniBtn, background: "#0b6b3a", borderColor: "#0b6b3a", ...(isMobile ? { width: "100%" } : {}) }}
          onClick={exportAllData}
          title="Download a full JSON backup of all classes and student data"
          disabled={!allComputed.length}
        >
          💾 Export All Data
        </button>
      </div>

      {!allComputed.length && (
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
          No classes yet. Create a class to start tracking results.
        </div>
      )}
      
      <div
        ref={summaryRef}
        style={{
          background: t.bgCard,
          borderRadius: 10,
          padding: isMobile ? 10 : 12,
          boxShadow: "0 1px 6px rgba(0,51,102,0.06)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: t.header, marginBottom: 8 }}>
          📌 Summary: {summaryLabel}
        </div>
        <div style={styles.kpiRow}>
          {[
            ["🏫", "Classes", filtered.length, "#003366"],
            ["👥", "Students", totalStudentCount, "#0b6b3a"],
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
              <div style={{ fontSize: isLarge ? 26 : 22 }}>{icon}</div>
              <div style={{ fontSize: isLarge ? 30 : isMobile ? 22 : 26, fontWeight: 900, color }}>{val}</div>
              <div
                style={{
                  fontSize: isLarge ? 11 : 10,
                  color: t.textMuted,
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
        {/* Classes Overview */}
        <div style={{ ...styles.card, gridColumn: isLarge ? "span 3" : isMobile ? "span 1" : "span 2" }}>
          <h3 style={styles.cardT}>🏫 Classes Overview ({summaryLabel})</h3>
          {isMobile ? (
            /* Mobile card list */
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((cl) => {
                const pres = (cl.computed ?? []).filter(s => s.total !== null);
                const d = dv => pres.filter(s => s.div === dv).length;
                const clComplete = pres.filter(s => s.div !== null);
                const pass = clComplete.length
                  ? Math.round(clComplete.filter(s => s.div !== "0").length / clComplete.length * 100)
                  : 0;
                const top = [...pres].sort((a, b) => b.total - a.total)[0];
                return (
                  <div key={cl.id} style={{ background: t.bgCardAlt, borderRadius: 8, padding: "10px 12px", border: `1px solid ${t.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: t.header }}>{cl.name}</span>
                        {cl.published && (
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 999, background: "#0b6b3a", color: "#fff", fontWeight: 700 }}>Published</span>
                        )}
                      </div>
                      <button
                        onClick={() => onOpenClass(cl.id)}
                        style={{ background: t.tableHeader, color: "#fff", border: "none", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontWeight: 700, fontSize: 11 }}
                      >
                        Open
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 11, color: t.text }}>
                      <span>👥 <b>{cl.studentCount ?? 0}</b> students</span>
                      <span>✅ <b>{pres.length}</b> present</span>
                      <span style={{ color: pass >= 50 ? "#0b6b3a" : "#8b2500", fontWeight: 700 }}>📈 {pass}% pass</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px", marginTop: 4, fontSize: 10 }}>
                      {["I","II","III","IV","0"].map(dv => (
                        <span key={dv} style={{ color: DIVISION_COLORS[dv], fontWeight: 700 }}>Div {dv}: {d(dv)}</span>
                      ))}
                    </div>
                    {top && (
                      <div style={{ marginTop: 4, fontSize: 10, color: t.textMid }}>🏆 Top: <b>{top.name}</b></div>
                    )}
                  </div>
                );
              })}
              {!filtered.length && (
                <div style={{ padding: 16, textAlign: "center", color: t.textMuted, fontSize: 12 }}>No classes yet</div>
              )}
            </div>
          ) : (
          <div style={{ overflowX: "auto", minWidth: 0 }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: isMobile ? 10 : 11,
                minWidth: isMobile ? 720 : "auto",
              }}
            >
              <thead>
                <tr style={{ background: t.tableHeader, color: "#fff" }}>
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
                        border: `1px solid ${t.tableHeader}`,
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
                        background: ri % 2 === 0 ? t.rowEven : t.rowOdd,
                      }}
                    >
                      <td
                        style={{
                          padding: "3px 6px",
                          textAlign: "center",
                          border: `1px solid ${t.borderTable}`,
                          fontWeight: 700,
                          color: t.header,
                        }}
                      >
                        {cl.name}
                        {cl.published && (
                          <span style={{
                            marginLeft: 5,
                            fontSize: 8,
                            padding: "1px 5px",
                            borderRadius: 999,
                            background: "#0b6b3a",
                            color: "#fff",
                            fontWeight: 700,
                            verticalAlign: "middle",
                          }}>
                            Published
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "3px 6px",
                          textAlign: "center",
                          border: `1px solid ${t.borderTable}`,
                          color: t.text,
                        }}
                      >
                        {cl.studentCount ?? 0}
                      </td>
                      <td
                        style={{
                          padding: "3px 6px",
                          textAlign: "center",
                          border: `1px solid ${t.borderTable}`,
                          color: t.text,
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
                            border: `1px solid ${t.borderTable}`,
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
                          border: `1px solid ${t.borderTable}`,
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
                          border: `1px solid ${t.borderTable}`,
                          fontSize: 10,
                          color: t.text,
                        }}
                      >
                        {top?.name ?? "–"}
                      </td>
                      <td
                        style={{
                          padding: "3px 6px",
                          textAlign: "center",
                          border: `1px solid ${t.borderTable}`,
                        }}
                      >
                        <button
                          onClick={() => onOpenClass(cl.id)}
                          style={{
                            background: t.tableHeader,
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
                        color: t.textMuted,
                      }}
                    >
                      No classes yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
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
                      color: t.textMid,
                      flexShrink: 0,
                    }}
                  >
                    {subj}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      background: t.bgCardAlt,
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
              <div style={{ color: t.textMuted, fontSize: 12, textAlign: "center", padding: 20 }}>
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Top 10 Students */}
        <div style={{ ...styles.card, gridColumn: isLarge ? "span 3" : "span 2" }}>
          <h3 style={styles.cardT}>🏆 Top 10 Students</h3>
          {isMobile ? (
            /* Mobile ranked card list */
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {top10.map((s, i) => (
                <div key={s.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: i === 0 ? (dark ? "#2a2200" : "#fffbe6") : i % 2 === 0 ? t.rowEven : t.rowOdd,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                }}>
                  <span style={{ fontSize: 18, minWidth: 24, textAlign: "center" }}>
                    {getRankBadge(i)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: t.header, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>{studentClassMap[s.id] ?? ""} · {s.sex}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: t.header }}>{s.total}</span>
                    <span style={{ fontWeight: 700, fontSize: 11, color: GRADE_COLORS[s.agrd] }}>{s.agrd}</span>
                    <span style={{ fontWeight: 700, fontSize: 11, color: DIVISION_COLORS[s.div] }}>Div {s.div}</span>
                  </div>
                </div>
              ))}
              {!top10.length && (
                <div style={{ padding: 20, textAlign: "center", color: t.textMuted, fontSize: 12 }}>No student data yet</div>
              )}
            </div>
          ) : (
          <div style={{ overflowX: "auto", minWidth: 0 }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 11,
              }}
            >
              <thead>
                <tr style={{ background: t.tableHeader, color: "#fff" }}>
                  {["#", "Name", "Class", "Sex", "Total", "Avg", "Grade", "Division", "Points"].map(
                    h => (
                      <th
                        key={h}
                        style={{
                          padding: "5px 6px",
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: 10,
                          border: `1px solid ${t.tableHeader}`,
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
                  <tr key={s.id} style={{ background: i === 0 ? (dark ? "#2a2200" : "#fffbe6") : i % 2 === 0 ? t.rowEven : t.rowOdd }}>
                    <td
                      style={{
                        padding: "4px 6px",
                        border: `1px solid ${t.borderTable}`,
                        fontWeight: 800,
                        color: i < 3 ? "#b8860b" : t.textMid,
                      }}
                    >
                      {getRankBadge(i)}
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        border: `1px solid ${t.borderTable}`,
                        fontWeight: 700,
                        color: t.text,
                      }}
                    >
                      {s.name}
                    </td>
                    <td style={{ padding: "4px 6px", border: `1px solid ${t.borderTable}`, color: t.header }}>
                      {studentClassMap[s.id] ?? ""}
                    </td>
                    <td style={{ padding: "4px 6px", border: `1px solid ${t.borderTable}`, color: t.text }}>{s.sex}</td>
                    <td style={{ padding: "4px 6px", border: `1px solid ${t.borderTable}`, fontWeight: 800, color: t.text }}>
                      {s.total}
                    </td>
                    <td style={{ padding: "4px 6px", border: `1px solid ${t.borderTable}`, color: t.text }}>{s.avg}</td>
                    <td
                      style={{
                        padding: "4px 6px",
                        border: `1px solid ${t.borderTable}`,
                        fontWeight: 800,
                        color: GRADE_COLORS[s.agrd],
                      }}
                    >
                      {s.agrd}
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        border: `1px solid ${t.borderTable}`,
                        fontWeight: 800,
                        color: DIVISION_COLORS[s.div],
                      }}
                    >
                      {s.div}
                    </td>
                    <td style={{ padding: "4px 6px", border: `1px solid ${t.borderTable}`, color: t.text }}>{s.points}</td>
                  </tr>
                ))}
                {!top10.length && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: t.textMuted,
                      }}
                    >
                      No student data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Class Rankings by Pass Rate */}
        {classRankings.length > 0 && (
          <div style={{ ...styles.card, gridColumn: isLarge ? "span 3" : isMobile ? "span 1" : "span 2" }}>
            <h3 style={styles.cardT}>🏫 Class Rankings by Pass Rate</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {classRankings.map(({ name, passRate: rate, avg, studentCount }, i) => {
                const col = rate >= 75 ? "#0b6b3a" : rate >= 50 ? "#0077aa" : rate >= 30 ? "#8b2500" : "#6b0000";
                return (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: i < 3 ? "#b8860b" : t.textMid,
                        width: 18,
                        flexShrink: 0,
                        textAlign: "center",
                      }}
                    >
                      {getRankBadge(i)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: t.header,
                        width: isMobile ? 80 : 110,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={name}
                    >
                      {name}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        background: t.bgCardAlt,
                        borderRadius: 4,
                        height: 14,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${rate}%`,
                          height: "100%",
                          background: col,
                          borderRadius: 4,
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: col,
                        width: 34,
                        flexShrink: 0,
                        textAlign: "right",
                      }}
                    >
                      {rate}%
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: t.textMuted,
                        width: isMobile ? 0 : 60,
                        flexShrink: 0,
                        display: isMobile ? "none" : "block",
                      }}
                    >
                      avg {avg} · {studentCount} students
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
