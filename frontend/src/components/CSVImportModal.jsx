import React, { useState } from "react";
import Papa from "papaparse";
import { validateStudent } from "../utils/validation";
import { useViewport } from "../utils/useViewport";

export function CSVImportModal({ classId, subjects = [], onImport, onClose }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const { isMobile } = useViewport();
  const CNO_PREFIX = "S6509";

  const csvEscape = (value) => {
    const raw = String(value ?? "");
    if (raw.includes("\"") || raw.includes(",") || raw.includes("\n")) {
      return `"${raw.replace(/\"/g, '""')}"`;
    }
    return raw;
  };

  const downloadTemplate = () => {
    const header = ["cno", "name", "stream", "sex", ...subjects];
    const exampleScores = subjects.map((_, i) => 50 + i * 3);
    const example = [`${CNO_PREFIX}/0001`, "John Doe", "A", "M", ...exampleScores];
    const csv = [header.map(csvEscape).join(","), example.map(csvEscape).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = text => {
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    const lines = (parsed.data ?? []).filter(row => row && row.length);
    if (lines.length === 0) return;

    const normalizedSubjects = subjects.map(s => s.toLowerCase());
    const headerGuess = lines[0].map(p => String(p ?? "").trim().toLowerCase());
    const hasHeader = headerGuess.some(h => h.includes("index") || h.includes("admission") || h.includes("candidate") || h === "cno" || h.includes("name") || h.includes("sex") || h.includes("stream"));

    let scoreCols = Array(subjects.length).fill(null);
    let colMap = { indexNo: 0, name: 1, stream: 2, sex: 3 };
    let startLine = 0;

    if (hasHeader) {
      startLine = 1;
      colMap = { indexNo: null, name: null, stream: null, sex: null };
      headerGuess.forEach((h, idx) => {
        if (h.includes("index") || h.includes("admission") || h.includes("candidate") || h === "cno") colMap.indexNo = idx;
        else if (h === "name" || h.includes("student")) colMap.name = idx;
        else if (h === "stream") colMap.stream = idx;
        else if (h === "sex" || h === "gender") colMap.sex = idx;
        else {
          const subjectIdx = normalizedSubjects.indexOf(h);
          if (subjectIdx >= 0) scoreCols[subjectIdx] = idx;
          const scoreMatch = h.match(/^score\s*(\d+)$/);
          if (scoreMatch) {
            const si = Number(scoreMatch[1]) - 1;
            if (si >= 0 && si < scoreCols.length) scoreCols[si] = idx;
          }
        }
      });
    }

    const parseScore = (raw) => {
      const cleaned = String(raw ?? "").trim();
      if (cleaned === "") return "";
      if (cleaned.toUpperCase() === "ABS") return "ABS";
      const n = Number(cleaned);
      if (Number.isNaN(n)) return "";
      return Math.min(100, Math.max(0, n));
    };

    const rows = lines.slice(startLine).map((parts, idx) => {
      const get = (i, fallback = "") => (i == null ? fallback : (parts[i] ?? fallback));
      const scores = subjects.map((_, si) => {
        const col = hasHeader ? scoreCols[si] : (4 + si);
        const raw = col != null ? (parts[col] ?? "") : "";
        return parseScore(raw);
      });
      return {
        rowNum: idx + 1,
        index_no: String(get(colMap.indexNo, "")),
        name: String(get(colMap.name, "")),
        stream: String(get(colMap.stream, "")),
        sex: String(get(colMap.sex, "M") || "M"),
        status: "present",
        scores,
      };
    });

    const maxCno = rows.reduce((max, row) => {
      const match = String(row.index_no ?? "").match(new RegExp(`^${CNO_PREFIX}\\/(\\d+)$`));
      if (!match) return max;
      const n = Number(match[1]);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    let next = maxCno + 1;
    const withPreview = rows.map((row) => {
      if (row.index_no && row.index_no.trim()) {
        return { ...row, previewCno: row.index_no.trim() };
      }
      const previewCno = `${CNO_PREFIX}/${String(next).padStart(4, "0")}`;
      next += 1;
      return { ...row, previewCno };
    });

    const validationErrors = [];
    withPreview.forEach((row, i) => {
      const validation = validateStudent(row);
      if (!validation.valid) {
        validationErrors.push({
          row: row.rowNum,
          errors: validation.errors,
        });
      }
    });

    setPreview(withPreview);
    setErrors(validationErrors);
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      alert("Please fix the errors before importing");
      return;
    }
    setImporting(true);
    await onImport(preview);
    setImporting(false);
    setCsvText("");
    setPreview([]);
    setErrors([]);
    onClose();
  };

  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,51,102,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      background: "#fff",
      borderRadius: 10,
      boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
      width: "90%",
      maxWidth: 700,
      maxHeight: "90vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      background: "#0077aa",
      color: "#fff",
      padding: 16,
      borderRadius: "10px 10px 0 0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    closeBtn: {
      background: "transparent",
      border: "none",
      color: "#fff",
      fontSize: 24,
      cursor: "pointer",
    },
    content: {
      flex: 1,
      padding: isMobile ? 12 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      overflowY: "auto",
    },
    section: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    label: {
      fontSize: 11,
      fontWeight: 800,
      color: "#003366",
      textTransform: "uppercase",
    },
    textarea: {
      width: "100%",
      minHeight: 120,
      padding: "10px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      fontFamily: "monospace",
      fontSize: 11,
      resize: "vertical",
    },
    helpText: {
      fontSize: 10,
      color: "#666",
      background: "#f4f7ff",
      padding: 8,
      borderRadius: 6,
      borderLeft: "3px solid #0077aa",
    },
    previewTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 10,
    },
    th: {
      padding: "5px",
      background: "#003366",
      color: "#fff",
      border: "1px solid #003366",
      fontWeight: 700,
      textAlign: "center",
    },
    td: {
      padding: "4px",
      border: "1px solid #cbd8f3",
      textAlign: "center",
    },
    errorBox: {
      background: "#ffe8e8",
      border: "1px solid #ff6b6b",
      borderRadius: 6,
      padding: 10,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    errorItem: {
      fontSize: 10,
      color: "#8b2500",
    },
    footer: {
      padding: 16,
      borderTop: "1px solid #e0e8ff",
      display: "flex",
      gap: 8,
      justifyContent: "flex-end",
      flexWrap: "wrap",
    },
    btn: {
      padding: "8px 16px",
      borderRadius: 6,
      border: "none",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 12,
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
            📤 Import Students (CSV)
          </h2>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.content}>
          {/* CSV Input Section */}
          <div style={styles.section}>
            <label style={styles.label}>Paste CSV</label>
            <textarea
              value={csvText}
              onChange={e => {
                setCsvText(e.target.value);
                if (e.target.value.trim()) {
                  parseCSV(e.target.value);
                } else {
                  setPreview([]);
                  setErrors([]);
                }
              }}
              placeholder={`cno,name,stream,sex,${subjects.slice(0, 3).join(",")}`}
              style={styles.textarea}
            />
            <div style={styles.helpText}>
              📋 Format: <strong>cno,name,stream,sex,subjects...</strong> (one student per line)
              <br />
              Sex: M or F | Scores: 0-100 or ABS
              <br />
              Header row supported. Subject names must match this class.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={downloadTemplate}
                style={{
                  padding: "6px 10px",
                  background: "#003366",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 11,
                }}
              >
                ⬇ Download CSV Template
              </button>
              <label
                style={{
                  padding: "6px 10px",
                  background: "#0077aa",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 11,
                }}
              >
                ⬆ Upload CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const text = String(reader.result ?? "");
                      setCsvText(text);
                      if (text.trim()) {
                        parseCSV(text);
                      } else {
                        setPreview([]);
                        setErrors([]);
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Errors Section */}
          {errors.length > 0 && (
            <div style={styles.errorBox}>
              <div style={{ fontWeight: 800, color: "#8b2500" }}>
                ⚠ {errors.length} Error{errors.length !== 1 ? "s" : ""}
              </div>
              {errors.slice(0, 6).map((err, i) => (
                <div key={i} style={styles.errorItem}>
                  <strong>Row {err.row}:</strong>{" "}
                  {Object.entries(err.errors)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join(", ")}
                </div>
              ))}
              {errors.length > 6 && (
                <div style={styles.errorItem}>...and {errors.length - 6} more</div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {preview.length > 0 && (
            <div style={styles.section}>
              <label style={styles.label}>
                Preview ({preview.length} student{preview.length !== 1 ? "s" : ""})
              </label>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.previewTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>CNO</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Stream</th>
                      <th style={styles.th}>Sex</th>
                      <th style={styles.th}>Scores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => {
                      const hasError = errors.some(e => e.row === row.rowNum);
                      return (
                        <tr
                          key={i}
                          style={{
                            background: hasError ? "#ffe8e8" : i % 2 === 0 ? "#fff" : "#f8fafc",
                          }}
                        >
                          <td style={styles.td}>{row.previewCno || row.index_no || "(auto)"}</td>
                          <td style={{ ...styles.td, textAlign: "left" }}>
                            {row.name}
                          </td>
                          <td style={{ ...styles.td, textAlign: "left" }}>
                            {row.stream || "–"}
                          </td>
                          <td style={styles.td}>{row.sex}</td>
                          <td style={styles.td}>{row.scores?.slice(0, 3).join(", ")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {preview.length > 10 && (
                <div style={{ fontSize: 10, color: "#999", textAlign: "center" }}>
                  ... and {preview.length - 10} more
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            onClick={onClose}
            style={{
              ...styles.btn,
              background: "#888",
              color: "#fff",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={preview.length === 0 || errors.length > 0 || importing}
            style={{
              ...styles.btn,
              background: errors.length > 0 || preview.length === 0 ? "#ccc" : "#0b6b3a",
              color: "#fff",
              cursor: errors.length > 0 || preview.length === 0 ? "not-allowed" : "pointer",
              opacity: errors.length > 0 || preview.length === 0 ? 0.6 : 1,
            }}
          >
            {importing ? "Importing..." : "✓ Import Students"}
          </button>
        </div>
      </div>
    </div>
  );
}
