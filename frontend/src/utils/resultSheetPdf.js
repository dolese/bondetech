import { jsPDF } from "jspdf";
import autoTable from "../vendor/jspdf.plugin.autotable.mjs";
import { getExportBranding } from "./exportBranding";
import {
  buildDivisionTable,
  buildGradeTable,
  getResultSheetBody,
  getResultSheetDateLabel,
  getResultSheetHead,
} from "./resultSheetShared";

const PAGE_MARGIN = 10;
const HEADER_HEIGHT = 26;
const SUMMARY_HEIGHT = 19;

function loadImageAsDataUrl(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawHeader(doc, model, assets) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const branding = getExportBranding(model.schoolInfo);

  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN, PAGE_MARGIN + HEADER_HEIGHT, pageWidth - PAGE_MARGIN, PAGE_MARGIN + HEADER_HEIGHT);

  if (assets.leftLogo) {
    doc.addImage(assets.leftLogo, "JPEG", PAGE_MARGIN, PAGE_MARGIN, 18, 18);
  }
  if (assets.rightLogo) {
    doc.addImage(assets.rightLogo, "JPEG", pageWidth - PAGE_MARGIN - 18, PAGE_MARGIN, 18, 18);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102);
  doc.text(branding.headerName || "School Name", centerX, PAGE_MARGIN + 7, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(branding.headerSubtitle || `Class: ${model.className || ""}`, centerX, PAGE_MARGIN + 13, {
    align: "center",
  });
  doc.text(
    branding.headerAddress ||
      `${model.schoolInfo.form || ""} • ${model.schoolInfo.term || ""} • ${model.schoolInfo.exam ?? model.schoolInfo.term ?? ""} • ${model.schoolInfo.year || ""}`,
    centerX,
    PAGE_MARGIN + 18,
    { align: "center" }
  );

  doc.setFontSize(9);
  doc.text(getResultSheetDateLabel(), centerX, PAGE_MARGIN + 22, { align: "center" });
}

function drawSummary(doc, model) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxGap = 4;
  const boxWidth = (pageWidth - PAGE_MARGIN * 2 - boxGap * 4) / 5;
  const y = PAGE_MARGIN + HEADER_HEIGHT + 4;

  model.summaryCards.forEach(([label, value], index) => {
    const x = PAGE_MARGIN + index * (boxWidth + boxGap);
    doc.setFillColor(244, 247, 255);
    doc.setDrawColor(208, 220, 248);
    doc.roundedRect(x, y, boxWidth, SUMMARY_HEIGHT, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text(String(value), x + boxWidth / 2, y + 8, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    doc.text(label, x + boxWidth / 2, y + 14, { align: "center" });
  });
}

function applyPageNumbers(doc) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 4, { align: "right" });
  }
}

function drawStatsAndSignatures(doc, model, startY, assets) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let cursorY = startY;

  const neededHeight = 58;
  if (cursorY + neededHeight > pageHeight - PAGE_MARGIN) {
    doc.addPage("a3", "landscape");
    drawHeader(doc, model, assets);
    cursorY = PAGE_MARGIN + HEADER_HEIGHT + 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 51, 102);
  doc.text("Grade Distribution", PAGE_MARGIN, cursorY);
  doc.text("Division Distribution", pageWidth / 2 + 4, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: PAGE_MARGIN, right: pageWidth / 2 + 8 },
    head: [["Grade", "Count"]],
    body: buildGradeTable(model),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.2, halign: "center" },
    headStyles: { fillColor: [0, 51, 102] },
  });

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: pageWidth / 2 + 4, right: PAGE_MARGIN },
    head: [["Division", "Count"]],
    body: buildDivisionTable(model),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.2, halign: "center" },
    headStyles: { fillColor: [0, 51, 102] },
  });

  const signatureY = Math.max(doc.lastAutoTable?.finalY || cursorY + 20, cursorY + 28) + 10;
  const signatureWidth = (pageWidth - PAGE_MARGIN * 2 - 16) / 3;
  const labels = ["Class Teacher", "Head of Department", "School Principal"];

  labels.forEach((label, index) => {
    const x = PAGE_MARGIN + index * (signatureWidth + 8);
    const lineY = signatureY + 12;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.2);
    doc.line(x, lineY, x + signatureWidth, lineY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(85, 85, 85);
    doc.text(label, x + signatureWidth / 2, lineY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Date: __________", x + signatureWidth / 2, lineY + 9, { align: "center" });
  });
}

export async function buildResultSheetPdf(model, { fileName } = {}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3",
  });

  const branding = getExportBranding(model.schoolInfo);
  const [leftLogo, rightLogo] = await Promise.all([
    loadImageAsDataUrl(branding.leftLogoSrc),
    loadImageAsDataUrl(branding.rightLogoSrc),
  ]);
  const assets = { leftLogo, rightLogo };

  const pageWidth = doc.internal.pageSize.getWidth();
  const availableSubjectWidth = 170;
  const subjectCellWidth = Math.max(12, Math.min(18, availableSubjectWidth / Math.max(model.subjects.length, 1)));
  const columnStyles = {};
  const subjectStartIndex = 4;

  model.subjects.forEach((_, index) => {
    columnStyles[subjectStartIndex + index] = { cellWidth: subjectCellWidth, halign: "center" };
  });
  columnStyles[0] = { cellWidth: 10 };
  columnStyles[1] = { cellWidth: 18 };
  columnStyles[2] = { cellWidth: 46 };
  columnStyles[3] = { cellWidth: 12 };
  columnStyles[subjectStartIndex + model.subjects.length] = { cellWidth: 14 };
  columnStyles[subjectStartIndex + model.subjects.length + 1] = { cellWidth: 12 };
  columnStyles[subjectStartIndex + model.subjects.length + 2] = { cellWidth: 14 };
  columnStyles[subjectStartIndex + model.subjects.length + 3] = { cellWidth: 16 };
  columnStyles[subjectStartIndex + model.subjects.length + 4] = { cellWidth: 14 };
  if (model.hasRemarks) {
    columnStyles[subjectStartIndex + model.subjects.length + 5] = { cellWidth: 36 };
  }

  autoTable(doc, {
    startY: PAGE_MARGIN + HEADER_HEIGHT + SUMMARY_HEIGHT + 8,
    head: getResultSheetHead(model),
    body: getResultSheetBody(model),
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_MARGIN, bottom: PAGE_MARGIN + 8 },
    theme: "grid",
    rowPageBreak: "avoid",
    tableWidth: pageWidth - PAGE_MARGIN * 2,
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: "linebreak",
      valign: "middle",
      lineColor: [203, 216, 243],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [0, 51, 102],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles,
    didDrawPage: (data) => {
      drawHeader(doc, model, assets);
      if (data.pageNumber === 1) {
        drawSummary(doc, model);
      }
    },
  });

  drawStatsAndSignatures(doc, model, (doc.lastAutoTable?.finalY || PAGE_MARGIN + HEADER_HEIGHT) + 8, assets);
  applyPageNumbers(doc);

  if (fileName) {
    doc.save(fileName);
  }

  return doc.output("blob");
}
