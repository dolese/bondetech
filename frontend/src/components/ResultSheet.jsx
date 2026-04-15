import React, { useRef, useState } from "react";
import { GRADE_COLORS, DIVISION_COLORS, DEFAULT_SCHOOL } from "../utils/constants";
import { exportElementToPdf, exportElementToPdfBlob } from "../utils/pdfExport";
import { useViewport } from "../utils/useViewport";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { createRoot } from "react-dom/client";
import { ReportCardPrint } from "./ReportCardPrint";

export function ResultSheet({ classData, computed, onOpenReportCard }) {
  const subjects = classData.subjects ?? [];
  const present = (computed ?? [])
    .filter(s => s.total !== null)
    .sort((a, b) => (a.posn ?? Infinity) - (b.posn ?? Infinity));
  const sheetRef = useRef(null);
  const { isMobile } = useViewport();
  const [exportingZip, setExportingZip] = useState(false);

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

      const summaryBlob = await exportElementToPdfBlob(sheetRef.current);
      if (summaryBlob) {
        zip.file(`${safeClass}-summary.pdf`, summaryBlob);
      }

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px";
      document.body.appendChild(container);
      const root = createRoot(container);

      for (const student of computed ?? []) {
        const safeName = (student.name || "student").replace(/[^a-z0-9-_ ]/gi, "").trim() || "student";
        root.render(<ReportCardPrint student={student} classData={classData} />);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const blob = await exportElementToPdfBlob(container);
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
      overflowX: "hidden",
      padding: isMobile ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 0,
      minWidth: 0,
    },
    sheet: {
      background: "#fff",
      padding: isMobile ? 12 : 18,
      borderRadius: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      border: "1px solid #d6e0f5",
      pageBreakAfter: "always",
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
    },
    gradeTable: {
      marginTop: 16,
    },
    signatureSec: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
      gap: isMobile ? 16 : 40,
      marginTop: 30,
    },
    signBox: {
      height: 80,
      borderTop: "1px solid #333",
      paddingTop: 6,
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

  return (
    <div style={styles.panel}>
      <style>{`
        @media print {
          body { margin: 0; }
          .result-sheet-page {
            width: 210mm;
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
          style={{
            ...styles.tabBtn,
            background: "#003366",
            color: "#fff",
          }}
        >
          🖨 Print Sheet
        </button>
        <button
          onClick={() => {
            const date = new Date().toISOString().slice(0, 10);
            const name = `${classData.name || "class"}-results-${date}.pdf`;
            exportElementToPdf(sheetRef.current, name, "landscape");
          }}
          style={{
            ...styles.tabBtn,
            background: "#8b2500",
            color: "#fff",
          }}
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

      <div ref={sheetRef} style={styles.sheet} className="result-sheet-page">
        <div style={styles.header}>
          <img src="/asset/Tz.jpg" alt="Tanzania logo" style={styles.logo} />
          <div style={styles.headerCenter}>
            <h1 style={styles.schoolName}>{schoolInfo.name || "School Name"}</h1>
            <p style={styles.className}>Class: <strong>{classData.name}</strong></p>
            <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>
              {schoolInfo.form} · {schoolInfo.term} · {schoolInfo.exam ?? schoolInfo.term} · {schoolInfo.year}
            </p>
            <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <img src="/asset/bonde.jpg" alt="Bonde logo" style={styles.logo} />
        </div>

        {!present.length ? (
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
        ) : (
          <>
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
                    ? (
                        present.reduce((s, st) => s + (st.total || 0), 0) /
                        present.length
                      ).toFixed(1)
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

            <div style={{ overflowX: "auto", minWidth: 0 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      "Pos",
                      "CNO",
                      "Name",
                      "Stream",
                      "Sex",
                      ...subjects,
                      "Total",
                      "Avg",
                      "Grade",
                      "Division",
                      "Points",
                    ].map(h => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {present.map((s) => (
                    <tr key={s.id}>
                      <td style={{ ...styles.td, fontWeight: 800 }}>{s.posn ?? "–"}</td>
                      <td style={styles.td}>{s.index_no}</td>
                      <td style={{ ...styles.td, textAlign: "left" }}>{s.name}</td>
                      <td style={{ ...styles.td, textAlign: "left" }}>{s.stream ?? "–"}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Grade and Division Summary Tables */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 16,
            marginTop: 16,
          }}
        >
          {/* Grade Distribution */}
          <div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 11,
                fontWeight: 800,
                color: "#003366",
              }}
            >
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
                      <td
                        style={{
                          ...styles.td,
                          fontWeight: 800,
                          color: GRADE_COLORS[g],
                        }}
                      >
                        {g}
                      </td>
                      <td style={styles.td}>{gradeCount[g] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Division Distribution */}
          <div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 11,
                fontWeight: 800,
                color: "#003366",
              }}
            >
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
                      <td
                        style={{
                          ...styles.td,
                          fontWeight: 800,
                          color: DIVISION_COLORS[d],
                        }}
                      >
                        Div {d}
                      </td>
                      <td style={styles.td}>{divisionCount[d] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Signature Section */}
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
