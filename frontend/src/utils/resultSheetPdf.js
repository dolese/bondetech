import { jsPDF } from "jspdf";
import autoTable from "../vendor/jspdf.plugin.autotable.mjs";
import { getExportBranding } from "./exportBranding";
import { getResultSheetBody, getResultSheetHead } from "./resultSheetShared";

const ACCENT = [11, 91, 85];
const BORDER = [184, 200, 197];
const TEXT = [22, 22, 22];
const STATUS_COLORS = {
  COMPLETE: [26, 107, 47],
  INCOMPLETE: [164, 91, 0],
  ABSENT: [180, 35, 24],
};
const PAGE_MARGIN = 8;
const PAGE_HEADER_HEIGHT = 56;
const SUMMARY_START_Y = 76;
const TABLE_START_Y = 152;

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
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawPageFrame(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.45);
  doc.rect(PAGE_MARGIN - 4, PAGE_MARGIN - 4, pageWidth - (PAGE_MARGIN - 4) * 2, pageHeight - (PAGE_MARGIN - 4) * 2);
}

function drawSchoolHeader(doc, model, assets) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const branding = getExportBranding(model.schoolInfo);

  drawPageFrame(doc);

  if (assets.leftLogo) {
    doc.addImage(assets.leftLogo, "PNG", PAGE_MARGIN + 2, PAGE_MARGIN + 4, 26, 26);
  }
  if (assets.rightLogo) {
    doc.addImage(assets.rightLogo, "PNG", pageWidth - PAGE_MARGIN - 28, PAGE_MARGIN + 4, 26, 26);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...ACCENT);
  doc.text((branding.headerName || "School Name").toUpperCase(), pageWidth / 2, PAGE_MARGIN + 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  doc.text(branding.headerSubtitle || "", pageWidth / 2, PAGE_MARGIN + 27, { align: "center" });
  doc.text(branding.headerAddress || "", pageWidth / 2, PAGE_MARGIN + 35, { align: "center" });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.55);
  doc.line(PAGE_MARGIN + 2, PAGE_MARGIN + 40, pageWidth - PAGE_MARGIN - 2, PAGE_MARGIN + 40);
  doc.line(PAGE_MARGIN + 2, PAGE_MARGIN + 41.2, pageWidth - PAGE_MARGIN - 2, PAGE_MARGIN + 41.2);
}

function drawTitleBlock(doc, model) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const top = PAGE_MARGIN + 46;
  const segments = [
    ["Year", model.meta.year],
    ["Term", model.meta.term],
    ["Exam", model.meta.exam],
    ["Class", model.meta.classLabel],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...ACCENT);
  doc.text("GENERAL STUDENTS RESULTS", pageWidth / 2, top + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);

  const rendered = [];
  segments.forEach(([label, value], index) => {
    rendered.push(`${label}: ${value}`);
    if (index < segments.length - 1) rendered.push("|");
  });

  let cursorX = pageWidth / 2 - 56;
  rendered.forEach((text) => {
    doc.text(text, cursorX, top + 16);
    cursorX += doc.getTextWidth(text) + 6;
  });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.45);
  doc.line(PAGE_MARGIN + 2, top + 22, pageWidth - PAGE_MARGIN - 2, top + 22);
}

function drawSummaryTitle(doc, x, y, width, title) {
  doc.setFillColor(...ACCENT);
  doc.setDrawColor(...BORDER);
  doc.rect(x, y, width, 9, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + width / 2, y + 5.8, { align: "center" });
}

function drawSummaryBlocks(doc, model) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalWidth = pageWidth - PAGE_MARGIN * 2;
  const gap = 5;
  const leftWidth = 92;
  const middleWidth = 64;
  const rightWidth = totalWidth - leftWidth - middleWidth - gap * 2;
  const topY = SUMMARY_START_Y;
  const rowHeight = 8.2;

  drawSummaryTitle(doc, PAGE_MARGIN, topY, leftWidth, "RESULTS SUMMARY");
  autoTable(doc, {
    startY: topY + 9,
    margin: { left: PAGE_MARGIN, right: pageWidth - PAGE_MARGIN - leftWidth },
    body: model.summaryRows.map(([label, value]) => [label, String(value)]),
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: TEXT,
      lineColor: BORDER,
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: leftWidth - 18 },
      1: { halign: "right", fontStyle: "bold", cellWidth: 18 },
    },
  });

  const divisionX = PAGE_MARGIN + leftWidth + gap;
  drawSummaryTitle(doc, divisionX, topY, middleWidth, "DIVISION SUMMARY (COMPLETE ONLY)");
  autoTable(doc, {
    startY: topY + 9,
    margin: { left: divisionX, right: pageWidth - divisionX - middleWidth },
    body: [
      ...model.divisionRows.map(([label, value]) => [label.replace(/:$/, ""), String(value)]),
      ["Total (Complete)", String(model.completeStudents.length)],
    ],
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: TEXT,
      lineColor: BORDER,
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: middleWidth - 18 },
      1: { halign: "right", fontStyle: "bold", cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.row.index === model.divisionRows.length) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const sexX = divisionX + middleWidth + gap;
  drawSummaryTitle(doc, sexX, topY, rightWidth, "SEX SUMMARY");
  autoTable(doc, {
    startY: topY + 9,
    margin: { left: sexX, right: PAGE_MARGIN },
    head: [["", "MALE", "FEMALE"]],
    body: [
      ["Total Students", String(model.sexSummary.total.male), String(model.sexSummary.total.female)],
      ["Complete", String(model.sexSummary.complete.male), String(model.sexSummary.complete.female)],
      ["Incomplete", String(model.sexSummary.incomplete.male), String(model.sexSummary.incomplete.female)],
      ["Absent", String(model.sexSummary.absent.male), String(model.sexSummary.absent.female)],
      ["Average (Complete Only)", String(model.sexSummary.average.male), String(model.sexSummary.average.female)],
      ["Pass (Div I-IV)", String(model.sexSummary.pass.male), String(model.sexSummary.pass.female)],
      ["Fail (Div 0)", String(model.sexSummary.fail.male), String(model.sexSummary.fail.female)],
    ],
    theme: "grid",
    styles: {
      fontSize: 8.2,
      cellPadding: 2,
      textColor: TEXT,
      lineColor: BORDER,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: TEXT,
      fontStyle: "bold",
      lineColor: BORDER,
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: rightWidth - 32 },
      1: { halign: "right", fontStyle: "bold", cellWidth: 16 },
      2: { halign: "right", fontStyle: "bold", cellWidth: 16 },
    },
    didParseCell: (data) => {
      data.row.height = rowHeight;
    },
  });
}

function drawClosingFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const baseY = pageHeight - 34;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text("KEY:", PAGE_MARGIN, baseY);
  doc.setTextColor(...STATUS_COLORS.COMPLETE);
  doc.text("COMPLETE", PAGE_MARGIN + 11, baseY);
  doc.setTextColor(...TEXT);
  doc.text("(>=7 Subjects)", PAGE_MARGIN + 29, baseY);
  doc.text("|", PAGE_MARGIN + 57, baseY);
  doc.setTextColor(...STATUS_COLORS.INCOMPLETE);
  doc.text("INCOMPLETE", PAGE_MARGIN + 61, baseY);
  doc.setTextColor(...TEXT);
  doc.text("(1-6 Subjects)", PAGE_MARGIN + 86, baseY);
  doc.text("|", PAGE_MARGIN + 112, baseY);
  doc.setTextColor(...STATUS_COLORS.ABSENT);
  doc.text("ABSENT", PAGE_MARGIN + 116, baseY);
  doc.setTextColor(...TEXT);
  doc.text("(No Subject)", PAGE_MARGIN + 132, baseY);

  const leftLineY = pageHeight - 20;
  const rightLineY = pageHeight - 20;
  doc.text("Prepared by:", PAGE_MARGIN + 6, leftLineY - 5);
  doc.line(PAGE_MARGIN + 34, leftLineY, PAGE_MARGIN + 88, leftLineY);
  doc.text("Class Teacher", PAGE_MARGIN + 61, leftLineY + 5, { align: "center" });

  doc.text("Checked by:", pageWidth - PAGE_MARGIN - 86, rightLineY - 5);
  doc.line(pageWidth - PAGE_MARGIN - 58, rightLineY, pageWidth - PAGE_MARGIN - 4, rightLineY);
  doc.text("Headmaster", pageWidth - PAGE_MARGIN - 31, rightLineY + 5, { align: "center" });

  const dateY = pageHeight - 8;
  doc.text("Date:", pageWidth / 2 - 26, dateY);
  doc.line(pageWidth / 2 - 8, dateY - 1, pageWidth / 2 + 42, dateY - 1);
}

function drawPageFooter(doc, page, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineY = pageHeight - 14;

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.25);
  doc.line(PAGE_MARGIN + 2, lineY, pageWidth - PAGE_MARGIN - 2, lineY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(`Page ${page} of ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: "center" });
}

function applyPageNumbers(doc) {
  const totalPages = doc.getNumberOfPages();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawPageFooter(doc, page, totalPages);
  }
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

  drawSchoolHeader(doc, model, assets);
  drawTitleBlock(doc, model);
  drawSummaryBlocks(doc, model);

  const pageWidth = doc.internal.pageSize.getWidth();
  const subjectStartIndex = 4;
  const columnStyles = {
    0: { cellWidth: 10, halign: "center" },
    1: { cellWidth: 18, halign: "center" },
    2: { cellWidth: 48, halign: "left" },
    3: { cellWidth: 10, halign: "center" },
  };
  const remainingWidth = pageWidth - PAGE_MARGIN * 2 - 10 - 18 - 48 - 10 - 17 - 17 - 15 - 17 - 22 - (model.hasRemarks ? 28 : 0);
  const subjectWidth = Math.max(10, Math.min(16, remainingWidth / Math.max(model.subjects.length, 1)));

  model.subjects.forEach((_, index) => {
    columnStyles[subjectStartIndex + index] = { cellWidth: subjectWidth, halign: "center" };
  });

  const totalStart = subjectStartIndex + model.subjects.length;
  columnStyles[totalStart] = { cellWidth: 15, halign: "center" };
  columnStyles[totalStart + 1] = { cellWidth: 17, halign: "center" };
  columnStyles[totalStart + 2] = { cellWidth: 15, halign: "center" };
  columnStyles[totalStart + 3] = { cellWidth: 17, halign: "center" };
  columnStyles[totalStart + 4] = { cellWidth: 22, halign: "center" };
  if (model.hasRemarks) {
    columnStyles[totalStart + 5] = { cellWidth: 28, halign: "left" };
  }

  autoTable(doc, {
    startY: TABLE_START_Y,
    head: getResultSheetHead(model),
    body: getResultSheetBody(model),
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_HEADER_HEIGHT, bottom: 38 },
    theme: "grid",
    tableWidth: pageWidth - PAGE_MARGIN * 2,
    rowPageBreak: "avoid",
    styles: {
      fontSize: 7.8,
      cellPadding: 1.6,
      overflow: "linebreak",
      valign: "middle",
      textColor: TEXT,
      lineColor: BORDER,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: ACCENT,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      lineColor: BORDER,
      lineWidth: 0.15,
    },
    columnStyles,
    didDrawPage: (data) => {
      drawSchoolHeader(doc, model, assets);
      if (data.pageNumber === 1) {
        drawTitleBlock(doc, model);
        drawSummaryBlocks(doc, model);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...ACCENT);
        doc.text("GENERAL STUDENTS RESULTS", pageWidth / 2, PAGE_MARGIN + 48, { align: "center" });
      }
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const statusColumn = totalStart + 4;
        const divisionColumn = totalStart + 3;
        if (data.column.index === statusColumn) {
          const status = String(data.cell.raw || "");
          data.cell.styles.textColor = STATUS_COLORS[status] || TEXT;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index === divisionColumn) {
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const lastPage = doc.getNumberOfPages();
  doc.setPage(lastPage);
  const pageHeight = doc.internal.pageSize.getHeight();
  const finalY = doc.lastAutoTable?.finalY || TABLE_START_Y;

  if (finalY > pageHeight - 52) {
    doc.addPage("a3", "landscape");
    drawSchoolHeader(doc, model, assets);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ACCENT);
    doc.text("GENERAL STUDENTS RESULTS", pageWidth / 2, PAGE_MARGIN + 48, { align: "center" });
  }

  drawClosingFooter(doc);

  applyPageNumbers(doc);

  if (fileName) {
    doc.save(fileName);
  }

  return doc.output("blob");
}
