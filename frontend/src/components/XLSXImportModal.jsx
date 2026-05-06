import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { validateStudent } from "../utils/validation";
import { useViewport } from "../utils/useViewport";

/**
 * Parse a minimal XLSX file (as produced by the app's own XLSX export) into
 * an array of plain row objects: { [colHeader]: cellValue, … }
 *
 * Strategy:
 *  1. Unzip the .xlsx blob with JSZip.
 *  2. Read xl/sharedStrings.xml to build a string-index→value table.
 *  3. Read xl/worksheets/sheet1.xml and walk every <c> element.
 *     - Inline strings (t="inlineStr") → <is><t>…</t></is>
 *     - Shared strings  (t="s")        → look up in sharedStrings
 *     - Numbers (no t attr)             → numeric value
 *  4. First row  → headers.  Remaining rows → data objects keyed by header.
 */
async function parseXlsxFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // ── Shared strings ──────────────────────────────────────────────────────────
  const sharedStrings = [];
  const ssFile = zip.file("xl/sharedStrings.xml");
  if (ssFile) {
    const ssXml = await ssFile.async("string");
    // Extract text from each <si> element (handles both <t>…</t> and <r><t>…</t></r>)
    const siRe = /<si>([\s\S]*?)<\/si>/g;
    let siMatch;
    while ((siMatch = siRe.exec(ssXml)) !== null) {
      const inner = siMatch[1];
      // Collect all <t>…</t> text runs within the <si>
      const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
      let tMatch;
      let combined = "";
      while ((tMatch = tRe.exec(inner)) !== null) {
        combined += tMatch[1];
      }
      sharedStrings.push(combined.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"));
    }
  }

  // ── Worksheet ───────────────────────────────────────────────────────────────
  const wsFile = zip.file("xl/worksheets/sheet1.xml");
  if (!wsFile) throw new Error("No sheet1 found in this XLSX file.");
  const wsXml = await wsFile.async("string");

  // Parse all rows from <sheetData>
  const rows = [];
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;
  while ((rowMatch = rowRe.exec(wsXml)) !== null) {
    const rowIdx = Number(rowMatch[1]);
    const rowContent = rowMatch[2];
    const cells = {};

    const cellRe = /<c\s+r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>|<c\s+r="([A-Z]+)(\d+)"([^>]*)\/>/g;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowContent)) !== null) {
      const col = cellMatch[1] || cellMatch[5];
      const attrs = cellMatch[3] || cellMatch[7] || "";
      const inner = cellMatch[4] || "";
      let value = "";

      if (/t\s*=\s*"s"/.test(attrs)) {
        // Shared string
        const vMatch = inner.match(/<v>(\d+)<\/v>/);
        if (vMatch) value = sharedStrings[Number(vMatch[1])] ?? "";
      } else if (/t\s*=\s*"inlineStr"/.test(attrs)) {
        const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        if (tMatch) value = tMatch[1];
      } else if (/t\s*=\s*"str"/.test(attrs)) {
        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (vMatch) value = vMatch[1];
      } else {
        // Numeric or empty
        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (vMatch) value = vMatch[1];
      }

      cells[col] = value;
    }

    rows[rowIdx - 1] = cells;
  }

  // Remove any sparse gaps
  const denseRows = rows.filter(Boolean);
  if (denseRows.length === 0) return { headers: [], data: [] };

  // ── Convert column letters to 0-based indices ───────────────────────────────
  function colToIndex(col) {
    let n = 0;
    for (const ch of col.toUpperCase()) {
      n = n * 26 + (ch.charCodeAt(0) - 64);
    }
    return n - 1;
  }

  // Determine max column index across all rows
  const allCols = new Set();
  denseRows.forEach(row => Object.keys(row).forEach(c => allCols.add(c)));
  const sortedCols = [...allCols].sort((a, b) => colToIndex(a) - colToIndex(b));

  // First row → headers
  const headerRow = denseRows[0];
  const headers = sortedCols.map(col => String(headerRow[col] ?? "").trim());

  // Remaining rows → objects
  const data = denseRows.slice(1).map(row => {
    const obj = {};
    sortedCols.forEach((col, i) => {
      obj[headers[i]] = String(row[col] ?? "").trim();
    });
    return obj;
  });

  return { headers, data };
}

// ---------------------------------------------------------------------------

export function XLSXImportModal({ classId, subjects = [], onImport, onClose }) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [parsed, setParsed] = useState(null);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState("");
  const fileRef = useRef(null);
  const { isMobile } = useViewport();

  const parseScore = (raw) => {
    const cleaned = String(raw ?? "").trim();
    if (cleaned === "") return "";
    if (cleaned.toUpperCase() === "ABS") return "ABS";
    const n = Number(cleaned);
    if (Number.isNaN(n)) return "";
    return Math.min(100, Math.max(0, n));
  };

  const handleFile = async (file) => {
    setParseError("");
    setErrors([]);
    setWarnings([]);
    setPreview([]);
    setParsed(null);
    setFileName(file.name);

    let headers, data;
    try {
      ({ headers, data } = await parseXlsxFile(file));
    } catch (e) {
      setParseError("Could not parse XLSX: " + e.message);
      return;
    }

    if (headers.length === 0 || data.length === 0) {
      setParseError("The file appears to be empty or has no data rows.");
      return;
    }

    // Map header names (case-insensitive) to roles
    const norm = (s) => String(s ?? "").trim().toLowerCase();
    const hNorm = headers.map(norm);

    // Recognised exact and prefix/suffix patterns for each identity column.
    const STUDENT_ID_HEADERS = new Set(["cno", "admission_no", "admissionno", "index_no", "indexno", "candidate_no", "candidateno"]);
    const cnoIdx = hNorm.findIndex(h => STUDENT_ID_HEADERS.has(h));
    const nameIdx = hNorm.findIndex(h => h === "name" || h === "student_name" || h === "studentname");
    const sexIdx = hNorm.findIndex(h => h === "sex" || h === "gender");
    const statusIdx = hNorm.findIndex(h => h === "status");

    // The first row of data in the spreadsheet is row 2 (row 1 is the header).
    const DATA_ROW_OFFSET = 2;

    // Map each class subject to a column index
    const subjectCols = subjects.map((subj) => {
      const idx = hNorm.findIndex(h => h === norm(subj));
      return idx;
    });

    const unmappedSubjects = subjects.filter((_, i) => subjectCols[i] === -1);
    if (unmappedSubjects.length > 0) {
      setWarnings([`Some subjects were not found in the XLSX and will be blank: ${unmappedSubjects.join(", ")}`]);
    }

    const validRows = [];
    const errs = [];
    const coercionWarnings = [];

    data.forEach((row, i) => {
      const rawSex = sexIdx >= 0 ? String(row[headers[sexIdx]] ?? "").trim().toUpperCase() : "M";
      const sexVal = rawSex === "F" ? "F" : "M";
      if (rawSex && rawSex !== "M" && rawSex !== "F") {
        coercionWarnings.push(`Row ${i + DATA_ROW_OFFSET}: sex "${rawSex}" defaulted to M`);
      }

      const rawStatus = statusIdx >= 0 ? String(row[headers[statusIdx]] ?? "").trim().toLowerCase() : "present";
      const validStatuses = ["present", "absent", "incomplete"];
      const statusVal = validStatuses.includes(rawStatus) ? rawStatus : "present";

      const scores = subjects.map((_, si) => {
        if (subjectCols[si] === -1) return "";
        return parseScore(row[headers[subjectCols[si]]] ?? "");
      });

      const mapped = {
        indexNo: cnoIdx >= 0 ? String(row[headers[cnoIdx]] ?? "").trim() : "",
        name: nameIdx >= 0 ? String(row[headers[nameIdx]] ?? "").trim() : "",
        sex: sexVal,
        status: statusVal,
        scores,
      };

      const validation = validateStudent(mapped);
      if (!validation.valid) {
        errs.push({ row: i + DATA_ROW_OFFSET, errors: Object.values(validation.errors) });
      } else {
        validRows.push(mapped);
      }
    });

    if (coercionWarnings.length > 0) {
      setWarnings(prev => [...prev, ...coercionWarnings.slice(0, 5)]);
    }

    setParsed({ students: validRows });
    setPreview(validRows.slice(0, 5));
    if (errs.length > 0) {
      const shown = errs.slice(0, 5);
      if (errs.length > 5) shown.push({ row: "…", errors: [`and ${errs.length - 5} more invalid rows skipped`] });
      setErrors(shown);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!parsed || !parsed.students.length) return;
    setImporting(true);
    try {
      await onImport(parsed.students);
      onClose();
    } catch (err) {
      setErrors([{ row: "", errors: [err.message] }]);
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
      background: "#1a7336",
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
    section: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 11, fontWeight: 800, color: "#003366" },
    fileBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 12px",
      background: "#1a7336",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
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
    table: { borderCollapse: "collapse", width: "100%", fontSize: 10 },
    th: { padding: "4px 6px", background: "#003366", color: "#fff", border: "1px solid #224488", fontWeight: 700, textAlign: "center" },
    td: { padding: "4px 6px", border: "1px solid #d6e0f5", textAlign: "center" },
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
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={{ fontWeight: 800, fontSize: isMobile ? 13 : 15 }}>
            📊 Import Students from XLSX
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
            Import students from an Excel (.xlsx) file. The file should contain columns for
            <strong> CNO</strong>, <strong>Name</strong>, <strong>Sex</strong>, and one column per
            subject (matching this class's subjects). Additional columns like Total, Grade, etc. are
            ignored. The first row must be a header row.
          </div>

          <div style={styles.section}>
            <div style={styles.label}>Choose an XLSX file</div>
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
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>
            <div style={{ fontSize: 10, color: "#666", background: "#f4f7ff", padding: 8, borderRadius: 6, borderLeft: "3px solid #1a7336" }}>
              Tip: Use <strong>Export XLSX</strong> to generate a template, edit it in Excel or Google
              Sheets, then re-import here. Columns for Total, Average, Grade, Division, Points, and
              Position are ignored during import.
            </div>
          </div>

          {parseError && (
            <div style={styles.errorBox}>⚠ {parseError}</div>
          )}

          {warnings.length > 0 && (
            <div style={styles.warnBox}>
              ⚠️ Warnings:
              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {errors.length > 0 && (
            <div style={styles.errorBox}>
              {errors.map((e, i) => (
                <div key={i}>
                  {e.row ? `Row ${e.row}: ` : ""}
                  {Array.isArray(e.errors) ? e.errors.join(", ") : e.errors}
                </div>
              ))}
            </div>
          )}

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
                      {["CNO", "Name", "Sex", "Status", ...subjects.slice(0, 5)].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                      {subjects.length > 5 && <th style={styles.th}>+{subjects.length - 5} more</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((s, i) => (
                      <tr key={i}>
                        <td style={styles.td}>{s.indexNo || "—"}</td>
                        <td style={{ ...styles.td, textAlign: "left" }}>{s.name}</td>
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

          {parsed && parsed.students.length === 0 && !parseError && (
            <div style={styles.warnBox}>No valid students found to import.</div>
          )}

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
