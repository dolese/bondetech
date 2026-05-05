import React, { useMemo } from "react";
import { GRADE_COLORS, DIVISION_COLORS } from "../utils/constants";
import { getExportBranding } from "../utils/exportBranding";

export function ResultSheetPrintDocument({ model, pageRanges }) {
  const branding = useMemo(() => getExportBranding(model.schoolInfo), [model.schoolInfo]);
  const pages = pageRanges.map((range, index) => ({
    index,
    students: model.students.slice(range.start, range.end),
    isFirstPage: index === 0,
    isLastPage: index === pageRanges.length - 1,
  }));

  const styles = {
    pageStack: {
      display: "flex",
      flexDirection: "column",
      gap: 0,
      background: "#fff",
    },
    sheet: {
      background: "#fff",
      padding: 18,
      width: "420mm",
      minHeight: "297mm",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      pageBreakAfter: "always",
      breakAfter: "page",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      borderBottom: "2px solid #003366",
      paddingBottom: 10,
      marginBottom: 16,
    },
    headerCenter: {
      textAlign: "center",
      flex: 1,
    },
    logo: {
      width: 80,
      height: 80,
      borderRadius: 6,
      background: "#fff",
      objectFit: "contain",
      padding: 4,
      border: "1px solid #d0dcf8",
    },
    schoolName: {
      fontSize: 18,
      fontWeight: 900,
      color: "#003366",
      margin: "0 0 4px",
    },
    className: {
      fontSize: 14,
      fontWeight: 800,
      color: "#555",
      margin: 0,
    },
    resultSummary: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 12,
      marginBottom: 16,
    },
    summaryBox: {
      background: "#f4f7ff",
      padding: 8,
      borderRadius: 6,
      textAlign: "center",
      border: "1px solid #d0dcf8",
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: 900,
      color: "#003366",
      margin: "0 0 4px",
    },
    summaryLabel: {
      fontSize: 10,
      color: "#666",
      fontWeight: 700,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: 16,
      fontSize: 10,
      background: "#fff",
    },
    th: {
      padding: "6px 5px",
      background: "#003366",
      color: "#fff",
      border: "1px solid #003366",
      fontWeight: 700,
      textAlign: "center",
    },
    td: {
      padding: "5px",
      border: "1px solid #cbd8f3",
      textAlign: "center",
      whiteSpace: "normal",
    },
    signatureSec: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 40,
      marginTop: "auto",
      paddingTop: 14,
    },
    signBox: {
      height: 80,
      borderTop: "1px solid #333",
      paddingTop: 6,
      textAlign: "center",
      fontSize: 9,
      color: "#555",
    },
  };

  return (
    <div style={styles.pageStack}>
      <style>{`
        @page {
          size: A3 landscape;
          margin: 0;
        }
        body { margin: 0; }
        .result-sheet-print-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
      `}</style>
      {pages.map((page) => (
        <div key={`print-page-${page.index}`} style={styles.sheet} className="result-sheet-print-page">
          <div style={styles.header}>
            <img src={branding.leftLogoSrc} alt="Left crest" style={styles.logo} />
            <div style={styles.headerCenter}>
              <h1 style={styles.schoolName}>{branding.headerName || "School Name"}</h1>
              <p style={styles.className}>Class: <strong>{model.className}</strong></p>
              <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>{branding.headerSubtitle}</p>
              <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>{branding.headerAddress}</p>
              <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>{new Date().toLocaleDateString()}</p>
              <p style={{ fontSize: 10, color: "#777", margin: "4px 0 0", fontWeight: 700 }}>
                Page {page.index + 1} of {pages.length}
              </p>
            </div>
            <img src={branding.rightLogoSrc} alt="Right crest" style={styles.logo} />
          </div>

          {page.isFirstPage && (
            <div style={styles.resultSummary}>
              {model.summaryCards.map(([label, value]) => (
                <div key={label} style={styles.summaryBox}>
                  <div style={styles.summaryValue}>{value}</div>
                  <div style={styles.summaryLabel}>{label}</div>
                </div>
              ))}
            </div>
          )}

          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "Pos",
                  "CNO",
                  "Name",
                  "Sex",
                  ...model.subjects,
                  "Total",
                  "Avg",
                  "Grade",
                  "Division",
                  "Points",
                  ...(model.hasRemarks ? ["Remarks"] : []),
                ].map((heading) => (
                  <th key={heading} style={styles.th}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.students.map((student) => (
                <tr key={student.id}>
                  <td style={{ ...styles.td, fontWeight: 800 }}>{student.posn ?? "-"}</td>
                  <td style={styles.td}>{student.index_no}</td>
                  <td style={{ ...styles.td, textAlign: "left" }}>{student.name}</td>
                  <td style={styles.td}>{student.sex}</td>
                  {model.subjects.map((_, subjectIndex) => {
                    const grade = student.grades?.[subjectIndex];
                    const display = grade?.raw === "ABS" ? "ABS" : (grade?.score ?? "-");
                    return (
                      <td key={subjectIndex} style={styles.td}>
                        {display}
                      </td>
                    );
                  })}
                  <td style={styles.td}>{student.total ?? "-"}</td>
                  <td style={styles.td}>{student.avg ?? "-"}</td>
                  <td style={{ ...styles.td, color: GRADE_COLORS[student.agrd] }}>{student.agrd ?? "-"}</td>
                  <td style={{ ...styles.td, color: DIVISION_COLORS[student.div] }}>{student.div ?? "-"}</td>
                  <td style={styles.td}>{student.points ?? "-"}</td>
                  {model.hasRemarks && (
                    <td style={{ ...styles.td, textAlign: "left", maxWidth: 120 }}>
                      {student.remarks ? student.remarks.trim() : ""}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {page.isLastPage && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginTop: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "#003366" }}>
                    Grade Distribution
                  </h3>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Grade</th>
                        <th style={styles.th}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.allGrades.map((grade, index) => (
                        <tr key={grade} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ ...styles.td, fontWeight: 800, color: GRADE_COLORS[grade] }}>{grade}</td>
                          <td style={styles.td}>{model.gradeCount[grade] || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "#003366" }}>
                    Division Distribution
                  </h3>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Division</th>
                        <th style={styles.th}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["I", "II", "III", "IV", "0"].map((division, index) => (
                        <tr key={division} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ ...styles.td, fontWeight: 800, color: DIVISION_COLORS[division] }}>{`Div ${division}`}</td>
                          <td style={styles.td}>{model.divisionCount[division] || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={styles.signatureSec}>
                <div style={styles.signBox}>
                  <div style={{ fontWeight: 800 }}>Class Teacher</div>
                  <div style={{ fontSize: 8, marginTop: 4 }}>Date: __________</div>
                </div>
                <div style={styles.signBox}>
                  <div style={{ fontWeight: 800 }}>Head of Department</div>
                  <div style={{ fontSize: 8, marginTop: 4 }}>Date: __________</div>
                </div>
                <div style={styles.signBox}>
                  <div style={{ fontWeight: 800 }}>School Principal</div>
                  <div style={{ fontSize: 8, marginTop: 4 }}>Date: __________</div>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
