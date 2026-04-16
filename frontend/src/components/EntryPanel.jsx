import React, { useState, useEffect } from "react";
import { GRADE_COLORS, DIVISION_COLORS, DEFAULT_SCHOOL, EXAM_TYPES, DEFAULT_EXAM_TYPE } from "../utils/constants";
import { getGrade, getDivision, computeStudent } from "../utils/grading";
import { validateStudent, validateSchoolInfo } from "../utils/validation";
import { TextInput, NumberInput, SelectInput } from "./FormInputs";
import { useViewport } from "../utils/useViewport";

export function EntryPanel({
  classId,
  classData,
  computed,
  onShowModal,
  onUpdateStudent,
  onDeleteStudent,
  onAddStudent,
  onUpdateSchool,
  onUpdateSubjects,
  onUpdateClassMeta,
  hideSettings = false,
  activeExam,
  onChangeExam,
}) {
  const subjects = classData.subjects ?? [];
  // Determine the effective active exam: prefer the prop, fall back to schoolInfo
  const effectiveExam = activeExam || classData.school_info?.exam || DEFAULT_EXAM_TYPE;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("index");
  const [sortAsc, setSortAsc] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [errors, setErrors] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkScores, setBulkScores] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkNotice, setBulkNotice] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [updatingSubjects, setUpdatingSubjects] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    ...DEFAULT_SCHOOL,
    ...(classData.school_info ?? {}),
  });
  const [schoolErrors, setSchoolErrors] = useState({});
  const [updatingSchool, setUpdatingSchool] = useState(false);
  const [classYear, setClassYear] = useState(classData.year ?? "");
  const [classForm, setClassForm] = useState(classData.form ?? "Form I");
  const [metaError, setMetaError] = useState("");
  const [updatingMeta, setUpdatingMeta] = useState(false);
  const [newStudent, setNewStudent] = useState({
    index_no: "",
    name: "",
    stream: "",
    sex: "M",
    status: "present",
  });
  const { isMobile } = useViewport();

  useEffect(() => {
    setClassYear(classData.year ?? "");
    setClassForm(classData.form ?? "Form I");
    setSchoolInfo({
      ...DEFAULT_SCHOOL,
      ...(classData.school_info ?? {}),
    });
    setSchoolErrors({});
  }, [classData.id, classData.year, classData.form]);

  useEffect(() => {
    if (!bulkMode) return;
    const next = {};
    (computed ?? []).forEach((s) => {
      next[s.id] = subjects.map((_, i) => s.grades?.[i]?.score ?? "");
    });
    setBulkScores(next);
  }, [bulkMode, computed, subjects]);

  const filtered = (computed ?? [])
    .filter(s =>
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.index_no.toString().includes(search) ||
      (s.stream ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let aVal = sortBy === "index" ? a.index_no : a[sortBy];
      let bVal = sortBy === "index" ? b.index_no : b[sortBy];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      return sortAsc ? (aVal > bVal ? 1 : -1) : bVal > aVal ? 1 : -1;
    });

  const handleEdit = s => {
    setEditId(s.id);
    setEditData({ ...s });
    setErrors({});
  };

  const handleSaveEdit = async () => {
    const validation = validateStudent(editData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    const scores = (classData.subjects ?? []).map((_, i) => editData.grades?.[i]?.score ?? null);
    await onUpdateStudent({
      ...editData,
      scores,
      examType: effectiveExam,
    });
    setEditId(null);
    setEditData(null);
    setErrors({});
  };

  const handleAddNew = async () => {
    const validation = validateStudent(newStudent);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    const scores = (classData.subjects ?? []).map(() => null);
    await onAddStudent({
      ...newStudent,
      scores,
      examType: effectiveExam,
    });
    setNewStudent({ index_no: "", name: "", stream: "", sex: "M", status: "present" });
    setAddingNew(false);
    setErrors({});
  };

  const csvEscape = (value) => {
    const raw = String(value ?? "");
    if (raw.includes("\"") || raw.includes(",") || raw.includes("\n")) {
      return `"${raw.replace(/\"/g, '""')}"`;
    }
    return raw;
  };

  const exportCsv = () => {
    const header = ["admission_no", "name", "stream", "sex", ...subjects].map(csvEscape).join(",");
    const rows = (computed ?? []).map((s) => {
      const scores = subjects.map((_, si) => s.grades?.[si]?.score ?? "");
      return [
        s.index_no ?? "",
        s.name ?? "",
        s.stream ?? "",
        s.sex ?? "",
        ...scores,
      ].map(csvEscape).join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${classData.name || "class"}-students.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const payload = {
      className: classData.name ?? "",
      subjects,
      students: classData.students ?? [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${classData.name || "class"}-students.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cleanSubject = (value) => String(value ?? "").trim();

  const handleAddSubject = async () => {
    const next = cleanSubject(subjectInput);
    if (!next) {
      setSubjectError("Subject name is required");
      return;
    }
    if (subjects.some(s => s.toLowerCase() === next.toLowerCase())) {
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
    if (!window.confirm(`Remove ${subject}? Existing scores will be hidden.`)) return;
    const next = subjects.filter(s => s !== subject);
    setUpdatingSubjects(true);
    await onUpdateSubjects?.(next);
    setUpdatingSubjects(false);
  };

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
    setMetaError("");
    setUpdatingMeta(true);
    await onUpdateClassMeta?.({ year: yearStr, form: classForm });
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

  const handleBulkScoreChange = (studentId, subjectIdx, value) => {
    setBulkScores(prev => ({
      ...prev,
      [studentId]: (prev[studentId] ?? subjects.map(() => "")).map((v, i) =>
        i === subjectIdx ? value : v
      ),
    }));
  };

  const handleBulkSave = async () => {
    if (bulkSaving) return;
    setBulkSaving(true);
    setBulkNotice("");
    let failures = 0;
    try {
      for (const s of filtered) {
        const row = bulkScores[s.id] ?? subjects.map(() => "");
        const scores = row.map((v) => {
          if (v === "" || v == null) return null;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        });
        const result = await onUpdateStudent({ ...s, scores, examType: effectiveExam }, { silent: true });
        if (!result?.ok) failures += 1;
      }
      setBulkNotice(
        failures > 0
          ? `Saved with ${failures} error${failures > 1 ? "s" : ""}.`
          : "All scores saved."
      );
    } finally {
      setBulkSaving(false);
    }
  };

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      padding: isMobile ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 0,
      minWidth: 0,
    },
    tlbx: {
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      alignItems: "center",
      background: "#f4f7ff",
      padding: isMobile ? 8 : 10,
      borderRadius: 8,
    },
    tlbGroup: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
      flex: "1 1 auto",
    },
    tlbDivider: {
      width: 1,
      height: 22,
      background: "#d0dcf8",
      display: isMobile ? "none" : "block",
    },
    bulkPanel: {
      background: "#fff",
      border: "1px solid #d0dcf8",
      borderRadius: 8,
      padding: isMobile ? 10 : 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
    },
    bulkTable: {
      borderCollapse: "collapse",
      width: "100%",
      fontSize: isMobile ? 10 : 11,
      background: "#fff",
      border: "1px solid #d6e0f5",
      minWidth: isMobile ? 680 : "auto",
    },
    bulkInput: {
      width: 44,
      padding: "3px 4px",
      borderRadius: 3,
      border: "1px solid #c6d5f5",
      fontSize: 10,
      textAlign: "center",
      background: "#f9fbff",
      outline: "none",
    },
    subjectPanel: {
      background: "#fff",
      border: "1px solid #d0dcf8",
      borderRadius: 8,
      padding: isMobile ? 10 : 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    metaPanel: {
      background: "#fff",
      border: "1px solid #d0dcf8",
      borderRadius: 8,
      padding: isMobile ? 10 : 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    schoolPanel: {
      background: "#fff",
      border: "1px solid #d0dcf8",
      borderRadius: 8,
      padding: isMobile ? 10 : 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    subjectRow: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
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
    subjectInput: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      height: 30,
      minWidth: 160,
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
    },
    metaInput: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      height: 30,
      minWidth: isMobile ? 0 : 120,
      width: isMobile ? "100%" : "auto",
    },
    metaSelect: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      height: 30,
      minWidth: isMobile ? 0 : 120,
      width: isMobile ? "100%" : "auto",
    },
    metaBtn: {
      padding: "6px 12px",
      height: 30,
      borderRadius: 6,
      border: "none",
      background: "#0b6b3a",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.panel}>
      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 800 }}>
          📝 Student Entry
        </h3>
        <div style={{ fontSize: 11, color: "#667", marginBottom: 8 }}>
          Add, edit, and score students for this class.
        </div>
        <div style={styles.tlbx}>
          {/* Exam selector – always visible */}
          <div style={{ ...styles.tlbGroup, alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#003366", whiteSpace: "nowrap" }}>
              📋 Exam:
            </span>
            <select
              value={effectiveExam}
              onChange={e => onChangeExam && onChangeExam(e.target.value)}
              style={{
                padding: "6px 8px",
                borderRadius: 5,
                border: "2px solid #003366",
                height: 30,
                fontWeight: 700,
                fontSize: 11,
                background: "#f0f5ff",
                color: "#003366",
                cursor: "pointer",
                width: isMobile ? "100%" : "auto",
              }}
            >
              {EXAM_TYPES.map(et => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
          <div style={styles.tlbDivider} />
          <div style={styles.tlbGroup}>
            <input
              type="text"
              placeholder="🔍 Search name, CNO, or status"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: "6px 8px",
                borderRadius: 5,
                border: "1px solid #d0dcf8",
                flex: 1,
                minWidth: 150,
                height: 30,
                width: isMobile ? "100%" : "auto",
              }}
            />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: "6px 8px",
                borderRadius: 5,
                border: "1px solid #d0dcf8",
                height: 30,
                width: isMobile ? "100%" : "auto",
              }}
            >
              <option value="index">Sort: CNO</option>
              <option value="name">Sort: Name</option>
              <option value="total">Sort: Total</option>
              <option value="agrd">Sort: Grade</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              style={{
                padding: "6px 12px",
                background: "#003366",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 700,
                height: 30,
                width: isMobile ? "100%" : "auto",
              }}
            >
              {sortAsc ? "⬆" : "⬇"}
            </button>
          </div>
          <div style={styles.tlbDivider} />
          <div style={styles.tlbGroup}>
            <button
              onClick={() => onShowModal("csv-import")}
              title="Import students from CSV"
              style={{
                padding: "6px 12px",
                background: "#0077aa",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 700,
                height: 30,
                width: isMobile ? "100%" : "auto",
              }}
            >
              📤 Import CSV
            </button>
            <button
              onClick={exportCsv}
              title="Export students as CSV"
              style={{
                padding: "6px 12px",
                background: "#003366",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 700,
                height: 30,
                width: isMobile ? "100%" : "auto",
              }}
            >
              ⬇ Export CSV
            </button>
            <button
              onClick={() => onShowModal("json-import")}
              title="Import students from JSON"
              style={{
                padding: "6px 12px",
                background: "#5a2d82",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 700,
                height: 30,
                width: isMobile ? "100%" : "auto",
              }}
            >
              📥 Import JSON
            </button>
            <button
              onClick={exportJson}
              title="Export students as JSON"
              style={{
                padding: "6px 12px",
                background: "#5a2d82",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 700,
                height: 30,
                width: isMobile ? "100%" : "auto",
              }}
            >
              ⬇ Export JSON
            </button>
          </div>
          <div style={styles.tlbDivider} />
          <div style={styles.tlbGroup}>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              title="Bulk score entry"
              style={{
                padding: "6px 12px",
                background: bulkMode ? "#8b2500" : "#003366",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 700,
                height: 30,
                width: isMobile ? "100%" : "auto",
              }}
            >
              {bulkMode ? "✕ Bulk Mode" : "🧮 Bulk Scores"}
            </button>
            <button
              onClick={() => setAddingNew(!addingNew)}
              title="Add a new student"
              style={{
                padding: "6px 12px",
                background: "#0b6b3a",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 700,
                height: 30,
                width: isMobile ? "100%" : "auto",
              }}
            >
              ➕ New
            </button>
          </div>
        </div>
      </div>

      {!hideSettings && (
      <div style={styles.schoolPanel}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#003366" }}>School Information</div>
            <div style={{ fontSize: 10, color: "#667" }}>
              Appears on report cards and result sheets.
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}
        >
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
            label="Form"
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
            label="Year"
            value={schoolInfo.year}
            onChange={(v) => setSchoolInfo({ ...schoolInfo, year: v })}
            error={schoolErrors.year}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={styles.metaBtn} onClick={handleUpdateSchool} disabled={updatingSchool}>
            {updatingSchool ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      )}

      {!hideSettings && (
      <div style={styles.metaPanel}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#003366" }}>Class Year & Form</div>
            <div style={{ fontSize: 10, color: "#667" }}>
              Used to group results by academic year.
            </div>
          </div>
        </div>
        <div style={styles.subjectRow}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Year"
            value={classYear}
            onChange={e => setClassYear(e.target.value)}
            style={styles.metaInput}
          />
          <select
            value={classForm}
            onChange={e => setClassForm(e.target.value)}
            style={styles.metaSelect}
          >
            <option value="Form I">Form I</option>
            <option value="Form II">Form II</option>
            <option value="Form III">Form III</option>
            <option value="Form IV">Form IV</option>
          </select>
          <button
            style={styles.metaBtn}
            onClick={handleUpdateMeta}
            disabled={updatingMeta}
          >
            Save
          </button>
          {metaError && (
            <div style={{ fontSize: 10, color: "#8b2500", fontWeight: 700 }}>
              {metaError}
            </div>
          )}
        </div>
      </div>
      )}

      {!hideSettings && (
      <div style={styles.subjectPanel}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#003366" }}>Subjects</div>
            <div style={{ fontSize: 10, color: "#667" }}>
              Add or remove subjects for this class. Scores are remapped automatically.
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#667" }}>{subjects.length} subjects</div>
        </div>
        <div style={styles.subjectRow}>
          {subjects.length === 0 && (
            <div style={{ fontSize: 10, color: "#999" }}>No subjects yet.</div>
          )}
          {subjects.map((subj) => (
            <span key={subj} style={styles.subjectChip}>
              {subj}
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
        <div style={styles.subjectRow}>
          <input
            type="text"
            placeholder="Add subject"
            value={subjectInput}
            onChange={e => setSubjectInput(e.target.value)}
            onKeyDown={e => {
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
          {subjectError && (
            <div style={{ fontSize: 10, color: "#8b2500", fontWeight: 700 }}>
              {subjectError}
            </div>
          )}
        </div>
      </div>
      )}

      {addingNew && (
        <div
          style={{
            background: "#fff",
            border: "2px dashed #0b6b3a",
            borderRadius: 8,
            padding: isMobile ? 10 : 12,
          }}
        >
          <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800 }}>Add Student</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <TextInput
              label="CNO (Auto)"
              value={newStudent.index_no}
              onChange={v => setNewStudent({ ...newStudent, index_no: v })}
              error={errors.index_no}
            />
            <TextInput
              label="Name"
              value={newStudent.name}
              onChange={v => setNewStudent({ ...newStudent, name: v })}
              error={errors.name}
            />
            <TextInput
              label="Stream"
              value={newStudent.stream}
              onChange={v => setNewStudent({ ...newStudent, stream: v })}
              error={errors.stream}
            />
            <SelectInput
              label="Sex"
              value={newStudent.sex}
              onChange={v => setNewStudent({ ...newStudent, sex: v })}
              options={[
                { label: "Male", value: "M" },
                { label: "Female", value: "F" },
              ]}
            />
            <SelectInput
              label="Status"
              value={newStudent.status}
              onChange={v => setNewStudent({ ...newStudent, status: v })}
              options={[
                { label: "Present", value: "present" },
                { label: "Absent", value: "absent" },
              ]}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button
              onClick={handleAddNew}
              style={{
                padding: "6px 16px",
                background: "#0b6b3a",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Save
            </button>
            <button
              onClick={() => setAddingNew(false)}
              style={{
                padding: "6px 16px",
                background: "#888",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!computed?.length && (
        <div
          style={{
            background: "#fff",
            border: "1px dashed #c8d8f8",
            borderRadius: 8,
            padding: 16,
            textAlign: "center",
            color: "#666",
            fontSize: 12,
          }}
        >
          No students yet. Use "Import CSV" or click "New" to add the first student.
        </div>
      )}

      {bulkMode ? (
        <div style={styles.bulkPanel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#003366" }}>Bulk Scoring Grid</div>
              <div style={{ fontSize: 10, color: "#667" }}>Enter scores for all students quickly.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {bulkNotice && (
                <div style={{ fontSize: 10, color: "#0b6b3a", fontWeight: 700, alignSelf: "center" }}>
                  {bulkNotice}
                </div>
              )}
              <button
                onClick={handleBulkSave}
                disabled={bulkSaving || subjects.length === 0 || filtered.length === 0}
                style={{
                  padding: "6px 12px",
                  background: bulkSaving ? "#999" : "#0b6b3a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  cursor: bulkSaving ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  height: 30,
                }}
              >
                {bulkSaving ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", minWidth: 0 }}>
            <table style={styles.bulkTable}>
              <thead>
                <tr style={{ background: "#003366", color: "#fff" }}>
                  {[
                    "CNO",
                    "Name",
                    "Stream",
                    ...subjects.map((s) => s.slice(0, 3)),
                  ].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      style={{
                        padding: "5px 6px",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: 10,
                        border: "1px solid #224488",
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #d2def5", fontWeight: 700 }}>
                      {s.index_no}
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #d2def5" }}>{s.name}</td>
                    <td style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #d2def5" }}>{s.stream ?? "–"}</td>
                    {subjects.map((_, si) => (
                      <td key={si} style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #d2def5" }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={bulkScores[s.id]?.[si] ?? ""}
                          onChange={(e) => handleBulkScoreChange(s.id, si, e.target.value)}
                          style={styles.bulkInput}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={3 + subjects.length}
                      style={{ padding: 20, textAlign: "center", color: "#aaa", border: "1px solid #e0e8ff" }}
                    >
                      No students match your search
                    </td>
                  </tr>
                )}
                {subjects.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      style={{ padding: 20, textAlign: "center", color: "#aaa", border: "1px solid #e0e8ff" }}
                    >
                      Add subjects to start bulk scoring.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto", minWidth: 0 }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: isMobile ? 10 : 11,
              background: "#fff",
              minWidth: isMobile ? 900 : "auto",
            }}
          >
          <thead>
            <tr style={{ background: "#003366", color: "#fff" }}>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "left",
                  fontWeight: 700,
                    border: "1px solid #224488",
                }}
              >
                CNO
              </th>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "left",
                  fontWeight: 700,
                    border: "1px solid #224488",
                }}
              >
                Name
              </th>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "left",
                  fontWeight: 700,
                  border: "1px solid #224488",
                }}
              >
                Stream
              </th>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "center",
                  fontWeight: 700,
                  border: "1px solid #224488",
                }}
              >
                Sex
              </th>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "center",
                  fontWeight: 700,
                  border: "1px solid #224488",
                }}
              >
                Status
              </th>
              {/* Subject Score Headers */}
              {subjects.map((subj, i) => (
                <th
                  key={i}
                  style={{
                    padding: "5px 4px",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 9,
                    border: "1px solid #224488",
                    maxWidth: 40,
                  }}
                  title={subj}
                >
                  {subj.slice(0, 3)}
                </th>
              ))}
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "center",
                  fontWeight: 700,
                  border: "1px solid #224488",
                }}
              >
                Total
              </th>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "center",
                  fontWeight: 700,
                  border: "1px solid #224488",
                }}
              >
                Avg
              </th>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "center",
                  fontWeight: 700,
                  border: "1px solid #224488",
                }}
              >
                Grade
              </th>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "center",
                  fontWeight: 700,
                  border: "1px solid #224488",
                }}
              >
                Div
              </th>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "left",
                  fontWeight: 700,
                  border: "1px solid #224488",
                  minWidth: 80,
                }}
              >
                Remarks
              </th>
              <th
                style={{
                  padding: "5px 6px",
                  textAlign: "center",
                  fontWeight: 700,
                  border: "1px solid #224488",
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const isEditing = editId === s.id;
              return (
                <tr
                  key={s.id}
                  style={{
                    background: isEditing
                      ? "#e8f4ff"
                      : i % 2 === 0
                      ? "#fff"
                      : "#f8fafc",
                  }}
                >
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #d2def5",
                      fontWeight: 700,
                    }}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.index_no}
                        onChange={e =>
                          setEditData({ ...editData, index_no: e.target.value })
                        }
                        style={{
                          width: 50,
                          padding: "3px 4px",
                          borderRadius: 3,
                          border: "1px solid #d0dcf8",
                        }}
                      />
                    ) : (
                      s.index_no
                    )}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "left",
                      border: "1px solid #d2def5",
                    }}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={e =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                        style={{
                          width: 100,
                          padding: "3px 4px",
                          borderRadius: 3,
                          border: "1px solid #d0dcf8",
                        }}
                      />
                    ) : (
                      s.name
                    )}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "left",
                      border: "1px solid #d2def5",
                    }}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.stream ?? ""}
                        onChange={e =>
                          setEditData({ ...editData, stream: e.target.value })
                        }
                        style={{
                          width: 70,
                          padding: "3px 4px",
                          borderRadius: 3,
                          border: "1px solid #d0dcf8",
                        }}
                      />
                    ) : (
                      s.stream ?? "–"
                    )}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #d2def5",
                    }}
                  >
                    {isEditing ? (
                      <select
                        value={editData.sex}
                        onChange={e =>
                          setEditData({ ...editData, sex: e.target.value })
                        }
                        style={{
                          padding: "3px 4px",
                          borderRadius: 3,
                          border: "1px solid #d0dcf8",
                        }}
                      >
                        <option>M</option>
                        <option>F</option>
                      </select>
                    ) : (
                      s.sex
                    )}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #d2def5",
                    }}
                  >
                    {isEditing ? (
                      <select
                        value={editData.status}
                        onChange={e =>
                          setEditData({ ...editData, status: e.target.value })
                        }
                        style={{
                          padding: "3px 4px",
                          borderRadius: 3,
                          border: "1px solid #d0dcf8",
                        }}
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                      </select>
                    ) : (
                      s.status
                    )}
                  </td>

                  {/* Score inputs */}
                  {(classData.subjects ?? []).map((subj, si) => {
                    const score = isEditing ? editData.grades?.[si]?.score ?? "" : s.grades?.[si]?.score ?? "–";
                    return (
                      <td
                        key={si}
                        style={{
                          padding: "4px 4px",
                          textAlign: "center",
                          border: "1px solid #d2def5",
                          minWidth: 45,
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={score === "" ? "" : score}
                            onChange={e => {
                              const v = parseInt(e.target.value, 10) || null;
                              const newGrades = [...(editData.grades ?? [])];
                              newGrades[si] = {
                                ...newGrades[si],
                                score: v,
                                grade: v != null ? getGrade(v) : null,
                              };
                              setEditData({ ...editData, grades: newGrades });
                            }}
                            style={{
                              width: 40,
                              padding: "2px 3px",
                              borderRadius: 3,
                              border: "1px solid #d0dcf8",
                              fontSize: 10,
                            }}
                          />
                        ) : (
                          score
                        )}
                      </td>
                    );
                  })}

                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #d2def5",
                      fontWeight: 700,
                    }}
                  >
                    {s.total ?? "–"}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #d2def5",
                    }}
                  >
                    {s.avg ?? "–"}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #d2def5",
                      fontWeight: 700,
                      color: GRADE_COLORS[s.agrd],
                    }}
                  >
                    {s.agrd ?? "–"}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #d2def5",
                      fontWeight: 700,
                      color: DIVISION_COLORS[s.div],
                    }}
                  >
                    {s.div ?? "–"}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "left",
                      border: "1px solid #d2def5",
                      maxWidth: isMobile ? 140 : 200,
                    }}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.remarks ?? ""}
                        onChange={e =>
                          setEditData({ ...editData, remarks: e.target.value })
                        }
                        placeholder="Optional remark"
                        style={{
                          width: "100%",
                          padding: "3px 4px",
                          borderRadius: 3,
                          border: "1px solid #d0dcf8",
                          fontSize: 10,
                          boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <span
                        title={s.remarks || ""}
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: isMobile ? 140 : 200,
                          fontSize: 10,
                          color: s.remarks ? "#333" : "#bbb",
                        }}
                      >
                        {s.remarks || "–"}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #d2def5",
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            padding: "3px 6px",
                            background: "#0b6b3a",
                            color: "#fff",
                            border: "none",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditId(null);
                            setEditData(null);
                            setErrors({});
                          }}
                          style={{
                            padding: "3px 6px",
                            background: "#888",
                            color: "#fff",
                            border: "none",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button
                          onClick={() => handleEdit(s)}
                          style={{
                            padding: "3px 6px",
                            background: "#0077aa",
                            color: "#fff",
                            border: "none",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => onShowModal("report-card-export", s.id)}
                          style={{
                            padding: "3px 6px",
                            background: "#003366",
                            color: "#fff",
                            border: "none",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          📥
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${s.name || "this student"}?`)) {
                              onDeleteStudent(s.id);
                            }
                          }}
                          style={{
                            padding: "3px 6px",
                            background: "#8b2500",
                            color: "#fff",
                            border: "none",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td
                  colSpan={17}
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "#aaa",
                    border: "1px solid #e0e8ff",
                  }}
                >
                  No students match your search
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
