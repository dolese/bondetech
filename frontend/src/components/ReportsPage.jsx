import React, { useRef, useState } from "react";
import { DIVISION_COLORS, DEFAULT_SCHOOL } from "../utils/constants";
import { exportElementToPdfBlob } from "../utils/pdfExport";
import { useViewport } from "../utils/useViewport";
import { useTheme } from "../utils/ThemeContext";
import { themeColors } from "../utils/themeColors";
import { ReportCardPrint } from "./ReportCardPrint";
import { createRoot } from "react-dom/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export function ReportsPage({ classData, computed, onOpenReportCard }) {
  const { isMobile } = useViewport();
  const { dark } = useTheme();
  const t = themeColors(dark);
  const [exportingZip, setExportingZip] = useState(false);

  const schoolInfo = classData.school_info ?? DEFAULT_SCHOOL;
  const present = (computed ?? [])
    .filter((s) => s.total !== null)
    .sort((a, b) => (a.posn ?? Infinity) - (b.posn ?? Infinity));

  const exportAllZip = async () => {
    if (exportingZip) return;
    setExportingZip(true);
    try {
      const zip = new JSZip();
      const safeClass = (classData.name || "class")
        .replace(/[^a-z0-9-_ ]/gi, "")
        .trim() || "class";

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px";
      document.body.appendChild(container);
      const root = createRoot(container);

      for (const student of computed ?? []) {
        await new Promise((resolve) => {
          root.render(
            <ReportCardPrint
              student={student}
              classData={classData}
              onReady={async () => {
                const el = container.firstChild;
                if (el) {
                  const blob = await exportElementToPdfBlob(el);
                  if (blob) {
                    const safeName = (student.name || "student")
                      .replace(/[^a-z0-9-_ ]/gi, "")
                      .trim() || "student";
                    zip.file(`${safeClass}-${safeName}.pdf`, blob);
                  }
                }
                resolve();
              }}
            />
          );
        });
      }

      root.unmount();
      document.body.removeChild(container);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${safeClass}-report-cards.zip`);
    } finally {
      setExportingZip(false);
    }
  };

  const divLabel = (div) => {
    if (!div) return "";
    if (div === "0") return "Div 0";
    return `Div ${div}`;
  };

  const getRankDisplay = (idx, posn) => {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return `#${posn ?? idx + 1}`;
  };

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 0,
      background: t.bgPage,
    },
    headerRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
    },
    exportBtn: {
      padding: "8px 16px",
      background: exportingZip ? "#999" : t.tableHeader,
      color: "#fff",
      border: "none",
      borderRadius: 7,
      cursor: exportingZip ? "not-allowed" : "pointer",
      fontWeight: 700,
      fontSize: 12,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      background: t.bgCard,
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 1px 6px rgba(0,51,102,0.07)",
      fontSize: isMobile ? 11 : 12,
    },
    th: {
      background: t.tableHeader,
      color: "#fff",
      padding: "8px 10px",
      textAlign: "left",
      fontWeight: 700,
      fontSize: 11,
      whiteSpace: "nowrap",
    },
    td: {
      padding: "7px 10px",
      borderBottom: `1px solid ${t.borderLight}`,
      verticalAlign: "middle",
      color: t.text,
    },
    viewBtn: {
      padding: "4px 10px",
      background: t.tableHeader,
      color: "#fff",
      border: "none",
      borderRadius: 5,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 11,
    },
    divBadge: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      color: "#fff",
    },
    empty: {
      background: t.bgCard,
      border: `1px dashed ${t.borderDash}`,
      borderRadius: 8,
      padding: 24,
      textAlign: "center",
      color: t.textMuted,
      fontSize: 12,
    },
  };

  return (
    <div style={styles.panel}>
      <div style={styles.headerRow}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: t.header }}>
            📄 Report Cards
          </h3>
          <div style={{ fontSize: 11, color: t.textMuted }}>
            {schoolInfo.name} — {classData.form || ""} {classData.year || ""}
          </div>
        </div>
        <button
          style={styles.exportBtn}
          onClick={exportAllZip}
          disabled={exportingZip || !present.length}
          title="Export all report cards as a ZIP of PDFs"
        >
          {exportingZip ? "Exporting…" : "⬇ Export All (ZIP)"}
        </button>
      </div>

      {!present.length ? (
        <div style={styles.empty}>
          No scored students yet. Enter student scores to generate report cards.
        </div>
      ) : isMobile ? (
        /* Mobile card list */
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {present.map((s, idx) => (
            <div key={s.id} style={{
              background: t.bgCard,
              borderRadius: 8,
              padding: "10px 12px",
              boxShadow: "0 1px 6px rgba(0,51,102,0.07)",
              border: `1px solid ${t.borderLight}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: idx < 3 ? "#b8860b" : t.textMuted, minWidth: 20 }}>
                    {getRankDisplay(idx, s.posn)}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: t.header }}>{s.name}</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>{s.sex === "F" ? "F" : "M"}</span>
                </div>
                <button style={styles.viewBtn} onClick={() => onOpenReportCard(s.id)}>View</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", fontSize: 11 }}>
                <span style={{ fontFamily: "monospace", color: t.textMid }}>CNO: {s.index_no ?? s.indexNo ?? "—"}</span>
                <span style={{ color: t.text }}>Total: <b>{s.total ?? "—"}</b></span>
                <span style={{ color: t.text }}>Avg: <b>{s.avg ?? "—"}</b></span>
                {s.div && (
                  <span style={{ ...styles.divBadge, background: DIVISION_COLORS[s.div] ?? "#999", fontSize: 10, padding: "1px 8px" }}>
                    {divLabel(s.div)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>CNO</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Sex</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Avg</th>
                <th style={styles.th}>Division</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Report Card</th>
              </tr>
            </thead>
            <tbody>
              {present.map((s, idx) => (
                <tr key={s.id} style={{ background: idx % 2 === 0 ? t.rowEven : t.rowOdd }}>
                  <td style={{ ...styles.td, color: t.textMuted, fontSize: 10 }}>
                    {s.posn ?? idx + 1}
                  </td>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 11 }}>
                    {s.index_no ?? s.indexNo ?? ""}
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{s.name}</td>
                  <td style={styles.td}>{s.sex === "F" ? "F" : "M"}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{s.total ?? "—"}</td>
                  <td style={styles.td}>{s.avg ?? "—"}</td>
                  <td style={styles.td}>
                    {s.div ? (
                      <span
                        style={{
                          ...styles.divBadge,
                          background: DIVISION_COLORS[s.div] ?? "#999",
                        }}
                      >
                        {divLabel(s.div)}
                      </span>
                    ) : (
                      <span style={{ color: t.textMuted, fontSize: 10 }}>—</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button
                      style={styles.viewBtn}
                      onClick={() => onOpenReportCard(s.id)}
                      title="View report card"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          fontSize: 10,
          color: t.textMuted,
          textAlign: "center",
          paddingTop: 4,
        }}
      >
        {present.length} student{present.length !== 1 ? "s" : ""} with scores •{" "}
        For the full result sheet, go to{" "}
        <strong>Results → Sheet</strong>.
      </div>
    </div>
  );
}
