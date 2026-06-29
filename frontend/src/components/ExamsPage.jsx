import { useEffect, useMemo, useState } from "react";
import { CLASS_FORMS } from "../hooks/useClasses";
import { displayFontStack, premiumFontStack, fieldStyle } from "../utils/designSystem";
import { COMPOSITE_EXAM_CONFIG, EXAM_TYPES, MONTHS, getMonthlyExamKey } from "../utils/constants";
import { useViewport } from "../utils/useViewport";

const EXAM_META = {
  "March Exam": { icon: "SE", color: "#0b6b3a", bg: "#e6f9ee", border: "#7dd3a8" },
  "Pre-Mock Exam": { icon: "PM", color: "#7c3aed", bg: "#f3e8ff", border: "#c4b5fd" },
  "Mock Exam": { icon: "MK", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  "Pre-Necta Exam": { icon: "PN", color: "#0891b2", bg: "#cffafe", border: "#67e8f9" },
  "Terminal Exam": { icon: "TE", color: "#0b4f9e", bg: "#e4eeff", border: "#7aabf7" },
  "September Exam": { icon: "SP", color: "#7a5800", bg: "#fff8e1", border: "#f7d47a" },
  "Annual Exam": { icon: "AE", color: "#6b0055", bg: "#fce8f7", border: "#e89de0" },
};
const FALLBACK_META = { icon: "EX", color: "#003366", bg: "#f4f7ff", border: "#d0dcf8" };
const MONTHLY_META = { icon: "ME", color: "#1a5276", bg: "#eaf4fb", border: "#7fb3d3" };

function getExamMeta(examValue = "") {
  if (EXAM_META[examValue]) return EXAM_META[examValue];
  if (examValue.startsWith("Monthly - ")) return MONTHLY_META;
  return FALLBACK_META;
}

function getClassLabel(cls = {}) {
  return [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim();
}

function ExamBadge({ exam }) {
  if (!exam) return <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>;
  const meta = getExamMeta(exam);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        borderRadius: 6,
        padding: "3px 8px",
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        fontSize: 12,
        fontWeight: 500,
        color: meta.color,
        whiteSpace: "nowrap",
      }}
    >
      {exam}
    </span>
  );
}

function ExamTypeRow({ examValue, label, count, total, isSelected, onClick, compact }) {
  const meta = getExamMeta(examValue);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 12,
        padding: compact ? "8px 12px" : "9px 16px",
        background: isSelected ? meta.bg : "transparent",
        border: "none",
        borderLeft: `3px solid ${isSelected ? meta.color : "transparent"}`,
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: isSelected ? "#fff" : meta.bg,
          border: `1px solid ${meta.border}`,
          color: meta.color,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        {meta.icon}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? meta.color : "#334155",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {!compact ? (
        <div style={{ width: 60, height: 4, borderRadius: 99, background: "#f1f5f9", flexShrink: 0 }}>
          <div style={{ height: "100%", borderRadius: 99, background: pct > 0 ? meta.color : "transparent", width: `${pct}%`, transition: "width 0.3s ease" }} />
        </div>
      ) : null}
      <span style={{ fontSize: 12, fontWeight: 500, color: isSelected ? meta.color : "#475569", minWidth: 40, textAlign: "right", flexShrink: 0 }}>
        {count}<span style={{ color: "#cbd5e1", fontSize: 11 }}>/{total}</span>
      </span>
      {!compact ? (
        <span style={{ fontSize: 11, fontWeight: 500, color: count > 0 ? meta.color : "#cbd5e1", minWidth: 30, textAlign: "right", flexShrink: 0 }}>
          {pct}%
        </span>
      ) : null}
    </button>
  );
}

function ClassRow({ cls, canManage, baseExamOptions, onChangeExam, onNavigate }) {
  const activeExam = cls.school_info?.exam || "";
  const monthlyExams = Array.isArray(cls.monthly_exams) ? cls.monthly_exams : [];
  const meta = getExamMeta(activeExam);
  const label = getClassLabel(cls);
  const [saving, setSaving] = useState(false);

  const examOptions = useMemo(() => {
    const options = [...baseExamOptions];
    monthlyExams.forEach((month) => {
      options.push({ value: getMonthlyExamKey(month), label: `Monthly - ${month}` });
    });
    return options;
  }, [baseExamOptions, monthlyExams]);

  const handleChange = async (event) => {
    const next = event.target.value;
    if (!next || next === activeExam) return;
    setSaving(true);
    await onChangeExam(cls, next);
    setSaving(false);
  };

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.12s" }}>
      <td style={{ padding: "10px 14px" }}>
        <button
          type="button"
          onClick={() => onNavigate(cls.id)}
          style={{ border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f2d6e" }}>{label}</div>
          {cls.year ? <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{cls.year}</div> : null}
        </button>
      </td>
      <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 500, color: "#475569" }}>
        {cls.form || "-"}
      </td>
      <td style={{ padding: "10px 12px" }}>
        {canManage ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
            <select
              value={activeExam}
              onChange={handleChange}
              disabled={saving || cls.published}
              title={cls.published ? "Unpublish results before changing the exam" : ""}
              style={{ ...fieldStyle(), padding: "5px 8px", fontSize: 12, maxWidth: 170, cursor: cls.published ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1 }}
            >
              <option value="" disabled>Select exam</option>
              {examOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            {saving ? <span style={{ fontSize: 11, color: "#64748b" }}>Saving...</span> : null}
            {cls.published ? <span style={{ fontSize: 10, fontWeight: 600, color: "#92400e", background: "#fef3c7", borderRadius: 4, padding: "2px 5px" }}>Locked</span> : null}
          </div>
        ) : (
          <ExamBadge exam={activeExam} />
        )}
      </td>
      <td style={{ padding: "10px 12px" }}>
        {monthlyExams.length === 0 ? (
          <span style={{ fontSize: 12, color: "#cbd5e1" }}>-</span>
        ) : (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {monthlyExams.map((month) => (
              <span key={month} style={{ fontSize: 10, fontWeight: 500, color: "#1a5276", background: "#eaf4fb", border: "1px solid #bde0f0", borderRadius: 4, padding: "1px 5px" }}>
                {month.slice(0, 3)}
              </span>
            ))}
          </div>
        )}
      </td>
      <td style={{ padding: "10px 14px" }}>
        {cls.published ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "#059669" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />Published
          </span>
        ) : cls.archived ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "#92400e" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />Archived
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "#0f2d6e" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6" }} />Active
          </span>
        )}
      </td>
    </tr>
  );
}

function ClassExamConfigPanel({
  classes,
  selectedClassId,
  onSelectClass,
  canManage,
  onUpdateClassMonthlyExams,
  onUpdateClassCompositeConfig,
  isMobile,
}) {
  const selectedClass = classes.find((cls) => cls.id === selectedClassId) || classes[0] || null;
  const monthlyExams = Array.isArray(selectedClass?.monthly_exams) ? selectedClass.monthly_exams : [];
  const subjects = Array.isArray(selectedClass?.subjects) ? selectedClass.subjects : [];
  const [compositeDraft, setCompositeDraft] = useState(selectedClass?.composite_config || {});
  const [monthlyBusy, setMonthlyBusy] = useState(false);
  const [compositeBusy, setCompositeBusy] = useState(false);
  const locked = Boolean(selectedClass?.published);

  useEffect(() => {
    setCompositeDraft(selectedClass?.composite_config || {});
  }, [selectedClass?.id, selectedClass?.composite_config]);

  if (!selectedClass) return null;

  const updateMonthly = async (month) => {
    if (!canManage || locked || monthlyBusy) return;
    const next = monthlyExams.includes(month)
      ? monthlyExams.filter((entry) => entry !== month)
      : [...monthlyExams, month];
    setMonthlyBusy(true);
    try {
      await onUpdateClassMonthlyExams?.(selectedClass.id, MONTHS.filter((entry) => next.includes(entry)));
    } finally {
      setMonthlyBusy(false);
    }
  };

  const updateCompositePartner = (examKey, partnerExam) => {
    setCompositeDraft((current) => ({
      ...current,
      [examKey]: {
        ...(current[examKey] || {}),
        partnerExam,
      },
    }));
  };

  const toggleExcludedSubject = (examKey, subject) => {
    setCompositeDraft((current) => {
      const entry = current[examKey] || {};
      const currentExcluded = Array.isArray(entry.excludedSubjects)
        ? entry.excludedSubjects
        : COMPOSITE_EXAM_CONFIG[examKey]?.excludedSubjects || [];
      const nextExcluded = currentExcluded.includes(subject)
        ? currentExcluded.filter((item) => item !== subject)
        : [...currentExcluded, subject];
      return {
        ...current,
        [examKey]: {
          ...entry,
          partnerExam: entry.partnerExam || COMPOSITE_EXAM_CONFIG[examKey]?.partnerExam || "",
          excludedSubjects: nextExcluded,
        },
      };
    });
  };

  const saveComposite = async () => {
    if (!canManage || locked || compositeBusy) return;
    setCompositeBusy(true);
    try {
      await onUpdateClassCompositeConfig?.(selectedClass.id, compositeDraft);
    } finally {
      setCompositeBusy(false);
    }
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: isMobile ? 14 : 18, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Exam configuration
          </div>
          <h2 style={{ margin: "5px 0 0", fontFamily: displayFontStack, fontSize: 22, fontWeight: 500, color: "#0f172a" }}>
            Monthly Exams & Composite Exams
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Configure exam availability and combination rules here. Marks Entry should only enter scores.
          </p>
        </div>
        <select value={selectedClass.id} onChange={(event) => onSelectClass(event.target.value)} style={{ ...fieldStyle(), minWidth: isMobile ? "100%" : 220 }}>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {getClassLabel(cls)}
            </option>
          ))}
        </select>
      </div>

      {locked ? (
        <div style={{ border: "1px solid #facc15", background: "#fefce8", color: "#854d0e", borderRadius: 10, padding: "9px 11px", fontSize: 12, fontWeight: 600 }}>
          This class is published. Unpublish it before changing monthly exams or composite rules.
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(260px,0.8fr) minmax(360px,1.2fr)", gap: 14 }}>
        <section style={{ border: "1px solid #edf2f7", borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Monthly Exams</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              Enabled months appear in the exam picker.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {MONTHS.map((month) => {
              const active = monthlyExams.includes(month);
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => updateMonthly(month)}
                  disabled={!canManage || locked || monthlyBusy}
                  style={{
                    border: active ? "1px solid #1a5276" : "1px solid #e2e8f0",
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: active ? "#eaf4fb" : "#fff",
                    color: active ? "#1a5276" : "#475569",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: !canManage || locked || monthlyBusy ? "not-allowed" : "pointer",
                    opacity: monthlyBusy ? 0.65 : 1,
                  }}
                >
                  {month.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            {monthlyExams.length ? `${monthlyExams.length} enabled: ${monthlyExams.join(", ")}` : "No monthly exams enabled."}
          </div>
        </section>

        <section style={{ border: "1px solid #edf2f7", borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Composite Exams</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              Choose partner exams and subjects excluded from divide-by-2.
            </p>
          </div>
          {Object.keys(COMPOSITE_EXAM_CONFIG).map((examKey) => {
            const defaultConfig = COMPOSITE_EXAM_CONFIG[examKey];
            const draft = compositeDraft[examKey] || {};
            const partnerExam = draft.partnerExam || defaultConfig.partnerExam;
            const excluded = Array.isArray(draft.excludedSubjects) ? draft.excludedSubjects : defaultConfig.excludedSubjects || [];
            return (
              <div key={examKey} style={{ border: "1px solid #f1f5f9", borderRadius: 10, padding: 10, display: "grid", gap: 9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ minWidth: 112, fontSize: 12, color: "#0f2d6e" }}>{examKey}</strong>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Partner</span>
                  <select
                    value={partnerExam}
                    onChange={(event) => updateCompositePartner(examKey, event.target.value)}
                    disabled={!canManage || locked}
                    style={{ ...fieldStyle(), width: isMobile ? "100%" : 190, padding: "6px 8px", fontSize: 12 }}
                  >
                    {EXAM_TYPES.map((exam) => <option key={exam.value} value={exam.value}>{exam.label}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {subjects.map((subject) => {
                    const checked = excluded.includes(subject);
                    return (
                      <label key={`${examKey}-${subject}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: checked ? "1px solid #0b6b3a" : "1px solid #e2e8f0", borderRadius: 999, padding: "4px 8px", background: checked ? "#eaf7ef" : "#fff", fontSize: 10, fontWeight: 700, color: checked ? "#0b6b3a" : "#475569" }}>
                        <input type="checkbox" checked={checked} disabled={!canManage || locked} onChange={() => toggleExcludedSubject(examKey, subject)} />
                        {subject}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={saveComposite} disabled={!canManage || locked || compositeBusy} style={{ border: "none", borderRadius: 8, padding: "8px 14px", background: !canManage || locked || compositeBusy ? "#94a3b8" : "#0f2d6e", color: "#fff", fontSize: 12, fontWeight: 700, cursor: !canManage || locked || compositeBusy ? "not-allowed" : "pointer" }}>
              {compositeBusy ? "Saving..." : "Save composite rules"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ExamsPage({
  classes = [],
  canManage = false,
  onApplyExamMaster,
  onChangeClassExam,
  onUpdateClassMonthlyExams,
  onUpdateClassCompositeConfig,
  onNavigateToClass,
}) {
  const { isMobile, isXs } = useViewport();
  const [filterForm, setFilterForm] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterExam, setFilterExam] = useState("all");
  const [masterExam, setMasterExam] = useState(EXAM_TYPES[0]?.value || "");
  const [applyScope, setApplyScope] = useState("all");
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [selectedConfigClassId, setSelectedConfigClassId] = useState("");
  const [masterBusy, setMasterBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!classes.length) return;
    if (!selectedConfigClassId || !classes.some((cls) => cls.id === selectedConfigClassId)) {
      setSelectedConfigClassId(classes[0].id);
    }
  }, [classes, selectedConfigClassId]);

  const years = useMemo(() => {
    const values = new Set(classes.map((cls) => cls.year).filter(Boolean));
    return Array.from(values).sort((left, right) => Number(right) - Number(left));
  }, [classes]);

  const examTypeCounts = useMemo(() => {
    const map = new Map(EXAM_TYPES.map((exam) => [exam.value, 0]));
    classes.forEach((cls) => {
      const exam = cls.school_info?.exam;
      if (exam && map.has(exam)) {
        map.set(exam, map.get(exam) + 1);
      }
    });
    return map;
  }, [classes]);

  const stats = useMemo(() => ({
    totalClasses: classes.length,
    published: classes.filter((cls) => cls.published).length,
    monthlyEnabled: classes.filter((cls) => Array.isArray(cls.monthly_exams) && cls.monthly_exams.length > 0).length,
    examTypesInUse: Array.from(examTypeCounts.values()).filter((count) => count > 0).length,
  }), [classes, examTypeCounts]);

  const baseExamOptions = useMemo(
    () => EXAM_TYPES.map((exam) => ({ value: exam.value, label: exam.label })),
    []
  );

  const filtered = useMemo(() => {
    return classes
      .filter((cls) => (filterForm !== "all" ? cls.form === filterForm : true))
      .filter((cls) => (filterYear !== "all" ? cls.year === filterYear : true))
      .filter((cls) => (filterExam !== "all" ? (cls.school_info?.exam || "") === filterExam : true))
      .sort((left, right) => {
        const yearDiff = Number(right.year || 0) - Number(left.year || 0);
        if (yearDiff !== 0) return yearDiff;
        const formDiff = CLASS_FORMS.indexOf(left.form) - CLASS_FORMS.indexOf(right.form);
        if (formDiff !== 0) return formDiff;
        return String(left.stream || "").localeCompare(String(right.stream || ""), "en");
      });
  }, [classes, filterExam, filterForm, filterYear]);

  const scopeCandidates = useMemo(() => {
    return classes
      .filter((cls) => (filterForm !== "all" ? cls.form === filterForm : true))
      .filter((cls) => (filterYear !== "all" ? cls.year === filterYear : true))
      .sort((left, right) => getClassLabel(left).localeCompare(getClassLabel(right), "en"));
  }, [classes, filterForm, filterYear]);

  const selectedTargetIds = useMemo(() => {
    if (applyScope === "all") return classes.map((cls) => cls.id);
    if (applyScope === "filtered") return scopeCandidates.map((cls) => cls.id);
    return scopeCandidates.filter((cls) => selectedClassIds.includes(cls.id)).map((cls) => cls.id);
  }, [applyScope, classes, scopeCandidates, selectedClassIds]);

  const lockedTargetCount = useMemo(() => {
    const selectedSet = new Set(selectedTargetIds);
    return classes.filter((cls) => selectedSet.has(cls.id) && cls.published).length;
  }, [classes, selectedTargetIds]);

  const handleExamRowClick = (examValue) => {
    setFilterExam((current) => (current === examValue ? "all" : examValue));
  };

  const toggleClassSelection = (classId) => {
    setSelectedClassIds((current) =>
      current.includes(classId) ? current.filter((entry) => entry !== classId) : [...current, classId]
    );
  };

  const handleApplyMaster = async () => {
    if (!masterExam) { setActionError("Choose an exam"); return; }
    if (applyScope === "classes" && selectedTargetIds.length === 0) { setActionError("Choose at least one class"); return; }
    if (applyScope === "filtered" && scopeCandidates.length === 0) { setActionError("No classes match the current form/year filter"); return; }
    setActionError("");
    setMasterBusy(true);
    try {
      await onApplyExamMaster?.({ classIds: selectedTargetIds, exam: masterExam });
      if (applyScope === "classes") setSelectedClassIds([]);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setMasterBusy(false);
    }
  };

  const scopeBtn = (value, label) => {
    const active = applyScope === value;
    return (
      <button type="button" onClick={() => setApplyScope(value)} style={{
        padding: "5px 12px", fontSize: 12, fontWeight: active ? 600 : 400, borderRadius: 6,
        border: active ? "1px solid #0f2d6e" : "1px solid #e2e8f0",
        background: active ? "#0f2d6e" : "#fff", color: active ? "#fff" : "#475569", cursor: "pointer",
      }}>{label}</button>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: isMobile ? "14px 12px 28px" : "20px 24px 32px",
        fontFamily: premiumFontStack,
        background: "#f8f9fb",
        minHeight: 0,
      }}
    >
      <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gap: isMobile ? 14 : 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: displayFontStack, fontSize: isXs ? 20 : 24, fontWeight: 500, color: "#0f172a", margin: 0 }}>
              Exams
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
              {stats.totalClasses} classes &middot; {stats.published} published &middot; {stats.examTypesInUse} exam types active
            </p>
          </div>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Exam types</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {filterExam === "all" ? "click to filter" : (
                <button type="button" onClick={() => setFilterExam("all")} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "#3b82f6", fontWeight: 500 }}>clear</button>
              )}
            </span>
          </div>
          {EXAM_TYPES.map((exam, index) => (
            <div key={exam.value} style={{ borderBottom: index < EXAM_TYPES.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <ExamTypeRow examValue={exam.value} label={exam.label} count={examTypeCounts.get(exam.value) || 0} total={classes.length} isSelected={filterExam === exam.value} onClick={() => handleExamRowClick(exam.value)} compact={isXs} />
            </div>
          ))}
        </div>

        {canManage && classes.length ? (
          <ClassExamConfigPanel
            classes={classes}
            selectedClassId={selectedConfigClassId}
            onSelectClass={setSelectedConfigClassId}
            canManage={canManage}
            onUpdateClassMonthlyExams={onUpdateClassMonthlyExams}
            onUpdateClassCompositeConfig={onUpdateClassCompositeConfig}
            isMobile={isMobile}
          />
        ) : null}

        {canManage ? (
          <details style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: isMobile ? "14px" : "16px 18px" }}>
            <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0f172a", userSelect: "none" }}>
              Bulk exam assignment
            </summary>
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Apply one exam to all classes, the current filter, or hand-picked classes. Published classes stay locked.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "200px auto", gap: 8, alignItems: "center" }}>
                <select value={masterExam} onChange={(event) => setMasterExam(event.target.value)} style={fieldStyle()}>
                  {EXAM_TYPES.map((exam) => <option key={exam.value} value={exam.value}>{exam.label}</option>)}
                </select>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {scopeBtn("all", "All classes")}
                  {scopeBtn("filtered", "Filtered")}
                  {scopeBtn("classes", "Pick classes")}
                </div>
              </div>

              {applyScope !== "all" ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <select value={filterForm} onChange={(event) => setFilterForm(event.target.value)} style={fieldStyle()}>
                      <option value="all">All forms</option>
                      {CLASS_FORMS.map((form) => <option key={form} value={form}>{form}</option>)}
                    </select>
                    <select value={filterYear} onChange={(event) => setFilterYear(event.target.value)} style={fieldStyle()}>
                      <option value="all">All years</option>
                      {years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                  {applyScope === "classes" ? (
                    <div style={{ border: "1px solid #f1f5f9", borderRadius: 8, padding: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {scopeCandidates.length ? scopeCandidates.map((cls) => {
                        const active = selectedClassIds.includes(cls.id);
                        return (
                          <button key={cls.id} type="button" onClick={() => toggleClassSelection(cls.id)} style={{
                            border: active ? "1px solid #0f2d6e" : "1px solid #e2e8f0", borderRadius: 6, padding: "5px 10px",
                            background: active ? "#eef3fb" : "#fff", color: active ? "#0f2d6e" : "#475569", fontSize: 12, fontWeight: 500, cursor: "pointer",
                          }}>
                            {getClassLabel(cls)}{cls.published ? <span style={{ marginLeft: 4, color: "#b45309", fontSize: 10 }}>locked</span> : null}
                          </button>
                        );
                      }) : <div style={{ fontSize: 12, color: "#94a3b8" }}>No classes match the filter.</div>}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={handleApplyMaster} disabled={masterBusy} style={{
                  border: "none", borderRadius: 8, padding: "8px 16px", background: "#0f2d6e", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: masterBusy ? 0.6 : 1,
                }}>
                  {masterBusy ? "Applying..." : `Apply to ${selectedTargetIds.length} class${selectedTargetIds.length === 1 ? "" : "es"}`}
                </button>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {lockedTargetCount} locked
                </span>
              </div>

              {actionError ? <div style={{ borderRadius: 8, border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", padding: "8px 10px", fontSize: 12 }}>{actionError}</div> : null}
            </div>
          </details>
        ) : null}

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: isMobile ? "10px 12px" : "12px 16px" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filterForm} onChange={(event) => setFilterForm(event.target.value)} style={{ ...fieldStyle(), flex: isXs ? "1 1 calc(50% - 3px)" : undefined }}>
              <option value="all">All forms</option>
              {CLASS_FORMS.map((form) => <option key={form} value={form}>{form}</option>)}
            </select>
            <select value={filterYear} onChange={(event) => setFilterYear(event.target.value)} style={{ ...fieldStyle(), flex: isXs ? "1 1 calc(50% - 3px)" : undefined }}>
              <option value="all">All years</option>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            {(filterForm !== "all" || filterYear !== "all") ? (
              <button type="button" onClick={() => { setFilterForm("all"); setFilterYear("all"); }} style={{ background: "none", border: "none", fontSize: 12, color: "#3b82f6", cursor: "pointer", padding: 0 }}>Clear</button>
            ) : null}
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
              {filtered.length} class{filtered.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {classes.length === 0 ? "No classes found." : "No classes match the current filters."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden", minWidth: 560 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {["Class", "Form", "Active Exam", "Monthly Exams", "Status"].map((header) => (
                      <th key={header} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cls) => (
                    <ClassRow key={cls.id} cls={cls} canManage={canManage} baseExamOptions={baseExamOptions} onChangeExam={onChangeClassExam} onNavigate={onNavigateToClass} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {canManage ? (
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
            Bulk updates skip published classes automatically. Monthly and composite exam setup is managed here.
          </p>
        ) : null}
      </div>
    </div>
  );
}
