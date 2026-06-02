import { useMemo, useState } from "react";
import { CLASS_FORMS } from "../hooks/useClasses";
import { premiumFontStack } from "../utils/designSystem";
import { EXAM_TYPES, getMonthlyExamKey } from "../utils/constants";
import { useViewport } from "../utils/useViewport";

const EXAM_META = {
  "March Exam":     { icon: "SE", color: "#0b6b3a", bg: "#e6f9ee", border: "#7dd3a8" },
  "Pre-Mock Exam":  { icon: "PM", color: "#7c3aed", bg: "#f3e8ff", border: "#c4b5fd" },
  "Mock Exam":      { icon: "MK", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  "Pre-Necta Exam": { icon: "PN", color: "#0891b2", bg: "#cffafe", border: "#67e8f9" },
  "Terminal Exam":  { icon: "TE", color: "#0b4f9e", bg: "#e4eeff", border: "#7aabf7" },
  "September Exam": { icon: "SP", color: "#7a5800", bg: "#fff8e1", border: "#f7d47a" },
  "Annual Exam":    { icon: "AE", color: "#6b0055", bg: "#fce8f7", border: "#e89de0" },
};
const FALLBACK_META = { icon: "EX", color: "#003366", bg: "#f4f7ff", border: "#d0dcf8" };
const MONTHLY_META  = { icon: "ME", color: "#1a5276", bg: "#eaf4fb", border: "#7fb3d3" };

function getExamMeta(examValue = "") {
  if (EXAM_META[examValue]) return EXAM_META[examValue];
  if (examValue.startsWith("Monthly - ")) return MONTHLY_META;
  return FALLBACK_META;
}

function ExamBadge({ exam }) {
  if (!exam) return <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>—</span>;
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
      {/* Icon badge */}
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

      {/* Name */}
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

      {/* Progress bar — hidden on compact (xs) */}
      {!compact && (
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
      )}

      {/* Count */}
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
        <span style={{ color: "#cbd5e1", fontWeight: 600, fontSize: 11 }}>/{total}</span>
      </span>

      {/* Percentage — hidden on compact */}
      {!compact && (
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
      )}
    </button>
  );
}

function ClassRow({ cls, canManage, baseExamOptions, onChangeExam, onNavigate }) {
  const activeExam = cls.school_info?.exam || "";
  const monthlyExams = Array.isArray(cls.monthly_exams) ? cls.monthly_exams : [];
  const meta = getExamMeta(activeExam);
  const label = [cls.form, cls.stream, cls.year].filter(Boolean).join(" ");
  const [saving, setSaving] = useState(false);

  const examOptions = useMemo(() => {
    const options = [...baseExamOptions];
    monthlyExams.forEach((month) => {
      options.push({ value: getMonthlyExamKey(month), label: `Monthly — ${month}` });
    });
    return options;
  }, [baseExamOptions, monthlyExams]);

  const handleChange = async (e) => {
    const next = e.target.value;
    if (!next || next === activeExam) return;
    setSaving(true);
    await onChangeExam(cls, next);
    setSaving(false);
  };

  return (
    <tr
      style={{ borderBottom: "1px solid rgba(226,232,240,0.6)", transition: "background 0.12s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fbff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Class label */}
      <td style={{ padding: "12px 16px" }}>
        <button
          type="button"
          onClick={() => onNavigate(cls.id)}
          style={{
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: "#2563eb" }}>{label}</div>
          {cls.year && (
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{cls.year}</div>
          )}
        </button>
      </td>

      {/* Form */}
      <td style={{ padding: "12px 12px" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{cls.form || "—"}</span>
      </td>

      {/* Active exam */}
      <td style={{ padding: "12px 12px" }}>
        {canManage ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            {saving && (
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Saving…</span>
            )}
            {cls.published && (
              <span style={{ fontSize: 10, color: "#92400e", fontWeight: 800, background: "#fef3c7", borderRadius: 6, padding: "2px 6px" }}>
                LOCKED
              </span>
            )}
          </div>
        ) : (
          <ExamBadge exam={activeExam} />
        )}
      </td>

      {/* Monthly exams */}
      <td style={{ padding: "12px 12px" }}>
        {monthlyExams.length === 0 ? (
          <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700 }}>—</span>
        ) : (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {monthlyExams.map((m) => (
              <span
                key={m}
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
                {m.slice(0, 3).toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </td>

      {/* Status */}
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

export function ExamsPage({ classes = [], canManage = false, onChangeClassExam, onNavigateToClass }) {
  const { isMobile, isXs } = useViewport();
  const [filterForm, setFilterForm] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterExam, setFilterExam] = useState("all");

  const years = useMemo(() => {
    const s = new Set(classes.map((c) => c.year).filter(Boolean));
    return Array.from(s).sort((a, b) => Number(b) - Number(a));
  }, [classes]);

  const examTypeCounts = useMemo(() => {
    const map = new Map(EXAM_TYPES.map((e) => [e.value, 0]));
    classes.forEach((cls) => {
      const exam = cls.school_info?.exam;
      if (exam && map.has(exam)) map.set(exam, map.get(exam) + 1);
    });
    return map;
  }, [classes]);

  const baseExamOptions = useMemo(
    () => EXAM_TYPES.map((e) => ({ value: e.value, label: e.label })),
    []
  );

  const filtered = useMemo(() => {
    return classes.filter((cls) => {
      if (filterForm !== "all" && cls.form !== filterForm) return false;
      if (filterYear !== "all" && cls.year !== filterYear) return false;
      if (filterExam !== "all" && (cls.school_info?.exam || "") !== filterExam) return false;
      return true;
    }).sort((a, b) => {
      const yearDiff = Number(b.year || 0) - Number(a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      const formDiff = CLASS_FORMS.indexOf(a.form) - CLASS_FORMS.indexOf(b.form);
      if (formDiff !== 0) return formDiff;
      return String(a.stream || "").localeCompare(String(b.stream || ""), "en");
    });
  }, [classes, filterForm, filterYear, filterExam]);

  const handleExamCardClick = (examValue) => {
    setFilterExam((prev) => (prev === examValue ? "all" : examValue));
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

        {/* Header */}
        <div>
          <h1 style={{ fontSize: isXs ? 20 : 26, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Exams
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "6px 0 0", fontWeight: 600 }}>
            Manage active exam types across all classes
          </p>
        </div>

        {/* Exam type filter panel */}
        <div
          style={{
            borderRadius: 20,
            border: "1px solid rgba(226,232,240,0.92)",
            background: "#ffffff",
            boxShadow: "0 8px 28px rgba(15,23,42,0.05)",
            overflow: "hidden",
          }}
        >
          {/* Panel header */}
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
                  ✕ clear filter
                </button>
              )}
            </span>
          </div>

          {/* Rows */}
          {EXAM_TYPES.map((e, idx) => (
            <div
              key={e.value}
              style={{ borderBottom: idx < EXAM_TYPES.length - 1 ? "1px solid rgba(226,232,240,0.45)" : "none" }}
            >
              <ExamTypeRow
                examValue={e.value}
                label={e.label}
                count={examTypeCounts.get(e.value) || 0}
                total={classes.length}
                isSelected={filterExam === e.value}
                onClick={() => handleExamCardClick(e.value)}
                compact={isXs}
              />
            </div>
          ))}
        </div>

        {/* Table section */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* Filters */}
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
              <select
                value={filterForm}
                onChange={(e) => setFilterForm(e.target.value)}
                style={{ ...selectStyle, flex: isXs ? "1 1 calc(50% - 4px)" : undefined }}
              >
                <option value="all">All Forms</option>
                {CLASS_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                style={{ ...selectStyle, flex: isXs ? "1 1 calc(50% - 4px)" : undefined }}
              >
                <option value="all">All Years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {(filterForm !== "all" || filterYear !== "all") && (
                <button
                  type="button"
                  onClick={() => { setFilterForm("all"); setFilterYear("all"); }}
                  style={{ ...selectStyle, cursor: "pointer", color: "#64748b" }}
                >
                  Clear
                </button>
              )}
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginLeft: "auto" }}>
                {filtered.length} class{filtered.length !== 1 ? "es" : ""}
              </span>
            </div>
          </div>

          {/* Table */}
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
                    {["Class", "Form", "Active Exam", "Monthly Exams", "Status"].map((h) => (
                      <th
                        key={h}
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
                        {h}
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

        {canManage && (
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontWeight: 600 }}>
            Use the dropdown in the <strong>Active Exam</strong> column to switch the working exam for any class.
            Published classes are locked — unpublish first to change their exam.
            Monthly exams are configured per-class in <strong>Settings</strong>.
          </p>
        )}
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
