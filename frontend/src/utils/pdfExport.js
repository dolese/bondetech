import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";

const EXPORT_TIMEOUT_MS = 20000;
const MIN_PDF_BYTES = 1024;

function waitForAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function withTimeout(promise, timeoutMs = EXPORT_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("PDF export timed out.")), timeoutMs);
    }),
  ]);
}

async function waitForFonts() {
  if (!document.fonts?.ready) return;
  await withTimeout(document.fonts.ready).catch(() => {});
}

async function waitForImages(element) {
  const images = Array.from(element.querySelectorAll("img"));
  if (!images.length) return;

  await Promise.all(
    images.map((image) =>
      withTimeout(
        new Promise((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
          }

          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
          if (typeof image.decode === "function") {
            image.decode().then(done).catch(done);
          }
        }),
      ).catch(() => {}),
    ),
  );
}

function hasRenderableContent(element) {
  const text = (element.textContent || "").replace(/\s+/g, "");
  if (text.length > 0) return true;
  return Boolean(element.querySelector("img,svg,canvas,table,.report-card-page"));
}

function validateExportElement(element) {
  if (!element) {
    throw new Error("No export content found.");
  }
  if (!(element instanceof HTMLElement)) {
    throw new Error("Invalid export content.");
  }
  if (!element.isConnected) {
    throw new Error("Export content is not mounted.");
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error("Export content is empty.");
  }

  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
    throw new Error("Export content is hidden.");
  }

  if (!hasRenderableContent(element)) {
    throw new Error("Export content is empty.");
  }
}

async function waitForExportReady(element) {
  validateExportElement(element);
  await waitForAnimationFrame();
  await waitForAnimationFrame();
  window.getComputedStyle(element).getPropertyValue("font-family");
  element.getBoundingClientRect();
  await waitForFonts();
  await waitForImages(element);
  await waitForAnimationFrame();
  await waitForAnimationFrame();
  validateExportElement(element);
}

function buildPdfOptions({
  fileName = "result-sheet.pdf",
  orientation = "portrait",
  format = "a4",
  margin = 8,
  pagebreak,
} = {}) {
  return {
    margin,
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      imageTimeout: EXPORT_TIMEOUT_MS,
      backgroundColor: "#ffffff",
      removeContainer: true,
    },
    jsPDF: { unit: "mm", format, orientation },
    pagebreak: pagebreak ?? { mode: ["css", "legacy"] },
  };
}

export const exportElementToPdf = (
  element,
  fileName = "result-sheet.pdf",
  orientation = "portrait",
  format = "a4",
  margin = 8
) => exportElementToPdfBlob(element, {
  fileName,
  orientation,
  format,
  margin,
}).then((blob) => {
  saveAs(blob, fileName);
  return blob;
});

async function createPdfBlob(element, options = {}) {
  await waitForExportReady(element);
  const blob = await withTimeout(
    html2pdf().set(buildPdfOptions(options)).from(element).toPdf().outputPdf("blob"),
  );
  if (!blob || blob.size < MIN_PDF_BYTES) {
    throw new Error("Generated PDF is empty.");
  }
  return blob;
}

export const validatePdfExportElement = validateExportElement;

export const ensurePdfExportReady = waitForExportReady;

export const exportElementToPdfBlob = async (element, options = {}) => {
  validateExportElement(element);
  return createPdfBlob(element, options);
};
