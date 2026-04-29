import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_SCHOOL, DEFAULT_EXAM_TYPE, EXAM_TYPES, getMonthlyExamKey } from "../utils/constants";
import { exportElementToPdfBlob } from "../utils/pdfExport";
import { useViewport } from "../utils/useViewport";
import { ReportCardPrint } from "./ReportCardPrint";
import { createRoot } from "react-dom/client";
import { withPositions } from "../utils/grading";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const TEMPLATE_OPTIONS = [
  { label: "Official", value: "official" },
  { label: "Compact", value: "compact" },
];
const REPORT_CARD_PAPER_SIZE = "a4";
const REPORT_CARD_ORIENTATION = "portrait";

function normalizeExamList(classData, computed) {
  const standardExams = EXAM_TYPES.map((exam) => exam.value);
  const monthlyExams = (classData.monthly_exams ?? []).map((month) => getMonthlyExamKey(month));
  const scoreExams = new Set();
  (computed ?? []).forEach((student) => {
    Object.keys(student.examScores ?? {}).forEach((exam) => scoreExams.add(exam));
  });
  return Array.from(
    new Set([
      classData.school_info?.exam || DEFAULT_EXAM_TYPE,
      ...standardExams,
      ...monthlyExams,
      ...scoreExams,
    ].filter(Boolean))
  );
}

function buildExamComputed(classData, exam, rawStudents) {
  const studentsWithExamScores = (rawStudents ?? []).map((student) => ({
    ...student,
    scores: student.examScores?.[exam] ?? [],
  }));
  return withPositions(studentsWithExamScores, classData.subjects ?? []);
}

function averageOf(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function ReportsPage({ classData, computed, allClasses = [], onOpenReportCard }) {
  const { isMobile } = useViewport();
  const [exportingZip, setExportingZip] = useState(false);
  const [template, setTemplate] = useState("official");
  const schoolInfo = classData.school_info ?? DEFAULT_SCHOOL;
  const present = (computed ?? [])
    .filter((student) => student.total !== null)
    .sort((a, b) => (a.posn ?? Infinity) - (b.posn ?? Infinity));

  const examOptions = useMemo(
    () => normalizeExamList(classData, computed),
    [classData, computed]
  );
  const [selectedSubject, setSelectedSubject] = useState(() => classData.subjects?.[0] ?? "");
  const [selectedStudentId, setSelectedStudentId] = useState(() => present[0]?.id ?? "");

  useEffect(() => {
    setSelectedSubject(classData.subjects?.[0] ?? "");
  }, [classData.id, classData.subjects]);

  useEffect(() => {
    if (!present.length) {
      setSelectedStudentId("");
      return;
    }
    if (!present.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(present[0].id);
    }
  }, [present, selectedStudentId]);

  const examSnapshots = useMemo(
    () =>
      examOptions.map((exam) => {
        const examComputed = buildExamComputed(classData, exam, classData.students ?? []);
        const presentStudents = examComputed.filter((student) => student.total !== null);
        const ordered = presentStudents.sort((a, b) => (a.posn ?? Infinity) - (b.posn ?? Infinity));
        const avgTotal = averageOf(presentStudents.map((student) => Number(student.total || 0)));
        return {
          exam,
          students: ordered,
          avgTotal,
          completeCount: presentStudents.length,
          topper: ordered[0] ?? null,
        };
      }),
    [classData, examOptions]
  );

  const rankingHistory = useMemo(
    () =>
      examSnapshots.map((snapshot) => ({
        exam: snapshot.exam,
        avgTotal: snapshot.avgTotal,
        completeCount: snapshot.completeCount,
        leaders: snapshot.students.slice(0, 3).map((student) => ({
          id: student.id,
          name: student.name,
          posn: student.posn,
          avg: student.avg,
        })),
      })),
    [examSnapshots]
  );

  const selectedStudentHistory = useMemo(
    () =>
      examSnapshots
        .map((snapshot) => {
          const student = snapshot.students.find((entry) => entry.id === selectedStudentId);
          if (!student) return null;
          return {
            exam: snapshot.exam,
            posn: student.posn,
            avg: student.avg,
            total: student.total,
            div: student.div,
          };
        })
        .filter(Boolean),
    [examSnapshots, selectedStudentId]
  );

  const subjectTrend = useMemo(
    () =>
      examSnapshots.map((snapshot) => {
        const subjectIndex = (classData.subjects ?? []).findIndex((subject) => subject === selectedSubject);
        const scores = snapshot.students
          .map((student) => student.scores?.[subjectIndex])
          .filter((score) => score !== "" && score !== null && score !== undefined)
          .map((score) => Number(score));
        return {
          exam: snapshot.exam,
          average: averageOf(scores),
          count: scores.length,
          peak: scores.length ? Math.max(...scores) : 0,
        };
      }),
    [classData.subjects, examSnapshots, selectedSubject]
  );

  const classComparison = useMemo(() => {
    const relevantClasses = (allClasses ?? []).filter((entry) => entry.year === classData.year);
    const classStats = relevantClasses
      .map((entry) => {
        const activeStudents = (entry.computed ?? []).filter((student) => student.total !== null);
        const avg = averageOf(activeStudents.map((student) => Number(student.avg || 0)));
        return {
          id: entry.id,
          name: entry.name,
          exam: entry.school_info?.exam || DEFAULT_EXAM_TYPE,
          avg,
          count: activeStudents.length,
        };
      })
      .sort((a, b) => b.avg - a.avg);
    const current = classStats.find((entry) => entry.id === classData.id) ?? null;
    return {
      ordered: classStats,
      current,
      rank: current ? classStats.findIndex((entry) => entry.id === current.id) + 1 : null,
      best: classStats[0] ?? null,
    };
  }, [allClasses, classData.id, classData.year]);

  const exportAllZip = async () => {
    if (exportingZip || !present.length) return;
    setExportingZip(true);
    try {
      const zip = new JSZip();
      const safeClass = (classData.name || "class").replace(/[^a-z0-9-_ ]/gi, "").trim() || "class";
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      document.body.appendChild(container);
      const root = createRoot(container);

      for (const student of present) {
        await new Promise((resolve) => {
          root.render(
            <ReportCardPrint
              student={student}
              classData={classData}
              template={template}
              paperSize={REPORT_CARD_PAPER_SIZE}
              orientation={REPORT_CARD_ORIENTATION}
            />
          );
          setTimeout(async () => {
            const blob = await exportElementToPdfBlob(container.firstChild, {
              format: REPORT_CARD_PAPER_SIZE,
              orientation: REPORT_CARD_ORIENTATION,
            });
            if (blob) {
              const safeName = (student.name || "student").replace(/[^a-z0-9-_ ]/gi, "").trim() || "student";
              zip.file(`${safeClass}-${safeName}.pdf`, blob);
            }
            resolve();
          }, 0);
        });
      }

      root.unmount();
      document.body.removeChild(container);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${safeClass}-report-cards.zip`);
    } finally {
      setExportingZip(false);
    }
  };

  const currentAvg = averageOf(present.map((student) => Number(student.avg || 0)));

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 0,
      background: "#f6f9ff",
    },
    section: {
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e1e8f5",
      boxShadow: "0 10px 28px rgba(0,51,102,0.06)",
      padding: isMobile ? 14 : 18,
    },
    controlLabel: {
      fontSize: 11,
      fontWeight: 800,
      color: "#516074",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 4,
      display: "block",
    },
    select: {
      width: "100%",
      border: "1px solid #ced8eb",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 13,
      background: "#fff",
    },
    metricCard: {
      borderRadius: 14,
      background: "linear-gradient(180deg, #f8fbff, #eef4ff)",
      border: "1px solid #dbe7ff",
      padding: 14,
      display: "grid",
      gap: 6,
    },
    viewBtn: {
      padding: "4px 10px",
      background: "#003366",
      color: "#fff",
      border: "none",
      borderRadius: 5,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 11,
    },
    empty: {
      background: "#fff",
      border: "1px dashed #c8d8f8",
      borderRadius: 8,
      padding: 24,
      textAlign: "center",
      color: "#666",
      fontSize: 12,
    },
  };

  return (
    <div style={styles.panel}>
      <div style={{ ...styles.section, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: "#102a43" }}>Report Center</h3>
            <div style={{ fontSize: 13, color: "#607086", lineHeight: 1.7 }}>
              {schoolInfo.name} • {classData.form || ""} {classData.year || ""} • {schoolInfo.exam || DEFAULT_EXAM_TYPE}
            </div>
          </div>
          <button
            style={{
              padding: "10px 16px",
              background: exportingZip ? "#9ca3af" : "#003366",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: exportingZip ? "not-allowed" : "pointer",
              fontWeight: 800,
              fontSize: 12,
            }}
            onClick={exportAllZip}
            disabled={exportingZip || !present.length}
          >
            {exportingZip ? "Exporting..." : "Export All PDFs"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <div style={styles.metricCard}>
            <div style={{ fontSize: 11, color: "#516074", fontWeight: 800, textTransform: "uppercase" }}>Students Reported</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#102a43" }}>{present.length}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Scored students in the selected class exam.</div>
          </div>
          <div style={styles.metricCard}>
            <div style={{ fontSize: 11, color: "#516074", fontWeight: 800, textTransform: "uppercase" }}>Class Average</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#102a43" }}>{currentAvg.toFixed(1)}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Average student mark for the current class exam.</div>
          </div>
          <div style={styles.metricCard}>
            <div style={{ fontSize: 11, color: "#516074", fontWeight: 800, textTransform: "uppercase" }}>Year Rank</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#102a43" }}>{classComparison.rank || "-"}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {classComparison.best ? `Best peer: ${classComparison.best.name}` : "No peer comparison yet."}
            </div>
          </div>
          <div style={styles.metricCard}>
            <div style={{ fontSize: 11, color: "#516074", fontWeight: 800, textTransform: "uppercase" }}>Top Performer</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#102a43" }}>{present[0]?.name || "-"}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{present[0] ? `Average ${present[0].avg}` : "No completed ranking yet."}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <div>
            <label style={styles.controlLabel}>Template</label>
            <select value={template} onChange={(event) => setTemplate(event.target.value)} style={styles.select}>
              {TEMPLATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={styles.controlLabel}>Paper Size</label>
            <div style={{ ...styles.select, background: "#eef4ff", fontWeight: 700, color: "#17324d" }}>
              A4
            </div>
          </div>
          <div>
            <label style={styles.controlLabel}>Orientation</label>
            <div style={{ ...styles.select, background: "#eef4ff", fontWeight: 700, color: "#17324d" }}>
              Portrait
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr", gap: 12 }}>
        <div style={{ ...styles.section, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#102a43" }}>Ranking History</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Track rank changes across all recorded exam types in this class.</div>
            </div>
            <div style={{ minWidth: isMobile ? "100%" : 220 }}>
              <label style={styles.controlLabel}>Selected Student</label>
              <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} style={styles.select}>
                {present.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {rankingHistory.map((snapshot) => (
              <div key={snapshot.exam} style={{ border: "1px solid #e4ebf7", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43" }}>{snapshot.exam}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Avg total {snapshot.avgTotal.toFixed(1)} • {snapshot.completeCount} ranked students
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {snapshot.leaders.length ? snapshot.leaders.map((leader) => (
                    <div key={leader.id} style={{ background: "#f8fbff", border: "1px solid #dbe7ff", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: "#17324d" }}>
                      #{leader.posn} {leader.name} • Avg {leader.avg}
                    </div>
                  )) : (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>No complete rankings for this exam yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #edf2fb", paddingTop: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43", marginBottom: 8 }}>Selected Student Trend</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {selectedStudentHistory.length ? selectedStudentHistory.map((entry) => (
                <div key={entry.exam} style={{ background: "#f8fbff", borderRadius: 12, border: "1px solid #e0e8f7", padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#516074", textTransform: "uppercase" }}>{entry.exam}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#102a43", marginTop: 4 }}>#{entry.posn}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Avg {entry.avg} • Total {entry.total}</div>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>The selected student has not completed enough exams to show history yet.</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ ...styles.section, display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#102a43" }}>Subject Trends</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>See how one subject performs across the class exam history.</div>
          </div>
          <div>
            <label style={styles.controlLabel}>Subject</label>
            <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} style={styles.select}>
              {(classData.subjects ?? []).map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {subjectTrend.map((entry) => {
              const width = Math.max(8, Math.min(100, entry.average));
              return (
                <div key={entry.exam} style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "#425466" }}>
                    <span style={{ fontWeight: 700 }}>{entry.exam}</span>
                    <span>Avg {entry.average.toFixed(1)} • {entry.count} marks</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "#e6edf8", overflow: "hidden" }}>
                    <div style={{ width: `${width}%`, height: "100%", background: "linear-gradient(90deg, #2563eb, #06b6d4)" }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid #edf2fb", paddingTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43", marginBottom: 8 }}>Class Comparison</div>
            <div style={{ display: "grid", gap: 8 }}>
              {classComparison.ordered.length ? classComparison.ordered.slice(0, 5).map((entry, index) => (
                <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid #e2ebf7", borderRadius: 12, background: entry.id === classData.id ? "#eef5ff" : "#fff" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#102a43" }}>
                      #{index + 1} {entry.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{entry.exam} • {entry.count} students</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#17324d" }}>{entry.avg.toFixed(1)}</div>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>No peer classes available for comparison in this year.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!present.length ? (
        <div style={styles.empty}>
          No scored students yet. Enter student scores to generate report cards.
        </div>
      ) : (
        <div style={{ ...styles.section, display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#102a43" }}>Printable Report Templates</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Preview and export individual student cards using the selected template. Student report cards are fixed to A4 portrait.
            </div>
          </div>

          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {present.map((student, index) => (
                <div key={student.id} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", boxShadow: "0 1px 6px rgba(0,51,102,0.07)", border: "1px solid #e8eef8" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 12, color: index < 3 ? "#b8860b" : "#888", minWidth: 20 }}>
                        #{student.posn ?? index + 1}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#003366" }}>{student.name}</span>
                    </div>
                    <button style={styles.viewBtn} onClick={() => onOpenReportCard(student.id)}>View</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", fontSize: 11 }}>
                    <span style={{ fontFamily: "monospace", color: "#555" }}>CNO: {student.index_no ?? student.indexNo ?? "-"}</span>
                    <span>Total: <b>{student.total ?? "-"}</b></span>
                    <span>Avg: <b>{student.avg ?? "-"}</b></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["#", "CNO", "Name", "Sex", "Total", "Avg", "Template", "Report Card"].map((label) => (
                      <th key={label} style={{ background: "#003366", color: "#fff", padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {present.map((student, index) => (
                    <tr key={student.id} style={{ background: index % 2 === 0 ? "#fff" : "#f7f9ff" }}>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #e8eef8" }}>{student.posn ?? index + 1}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #e8eef8", fontFamily: "monospace" }}>{student.index_no ?? student.indexNo ?? ""}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #e8eef8", fontWeight: 600 }}>{student.name}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #e8eef8" }}>{student.sex === "F" ? "F" : "M"}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #e8eef8", fontWeight: 700 }}>{student.total ?? "-"}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #e8eef8" }}>{student.avg ?? "-"}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #e8eef8" }}>
                        {(template === "compact" ? "Compact" : "Official") + " • A4"}
                      </td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #e8eef8", textAlign: "center" }}>
                        <button style={styles.viewBtn} onClick={() => onOpenReportCard(student.id)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
