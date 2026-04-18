import React, { useState, useEffect } from "react";
import { DEFAULT_SCHOOL, EXAM_TYPES, MONTHS } from "../utils/constants";
import { validateSchoolInfo } from "../utils/validation";
import { TextInput, SelectInput } from "./FormInputs";
import { useViewport } from "../utils/useViewport";

export function SettingsPage({
  classData,
  onUpdateClassMeta,
  onUpdateSchool,
  onUpdateSubjects,
  onUpdateMonthlyExams,
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
  const subjects = classData.subjects ?? [];

  // Class name & year/form state
  const [className, setClassName] = useState(classData.name ?? "");
  const [classYear, setClassYear] = useState(classData.year ?? "");
  const [classForm, setClassForm] = useState(classData.form ?? "Form I");
  const [metaError, setMetaError] = useState("");
  const [updatingMeta, setUpdatingMeta] = useState(false);

  // School info state
  const [schoolInfo, setSchoolInfo] = useState({
    ...DEFAULT_SCHOOL,
    ...(classData.school_info ?? {}),
  });
  const [schoolErrors, setSchoolErrors] = useState({});
  const [updatingSchool, setUpdatingSchool] = useState(false);

  // Subjects state
  const [subjectInput, setSubjectInput] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [updatingSubjects, setUpdatingSubjects] = useState(false);

  // Monthly exams state
  const [monthlyExams, setMonthlyExams] = useState(
    Array.isArray(classData.monthly_exams) ? classData.monthly_exams : []
  );
  const [updatingMonthlyExams, setUpdatingMonthlyExams] = useState(false);

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
    setSchoolInfo({ ...DEFAULT_SCHOOL, ...(classData.school_info ?? {}) });
    setSchoolErrors({});
    setMetaError("");
    setMonthlyExams(Array.isArray(classData.monthly_exams) ? classData.monthly_exams : []);
  }, [classData.id]);

  const handleUpdateMeta = async () => {
    const yearStr = String(classYear).trim();
    if (!/^[0-9]{4}$/.test(yearStr)) {
      setMetaError("Year must be 4 digits");
      return;
    }
    if (!classForm || !String(classForm).trim()) {
      setMetaError("Form is required");
      return;
    }
    const nameStr = className.trim();
    if (!nameStr) {
      setMetaError("Class name is required");
      return;
    }
    setMetaError("");
    setUpdatingMeta(true);
    await onUpdateClassMeta?.({ year: yearStr, form: classForm, name: nameStr });
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
    await onUpdateSchool?.(schoolInfo);
    setUpdatingSchool(false);
  };

  const cleanSubject = (value) => String(value ?? "").trim();

  const handleAddSubject = async () => {
    const next = cleanSubject(subjectInput);
    if (!next) {
      setSubjectError("Subject name is required");
      return;
    }
    if (subjects.some((s) => s.toLowerCase() === next.toLowerCase())) {
      setSubjectError("Subject already exists");
      return;
    }
    setSubjectError("");
    setUpdatingSubjects(true);
    await onUpdateSubjects?.([...subjects, next]);
    setUpdatingSubjects(false);
    setSubjectInput("");
  };

  const handleRemoveSubject = async (subject) => {
    if (!window.confirm(`Remove "${subject}"? Existing scores will be hidden.`)) return;
    const next = subjects.filter((s) => s !== subject);
    setUpdatingSubjects(true);
    await onUpdateSubjects?.(next);
    setUpdatingSubjects(false);
  };

  const handleMoveSubject = async (index, direction) => {
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= subjects.length) return;
    const next = [...subjects];
    [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
    setUpdatingSubjects(true);
    await onUpdateSubjects?.(next);
    setUpdatingSubjects(false);
  };

  const handleToggleMonthlyExam = async (month) => {
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

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? 10 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 16,
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
    subjectChip: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "#f4f7ff",
      border: "1px solid #d0dcf8",
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 10,
      fontWeight: 700,
      color: "#003366",
    },
    subjectRemove: {
      background: "#8b2500",
      color: "#fff",
      border: "none",
      borderRadius: 999,
      padding: "2px 6px",
      fontSize: 9,
      cursor: "pointer",
    },
    subjectArrow: {
      background: "transparent",
      color: "#003366",
      border: "1px solid #d0dcf8",
      borderRadius: 4,
      padding: "1px 4px",
      fontSize: 9,
      cursor: "pointer",
      lineHeight: 1,
    },
    subjectInput: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      height: 30,
      minWidth: 160,
      fontSize: 12,
    },
    subjectAddBtn: {
      padding: "6px 10px",
      height: 30,
      borderRadius: 6,
      border: "none",
      background: "#003366",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
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
      <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800 }}>⚙️ Settings</h3>

      {/* Class name / year / form */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>Class Identity</div>
          <div style={styles.sectionSub}>
            Name, year, and form used to organize classes in the sidebar.
          </div>
        </div>
        <div style={{ ...styles.grid2, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Class Name
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
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Year
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
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Form
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
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={styles.saveBtn} onClick={handleUpdateMeta} disabled={updatingMeta}>
            {updatingMeta ? "Saving…" : "Save"}
          </button>
          {metaError && <div style={styles.errMsg}>{metaError}</div>}
        </div>
      </div>

      {/* School information */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>School Information</div>
          <div style={styles.sectionSub}>
            Appears on report cards and result sheets.
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
            label="Form (for report card)"
            value={schoolInfo.form}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, form: v })}
            error={schoolErrors.form}
          />
          <TextInput
            label="Term"
            value={schoolInfo.term}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, term: v })}
            error={schoolErrors.term}
          />
          <SelectInput
            label="Exam"
            value={schoolInfo.exam}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, exam: v })}
            options={EXAM_TYPES}
            error={schoolErrors.exam}
          />
          <TextInput
            label="Year (for report card)"
            value={schoolInfo.year}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, year: v })}
            error={schoolErrors.year}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={styles.saveBtn} onClick={handleUpdateSchool} disabled={updatingSchool}>
            {updatingSchool ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Subjects */}
      <div style={styles.section}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={styles.sectionTitle}>Subjects</div>
            <div style={styles.sectionSub}>
              Add or remove subjects. Student scores are remapped automatically.
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#667" }}>{subjects.length} subjects</div>
        </div>
        <div style={styles.row}>
          {subjects.length === 0 && (
            <div style={{ fontSize: 10, color: "#999" }}>No subjects yet.</div>
          )}
          {subjects.map((subj, idx) => (
            <span key={subj} style={styles.subjectChip}>
              <button
                style={styles.subjectArrow}
                onClick={() => handleMoveSubject(idx, -1)}
                disabled={updatingSubjects || idx === 0}
                title="Move up"
              >
                ▲
              </button>
              {subj}
              <button
                style={styles.subjectArrow}
                onClick={() => handleMoveSubject(idx, 1)}
                disabled={updatingSubjects || idx === subjects.length - 1}
                title="Move down"
              >
                ▼
              </button>
              <button
                style={styles.subjectRemove}
                onClick={() => handleRemoveSubject(subj)}
                disabled={updatingSubjects}
                title={`Remove ${subj}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div style={styles.row}>
          <input
            type="text"
            placeholder="Add subject"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubject();
            }}
            style={styles.subjectInput}
          />
          <button
            style={styles.subjectAddBtn}
            onClick={handleAddSubject}
            disabled={updatingSubjects || !subjectInput.trim()}
          >
            ➕ Add
          </button>
          {subjectError && <div style={styles.errMsg}>{subjectError}</div>}
        </div>
      </div>

      {/* Monthly Exams */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>📅 Monthly Exams</div>
          <div style={styles.sectionSub}>
            Select which months have a monthly exam available for this Form.
            Enabled months appear in the exam picker alongside the standard exams.
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
                {enabled ? "✓ " : ""}{month}
              </button>
            );
          })}
        </div>
        {monthlyExams.length > 0 && (
          <div style={{ fontSize: 10, color: "#0b6b3a" }}>
            {monthlyExams.length} monthly exam{monthlyExams.length !== 1 ? "s" : ""} enabled:{" "}
            {monthlyExams.join(", ")}
          </div>
        )}
      </div>

      {/* Publish / Unpublish */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>📢 Result Publishing</div>
          <div style={styles.sectionSub}>
            Mark this class's results as published so students and parents can view them.
            {classData.publishedAt && (
              <span style={{ marginLeft: 6, color: "#0b6b3a" }}>
                Published on {new Date(classData.publishedAt).toLocaleDateString()}.
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
              {publishing ? "Updating…" : "🔒 Unpublish"}
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
              {publishing ? "Publishing…" : "📢 Publish Results"}
            </button>
          )}
        </div>
      </div>

      {/* Backup & Restore */}
      <div style={styles.section}>
        <div>
          <div style={styles.sectionTitle}>💾 Backup & Restore</div>
          <div style={styles.sectionSub}>
            Export all school data to a JSON file, or re-import a previous backup.
          </div>
        </div>
        <div style={styles.row}>
          <button
            style={{ ...styles.saveBtn, background: "#003366" }}
            onClick={() => onExportBackup?.()}
          >
            ⬇ Export All Data
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
            {importingBackup ? "Importing…" : "⬆ Import Backup"}
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
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
            <div style={styles.sectionTitle}>📋 Audit Log</div>
            <div style={styles.sectionSub}>View who updated scores and when.</div>
          </div>
          <span style={{ fontSize: 12, color: "#003366" }}>{auditOpen ? "▲ Hide" : "▼ Show"}</span>
        </div>
        {auditOpen && (
          loadingAudit ? (
            <div style={{ fontSize: 11, color: "#888" }}>Loading…</div>
          ) : !auditLogs || auditLogs.length === 0 ? (
            <div style={{ fontSize: 11, color: "#888" }}>No audit records yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead>
                  <tr>
                    {["When", "Student", "By", "Changes"].map(h => (
                      <th key={h} style={{ padding: "5px 6px", background: "#003366", color: "#fff", textAlign: "left", fontWeight: 700 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, i) => (
                    <tr key={log.id || i} style={{ background: i % 2 === 0 ? "#fff" : "#f7f9ff" }}>
                      <td style={{ padding: "4px 6px", borderBottom: "1px solid #e8eef8", whiteSpace: "nowrap" }}>
                        {log.updatedAt ? new Date(log.updatedAt).toLocaleString() : "–"}
                      </td>
                      <td style={{ padding: "4px 6px", borderBottom: "1px solid #e8eef8" }}>
                        {log.studentName || log.studentId || "–"}
                      </td>
                      <td style={{ padding: "4px 6px", borderBottom: "1px solid #e8eef8" }}>
                        {log.updatedBy || "–"}
                      </td>
                      <td style={{ padding: "4px 6px", borderBottom: "1px solid #e8eef8", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {log.changes
                          ? Object.entries(log.changes)
                              .map(([k, v]) => `${k}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`)
                              .join("; ")
                          : log.action || "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Danger zone */}
      <div style={{ ...styles.section, borderColor: "#f5c6c6" }}>
        <div>
          <div style={{ ...styles.sectionTitle, color: "#8b2500" }}>Danger Zone</div>
          <div style={styles.sectionSub}>
            Archive or permanently delete this class.
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
              {archiving ? "Restoring…" : "♻️ Restore Class"}
            </button>
          ) : (
            <button
              style={{ ...styles.deleteBtn, background: "#7a5800" }}
              disabled={archiving}
              onClick={async () => {
                if (!window.confirm(`Archive "${classData.name}"? It will be hidden but data is preserved.`)) return;
                setArchiving(true);
                await onArchiveClass?.();
                setArchiving(false);
              }}
            >
              {archiving ? "Archiving…" : "📦 Archive Class"}
            </button>
          )}
          <button style={styles.deleteBtn} onClick={onDeleteClass}>
            🗑️ Delete Class
          </button>
        </div>
      </div>
    </div>
  );
}
