import React from "react";
import { GRADE_COLORS, getCompositeEntry } from "../utils/constants";
import { getGradePoints } from "../utils/grading";
import { getExportBranding } from "../utils/exportBranding";

// Return a display-safe string for a raw score value (numeric, "ABS", null, or undefined).
function formatScoreDisplay(rawValue, fallback = "-") {
  if (rawValue === "ABS") return "ABS";
  if (rawValue !== null && rawValue !== undefined) return rawValue;
  return fallback;
}

const PAPER_DIMENSIONS = {
  a4: { width: "210mm", minHeight: "297mm" },
  a3: { width: "297mm", minHeight: "420mm" },
};

function getTermLabel(term) {
  const raw = String(term ?? "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper === "I" || upper === "II" || upper === "III") return raw;
  if (upper.includes("MID")) return "I";
  if (upper.includes("FINAL") || upper.includes("END") || upper.includes("TERMINAL")) return "II";
  return raw;
}

export function ReportCardPrint({
  student,
  classData,
  template = "official",
  paperSize = "a4",
  orientation = "portrait",
}) {
  if (!student) return null;

  const subjects = classData.subjects ?? [];
  const grades = student.grades ?? [];
  const schoolInfo = classData.school_info ?? {};
  const branding = getExportBranding(schoolInfo);
  const compositeEntry = getCompositeEntry(
    schoolInfo.exam,
    classData.composite_config ?? {}
  );
  const isComposite = compositeEntry !== null && grades.some((g) => g && "partnerRaw" in g);
  const numericGrades = grades.filter((grade) => grade?.score !== null && grade?.score !== undefined);
  const totalScore = numericGrades.reduce((sum, grade) => sum + (grade?.score || 0), 0);
  const avgScore = numericGrades.length > 0 ? (totalScore / numericGrades.length).toFixed(1) : "0.0";
  const dimension = PAPER_DIMENSIONS[paperSize] ?? PAPER_DIMENSIONS.a4;
  const isLandscape = orientation === "landscape";
  const isCompact = template === "compact";

  const styles = {
    card: {
      background: "#fff",
      borderRadius: 10,
      padding: isCompact ? 16 : 20,
      border: "1px solid #d0dcf8",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      fontFamily: "'Times New Roman', serif",
      color: "#1f1f1f",
      width: isLandscape ? dimension.minHeight : dimension.width,
      minHeight: isLandscape ? dimension.width : dimension.minHeight,
      boxSizing: "border-box",
      margin: "0 auto",
    },
    cardHeader: {
      display: "grid",
      gridTemplateColumns: isCompact ? "64px 1fr 64px" : "80px 1fr 80px",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    crest: {
      width: isCompact ? 54 : 70,
      height: isCompact ? 54 : 70,
      objectFit: "contain",
    },
    schoolTitle: {
      textAlign: "center",
      lineHeight: 1.2,
    },
    schoolName: {
      fontSize: isCompact ? 16 : 18,
      fontWeight: 800,
      letterSpacing: 0.3,
      margin: 0,
    },
    schoolSub: {
      fontSize: isCompact ? 11 : 12,
      margin: "2px 0",
    },
    rule: {
      height: 2,
      background: "#0d5c4f",
      margin: "8px 0",
    },
    title: {
      textAlign: "center",
      fontSize: isCompact ? 14 : 16,
      fontWeight: 800,
      letterSpacing: 0.5,
      margin: "4px 0 8px",
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      borderTop: "1px solid #9fb3b0",
      borderBottom: "1px solid #9fb3b0",
    },
    infoRow: {
      display: "grid",
      gridTemplateColumns: isCompact ? "110px 1fr" : "140px 1fr",
      borderBottom: "1px solid #c7d2d0",
      padding: "8px 10px",
      fontSize: isCompact ? 11 : 12,
    },
    infoRowRight: {
      borderLeft: "1px solid #c7d2d0",
    },
    infoLabel: {
      fontWeight: 700,
    },
    sectionTitle: {
      margin: "14px 0 6px",
      fontWeight: 800,
      fontSize: isCompact ? 11 : 12,
      letterSpacing: 0.3,
      color: "#0d5c4f",
    },
    scoreWrap: {
      display: "grid",
      gridTemplateColumns: isCompact ? "1.6fr 0.9fr" : "2fr 1fr",
      gap: 12,
      alignItems: "start",
    },
    scoreTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: isCompact ? 11 : 12,
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
      fontSize: isCompact ? 11 : 12,
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
      fontSize: isCompact ? 11 : 12,
    },
    remarksBox: {
      border: "1px solid #d6dfde",
      background: "#f3f6f6",
      padding: 10,
      marginTop: 6,
      minHeight: isCompact ? 58 : 72,
    },
    signRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      marginTop: 18,
      fontSize: isCompact ? 11 : 12,
    },
    signLine: {
      borderTop: "1px solid #777",
      marginTop: 18,
      paddingTop: 6,
    },
    issued: {
      marginTop: 10,
      fontSize: isCompact ? 11 : 12,
    },
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <img src={branding.leftLogoSrc} alt="Left crest" style={styles.crest} />
        <div style={styles.schoolTitle}>
          <div style={styles.schoolName}>{branding.headerName}</div>
          <div style={styles.schoolSub}>{branding.headerSubtitle}</div>
          <div style={styles.schoolSub}>{branding.headerAddress}</div>
        </div>
        <img src={branding.rightLogoSrc} alt="Right crest" style={styles.crest} />
      </div>
      <div style={styles.rule} />
      <div style={styles.title}>{isCompact ? "ACADEMIC PERFORMANCE SUMMARY" : "STUDENT REPORT CARD"}</div>
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
              <div>{value || "-"}</div>
            </div>
          ))}
        </div>
        <div style={styles.infoRowRight}>
          {[
            ["CNO:", student.index_no],
            ["Academic Year:", schoolInfo.year ?? ""],
            ["Exam:", schoolInfo.exam ?? schoolInfo.term ?? ""],
          ].map(([label, value]) => (
            <div key={label} style={styles.infoRow}>
              <div style={styles.infoLabel}>{label}</div>
              <div>{value || "-"}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.sectionTitle}>SUBJECT PERFORMANCE</div>
      {isComposite && (
        <div style={{ fontSize: isCompact ? 10 : 11, color: "#7a5800", fontWeight: 700, marginBottom: 6 }}>
          🔗 Combined Result: ({compositeEntry.partnerExam} + {schoolInfo.exam}) ÷ 2
        </div>
      )}
      <div style={styles.scoreWrap}>
        <table style={styles.scoreTable}>
          <thead>
            <tr>
              <th style={styles.th}>Subject</th>
              {isComposite && <th style={styles.th}>{compositeEntry.partnerExam.split(" ")[0]}</th>}
              {isComposite && <th style={styles.th}>{schoolInfo.exam?.split(" ")[0] ?? "Exam"}</th>}
              <th style={styles.th}>{isComposite ? "Combined" : "Score"}</th>
              <th style={styles.th}>Grade</th>
              <th style={styles.th}>Points</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subj, i) => {
              const grade = grades[i];
              const combinedDisplay = grade?.raw === "ABS" ? "ABS" : (grade?.score != null ? Number(grade.score).toFixed(1) : "-");
              const currentDisplay = formatScoreDisplay(grade?.raw);
              const partnerDisplay = formatScoreDisplay(grade?.partnerRaw);
              const pointDisplay = grade?.grade ? getGradePoints(grade.grade) : "-";
              return (
                <tr key={subj}>
                  <td style={{ ...styles.td, textAlign: "left" }}>{subj}</td>
                  {isComposite && <td style={styles.td}>{partnerDisplay}</td>}
                  {isComposite && <td style={styles.td}>{currentDisplay}</td>}
                  <td style={styles.td}>{isComposite ? combinedDisplay : currentDisplay}</td>
                  <td style={{ ...styles.td, fontWeight: 800, color: GRADE_COLORS[grade?.grade] || "#999" }}>
                    {grade?.grade ?? "-"}
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
            <span>{student.resultStatus === "COMPLETE" ? `Division ${student.div}` : student.resultStatus ?? "-"}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Position:</span>
            <span>{student.posn ?? "-"}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Template:</span>
            <span>{isCompact ? "Compact" : "Official"}</span>
          </div>
          <div style={{ ...styles.summaryRow, borderBottom: "none" }}>
            <span>Paper:</span>
            <span>{paperSize.toUpperCase()} {isLandscape ? "Landscape" : "Portrait"}</span>
          </div>
        </div>
      </div>

      <div style={styles.remarks}>
        <div style={styles.sectionTitle}>REMARKS</div>
        <div style={styles.remarksBox}>
          {student.remarks && student.remarks.trim()
            ? student.remarks.trim()
            : student.resultStatus === "ABSENT"
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
  );
}
