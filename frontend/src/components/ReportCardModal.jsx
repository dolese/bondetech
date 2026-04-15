import React, { useState, useMemo, useRef, useEffect } from "react";
import { GRADE_COLORS, DIVISION_COLORS } from "../utils/constants";
import { getGradePoints } from "../utils/grading";
import { useViewport } from "../utils/useViewport";
import { exportElementToPdf } from "../utils/pdfExport";

export function ReportCardModal({ student, classData, onClose, autoExport = false, silent = false }) {
  if (!student) return null;
  const { isMobile } = useViewport();
  const cardRef = useRef(null);

  const subjects = classData.subjects ?? [];
  const grades = student.grades ?? [];
  const schoolInfo = classData.school_info ?? {};

  const getTermLabel = (term) => {
    const raw = String(term ?? "").trim();
    if (!raw) return "";
    const upper = raw.toUpperCase();
    if (upper === "I" || upper === "II" || upper === "III") return raw;
    if (upper.includes("MID")) return "I";
    if (upper.includes("FINAL") || upper.includes("END") || upper.includes("TERMINAL")) return "II";
    return raw;
  };

  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,51,102,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      background: "#fff",
      borderRadius: 10,
      boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
      width: isMobile ? "96%" : "92%",
      maxWidth: 760,
      maxHeight: "90vh",
      overflowY: "auto",
      position: "relative",
    },
    header: {
      background: "#0d5c4f",
      color: "#fff",
      padding: isMobile ? 10 : 12,
      borderRadius: "10px 10px 0 0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      position: "sticky",
      top: 0,
      zIndex: 10,
    },
    headerCenter: {
      textAlign: "center",
      flex: 1,
      padding: "0 12px",
    },
    closeBtn: {
      background: "transparent",
      border: "none",
      color: "#fff",
      fontSize: 24,
      cursor: "pointer",
      padding: 0,
      width: 32,
      height: 32,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    exportBtn: {
      background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.3)",
      color: "#fff",
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: isMobile ? 10 : 11,
      cursor: "pointer",
      fontWeight: 700,
      marginRight: 8,
      height: 30,
    },
    content: {
      padding: isMobile ? 14 : 20,
      fontFamily: "'Times New Roman', serif",
      color: "#1f1f1f",
      maxWidth: "210mm",
      margin: "0 auto",
    },
    cardHeader: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "80px 1fr 80px",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
      textAlign: isMobile ? "center" : "left",
    },
    crest: {
      width: isMobile ? 52 : 70,
      height: isMobile ? 52 : 70,
      objectFit: "contain",
      margin: isMobile ? "0 auto" : 0,
    },
    schoolTitle: {
      textAlign: "center",
      lineHeight: 1.2,
    },
    schoolName: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: 800,
      letterSpacing: 0.3,
      margin: 0,
    },
    schoolSub: {
      fontSize: isMobile ? 11 : 12,
      margin: "2px 0",
    },
    schoolSub2: {
      fontSize: isMobile ? 11 : 12,
      margin: "2px 0",
    },
    rule: {
      height: 2,
      background: "#0d5c4f",
      margin: "8px 0",
    },
    title: {
      textAlign: "center",
      fontSize: isMobile ? 14 : 16,
      fontWeight: 800,
      letterSpacing: 0.5,
      margin: "4px 0 8px",
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      borderTop: "1px solid #9fb3b0",
      borderBottom: "1px solid #9fb3b0",
    },
    infoRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "110px 1fr" : "140px 1fr",
      borderBottom: "1px solid #c7d2d0",
      padding: "8px 10px",
      fontSize: isMobile ? 11 : 12,
    },
    infoRowRight: {
      borderLeft: isMobile ? "none" : "1px solid #c7d2d0",
    },
    infoLabel: {
      fontWeight: 700,
    },
    sectionTitle: {
      margin: "14px 0 6px",
      fontWeight: 800,
      fontSize: isMobile ? 11 : 12,
      letterSpacing: 0.3,
      color: "#0d5c4f",
    },
    scoreWrap: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
      gap: 12,
      alignItems: "start",
    },
    scoreTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: isMobile ? 11 : 12,
    },
    th: {
      padding: "6px",
      background: "#eef2f2",
      border: "1px solid #9fb3b0",
      fontWeight: 700,
      textAlign: "center",
    },
    td: {
      padding: "6px",
      border: "1px solid #c7d2d0",
      textAlign: "center",
    },
    summaryBox: {
      border: "1px solid #9fb3b0",
      background: "#f7f9f9",
      fontSize: 12,
    },
    summaryRow: {
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 10px",
      borderBottom: "1px solid #d6dfde",
    },
    summaryHeader: {
      background: "#e2e8e7",
      fontWeight: 800,
    },
    remarks: {
      marginTop: 12,
      fontSize: isMobile ? 11 : 12,
    },
    remarksBox: {
      border: "1px solid #d6dfde",
      background: "#f3f6f6",
      padding: 10,
      marginTop: 6,
    },
    signRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 20,
      marginTop: 18,
      fontSize: isMobile ? 11 : 12,
    },
    signLine: {
      borderTop: "1px solid #777",
      marginTop: 18,
      paddingTop: 6,
    },
    issued: {
      marginTop: 10,
      fontSize: isMobile ? 11 : 12,
    },
  };

  const numericGrades = grades.filter(g => g?.score !== null && g?.score !== undefined);
  const totalScore = numericGrades.reduce((sum, g) => sum + (g?.score || 0), 0);
  const avgScore = numericGrades.length > 0 ? (totalScore / numericGrades.length).toFixed(1) : 0;

  useEffect(() => {
    if (!autoExport) return;
    const name = (student.name || "student").replace(/[^a-z0-9-_ ]/gi, "");
    const date = new Date().toISOString().slice(0, 10);
    const raf = requestAnimationFrame(() => {
      exportElementToPdf(cardRef.current, `${name}-report-${date}.pdf`);
      if (onClose) setTimeout(onClose, 0);
    });
    return () => cancelAnimationFrame(raf);
  }, [autoExport, onClose, student.name]);

  const overlayStyle = silent
    ? { ...styles.overlay, background: "transparent", pointerEvents: "none" }
    : styles.overlay;
  const modalStyle = silent
    ? { ...styles.modal, position: "fixed", left: "-9999px", top: 0 }
    : styles.modal;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <style>{`
        @media print {
          body { margin: 0; }
          .report-card-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .report-card-ui { display: none !important; }
        }
      `}</style>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={styles.header} className="report-card-ui">
          <div style={{ width: 32 }} />
          <div style={styles.headerCenter}>STUDENT REPORT CARD</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              style={styles.exportBtn}
              onClick={() => {
                const safeName = (student.name || "student").replace(/[^a-z0-9-_ ]/gi, "");
                const date = new Date().toISOString().slice(0, 10);
                exportElementToPdf(cardRef.current, `${safeName}-report-${date}.pdf`);
              }}
            >
              Export PDF
            </button>
            <button style={styles.closeBtn} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div ref={cardRef} style={styles.content} className="report-card-page">
          <div style={styles.cardHeader}>
            <img src="/asset/Tz.jpg" alt="Tanzania crest" style={styles.crest} />
            <div style={styles.schoolTitle}>
              <div style={styles.schoolName}>{schoolInfo.name || "BONDE SECONDARY SCHOOL"}</div>
              <div style={styles.schoolSub}>{schoolInfo.authority || "MUHEZA DISTRICT COUNCIL"}</div>
              <div style={styles.schoolSub2}>{schoolInfo.district ? `P.O. BOX 03, ${schoolInfo.district}` : "P.O. BOX 03, MUHEZA"}</div>
            </div>
            <img src="/asset/bonde.jpg" alt="School crest" style={styles.crest} />
          </div>
          <div style={styles.rule} />
          <div style={styles.title}>STUDENT REPORT CARD</div>
          <div style={styles.rule} />

          <div style={styles.infoGrid}>
            <div>
              {[
                ["Student Name:", student.name],
                ["Class:", classData.form ?? schoolInfo.form ?? ""],
                ["Gender:", student.sex === "M" ? "Male" : "Female"],
                ["Term:", getTermLabel(schoolInfo.term)],
              ].map(([label, value]) => (
                <div key={label} style={styles.infoRow}>
                  <div style={styles.infoLabel}>{label}</div>
                  <div>{value || "–"}</div>
                </div>
              ))}
            </div>
            <div style={styles.infoRowRight}>
              {[
                ["CNO:", student.index_no],
                ["Stream:", student.stream ?? ""],
                ["Academic Year:", schoolInfo.year ?? ""],
                ["Exam:", schoolInfo.exam ?? schoolInfo.term ?? ""],
              ].map(([label, value]) => (
                <div key={label} style={styles.infoRow}>
                  <div style={styles.infoLabel}>{label}</div>
                  <div>{value || "–"}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.sectionTitle}>SUBJECT PERFORMANCE</div>
          <div style={styles.scoreWrap}>
            <table style={styles.scoreTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Grade</th>
                  <th style={styles.th}>Points</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subj, i) => {
                  const grade = grades[i];
                  const scoreDisplay = grade?.raw === "ABS" ? "ABS" : grade?.score ?? "–";
                  const pointDisplay = grade?.grade ? getGradePoints(grade.grade) : "–";
                  return (
                    <tr key={subj}>
                      <td style={{ ...styles.td, textAlign: "left" }}>{subj}</td>
                      <td style={styles.td}>{scoreDisplay}</td>
                      <td style={{ ...styles.td, fontWeight: 800, color: GRADE_COLORS[grade?.grade] || "#999" }}>
                        {grade?.grade ?? "–"}
                      </td>
                      <td style={styles.td}>{pointDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={styles.summaryBox}>
              <div style={{ ...styles.summaryRow, ...styles.summaryHeader }}>
                <span>Performance Summary</span>
                <span>{totalScore}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Average Marks:</span>
                <span>{avgScore}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Division:</span>
                <span>{student.resultStatus === "COMPLETE" ? `Division ${student.div}` : student.resultStatus ?? "–"}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Position:</span>
                <span>{student.posn ?? "–"}</span>
              </div>
            </div>
          </div>

          <div style={styles.remarks}>
            <div style={styles.sectionTitle}>REMARKS</div>
            <div style={styles.remarksBox}>
              {student.resultStatus === "ABSENT"
                ? "Absent for this exam."
                : student.resultStatus === "INCOMPLETE"
                ? "Marks incomplete; unable to determine overall performance."
                : "Complete results recorded."}
            </div>
          </div>

          <div style={styles.signRow}>
            <div>
              <div>Class Teacher</div>
              <div style={styles.signLine} />
            </div>
            <div>
              <div>Headmaster</div>
              <div style={styles.signLine} />
            </div>
          </div>

          <div style={styles.issued}>Issued on: ____ / ____ / {schoolInfo.year ?? new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}
