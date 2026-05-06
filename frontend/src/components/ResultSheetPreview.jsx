import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { DIVISION_COLORS } from "../utils/constants";
import { getExportBranding } from "../utils/exportBranding";
import { RESULT_SHEET_LAYOUT } from "../utils/resultSheetShared";

const ACCENT = "#0b5b55";
const BORDER = "#b8c8c5";
const STATUS_COLORS = {
  COMPLETE: "#1a6b2f",
  INCOMPLETE: "#a45b00",
  ABSENT: "#b42318",
};

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

function SummaryCard({ title, children, style }) {
  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        background: "#fff",
        ...style,
      }}
    >
      <div
        style={{
          background: ACCENT,
          color: "#fff",
          fontWeight: 900,
          fontSize: 11,
          textAlign: "center",
          padding: "8px 10px",
          letterSpacing: 0.2,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export function ResultSheetPreview({ model, isMobile, onPagesChange }) {
  const branding = useMemo(() => getExportBranding(model.schoolInfo), [model.schoolInfo]);
  const pageMeasureRef = useRef(null);
  const headerMeasureRef = useRef(null);
  const summaryMeasureRef = useRef(null);
  const tableHeadMeasureRef = useRef(null);
  const footerMeasureRef = useRef(null);
  const rowMeasureRefs = useRef([]);
  const [pageRanges, setPageRanges] = useState([{ start: 0, end: model.students.length }]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const pageHeight = pageMeasureRef.current?.clientHeight ?? 0;
      const headerHeight = headerMeasureRef.current?.getBoundingClientRect().height ?? 0;
      const summaryHeight = summaryMeasureRef.current?.getBoundingClientRect().height ?? 0;
      const tableHeadHeight = tableHeadMeasureRef.current?.getBoundingClientRect().height ?? 0;
      const footerHeight = footerMeasureRef.current?.getBoundingClientRect().height ?? 0;
      const rowHeights = model.students.map((_, index) => rowMeasureRefs.current[index]?.getBoundingClientRect().height ?? 24);

      const firstCapacity = Math.max(pageHeight - headerHeight - summaryHeight - tableHeadHeight - 24, 40);
      const otherCapacity = Math.max(pageHeight - headerHeight - footerHeight - tableHeadHeight - 24, 40);
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
    page: {
      width: "420mm",
      minHeight: "297mm",
      background: "#fff",
      border: `2px solid ${ACCENT}`,
      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      padding: isMobile ? 12 : 20,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    header: {
      display: "grid",
      gridTemplateColumns: "92px 1fr 92px",
      alignItems: "center",
      gap: 12,
      borderBottom: `4px double ${ACCENT}`,
      paddingBottom: 12,
    },
    logo: {
      width: 84,
      height: 84,
      objectFit: "contain",
      justifySelf: "center",
    },
    titleCenter: {
      textAlign: "center",
      display: "grid",
      gap: 4,
    },
    schoolName: {
      margin: 0,
      fontSize: 26,
      lineHeight: 1.1,
      fontWeight: 900,
      color: ACCENT,
      letterSpacing: 0.3,
    },
    headerLine: {
      margin: 0,
      fontSize: 17,
      fontWeight: 500,
      color: "#161616",
    },
    sectionTitle: {
      margin: 0,
      textAlign: "center",
      fontSize: 22,
      fontWeight: 900,
      color: ACCENT,
      letterSpacing: 0.2,
      textTransform: "uppercase",
    },
    metaRow: {
      display: "flex",
      justifyContent: "center",
      gap: 22,
      flexWrap: "wrap",
      fontSize: 13,
      color: "#111",
      paddingBottom: 8,
      borderBottom: `4px double ${ACCENT}`,
    },
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "1.25fr 0.85fr 1.25fr",
      gap: 12,
      alignItems: "start",
    },
    summaryTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 11,
    },
    summaryCell: {
      border: `1px solid ${BORDER}`,
      padding: "8px 10px",
      color: "#111",
    },
    summaryValue: {
      border: `1px solid ${BORDER}`,
      padding: "8px 10px",
      textAlign: "right",
      fontWeight: 800,
      color: "#111",
      whiteSpace: "nowrap",
    },
    summaryHeaderCell: {
      border: `1px solid ${BORDER}`,
      padding: "8px 10px",
      textAlign: "center",
      fontWeight: 800,
      color: "#111",
    },
    resultHeading: {
      margin: "4px 0 0",
      fontSize: 17,
      fontWeight: 900,
      color: ACCENT,
      textTransform: "uppercase",
    },
    resultTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 10.5,
    },
    th: {
      background: ACCENT,
      color: "#fff",
      border: `1px solid ${BORDER}`,
      padding: "7px 6px",
      textAlign: "center",
      fontWeight: 800,
      whiteSpace: "nowrap",
    },
    td: {
      border: `1px solid ${BORDER}`,
      padding: "7px 6px",
      textAlign: "center",
      color: "#161616",
    },
    footerWrap: {
      marginTop: "auto",
      display: "grid",
      gap: 12,
    },
    pageFooter: {
      borderTop: `1px solid ${ACCENT}`,
      paddingTop: 6,
      textAlign: "center",
      fontSize: 10,
      color: "#3b3b3b",
      fontWeight: 700,
    },
    keyRow: {
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      alignItems: "center",
      fontSize: 11,
    },
    signatureGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 30,
      fontSize: 11,
      color: "#111",
      marginTop: 6,
    },
    signLabel: {
      marginBottom: 18,
    },
    signLine: {
      borderTop: `1px solid ${BORDER}`,
      width: 180,
      margin: "0 auto",
      paddingTop: 6,
      textAlign: "center",
      fontWeight: 700,
    },
    dateRow: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
      fontSize: 11,
      marginTop: 2,
    },
    dateLine: {
      borderTop: `1px solid ${BORDER}`,
      width: 150,
      height: 0,
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

  const renderStudentTable = (students, withRefs = false) => (
    <table style={styles.resultTable}>
      <thead ref={withRefs ? tableHeadMeasureRef : undefined}>
        <tr>
          {[
            "Rank",
            "Adm No",
            "Student Name",
            "Sex",
            ...model.subjects,
            "TOTAL",
            "AVERAGE",
            "POINTS",
            "DIVISION",
            "STATUS",
          ].map((heading) => (
            <th key={heading} style={styles.th}>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {students.map((student, index) => (
          <tr key={student.id} ref={withRefs ? (node) => { rowMeasureRefs.current[index] = node; } : undefined}>
            <td style={{ ...styles.td, fontWeight: 800 }}>{student.posn ?? "-"}</td>
            <td style={styles.td}>{student.index_no}</td>
            <td style={{ ...styles.td, textAlign: "left", fontWeight: 500 }}>{student.name}</td>
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
            <td style={{ ...styles.td, fontWeight: 700 }}>{student.total ?? "-"}</td>
            <td style={styles.td}>{student.avg ?? "-"}</td>
            <td style={styles.td}>{student.points ?? "-"}</td>
            <td style={{ ...styles.td, color: DIVISION_COLORS[student.div] ?? "#111", fontWeight: 800 }}>{student.div ?? "-"}</td>
            <td style={{ ...styles.td, color: STATUS_COLORS[student.resultStatus] ?? "#111", fontWeight: 900 }}>
              {student.resultStatus}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const footerContent = (
    <div style={styles.footerWrap}>
      <div style={styles.keyRow}>
        <strong>KEY:</strong>
        <span style={{ color: STATUS_COLORS.COMPLETE, fontWeight: 800 }}>COMPLETE</span>
        <span>(&ge;7 Subjects)</span>
        <span>|</span>
        <span style={{ color: STATUS_COLORS.INCOMPLETE, fontWeight: 800 }}>INCOMPLETE</span>
        <span>(1-6 Subjects)</span>
        <span>|</span>
        <span style={{ color: STATUS_COLORS.ABSENT, fontWeight: 800 }}>ABSENT</span>
        <span>(No Subject)</span>
      </div>

      <div style={styles.signatureGrid}>
        <div>
          <div style={styles.signLabel}>Prepared by:</div>
          <div style={styles.signLine}>Class Teacher</div>
        </div>
        <div>
          <div style={styles.signLabel}>Checked by:</div>
          <div style={styles.signLine}>Headmaster</div>
        </div>
      </div>

      <div style={styles.dateRow}>
        <span>Date:</span>
        <div style={styles.dateLine} />
      </div>
    </div>
  );

  const renderPageFooter = (pageIndex, isLastPage = false) => (
    <div style={{ ...styles.pageFooter, marginTop: isLastPage ? 10 : "auto" }}>
      {`Page ${pageIndex + 1} of ${pages.length}`}
    </div>
  );

  return (
    <>
      <div style={styles.pageStack}>
        {pages.map((page) => (
          <div key={`page-${page.index}`} style={styles.page} className="result-sheet-page">
            <div style={styles.header}>
              <img src={branding.leftLogoSrc} alt="Left crest" style={styles.logo} />
              <div style={styles.titleCenter}>
                <h1 style={styles.schoolName}>{branding.headerName}</h1>
                <p style={styles.headerLine}>{branding.headerSubtitle}</p>
                <p style={styles.headerLine}>{branding.headerAddress}</p>
              </div>
              <img src={branding.rightLogoSrc} alt="Right crest" style={styles.logo} />
            </div>

            {page.isFirstPage && (
              <>
                <h2 style={styles.sectionTitle}>General Students Results</h2>
                <div style={styles.metaRow}>
                  <span><strong>Year:</strong> {model.meta.year}</span>
                  <span>|</span>
                  <span><strong>Term:</strong> {model.meta.term}</span>
                  <span>|</span>
                  <span><strong>Exam:</strong> {model.meta.exam}</span>
                  <span>|</span>
                  <span><strong>Class:</strong> {model.meta.classLabel}</span>
                </div>

                <div style={styles.summaryGrid} ref={summaryMeasureRef}>
                  <SummaryCard title="RESULTS SUMMARY">
                    <table style={styles.summaryTable}>
                      <tbody>
                        {model.summaryRows.map(([label, value]) => (
                          <tr key={label}>
                            <td style={styles.summaryCell}>{label}:</td>
                            <td style={styles.summaryValue}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </SummaryCard>

                  <SummaryCard title="DIVISION SUMMARY (COMPLETE ONLY)">
                    <table style={styles.summaryTable}>
                      <tbody>
                        {model.divisionRows.map(([label, value]) => (
                          <tr key={label}>
                            <td style={styles.summaryCell}>{label}</td>
                            <td style={styles.summaryValue}>{value}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ ...styles.summaryCell, fontWeight: 900 }}>Total (Complete):</td>
                          <td style={{ ...styles.summaryValue, fontWeight: 900 }}>{model.completeStudents.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </SummaryCard>

                  <SummaryCard title="SEX SUMMARY">
                    <table style={styles.summaryTable}>
                      <thead>
                        <tr>
                          <th style={styles.summaryHeaderCell}></th>
                          <th style={styles.summaryHeaderCell}>MALE</th>
                          <th style={styles.summaryHeaderCell}>FEMALE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Total Students", model.sexSummary.total],
                          ["Complete", model.sexSummary.complete],
                          ["Incomplete", model.sexSummary.incomplete],
                          ["Absent", model.sexSummary.absent],
                          ["Average (Complete Only)", model.sexSummary.average],
                          ["Pass (Div I-IV)", model.sexSummary.pass],
                          ["Fail (Div 0)", model.sexSummary.fail],
                        ].map(([label, values]) => (
                          <tr key={label}>
                            <td style={styles.summaryCell}>{label}:</td>
                            <td style={styles.summaryValue}>{values.male}</td>
                            <td style={styles.summaryValue}>{values.female}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </SummaryCard>
                </div>
              </>
            )}

            <h3 style={styles.resultHeading}>Students Results</h3>
            {renderStudentTable(page.students)}

            {page.isLastPage && footerContent}
            {renderPageFooter(page.index, page.isLastPage)}
          </div>
        ))}
      </div>

      <div style={styles.measureShell}>
        <div ref={pageMeasureRef} style={styles.page}>
          <div ref={headerMeasureRef} style={styles.header}>
            <img src={branding.leftLogoSrc} alt="" style={styles.logo} />
            <div style={styles.titleCenter}>
              <h1 style={styles.schoolName}>{branding.headerName}</h1>
              <p style={styles.headerLine}>{branding.headerSubtitle}</p>
              <p style={styles.headerLine}>{branding.headerAddress}</p>
            </div>
            <img src={branding.rightLogoSrc} alt="" style={styles.logo} />
          </div>

          <h2 style={styles.sectionTitle}>General Students Results</h2>
          <div style={styles.metaRow}>
            <span><strong>Year:</strong> {model.meta.year}</span>
            <span>|</span>
            <span><strong>Term:</strong> {model.meta.term}</span>
            <span>|</span>
            <span><strong>Exam:</strong> {model.meta.exam}</span>
            <span>|</span>
            <span><strong>Class:</strong> {model.meta.classLabel}</span>
          </div>

          <div ref={summaryMeasureRef} style={styles.summaryGrid}>
            <SummaryCard title="RESULTS SUMMARY">
              <table style={styles.summaryTable}>
                <tbody>
                  {model.summaryRows.map(([label, value]) => (
                    <tr key={label}>
                      <td style={styles.summaryCell}>{label}:</td>
                      <td style={styles.summaryValue}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SummaryCard>
            <SummaryCard title="DIVISION SUMMARY (COMPLETE ONLY)">
              <div style={{ height: 220 }} />
            </SummaryCard>
            <SummaryCard title="SEX SUMMARY">
              <div style={{ height: 220 }} />
            </SummaryCard>
          </div>

          <h3 style={styles.resultHeading}>Students Results</h3>
          {renderStudentTable(model.students, true)}

          <div ref={footerMeasureRef}>
            {footerContent}
            {renderPageFooter(pages.length - 1, true)}
          </div>
        </div>
      </div>
    </>
  );
}
