import html2pdf from "html2pdf.js";

function buildPdfOptions({
  fileName = "result-sheet.pdf",
  orientation = "portrait",
  format = "a4",
  margin = 8,
} = {}) {
  return {
    margin,
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format, orientation },
  };
}

export const exportElementToPdf = (
  element,
  fileName = "result-sheet.pdf",
  orientation = "portrait",
  format = "a4"
) => {
  if (!element) return;

  html2pdf().set(buildPdfOptions({ fileName, orientation, format })).from(element).save();
};

export const exportElementToPdfBlob = async (element, options = {}) => {
  if (!element) return null;

  const worker = html2pdf().set(buildPdfOptions(options)).from(element);
  const blob = await worker.outputPdf("blob");
  return blob;
};
