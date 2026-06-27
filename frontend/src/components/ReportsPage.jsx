import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SCHOOL,
  DEFAULT_EXAM_TYPE,
  EXAM_TYPES,
  getMonthlyExamKey,
} from "../utils/constants";
import {
  exportElementToPdfBlob,
  validatePdfExportElement,
} from "../utils/pdfExport";
import { useViewport } from "../utils/useViewport";
import { ReportCardPrint } from "./ReportCardPrint";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { withPositions } from "../utils/grading";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { useI18n } from "../i18n";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  displayFontStack,
  fieldStyle,
  premiumFontStack,
} from "../utils/designSystem";
import { buildFormWorkspace } from "../utils/formClassAggregation";

const TEMPLATE_OPTIONS = [
  { label: "Official", value: "official" },
  { label: "Compact", value: "compact" },
];
const REPORT_CARD_PAPER_SIZE = "a4";
const REPORT_CARD_ORIENTATION = "portrait";
const PREVIEW_URL_CHECK_INTERVAL_MS = 1000;
const PREVIEW_URL_MAX_LIFETIME_30_MIN_MS = 1800000;

function getClassLabel(classData = {}) {
  const base = [classData.form, classData.stream].filter(Boolean).join(" ").trim();
  if (base && classData.year) return `${base} ${classData.year}`;
  return base || classData.name || "";
}

function normalizeExamList(classData, computed) {
  const standardExams = EXAM_TYPES.map((exam) => exam.value);
  const monthlyExams = (classData.monthly_exams ?? []).map((month) =>
    getMonthlyExamKey(month),
  );
  const scoreExams = new Set();
  (computed ?? []).forEach((student) => {
    Object.keys(student.examScores ?? {}).forEach((exam) =>
      scoreExams.add(exam),
    );
  });
  return Array.from(
    new Set(
      [
        classData.school_info?.exam || DEFAULT_EXAM_TYPE,
        ...standardExams,
        ...monthlyExams,
        ...scoreExams,
      ].filter(Boolean),
    ),
  );
}

function buildExamComputed(classData, exam, rawStudents) {
  const studentsWithExamScores = (rawStudents ?? []).map((student) => ({
    ...student,
    scores: student.examScores?.[exam] ?? [],
  }));
  return withPositions(studentsWithExamScores, classData.subjects ?? []);
}

function averageOf(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function waitForAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForImages(container) {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
          }
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        }),
    ),
  );
}

async function waitForRenderStability(container) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await waitForImages(container);
  await waitForAnimationFrame();
  await waitForAnimationFrame();
}
export function ReportsPage({
  classData,
  computed,
  allClasses = [],
  onOpenReportCard,
  onSelectClass,
  onChangeExam,
  onHydrateClasses,
}) {
  const { isMobile, isTablet } = useViewport();
  const { t } = useI18n();
  const [exportingZip, setExportingZip] = useState(false);
  const [exportError, setExportError] = useState("");
  const [template, setTemplate] = useState("official");
  const sectionStyle = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: isMobile ? 14 : 18,
  };
  const schoolInfo = classData.school_info ?? DEFAULT_SCHOOL;
  const [selectedForm, setSelectedForm] = useState("all");
  const [localFormWorkspace, setLocalFormWorkspace] = useState(null);

  const activeWorkspace = localFormWorkspace || { classData, computed };
  const activeClassData = activeWorkspace.classData || classData;
  const activeComputed = activeWorkspace.computed || computed;
  const present = (activeComputed ?? [])
    .filter((student) => student.total !== null)
    .sort((a, b) => (a.posn ?? Infinity) - (b.posn ?? Infinity));

  const examOptions = useMemo(
    () => normalizeExamList(activeClassData, activeComputed),
    [activeClassData, activeComputed],
  );
  const [selectedSubject, setSelectedSubject] = useState(
    () => classData.subjects?.[0] ?? "",
  );
  const [selectedStudentId, setSelectedStudentId] = useState(
    () => present[0]?.id ?? "",
  );

  useEffect(() => {
    if (selectedForm === "all" || !allClasses?.length) {
      setLocalFormWorkspace(null);
      return;
    }
    const targetForm = String(selectedForm).trim();
    const targetYear = String(classData.year || "").trim();
    const formClasses = allClasses.filter(
      (cls) =>
        String(cls.year || "").trim() === targetYear &&
        String(cls.form || "").trim() === targetForm
    );
    if (formClasses.length === 0) {
      setLocalFormWorkspace(null);
      return;
    }
    const anchorClass = formClasses[0];
    const workspace = buildFormWorkspace(
      formClasses,
      anchorClass,
      anchorClass.school_info?.exam || DEFAULT_EXAM_TYPE
    );
    setLocalFormWorkspace(workspace);
  }, [selectedForm, classData.year, allClasses]);

  // Hydrate all forms on mount or when allClasses changes
  useEffect(() => {
    if (!onHydrateClasses || !allClasses?.length) return;
    
    const targetYear = String(classData.year || "").trim();
    if (!targetYear) return;
    
    // Find all classes in this year that don't have students loaded
    const needsHydration = allClasses.filter(
      (cls) =>
        String(cls.year || "").trim() === targetYear &&
        !(cls.students?.length),
    );
    
    if (!needsHydration.length) {
      console.log("[ReportsPage] All forms already hydrated for year", targetYear);
      return;
    }
    
    console.log("[ReportsPage] Hydrating forms for year", targetYear, {
      classesNeedingHydration: needsHydration.map(c => ({ id: c.id, form: c.form, stream: c.stream })),
    });
    
    onHydrateClasses(needsHydration.map((cls) => cls.id)).catch((err) => {
      console.error("[ReportsPage] Hydration error:", err);
    });
  }, [allClasses, classData.year, onHydrateClasses]);

  useEffect(() => {
    setSelectedSubject(activeClassData.subjects?.[0] ?? "");
  }, [activeClassData.id, activeClassData.subjects]);

  useEffect(() => {
    if (!present.length) {
      setSelectedStudentId("");
      return;
    }
    if (!present.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(present[0].id);
    }
  }, [present, selectedStudentId]);

  const examSnapshots = useMemo(
    () =>
      examOptions.map((exam) => {
        const examComputed = buildExamComputed(
          activeClassData,
          exam,
          activeClassData.students ?? [],
        );
        const presentStudents = examComputed.filter(
          (student) => student.total !== null,
        );
        const ordered = presentStudents.sort(
          (a, b) => (a.posn ?? Infinity) - (b.posn ?? Infinity),
        );
        const avgTotal = averageOf(
          presentStudents.map((student) => Number(student.total || 0)),
        );
        return {
          exam,
          students: ordered,
          avgTotal,
          completeCount: presentStudents.length,
          topper: ordered[0] ?? null,
        };
      }),
    [activeClassData, examOptions],
  );

  const rankingHistory = useMemo(
    () =>
      examSnapshots.map((snapshot) => ({
        exam: snapshot.exam,
        avgTotal: snapshot.avgTotal,
        completeCount: snapshot.completeCount,
        leaders: snapshot.students.slice(0, 3).map((student) => ({
          id: student.id,
          name: student.name,
          posn: student.posn,
          avg: student.avg,
        })),
      })),
    [examSnapshots],
  );

  const selectedStudentHistory = useMemo(
    () =>
      examSnapshots
        .map((snapshot) => {
          const student = snapshot.students.find(
            (entry) => entry.id === selectedStudentId,
          );
          if (!student) return null;
          return {
            exam: snapshot.exam,
            posn: student.posn,
            avg: student.avg,
            total: student.total,
            div: student.div,
          };
        })
        .filter(Boolean),
    [examSnapshots, selectedStudentId],
  );

  const subjectTrend = useMemo(
    () =>
      examSnapshots.map((snapshot) => {
        const subjectIndex = (activeClassData.subjects ?? []).findIndex(
          (subject) => subject === selectedSubject,
        );
        const scores = snapshot.students
          .map((student) => student.scores?.[subjectIndex])
          .filter(
            (score) => score !== "" && score !== null && score !== undefined,
          )
          .map((score) => Number(score));
        return {
          exam: snapshot.exam,
          average: averageOf(scores),
          count: scores.length,
          peak: scores.length ? Math.max(...scores) : 0,
        };
      }),
    [activeClassData.subjects, examSnapshots, selectedSubject],
  );

  const formSections = useMemo(() => {
    const relevantClasses = (allClasses ?? []).filter(
      (entry) => entry.year === classData.year,
    );
    const grouped = new Map();
    relevantClasses.forEach((entry) => {
      const formKey = String(entry.form || "Other").trim() || "Other";
      if (!grouped.has(formKey)) grouped.set(formKey, []);
      grouped.get(formKey).push(entry);
    });
    return Array.from(grouped.entries())
      .map(([form, classes]) => {
        const sortedClasses = classes
          .slice()
          .sort((a, b) => String(a.stream || "").localeCompare(String(b.stream || ""), undefined, { numeric: true }));
        const anchor = sortedClasses[0] || null;
        const workspace = anchor
          ? buildFormWorkspace(sortedClasses, anchor, classData.school_info?.exam || DEFAULT_EXAM_TYPE)
          : { classData: null, computed: [] };
        const rankedStudents = (workspace.computed ?? []).filter((student) => student.total !== null);
        
        // DEBUG: Log form section data
        console.log(`[ReportsPage] Form Section: ${form}`, {
          form,
          streamCount: sortedClasses.length,
          classesInForm: sortedClasses.map(c => ({ id: c.id, stream: c.stream, studentCount: c.students?.length ?? 0 })),
          selectedExam: classData.school_info?.exam || DEFAULT_EXAM_TYPE,
          totalMergedStudents: workspace.classData?.students?.length ?? 0,
          computedRows: workspace.computed?.length ?? 0,
          rankedStudents: rankedStudents.length,
        });
        
        return {
          form,
          year: anchor?.year || classData.year,
          label: [form, anchor?.year].filter(Boolean).join(" ").trim(),
          streamCount: sortedClasses.length,
          studentCount: workspace.classData?.students?.length ?? 0,
          rankedCount: rankedStudents.length,
          avg: averageOf(rankedStudents.map((student) => Number(student.avg || 0))),
          exam: anchor?.school_info?.exam || DEFAULT_EXAM_TYPE,
          targetClassId: anchor?.id || "",
        };
      })
      .sort((a, b) => a.form.localeCompare(b.form, undefined, { numeric: true }));
  }, [allClasses, classData.school_info?.exam, classData.year]);

  const classComparison = useMemo(() => {
    const ordered = formSections
      .map((entry) => ({
        id: entry.targetClassId,
        name: entry.label,
        exam: entry.exam,
        avg: entry.avg,
        count: entry.rankedCount,
        form: entry.form,
      }))
      .sort((a, b) => b.avg - a.avg);
    const current = ordered.find((entry) => entry.form === activeClassData.form) ?? null;
    return {
      ordered,
      current,
      rank: current ? ordered.findIndex((entry) => entry.form === current.form) + 1 : null,
      best: ordered[0] ?? null,
    };
  }, [activeClassData.form, formSections]);

  const visibleFormSections = useMemo(() => {
    if (selectedForm === "all") return formSections;
    return formSections.filter((section) => section.form === selectedForm);
  }, [formSections, selectedForm]);

  const isCurrentFormActive = useCallback(
    (entry) =>
      String(entry.form || "").trim() === String(activeClassData.form || "").trim() &&
      String(entry.year || "").trim() === String(activeClassData.year || "").trim(),
    [activeClassData.form, activeClassData.year],
  );

  const waitForRender = () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );

  const buildClassReportFileName = () => {
    const safeClass =
      (activeClassData.name || t("reportsClassFallback", "class"))
        .replace(/[^a-z0-9-_ ]/gi, "")
        .trim() || t("reportsClassFallback", "class");
    return `${safeClass}-report-cards.pdf`;
  };

  const buildClassReportPdfBlob = async () => {
    let container = null;
    let root = null;
    try {
      const fileName = buildClassReportFileName();
      container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "0";
      container.style.top = "0";
      container.style.pointerEvents = "none";
      container.style.zIndex = "2147483647";
      container.style.width = "210mm";
      container.style.minHeight = "297mm";
      container.style.overflow = "hidden";
      container.style.background = "#fff";
      container.style.opacity = "1";
      document.body.appendChild(container);
      root = createRoot(container);

      const pdf = new jsPDF({
        orientation: REPORT_CARD_ORIENTATION,
        unit: "mm",
        format: REPORT_CARD_PAPER_SIZE,
        compress: true,
      });

      for (let index = 0; index < present.length; index += 1) {
        const student = present[index];
        flushSync(() => {
          root.render(
            <div
              style={{
                width: "210mm",
                minHeight: "297mm",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                background: "#fff",
              }}
            >
              <ReportCardPrint
                student={student}
                classData={activeClassData}
                template={template}
                paperSize={REPORT_CARD_PAPER_SIZE}
                orientation={REPORT_CARD_ORIENTATION}
              />
            </div>,
          );
        });

        await waitForRenderStability(container);
        const pageElement = container.firstChild;
        if (!pageElement) {
          throw new Error("Report card export page did not render.");
        }

        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: pageElement.scrollWidth,
          windowHeight: pageElement.scrollHeight,
        });
        const imageData = canvas.toDataURL("image/png");

        if (index > 0) {
          pdf.addPage(REPORT_CARD_PAPER_SIZE, REPORT_CARD_ORIENTATION);
        }
        pdf.addImage(imageData, "PNG", 0, 0, 210, 297, undefined, "FAST");
      }

      const blob = pdf.output("blob");
      return { blob, fileName };
    } finally {
      if (root) root.unmount();
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };

  const exportAllZip = async () => {
    if (exportingZip || !present.length) return;
    setExportingZip(true);
    setExportError("");
    try {
      const zip = new JSZip();
      for (const student of present) {
        let container = null;
        let root = null;
        try {
          container = document.createElement("div");
          container.style.position = "fixed";
          container.style.left = "0";
          container.style.top = "0";
          container.style.pointerEvents = "none";
          container.style.zIndex = "-1";
          container.style.width = "210mm";
          container.style.background = "#fff";
          document.body.appendChild(container);
          root = createRoot(container);

          flushSync(() => {
            root.render(
              <div style={{ width: "210mm", background: "#fff" }}>
                <div className="report-card-page">
                  <ReportCardPrint
                    student={student}
                    classData={activeClassData}
                    template={template}
                    paperSize={REPORT_CARD_PAPER_SIZE}
                    orientation={REPORT_CARD_ORIENTATION}
                  />
                </div>
              </div>,
            );
          });

          const exportNode = container.firstChild;
          await waitForRender();
          validatePdfExportElement(exportNode);
          const blob = await exportElementToPdfBlob(exportNode, {
            fileName: `${student.name || "student"}-report-card.pdf`,
            format: REPORT_CARD_PAPER_SIZE,
            orientation: REPORT_CARD_ORIENTATION,
            margin: 0,
            pagebreak: { mode: ["css", "legacy"] },
          });
          const safeName = String(student.name || student.cno || student.id || "student")
            .replace(/[^\w.-]+/g, "_")
            .replace(/^_+|_+$/g, "");
          zip.file(`${String(student.posn || "").padStart(3, "0")}-${safeName}-report-card.pdf`, blob);
        } finally {
          if (root) root.unmount();
          if (container?.parentNode) container.parentNode.removeChild(container);
        }
      }
      const classSlug = getClassLabel(activeClassData)
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${classSlug || "class"}-report-cards.zip`);
    } catch (error) {
      console.error("Zip PDF export failed:", error);
      setExportError(
        t(
          "reportsPdfExportFailed",
          "PDF export failed. Please check internet/images and try again.",
        ),
      );
    } finally {
      setExportingZip(false);
    }
  };

  const exportAllPdf = async () => {
    if (exportingZip || !present.length) return;
    setExportingZip(true);
    setExportError("");
    try {
      const { blob, fileName } = await buildClassReportPdfBlob();
      saveAs(blob, fileName);
    } catch (error) {
      console.error("Bulk PDF export failed:", error);
      setExportError(
        t(
          "reportsPdfExportFailed",
          "PDF export failed. Please check internet/images and try again.",
        ),
      );
    } finally {
      setExportingZip(false);
    }
  };

  const previewPdf = async () => {
    if (exportingZip || !present.length) return;
    setExportingZip(true);
    setExportError("");
    let previewUrl = null;
    let previewOpened = false;
    try {
      const { blob, fileName } = await buildClassReportPdfBlob();
      previewUrl = URL.createObjectURL(blob);
      const cleanupPreviewUrl = () => {
        if (!previewUrl) return;
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
      };
      const previewWindow = window.open(previewUrl, "_blank", "noopener,noreferrer");
      if (!previewWindow) {
        saveAs(blob, fileName);
        cleanupPreviewUrl();
      } else {
        previewOpened = true;
        const openedAt = Date.now();
        const revokeWhenClosed = () => {
          if (!previewUrl) return;
          const exceededLifetime = Date.now() - openedAt >= PREVIEW_URL_MAX_LIFETIME_30_MIN_MS;
          if (previewWindow.closed || exceededLifetime) {
            cleanupPreviewUrl();
            return;
          }
          setTimeout(revokeWhenClosed, PREVIEW_URL_CHECK_INTERVAL_MS);
        };
        setTimeout(revokeWhenClosed, PREVIEW_URL_CHECK_INTERVAL_MS);
      }
    } catch (error) {
      console.error("PDF preview failed:", error);
      setExportError(
        t(
          "reportsPdfExportFailed",
          "PDF export failed. Please check internet/images and try again.",
        ),
      );
      if (previewUrl && !previewOpened) URL.revokeObjectURL(previewUrl);
    } finally {
      setExportingZip(false);
    }
  };

  const currentAvg = averageOf(
    present.map((student) => Number(student.avg || 0)),
  );

  const selectStyle = { ...fieldStyle(), width: "100%" };

  const filterBtn = (value, label) => {
    const active = selectedForm === value;
    return (
      <button key={value} type="button" onClick={() => setSelectedForm(value)} style={{
        padding: "5px 12px", fontSize: 12, fontWeight: active ? 600 : 400, borderRadius: 6,
        border: active ? "1px solid #0f2d6e" : "1px solid #e2e8f0",
        background: active ? "#0f2d6e" : "#fff", color: active ? "#fff" : "#475569", cursor: "pointer",
      }}>{label}</button>
    );
  };

  const actionBtn = (label, onClick, opts = {}) => {
    const { primary, green, disabled: d } = opts;
    return (
      <button type="button" onClick={onClick} disabled={d} style={{
        padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: d ? "not-allowed" : "pointer",
        border: primary || green ? "none" : "1px solid #e2e8f0", opacity: d ? 0.5 : 1,
        background: green ? "#0b6b3a" : primary ? "#0f2d6e" : "#fff",
        color: primary || green ? "#fff" : "#0f172a",
        flex: isMobile ? "1 1 100%" : "0 0 auto",
      }}>{label}</button>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 12px 28px" : "20px 24px 32px", fontFamily: premiumFontStack, background: "#f8f9fb", minHeight: 0 }}>
      <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gap: isMobile ? 14 : 18 }}>

        {/* Form Reports Browser */}
        <div style={{ ...sectionStyle, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: displayFontStack, fontSize: isMobile ? 20 : 24, fontWeight: 500, color: "#0f172a", margin: 0 }}>
                Browse Report Cards by Form
              </h1>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                Select a form to view all students and their report cards. Includes all streams in the same ranking.
              </p>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {filterBtn("all", "All Forms")}
              {formSections.map((s) => filterBtn(s.form, s.form))}
            </div>
          </div>

          {visibleFormSections.length ? visibleFormSections.map((section) => {
            const active = selectedForm === section.form;
            return (
              <div key={section.form} style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{section.form}</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {section.streamCount} stream{section.streamCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div style={{ border: active ? "1px solid #0f2d6e" : "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: active ? "#f8faff" : "#fff", display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{section.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{section.exam}</div>
                    </div>
                    {active ? <span style={{ fontSize: 11, fontWeight: 500, color: "#10b981", background: "#ecfdf5", borderRadius: 4, padding: "2px 7px" }}>Selected</span> : null}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
                    <span>{section.studentCount} students</span>
                    <span>{section.rankedCount} ranked</span>
                    <span>Avg {section.avg ? section.avg.toFixed(1) : "0.0"}</span>
                  </div>
                  {!active && section.targetClassId ? (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => setSelectedForm(section.form)} style={{
                        padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none",
                        background: "#0f2d6e", color: "#fff", cursor: "pointer",
                      }}>View Report Cards</button>
                    </div>
                  ) : active ? (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>Currently viewing</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }) : (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              No form report sections are available yet.
            </div>
          )}
        </div>

        {selectedForm === "all" ? (
          <div style={{ ...sectionStyle, color: "#64748b", fontSize: 13, textAlign: "center", padding: 24 }}>
            Select a form above to view report cards.
          </div>
        ) : (
        <>
        {/* Report Card Center */}
        <div style={{ ...sectionStyle, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontFamily: displayFontStack, fontSize: isMobile ? 18 : 22, fontWeight: 500, color: "#0f172a", margin: 0 }}>
                {t("reportsCenterTitle", "Report Card Center")}
              </h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                {schoolInfo.name} &middot; {getClassLabel(activeClassData)} &middot; {schoolInfo.exam || DEFAULT_EXAM_TYPE}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "stretch" : "flex-end" }}>
              {actionBtn(t("reportsPreviewPdf", "Preview PDF"), previewPdf, { disabled: !present.length })}
              {actionBtn(exportingZip ? t("reportsPreparingPdf", "Preparing PDF...") : t("reportsDownloadAllPdfs", "Download all PDFs"), exportAllPdf, { primary: true, disabled: exportingZip || !present.length })}
              {actionBtn(exportingZip ? t("reportsPreparingPdf", "Preparing PDF...") : t("reportsExportAllZip", "Download ZIP"), exportAllZip, { green: true, disabled: exportingZip || !present.length })}
            </div>
          </div>

          {exportError && (
            <div style={{ fontSize: 12, color: "#b91c1c", background: "#fff1f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px" }}>
              {exportError}
            </div>
          )}

          <div style={{ display: "flex", gap: isMobile ? 12 : 20, flexWrap: "wrap", fontSize: 13, color: "#64748b" }}>
            <span><strong style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{present.length}</strong> students reported</span>
            <span><strong style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{currentAvg.toFixed(1)}</strong> class average</span>
            <span><strong style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{classComparison.rank || "-"}</strong> year rank</span>
            {present[0] ? <span>Top: <strong style={{ fontWeight: 600, color: "#0f172a" }}>{present[0].name}</strong> ({present[0].avg})</span> : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>
                {t("reportsExam", "Exam")}
              </label>
              <select
                value={classData.school_info?.exam || DEFAULT_EXAM_TYPE}
                onChange={(e) => onChangeExam?.(e.target.value)}
                style={selectStyle}
                disabled={!onChangeExam}
              >
                {examOptions.map((exam) => <option key={exam} value={exam}>{exam}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>
                {t("reportsTemplate", "Template")}
              </label>
              <select value={template} onChange={(e) => setTemplate(e.target.value)} style={selectStyle}>
                {TEMPLATE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>
                {t("reportsPaperSize", "Paper Size")}
              </label>
              <div style={{ ...selectStyle, background: "#f8fafc", color: "#0f172a", fontWeight: 500 }}>A4</div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>
                {t("reportsOrientation", "Orientation")}
              </label>
              <div style={{ ...selectStyle, background: "#f8fafc", color: "#0f172a", fontWeight: 500 }}>{t("reportsPortrait", "Portrait")}</div>
            </div>
          </div>
        </div>

        {/* Ranking History + Subject Trends */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.1fr 0.9fr", gap: isMobile ? 14 : 18 }}>
          <div style={{ ...sectionStyle, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{t("reportsRankingHistory", "Ranking History")}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("reportsRankingHistorySub", "Track rank changes across all recorded exam types in this class.")}</div>
              </div>
              <div style={{ minWidth: isMobile || isTablet ? "100%" : 220 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>
                  {t("reportsSelectedStudent", "Selected Student")}
                </label>
                <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} style={selectStyle}>
                  {present.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {rankingHistory.map((snapshot) => (
                <div key={snapshot.exam} style={{ border: "1px solid #f1f5f9", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{snapshot.exam}</span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      {t("reportsAvgTotalRanked", "Avg total {avg} • {count} ranked students", { avg: snapshot.avgTotal.toFixed(1), count: snapshot.completeCount })}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {snapshot.leaders.length ? snapshot.leaders.map((leader) => (
                      <span key={leader.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "#0f172a" }}>
                        {t("reportsLeaderChip", "#{posn} {name} • Avg {avg}", { posn: leader.posn, name: leader.name, avg: leader.avg })}
                      </span>
                    )) : (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{t("reportsNoExamRankings", "No complete rankings for this exam yet.")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
                {t("reportsSelectedStudentTrend", "Selected Student Trend")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                {selectedStudentHistory.length ? selectedStudentHistory.map((entry) => (
                  <div key={entry.exam} style={{ background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9", padding: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{entry.exam}</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>#{entry.posn}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {t("reportsAvgTotal", "Avg {avg} • Total {total}", { avg: entry.avg, total: entry.total })}
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {t("reportsNoStudentHistory", "The selected student has not completed enough exams to show history yet.")}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ ...sectionStyle, display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{t("reportsSubjectTrends", "Subject Trends")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t("reportsSubjectTrendsSub", "See how one subject performs across the class exam history.")}</div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>
                {t("reportsSubject", "Subject")}
              </label>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} style={selectStyle}>
                {(activeClassData.subjects ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {subjectTrend.map((entry) => {
                const width = Math.max(8, Math.min(100, entry.average));
                return (
                  <div key={entry.exam} style={{ display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "#475569" }}>
                      <span style={{ fontWeight: 500 }}>{entry.exam}</span>
                      <span>{t("reportsAvgMarks", "Avg {avg} • {count} marks", { avg: entry.average.toFixed(1), count: entry.count })}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ width: `${width}%`, height: "100%", background: "#0f2d6e", borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
                {t("reportsClassComparison", "Class Comparison")}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {classComparison.ordered.length ? classComparison.ordered.slice(0, 5).map((entry, index) => (
                  <div key={entry.id} style={{
                    display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center",
                    padding: "8px 12px", border: "1px solid #f1f5f9", borderRadius: 8,
                    background: entry.id === activeClassData.id ? "#f8faff" : "#fff",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>#{index + 1} {entry.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{t("reportsExamStudents", "{exam} • {count} students", { exam: entry.exam, count: entry.count })}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{entry.avg.toFixed(1)}</div>
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{t("reportsNoPeerClasses", "No peer classes available for comparison in this year.")}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Printable Report Templates */}
        {!present.length ? (
          <div style={{ ...sectionStyle, padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {t("reportsNoScoredStudents", "No scored students yet. Enter student scores to generate report cards.")}
          </div>
        ) : (
          <div style={{ ...sectionStyle, display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{t("reportsPrintableTemplates", "Printable Report Templates")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t("reportsPrintableTemplatesSub", "Preview and export individual student cards using the selected template. Student report cards are fixed to A4 portrait.")}</div>
            </div>

            {isMobile ? (
              <div style={{ display: "grid", gap: 6 }}>
                {present.map((student, index) => (
                  <div key={student.id} style={{ border: "1px solid #f1f5f9", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", minWidth: 34 }}>No. {student.posn ?? index + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{student.name}</span>
                      </div>
                      <button onClick={() => onOpenReportCard(student)} style={{ padding: "3px 10px", background: "#0f2d6e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 500 }}>
                        {t("reportsView", "View")}
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 11, color: "#64748b" }}>
                      <span style={{ fontFamily: "monospace" }}>CNO: {student.displayIndexNo ?? student.index_no ?? student.indexNo ?? "-"}</span>
                      <span>{t("reportsTotal", "Total")}: <strong>{student.total ?? "-"}</strong></span>
                      <span>{t("analysisAvg", "Avg")}: <strong>{student.avg ?? "-"}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {[t("reportsPosition", "Position"), "CNO", t("reportsName", "Name"), t("reportsSex", "Sex"), t("reportsTotal", "Total"), t("analysisAvg", "Avg"), t("reportsTemplate", "Template"), t("reportsReportCard", "Report Card")].map((label) => (
                        <th key={label} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {present.map((student, index) => (
                      <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "7px 10px", color: "#64748b" }}>{student.posn ?? index + 1}</td>
                        <td style={{ padding: "7px 10px", fontFamily: "monospace", color: "#475569" }}>{student.displayIndexNo ?? student.index_no ?? student.indexNo ?? ""}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 500, color: "#0f172a" }}>{student.name}</td>
                        <td style={{ padding: "7px 10px", color: "#64748b" }}>{student.sex === "F" ? "F" : "M"}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: "#0f172a" }}>{student.total ?? "-"}</td>
                        <td style={{ padding: "7px 10px", color: "#475569" }}>{student.avg ?? "-"}</td>
                        <td style={{ padding: "7px 10px", color: "#64748b" }}>{(template === "compact" ? t("reportsTemplateCompact", "Compact") : t("reportsTemplateOfficial", "Official")) + " · A4"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center" }}>
                          <button onClick={() => onOpenReportCard(student)} style={{ padding: "3px 10px", background: "#0f2d6e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 500 }}>
                            {t("reportsView", "View")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
