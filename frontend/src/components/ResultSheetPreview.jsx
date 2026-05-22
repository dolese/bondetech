import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { DIVISION_COLORS } from "../utils/constants";
import { getResultSheetBranding } from "../utils/exportBranding";
import {
  getDivisionDisplay,
  getResultSheetLayout,
  getResultSheetPageSpec,
  getResultSheetTableFixedWidth,
  getResultSheetTableHeaders,
} from "../utils/resultSheetShared";

const ACCENT = "#163f97";
const BORDER = "#aebedf";
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
        minWidth: 0,
        alignSelf: "stretch",
        display: "flex",
        flexDirection: "column",
        ...style,
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

function OverviewMeter({ label, value, detail, color, ringValue, compact = false }) {
  const outerSize = compact ? 64 : 76;
  const innerSize = compact ? 46 : 56;
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: compact ? 6 : 8, padding: compact ? "10px 6px" : "12px 8px" }}>
      <div
        style={{
          width: outerSize,
          height: outerSize,
          borderRadius: "50%",
          background: `conic-gradient(${color} 0 ${Math.max(0, Math.min(100, ringValue))}%, #e7eefc ${Math.max(0, Math.min(100, ringValue))}% 100%)`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: "50%",
            background: "#fff",
            display: "grid",
            placeItems: "center",
            color: "#0f172a",
            fontWeight: 900,
            fontSize: compact ? 9.5 : 11,
            textAlign: "center",
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
      </div>
      <div style={{ textAlign: "center", display: "grid", gap: 3 }}>
        <div style={{ fontSize: compact ? 9.2 : 10.5, fontWeight: 900, color }}>{label}</div>
        <div style={{ fontSize: compact ? 8.6 : 10, color: "#334155", fontWeight: 700 }}>{detail}</div>
      </div>
    </div>
  );
}

function IconBadge({ label, tone = "#163f97" }) {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: `${tone}18`,
        border: `1px solid ${tone}55`,
        color: tone,
        display: "grid",
        placeItems: "center",
        fontSize: 9,
        fontWeight: 900,
        lineHeight: 1,
        flex: "0 0 auto",
      }}
    >
      {label}
    </div>
  );
}

function MetaChip({ icon, label, value, tone = "#163f97" }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <IconBadge label={icon} tone={tone} />
      <span><strong>{label}:</strong> {value}</span>
    </div>
  );
}

export function ResultSheetPreview({ model, isMobile, onPagesChange, pageSize = "a3" }) {
  const branding = useMemo(() => getResultSheetBranding(model.schoolInfo), [model.schoolInfo]);
  const pageSpec = useMemo(() => getResultSheetPageSpec(pageSize), [pageSize]);
  const layout = useMemo(() => getResultSheetLayout(pageSize), [pageSize]);
  const SAFE_MARGIN_MM = layout.safeMarginMm;
  const PAGE_WIDTH_MM = pageSpec.width - SAFE_MARGIN_MM * 2;
  const PAGE_HEIGHT_MM = pageSpec.height - SAFE_MARGIN_MM * 2;
  const isA4 = String(pageSize).toLowerCase() === "a4";
  const leftLogoSrc = branding.leftLogoSrc || branding.rightLogoSrc;
  const rightLogoSrc = branding.rightLogoSrc || branding.leftLogoSrc;
  const resultTableFixedWidth = useMemo(() => getResultSheetTableFixedWidth(pageSize), [pageSize]);
  const tableHeaders = useMemo(() => getResultSheetTableHeaders(model), [model]);
  const subjectColumnWidth = `${
    (
      (100
        - resultTableFixedWidth.cno
        - resultTableFixedWidth.name
        - resultTableFixedWidth.sex
        - resultTableFixedWidth.points
        - resultTableFixedWidth.division)
      / Math.max(model.subjects.length, 1)
    ).toFixed(2)
  }%`;
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
      alignItems: "center",
      gap: layout.pageGapPx,
      minWidth: "max-content",
      padding: "0 12px",
    },
    page: {
      width: `${PAGE_WIDTH_MM}mm`,
      minHeight: `${PAGE_HEIGHT_MM}mm`,
      background: "#fff",
      border: `1.6px solid ${ACCENT}`,
      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      padding: isMobile ? 10 : (isA4 ? 10 : 12),
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    header: {
      display: "grid",
      gridTemplateColumns: isA4 ? "62px minmax(0, 1fr) 62px" : "76px minmax(0, 1fr) 76px",
      alignItems: "center",
      gap: 10,
      borderBottom: `4px double ${ACCENT}`,
      paddingBottom: 12,
    },
    logo: {
      width: isA4 ? 56 : 64,
      height: isA4 ? 56 : 64,
      objectFit: "contain",
      justifySelf: "center",
      display: "block",
    },
    titleCenter: {
      textAlign: "center",
      display: "grid",
      gap: 4,
      minWidth: 0,
    },
    schoolName: {
      margin: 0,
      fontSize: isA4 ? 20 : 23,
      lineHeight: 1.1,
      fontWeight: 900,
      color: ACCENT,
      letterSpacing: 0.3,
      textTransform: "uppercase",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    },
    headerLine: {
      margin: 0,
      fontSize: isA4 ? 11.2 : 13,
      fontWeight: 700,
      color: "#161616",
    },
    sectionTitle: {
      margin: 0,
      textAlign: "center",
      fontSize: 17,
      fontWeight: 900,
      color: ACCENT,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      fontFamily: "'Inter', 'Arial', sans-serif",
    },
    metaRow: {
      display: "grid",
      gridTemplateColumns: isA4 ? "1fr" : "1fr auto",
      gap: isA4 ? 8 : 12,
      alignItems: "stretch",
      paddingBottom: 8,
      borderBottom: `4px double ${ACCENT}`,
    },
    metaTags: {
      display: "flex",
      justifyContent: "center",
      gap: isA4 ? 8 : 10,
      flexWrap: "wrap",
      fontSize: isA4 ? 11.5 : 13,
      color: "#111",
      alignItems: "center",
    },
    generatedCard: {
      minWidth: 112,
      borderRadius: 8,
      background: ACCENT,
      color: "#fff",
      display: "grid",
      alignContent: "center",
      justifyItems: "center",
      padding: "8px 10px",
      textAlign: "center",
      justifySelf: isA4 ? "end" : "stretch",
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
      gridTemplateColumns: isA4 ? "1fr" : "1fr 1fr 1fr 1fr",
      gap: isA4 ? 6 : 8,
      alignItems: "start",
    },
    performanceShell: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: isA4 ? 6 : 8,
      padding: isA4 ? "8px 6px 8px" : "8px 8px 10px",
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
      gridTemplateColumns: isA4 ? "repeat(5, minmax(0, 1fr))" : `repeat(${Math.max(model.subjectSummaries.length, 1)}, minmax(0, 1fr))`,
      width: "100%",
    },
    subjectCard: {
      borderRight: `1px solid ${BORDER}`,
      borderBottom: `1px solid ${BORDER}`,
      padding: "8px 6px",
      display: "grid",
      gap: 6,
      background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
      minWidth: 0,
    },
    subjectTop: {
      display: "grid",
      gap: 2,
      justifyItems: "center",
      textAlign: "center",
    },
    subjectName: {
      fontSize: 11,
      fontWeight: 900,
      color: ACCENT,
      textTransform: "uppercase",
    },
    subjectSub: {
      fontSize: 8,
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
      tableLayout: "fixed",
      fontSize: isA4 ? 8.2 : 9.6,
    },
    summaryCell: {
      border: `1px solid ${BORDER}`,
      padding: isA4 ? "3px 4px" : "5px 6px",
      color: "#111",
      overflowWrap: "anywhere",
    },
    summaryValue: {
      border: `1px solid ${BORDER}`,
      padding: isA4 ? "3px 4px" : "5px 6px",
      textAlign: "right",
      fontWeight: 800,
      color: "#111",
      whiteSpace: "nowrap",
    },
    summaryHeaderCell: {
      border: `1px solid ${BORDER}`,
      padding: isA4 ? "3px 3px" : "5px 4px",
      textAlign: "center",
      fontWeight: 800,
      color: "#111",
      overflowWrap: "anywhere",
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
      minWidth: "100%",
      maxWidth: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
      fontSize: 9.2,
      display: "table",
    },
    th: {
      background: ACCENT,
      color: "#fff",
      border: `1px solid ${BORDER}`,
      padding: "5px 3px",
      textAlign: "center",
      fontWeight: 800,
      whiteSpace: "nowrap",
    },
    td: {
      border: `1px solid ${BORDER}`,
      padding: "4px 3px",
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
    measureShell: {
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      left: -10000,
      top: 0,
      width: `${PAGE_WIDTH_MM}mm`,
      zIndex: -1,
    },
  };

  const renderStudentTable = (students, withRefs = false) => (
    <div style={{ width: "100%" }}>
    <table style={styles.resultTable}>
      <colgroup>
        <col style={{ width: `${resultTableFixedWidth.cno}%` }} />
        <col style={{ width: `${resultTableFixedWidth.name}%` }} />
        <col style={{ width: `${resultTableFixedWidth.sex}%` }} />
        {model.subjects.map((subject, index) => (
          <col key={`${subject}-${index}`} style={{ width: subjectColumnWidth }} />
        ))}
        <col style={{ width: `${resultTableFixedWidth.points}%` }} />
        <col style={{ width: `${resultTableFixedWidth.division}%` }} />
      </colgroup>
      <thead ref={withRefs ? tableHeadMeasureRef : undefined}>
        <tr>
          {tableHeaders.map((heading) => (
            <th key={heading} style={styles.th}>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {students.map((student, index) => (
          <tr key={student.id} ref={withRefs ? (node) => { rowMeasureRefs.current[index] = node; } : undefined}>
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
    </div>
  );

  const renderSummaryBand = () => (
    <>
      <h2 style={styles.sectionTitle}>Official Result Sheet</h2>
      <div style={styles.metaRow}>
        <div style={styles.metaTags}>
          <MetaChip icon="YR" label="Year" value={model.meta.year} />
          <MetaChip icon="TM" label="Term" value={model.meta.term} />
          <MetaChip icon="EX" label="Exam" value={model.meta.exam} />
          <MetaChip icon="CL" label="Class" value={model.meta.classLabel} />
        </div>
        <div style={styles.generatedCard}>
          <div style={styles.generatedLabel}>Report Generated</div>
          <div style={styles.generatedValue}>{model.generatedAtLabel}</div>
        </div>
      </div>

      <div style={styles.summaryGrid} ref={summaryMeasureRef}>
        <SummaryCard title="RESULTS SUMMARY">
          <table style={styles.summaryTable}>
            <tbody>
              {model.summaryRows.map(([label, value]) => (
                <tr key={label}>
                  <td style={styles.summaryCell}>
                    <div style={{ display: "flex", alignItems: "center", gap: isA4 ? 6 : 8, flexWrap: "wrap" }}>
                      <IconBadge
                        label={
                          label.includes("Total") ? "TS"
                            : label.includes("Complete") ? "CP"
                            : label.includes("Incomplete") ? "IC"
                            : label.includes("Absent") ? "AB"
                            : label.includes("Average") ? "AV"
                            : label.includes("Pass") ? "PS"
                            : "FL"
                        }
                        tone={
                          label.includes("Pass") ? "#2f8f43"
                            : label.includes("Fail") ? "#b42318"
                            : label.includes("Absent") ? "#b42318"
                            : label.includes("Incomplete") ? "#d97706"
                            : ACCENT
                        }
                      />
                      <span>{label}:</span>
                    </div>
                  </td>
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
                <th style={styles.summaryHeaderCell}>Male</th>
                <th style={styles.summaryHeaderCell}>Female</th>
                <th style={styles.summaryHeaderCell}>Students</th>
                <th style={styles.summaryHeaderCell}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {model.divisionSummaryRows.map((row) => (
                <tr key={row.key}>
                  <td style={styles.summaryCell}>{row.label}</td>
                  <td style={styles.summaryValue}>{row.male}</td>
                  <td style={styles.summaryValue}>{row.female}</td>
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
              compact={isA4}
            />
            <OverviewMeter
              label="Fail Rate"
              value={`${model.performanceOverview.failRate}%`}
              detail={`0 | ${model.performanceOverview.failCount} / ${model.performanceOverview.completeCount}`}
              color="#2563eb"
              ringValue={Number(model.performanceOverview.failRate)}
              compact={isA4}
            />
            <OverviewMeter
              label="Class Average"
              value={model.performanceOverview.classAverage}
              detail="Complete Only"
              color="#7c3aed"
              ringValue={Math.min(100, Number(model.performanceOverview.classAverage) || 0)}
              compact={isA4}
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
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  <IconBadge label={subject.subject.slice(0, Math.min(2, subject.subject.length)).toUpperCase()} tone={ACCENT} />
                  <div style={styles.subjectName}>{subject.subject}</div>
                </div>
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
    <>
      <div style={styles.pageStack}>
        {pages.map((page) => (
          <div key={`page-${page.index}`} style={styles.page} className="result-sheet-page">
            <div style={styles.header}>
              <img src={leftLogoSrc} alt="Left crest" style={styles.logo} />
              <div style={styles.titleCenter}>
                <h1 style={styles.schoolName}>{branding.headerName}</h1>
                <p style={styles.headerLine}>{branding.headerSubtitle}</p>
                <p style={styles.headerLine}>{branding.headerAddress}</p>
              </div>
              <img src={rightLogoSrc} alt="Right crest" style={styles.logo} />
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

      <div style={styles.measureShell}>
        <div ref={pageMeasureRef} style={styles.page}>
          <div ref={headerMeasureRef} style={styles.header}>
            <img src={leftLogoSrc} alt="" style={styles.logo} />
            <div style={styles.titleCenter}>
              <h1 style={styles.schoolName}>{branding.headerName}</h1>
              <p style={styles.headerLine}>{branding.headerSubtitle}</p>
              <p style={styles.headerLine}>{branding.headerAddress}</p>
            </div>
            <img src={rightLogoSrc} alt="" style={styles.logo} />
          </div>

          {renderSummaryBand()}

          <div style={styles.tableHeadingRow}>
            <h3 style={styles.resultHeading}>Students Results</h3>
            <div style={styles.tableHeadingMeta}>
              Showing {model.students.length} of {model.students.length} students
            </div>
          </div>
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
