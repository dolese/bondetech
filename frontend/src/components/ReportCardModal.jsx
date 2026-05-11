import React, { useEffect, useMemo, useRef, useState } from "react";
import { exportElementToPdf } from "../utils/pdfExport";
import { ReportCardPrint } from "./ReportCardPrint";

const TEMPLATE_OPTIONS = [
  { label: "Official", value: "official" },
  { label: "Compact", value: "compact" },
];

const REPORT_CARD_PAPER_SIZE = "a4";
const REPORT_CARD_ORIENTATION = "portrait";
const REPORT_CARD_PREVIEW_WIDTH = 820;

export function ReportCardModal({ student, classData, onClose, autoExport = false, silent = false }) {
  const cardRef = useRef(null);
  const [template, setTemplate] = useState("official");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState("");
  const previewWidth = useMemo(() => REPORT_CARD_PREVIEW_WIDTH, []);

  useEffect(() => {
    if (!autoExport || !student) return;
    const name = (student?.name || "student").replace(/[^a-z0-9-_ ]/gi, "");
    const date = new Date().toISOString().slice(0, 10);
    let cancelled = false;
    const runExport = async () => {
      setExportError("");
      setExportingPdf(true);
      try {
        await exportElementToPdf(
          cardRef.current,
          `${name}-report-${date}.pdf`,
          REPORT_CARD_ORIENTATION,
          REPORT_CARD_PAPER_SIZE,
          0
        );
        if (!cancelled && onClose) setTimeout(onClose, 0);
      } catch (error) {
        console.error("Report card export failed:", error);
        if (!cancelled) {
          setExportError("PDF export failed. Please try again.");
        }
      } finally {
        if (!cancelled) setExportingPdf(false);
      }
    };
    const raf = requestAnimationFrame(() => {
      runExport();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [autoExport, onClose, student, template]);

  if (!student) return null;

  const overlayStyle = silent
    ? { position: "fixed", inset: 0, background: "transparent", pointerEvents: "none", zIndex: 1000 }
    : { position: "fixed", inset: 0, background: "linear-gradient(135deg, rgba(8,47,73,0.54), rgba(15,23,42,0.44))", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 };
  const shellStyle = silent
    ? { position: "fixed", left: "-9999px", top: 0, background: "#fff" }
    : {
        background: "linear-gradient(135deg, rgba(255,255,255,0.78), rgba(242,247,255,0.62))",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.76)",
        boxShadow: "0 24px 56px rgba(15,42,96,0.24), inset 0 1px 0 rgba(255,255,255,0.86)",
        backdropFilter: "blur(20px) saturate(135%)",
        WebkitBackdropFilter: "blur(20px) saturate(135%)",
        width: "min(96vw, 1200px)",
        maxHeight: "92vh",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto 1fr",
      };

  const exportCurrent = async () => {
    const safeName = (student.name || "student").replace(/[^a-z0-9-_ ]/gi, "");
    const date = new Date().toISOString().slice(0, 10);
    setExportError("");
    setExportingPdf(true);
    try {
      await exportElementToPdf(
        cardRef.current,
        `${safeName}-report-${date}.pdf`,
        REPORT_CARD_ORIENTATION,
        REPORT_CARD_PAPER_SIZE,
        0
      );
    } catch (error) {
      console.error("Report card export failed:", error);
      setExportError("PDF export failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={silent ? undefined : onClose}>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            display: flex !important;
            justify-content: center !important;
          }
          .report-card-print-overlay,
          .report-card-print-shell,
          .report-card-print-scroll,
          .report-card-print-preview {
            position: static !important;
            inset: auto !important;
            width: auto !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .report-card-page {
            width: 194mm !important;
            min-height: 281mm !important;
            height: 281mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .report-card-page > div {
            width: 194mm !important;
            min-height: 281mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .report-card-ui {
            display: none !important;
          }
        }
      `}</style>
      <div className="report-card-print-overlay" style={overlayStyle} onClick={silent ? undefined : onClose}>
      <div className="report-card-print-shell" style={shellStyle} onClick={(event) => event.stopPropagation()}>
        {!silent && (
          <div
            className="report-card-ui"
            style={{
              background: "linear-gradient(135deg, rgba(15,45,110,0.92), rgba(37,99,235,0.86))",
              color: "#fff",
              padding: "14px 18px",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase", opacity: 0.76 }}>
                Printable Template
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>Student Report Card</div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 700 }}>
                Template
                <select value={template} onChange={(event) => setTemplate(event.target.value)} style={{ minWidth: 120, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.28)" }}>
                  {TEMPLATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 700 }}>
                <span>Paper</span>
                <div style={{ minWidth: 92, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.12)" }}>
                  A4 Portrait
                </div>
              </div>
              <button
                onClick={exportCurrent}
                style={{
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  alignSelf: "end",
                }}
                disabled={exportingPdf}
              >
                {exportingPdf ? "Preparing PDF..." : "Download PDF"}
              </button>
              <button
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 26,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: "0 6px",
                  alignSelf: "end",
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}
        {!silent && exportError && (
          <div
            style={{
              margin: "10px 16px 0",
              border: "1px solid #f5c2c2",
              background: "#fff1f1",
              color: "#8b2500",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {exportError}
          </div>
        )}

        <div
          className="report-card-print-scroll"
          style={{
            overflow: "auto",
            padding: silent ? 0 : 16,
            background: silent ? "transparent" : "linear-gradient(180deg, rgba(231,239,255,0.5) 0%, rgba(248,250,252,0.3) 100%)",
          }}
        >
          <div
            className="report-card-print-preview"
            style={{
              width: silent ? "auto" : `min(100%, ${previewWidth}px)`,
              margin: "0 auto",
              transition: "width 0.2s ease",
            }}
          >
            <div ref={cardRef} className="report-card-page">
              <ReportCardPrint
                student={student}
                classData={classData}
                template={template}
                paperSize={REPORT_CARD_PAPER_SIZE}
                orientation={REPORT_CARD_ORIENTATION}
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
