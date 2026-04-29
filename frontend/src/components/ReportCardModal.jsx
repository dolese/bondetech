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
  const previewWidth = useMemo(() => REPORT_CARD_PREVIEW_WIDTH, []);

  useEffect(() => {
    if (!autoExport || !student) return;
    const name = (student?.name || "student").replace(/[^a-z0-9-_ ]/gi, "");
    const date = new Date().toISOString().slice(0, 10);
    const raf = requestAnimationFrame(() => {
      exportElementToPdf(
        cardRef.current,
        `${name}-report-${date}.pdf`,
        REPORT_CARD_ORIENTATION,
        REPORT_CARD_PAPER_SIZE
      );
      if (onClose) setTimeout(onClose, 0);
    });
    return () => cancelAnimationFrame(raf);
  }, [autoExport, onClose, student, template]);

  if (!student) return null;

  const overlayStyle = silent
    ? { position: "fixed", inset: 0, background: "transparent", pointerEvents: "none", zIndex: 1000 }
    : { position: "fixed", inset: 0, background: "rgba(0,51,102,0.58)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 };
  const shellStyle = silent
    ? { position: "fixed", left: "-9999px", top: 0, background: "#fff" }
    : {
        background: "#f6f8fc",
        borderRadius: 16,
        boxShadow: "0 24px 56px rgba(15,42,96,0.28)",
        width: "min(96vw, 1200px)",
        maxHeight: "92vh",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto 1fr",
      };

  const exportCurrent = () => {
    const safeName = (student.name || "student").replace(/[^a-z0-9-_ ]/gi, "");
    const date = new Date().toISOString().slice(0, 10);
    exportElementToPdf(
      cardRef.current,
      `${safeName}-report-${date}.pdf`,
      REPORT_CARD_ORIENTATION,
      REPORT_CARD_PAPER_SIZE
    );
  };

  return (
    <div style={overlayStyle} onClick={silent ? undefined : onClose}>
      <style>{`
        @media print {
          body { margin: 0; }
          .report-card-page {
            margin: 0 auto;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .report-card-ui {
            display: none !important;
          }
        }
      `}</style>
      <div style={shellStyle} onClick={(event) => event.stopPropagation()}>
        {!silent && (
          <div
            className="report-card-ui"
            style={{
              background: "linear-gradient(135deg, #0f2d6e, #2563eb)",
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
              >
                Export PDF
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

        <div
          style={{
            overflow: "auto",
            padding: silent ? 0 : 16,
            background: silent ? "transparent" : "linear-gradient(180deg, #eef3ff 0%, #f8fafc 100%)",
          }}
        >
          <div
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
  );
}
