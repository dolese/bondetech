/**
 * Minimal XLSX export utility.
 *
 * Builds a valid Office Open XML (.xlsx) file using the JSZip library that
 * is already bundled in this project, so no additional dependency is needed.
 *
 * Usage:
 *   import { exportXlsx } from "../utils/xlsxExport";
 *   await exportXlsx("class-results", headers, rows);
 *
 * @param {string}                           filename  Desired file name without extension.
 * @param {string[]}                          headers   Array of column header strings.
 * @param {Array<Array<string|number|null>>}  rows      2-D array of data rows.
 */

import JSZip from "jszip";
import { saveAs } from "file-saver";

/** Convert a 0-based column index to an Excel column letter (A, B, …, Z, AA, …). */
function colLetter(index) {
  let result = "";
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

/** Escape a string for safe embedding in XML. */
function xmlEscape(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Export tabular data as an Excel (.xlsx) file.
 *
 * @param {string}                           filename  File name without the .xlsx extension.
 * @param {string[]}                          headers   Column headers for the first row.
 * @param {Array<Array<string|number|null>>}  rows      Data rows; numbers are written as numeric
 *                                                      cells, everything else as shared strings.
 */
export async function exportXlsx(filename, headers, rows) {
  // ── Shared-string table ────────────────────────────────────────────────────
  const strings = [];
  const stringMap = new Map();

  function strIdx(value) {
    const key = String(value ?? "");
    if (stringMap.has(key)) return stringMap.get(key);
    const idx = strings.length;
    strings.push(key);
    stringMap.set(key, idx);
    return idx;
  }

  // ── Build worksheet rows (header + data) ───────────────────────────────────
  function buildRow(rowIdx, values) {
    const cells = values.map((val, colIdx) => {
      const ref = `${colLetter(colIdx)}${rowIdx + 1}`;
      if (val === null || val === undefined || val === "") {
        return `<c r="${ref}"/>`;
      }
      if (typeof val === "number" && isFinite(val)) {
        return `<c r="${ref}"><v>${val}</v></c>`;
      }
      const idx = strIdx(val);
      return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
    });
    return `<row r="${rowIdx + 1}">${cells.join("")}</row>`;
  }

  // Process header row first so string indices are assigned in order.
  const allRowsXml = [
    buildRow(0, headers),
    ...rows.map((row, i) => buildRow(i + 1, row)),
  ];

  // ── XML parts ──────────────────────────────────────────────────────────────
  const contentTypes = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>`,
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`,
    `</Types>`,
  ].join("");

  const rootRels = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`,
    `</Relationships>`,
  ].join("");

  const workbookXml = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`,
    ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
    `<sheets><sheet name="Results" sheetId="1" r:id="rId1"/></sheets>`,
    `</workbook>`,
  ].join("");

  const workbookRels = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`,
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`,
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    `</Relationships>`,
  ].join("");

  const worksheetXml = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`,
    `<sheetData>${allRowsXml.join("")}</sheetData>`,
    `</worksheet>`,
  ].join("");

  // Build sharedStrings AFTER rows so all strIdx calls are resolved.
  const sharedStringsXml = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`,
    ` count="${strings.length}" uniqueCount="${strings.length}">`,
    strings.map((s) => `<si><t>${xmlEscape(s)}</t></si>`).join(""),
    `</sst>`,
  ].join("");

  const stylesXml = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`,
    `<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>`,
    `<fills count="2">`,
    `<fill><patternFill patternType="none"/></fill>`,
    `<fill><patternFill patternType="gray125"/></fill>`,
    `</fills>`,
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>`,
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`,
    `<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>`,
    `</styleSheet>`,
  ].join("");

  // ── Assemble ZIP ───────────────────────────────────────────────────────────
  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", rootRels);
  zip.file("xl/workbook.xml", workbookXml);
  zip.file("xl/_rels/workbook.xml.rels", workbookRels);
  zip.file("xl/worksheets/sheet1.xml", worksheetXml);
  zip.file("xl/sharedStrings.xml", sharedStringsXml);
  zip.file("xl/styles.xml", stylesXml);

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${filename}.xlsx`);
}
