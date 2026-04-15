import html2pdf from "html2pdf.js";

export const exportElementToPdf = (element, fileName = "result-sheet.pdf", orientation = "portrait") => {
  if (!element) return;

  const opt = {
    margin: 8,
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation },
  };

  html2pdf().set(opt).from(element).save();
};

export const exportElementToPdfBlob = async (element) => {
  if (!element) return null;

  const opt = {
    margin: 8,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  const worker = html2pdf().set(opt).from(element);
  const blob = await worker.outputPdf("blob");
  return blob;
};
