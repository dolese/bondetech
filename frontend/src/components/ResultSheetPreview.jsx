import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { GRADE_COLORS, DIVISION_COLORS } from "../utils/constants";
import { getExportBranding } from "../utils/exportBranding";
import { RESULT_SHEET_LAYOUT } from "../utils/resultSheetShared";

function paginateRowsByHeights(rowHeights, firstCapacity, otherCapacity) {
  const pages = [];
  let start = 0;
  let capacity = firstCapacity;

  while (start < rowHeights.length) {
    let used = 0;
    let end = start;
    while (end < rowHeights.length) {
      const nextHeight = rowHeights[end];
      if (end > start && used + nextHeight > capacity) {
        break;
      }
      used += nextHeight;
      end += 1;
    }
    pages.push({ start, end });
    start = end;
    capacity = otherCapacity;
  }

  return pages.length ? pages : [{ start: 0, end: 0 }];
}

export function ResultSheetPreview({ model, isMobile, onPagesChange }) {
  const branding = useMemo(() => getExportBranding(model.schoolInfo), [model.schoolInfo]);
  const pageMeasureRef = useRef(null);
  const headerMeasureRef = useRef(null);
  const summaryMeasureRef = useRef(null);
  const tableHeadMeasureRef = useRef(null);
  const statsMeasureRef = useRef(null);
  const signatureMeasureRef = useRef(null);
  const rowMeasureRefs = useRef([]);
  const [pageRanges, setPageRanges] = useState([{ start: 0, end: model.students.length }]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const pageHeight = pageMeasureRef.current?.clientHeight ?? 0;
      const headerHeight = headerMeasureRef.current?.getBoundingClientRect().height ?? 0;
      const summaryHeight = summaryMeasureRef.current?.getBoundingClientRect().height ?? 0;
      const tableHeadHeight = tableHeadMeasureRef.current?.getBoundingClientRect().height ?? 0;
      const statsHeight = statsMeasureRef.current?.getBoundingClientRect().height ?? 0;
      const signatureHeight = signatureMeasureRef.current?.getBoundingClientRect().height ?? 0;
      const rowHeights = model.students.map((_, index) => rowMeasureRefs.current[index]?.getBoundingClientRect().height ?? 24);
      const footerReserve = statsHeight + signatureHeight + 24;

      const firstCapacity = Math.max(pageHeight - headerHeight - summaryHeight - tableHeadHeight - footerReserve, 40);
      const otherCapacity = Math.max(pageHeight - headerHeight - tableHeadHeight - footerReserve, 40);
      const nextRanges = paginateRowsByHeights(rowHeights, firstCapacity, otherCapacity);

      setPageRanges(nextRanges);
      onPagesChange?.(nextRanges);
    });

    return () => cancelAnimationFrame(frame);
  }, [model, onPagesChange]);

  const pages = useMemo(
    () =>
      pageRanges.map((range, index) => ({
        index,
        students: model.students.slice(range.start, range.end),
        isFirstPage: index === 0,
        isLastPage: index === pageRanges.length - 1,
      })),
    [model.students, pageRanges]
  );

  const styles = {
    pageStack: {
      display: "flex",
      flexDirection: "column",
      gap: RESULT_SHEET_LAYOUT.pageGapPx,
      minWidth: "fit-content",
    },
    sheet: {
      background: "#fff",
      padding: isMobile ? 12 : 18,
      borderRadius: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      border: "1px solid #d6e0f5",
      width: "420mm",
      minHeight: "297mm",
      boxSizing: "border-box",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: isMobile ? 8 : 12,
      flexDirection: isMobile ? "column" : "row",
      borderBottom: "2px solid #003366",
      paddingBottom: 10,
      marginBottom: 16,
    },
    headerCenter: {
      textAlign: "center",
      flex: 1,
    },
    logo: {
      width: isMobile ? 60 : 80,
      height: isMobile ? 60 : 80,
      borderRadius: 6,
      background: "#fff",
      objectFit: "contain",
      padding: 4,
      border: "1px solid #d0dcf8",
    },
    schoolName: {
      fontSize: isMobile ? 15 : 18,
      fontWeight: 900,
      color: "#003366",
      margin: "0 0 4px",
    },
    className: {
      fontSize: isMobile ? 12 : 14,
      fontWeight: 800,
      color: "#555",
      margin: 0,
    },
    resultSummary: {
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)",
      gap: 12,
      marginBottom: 16,
    },
    summaryBox: {
      background: "#f4f7ff",
      padding: 8,
      borderRadius: 6,
      textAlign: "center",
      border: "1px solid #d0dcf8",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    },
    summaryValue: {
      fontSize: isMobile ? 16 : 18,
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
      fontSize: isMobile ? 9 : 10,
      background: "#fff",
      minWidth: isMobile ? 640 : "auto",
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
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
      gap: isMobile ? 16 : 40,
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
    measureShell: {
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      left: -10000,
      top: 0,
      width: "420mm",
      zIndex: -1,
    },
  };

  const renderTable = (students, withHeadRef = false) => (
    <table style={styles.table} className="result-sheet-table">
      <thead ref={withHeadRef ? tableHeadMeasureRef : undefined}>
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
        {students.map((student, index) => (
          <tr
            key={student.id}
            ref={withHeadRef ? (node) => { rowMeasureRefs.current[index] = node; } : undefined}
          >
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
  );

  return (
    <>
      <div style={styles.pageStack}>
        {pages.map((page) => (
          <div key={`page-${page.index}`} style={styles.sheet} className="result-sheet-page">
            <div style={styles.header}>
              <img src={branding.leftLogoSrc} alt="Left crest" style={styles.logo} />
              <div style={styles.headerCenter}>
                <h1 style={styles.schoolName}>{branding.headerName || "School Name"}</h1>
                <p style={styles.className}>
                  Class: <strong>{model.className}</strong>
                </p>
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
              <div style={styles.resultSummary} className="result-sheet-summary-grid">
                {model.summaryCards.map(([label, value]) => (
                  <div key={label} style={styles.summaryBox}>
                    <div style={styles.summaryValue}>{value}</div>
                    <div style={styles.summaryLabel}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {renderTable(page.students)}

            {page.isLastPage && (
              <>
                <div
                  className="result-sheet-stats"
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
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

                <div style={styles.signatureSec} className="result-sheet-signatures">
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

      <div style={styles.measureShell}>
        <div ref={pageMeasureRef} style={styles.sheet}>
          <div ref={headerMeasureRef} style={styles.header}>
            <img src={branding.leftLogoSrc} alt="" style={styles.logo} />
            <div style={styles.headerCenter}>
              <h1 style={styles.schoolName}>{branding.headerName || "School Name"}</h1>
              <p style={styles.className}>Class: <strong>{model.className}</strong></p>
              <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>{branding.headerSubtitle}</p>
              <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>{branding.headerAddress}</p>
            </div>
            <img src={branding.rightLogoSrc} alt="" style={styles.logo} />
          </div>
          <div ref={summaryMeasureRef} style={styles.resultSummary}>
            {model.summaryCards.map(([label, value]) => (
              <div key={label} style={styles.summaryBox}>
                <div style={styles.summaryValue}>{value}</div>
                <div style={styles.summaryLabel}>{label}</div>
              </div>
            ))}
          </div>
          {renderTable(model.students, true)}
          <div
            ref={statsMeasureRef}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginTop: 16,
            }}
          >
            <div style={{ height: 110 }} />
            <div style={{ height: 110 }} />
          </div>
          <div ref={signatureMeasureRef} style={styles.signatureSec}>
            <div style={styles.signBox} />
            <div style={styles.signBox} />
            <div style={styles.signBox} />
          </div>
        </div>
      </div>
    </>
  );
}
