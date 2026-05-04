import React, { useRef, useState } from "react";
import { GRADE_COLORS, DIVISION_COLORS, DEFAULT_SCHOOL, getCompositeEntry } from "../utils/constants";
import { exportElementToPdf, exportElementToPdfBlob } from "../utils/pdfExport";
import { useViewport } from "../utils/useViewport";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { createRoot } from "react-dom/client";
import { ReportCardPrint } from "./ReportCardPrint";

const RESULT_SHEET_PAPER_SIZE = "a3";
const RESULT_SHEET_ORIENTATION = "landscape";
const RESULT_SHEET_PREVIEW_WIDTH = "420mm";
const RESULT_SHEET_PREVIEW_HEIGHT = "297mm";
const RESULT_SHEET_MARGIN_H = "20mm";
const RESULT_SHEET_HEADER_HEIGHT = "25mm";
const RESULT_SHEET_FOOTER_HEIGHT = "20mm";
const REPORT_CARD_PAPER_SIZE = "a4";
const REPORT_CARD_ORIENTATION = "portrait";

// Page-chunking layout constants (CSS pixels at 96 dpi, conservative estimates)
// Content area height = 297mm - 25mm header - 20mm footer = 252mm ≈ 952px
const CONTENT_HEIGHT_PX = Math.round(252 * (96 / 25.4));
const SUMMARY_BOXES_HEIGHT = 95;  // 5-box summary grid incl. marginBottom
const GRADE_TABLES_HEIGHT = 180;  // grade + division distribution tables incl. marginTop
const THEAD_HEIGHT = 26;          // column-header <thead> row
const ROW_HEIGHT = 23;            // each student data row
const ROWS_ONLY_PAGE = Math.max(1,
  Math.floor((CONTENT_HEIGHT_PX - SUMMARY_BOXES_HEIGHT - GRADE_TABLES_HEIGHT - THEAD_HEIGHT) / ROW_HEIGHT));
const ROWS_FIRST_PAGE = Math.max(1,
  Math.floor((CONTENT_HEIGHT_PX - SUMMARY_BOXES_HEIGHT - THEAD_HEIGHT) / ROW_HEIGHT));
const ROWS_LAST_PAGE = Math.max(1,
  Math.floor((CONTENT_HEIGHT_PX - GRADE_TABLES_HEIGHT - THEAD_HEIGHT) / ROW_HEIGHT));
const ROWS_MID_PAGE = Math.max(1,
  Math.floor((CONTENT_HEIGHT_PX - THEAD_HEIGHT) / ROW_HEIGHT));

/**
 * Split a sorted student array into page-sized chunks.
 * - Chunk 0 (first page) reserves space for the summary boxes.
 * - Last chunk reserves space for grade/division tables + signature footer.
 * - When all students fit on a single page both reservations apply (ROWS_ONLY_PAGE).
 * - If students.length falls in (ROWS_ONLY_PAGE, ROWS_FIRST_PAGE], a second empty
 *   chunk is appended so grade tables have their own dedicated last page.
 */
function buildPageChunks(students) {
  if (students.length === 0) return [];
  if (students.length <= ROWS_ONLY_PAGE) return [students];

  const chunks = [];
  let offset = 0;
  let isFirstChunk = true;

  while (offset < students.length) {
    const remaining = students.length - offset;
    const lastCap = isFirstChunk ? ROWS_ONLY_PAGE : ROWS_LAST_PAGE;
    const fullCap = isFirstChunk ? ROWS_FIRST_PAGE : ROWS_MID_PAGE;

    if (remaining <= lastCap) {
      chunks.push(students.slice(offset));
      break;
    }
    chunks.push(students.slice(offset, offset + Math.min(fullCap, remaining)));
    offset += Math.min(fullCap, remaining);
    isFirstChunk = false;
  }

  // Edge case: all students fit on page 1 (no grade-table room) → add empty stats page
  if (chunks.length === 1 && students.length > ROWS_ONLY_PAGE) {
    chunks.push([]);
  }

  return chunks;
}

export function ResultSheet({ classData, computed, onOpenReportCard }) {
  const subjects = classData.subjects ?? [];
  const present = (computed ?? [])
    .filter(s => s.total !== null)
    .sort((a, b) => (a.posn ?? Infinity) - (b.posn ?? Infinity));
  const sheetRef = useRef(null); // wraps ALL page divs for PDF export
  const { isMobile } = useViewport();
  const [exportingZip, setExportingZip] = useState(false);

  // Composite mode: detect from classData's exam setting
  const compositeEntry = getCompositeEntry(
    classData.school_info?.exam,
    classData.composite_config ?? {}
  );

  // Split students into per-page chunks
  const pages = buildPageChunks(present);

  const divisionCount = {};
  present.forEach(s => {
    if (s.div) {
      divisionCount[s.div] = (divisionCount[s.div] || 0) + 1;
    }
  });

  const gradeCount = {};
  const allGrades = ["A", "B", "C", "D", "F"];
  allGrades.forEach(g => {
    gradeCount[g] = present.filter(s => s.agrd === g).length;
  });

  const schoolInfo = classData.school_info ?? DEFAULT_SCHOOL;
  const complete = present.filter(s => s.div);
  const passCount = complete.filter(s => s.div !== "0").length;
  const passRate =
    complete.length > 0
      ? Math.round((passCount / complete.length) * 100)
      : 0;

  const exportZip = async () => {
    if (exportingZip) return;
    setExportingZip(true);
    try {
      const zip = new JSZip();
      const safeClass = (classData.name || "class").replace(/[^a-z0-9-_ ]/gi, "").trim() || "class";

      const summaryBlob = await exportElementToPdfBlob(sheetRef.current, {
        format: RESULT_SHEET_PAPER_SIZE,
        orientation: RESULT_SHEET_ORIENTATION,
        margin: 0,
      });
      if (summaryBlob) {
        zip.file(`${safeClass}-summary.pdf`, summaryBlob);
      }

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "210mm";
      container.style.background = "#fff";
      document.body.appendChild(container);
      const root = createRoot(container);

      for (const student of computed ?? []) {
        const safeName = (student.name || "student").replace(/[^a-z0-9-_ ]/gi, "").trim() || "student";
        root.render(
          <ReportCardPrint
            student={student}
            classData={classData}
            paperSize={REPORT_CARD_PAPER_SIZE}
            orientation={REPORT_CARD_ORIENTATION}
          />
        );
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const blob = await exportElementToPdfBlob(container.firstChild, {
          format: REPORT_CARD_PAPER_SIZE,
          orientation: REPORT_CARD_ORIENTATION,
          margin: 0,
        });
        if (blob) {
          zip.file(`${safeName}-report.pdf`, blob);
        }
      }

      root.unmount();
      document.body.removeChild(container);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${safeClass}-reports.zip`);
    } finally {
      setExportingZip(false);
    }
  };

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      overflowX: "auto",
      padding: isMobile ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 0,
      minWidth: 0,
    },
    sheet: {
      background: "#fff",
      paddingLeft: RESULT_SHEET_MARGIN_H,
      paddingRight: RESULT_SHEET_MARGIN_H,
      borderRadius: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      border: "1px solid #d6e0f5",
      pageBreakAfter: "always",
      width: RESULT_SHEET_PREVIEW_WIDTH,
      height: RESULT_SHEET_PREVIEW_HEIGHT,
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
      paddingBottom: 6,
      height: RESULT_SHEET_HEADER_HEIGHT,
      flexShrink: 0,
      boxSizing: "border-box",
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
    },
    gradeTable: {
      marginTop: 16,
    },
    signatureSec: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
      gap: isMobile ? 16 : 40,
      height: RESULT_SHEET_FOOTER_HEIGHT,
      flexShrink: 0,
      boxSizing: "border-box",
      alignItems: "end",
      marginTop: 0,
      borderTop: "1px solid #ccc",
      paddingTop: 6,
    },
    signBox: {
      paddingTop: 4,
      textAlign: "center",
      fontSize: 9,
      color: "#555",
    },
    tabs: {
      display: "flex",
      gap: 6,
      marginBottom: 10,
      flexWrap: "wrap",
    },
    tabBtn: {
      padding: "6px 12px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: isMobile ? 11 : 12,
      height: 30,
      width: isMobile ? "100%" : "auto",
    },
  };

  const hasRemarks = present.some(s => s.remarks && s.remarks.trim());

  // Reusable page header (logo + school info)
  const PageHeader = () => (
    <div style={styles.header}>
      <img src="/asset/Tz.jpg" alt="Tanzania logo" style={styles.logo} />
      <div style={styles.headerCenter}>
        <h1 style={styles.schoolName}>{schoolInfo.name || "School Name"}</h1>
        <p style={styles.className}>Class: <strong>{classData.name}</strong></p>
        <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>
          {schoolInfo.form} · {schoolInfo.term} · {schoolInfo.exam ?? schoolInfo.term} · {schoolInfo.year}
        </p>
        {compositeEntry && (
          <p style={{ fontSize: 9, color: "#7a5800", margin: "3px 0 0", fontWeight: 700 }}>
            🔗 Combined Result: ({compositeEntry.partnerExam} + {schoolInfo.exam ?? schoolInfo.term}) ÷ 2
          </p>
        )}
        <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>
          {new Date().toLocaleDateString()}
        </p>
      </div>
      <img src="/asset/bonde.jpg" alt="Bonde logo" style={styles.logo} />
    </div>
  );

  // Column header cells for the student table
  const columnHeaders = [
    "Pos", "CNO", "Name", "Sex",
    ...subjects,
    "Total", "Avg", "Grade", "Division", "Points",
    ...(hasRemarks ? ["Remarks"] : []),
  ];

  // Grade/Division summary tables (shown on last page)
  const GradeDivTables = () => (
    <div
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
        <div style={{ overflowX: "auto", minWidth: 0 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Grade</th>
                <th style={styles.th}>Count</th>
              </tr>
            </thead>
            <tbody>
              {allGrades.map((g, i) => (
                <tr key={g} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...styles.td, fontWeight: 800, color: GRADE_COLORS[g] }}>{g}</td>
                  <td style={styles.td}>{gradeCount[g] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "#003366" }}>
          Division Distribution
        </h3>
        <div style={{ overflowX: "auto", minWidth: 0 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Division</th>
                <th style={styles.th}>Count</th>
              </tr>
            </thead>
            <tbody>
              {["I", "II", "III", "IV", "0"].map((d, i) => (
                <tr key={d} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...styles.td, fontWeight: 800, color: DIVISION_COLORS[d] }}>Div {d}</td>
                  <td style={styles.td}>{divisionCount[d] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Signature footer (shown on last page)
  const SignatureFooter = () => (
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
  );

  return (
    <div style={styles.panel}>
      <style>{`
        @media print {
          @page {
            size: A3 landscape;
            margin: 0;
          }
          body { margin: 0; }
          .result-sheet-page {
            width: 420mm;
            min-height: 297mm;
            margin: 0 auto;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .result-sheet-ui { display: none !important; }
        }
      `}</style>
      <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 900, color: "#003366" }}>
        📄 Result Sheet
      </h2>
      <div style={{ fontSize: 11, color: "#667", marginTop: -6, marginBottom: 8 }}>
        Export a clean class summary for printing or sharing.
      </div>

      <div style={styles.tabs} className="result-sheet-ui">
        <button
          onClick={() => window.print()}
          style={{ ...styles.tabBtn, background: "#003366", color: "#fff" }}
        >
          🖨 Print Sheet
        </button>
        <button
          onClick={() => {
            const date = new Date().toISOString().slice(0, 10);
            const name = `${classData.name || "class"}-results-${date}.pdf`;
            exportElementToPdf(sheetRef.current, name, RESULT_SHEET_ORIENTATION, RESULT_SHEET_PAPER_SIZE, 0);
          }}
          style={{ ...styles.tabBtn, background: "#8b2500", color: "#fff" }}
        >
          📥 Export PDF
        </button>
        <button
          onClick={exportZip}
          disabled={exportingZip}
          style={{
            ...styles.tabBtn,
            background: exportingZip ? "#999" : "#0b6b3a",
            color: "#fff",
            cursor: exportingZip ? "not-allowed" : "pointer",
          }}
        >
          {exportingZip ? "Preparing..." : "📦 Export ZIP"}
        </button>
      </div>

      {/* sheetRef wraps ALL page divs so PDF export captures every page */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div ref={sheetRef}>
          {pages.length === 0 ? (
            /* Empty state — single page, no student rows */
            <div style={styles.sheet} className="result-sheet-page">
              <PageHeader />
              <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    background: "#f7f9ff",
                    border: "1px dashed #c8d8f8",
                    borderRadius: 8,
                    padding: 18,
                    textAlign: "center",
                    color: "#666",
                    fontSize: 12,
                  }}
                >
                  No results yet. Enter student scores to generate the result sheet.
                </div>
              </div>
              <SignatureFooter />
            </div>
          ) : (
            pages.map((chunk, pageIdx) => {
              const isFirst = pageIdx === 0;
              const isLast = pageIdx === pages.length - 1;

              return (
                <div key={pageIdx} style={styles.sheet} className="result-sheet-page">
                  <PageHeader />

                  {/* Body — grows to fill space between header and footer */}
                  <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

                    {/* Summary boxes: first page only */}
                    {isFirst && (
                      <div style={styles.resultSummary}>
                        {[
                          ["📚", "Total Students", present.length],
                          ["✅", "Passed", passCount],
                          ["📊", "Pass Rate", `${passRate}%`],
                          ["🏆", "Div I", divisionCount["I"] || 0],
                          [
                            "📈",
                            "Avg Score",
                            present.length
                              ? (present.reduce((s, st) => s + (st.total || 0), 0) / present.length).toFixed(1)
                              : 0,
                          ],
                        ].map(([icon, label, val], i) => (
                          <div key={i} style={styles.summaryBox}>
                            <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
                            <div style={styles.summaryValue}>{val}</div>
                            <div style={styles.summaryLabel}>{label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Student rows table (omitted when chunk is an empty stats page) */}
                    {chunk.length > 0 && (
                      <div style={{ overflowX: "auto", minWidth: 0 }}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              {columnHeaders.map(h => (
                                <th key={h} style={styles.th}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {chunk.map((s) => (
                              <tr key={s.id}>
                                <td style={{ ...styles.td, fontWeight: 800 }}>{s.posn ?? "–"}</td>
                                <td style={styles.td}>{s.index_no}</td>
                                <td style={{ ...styles.td, textAlign: "left" }}>{s.name}</td>
                                <td style={styles.td}>{s.sex}</td>
                                {subjects.map((_, i) => {
                                  const g = s.grades?.[i];
                                  const display = g?.raw === "ABS" ? "ABS" : (g?.score ?? "–");
                                  return <td key={i} style={styles.td}>{display}</td>;
                                })}
                                <td style={styles.td}>{s.total ?? "–"}</td>
                                <td style={styles.td}>{s.avg ?? "–"}</td>
                                <td style={{ ...styles.td, color: GRADE_COLORS[s.agrd] }}>{s.agrd ?? "–"}</td>
                                <td style={{ ...styles.td, color: DIVISION_COLORS[s.div] }}>{s.div ?? "–"}</td>
                                <td style={styles.td}>{s.points ?? "–"}</td>
                                {hasRemarks && (
                                  <td style={{ ...styles.td, textAlign: "left", maxWidth: 120, whiteSpace: "normal" }}>
                                    {s.remarks ? s.remarks.trim() : ""}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Grade/Division distribution tables: last page only */}
                    {isLast && <GradeDivTables />}

                  </div>

                  {/* Signature footer: last page only */}
                  {isLast && <SignatureFooter />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Button to open individual report cards */}
      {false && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => present.length > 0 && onOpenReportCard(present[0].id)}
            style={{
              padding: "8px 16px",
              background: "#0077aa",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            📋 View Individual Report Cards
          </button>
        </div>
      )}
    </div>
  );
}