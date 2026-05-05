import React, { useMemo, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { createRoot } from "react-dom/client";
import { exportElementToPdfBlob } from "../utils/pdfExport";
import { buildResultSheetModel } from "../utils/resultSheetShared";
import { buildResultSheetPdf } from "../utils/resultSheetPdf";
import { useViewport } from "../utils/useViewport";
import { ReportCardPrint } from "./ReportCardPrint";
import { ResultSheetPreview } from "./ResultSheetPreview";
import { ResultSheetPrintDocument } from "./ResultSheetPrintDocument";
import { getCompositeEntry } from "../utils/constants";

const REPORT_CARD_PAPER_SIZE = "a4";
const REPORT_CARD_ORIENTATION = "portrait";

function printResultSheetDocument(model, pageRanges) {
  if (!pageRanges.length) return;

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1280,height=900");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${model.className || "class"} Result Sheet</title>
        <meta charset="utf-8" />
        <style>
          body { margin: 0; background: #fff; }
        </style>
      </head>
      <body>
        <div id="print-root"></div>
      </body>
    </html>
  `);
  printWindow.document.close();

  const rootElement = printWindow.document.getElementById("print-root");
  if (!rootElement) {
    printWindow.close();
    return;
  }

  const root = createRoot(rootElement);
  root.render(<ResultSheetPrintDocument model={model} pageRanges={pageRanges} />);

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => {
      root.unmount();
      printWindow.close();
    }, 300);
  };

  setTimeout(triggerPrint, 250);
}

export function ResultSheet({ classData, computed, onOpenReportCard }) {
  const { isMobile } = useViewport();
  const model = useMemo(() => buildResultSheetModel(classData, computed), [classData, computed]);
  const [exportingZip, setExportingZip] = useState(false);
  const [pageRanges, setPageRanges] = useState([{ start: 0, end: model.students.length }]);

  const compositeEntry = useMemo(
    () => getCompositeEntry(classData.school_info?.exam, classData.composite_config ?? {}),
    [classData.composite_config, classData.school_info?.exam]
  );

  const exportPdf = async () => {
    const date = new Date().toISOString().slice(0, 10);
    const name = `${classData.name || "class"}-results-${date}.pdf`;
    await buildResultSheetPdf(model, { fileName: name });
  };

  const exportZip = async () => {
    if (exportingZip) return;
    setExportingZip(true);
    try {
      const zip = new JSZip();
      const safeClass = (classData.name || "class").replace(/[^a-z0-9-_ ]/gi, "").trim() || "class";

      const summaryBlob = await buildResultSheetPdf(model);
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
    compositeNote: {
      background: "#eef6ff",
      border: "1px solid #bfd6ff",
      color: "#0b4f9e",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 12,
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.panel}>
      <style>{`
        @media print {
          .result-sheet-ui { display: none !important; }
        }
      `}</style>
      <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 900, color: "#003366" }}>
        Result Sheet
      </h2>
      <div style={{ fontSize: 11, color: "#667", marginTop: -6, marginBottom: 8 }}>
        Export a clean class summary for printing or sharing.
      </div>

      {compositeEntry && (
        <div style={styles.compositeNote}>
          Combined Result: ({compositeEntry.partnerExam} + {classData.school_info?.exam ?? classData.school_info?.term ?? "Current Exam"}) ÷ 2
        </div>
      )}

      <div style={styles.tabs} className="result-sheet-ui">
        <button
          onClick={() => printResultSheetDocument(model, pageRanges)}
          style={{ ...styles.tabBtn, background: "#003366", color: "#fff" }}
        >
          Print Sheet
        </button>
        <button
          onClick={exportPdf}
          style={{ ...styles.tabBtn, background: "#8b2500", color: "#fff" }}
        >
          Export PDF
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
          {exportingZip ? "Preparing..." : "Export ZIP"}
        </button>
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        {!model.students.length ? (
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
          <ResultSheetPreview model={model} isMobile={isMobile} onPagesChange={setPageRanges} />
        )}
      </div>

      {false && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => model.students.length > 0 && onOpenReportCard(model.students[0].id)}
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
            View Individual Report Cards
          </button>
        </div>
      )}
    </div>
  );
}
