import React, { useState, useEffect } from "react";
import {
  DEFAULT_SCHOOL,
  EXAM_TYPES,
  MONTHS,
  COMPOSITE_EXAM_CONFIG,
} from "../utils/constants";
import { updateExportBranding } from "../utils/exportBranding";
import { validateSchoolInfo } from "../utils/validation";
import { TextInput, SelectInput } from "./FormInputs";
import { useViewport } from "../utils/useViewport";
import { useI18n } from "../i18n";
import { normalizeTzPhoneListInline } from "../utils/phone";

function TinyIcon({ children }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {children}
    </svg>
  );
}

export function SettingsPage({
  classData,
  schoolSettings,
  onUpdateClassMeta,
  onUpdateSchool,
  onSaveSchoolSettings,
  onUpdateSubjects,
  onUpdateMonthlyExams,
  onUpdateCompositeConfig,
  onDeleteClass,
  onArchiveClass,
  onRestoreClass,
  onPublishClass,
  onUnpublishClass,
  onExportBackup,
  onImportBackup,
  auditLogs,
  onLoadAuditLog,
}) {
  const { isMobile } = useViewport();
  const { t } = useI18n();
  const subjects = classData.subjects ?? [];
  const subjectMetadata = Array.isArray(classData.subject_metadata)
    ? classData.subject_metadata
    : Array.isArray(classData.subjectMetadata)
    ? classData.subjectMetadata
    : [];
  const resultsLocked = Boolean(classData.published);
  const subjectTypeOptions = [
    { label: t("compulsory", "Compulsory"), value: "compulsory" },
    { label: t("optional", "Optional"), value: "optional" },
  ];

  // Class name & year/form state
  const [className, setClassName] = useState(classData.name ?? "");
  const [classYear, setClassYear] = useState(classData.year ?? "");
  const [classForm, setClassForm] = useState(classData.form ?? "Form I");
  const [classStream, setClassStream] = useState(classData.stream ?? "A");
  const [metaError, setMetaError] = useState("");
  const [updatingMeta, setUpdatingMeta] = useState(false);

  // School info state
  const [schoolInfo, setSchoolInfo] = useState({
    ...DEFAULT_SCHOOL,
    ...(schoolSettings ?? {}),
    academicPhone: normalizeTzPhoneListInline(schoolSettings?.academicPhone ?? DEFAULT_SCHOOL.academicPhone),
    headmasterPhone: normalizeTzPhoneListInline(schoolSettings?.headmasterPhone ?? DEFAULT_SCHOOL.headmasterPhone),
  });
  const [schoolErrors, setSchoolErrors] = useState({});
  const [updatingSchool, setUpdatingSchool] = useState(false);
  const [reportContext, setReportContext] = useState({
    term: classData.school_info?.term ?? DEFAULT_SCHOOL.term,
    exam: classData.school_info?.exam ?? DEFAULT_SCHOOL.exam,
    year: classData.school_info?.year ?? classData.year ?? DEFAULT_SCHOOL.year,
  });
  const [updatingReportContext, setUpdatingReportContext] = useState(false);

  // Subjects state
  const [subjectInput, setSubjectInput] = useState("");
  const [subjectTypeInput, setSubjectTypeInput] = useState("compulsory");
  const [subjectError, setSubjectError] = useState("");
  const [updatingSubjects, setUpdatingSubjects] = useState(false);

  // Monthly exams state
  const [monthlyExams, setMonthlyExams] = useState(
    Array.isArray(classData.monthly_exams) ? classData.monthly_exams : [],
  );
  const [updatingMonthlyExams, setUpdatingMonthlyExams] = useState(false);

  // Composite exam config state — keyed by composite exam value, value is partnerExam string
  const [compositeConfig, setCompositeConfig] = useState(
    classData.composite_config ?? {},
  );
  const [updatingComposite, setUpdatingComposite] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);

  // Sync state when classData changes (e.g. switching active class)
  useEffect(() => {
    setClassName(classData.name ?? "");
    setClassYear(classData.year ?? "");
    setClassForm(classData.form ?? "Form I");
    setClassStream(classData.stream ?? "A");
    setSchoolInfo({
      ...DEFAULT_SCHOOL,
      ...(schoolSettings ?? {}),
      academicPhone: normalizeTzPhoneListInline(schoolSettings?.academicPhone ?? DEFAULT_SCHOOL.academicPhone),
      headmasterPhone: normalizeTzPhoneListInline(schoolSettings?.headmasterPhone ?? DEFAULT_SCHOOL.headmasterPhone),
    });
    setSchoolErrors({});
    setMetaError("");
    setMonthlyExams(
      Array.isArray(classData.monthly_exams) ? classData.monthly_exams : [],
    );
    setCompositeConfig(classData.composite_config ?? {});
    setReportContext({
      term: classData.school_info?.term ?? DEFAULT_SCHOOL.term,
      exam: classData.school_info?.exam ?? DEFAULT_SCHOOL.exam,
      year:
        classData.school_info?.year ?? classData.year ?? DEFAULT_SCHOOL.year,
    });
  }, [classData.id, classData.stream, schoolSettings]);

  const handleUpdateMeta = async () => {
    const yearStr = String(classYear).trim();
    if (!/^[0-9]{4}$/.test(yearStr)) {
      setMetaError(t("settingsYearMustBe4Digits", "Year must be 4 digits"));
      return;
    }
    if (!classForm || !String(classForm).trim()) {
      setMetaError(t("settingsFormRequired", "Form is required"));
      return;
    }
    if (!classStream || !String(classStream).trim()) {
      setMetaError("Stream is required");
      return;
    }
    const nameStr = className.trim();
    if (!nameStr) {
      setMetaError(t("settingsClassNameRequired", "Class name is required"));
      return;
    }
    setMetaError("");
    setUpdatingMeta(true);
    await onUpdateClassMeta?.({
      year: yearStr,
      form: classForm,
      stream: classStream,
      name: nameStr,
    });
    setUpdatingMeta(false);
  };

  const handleUpdateSchool = async () => {
    const validation = validateSchoolInfo(schoolInfo);
    if (!validation.valid) {
      setSchoolErrors(validation.errors);
      return;
    }
    setSchoolErrors({});
    setUpdatingSchool(true);
    await onSaveSchoolSettings?.(schoolInfo);
    setUpdatingSchool(false);
  };

  const handleUpdateReportContext = async () => {
    setUpdatingReportContext(true);
    await onUpdateSchool?.({
      ...classData.school_info,
      term: reportContext.term,
      exam: reportContext.exam,
      year: reportContext.year,
    });
    setUpdatingReportContext(false);
  };

  const cleanSubject = (value) => String(value ?? "").trim();
  const buildSubjectMetadata = (nextSubjects, overrides = {}) => {
    const byName = new Map(
      subjectMetadata.flatMap((entry) => {
        const name = cleanSubject(entry?.name || entry?.subject || "");
        if (!name) return [];
        return [[name.toLowerCase(), { name, type: entry?.type === "optional" ? "optional" : "compulsory" }]];
      }),
    );
    return nextSubjects.map((subject) => {
      const normalized = cleanSubject(subject);
      const override = overrides[normalized.toLowerCase()];
      if (override) {
        return { name: normalized, type: override };
      }
      return byName.get(normalized.toLowerCase()) || { name: normalized, type: "compulsory" };
    });
  };
  const getSubjectType = (subject) =>
    buildSubjectMetadata(subjects).find(
      (entry) => entry.name.toLowerCase() === cleanSubject(subject).toLowerCase(),
    )?.type || "compulsory";

  const handleAddSubject = async () => {
    if (resultsLocked) return;
    const next = cleanSubject(subjectInput);
    if (!next) {
      setSubjectError(
        t("settingsSubjectNameRequired", "Subject name is required"),
      );
      return;
    }
    if (subjects.some((s) => s.toLowerCase() === next.toLowerCase())) {
      setSubjectError(
        t("settingsSubjectAlreadyExists", "Subject already exists"),
      );
      return;
    }
    setSubjectError("");
    const nextSubjects = [...subjects, next];
    const nextMetadata = buildSubjectMetadata(nextSubjects, {
      [next.toLowerCase()]: subjectTypeInput,
    });
    setUpdatingSubjects(true);
    await onUpdateSubjects?.(nextSubjects, nextMetadata);
    setUpdatingSubjects(false);
    setSubjectInput("");
    setSubjectTypeInput("compulsory");
  };

  const handleRemoveSubject = async (subject) => {
    if (resultsLocked) return;
    if (
      !window.confirm(
        t(
          "settingsConfirmRemoveSubject",
          'Remove "{subject}"? Existing scores will be hidden.',
          { subject },
        ),
      )
    )
      return;
    const next = subjects.filter((s) => s !== subject);
    const nextMetadata = buildSubjectMetadata(next);
    setUpdatingSubjects(true);
    await onUpdateSubjects?.(next, nextMetadata);
    setUpdatingSubjects(false);
  };

  const handleMoveSubject = async (index, direction) => {
    if (resultsLocked) return;
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= subjects.length) return;
    const next = [...subjects];
    [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
    const nextMetadata = buildSubjectMetadata(next);
    setUpdatingSubjects(true);
    await onUpdateSubjects?.(next, nextMetadata);
    setUpdatingSubjects(false);
  };

  const handleUpdateSubjectType = async (subject, type) => {
    if (resultsLocked) return;
    const nextMetadata = buildSubjectMetadata(subjects, {
      [cleanSubject(subject).toLowerCase()]: type === "optional" ? "optional" : "compulsory",
    });
    setUpdatingSubjects(true);
    await onUpdateSubjects?.(subjects, nextMetadata);
    setUpdatingSubjects(false);
  };

  const handleToggleMonthlyExam = async (month) => {
    if (resultsLocked) return;
    const next = monthlyExams.includes(month)
      ? monthlyExams.filter((m) => m !== month)
      : [...monthlyExams, month];
    // Keep months in calendar order
    const ordered = MONTHS.filter((m) => next.includes(m));
    setMonthlyExams(ordered);
    setUpdatingMonthlyExams(true);
    await onUpdateMonthlyExams?.(ordered);
    setUpdatingMonthlyExams(false);
  };

  const handleUpdateCompositeConfig = async () => {
    if (resultsLocked) return;
    setUpdatingComposite(true);
    await onUpdateCompositeConfig?.(compositeConfig);
    setUpdatingComposite(false);
  };

  const compositeExamKeys = Object.keys(COMPOSITE_EXAM_CONFIG);

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? 10 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      minHeight: 0,
    },
    section: {
      background: "#fff",
      border: "1px solid #d0dcf8",
      borderRadius: 10,
      padding: isMobile ? 12 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 800,
      color: "#003366",
      marginBottom: 2,
    },
    sectionSub: {
      fontSize: 10,
      color: "#667",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 10,
    },
    row: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
    },
    input: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      height: 30,
      minWidth: isMobile ? 0 : 120,
      width: isMobile ? "100%" : "auto",
      fontSize: 12,
    },
    select: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      height: 30,
      minWidth: isMobile ? 0 : 120,
      width: isMobile ? "100%" : "auto",
      fontSize: 12,
      background: "#fff",
    },
    saveBtn: {
      padding: "6px 14px",
      height: 30,
      borderRadius: 6,
      border: "none",
      background: "#0b6b3a",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 12,
    },
    subjectList: {
      display: "grid",
      gap: 8,
    },
    subjectTableHeader: {
      display: isMobile ? "none" : "grid",
      gridTemplateColumns: "minmax(180px, 1fr) 180px auto",
      gap: 12,
      alignItems: "center",
      padding: "0 12px 6px",
    },
    subjectHeaderLabel: {
      fontSize: 10,
      fontWeight: 800,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.12em",
    },
    subjectCard: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "minmax(180px, 1fr) 180px auto",
      alignItems: isMobile ? "stretch" : "center",
      gap: 12,
      background: "#fbfdff",
      border: "1px solid #dbe6fb",
      borderRadius: 12,
      padding: isMobile ? "12px" : "10px 12px",
      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.035)",
    },
    subjectIdentity: {
      display: "grid",
      gap: 6,
      minWidth: 0,
    },
    subjectName: {
      fontSize: 14,
      fontWeight: 800,
      color: "#0f172a",
      letterSpacing: "0.01em",
    },
    subjectBadgeRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    subjectBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
    },
    subjectHint: {
      fontSize: 10,
      color: "#64748b",
      lineHeight: 1.5,
    },
    subjectTypeWrap: {
      display: "grid",
      gap: 5,
      minWidth: isMobile ? 0 : 180,
    },
    subjectTypeLabel: {
      fontSize: 10,
      fontWeight: 700,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    subjectActions: {
      display: "flex",
      alignItems: "center",
      justifyContent: isMobile ? "space-between" : "flex-end",
      gap: 8,
      flexWrap: isMobile ? "wrap" : "nowrap",
    },
    subjectMoveGroup: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: 4,
      borderRadius: 999,
      background: "#eff5ff",
      border: "1px solid #d8e4fb",
    },
    subjectRemove: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "#fff7f5",
      color: "#b42318",
      border: "1px solid #f0d0ca",
      borderRadius: 999,
      padding: "7px 10px",
      fontSize: 11,
      fontWeight: 800,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    subjectArrow: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#ffffff",
      color: "#1d4ed8",
      border: "1px solid #cfdbf7",
      borderRadius: 999,
      width: 30,
      height: 30,
      padding: 0,
      cursor: "pointer",
      lineHeight: 1,
    },
    subjectAddRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "minmax(180px, 1fr) auto auto",
      gap: 10,
      alignItems: "end",
      padding: isMobile ? "12px" : "12px 14px",
      borderRadius: 14,
      border: "1px dashed #c5d5f5",
      background: "#f8fbff",
    },
    subjectAddField: {
      display: "grid",
      gap: 5,
    },
    subjectAddLabel: {
      fontSize: 10,
      fontWeight: 700,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    subjectAddBtn: {
      padding: "0 14px",
      height: 34,
      borderRadius: 10,
      border: "none",
      background: "#003366",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: 12,
    },
    subjectInput: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      height: 30,
      minWidth: isMobile ? 0 : 160,
      width: isMobile ? "100%" : "auto",
      fontSize: 12,
    },
    deleteBtn: {
      padding: "8px 16px",
      background: "#8b2500",
      color: "#fff",
      border: "none",
      borderRadius: 7,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
    },
    errMsg: {
      fontSize: 10,
      color: "#8b2500",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.panel}>
      {resultsLocked ? (
        <div
          style={{
            background: "#fff1f2",
            border: "1px solid #f5c2c7",
            color: "#9f1239",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Results are published for this class. Unpublish them before changing subjects, monthly exams, or composite exam setup.
        </div>
      ) : null}
      <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800 }}>
        ⚙️ {t("settingsTitle", "Settings")}
      </h3>

      {/* Class name / year / form */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>
            {t("settingsClassIdentity", "Class Identity")}
          </div>
          <div style={styles.sectionSub}>
            {t(
              "settingsClassIdentitySub",
              "Name, year, and form used to organize classes in the sidebar.",
            )}
          </div>
        </div>
        <div
          style={{
            ...styles.grid2,
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t("settingsClassName", "Class Name")}
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Form II 2025"
              style={styles.input}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t("settingsYear", "Year")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 2025"
              value={classYear}
              onChange={(e) => setClassYear(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t("settingsForm", "Form")}
            </label>
            <select
              value={classForm}
              onChange={(e) => setClassForm(e.target.value)}
              style={styles.select}
            >
              <option value="Form I">Form I</option>
              <option value="Form II">Form II</option>
              <option value="Form III">Form III</option>
              <option value="Form IV">Form IV</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Stream
            </label>
            <input
              type="text"
              value={classStream}
              onChange={(e) => setClassStream(String(e.target.value || "").toUpperCase())}
              placeholder="e.g. A"
              style={styles.input}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            style={styles.saveBtn}
            onClick={handleUpdateMeta}
            disabled={updatingMeta}
          >
            {updatingMeta ? t("saving", "Saving…") : t("save", "Save")}
          </button>
          {metaError && <div style={styles.errMsg}>{metaError}</div>}
        </div>
      </div>

      {/* Global school settings */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>
            {t("settingsSchoolSettings", "School Settings")}
          </div>
          <div style={styles.sectionSub}>
            {t(
              "settingsSchoolSettingsSub",
              "Whole-school identity, contacts, and export branding used across the project.",
            )}
          </div>
        </div>
        <div style={styles.grid2}>
          <TextInput
            label="School Name"
            value={schoolInfo.name}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, name: v })}
            error={schoolErrors.name}
          />
          <TextInput
            label="Authority"
            value={schoolInfo.authority}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, authority: v })}
            error={schoolErrors.authority}
          />
          <TextInput
            label="Region"
            value={schoolInfo.region}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, region: v })}
            error={schoolErrors.region}
          />
          <TextInput
            label="District"
            value={schoolInfo.district}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, district: v })}
            error={schoolErrors.district}
          />
          <TextInput
            label="Academic Officer Phone"
            value={schoolInfo.academicPhone ?? ""}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, academicPhone: normalizeTzPhoneListInline(v) })}
            type="tel"
            inputMode="tel"
            placeholder="255712345678, 255754321000"
          />
          <TextInput
            label="Headmaster Phone"
            value={schoolInfo.headmasterPhone ?? ""}
            onChange={(v) =>
              setSchoolInfo({ ...schoolInfo, headmasterPhone: normalizeTzPhoneListInline(v) })
            }
            type="tel"
            inputMode="tel"
            placeholder="255712345678, 255754321000"
          />
        </div>
        <div>
          <div style={styles.sectionTitle}>
            {t("settingsExportBranding", "Export Branding")}
          </div>
          <div style={styles.sectionSub}>
            {t(
              "settingsExportBrandingSub",
              "Controls the logos and header text used by result sheet and report card exports.",
            )}
          </div>
        </div>
        <div style={styles.grid2}>
          <TextInput
            label="Left Logo URL"
            value={schoolInfo.export_branding?.leftLogoSrc ?? ""}
            onChange={(v) =>
              setSchoolInfo(
                updateExportBranding(schoolInfo, { leftLogoSrc: v }),
              )
            }
          />
          <TextInput
            label="Right Logo URL"
            value={schoolInfo.export_branding?.rightLogoSrc ?? ""}
            onChange={(v) =>
              setSchoolInfo(
                updateExportBranding(schoolInfo, { rightLogoSrc: v }),
              )
            }
          />
          <TextInput
            label="Header Name Override"
            value={schoolInfo.export_branding?.headerName ?? ""}
            onChange={(v) =>
              setSchoolInfo(updateExportBranding(schoolInfo, { headerName: v }))
            }
          />
          <TextInput
            label="Header Subtitle Override"
            value={schoolInfo.export_branding?.headerSubtitle ?? ""}
            onChange={(v) =>
              setSchoolInfo(
                updateExportBranding(schoolInfo, { headerSubtitle: v }),
              )
            }
          />
          <TextInput
            label="Header Address Override"
            value={schoolInfo.export_branding?.headerAddress ?? ""}
            onChange={(v) =>
              setSchoolInfo(
                updateExportBranding(schoolInfo, { headerAddress: v }),
              )
            }
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            style={styles.saveBtn}
            onClick={handleUpdateSchool}
            disabled={updatingSchool}
          >
            {updatingSchool
              ? t("saving", "Saving…")
              : t("settingsSaveSchoolSettings", "Save School Settings")}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>
            {t("settingsReportContext", "Report Context")}
          </div>
          <div style={styles.sectionSub}>
            {t(
              "settingsReportContextSub",
              "These values stay with this class only and control its current report session.",
            )}
          </div>
        </div>
        <div style={styles.grid2}>
          <TextInput
            label="Term"
            value={reportContext.term}
            onChange={(v) => setReportContext((prev) => ({ ...prev, term: v }))}
          />
          <SelectInput
            label="Exam"
            value={reportContext.exam}
            onChange={(v) => setReportContext((prev) => ({ ...prev, exam: v }))}
            options={EXAM_TYPES}
          />
          <TextInput
            label="Academic Year"
            value={reportContext.year}
            onChange={(v) => setReportContext((prev) => ({ ...prev, year: v }))}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            style={styles.saveBtn}
            onClick={handleUpdateReportContext}
            disabled={updatingReportContext}
          >
            {updatingReportContext
              ? t("saving", "Saving…")
              : t("settingsSaveReportContext", "Save Report Context")}
          </button>
        </div>
      </div>

      {/* Subjects */}
      <div style={styles.section}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={styles.sectionTitle}>
              {t("settingsSubjects", "Subjects")}
            </div>
            <div style={styles.sectionSub}>
              {t(
                "settingsSubjectsSub",
                "Add or remove subjects. Student scores are remapped automatically.",
              )}
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#667" }}>
            {t("settingsSubjectCount", "{count} subjects", {
              count: subjects.length,
            })}
          </div>
        </div>
        <div style={styles.subjectList}>
          {!isMobile ? (
            <div style={styles.subjectTableHeader}>
              <div style={styles.subjectHeaderLabel}>
                {t("settingsSubjects", "Subjects")}
              </div>
              <div style={styles.subjectHeaderLabel}>
                {t("settingsSubjectType", "Subject Type")}
              </div>
              <div style={{ ...styles.subjectHeaderLabel, textAlign: "right" }}>
                {t("actions", "Actions")}
              </div>
            </div>
          ) : null}
          {subjects.length === 0 && (
            <div style={{ fontSize: 10, color: "#999" }}>
              {t("settingsNoSubjectsYet", "No subjects yet.")}
            </div>
          )}
          {subjects.map((subj, idx) => (
            <div key={subj} style={styles.subjectCard}>
              <div style={styles.subjectIdentity}>
                <div style={styles.subjectName}>{subj}</div>
                <div style={styles.subjectBadgeRow}>
                  <span
                    style={{
                      ...styles.subjectBadge,
                      background:
                        getSubjectType(subj) === "optional" ? "#fff7ed" : "#edf7ff",
                      color:
                        getSubjectType(subj) === "optional" ? "#b45309" : "#0f5fa8",
                      border: `1px solid ${
                        getSubjectType(subj) === "optional" ? "#fed7aa" : "#bfdbfe"
                      }`,
                    }}
                  >
                    {getSubjectType(subj) === "optional"
                      ? t("optional", "Optional")
                      : t("compulsory", "Compulsory")}
                  </span>
                  <span style={styles.subjectHint}>
                    {getSubjectType(subj) === "optional"
                      ? t("settingsOptionalSubjectHint", "Included only when a student takes it.")
                      : t("settingsCompulsorySubjectHint", "Included in every result and report export.")}
                  </span>
                </div>
              </div>
              <div style={styles.subjectTypeWrap}>
                <div style={{ ...styles.subjectTypeLabel, display: isMobile ? "block" : "none" }}>
                  {t("settingsSubjectType", "Subject Type")}
                </div>
                <select
                  value={getSubjectType(subj)}
                  onChange={(e) => handleUpdateSubjectType(subj, e.target.value)}
                  style={styles.select}
                  disabled={updatingSubjects}
                  title={t("settingsSubjectType", "Subject Type")}
                >
                  {subjectTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.subjectActions}>
                <div style={styles.subjectMoveGroup}>
                  <button
                    style={styles.subjectArrow}
                    onClick={() => handleMoveSubject(idx, -1)}
                    disabled={updatingSubjects || idx === 0}
                    title={t("settingsMoveUp", "Move up")}
                    aria-label={t("settingsMoveUp", "Move up")}
                  >
                    <TinyIcon>
                      <path
                        d="M7 3.25 3.75 6.5h2v4.25h2.5V6.5h2L7 3.25Z"
                        fill="currentColor"
                      />
                    </TinyIcon>
                  </button>
                  <button
                    style={styles.subjectArrow}
                    onClick={() => handleMoveSubject(idx, 1)}
                    disabled={updatingSubjects || idx === subjects.length - 1}
                    title={t("settingsMoveDown", "Move down")}
                    aria-label={t("settingsMoveDown", "Move down")}
                  >
                    <TinyIcon>
                      <path
                        d="M7 10.75 10.25 7.5h-2V3.25h-2.5V7.5h-2L7 10.75Z"
                        fill="currentColor"
                      />
                    </TinyIcon>
                  </button>
                </div>
                <button
                  style={styles.subjectRemove}
                  onClick={() => handleRemoveSubject(subj)}
                  disabled={updatingSubjects}
                  title={`Remove ${subj}`}
                >
                  <TinyIcon>
                    <path
                      d="M4.75 4.75h.9v5.1h-.9v-5.1Zm3.6 0h.9v5.1h-.9v-5.1Z"
                      fill="currentColor"
                    />
                    <path
                      d="M3 3.85h8v.9H3v-.9Zm1.15-1.6h5.7v.9h-5.7v-.9Zm.5 8.8V3.85h4.7v7.2H4.65Z"
                      stroke="currentColor"
                      strokeWidth="0.7"
                    />
                  </TinyIcon>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={styles.subjectAddRow}>
          <div style={styles.subjectAddField}>
            <div style={styles.subjectAddLabel}>
              {t("settingsAddSubject", "Add Subject")}
            </div>
            <input
              type="text"
              placeholder={t("settingsAddSubject", "Add subject")}
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSubject();
              }}
              style={styles.subjectInput}
            />
          </div>
          <div style={styles.subjectAddField}>
            <div style={styles.subjectAddLabel}>
              {t("settingsSubjectType", "Subject Type")}
            </div>
            <select
              value={subjectTypeInput}
              onChange={(e) => setSubjectTypeInput(e.target.value)}
              style={styles.select}
            >
              {subjectTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            style={styles.subjectAddBtn}
            onClick={handleAddSubject}
            disabled={updatingSubjects || !subjectInput.trim()}
          >
            {t("add", "Add")}
          </button>
        </div>
        {subjectError && <div style={styles.errMsg}>{subjectError}</div>}
      </div>

      {/* Monthly Exams */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>
            📅 {t("settingsMonthlyExams", "Monthly Exams")}
          </div>
          <div style={styles.sectionSub}>
            {t(
              "settingsMonthlyExamsSub1",
              "Select which months have a monthly exam available for this Form.",
            )}{" "}
            {t(
              "settingsMonthlyExamsSub2",
              "Enabled months appear in the exam picker alongside the standard exams.",
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {MONTHS.map((month) => {
            const enabled = monthlyExams.includes(month);
            return (
              <button
                key={month}
                onClick={() => handleToggleMonthlyExam(month)}
                disabled={updatingMonthlyExams}
                title={enabled ? `Remove ${month}` : `Add ${month}`}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: enabled ? "2px solid #0b4f9e" : "1.5px solid #ccd6f0",
                  background: enabled ? "#d0e4ff" : "#f4f7ff",
                  color: enabled ? "#0b4f9e" : "#667",
                  fontWeight: enabled ? 800 : 600,
                  fontSize: 11,
                  cursor: updatingMonthlyExams ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {enabled ? "✓ " : ""}
                {month}
              </button>
            );
          })}
        </div>
        {monthlyExams.length > 0 && (
          <div style={{ fontSize: 10, color: "#0b6b3a" }}>
            {t(
              "settingsMonthlyExamsEnabled",
              "{count} monthly exam{suffix} enabled:",
              {
                count: monthlyExams.length,
                suffix: monthlyExams.length !== 1 ? "s" : "",
              },
            )}{" "}
            {monthlyExams.join(", ")}
          </div>
        )}
      </div>

      {/* Composite Exam Settings */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>
            🔗 {t("settingsCompositeExamSettings", "Composite Exam Settings")}
          </div>
          <div style={styles.sectionSub}>
            {t(
              "settingsCompositeExamSub1",
              "Terminal, September, and Annual exams combine two sittings: (Midterm Score + Exam Score) ÷ 2.",
            )}{" "}
            {t(
              "settingsCompositeExamSub2",
              "Choose which earlier exam acts as the midterm partner for each composite exam type.",
            )}
          </div>
        </div>
        {compositeExamKeys.map((examKey) => {
          const defaultPartner = COMPOSITE_EXAM_CONFIG[examKey].partnerExam;
          const currentPartner =
            compositeConfig[examKey]?.partnerExam ?? defaultPartner;
          return (
            <div
              key={examKey}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#003366",
                  minWidth: 120,
                }}
              >
                {examKey}
              </span>
              <span style={{ fontSize: 11, color: "#667" }}>
                {t("settingsPartner", "partner")}:
              </span>
              <select
                value={currentPartner}
                onChange={(e) =>
                  setCompositeConfig((prev) => ({
                    ...prev,
                    [examKey]: {
                      ...(prev[examKey] ?? {}),
                      partnerExam: e.target.value,
                    },
                  }))
                }
                style={styles.select}
              >
                {EXAM_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>
                    {et.label}
                  </option>
                ))}
              </select>
              {currentPartner !== defaultPartner && (
                <button
                  style={{
                    ...styles.saveBtn,
                    background: "#667",
                    fontSize: 10,
                    padding: "4px 8px",
                    height: "auto",
                  }}
                  onClick={() =>
                    setCompositeConfig((prev) => {
                      const next = { ...prev };
                      delete next[examKey];
                      return next;
                    })
                  }
                >
                  {t("settingsReset", "Reset")}
                </button>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            style={styles.saveBtn}
            onClick={handleUpdateCompositeConfig}
            disabled={updatingComposite}
          >
            {updatingComposite ? t("saving", "Saving…") : t("save", "Save")}
          </button>
        </div>
      </div>

      {/* Publish / Unpublish */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>
            📢 {t("settingsResultPublishing", "Result Publishing")}
          </div>
          <div style={styles.sectionSub}>
            {t(
              "settingsResultPublishingSub",
              "Mark this class's results as published so students and parents can view them.",
            )}
            {classData.publishedAt && (
              <span style={{ marginLeft: 6, color: "#0b6b3a" }}>
                {t("settingsPublishedOn", "Published on {date}.", {
                  date: new Date(classData.publishedAt).toLocaleDateString(),
                })}
              </span>
            )}
          </div>
        </div>
        <div style={styles.row}>
          {classData.published ? (
            <button
              style={{ ...styles.saveBtn, background: "#8b2500" }}
              disabled={publishing}
              onClick={async () => {
                setPublishing(true);
                await onUnpublishClass?.();
                setPublishing(false);
              }}
            >
              {publishing
                ? t("updating", "Updating…")
                : `🔒 ${t("settingsUnpublish", "Unpublish")}`}
            </button>
          ) : (
            <button
              style={{ ...styles.saveBtn, background: "#0b6b3a" }}
              disabled={publishing}
              onClick={async () => {
                setPublishing(true);
                await onPublishClass?.();
                setPublishing(false);
              }}
            >
              {publishing
                ? t("settingsPublishing", "Publishing…")
                : `📢 ${t("settingsPublishResults", "Publish Results")}`}
            </button>
          )}
        </div>
      </div>

      {/* Backup & Restore */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>
            💾 {t("settingsBackupRestore", "Backup & Restore")}
          </div>
          <div style={styles.sectionSub}>
            {t(
              "settingsBackupRestoreSub",
              "Export all school data to a JSON file, or re-import a previous backup.",
            )}
          </div>
        </div>
        <div style={styles.row}>
          <button
            style={{ ...styles.saveBtn, background: "#003366" }}
            onClick={() => onExportBackup?.()}
          >
            ⬇ {t("settingsExportAllData", "Export All Data")}
          </button>
          <label
            style={{
              ...styles.saveBtn,
              background: importingBackup ? "#999" : "#0077aa",
              cursor: importingBackup ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {importingBackup
              ? t("settingsImporting", "Importing…")
              : `⬆ ${t("settingsImportBackup", "Import Backup")}`}
            <input
              type="file"
              accept=".json"
              style={{ display: "none" }}
              disabled={importingBackup}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportingBackup(true);
                try {
                  const text = await file.text();
                  const parsed = JSON.parse(text);
                  await onImportBackup?.(parsed);
                } catch (err) {
                  // Error handled by parent
                } finally {
                  setImportingBackup(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Audit Log */}
      <div style={styles.section}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
          onClick={async () => {
            const next = !auditOpen;
            setAuditOpen(next);
            if (next && !auditLogs) {
              setLoadingAudit(true);
              await onLoadAuditLog?.();
              setLoadingAudit(false);
            }
          }}
        >
          <div>
            <div style={styles.sectionTitle}>
              📋 {t("settingsAuditLog", "Audit Log")}
            </div>
            <div style={styles.sectionSub}>
              {t("settingsAuditLogSub", "View who updated scores and when.")}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#003366" }}>
            {auditOpen ? `▲ ${t("hide", "Hide")}` : `▼ ${t("show", "Show")}`}
          </span>
        </div>
        {auditOpen &&
          (loadingAudit ? (
            <div style={{ fontSize: 11, color: "#888" }}>
              {t("loadingData", "Loading data…")}
            </div>
          ) : !auditLogs || auditLogs.length === 0 ? (
            <div style={{ fontSize: 11, color: "#888" }}>
              {t("settingsNoAuditRecords", "No audit records yet.")}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 10,
                }}
              >
                <thead>
                  <tr>
                    {[
                      t("settingsWhen", "When"),
                      t("students", "Students"),
                      t("settingsBy", "By"),
                      t("settingsChanges", "Changes"),
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "5px 6px",
                          background: "#003366",
                          color: "#fff",
                          textAlign: "left",
                          fontWeight: 700,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, i) => (
                    <tr
                      key={log.id || i}
                      style={{ background: i % 2 === 0 ? "#fff" : "#f7f9ff" }}
                    >
                      <td
                        style={{
                          padding: "4px 6px",
                          borderBottom: "1px solid #e8eef8",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.updatedAt
                          ? new Date(log.updatedAt).toLocaleString()
                          : t("settingsDash", "–")}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          borderBottom: "1px solid #e8eef8",
                        }}
                      >
                        {log.studentName ||
                          log.studentId ||
                          t("settingsDash", "–")}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          borderBottom: "1px solid #e8eef8",
                        }}
                      >
                        {log.updatedBy || t("settingsDash", "–")}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          borderBottom: "1px solid #e8eef8",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {log.changes
                          ? Object.entries(log.changes)
                              .map(
                                ([k, v]) =>
                                  `${k}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`,
                              )
                              .join("; ")
                          : log.action || t("settingsDash", "–")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      {/* Danger zone */}
      <div style={{ ...styles.section, borderColor: "#f5c6c6" }}>
        <div>
          <div style={{ ...styles.sectionTitle, color: "#8b2500" }}>
            {t("settingsDangerZone", "Danger Zone")}
          </div>
          <div style={styles.sectionSub}>
            {t(
              "settingsDangerZoneSub",
              "Archive or permanently delete this class.",
            )}
          </div>
        </div>
        <div style={styles.row}>
          {classData.archived ? (
            <button
              style={{ ...styles.saveBtn, background: "#0b6b3a" }}
              disabled={archiving}
              onClick={async () => {
                setArchiving(true);
                await onRestoreClass?.();
                setArchiving(false);
              }}
            >
              {archiving
                ? t("settingsRestoring", "Restoring…")
                : `♻️ ${t("settingsRestoreClass", "Restore Class")}`}
            </button>
          ) : (
            <button
              style={{ ...styles.deleteBtn, background: "#7a5800" }}
              disabled={archiving}
              onClick={async () => {
                if (
                  !window.confirm(
                    t(
                      "settingsConfirmArchive",
                      'Archive "{name}"? It will be hidden but data is preserved.',
                      { name: classData.name },
                    ),
                  )
                )
                  return;
                setArchiving(true);
                await onArchiveClass?.();
                setArchiving(false);
              }}
            >
              {archiving
                ? t("settingsArchiving", "Archiving…")
                : `📦 ${t("settingsArchiveClass", "Archive Class")}`}
            </button>
          )}
          <button style={styles.deleteBtn} onClick={onDeleteClass}>
            🗑️ {t("settingsDeleteClass", "Delete Class")}
          </button>
        </div>
      </div>
    </div>
  );
}
