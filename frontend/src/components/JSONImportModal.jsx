import React, { useState, useRef } from "react";
import { validateStudent } from "../utils/validation";
import { useViewport } from "../utils/useViewport";

export function JSONImportModal({ classId, subjects = [], onImport, onClose }) {
  const [jsonText, setJsonText] = useState("");
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);
  const { isMobile } = useViewport();

  const mapScores = (rawScores, importedSubjects) => {
    if (!importedSubjects || importedSubjects.length === 0) {
      // No subject info — positional mapping
      return subjects.map((_, i) => rawScores[i] ?? "");
    }
    return subjects.map((subj) => {
      const srcIdx = importedSubjects.findIndex(
        (s) => String(s).trim().toLowerCase() === String(subj).trim().toLowerCase()
      );
      if (srcIdx >= 0 && srcIdx < rawScores.length) {
        const v = rawScores[srcIdx];
        return v === null || v === undefined ? "" : v;
      }
      return "";
    });
  };

  const parseJSON = (text) => {
    setErrors([]);
    setPreview([]);
    setParsed(null);

    if (!text.trim()) return;

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      setErrors([{ msg: "Invalid JSON: " + e.message }]);
      return;
    }

    let students;
    let importedSubjects = [];

    if (Array.isArray(data)) {
      students = data;
    } else if (data && Array.isArray(data.students)) {
      students = data.students;
      if (Array.isArray(data.subjects)) {
        importedSubjects = data.subjects;
      }
    } else {
      setErrors([{ msg: "JSON must be an array of students, or an object with a 'students' array." }]);
      return;
    }

    if (students.length === 0) {
      setErrors([{ msg: "No students found in the JSON file." }]);
      return;
    }

    const validRows = [];
    const errs = [];

    students.forEach((s, i) => {
      const rawScores = Array.isArray(s.scores) ? s.scores : [];
      const mapped = {
        indexNo: String(s.indexNo ?? s.index_no ?? "").trim(),
        name: String(s.name ?? "").trim(),
        stream: String(s.stream ?? "").trim(),
        sex: s.sex === "F" ? "F" : "M",
        status: ["present", "absent", "incomplete"].includes(s.status) ? s.status : "present",
        scores: mapScores(rawScores, importedSubjects),
      };
      const validation = validateStudent(mapped);
      if (!validation.valid) {
        errs.push({ row: i + 1, errors: Object.values(validation.errors) });
      } else {
        validRows.push(mapped);
      }
    });

    setParsed({ students: validRows, importedSubjects });
    setPreview(validRows.slice(0, 5));

    if (errs.length > 0) {
      setErrors(errs.slice(0, 5));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setJsonText(text);
      parseJSON(text);
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    parseJSON(jsonText);
  };

  const handleImport = async () => {
    if (!parsed || !parsed.students.length) return;
    setImporting(true);
    try {
      await onImport(parsed.students);
      onClose();
    } catch (err) {
      setErrors([{ msg: err.message }]);
      setImporting(false);
    }
  };

  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,51,102,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      background: "#fff",
      borderRadius: 10,
      boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
      width: isMobile ? "95%" : "92%",
      maxWidth: 720,
      maxHeight: "90vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      background: "#5a2d82",
      color: "#fff",
      padding: isMobile ? "10px 14px" : "12px 18px",
      borderRadius: "10px 10px 0 0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "sticky",
      top: 0,
      zIndex: 10,
    },
    body: {
      padding: isMobile ? 12 : 18,
      display: "flex",
      flexDirection: "column",
      gap: 14,
    },
    section: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    label: {
      fontSize: 11,
      fontWeight: 800,
      color: "#003366",
    },
    textarea: {
      width: "100%",
      minHeight: 100,
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      padding: 8,
      fontSize: 11,
      fontFamily: "monospace",
      resize: "vertical",
      boxSizing: "border-box",
    },
    fileBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 12px",
      background: "#003366",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
    },
    parseBtn: {
      padding: "6px 14px",
      background: "#5a2d82",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
    },
    importBtn: {
      padding: "8px 20px",
      background: "#0b6b3a",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
    },
    cancelBtn: {
      padding: "8px 20px",
      background: "#888",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
    },
    errorBox: {
      background: "#ffd0d0",
      border: "1.5px solid #cc2222",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 11,
      color: "#8b2500",
    },
    infoBox: {
      background: "#d4f7e0",
      border: "1.5px solid #0b6b3a",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 11,
      color: "#0b4f3a",
      fontWeight: 700,
    },
    warnBox: {
      background: "#fff3cc",
      border: "1.5px solid #f0c040",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 11,
      color: "#7a5800",
    },
    table: {
      borderCollapse: "collapse",
      width: "100%",
      fontSize: 10,
    },
    th: {
      padding: "4px 6px",
      background: "#003366",
      color: "#fff",
      border: "1px solid #224488",
      fontWeight: 700,
      textAlign: "center",
    },
    td: {
      padding: "4px 6px",
      border: "1px solid #d6e0f5",
      textAlign: "center",
    },
  };

  const unmatchedSubjects =
    parsed && parsed.importedSubjects.length > 0
      ? parsed.importedSubjects.filter(
          (s) =>
            !subjects.some(
              (cs) =>
                cs.trim().toLowerCase() === s.trim().toLowerCase()
            )
        )
      : [];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={{ fontWeight: 800, fontSize: isMobile ? 13 : 15 }}>
            📥 Import Students from JSON
          </span>
          <button
            style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", padding: 0 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={styles.body}>
          <div style={{ fontSize: 11, color: "#555" }}>
            Import students from a JSON file previously exported from this system. Scores are mapped by
            subject name automatically.
          </div>

          {/* File upload */}
          <div style={styles.section}>
            <div style={styles.label}>Step 1 — Choose a JSON file</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button style={styles.fileBtn} onClick={() => fileRef.current?.click()}>
                📂 Browse File
              </button>
              {fileName && (
                <span style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>{fileName}</span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Or paste JSON */}
          <div style={styles.section}>
            <div style={styles.label}>Or paste JSON text</div>
            <textarea
              style={styles.textarea}
              value={jsonText}
              placeholder='{"students": [...], "subjects": [...]}'
              onChange={(e) => setJsonText(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button style={styles.parseBtn} onClick={handleParse} disabled={!jsonText.trim()}>
                🔍 Parse JSON
              </button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div style={styles.errorBox}>
              {errors.map((e, i) => (
                <div key={i}>
                  {e.row ? `Row ${e.row}: ` : ""}
                  {Array.isArray(e.errors) ? e.errors.join(", ") : e.msg}
                </div>
              ))}
            </div>
          )}

          {/* Unmatched subjects warning */}
          {unmatchedSubjects.length > 0 && (
            <div style={styles.warnBox}>
              ⚠️ Some subjects in the JSON don't match this class's subjects and will be skipped:{" "}
              <b>{unmatchedSubjects.join(", ")}</b>
            </div>
          )}

          {/* Preview */}
          {parsed && parsed.students.length > 0 && (
            <>
              <div style={styles.infoBox}>
                ✅ {parsed.students.length} student{parsed.students.length !== 1 ? "s" : ""} ready to
                import. Showing first {Math.min(5, parsed.students.length)} below.
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["CNO", "Name", "Stream", "Sex", "Status", ...subjects.slice(0, 5)].map((h) => (
                        <th key={h} style={styles.th}>
                          {h}
                        </th>
                      ))}
                      {subjects.length > 5 && (
                        <th style={styles.th}>+{subjects.length - 5} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((s, i) => (
                      <tr key={i}>
                        <td style={styles.td}>{s.indexNo || "—"}</td>
                        <td style={{ ...styles.td, textAlign: "left" }}>{s.name}</td>
                        <td style={styles.td}>{s.stream || "—"}</td>
                        <td style={styles.td}>{s.sex}</td>
                        <td style={styles.td}>{s.status}</td>
                        {s.scores.slice(0, 5).map((sc, si) => (
                          <td key={si} style={styles.td}>
                            {sc === "" || sc === null || sc === undefined ? "—" : sc}
                          </td>
                        ))}
                        {subjects.length > 5 && <td style={styles.td}>…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {parsed && parsed.students.length === 0 && errors.length === 0 && (
            <div style={styles.warnBox}>No valid students found to import.</div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button style={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              style={{
                ...styles.importBtn,
                opacity: !parsed || !parsed.students.length || importing ? 0.6 : 1,
                cursor: !parsed || !parsed.students.length || importing ? "not-allowed" : "pointer",
              }}
              onClick={handleImport}
              disabled={!parsed || !parsed.students.length || importing}
            >
              {importing ? "Importing…" : `Import ${parsed?.students.length ?? 0} Students`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
