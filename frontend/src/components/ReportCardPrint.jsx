import React from "react";
import { GRADE_COLORS, getCompositeEntry } from "../utils/constants";
import { getGradePoints } from "../utils/grading";
import { getExportBranding } from "../utils/exportBranding";

function formatScoreDisplay(rawValue, fallback = "-") {
  if (rawValue === "ABS") return "ABS";
  if (rawValue !== null && rawValue !== undefined && rawValue !== "") return rawValue;
  return fallback;
}

function formatNumeric(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toFixed(digits);
}

function toNumericScore(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "" || rawValue === "ABS") return null;
  const number = Number(rawValue);
  return Number.isFinite(number) ? number : null;
}

function getTermLabel(term) {
  const raw = String(term ?? "").trim();
  if (!raw) return "-";
  const upper = raw.toUpperCase();
  if (upper === "I" || upper === "II" || upper === "III") return upper;
  if (upper.includes("TERM ONE") || upper.includes("FIRST") || upper.includes("MID")) return "I";
  if (upper.includes("TERM TWO") || upper.includes("SECOND") || upper.includes("FINAL") || upper.includes("END") || upper.includes("TERMINAL")) return "II";
  if (upper.includes("TERM THREE") || upper.includes("THIRD")) return "III";
  return raw;
}

function getGenderLabel(value) {
  return value === "F" ? "Female" : value === "M" ? "Male" : "-";
}

function getStatusLabel(status) {
  switch (status) {
    case "COMPLETE":
      return "KAMILI";
    case "INCOMPLETE":
      return "HAIJAKAMILIKA";
    case "ABSENT":
      return "HAKUHUDHURIA";
    default:
      return "-";
  }
}

function getGradeDescriptionSw(grade) {
  const descriptions = {
    A: "Bora Sana",
    B: "Nzuri Sana",
    C: "Nzuri",
    D: "Inaridhisha",
    F: "Feli",
  };
  return descriptions[grade] || "-";
}

function getAverageGradeLabel(student) {
  if (!student?.agrd) return "-";
  return `${student.agrd} - ${getGradeDescriptionSw(student.agrd)}`;
}

function renderDottedLines(count) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={`dotted-line-${index}`}
      style={{
        borderBottom: "1px dotted #555",
        minHeight: 18,
        marginBottom: index === count - 1 ? 0 : 7,
      }}
    />
  ));
}

function buildSummarySentence(student, totalStudents) {
  const position = student?.posn ?? "-";
  const total = totalStudents || "-";
  const avg = student?.avg != null ? formatNumeric(student.avg, 1) : "-";
  const grade = student?.agrd ?? "-";

  if (student?.resultStatus === "ABSENT") {
    return "Mwanafunzi hakuhudhuria mtihani huu; tathmini ya jumla haikukamilika.";
  }

  if (student?.resultStatus === "INCOMPLETE") {
    return `Mwanafunzi ana matokeo yasiyokamilika. Kwa sasa ana wastani wa ${avg} sawa na daraja ${grade}.`;
  }

  return `Amekuwa wa ${position} kati ya wanafunzi ${total}, akiwa na Divisheni ${student?.div ?? "-"}, pointi ${student?.points ?? "-"} na wastani wa ${avg} sawa na daraja ${grade}.`;
}

function formatReportDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());
  return `${day}-${month}-${year}`;
}

function getSwahiliHeaderTitles(branding, schoolInfo) {
  const authorityRaw = String(branding.headerSubtitle || schoolInfo.authority || "").trim();
  const schoolRaw = String(branding.headerName || schoolInfo.name || "").trim();
  const officeLine = /prime minister/i.test(authorityRaw)
    ? "OFISI YA WAZIRI MKUU"
    : authorityRaw.toUpperCase() || "OFISI YA ELIMU";
  const authorityLine = /prime minister/i.test(authorityRaw)
    ? "TAWALA ZA MIKOA NA SERIKALI ZA MITAA"
    : (schoolInfo.region ? `MKOA WA ${String(schoolInfo.region).toUpperCase()}` : authorityRaw.toUpperCase() || "ELIMU YA SEKONDARI");
  const strippedSchool = schoolRaw.replace(/secondary school/i, "").trim();
  const schoolLine = strippedSchool
    ? `SHULE YA SEKONDARI ${strippedSchool.toUpperCase()}`
    : schoolRaw.toUpperCase() || "SHULE YA SEKONDARI";

  return { officeLine, authorityLine, schoolLine };
}

function getCompositeTableMeta(examName, compositeEntry) {
  if (!compositeEntry) return null;
  if (examName === "Terminal Exam") {
    return {
      partnerLabel: "Midterm",
      currentLabel: "Terminal",
      currentLabelShort: "Terminal",
    };
  }
  if (examName === "Annual Exam") {
    return {
      partnerLabel: "Midterm-September",
      currentLabel: "Annual",
      currentLabelShort: "Annual",
    };
  }
  return {
    partnerLabel: compositeEntry.partnerExam,
    currentLabel: examName,
    currentLabelShort: examName,
  };
}

const PAPER_DIMENSIONS = {
  a4: { width: "210mm", minHeight: "297mm" },
  a3: { width: "297mm", minHeight: "420mm" },
};

const GRADE_SCALE_ROWS = [
  ["75-100", "A", "Bora Sana"],
  ["60-74", "B", "Nzuri Sana"],
  ["45-59", "C", "Nzuri"],
  ["30-44", "D", "Inaridhisha"],
  ["0-29", "F", "Feli"],
];

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
  const compositeEntry = getCompositeEntry(schoolInfo.exam, classData.composite_config ?? {});
  const isComposite = compositeEntry !== null && grades.some((grade) => grade && "partnerRaw" in grade);
  const numericGrades = grades.filter((grade) => grade?.score !== null && grade?.score !== undefined);
  const totalScore = numericGrades.reduce((sum, grade) => sum + (grade?.score || 0), 0);
  const avgScore = numericGrades.length > 0 ? totalScore / numericGrades.length : 0;
  const dimension = PAPER_DIMENSIONS[paperSize] ?? PAPER_DIMENSIONS.a4;
  const isLandscape = orientation === "landscape";
  const isCompact = template === "compact";
  const totalStudents = (classData.students ?? []).length || null;
  const classLabel = classData.form ?? schoolInfo.form ?? classData.name ?? "-";
  const reportInstruction = String(
    schoolInfo.reportInstruction ?? schoolInfo.report_instruction ?? ""
  ).trim();
  const examName = String(schoolInfo.exam ?? schoolInfo.term ?? "-");
  const compositeTableMeta = getCompositeTableMeta(examName, compositeEntry);
  const showCustomCompositeTable = Boolean(
    compositeEntry && (examName === "Terminal Exam" || examName === "Annual Exam")
  );
  const reportDate = formatReportDate();
  const headerTitles = getSwahiliHeaderTitles(branding, schoolInfo);

  const styles = {
    card: {
      background: "#fff",
      border: "1.8px solid #111",
      padding: isCompact ? 8 : 10,
      fontFamily: "'Arial', 'Helvetica', sans-serif",
      color: "#111827",
      width: isLandscape ? dimension.minHeight : dimension.width,
      minHeight: isLandscape ? dimension.width : dimension.minHeight,
      boxSizing: "border-box",
      margin: "0 auto",
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    },
    headerFrame: {
      border: "2px solid #111",
      padding: isCompact ? "8px 10px 0" : "10px 12px 0",
      marginBottom: 6,
    },
    header: {
      display: "grid",
      gridTemplateColumns: isCompact ? "70px 1fr 70px" : "76px 1fr 76px",
      alignItems: "start",
      gap: isCompact ? 6 : 8,
    },
    crest: {
      width: isCompact ? 58 : 64,
      height: isCompact ? 58 : 64,
      objectFit: "contain",
      justifySelf: "center",
      maxWidth: "100%",
      maxHeight: "100%",
      display: "block",
    },
    schoolTitle: {
      textAlign: "center",
      color: "#111",
      display: "grid",
      gap: 2,
    },
    officeTitle: {
      margin: 0,
      fontSize: isCompact ? 11 : 12,
      fontWeight: 800,
      lineHeight: 1.15,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      fontFamily: "'Georgia', 'Times New Roman', serif",
    },
    authorityTitle: {
      margin: 0,
      fontSize: isCompact ? 22 : 25,
      fontWeight: 900,
      lineHeight: 1.08,
      textTransform: "uppercase",
      letterSpacing: 0.2,
      fontFamily: "'Georgia', 'Times New Roman', serif",
    },
    schoolName: {
      margin: "2px 0 0",
      fontSize: isCompact ? 18 : 20,
      fontWeight: 900,
      lineHeight: 1.1,
      textTransform: "uppercase",
      letterSpacing: 0.2,
      fontFamily: "'Georgia', 'Times New Roman', serif",
    },
    headerMetaRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      alignItems: "start",
      marginTop: isCompact ? 8 : 10,
      paddingBottom: isCompact ? 6 : 8,
    },
    headerMetaBlock: {
      fontSize: isCompact ? 9.5 : 10.5,
      lineHeight: 1.35,
      fontWeight: 700,
      whiteSpace: "pre-line",
    },
    headerBottomBand: {
      borderTop: "2px solid #111",
      textAlign: "center",
      padding: isCompact ? "8px 8px 9px" : "10px 10px 11px",
      fontSize: isCompact ? 13 : 15,
      fontWeight: 900,
      lineHeight: 1.15,
      textTransform: "uppercase",
      letterSpacing: 0.2,
      fontFamily: "'Georgia', 'Times New Roman', serif",
    },
    classStrip: {
      textAlign: "center",
      fontSize: isCompact ? 11 : 12,
      fontWeight: 700,
      color: "#111827",
      marginBottom: 6,
      textTransform: "uppercase",
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "6px 18px",
      marginBottom: 6,
    },
    infoItem: {
      display: "grid",
      gridTemplateColumns: isCompact ? "100px 1fr" : "126px 1fr",
      alignItems: "end",
      gap: 8,
      fontSize: isCompact ? 10 : 11,
    },
    infoLabel: {
      color: "#163f97",
      fontWeight: 800,
    },
    infoValue: {
      borderBottom: "1px dotted #444",
      minHeight: 16,
      paddingBottom: 1,
      fontWeight: 600,
    },
    doubleRule: {
      borderTop: "2px solid #163f97",
      borderBottom: "4px solid #163f97",
      height: 5,
      margin: "5px 0 7px",
    },
    bodyGrid: {
      display: "grid",
      gridTemplateColumns: isCompact ? "1.45fr 0.95fr" : "1.7fr 0.9fr",
      gap: 9,
      alignItems: "start",
    },
    sectionHeading: {
      color: "#163f97",
      fontSize: isCompact ? 13 : 14,
      fontWeight: 900,
      margin: "0 0 5px",
      textTransform: "uppercase",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: isCompact ? 8.5 : 9.5,
    },
    th: {
      background: "#163f97",
      color: "#fff",
      border: "1px solid #a9b6d5",
      padding: isCompact ? "3px 2px" : "4px 3px",
      fontWeight: 800,
      textAlign: "center",
    },
    td: {
      border: "1px solid #cbd5e1",
      padding: isCompact ? "3px 3px" : "4px 4px",
      textAlign: "center",
    },
    sideBox: {
      border: "1px solid #9fb2dd",
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 7,
    },
    sideHead: {
      background: "#fff",
      color: "#163f97",
      borderBottom: "1px solid #9fb2dd",
      fontWeight: 900,
      fontSize: isCompact ? 12 : 13,
      textAlign: "center",
      padding: "6px 6px",
      textTransform: "uppercase",
    },
    sideRow: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 10,
      padding: "5px 7px",
      borderTop: "1px solid #d7e1f0",
      fontSize: isCompact ? 9 : 10,
      alignItems: "center",
    },
    scaleTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: isCompact ? 9 : 10,
    },
    summarySentence: {
      borderTop: "1px dotted #333",
      borderBottom: "1px dotted #333",
      padding: "6px 4px",
      marginTop: 7,
      fontSize: isCompact ? 10 : 11,
      lineHeight: 1.45,
    },
    remarksSection: {
      marginTop: 7,
    },
    remarkRow: {
      display: "grid",
      gridTemplateColumns: isCompact ? "116px 1fr 70px 90px" : "145px 1fr 82px 110px",
      gap: 10,
      alignItems: "start",
      marginBottom: 6,
      fontSize: isCompact ? 10 : 11,
    },
    remarkLabel: {
      color: "#163f97",
      fontWeight: 800,
      lineHeight: 1.35,
    },
    remarkText: {
      minHeight: 58,
      lineHeight: 1.35,
    },
    signLabel: {
      color: "#163f97",
      fontWeight: 800,
      textAlign: "center",
      alignSelf: "center",
    },
    signLine: {
      borderBottom: "1px dotted #555",
      minHeight: 20,
    },
    instructionRow: {
      display: "grid",
      gridTemplateColumns: isCompact ? "116px 1fr" : "145px 1fr",
      gap: 10,
      alignItems: "start",
      marginTop: 4,
      fontSize: isCompact ? 10 : 11,
    },
    footerDate: {
      marginTop: 4,
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      fontSize: isCompact ? 10 : 11,
      alignItems: "center",
    },
    dateLine: {
      borderBottom: "1px dotted #555",
      minWidth: 140,
      minHeight: 18,
    },
  };

  return (
    <div style={styles.card}>
      <div style={styles.headerFrame}>
        <div style={styles.header}>
          <img src={branding.leftLogoSrc} alt="Left crest" style={styles.crest} />
          <div style={styles.schoolTitle}>
            <p style={styles.officeTitle}>{headerTitles.officeLine}</p>
            <h2 style={styles.authorityTitle}>{headerTitles.authorityLine}</h2>
            <h1 style={styles.schoolName}>{headerTitles.schoolLine}</h1>
          </div>
          <img src={branding.rightLogoSrc} alt="Right crest" style={styles.crest} />
        </div>

        <div style={styles.headerMetaRow}>
          <div style={styles.headerMetaBlock}>
            {`MAMLAKA: ${schoolInfo.authority || "-"}\nMKOA: ${schoolInfo.region || "-"}\nWILAYA: ${schoolInfo.district || "-"}`}
          </div>
          <div style={{ ...styles.headerMetaBlock, textAlign: "right" }}>
            {`ANWANI: ${branding.headerAddress || "-"}\nMTIHANI: ${examName}\nTAREHE: ${reportDate}`}
          </div>
        </div>

        <div style={styles.headerBottomBand}>
          Taarifa ya Maendeleo ya Mwanafunzi Katika Masomo na Tabia ya Kazi
        </div>
      </div>

      <div style={styles.classStrip}>
        {`${classLabel}  |  ${examName.toUpperCase()}  |  MWAKA ${schoolInfo.year ?? "-"}`}
      </div>

      <div style={styles.infoGrid}>
        {[
          ["Jina:", student.name || "-"],
          ["Namba ya Mtihani:", student.index_no || student.indexNo || "-"],
          ["Kidato cha:", classLabel || "-"],
          ["Jinsia:", getGenderLabel(student.sex)],
          ["Muhula:", getTermLabel(schoolInfo.term)],
          ["Mtihani:", schoolInfo.exam ?? schoolInfo.term ?? "-"],
          ["Mwaka wa Masomo:", schoolInfo.year ?? "-"],
        ].map(([label, value], index) => (
          <div key={`${label}-${index}`} style={styles.infoItem}>
            <div style={styles.infoLabel}>{label}</div>
            <div style={styles.infoValue}>{value}</div>
          </div>
        ))}
      </div>

      <div style={styles.doubleRule} />

      <div style={styles.bodyGrid}>
        <div>
          <div style={styles.sectionHeading}>A. Maendeleo ya Kitaaluma</div>
          {isComposite && (
            <div style={{ fontSize: isCompact ? 10 : 11, color: "#7a5800", fontWeight: 700, marginBottom: 6 }}>
              Matokeo ya Mchanganyiko: ({compositeEntry.partnerExam} + {schoolInfo.exam}) / 2
            </div>
          )}

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: "left" }}>Somo</th>
                {showCustomCompositeTable && <th style={styles.th}>{compositeTableMeta?.partnerLabel || "Midterm"}</th>}
                {showCustomCompositeTable && <th style={styles.th}>{compositeTableMeta?.currentLabelShort || "Terminal"}</th>}
                {showCustomCompositeTable && <th style={styles.th}>Jumla</th>}
                {showCustomCompositeTable && <th style={styles.th}>Wastani</th>}
                {!showCustomCompositeTable && isComposite && <th style={styles.th}>Awali</th>}
                {!showCustomCompositeTable && isComposite && <th style={styles.th}>Sasa</th>}
                {!showCustomCompositeTable && <th style={styles.th}>{isComposite ? "Wastani" : "Alama"}</th>}
                <th style={styles.th}>Daraja</th>
                <th style={styles.th}>Pointi</th>
                <th style={styles.th}>Maelezo</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => {
                const grade = grades[index];
                const combinedDisplay =
                  grade?.raw === "ABS" ? "ABS" : grade?.score != null ? formatNumeric(grade.score, 1) : "-";
                const currentDisplay = formatScoreDisplay(grade?.raw);
                const partnerDisplay = formatScoreDisplay(grade?.partnerRaw);
                const pointsDisplay = grade?.grade ? getGradePoints(grade.grade) : "-";
                const currentNumeric = toNumericScore(grade?.raw);
                const partnerNumeric = toNumericScore(grade?.partnerRaw);
                const totalDisplay =
                  currentNumeric !== null && partnerNumeric !== null
                    ? formatNumeric(currentNumeric + partnerNumeric, 0)
                    : "-";

                return (
                  <tr key={subject}>
                    <td style={{ ...styles.td, textAlign: "left", fontWeight: 700 }}>{subject}</td>
                    {showCustomCompositeTable && <td style={styles.td}>{partnerDisplay}</td>}
                    {showCustomCompositeTable && <td style={styles.td}>{currentDisplay}</td>}
                    {showCustomCompositeTable && <td style={styles.td}>{totalDisplay}</td>}
                    {showCustomCompositeTable && <td style={styles.td}>{combinedDisplay}</td>}
                    {!showCustomCompositeTable && isComposite && <td style={styles.td}>{partnerDisplay}</td>}
                    {!showCustomCompositeTable && isComposite && <td style={styles.td}>{currentDisplay}</td>}
                    {!showCustomCompositeTable && (
                      <td style={styles.td}>{isComposite ? combinedDisplay : currentDisplay}</td>
                    )}
                    <td style={{ ...styles.td, fontWeight: 800, color: GRADE_COLORS[grade?.grade] || "#555" }}>
                      {grade?.grade ?? "-"}
                    </td>
                    <td style={styles.td}>{pointsDisplay}</td>
                    <td style={{ ...styles.td, textAlign: "left" }}>{getGradeDescriptionSw(grade?.grade)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <div style={styles.sideBox}>
            <div style={styles.sideHead}>B. Muhtasari wa Ufaulu</div>
            {[
              ["Jumla ya Alama", formatNumeric(totalScore, isComposite ? 1 : 0)],
              ["Wastani", formatNumeric(avgScore, 1)],
              ["Daraja la Wastani", getAverageGradeLabel(student)],
              ["Divisheni", student.resultStatus === "COMPLETE" ? `Division ${student.div ?? "-"}` : "-"],
              ["Jumla ya Pointi", student.points ?? "-"],
              ["Nafasi", totalStudents ? `${student.posn ?? "-"} / ${totalStudents}` : (student.posn ?? "-")],
              ["Masomo Yaliyofanywa", student.subjectsDone ?? numericGrades.length],
              ["Hali", getStatusLabel(student.resultStatus)],
            ].map(([label, value]) => (
              <div key={label} style={styles.sideRow}>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontWeight: 800, textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={styles.sideBox}>
            <div style={styles.sideHead}>Tafsiri ya Viwango vya Ufaulu</div>
            <table style={styles.scaleTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Alama</th>
                  <th style={styles.th}>Daraja</th>
                  <th style={styles.th}>Maelezo</th>
                </tr>
              </thead>
              <tbody>
                {GRADE_SCALE_ROWS.map(([range, grade, description]) => (
                  <tr key={grade}>
                    <td style={styles.td}>{range}</td>
                    <td style={{ ...styles.td, fontWeight: 800, color: GRADE_COLORS[grade] }}>{grade}</td>
                    <td style={{ ...styles.td, textAlign: "left" }}>{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={styles.summarySentence}>
        {buildSummarySentence(student, totalStudents)}
      </div>

      <div style={styles.remarksSection}>
        <div style={styles.sectionHeading}>C. Maoni na Maagizo</div>

        <div style={styles.remarkRow}>
          <div style={styles.remarkLabel}>Maoni ya Mwalimu wa Darasa:</div>
          <div style={styles.remarkText}>{renderDottedLines(2)}</div>
          <div style={styles.signLabel}>Saini</div>
          <div style={styles.signLine} />
        </div>

        <div style={styles.remarkRow}>
          <div style={styles.remarkLabel}>Maoni ya Mkuu wa Shule:</div>
          <div style={styles.remarkText}>{renderDottedLines(2)}</div>
          <div style={styles.signLabel}>Saini na Muhuri</div>
          <div style={styles.signLine} />
        </div>

        <div style={styles.instructionRow}>
          <div style={styles.remarkLabel}>Maagizo:</div>
          <div style={styles.remarkText}>
            {reportInstruction ? (
              <div style={{ lineHeight: 1.5 }}>{reportInstruction}</div>
            ) : (
              renderDottedLines(4)
            )}
          </div>
        </div>

        <div style={styles.footerDate}>
          <span>Tarehe ya Kutolewa:</span>
          <div style={styles.dateLine} />
        </div>
      </div>
    </div>
  );
}
