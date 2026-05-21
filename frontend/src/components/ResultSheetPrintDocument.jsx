import React, { useMemo } from "react";
import { DIVISION_COLORS } from "../utils/constants";
import { getResultSheetBranding } from "../utils/exportBranding";
import { getDivisionDisplay, RESULT_SHEET_LAYOUT, RESULT_SHEET_PAGE_MM } from "../utils/resultSheetShared";

const ACCENT = "#163f97";
const BORDER = "#aebedf";
const STATUS_COLORS = {
  COMPLETE: "#1a6b2f",
  INCOMPLETE: "#a45b00",
  ABSENT: "#b42318",
};
const SAFE_MARGIN_MM = RESULT_SHEET_LAYOUT.safeMarginMm;
const PAGE_WIDTH_MM = RESULT_SHEET_PAGE_MM.width - SAFE_MARGIN_MM * 2;
const PAGE_HEIGHT_MM = RESULT_SHEET_PAGE_MM.height - SAFE_MARGIN_MM * 2;

function SummaryCard({ title, children }) {
  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        background: "#fff",
      }}
    >
      <div
        style={{
          background: ACCENT,
          color: "#fff",
          fontWeight: 900,
          fontSize: 10.5,
          textAlign: "center",
          padding: "8px 10px",
          letterSpacing: 0.2,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function OverviewMeter({ label, value, detail, color, ringValue }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 8, padding: "12px 8px" }}>
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: "50%",
          background: `conic-gradient(${color} 0 ${Math.max(0, Math.min(100, ringValue))}%, #e7eefc ${Math.max(0, Math.min(100, ringValue))}% 100%)`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fff",
            display: "grid",
            placeItems: "center",
            color: "#0f172a",
            fontWeight: 900,
            fontSize: 11,
            textAlign: "center",
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
      </div>
      <div style={{ textAlign: "center", display: "grid", gap: 3 }}>
        <div style={{ fontSize: 10.5, fontWeight: 900, color }}>{label}</div>
        <div style={{ fontSize: 10, color: "#334155", fontWeight: 700 }}>{detail}</div>
      </div>
    </div>
  );
}

export function ResultSheetPrintDocument({ model, pageRanges }) {
  const branding = useMemo(() => getResultSheetBranding(model.schoolInfo), [model.schoolInfo]);
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
      alignItems: "center",
      gap: 0,
      background: "#fff",
    },
    page: {
      width: `${PAGE_WIDTH_MM}mm`,
      minHeight: `${PAGE_HEIGHT_MM}mm`,
      background: "#fff",
      border: `1.6px solid ${ACCENT}`,
      padding: 20,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      pageBreakAfter: "always",
      breakAfter: "page",
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
      width: 78,
      height: 78,
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
      fontSize: 25,
      lineHeight: 1.1,
      fontWeight: 900,
      color: ACCENT,
      letterSpacing: 0.3,
      textTransform: "uppercase",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    },
    headerLine: {
      margin: 0,
      fontSize: 15,
      fontWeight: 700,
      color: "#161616",
    },
    sectionTitle: {
      margin: 0,
      textAlign: "center",
      fontSize: 18,
      fontWeight: 900,
      color: ACCENT,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      fontFamily: "'IBM Plex Sans', 'Arial', sans-serif",
    },
    metaRow: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 12,
      alignItems: "stretch",
      paddingBottom: 8,
      borderBottom: `4px double ${ACCENT}`,
    },
    metaTags: {
      display: "flex",
      justifyContent: "center",
      gap: 14,
      flexWrap: "wrap",
      fontSize: 13,
      color: "#111",
      alignItems: "center",
    },
    generatedCard: {
      minWidth: 118,
      borderRadius: 10,
      background: ACCENT,
      color: "#fff",
      display: "grid",
      alignContent: "center",
      justifyItems: "center",
      padding: "10px 12px",
      textAlign: "center",
    },
    generatedLabel: {
      fontSize: 9.5,
      fontWeight: 800,
      letterSpacing: 0.25,
      textTransform: "uppercase",
    },
    generatedValue: {
      marginTop: 5,
      fontSize: 11.5,
      fontWeight: 800,
    },
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "1.12fr 1fr 1fr 1fr",
      gap: 12,
      alignItems: "start",
    },
    performanceShell: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 8,
      padding: "8px 8px 10px",
    },
    subjectBand: {
      border: `1px solid ${BORDER}`,
      background: "#fff",
      display: "grid",
      gap: 0,
    },
    subjectBandHeader: {
      background: ACCENT,
      color: "#fff",
      fontWeight: 900,
      fontSize: 10.5,
      padding: "8px 10px",
      textTransform: "uppercase",
      letterSpacing: 0.2,
    },
    subjectBandGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    },
    subjectCard: {
      borderRight: `1px solid ${BORDER}`,
      borderBottom: `1px solid ${BORDER}`,
      padding: "10px 8px",
      display: "grid",
      gap: 8,
      background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    },
    subjectTop: {
      display: "grid",
      gap: 2,
      justifyItems: "center",
      textAlign: "center",
    },
    subjectName: {
      fontSize: 12,
      fontWeight: 900,
      color: ACCENT,
      textTransform: "uppercase",
    },
    subjectSub: {
      fontSize: 9,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: 0.2,
    },
    subjectStats: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
    },
    statMini: {
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      padding: "5px 4px",
      textAlign: "center",
      background: "#fff",
    },
    statMiniLabel: {
      fontSize: 8.5,
      fontWeight: 800,
      color: "#64748b",
      textTransform: "uppercase",
    },
    statMiniValue: {
      marginTop: 2,
      fontSize: 14,
      fontWeight: 900,
      color: "#0f172a",
    },
    tableHeadingRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12,
      marginTop: 4,
    },
    tableHeadingMeta: {
      fontSize: 10,
      color: "#475569",
      fontWeight: 700,
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
      gap: 10,
    },
    footerMotto: {
      borderTop: `1px solid ${BORDER}`,
      borderBottom: `1px solid ${BORDER}`,
      padding: "9px 12px",
      textAlign: "center",
      fontSize: 12,
      fontWeight: 900,
      color: ACCENT,
      letterSpacing: 0.35,
      textTransform: "uppercase",
      background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
    },
    pageFooter: {
      borderTop: `1px solid ${ACCENT}`,
      paddingTop: 8,
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
      gap: 12,
      fontSize: 10,
      color: "#3b3b3b",
      fontWeight: 700,
    },
    footerBrand: {
      display: "inline-flex",
      alignItems: "center",
      justifySelf: "end",
      gap: 8,
      color: ACCENT,
      fontWeight: 900,
      letterSpacing: 0.25,
      textTransform: "uppercase",
    },
    footerBrandLogo: {
      width: 22,
      height: 22,
      objectFit: "contain",
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
  };

  const renderStudentTable = (students) => (
    <table style={styles.resultTable}>
      <thead>
        <tr>
          {[
            "CNO",
            "Student Name",
            "Sex",
            ...model.subjects,
            "POINTS",
            "DIVISION",
          ].map((heading) => (
            <th key={heading} style={styles.th}>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.id}>
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
            <td style={styles.td}>{student.points ?? "-"}</td>
            <td
              style={{
                ...styles.td,
                color:
                  student.resultStatus === "COMPLETE"
                    ? DIVISION_COLORS[student.div] ?? "#111"
                    : STATUS_COLORS[student.resultStatus] ?? "#111",
                fontWeight: 900,
              }}
            >
              {getDivisionDisplay(student)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderSummaryBand = () => (
    <>
      <h2 style={styles.sectionTitle}>Official Result Sheet</h2>
      <div style={styles.metaRow}>
        <div style={styles.metaTags}>
          <span><strong>Year:</strong> {model.meta.year}</span>
          <span>|</span>
          <span><strong>Term:</strong> {model.meta.term}</span>
          <span>|</span>
          <span><strong>Exam:</strong> {model.meta.exam}</span>
          <span>|</span>
          <span><strong>Class:</strong> {model.meta.classLabel}</span>
        </div>
        <div style={styles.generatedCard}>
          <div style={styles.generatedLabel}>Report Generated</div>
          <div style={styles.generatedValue}>{model.generatedAtLabel}</div>
        </div>
      </div>

      <div style={styles.summaryGrid}>
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

        <SummaryCard title="DIVISION SUMMARY (Complete Only)">
          <table style={styles.summaryTable}>
            <thead>
              <tr>
                <th style={styles.summaryHeaderCell}>Division</th>
                <th style={styles.summaryHeaderCell}>Students</th>
                <th style={styles.summaryHeaderCell}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {model.divisionSummaryRows.map((row) => (
                <tr key={row.key}>
                  <td style={styles.summaryCell}>{row.label}</td>
                  <td style={styles.summaryValue}>{row.students}</td>
                  <td style={styles.summaryValue}>{row.percentage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SummaryCard>

        <SummaryCard title="SEX SUMMARY">
          <table style={styles.summaryTable}>
            <thead>
              <tr>
                <th style={styles.summaryHeaderCell}></th>
                <th style={styles.summaryHeaderCell}>Male</th>
                <th style={styles.summaryHeaderCell}>Female</th>
                <th style={styles.summaryHeaderCell}>Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Total", model.sexSummary.total],
                ["Complete", model.sexSummary.complete],
                ["Incomplete", model.sexSummary.incomplete],
                ["Absent", model.sexSummary.absent],
                ["Avg (Complete)", model.sexSummary.average],
                ["Pass (I-IV)", model.sexSummary.pass],
                ["Fail (0)", model.sexSummary.fail],
              ].map(([label, values]) => (
                <tr key={label}>
                  <td style={styles.summaryCell}>{label}:</td>
                  <td style={styles.summaryValue}>{values.male}</td>
                  <td style={styles.summaryValue}>{values.female}</td>
                  <td style={styles.summaryValue}>{Number(values.male) + Number(values.female)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SummaryCard>

        <SummaryCard title="PERFORMANCE OVERVIEW">
          <div style={styles.performanceShell}>
            <OverviewMeter
              label="Pass Rate"
              value={`${model.performanceOverview.passRate}%`}
              detail={`I-IV | ${model.performanceOverview.passCount} / ${model.performanceOverview.completeCount}`}
              color="#2f8f43"
              ringValue={Number(model.performanceOverview.passRate)}
            />
            <OverviewMeter
              label="Fail Rate"
              value={`${model.performanceOverview.failRate}%`}
              detail={`0 | ${model.performanceOverview.failCount} / ${model.performanceOverview.completeCount}`}
              color="#2563eb"
              ringValue={Number(model.performanceOverview.failRate)}
            />
            <OverviewMeter
              label="Class Average"
              value={model.performanceOverview.classAverage}
              detail="Complete Only"
              color="#7c3aed"
              ringValue={Math.min(100, Number(model.performanceOverview.classAverage) || 0)}
            />
          </div>
        </SummaryCard>
      </div>

      <div style={styles.subjectBand}>
        <div style={styles.subjectBandHeader}>Subject Performance Summary (Complete Only)</div>
        <div style={styles.subjectBandGrid}>
          {model.subjectSummaries.map((subject, index) => (
            <div
              key={subject.key}
              style={{
                ...styles.subjectCard,
                borderRight: (index + 1) % 5 === 0 ? "none" : styles.subjectCard.borderRight,
              }}
            >
              <div style={styles.subjectTop}>
                <div style={styles.subjectName}>{subject.subject}</div>
                <div style={styles.subjectSub}>Entries {subject.entries}</div>
              </div>
              <div style={styles.subjectStats}>
                <div style={styles.statMini}>
                  <div style={styles.statMiniLabel}>Avg</div>
                  <div style={styles.statMiniValue}>{subject.average}</div>
                </div>
                <div style={styles.statMini}>
                  <div style={styles.statMiniLabel}>Pass Rate</div>
                  <div style={{ ...styles.statMiniValue, fontSize: 12.5 }}>{subject.passRate}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
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

      <div style={styles.footerMotto}>{branding.footerMotto}</div>
    </div>
  );

  const renderPageFooter = (pageIndex, isLastPage = false) => (
    <div style={{ ...styles.pageFooter, marginTop: isLastPage ? 10 : "auto" }}>
      <span />
      <span>{`Page ${pageIndex + 1} of ${pages.length}`}</span>
      <span style={styles.footerBrand}>
        <img src={branding.rightLogoSrc} alt="Bonde logo" style={styles.footerBrandLogo} />
        Bonde Secondary School
      </span>
    </div>
  );

  return (
    <div style={styles.pageStack}>
      <style>{`
        @page {
          size: A3 landscape;
          margin: ${SAFE_MARGIN_MM}mm;
        }
        body { margin: 0; background: #fff; }
        .result-sheet-print-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
      `}</style>

      {pages.map((page) => (
        <div key={`print-page-${page.index}`} style={styles.page} className="result-sheet-print-page">
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
            renderSummaryBand()
          )}

          <div style={styles.tableHeadingRow}>
            <h3 style={styles.resultHeading}>Students Results</h3>
            <div style={styles.tableHeadingMeta}>
              Showing {page.students.length} of {model.students.length} students
            </div>
          </div>
          {renderStudentTable(page.students)}

          {page.isLastPage && footerContent}
          {renderPageFooter(page.index, page.isLastPage)}
        </div>
      ))}
    </div>
  );
}
