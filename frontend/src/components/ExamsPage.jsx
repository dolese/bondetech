import { useMemo, useState } from "react";
import { CLASS_FORMS } from "../hooks/useClasses";
import { premiumFontStack } from "../utils/designSystem";
import { EXAM_TYPES, getMonthlyExamKey } from "../utils/constants";
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

function StatCard({ label, value, sub }) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(226,232,240,0.92)",
        background: "linear-gradient(180deg,#ffffff,#f8fbff)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginTop: 4 }}>{label}</div>
      {sub ? <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: 600 }}>{sub}</div> : null}
    </div>
  );
}

function ScopeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? "none" : "1px solid rgba(203,213,225,0.9)",
        borderRadius: 999,
        padding: "8px 12px",
        background: active ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#ffffff",
        color: active ? "#ffffff" : "#475569",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: active ? "0 8px 20px rgba(37,99,235,0.2)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function ExamBadge({ exam }) {
  if (!exam) return <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>-</span>;
  const meta = getExamMeta(exam);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 10,
        padding: "4px 10px",
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        fontSize: 12,
        fontWeight: 800,
        color: meta.color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.3 }}>{meta.icon}</span>
      {exam}
    </span>
  );
}

function ExamTypeRow({ examValue, label, count, total, isSelected, onClick, compact }) {
  const meta = getExamMeta(examValue);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 10 : 14,
        padding: compact ? "9px 14px" : "11px 18px",
        background: isSelected ? meta.bg : hovered ? "#f8faff" : "transparent",
        border: "none",
        borderLeft: `3px solid ${isSelected ? meta.color : "transparent"}`,
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.14s, border-color 0.14s",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          width: compact ? 28 : 32,
          height: compact ? 28 : 32,
          borderRadius: 9,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: isSelected ? "#fff" : meta.bg,
          border: `1px solid ${meta.border}`,
          color: meta.color,
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 0.4,
          flexShrink: 0,
        }}
      >
        {meta.icon}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: compact ? 12 : 13,
          fontWeight: isSelected ? 800 : 600,
          color: isSelected ? meta.color : "#334155",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {!compact ? (
        <div style={{ width: 72, height: 4, borderRadius: 99, background: "rgba(0,0,0,0.06)", flexShrink: 0 }}>
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              background: pct > 0 ? meta.color : "transparent",
              width: `${pct}%`,
              transition: "width 0.35s ease",
            }}
          />
        </div>
      ) : null}
      <span
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: isSelected ? meta.color : "#475569",
          minWidth: compact ? 36 : 44,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {count}
        <span style={{ color: "#cbd5e1", fontWeight: 600, fontSize: 11 }}>/ {total}</span>
      </span>
      {!compact ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: count > 0 ? meta.color : "#cbd5e1",
            minWidth: 34,
            textAlign: "right",
            flexShrink: 0,
          }}
        >
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
    <tr
      style={{ borderBottom: "1px solid rgba(226,232,240,0.6)", transition: "background 0.12s" }}
      onMouseEnter={(event) => { event.currentTarget.style.background = "#f8fbff"; }}
      onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}
    >
      <td style={{ padding: "12px 16px" }}>
        <button
          type="button"
          onClick={() => onNavigate(cls.id)}
          style={{ border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: "#2563eb" }}>{label}</div>
          {cls.year ? (
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{cls.year}</div>
          ) : null}
        </button>
      </td>
      <td style={{ padding: "12px 12px" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{cls.form || "-"}</span>
      </td>
      <td style={{ padding: "12px 12px" }}>
        {canManage ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: meta.color,
                flexShrink: 0,
                border: `1.5px solid ${meta.border}`,
              }}
            />
            <select
              value={activeExam}
              onChange={handleChange}
              disabled={saving || cls.published}
              title={cls.published ? "Unpublish results before changing the exam" : ""}
              style={{
                border: "1px solid rgba(226,232,240,0.92)",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                color: "#0f172a",
                background: "#f8faff",
                cursor: cls.published ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                maxWidth: 180,
              }}
            >
              <option value="" disabled>Select exam</option>
              {examOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {saving ? <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Saving...</span> : null}
            {cls.published ? (
              <span style={{ fontSize: 10, color: "#92400e", fontWeight: 800, background: "#fef3c7", borderRadius: 6, padding: "2px 6px" }}>
                LOCKED
              </span>
            ) : null}
          </div>
        ) : (
          <ExamBadge exam={activeExam} />
        )}
      </td>
      <td style={{ padding: "12px 12px" }}>
        {monthlyExams.length === 0 ? (
          <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700 }}>-</span>
        ) : (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {monthlyExams.map((month) => (
              <span
                key={month}
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#1a5276",
                  background: "#eaf4fb",
                  border: "1px solid #7fb3d3",
                  borderRadius: 6,
                  padding: "2px 6px",
                }}
              >
                {month.slice(0, 3).toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </td>
      <td style={{ padding: "12px 16px" }}>
        {cls.published ? (
          <span style={{ fontSize: 10, fontWeight: 800, color: "#059669", background: "#d1fae5", borderRadius: 6, padding: "3px 8px" }}>
            PUBLISHED
          </span>
        ) : cls.archived ? (
          <span style={{ fontSize: 10, fontWeight: 800, color: "#92400e", background: "#fef3c7", borderRadius: 6, padding: "3px 8px" }}>
            ARCHIVED
          </span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 800, color: "#2563eb", background: "#eff6ff", borderRadius: 6, padding: "3px 8px" }}>
            ACTIVE
          </span>
        )}
      </td>
    </tr>
  );
}

export function ExamsPage({
  classes = [],
  canManage = false,
  onApplyExamMaster,
  onChangeClassExam,
  onNavigateToClass,
}) {
  const { isMobile, isXs } = useViewport();
  const [filterForm, setFilterForm] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterExam, setFilterExam] = useState("all");
  const [masterExam, setMasterExam] = useState(EXAM_TYPES[0]?.value || "");
  const [applyScope, setApplyScope] = useState("all");
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [masterBusy, setMasterBusy] = useState(false);
  const [actionError, setActionError] = useState("");

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
    if (applyScope === "all") {
      return classes.map((cls) => cls.id);
    }
    if (applyScope === "filtered") {
      return scopeCandidates.map((cls) => cls.id);
    }
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
    if (!masterExam) {
      setActionError("Choose an exam");
      return;
    }
    if (applyScope === "classes" && selectedTargetIds.length === 0) {
      setActionError("Choose at least one class");
      return;
    }
    if (applyScope === "filtered" && scopeCandidates.length === 0) {
      setActionError("No classes match the current form/year filter");
      return;
    }
    setActionError("");
    setMasterBusy(true);
    try {
      await onApplyExamMaster?.({
        classIds: selectedTargetIds,
        exam: masterExam,
      });
      if (applyScope === "classes") {
        setSelectedClassIds([]);
      }
    } catch (error) {
      setActionError(error.message);
    } finally {
      setMasterBusy(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: isMobile ? "14px 12px 28px" : "28px 28px 40px",
        fontFamily: premiumFontStack,
        background: "#f1f5fb",
        minHeight: 0,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: isMobile ? 16 : 24 }}>
        <div>
          <h1 style={{ fontSize: isXs ? 20 : 26, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Exams
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "6px 0 0", fontWeight: 600 }}>
            School-wide exam master with bulk class rollout and published-class lock awareness.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
          <StatCard label="Classes" value={stats.totalClasses} sub="visible class records" />
          <StatCard label="Published" value={stats.published} sub="locked against exam changes" />
          <StatCard label="Monthly enabled" value={stats.monthlyEnabled} sub="classes with monthly exams" />
          <StatCard label="Exam types in use" value={stats.examTypesInUse} sub="currently active across classes" />
        </div>

        <div
          style={{
            borderRadius: 20,
            border: "1px solid rgba(226,232,240,0.92)",
            background: "#ffffff",
            boxShadow: "0 8px 28px rgba(15,23,42,0.05)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMobile ? "11px 14px 10px" : "13px 18px 12px",
              borderBottom: "1px solid rgba(226,232,240,0.7)",
              background: "linear-gradient(180deg,#f8faff,#f1f5fe)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: 1.4, textTransform: "uppercase" }}>
              Exam Types
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
              {filterExam === "all" ? "tap a row to filter" : (
                <button
                  type="button"
                  onClick={() => setFilterExam("all")}
                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "#2563eb", fontWeight: 700 }}
                >
                  clear filter
                </button>
              )}
            </span>
          </div>
          {EXAM_TYPES.map((exam, index) => (
            <div
              key={exam.value}
              style={{ borderBottom: index < EXAM_TYPES.length - 1 ? "1px solid rgba(226,232,240,0.45)" : "none" }}
            >
              <ExamTypeRow
                examValue={exam.value}
                label={exam.label}
                count={examTypeCounts.get(exam.value) || 0}
                total={classes.length}
                isSelected={filterExam === exam.value}
                onClick={() => handleExamRowClick(exam.value)}
                compact={isXs}
              />
            </div>
          ))}
        </div>

        {canManage ? (
          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(226,232,240,0.92)",
              background: "linear-gradient(180deg,#ffffff,#f8fbff)",
              boxShadow: "0 14px 40px rgba(15,23,42,0.07)",
              padding: isMobile ? "16px 14px" : "18px 20px",
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>Exam master actions</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 600 }}>
                Apply one exam to all visible classes, the current year/form filter, or hand-picked classes. Published classes stay locked.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px auto", gap: 10, alignItems: "center" }}>
              <select
                value={masterExam}
                onChange={(event) => setMasterExam(event.target.value)}
                style={{
                  border: "1px solid rgba(226,232,240,0.92)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#475569",
                  background: "#f8faff",
                }}
              >
                {EXAM_TYPES.map((exam) => (
                  <option key={exam.value} value={exam.value}>{exam.label}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ScopeButton active={applyScope === "all"} onClick={() => setApplyScope("all")}>
                  All classes
                </ScopeButton>
                <ScopeButton active={applyScope === "filtered"} onClick={() => setApplyScope("filtered")}>
                  Filtered classes
                </ScopeButton>
                <ScopeButton active={applyScope === "classes"} onClick={() => setApplyScope("classes")}>
                  Pick classes
                </ScopeButton>
              </div>
            </div>

            {applyScope !== "all" ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={filterForm} onChange={(event) => setFilterForm(event.target.value)} style={selectStyle}>
                    <option value="all">All forms</option>
                    {CLASS_FORMS.map((form) => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                  <select value={filterYear} onChange={(event) => setFilterYear(event.target.value)} style={selectStyle}>
                    <option value="all">All years</option>
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                {applyScope === "classes" ? (
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(226,232,240,0.92)",
                      background: "#ffffff",
                      padding: "12px",
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {scopeCandidates.length ? (
                      scopeCandidates.map((cls) => {
                        const active = selectedClassIds.includes(cls.id);
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => toggleClassSelection(cls.id)}
                            style={{
                              border: active ? "none" : "1px solid rgba(203,213,225,0.9)",
                              borderRadius: 10,
                              padding: "7px 10px",
                              background: active ? "#dbeafe" : "#f8fafc",
                              color: active ? "#1d4ed8" : "#475569",
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {getClassLabel(cls)}
                            {cls.published ? <span style={{ marginLeft: 6, color: "#b45309" }}>locked</span> : null}
                          </button>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                        No classes match the current year and form filter.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={handleApplyMaster}
                disabled={masterBusy}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "11px 16px",
                  background: "#003366",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {masterBusy ? "Applying..." : `Apply to ${selectedTargetIds.length} class${selectedTargetIds.length === 1 ? "" : "es"}`}
              </button>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                Locked published classes in scope: {lockedTargetCount}
              </div>
            </div>

            {actionError ? (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid #fecaca",
                  background: "#fff1f2",
                  color: "#b91c1c",
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {actionError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(226,232,240,0.92)",
              background: "#ffffff",
              boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
              padding: isMobile ? "12px 14px" : "14px 18px",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={filterForm} onChange={(event) => setFilterForm(event.target.value)} style={{ ...selectStyle, flex: isXs ? "1 1 calc(50% - 4px)" : undefined }}>
                <option value="all">All forms</option>
                {CLASS_FORMS.map((form) => (
                  <option key={form} value={form}>{form}</option>
                ))}
              </select>
              <select value={filterYear} onChange={(event) => setFilterYear(event.target.value)} style={{ ...selectStyle, flex: isXs ? "1 1 calc(50% - 4px)" : undefined }}>
                <option value="all">All years</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {(filterForm !== "all" || filterYear !== "all") ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilterForm("all");
                    setFilterYear("all");
                  }}
                  style={{ ...selectStyle, cursor: "pointer", color: "#64748b" }}
                >
                  Clear
                </button>
              ) : null}
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginLeft: "auto" }}>
                {filtered.length} class{filtered.length !== 1 ? "es" : ""}
              </span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                borderRadius: 20,
                border: "1px solid rgba(226,232,240,0.92)",
                background: "#ffffff",
                padding: "48px 24px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {classes.length === 0 ? "No classes found." : "No classes match the current filters."}
            </div>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div
                style={{
                  borderRadius: 20,
                  border: "1px solid rgba(226,232,240,0.92)",
                  background: "#ffffff",
                  boxShadow: "0 14px 40px rgba(15,23,42,0.07)",
                  overflow: "hidden",
                  minWidth: 560,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(180deg,#f8faff,#f1f5fe)", borderBottom: "1px solid rgba(226,232,240,0.92)" }}>
                      {["Class", "Form", "Active Exam", "Monthly Exams", "Status"].map((header) => (
                        <th
                          key={header}
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#64748b",
                            letterSpacing: 1.2,
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((cls) => (
                      <ClassRow
                        key={cls.id}
                        cls={cls}
                        canManage={canManage}
                        baseExamOptions={baseExamOptions}
                        onChangeExam={onChangeClassExam}
                        onNavigate={onNavigateToClass}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {canManage ? (
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontWeight: 600 }}>
            Bulk exam updates skip published classes automatically. Use Settings to manage monthly exam availability and unpublish classes before changing locked exam states.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const selectStyle = {
  border: "1px solid rgba(226,232,240,0.92)",
  borderRadius: 12,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
  background: "#f8faff",
};
