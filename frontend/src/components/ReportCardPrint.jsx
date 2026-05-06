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

function getTeacherRemark(student) {
  if (student?.remarks && student.remarks.trim()) return student.remarks.trim();
  if (student?.resultStatus === "ABSENT") return "Mwanafunzi hakuhudhuria mtihani huu. Tafadhali fuatilia mahudhurio yake.";
  if (student?.resultStatus === "INCOMPLETE") return "Matokeo hayajakamilika. Hakikisha alama za masomo yote muhimu zinaingizwa.";
  if (student?.agrd === "A") return "Amefanya vizuri sana. Aendelee kudumisha juhudi hizi.";
  if (student?.agrd === "B") return "Amefanya vizuri. Aongeze bidii ili afikie daraja A.";
  if (student?.agrd === "C") return "Anafanya vizuri kwa kiwango cha kati. Aongeze umakini na mazoezi.";
  if (student?.agrd === "D") return "Ana uwezo wa kufanya vizuri zaidi. Anahitaji usimamizi na bidii ya ziada.";
  return "Anahitaji kuongeza juhudi zaidi katika masomo yote.";
}

function getHeadRemark(student) {
  if (student?.resultStatus === "ABSENT") return "Fuatilia sababu za kutohudhuria na hakikisha mwanafunzi anarudi kwenye utaratibu wa shule.";
  if (student?.resultStatus === "INCOMPLETE") return "Kamilisha taarifa za alama ili tathmini ya mwisho iweze kutolewa kwa usahihi.";
  if (student?.div === "I") return "Hongera kwa ufaulu mzuri sana. Endelea kulinda kiwango hiki.";
  if (student?.div === "II") return "Umefanya vizuri. Endelea kuongeza juhudi ili kupanda zaidi.";
  if (student?.div === "III") return "Matokeo ni mazuri. Ongeza bidii kwenye masomo yenye changamoto.";
  if (student?.div === "IV") return "Unahitaji kuongeza juhudi ili kuboresha kiwango cha ufaulu.";
  if (student?.div === "0") return "Ufaulu bado hauridhishi. Ni muhimu kuongeza usimamizi na mazoezi ya karibu.";
  return "Endelea kujituma katika masomo na nidhamu ya shule.";
}

function buildSummarySentence(student, totalStudents) {
  const position = student?.posn ?? "-";
  const total = totalStudents || "-";
  const avg = student?.avg != null ? formatNumeric(student.avg, 1) : "-";
  const grade = student?.agrd ?? "-";

  if (student?.resultStatus === "ABSENT") {
    return "Mwanafunzi hakuhudhuria mtihani huu, hivyo tathmini ya jumla haikukamilika.";
  }

  if (student?.resultStatus === "INCOMPLETE") {
    return `Mwanafunzi ana matokeo yasiyokamilika. Kwa sasa ana wastani wa ${avg} sawa na daraja ${grade}, lakini tathmini ya mwisho itategemea ukamilishaji wa alama zote.`;
  }

  return `Amekuwa wa ${position} kati ya wanafunzi ${total}. Akiwa na Divisheni ${student?.div ?? "-"} ya pointi ${student?.points ?? "-"} na amepata wastani wa ${avg} sawa na daraja ${grade}.`;
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

  const styles = {
    card: {
      background: "#fff",
      border: "1.8px solid #163f97",
      padding: isCompact ? 12 : 16,
      fontFamily: "'Arial', 'Helvetica', sans-serif",
      color: "#111827",
      width: isLandscape ? dimension.minHeight : dimension.width,
      minHeight: isLandscape ? dimension.width : dimension.minHeight,
      boxSizing: "border-box",
      margin: "0 auto",
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    },
    header: {
      display: "grid",
      gridTemplateColumns: "68px 1fr 68px",
      alignItems: "center",
      gap: 10,
    },
    crest: {
      width: 60,
      height: 60,
      objectFit: "contain",
      justifySelf: "center",
    },
    schoolTitle: {
      textAlign: "center",
      color: "#163f97",
      display: "grid",
      gap: 3,
    },
    schoolName: {
      margin: 0,
      fontSize: isCompact ? 19 : 22,
      fontWeight: 900,
      lineHeight: 1.1,
      textTransform: "uppercase",
      letterSpacing: 0.2,
    },
    schoolSub: {
      margin: 0,
      fontSize: isCompact ? 10 : 11,
      fontWeight: 700,
      lineHeight: 1.25,
    },
    titlePill: {
      margin: "10px auto 8px",
      maxWidth: isCompact ? 420 : 520,
      background: "#163f97",
      color: "#fff",
      borderRadius: 999,
      textAlign: "center",
      padding: isCompact ? "9px 18px" : "12px 24px",
      fontSize: isCompact ? 15 : 17,
      fontWeight: 900,
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    rule: {
      borderTop: "1.5px solid #111827",
      margin: "8px 0 10px",
    },
    classStrip: {
      textAlign: "center",
      fontSize: isCompact ? 12 : 13,
      fontWeight: 700,
      color: "#111827",
      marginBottom: 10,
      textTransform: "uppercase",
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "10px 24px",
      marginBottom: 12,
    },
    infoItem: {
      display: "grid",
      gridTemplateColumns: isCompact ? "100px 1fr" : "126px 1fr",
      alignItems: "end",
      gap: 10,
      fontSize: isCompact ? 11 : 12,
    },
    infoLabel: {
      color: "#163f97",
      fontWeight: 800,
    },
    infoValue: {
      borderBottom: "1px dotted #444",
      minHeight: 20,
      paddingBottom: 2,
      fontWeight: 600,
    },
    doubleRule: {
      borderTop: "2px solid #163f97",
      borderBottom: "4px solid #163f97",
      height: 6,
      margin: "8px 0 12px",
    },
    bodyGrid: {
      display: "grid",
      gridTemplateColumns: isCompact ? "1.45fr 0.95fr" : "1.7fr 0.9fr",
      gap: 14,
      alignItems: "start",
    },
    sectionHeading: {
      color: "#163f97",
      fontSize: isCompact ? 14 : 15,
      fontWeight: 900,
      margin: "0 0 8px",
      textTransform: "uppercase",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: isCompact ? 10 : 11,
    },
    th: {
      background: "#163f97",
      color: "#fff",
      border: "1px solid #a9b6d5",
      padding: isCompact ? "6px 4px" : "7px 5px",
      fontWeight: 800,
      textAlign: "center",
    },
    td: {
      border: "1px solid #cbd5e1",
      padding: isCompact ? "6px 5px" : "7px 6px",
      textAlign: "center",
    },
    sideBox: {
      border: "1px solid #9fb2dd",
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 12,
    },
    sideHead: {
      background: "#fff",
      color: "#163f97",
      borderBottom: "1px solid #9fb2dd",
      fontWeight: 900,
      fontSize: isCompact ? 13 : 14,
      textAlign: "center",
      padding: "10px 8px",
      textTransform: "uppercase",
    },
    sideRow: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 10,
      padding: "8px 10px",
      borderTop: "1px solid #d7e1f0",
      fontSize: isCompact ? 10 : 11,
      alignItems: "center",
    },
    scaleTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: isCompact ? 10 : 11,
    },
    summarySentence: {
      borderTop: "1px dotted #333",
      borderBottom: "1px dotted #333",
      padding: "10px 4px",
      marginTop: 12,
      fontSize: isCompact ? 11 : 12,
      lineHeight: 1.65,
    },
    remarksSection: {
      marginTop: 12,
    },
    remarkRow: {
      display: "grid",
      gridTemplateColumns: isCompact ? "116px 1fr 70px 90px" : "145px 1fr 82px 110px",
      gap: 10,
      alignItems: "start",
      marginBottom: 10,
      fontSize: isCompact ? 11 : 12,
    },
    remarkLabel: {
      color: "#163f97",
      fontWeight: 800,
      lineHeight: 1.35,
    },
    remarkText: {
      borderBottom: "1px dotted #555",
      minHeight: 26,
      lineHeight: 1.55,
      paddingBottom: 4,
    },
    signLabel: {
      color: "#163f97",
      fontWeight: 800,
      textAlign: "center",
      alignSelf: "center",
    },
    signLine: {
      borderBottom: "1px dotted #555",
      minHeight: 26,
    },
    instructionRow: {
      display: "grid",
      gridTemplateColumns: isCompact ? "116px 1fr" : "145px 1fr",
      gap: 10,
      alignItems: "start",
      marginTop: 4,
      fontSize: isCompact ? 11 : 12,
    },
    footerDate: {
      marginTop: 8,
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      fontSize: isCompact ? 11 : 12,
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
      <div style={styles.header}>
        <img src={branding.leftLogoSrc} alt="Left crest" style={styles.crest} />
        <div style={styles.schoolTitle}>
          <h1 style={styles.schoolName}>{branding.headerName}</h1>
          <p style={styles.schoolSub}>{branding.headerSubtitle}</p>
          <p style={styles.schoolSub}>{branding.headerAddress}</p>
        </div>
        <img src={branding.rightLogoSrc} alt="Right crest" style={styles.crest} />
      </div>

      <div style={styles.titlePill}>Ripoti ya Maendeleo ya Mwanafunzi</div>
      <div style={styles.rule} />
      <div style={styles.classStrip}>
        {`${classLabel}  |  ${String(schoolInfo.exam ?? schoolInfo.term ?? "-").toUpperCase()}  |  MWAKA ${schoolInfo.year ?? "-"}`}
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
                {isComposite && <th style={styles.th}>Awali</th>}
                {isComposite && <th style={styles.th}>Sasa</th>}
                <th style={styles.th}>{isComposite ? "Wastani" : "Alama"}</th>
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

                return (
                  <tr key={subject}>
                    <td style={{ ...styles.td, textAlign: "left", fontWeight: 700 }}>{subject}</td>
                    {isComposite && <td style={styles.td}>{partnerDisplay}</td>}
                    {isComposite && <td style={styles.td}>{currentDisplay}</td>}
                    <td style={styles.td}>{isComposite ? combinedDisplay : currentDisplay}</td>
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
          <div style={styles.remarkText}>{getTeacherRemark(student)}</div>
          <div style={styles.signLabel}>Saini</div>
          <div style={styles.signLine} />
        </div>

        <div style={styles.remarkRow}>
          <div style={styles.remarkLabel}>Maoni ya Mkuu wa Shule:</div>
          <div style={styles.remarkText}>{getHeadRemark(student)}</div>
          <div style={styles.signLabel}>Saini na Muhuri</div>
          <div style={styles.signLine} />
        </div>

        <div style={styles.instructionRow}>
          <div style={styles.remarkLabel}>Maagizo:</div>
          <div style={styles.remarkText}>
            {student.resultStatus === "COMPLETE"
              ? "Aendelee kujituma katika masomo yote na kudumisha nidhamu nzuri."
              : "Akamilishe mahitaji yote ya kitaaluma na afuate maelekezo ya walimu kwa karibu."}
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
