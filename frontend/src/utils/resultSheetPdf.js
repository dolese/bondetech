import { jsPDF } from "jspdf";
import autoTable from "../vendor/jspdf.plugin.autotable.mjs";
import { getResultSheetBranding } from "./exportBranding";
import { getResultSheetBody, getResultSheetHead, getResultSheetPageSpec } from "./resultSheetShared";

const ACCENT = [22, 63, 151];
const BORDER = [174, 190, 223];
const TEXT = [22, 22, 22];
const STATUS_COLORS = {
  COMPLETE: [26, 107, 47],
  INCOMPLETE: [164, 91, 0],
  ABSENT: [180, 35, 24],
};
const RESULT_TABLE_WIDTHS = {
  cno: 18,
  name: 52,
  sex: 10,
  points: 15,
  division: 17,
};

function getPdfSheetConfig(pageSize = "a3") {
  const spec = getResultSheetPageSpec(pageSize);
  if (spec.format === "a4") {
    return {
      format: spec.format,
      orientation: spec.orientation,
      PAGE_MARGIN: 8,
      PAGE_HEADER_HEIGHT: 42,
      SUMMARY_START_Y: 66,
      TABLE_START_Y: 139,
      SUBJECT_BAND_Y: 112,
      FOOTER_RESERVE: 30,
    };
  }

  return {
    format: spec.format,
    orientation: spec.orientation,
    PAGE_MARGIN: 12,
    PAGE_HEADER_HEIGHT: 56,
    SUMMARY_START_Y: 76,
    TABLE_START_Y: 176,
    SUBJECT_BAND_Y: 141,
    FOOTER_RESERVE: 38,
  };
}

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

function drawPageFrame(doc, config) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { PAGE_MARGIN } = config;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.45);
  doc.rect(PAGE_MARGIN - 4, PAGE_MARGIN - 4, pageWidth - (PAGE_MARGIN - 4) * 2, pageHeight - (PAGE_MARGIN - 4) * 2);
}

function drawSchoolHeader(doc, model, assets, config) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const branding = getResultSheetBranding(model.schoolInfo);
  const { PAGE_MARGIN } = config;

  drawPageFrame(doc, config);

  if (assets.leftLogo) {
    doc.addImage(assets.leftLogo, "PNG", PAGE_MARGIN + 2, PAGE_MARGIN + 4, 26, 26);
  }
  if (assets.rightLogo) {
    doc.addImage(assets.rightLogo, "PNG", pageWidth - PAGE_MARGIN - 28, PAGE_MARGIN + 4, 26, 26);
  }

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...ACCENT);
  doc.text((branding.headerName || "School Name").toUpperCase(), pageWidth / 2, PAGE_MARGIN + 18, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...TEXT);
  doc.text(branding.headerSubtitle || "", pageWidth / 2, PAGE_MARGIN + 27, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(branding.headerAddress || "", pageWidth / 2, PAGE_MARGIN + 34.5, { align: "center" });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.55);
  doc.line(PAGE_MARGIN + 2, PAGE_MARGIN + 40, pageWidth - PAGE_MARGIN - 2, PAGE_MARGIN + 40);
  doc.line(PAGE_MARGIN + 2, PAGE_MARGIN + 41.2, pageWidth - PAGE_MARGIN - 2, PAGE_MARGIN + 41.2);
}

function drawTitleBlock(doc, model, config) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { PAGE_MARGIN } = config;
  const top = PAGE_MARGIN + 46;
  const segments = [
    ["Year", model.meta.year],
    ["Term", model.meta.term],
    ["Exam", model.meta.exam],
    ["Class", model.meta.classLabel],
  ];

  doc.setFont("times", "bold");
  doc.setFontSize(15.5);
  doc.setTextColor(...ACCENT);
  doc.text("OFFICIAL RESULT SHEET", pageWidth / 2, top + 6, { align: "center" });

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

  const badgeWidth = 44;
  const badgeHeight = 16;
  const badgeX = pageWidth - PAGE_MARGIN - badgeWidth;
  const badgeY = top + 1;
  doc.setFillColor(...ACCENT);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text("Report Generated", badgeX + badgeWidth / 2, badgeY + 5.2, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(model.generatedAtLabel || "", badgeX + badgeWidth / 2, badgeY + 11, { align: "center" });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.45);
  doc.line(PAGE_MARGIN + 2, top + 22, pageWidth - PAGE_MARGIN - 2, top + 22);
}

function drawSummaryTitle(doc, x, y, width, title) {
  doc.setFillColor(...ACCENT);
  doc.setDrawColor(...BORDER);
  doc.rect(x, y, width, 9, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + width / 2, y + 5.8, { align: "center" });
}

function drawSummaryBlocks(doc, model, config) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { PAGE_MARGIN, SUMMARY_START_Y } = config;
  const totalWidth = pageWidth - PAGE_MARGIN * 2;
  const gap = 5;
  const leftWidth = 78;
  const middleWidth = 78;
  const sexWidth = 82;
  const performanceWidth = totalWidth - leftWidth - middleWidth - sexWidth - gap * 3;
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
  drawSummaryTitle(doc, divisionX, topY, middleWidth, "DIVISION SUMMARY");
  autoTable(doc, {
    startY: topY + 9,
    margin: { left: divisionX, right: pageWidth - divisionX - middleWidth },
    head: [["Division", "Students", "%"]],
    body: model.divisionSummaryRows.map((row) => [row.label, String(row.students), row.percentage]),
    theme: "grid",
    styles: {
      fontSize: 7.8,
      cellPadding: 1.7,
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
      0: { halign: "left", cellWidth: middleWidth - 30 },
      1: { halign: "right", fontStyle: "bold", cellWidth: 13 },
      2: { halign: "right", fontStyle: "bold", cellWidth: 17 },
    },
  });

  const sexX = divisionX + middleWidth + gap;
  drawSummaryTitle(doc, sexX, topY, sexWidth, "SEX SUMMARY");
  autoTable(doc, {
    startY: topY + 9,
    margin: { left: sexX, right: pageWidth - sexX - sexWidth },
    head: [["", "MALE", "FEMALE", "TOTAL"]],
    body: [
      ["Total", String(model.sexSummary.total.male), String(model.sexSummary.total.female), String(model.sexSummary.total.male + model.sexSummary.total.female)],
      ["Complete", String(model.sexSummary.complete.male), String(model.sexSummary.complete.female), String(model.sexSummary.complete.male + model.sexSummary.complete.female)],
      ["Incomplete", String(model.sexSummary.incomplete.male), String(model.sexSummary.incomplete.female), String(model.sexSummary.incomplete.male + model.sexSummary.incomplete.female)],
      ["Absent", String(model.sexSummary.absent.male), String(model.sexSummary.absent.female), String(model.sexSummary.absent.male + model.sexSummary.absent.female)],
      ["Avg (Complete)", String(model.sexSummary.average.male), String(model.sexSummary.average.female), String(model.completeAverage)],
      ["Pass (I-IV)", String(model.sexSummary.pass.male), String(model.sexSummary.pass.female), String(model.passCount)],
      ["Fail (0)", String(model.sexSummary.fail.male), String(model.sexSummary.fail.female), String(model.failCount)],
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
      0: { halign: "left", cellWidth: sexWidth - 34 },
      1: { halign: "right", fontStyle: "bold", cellWidth: 11 },
      2: { halign: "right", fontStyle: "bold", cellWidth: 11 },
      3: { halign: "right", fontStyle: "bold", cellWidth: 12 },
    },
    didParseCell: (data) => {
      data.row.height = rowHeight;
    },
  });

  const performanceX = sexX + sexWidth + gap;
  drawSummaryTitle(doc, performanceX, topY, performanceWidth, "PERFORMANCE OVERVIEW");
  const perfY = topY + 13;
  const perfCenters = [
    { x: performanceX + 18, color: [47, 143, 67], label: "PASS RATE", value: `${model.performanceOverview.passRate}%`, detail: `I-IV ${model.performanceOverview.passCount}/${model.performanceOverview.completeCount}` },
    { x: performanceX + performanceWidth / 2, color: [37, 99, 235], label: "FAIL RATE", value: `${model.performanceOverview.failRate}%`, detail: `0 ${model.performanceOverview.failCount}/${model.performanceOverview.completeCount}` },
    { x: performanceX + performanceWidth - 18, color: [124, 58, 237], label: "CLASS AVG", value: model.performanceOverview.classAverage, detail: "Complete Only" },
  ];
  perfCenters.forEach((item) => {
    doc.setDrawColor(...item.color);
    doc.setLineWidth(2.2);
    doc.circle(item.x, perfY + 15, 10, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    doc.setTextColor(...TEXT);
    doc.text(item.value, item.x, perfY + 16, { align: "center" });
    doc.setFontSize(7.2);
    doc.setTextColor(...item.color);
    doc.text(item.label, item.x, perfY + 30, { align: "center" });
    doc.setTextColor(...TEXT);
    doc.text(item.detail, item.x, perfY + 35, { align: "center" });
  });
}

function drawSubjectSummaryBand(doc, model, config) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { PAGE_MARGIN, SUBJECT_BAND_Y } = config;
  const totalWidth = pageWidth - PAGE_MARGIN * 2;
  const bandY = SUBJECT_BAND_Y;
  const headerHeight = 8.5;
  const bodyHeight = 19;
  const columns = Math.max(model.subjectSummaries.length, 1);
  const cardWidth = totalWidth / columns;

  doc.setFillColor(...ACCENT);
  doc.setDrawColor(...BORDER);
  doc.rect(PAGE_MARGIN, bandY, totalWidth, headerHeight, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  doc.setTextColor(255, 255, 255);
  doc.text("SUBJECT PERFORMANCE SUMMARY (COMPLETE ONLY)", PAGE_MARGIN + 3, bandY + 5.7);

  model.subjectSummaries.forEach((subject, index) => {
    const x = PAGE_MARGIN + index * cardWidth;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.rect(x, bandY + headerHeight, cardWidth, bodyHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.setTextColor(...ACCENT);
    doc.text(subject.subject, x + cardWidth / 2, bandY + headerHeight + 5.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Entries ${subject.entries}`, x + cardWidth / 2, bandY + headerHeight + 9.8, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text("AVG", x + 4, bandY + headerHeight + 14.2);
    doc.text("PASS", x + cardWidth / 2 + 2, bandY + headerHeight + 14.2);
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(subject.average, x + 4, bandY + headerHeight + 18.3);
    doc.text(subject.passRate, x + cardWidth / 2 + 2, bandY + headerHeight + 18.3);
  });
}

function drawClosingFooter(doc, model, config) {
  const branding = getResultSheetBranding(model.schoolInfo);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { PAGE_MARGIN } = config;
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

  doc.setDrawColor(...BORDER);
  doc.line(PAGE_MARGIN + 2, pageHeight - 25.5, pageWidth - PAGE_MARGIN - 2, pageHeight - 25.5);
  doc.line(PAGE_MARGIN + 2, pageHeight - 14.5, pageWidth - PAGE_MARGIN - 2, pageHeight - 14.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...ACCENT);
  doc.text(branding.footerMotto || "Better Future Starts Here", pageWidth / 2, pageHeight - 19.2, { align: "center" });
}

function drawPageFooter(doc, page, totalPages, config) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { PAGE_MARGIN } = config;
  const lineY = pageHeight - 14;

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.25);
  doc.line(PAGE_MARGIN + 2, lineY, pageWidth - PAGE_MARGIN - 2, lineY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(`Page ${page} of ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: "center" });
}

function applyPageNumbers(doc, config) {
  const totalPages = doc.getNumberOfPages();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawPageFooter(doc, page, totalPages, config);
  }
}

export async function buildResultSheetPdf(model, { fileName, pageSize = "a3" } = {}) {
  const config = getPdfSheetConfig(pageSize);
  const doc = new jsPDF({
    orientation: config.orientation,
    unit: "mm",
    format: config.format,
  });

  const branding = getResultSheetBranding(model.schoolInfo);
  const [leftLogo, rightLogo] = await Promise.all([
    loadImageAsDataUrl(branding.leftLogoSrc),
    loadImageAsDataUrl(branding.rightLogoSrc),
  ]);
  const assets = { leftLogo, rightLogo };

  drawSchoolHeader(doc, model, assets, config);
  drawTitleBlock(doc, model, config);
  drawSummaryBlocks(doc, model, config);
  drawSubjectSummaryBand(doc, model, config);

  const pageWidth = doc.internal.pageSize.getWidth();
  const { PAGE_MARGIN, PAGE_HEADER_HEIGHT, TABLE_START_Y, FOOTER_RESERVE } = config;
  const subjectStartIndex = 3;
  const columnStyles = {
    0: { cellWidth: RESULT_TABLE_WIDTHS.cno, halign: "center" },
    1: { cellWidth: RESULT_TABLE_WIDTHS.name, halign: "left" },
    2: { cellWidth: RESULT_TABLE_WIDTHS.sex, halign: "center" },
  };
  const remainingWidth =
    pageWidth -
    PAGE_MARGIN * 2 -
    RESULT_TABLE_WIDTHS.cno -
    RESULT_TABLE_WIDTHS.name -
    RESULT_TABLE_WIDTHS.sex -
    RESULT_TABLE_WIDTHS.points -
    RESULT_TABLE_WIDTHS.division;
  const subjectWidth = Math.max(10, Math.min(16, remainingWidth / Math.max(model.subjects.length, 1)));

  model.subjects.forEach((_, index) => {
    columnStyles[subjectStartIndex + index] = { cellWidth: subjectWidth, halign: "center" };
  });

  const totalStart = subjectStartIndex + model.subjects.length;
  columnStyles[totalStart] = { cellWidth: RESULT_TABLE_WIDTHS.points, halign: "center" };
  columnStyles[totalStart + 1] = { cellWidth: RESULT_TABLE_WIDTHS.division, halign: "center" };

  autoTable(doc, {
    startY: TABLE_START_Y,
    head: getResultSheetHead(model),
    body: getResultSheetBody(model),
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_HEADER_HEIGHT, bottom: FOOTER_RESERVE },
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
      drawSchoolHeader(doc, model, assets, config);
      if (data.pageNumber === 1) {
        drawTitleBlock(doc, model, config);
        drawSummaryBlocks(doc, model, config);
        drawSubjectSummaryBand(doc, model, config);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...ACCENT);
        doc.text("OFFICIAL RESULT SHEET", pageWidth / 2, PAGE_MARGIN + 48, { align: "center" });
      }
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const divisionColumn = totalStart + 1;
        if (data.column.index === divisionColumn) {
          const division = String(data.cell.raw || "");
          if (division === "INC") data.cell.styles.textColor = STATUS_COLORS.INCOMPLETE;
          if (division === "ABS") data.cell.styles.textColor = STATUS_COLORS.ABSENT;
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
    doc.addPage(config.format, config.orientation);
    drawSchoolHeader(doc, model, assets, config);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ACCENT);
    doc.text("OFFICIAL RESULT SHEET", pageWidth / 2, PAGE_MARGIN + 48, { align: "center" });
  }

  drawClosingFooter(doc, model, config);

  applyPageNumbers(doc, config);

  if (fileName) {
    doc.save(fileName);
  }

  return doc.output("blob");
}
