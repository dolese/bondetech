import React, { useState, useEffect } from "react";
import {
  GRADE_BACKGROUNDS,
  DIVISION_COLORS,
  DEFAULT_SCHOOL,
  EXAM_TYPES,
  DEFAULT_EXAM_TYPE,
  getMonthlyExamKey,
  getCompositeEntry,
} from "../utils/constants";
import { getGrade, getDivision, computeStudent } from "../utils/grading";
import { validateStudent } from "../utils/validation";
import { TextInput, NumberInput, SelectInput } from "./FormInputs";
import { useViewport } from "../utils/useViewport";
import { exportXlsx } from "../utils/xlsxExport";
import { DEFAULT_CONDUCT } from "../hooks/useClasses";
import { normalizeTzPhoneDraft } from "../utils/phone";

const CONDUCT_FIELDS = [
  ["utendajiKazi", "UTENDAJI KAZI"],
  ["nidhamNaUtii", "NIDHAM NA UTII"],
  ["utunzajiMali", "UTUNZAJI MALI"],
  ["uongozi", "UONGOZI"],
  ["michezo", "MICHEZO"],
  ["ushirikiano", "USHIRIKIANO"],
];

const GRADE_TEXT_COLOR = "#111827";

// Return the appropriate display value for a grade cell in view mode.
// In composite mode grade.raw holds the current-exam entry; fall back to grade.score.
function gradeDisplayValue(grade) {
  if (!grade) return "–";
  if (grade.raw === "ABS") return "ABS";
  if (grade.raw != null) return grade.raw;
  if (grade.score != null) return grade.score;
  return "–";
}

function normalizeMarkInput(value) {
  if (value === "" || value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return Math.min(100, Math.max(0, Math.trunc(num)));
}

function normalizeSubjectMetadataList(classData = {}) {
  const subjects = Array.isArray(classData?.subjects) ? classData.subjects : [];
  const metadata = Array.isArray(classData?.subject_metadata)
    ? classData.subject_metadata
    : Array.isArray(classData?.subjectMetadata)
    ? classData.subjectMetadata
    : [];
  const byName = new Map(
    metadata.flatMap((entry) => {
      const name = String(entry?.name || entry?.subject || "").trim();
      if (!name) return [];
      const type = String(entry?.type || "compulsory").trim().toLowerCase();
      return [[name.toLowerCase(), type === "optional" ? "optional" : "compulsory"]];
    }),
  );
  return subjects.map((subject) => ({
    name: String(subject || "").trim(),
    type: byName.get(String(subject || "").trim().toLowerCase()) || "compulsory",
  }));
}

function getStudentOptionalSubjects(student = {}) {
  return new Set(
    (Array.isArray(student.optionalSubjects) ? student.optionalSubjects : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  );
}

function normalizeAdmissionDraft(value) {
  const raw = String(value || "").toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";
  if (/^\d{4}-\d*$/.test(raw)) return `BSS-${raw}`;
  if (/^BSS(?=\d{4}-\d*$)/.test(raw)) return `BSS-${raw.slice(3)}`;
  if (raw.startsWith("BSS--")) return `BSS-${raw.slice(5)}`;
  return raw;
}

function parseCnoOrderValue(value) {
  const raw = String(value || "").trim().toUpperCase();
  const match = raw.match(/\/(\d+)$/);
  if (match) return Number(match[1]);
  return Number.MAX_SAFE_INTEGER;
}

function normalizeStudentName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function countInstructionWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function EntryPanel({
  classId,
  classData,
  computed,
  onShowModal,
  onUpdateStudent,
  onDeleteStudent,
  onAddStudent,
  onReorderStudentCnos,
  canDeleteStudents = false,
  onUpdateSchool,
  onUpdateSubjects,
  onUpdateClassMeta,
  hideSettings = false,
  activeExam,
  onChangeExam,
  resultsLocked = false,
  streamFilterOptions = null,
  formSelectorOptions = null,
  currentForm = "",
  onSelectForm,
}) {
  const subjects = classData.subjects ?? [];
  const duplicateWarningMessage =
    "Possible duplicate student found in this class. Review the existing record below, then save again if you still want to continue.";
  const subjectMetadata = normalizeSubjectMetadataList(classData);
  const currentClassLabel = [classData.form, classData.stream, classData.year]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");
  const optionalSubjectOptions = subjectMetadata
    .filter((entry) => entry.type === "optional")
    .map((entry) => entry.name);
  const isSubjectVisibleForStudent = (student, subjectIndex) => {
    const meta = subjectMetadata[subjectIndex];
    if (!meta || meta.type !== "optional") return true;
    if (!student?.optionalSubjectsConfigured && !Array.isArray(student?.optionalSubjects)) {
      return true;
    }
    return getStudentOptionalSubjects(student).has(meta.name);
  };
  // Determine the effective active exam: prefer the prop, fall back to schoolInfo
  const effectiveExam = activeExam || classData.school_info?.exam || DEFAULT_EXAM_TYPE;
  // Composite exam: combines current + partner exam scores as (current + partner) / 2
  const compositeEntry = getCompositeEntry(effectiveExam, classData.composite_config ?? {});
  const monthlyExamOptions = Array.isArray(classData.monthly_exams)
    ? classData.monthly_exams.map((month) => ({
        value: getMonthlyExamKey(month),
        label: `${month} Exam`,
      }))
    : [];
  const examOptions = [...EXAM_TYPES, ...monthlyExamOptions].filter(
    (option, index, all) => all.findIndex((entry) => entry.value === option.value) === index
  );
  const [search, setSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("all");
  const [sortBy, setSortBy] = useState("index");
  const [sortAsc, setSortAsc] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [errors, setErrors] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [savingNewStudent, setSavingNewStudent] = useState(false);
  const [savingEditStudent, setSavingEditStudent] = useState(false);
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
  const [savingInstruction, setSavingInstruction] = useState(false);
  const [instructionNotice, setInstructionNotice] = useState("");
  const [instructionNoticeType, setInstructionNoticeType] = useState("success");
  const [showInstructionPanel, setShowInstructionPanel] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [reorderingCnos, setReorderingCnos] = useState(false);
  const [classYear, setClassYear] = useState(classData.year ?? "");
  const [classForm, setClassForm] = useState(classData.form ?? "Form I");
  const [classStream, setClassStream] = useState(classData.stream ?? "A");
  const [metaError, setMetaError] = useState("");
  const [updatingMeta, setUpdatingMeta] = useState(false);
  const [newStudent, setNewStudent] = useState({
    admission_no: "",
    index_no: "",
    firstName: "",
    lastName: "",
    sex: "M",
    status: "present",
    dateOfBirth: "",
    parentName: "",
    parentPhone: "",
    address: "",
    optionalSubjectsConfigured: true,
    optionalSubjects: [],
    conduct: { ...DEFAULT_CONDUCT },
  });
  const { isMobile, isTablet } = useViewport();
  const compactLayout = isMobile || isTablet;
  const editingLocked = Boolean(resultsLocked);
  const instructionText = String(schoolInfo.reportInstruction ?? "");
  const instructionWordCount = countInstructionWords(instructionText);
  const [duplicateSaveConfirmed, setDuplicateSaveConfirmed] = useState(false);

  useEffect(() => {
    setStreamFilter("all");
    setClassYear(classData.year ?? "");
    setClassForm(classData.form ?? "Form I");
    setClassStream(classData.stream ?? "A");
    setSchoolInfo({
      ...DEFAULT_SCHOOL,
      ...(classData.school_info ?? {}),
    });
    setInstructionNotice("");
    setInstructionNoticeType("success");
    setShowInstructionPanel(false);
    setShowImportMenu(false);
    setShowExportMenu(false);
    setShowAdvancedMenu(false);
  }, [classData.id, classData.year, classData.form, classData.stream]);

  const availableStreamFilters = Array.isArray(streamFilterOptions) && streamFilterOptions.length
    ? streamFilterOptions
    : [
        { value: "all", label: "All Streams" },
        ...Array.from(
          new Set(
            (classData.students ?? [])
              .map((student) => String(student.stream || "").trim().toUpperCase())
              .map((value) => value || "unassigned")
              .filter(Boolean),
          ),
        )
          .sort((left, right) => left.localeCompare(right, "en"))
          .map((value) => ({
            value,
            label: value === "unassigned" ? "Unassigned" : `Stream ${value}`,
          })),
      ];
  const hasStreamFilter = availableStreamFilters.some((entry) => entry.value !== "all");

  useEffect(() => {
    setSchoolInfo((prev) => (
      prev.exam === effectiveExam
        ? prev
        : { ...prev, exam: effectiveExam }
    ));
  }, [effectiveExam]);

  useEffect(() => {
    if (!bulkMode) return;
    const next = {};
    (computed ?? []).forEach((s) => {
      // Use raw score (current exam's entered value) so teachers edit what they entered,
      // not the combined average produced in composite mode.
      next[s.id] = subjects.map((_, i) => {
        const g = s.grades?.[i];
        if (!g) return "";
        if (g.raw === "ABS") return "";
        return g.raw ?? g.score ?? "";
      });
    });
    setBulkScores(next);
  }, [bulkMode, computed, subjects]);

  const currentExamExportValue = (grade) => {
    if (!grade) return "";
    if (grade.raw === "ABS") return "ABS";
    if (grade.raw != null) return grade.raw;
    if (grade.score != null) return grade.score;
    return "";
  };

  const pendingStudentName = [newStudent.firstName, newStudent.lastName]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

  const possibleDuplicateStudents = (classData.students ?? [])
    .filter((student) => {
      const existingName = normalizeStudentName(
        student?.name ||
          [student?.firstName, student?.lastName]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .join(" "),
      );
      if (!existingName) return false;
      if (existingName !== normalizeStudentName(pendingStudentName)) return false;
      return true;
    })
    .map((student) => ({
      id: student.id,
      name:
        String(student?.name || "").trim() ||
        [student?.firstName, student?.lastName]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(" "),
      sex: String(student?.sex || "").trim().toUpperCase(),
      indexNo: String(student?.index_no || student?.indexNo || "").trim(),
      admissionNo: String(student?.admission_no || student?.admissionNo || "").trim(),
      guardianName: String(student?.parentName || student?.parent_name || "").trim(),
      guardianPhone: String(student?.parentPhone || student?.parent_phone || "").trim(),
    }))
    .sort((a, b) => {
      const aSameSex = a.sex && a.sex === String(newStudent.sex || "").trim().toUpperCase();
      const bSameSex = b.sex && b.sex === String(newStudent.sex || "").trim().toUpperCase();
      if (aSameSex !== bSameSex) return aSameSex ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });

  useEffect(() => {
    setDuplicateSaveConfirmed(false);
    setErrors((prev) => (
      prev?._form === duplicateWarningMessage
        ? { ...prev, _form: undefined }
        : prev
    ));
  }, [
    addingNew,
    newStudent.firstName,
    newStudent.lastName,
    newStudent.sex,
    newStudent.parentName,
    newStudent.parentPhone,
  ]);

  const filtered = (computed ?? [])
    .filter((s) => {
      const query = String(search || "").trim().toLowerCase();
      if (!query) return true;
      return (
        String(s.name || "").toLowerCase().includes(query) ||
        String(s.displayIndexNo || "").toLowerCase().includes(query) ||
        String(s.index_no || "").toLowerCase().includes(query) ||
        String(s.admissionNo || s.admission_no || "").toLowerCase().includes(query) ||
        String(s.status || "").toLowerCase().includes(query)
      );
    })
    .filter((s) => {
      if (streamFilter === "all") return true;
      const normalizedStream = String(s.stream || "").trim().toUpperCase();
      if (streamFilter === "unassigned") return !normalizedStream;
      return normalizedStream === streamFilter;
    })
    .sort((a, b) => {
      let aVal = sortBy === "index" ? parseCnoOrderValue(a.displayIndexNo || a.index_no) : a[sortBy];
      let bVal = sortBy === "index" ? parseCnoOrderValue(b.displayIndexNo || b.index_no) : b[sortBy];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      return sortAsc ? (aVal > bVal ? 1 : -1) : bVal > aVal ? 1 : -1;
    });

  // Students whose class has no stream value show up as "Unassigned". Surface a
  // clear admin prompt so the gap can be fixed in Forms & Streams.
  const unassignedCount = (computed ?? []).filter(
    (s) => !String(s.stream || "").trim(),
  ).length;

  const handleEdit = s => {
    setEditId(s.id);
    setEditData({
      ...s,
      parentPhone: normalizeTzPhoneDraft(s.parentPhone || s.parent_phone || ""),
      optionalSubjectsConfigured: Boolean(s.optionalSubjectsConfigured),
      optionalSubjects: Array.isArray(s.optionalSubjects) ? s.optionalSubjects : [],
      conduct: { ...DEFAULT_CONDUCT, ...(s.conduct ?? {}) },
    });
    setErrors({});
  };

  const handleSaveEdit = async () => {
    if (editingLocked) return;
    const validation = validateStudent(editData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setSavingEditStudent(true);
    try {
      // Use grade.raw when available (avoids saving the combined average in composite mode).
      const scores = (classData.subjects ?? []).map((_, i) => {
        const g = editData.grades?.[i];
        if (!g) return null;
        if (g.raw === "ABS") return "ABS";
        return g.raw ?? g.score ?? null;
      });
      const result = await onUpdateStudent({
        ...editData,
        optionalSubjects: Array.isArray(editData.optionalSubjects) ? editData.optionalSubjects : [],
        scores,
        examType: effectiveExam,
      });
      if (result && result.ok === false) {
        setErrors((prev) => ({ ...prev, _form: result.error || "Unable to update student." }));
        return;
      }
      setEditId(null);
      setEditData(null);
      setErrors({});
    } catch (err) {
      setErrors((prev) => ({ ...prev, _form: err.message || "Unable to update student." }));
    } finally {
      setSavingEditStudent(false);
    }
  };

  const handleAddNew = async () => {
    if (editingLocked) return;
    const registrationName = pendingStudentName;
    const validation = validateStudent({
      ...newStudent,
      name: registrationName || newStudent.name,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    if (!registrationName) {
      setErrors((prev) => ({ ...prev, name: "Student name is required" }));
      return;
    }
    if (!String(newStudent.parentName || "").trim()) {
      setErrors((prev) => ({ ...prev, parentName: "Guardian name is required" }));
      return;
    }
    if (possibleDuplicateStudents.length > 0 && !duplicateSaveConfirmed) {
      setDuplicateSaveConfirmed(true);
      setErrors((prev) => ({ ...prev, _form: duplicateWarningMessage }));
      return;
    }
    setSavingNewStudent(true);
    try {
      const scores = (classData.subjects ?? []).map(() => null);
      const result = await onAddStudent({
        ...newStudent,
        admission_no: normalizeAdmissionDraft(newStudent.admission_no),
        name: registrationName,
        parentPhone: normalizeTzPhoneDraft(newStudent.parentPhone),
        optionalSubjects: Array.isArray(newStudent.optionalSubjects) ? newStudent.optionalSubjects : [],
        scores,
        examType: effectiveExam,
      });
      if (result && result.ok === false) {
        setErrors((prev) => ({ ...prev, _form: result.error || "Unable to add student." }));
        return;
      }
      setNewStudent({
        admission_no: "",
        index_no: "",
        firstName: "",
        lastName: "",
        sex: "M",
        status: "present",
        dateOfBirth: "",
        parentName: "",
        parentPhone: "",
        address: "",
        optionalSubjectsConfigured: true,
        optionalSubjects: [],
        conduct: { ...DEFAULT_CONDUCT },
      });
      setAddingNew(false);
      setDuplicateSaveConfirmed(false);
      setErrors({});
    } catch (err) {
      setErrors((prev) => ({ ...prev, _form: err.message || "Unable to add student." }));
    } finally {
      setSavingNewStudent(false);
    }
  };

  const toggleNewStudentOptionalSubject = (subject) => {
    const normalized = String(subject || "").trim();
    if (!normalized) return;
    setNewStudent((prev) => {
      const exists = (prev.optionalSubjects || []).includes(normalized);
      return {
        ...prev,
        optionalSubjects: exists
          ? (prev.optionalSubjects || []).filter((entry) => entry !== normalized)
          : [...(prev.optionalSubjects || []), normalized],
      };
    });
  };

  const toggleEditOptionalSubject = (subject) => {
    const normalized = String(subject || "").trim();
    if (!normalized || !editData) return;
    const current = Array.isArray(editData.optionalSubjects) ? editData.optionalSubjects : [];
    const exists = current.includes(normalized);
    setEditData({
      ...editData,
      optionalSubjects: exists
        ? current.filter((entry) => entry !== normalized)
        : [...current, normalized],
    });
  };

  const csvEscape = (value) => {
    const raw = String(value ?? "");
    if (raw.includes("\"") || raw.includes(",") || raw.includes("\n")) {
      return `"${raw.replace(/\"/g, '""')}"`;
    }
    return raw;
  };

  const exportCsv = () => {
    const header = ["index_no", "name", "sex", ...subjects].map(csvEscape).join(",");
    const rows = (computed ?? []).map((s) => {
      const scores = subjects.map((_, si) => currentExamExportValue(s.grades?.[si]));
      return [
        s.displayIndexNo || s.index_no || "",
        s.name ?? "",
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
      students: computed ?? [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${classData.name || "class"}-students.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXlsx = () => {
    const headers = [
      "CNO", "Name", "Sex",
      ...subjects,
    ];
    const rows = (computed ?? []).map((s) => {
      const scores = subjects.map((_, si) => {
        const value = currentExamExportValue(s.grades?.[si]);
        if (value === "" || value == null) return "";
        if (value === "ABS") return "ABS";
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : value;
      });
      return [
        s.displayIndexNo || s.index_no || "",
        s.name ?? "",
        s.sex ?? "",
        ...scores,
      ];
    });
    exportXlsx(`${classData.name || "class"}-students`, headers, rows).catch((err) => {
      console.error("XLSX export failed:", err);
    });
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
    if (!classStream || !String(classStream).trim()) {
      setMetaError("Stream is required");
      return;
    }
    setMetaError("");
    setUpdatingMeta(true);
    await onUpdateClassMeta?.({ year: yearStr, form: classForm, stream: classStream });
    setUpdatingMeta(false);
  };

  const handleSaveReportInstruction = async () => {
    const nextSchoolInfo = {
      ...schoolInfo,
      reportInstruction: String(schoolInfo.reportInstruction ?? "").trim(),
    };
    setSchoolInfo(nextSchoolInfo);
    setSavingInstruction(true);
    setInstructionNotice("");
    setInstructionNoticeType("success");
    try {
      await onUpdateSchool?.(nextSchoolInfo);
      setInstructionNotice(
        nextSchoolInfo.reportInstruction
          ? "Maagizo yamehifadhiwa kwa darasa hili."
          : "Maagizo yameondolewa kwa darasa hili."
      );
    } catch (error) {
      setInstructionNoticeType("error");
      setInstructionNotice(error?.message || "Imeshindikana kuhifadhi maagizo ya darasa hili.");
    } finally {
      setSavingInstruction(false);
    }
  };

  const handleBulkScoreChange = (studentId, subjectIdx, value) => {
    const normalized = normalizeMarkInput(value);
    setBulkScores(prev => ({
      ...prev,
      [studentId]: (prev[studentId] ?? subjects.map(() => "")).map((v, i) =>
        i === subjectIdx ? normalized : v
      ),
    }));
  };

  const handleBulkSave = async () => {
    if (editingLocked || bulkSaving) return;
    setBulkSaving(true);
    setBulkNotice("");
    let failures = 0;
    try {
      for (const s of filtered) {
        const row = bulkScores[s.id] ?? subjects.map(() => "");
        const scores = row.map((v) => {
          if (v === "" || v == null) return null;
          const n = normalizeMarkInput(v);
          return n === "" ? null : n;
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

  const handleReorderStudentCnos = async () => {
    if (editingLocked || !onReorderStudentCnos || reorderingCnos) return;
    const confirmed = window.confirm(
      "This will reorder the whole class as Female first, then Male, and regenerate all CNO numbers. Continue?"
    );
    if (!confirmed) return;
    setReorderingCnos(true);
    try {
      await onReorderStudentCnos();
    } finally {
      setReorderingCnos(false);
    }
  };

  const importActions = [
    { label: "Import CSV", onClick: () => onShowModal("csv-import") },
    { label: "Import JSON", onClick: () => onShowModal("json-import") },
    { label: "Import XLSX", onClick: () => onShowModal("xlsx-import") },
  ];

  const exportActions = [
    { label: "Export CSV", onClick: exportCsv },
    { label: "Export JSON", onClick: exportJson },
    { label: "Export XLSX", onClick: handleExportXlsx },
  ];

  const gradeBadgeStyle = (grade) => ({
    fontWeight: 600,
    fontSize: 10,
    color: grade ? GRADE_TEXT_COLOR : "#6b7280",
    background: grade ? GRADE_BACKGROUNDS[grade] : "#f0f0f0",
    padding: "1px 6px",
    borderRadius: 4,
    border: grade ? "1px solid rgba(17, 24, 39, 0.08)" : "1px solid #ddd",
    minWidth: 18,
    textAlign: "center",
    display: "inline-block",
  });

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
    tableScroller: {
      overflowX: "auto",
      overflowY: "visible",
      minWidth: 0,
      borderRadius: 8,
      border: "1px solid #e2e8f0",
    },
    bulkTableScroller: {
      overflowX: "auto",
      overflowY: "auto",
      maxHeight: "60vh",
      minWidth: 0,
      borderRadius: 8,
      border: "1px solid #e2e8f0",
    },
    stickyTh: {
      background: "#f8fafc",
      color: "#64748b",
      position: "sticky",
      top: 0,
      zIndex: 2,
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    },
    tlbx: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: compactLayout ? "stretch" : "center",
      background: "#fff",
      border: "1px solid #e2e8f0",
      padding: compactLayout ? 10 : 12,
      borderRadius: 12,
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
      background: "#e2e8f0",
      display: compactLayout ? "none" : "block",
    },
    bulkPanel: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: compactLayout ? 10 : 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    bulkTable: {
      borderCollapse: "collapse",
      width: "100%",
      fontSize: compactLayout ? 10 : 11,
      background: "#fff",
      border: "1px solid #e2e8f0",
      minWidth: compactLayout ? 680 : "auto",
    },
    bulkInput: {
      width: 44,
      padding: "3px 4px",
      borderRadius: 4,
      border: "1px solid #e2e8f0",
      fontSize: 10,
      textAlign: "center",
      background: "#fff",
      outline: "none",
    },
    subjectPanel: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: compactLayout ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    metaPanel: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: compactLayout ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    schoolPanel: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: compactLayout ? 10 : 14,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    instructionPanel: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: compactLayout ? 12 : 14,
      display: "grid",
      gap: 10,
    },
    instructionMeta: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
    },
    instructionChip: {
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 8px",
      borderRadius: 4,
      border: "1px solid #e2e8f0",
      background: "#f8fafc",
      color: "#64748b",
      fontSize: 10,
      fontWeight: 600,
    },
    instructionHelper: {
      display: "grid",
      gap: 4,
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid #e2e8f0",
      background: "#f8fafc",
      color: "#64748b",
      fontSize: 11,
      lineHeight: 1.45,
    },
    instructionTextarea: {
      width: "100%",
      minHeight: compactLayout ? 128 : 142,
      resize: "vertical",
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid #e2e8f0",
      fontSize: 12,
      lineHeight: 1.7,
      boxSizing: "border-box",
      fontFamily: "inherit",
      background: "#fff",
      color: "#0f172a",
    },
    instructionSaveBtn: {
      padding: "7px 14px",
      borderRadius: 6,
      border: "none",
      background: "#0f2d6e",
      color: "#fff",
      fontWeight: 600,
      cursor: "pointer",
      justifySelf: "start",
    },
    actionBtn: {
      padding: "6px 12px",
      height: 32,
      borderRadius: 6,
      border: "none",
      color: "#fff",
      fontWeight: 600,
      fontSize: 12,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      flexShrink: 0,
    },
    dropdownWrap: {
      position: "relative",
      display: "inline-flex",
      flexShrink: 0,
    },
    dropdownMenu: {
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      minWidth: 148,
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      padding: 6,
      zIndex: 20,
      display: "grid",
      gap: 2,
    },
    dropdownItem: {
      padding: "8px 10px",
      border: "none",
      borderRadius: 6,
      background: "transparent",
      color: "#0f172a",
      textAlign: "left",
      cursor: "pointer",
      fontWeight: 500,
      fontSize: 12,
    },
    infoBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 10px",
      borderRadius: 6,
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      color: "#64748b",
      fontSize: 11,
      fontWeight: 600,
      flexShrink: 0,
      whiteSpace: "nowrap",
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
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 4,
      padding: "4px 10px",
      fontSize: 11,
      fontWeight: 500,
      color: "#0f172a",
    },
    subjectRemove: {
      background: "#dc2626",
      color: "#fff",
      border: "none",
      borderRadius: 4,
      padding: "2px 7px",
      fontSize: 10,
      fontWeight: 600,
      cursor: "pointer",
    },
    subjectInput: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #e2e8f0",
      height: 32,
      minWidth: 160,
      fontSize: 12,
    },
    subjectAddBtn: {
      padding: "6px 12px",
      height: 32,
      borderRadius: 6,
      border: "none",
      background: "#0f2d6e",
      color: "#fff",
      fontWeight: 600,
      fontSize: 12,
      cursor: "pointer",
    },
    metaInput: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #e2e8f0",
      height: 32,
      fontSize: 12,
      minWidth: compactLayout ? 0 : 120,
      width: compactLayout ? "100%" : "auto",
    },
    metaSelect: {
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #e2e8f0",
      height: 32,
      fontSize: 12,
      minWidth: compactLayout ? 0 : 120,
      width: compactLayout ? "100%" : "auto",
    },
    metaBtn: {
      padding: "6px 12px",
      height: 32,
      borderRadius: 6,
      border: "none",
      background: "#0f2d6e",
      color: "#fff",
      fontWeight: 600,
      fontSize: 12,
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.panel}>
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: isMobile ? 12 : 16,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compactLayout ? "1fr" : "minmax(220px,1fr) auto minmax(220px,1fr)",
            alignItems: "center",
            gap: compactLayout ? 8 : 12,
            marginBottom: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 17 : 18, fontWeight: 600, color: "#0f172a" }}>
              Marks Entry
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {currentClassLabel || "Class"} &middot; Enter marks, import scores, and review the roster.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={styles.infoBadge}
              title="Safe import updates existing students by CNO and adds only new rows. Existing CNO values remain unchanged unless an administrator uses the reorder action."
            >
              Safe Import
            </div>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              title="Bulk score entry"
              disabled={editingLocked}
              style={{
                padding: "6px 12px",
                background: editingLocked ? "#94a3b8" : bulkMode ? "#dc2626" : "#0f2d6e",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: editingLocked ? "not-allowed" : "pointer",
                fontWeight: 600,
                height: 30,
                flex: compactLayout ? 1 : "0 0 auto",
              }}
            >
              {bulkMode ? "Exit Bulk Mode" : "Bulk Scores"}
            </button>
            {onReorderStudentCnos && (
              <div style={styles.dropdownWrap}>
                <button
                  onClick={() => setShowAdvancedMenu((prev) => !prev)}
                  disabled={editingLocked}
                  style={{ ...styles.actionBtn, background: "#b45309" }}
                  title="Advanced student actions"
                >
                  Advanced
                </button>
                {showAdvancedMenu && (
                  <div style={styles.dropdownMenu}>
                    <button
                      onClick={() => {
                        setShowAdvancedMenu(false);
                        handleReorderStudentCnos();
                      }}
                      disabled={editingLocked || reorderingCnos || !(computed ?? []).length}
                      style={{
                        ...styles.dropdownItem,
                        color:
                          editingLocked || reorderingCnos || !(computed ?? []).length
                            ? "#9ca3af"
                            : "#b45309",
                        cursor:
                          editingLocked || reorderingCnos || !(computed ?? []).length
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {reorderingCnos ? "Reordering CNO..." : "Reorder Female to Male CNO"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: compactLayout ? "flex-start" : "flex-end" }}>
            <button
              onClick={() => setShowInstructionPanel((prev) => !prev)}
              style={{
                ...styles.actionBtn,
                background: showInstructionPanel ? "#dc2626" : "#16a34a",
              }}
            >
              {showInstructionPanel ? "Hide Maagizo" : "Maagizo"}
            </button>
          </div>
        </div>

        {editingLocked ? (
          <div
            style={{
              marginBottom: 10,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #f5c2c7",
              background: "#fff1f2",
              color: "#9f1239",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Results are published for this class. Unpublish them before adding students, editing marks, importing, deleting, or reordering CNO values.
          </div>
        ) : null}

        {/* Composite exam banner */}
        {compositeEntry && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fffbe6",
            border: "1px solid #fbbf24",
            borderRadius: 7,
            padding: "7px 12px",
            marginBottom: 10,
            fontSize: 11,
            color: "#7a5800",
            fontWeight: 600,
          }}>
            <span>Composite</span>
            <span>
              <strong>Composite Mode - {compositeEntry.label} / 2</strong>
              {" "}- Grades use the average of <em>{compositeEntry.partnerExam}</em> and <em>{effectiveExam}</em>.
              Score columns show the current exam's entry; totals reflect the combined average.
            </span>
          </div>
        )}

        {showInstructionPanel && (
        <div style={styles.instructionPanel}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f2d6e" }}>
                Maagizo ya Ripoti ya Mwanafunzi
              </div>
              <div style={{ fontSize: 11, color: "#667", marginTop: 2 }}>
                Haya yatachukuliwa moja kwa moja kwenye report card ya kila mwanafunzi wa darasa hili.
              </div>
            </div>
            <button
              onClick={handleSaveReportInstruction}
              disabled={savingInstruction || !onUpdateSchool}
              style={{
                ...styles.instructionSaveBtn,
                background:
                  savingInstruction || !onUpdateSchool
                    ? "#9ca3af"
                    : styles.instructionSaveBtn.background,
                cursor: savingInstruction || !onUpdateSchool ? "not-allowed" : "pointer",
              }}
            >
              {savingInstruction ? "Saving..." : !onUpdateSchool ? "Read Only" : "Save Maagizo"}
            </button>
          </div>
          <div style={styles.instructionMeta}>
            <span style={styles.instructionChip}>{instructionWordCount} words</span>
            <span style={styles.instructionChip}>Printed in section E</span>
            <span style={styles.instructionChip}>Line breaks preserved</span>
          </div>
          <div style={styles.instructionHelper}>
            <div>Write clear school instructions, return dates, fee reminders, or preparation notes.</div>
            <div>Use short paragraphs or one instruction per line for better spacing on the report card.</div>
          </div>
          <textarea
            value={instructionText}
            onChange={(e) => {
              setSchoolInfo({ ...schoolInfo, reportInstruction: e.target.value });
              setInstructionNotice("");
              setInstructionNoticeType("success");
            }}
            placeholder={"Andika maagizo ya jumla yatakayoonekana kwenye report card za darasa hili...\nMfano:\n1. Shule itafunguliwa tarehe 10/06/2026.\n2. Mwanafunzi aje na sare kamili na vifaa vya masomo."}
            style={styles.instructionTextarea}
          />
          {instructionNotice && (
            <div style={{ fontSize: 11, color: instructionNoticeType === "error" ? "#9f1239" : "#16a34a", fontWeight: 600 }}>
              {instructionNotice}
            </div>
          )}
          {!onUpdateSchool && (
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              Only administrators can update Maagizo for this class.
            </div>
          )}
        </div>
        )}

        <div style={styles.tlbx}>
          {/* Row 1: Exam selector + Search (always full-width on mobile) */}
          <div style={{ ...styles.tlbGroup, flex: "1 1 100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
                Exam:
              </span>
              <select
                value={effectiveExam}
                onChange={e => onChangeExam && onChangeExam(e.target.value)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  height: 32,
                  fontWeight: 600,
                  fontSize: 12,
                  background: "#fff",
                  color: "#0f172a",
                  cursor: "pointer",
                  minWidth: compactLayout ? 0 : 140,
                  width: compactLayout ? "100%" : "auto",
                }}
              >
                {examOptions.map(et => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </select>
            </div>
            <div style={styles.dropdownWrap}>
              <button
                onClick={() => {
                  if (editingLocked) return;
                  setShowImportMenu((prev) => !prev);
                  setShowExportMenu(false);
                }}
                disabled={editingLocked}
                style={{ ...styles.actionBtn, background: "#0f2d6e" }}
                title="Import student data"
              >
                Import
              </button>
              {showImportMenu && (
                <div style={styles.dropdownMenu}>
                  {importActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setShowImportMenu(false);
                        action.onClick();
                      }}
                      style={styles.dropdownItem}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={styles.dropdownWrap}>
              <button
                onClick={() => {
                  setShowExportMenu((prev) => !prev);
                  setShowImportMenu(false);
                }}
                style={{ ...styles.actionBtn, background: "#1a7336" }}
                title="Export student data"
              >
                Export
              </button>
              {showExportMenu && (
                <div style={styles.dropdownMenu}>
                  {exportActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setShowExportMenu(false);
                        action.onClick();
                      }}
                      style={styles.dropdownItem}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="Search name, CNO, admission number, or status"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: "6px 8px",
                borderRadius: 5,
                border: "1px solid #e2e8f0",
                flex: compactLayout ? "1 1 100%" : 1,
                minWidth: compactLayout ? "100%" : 150,
                height: 30,
              }}
            />
            {Array.isArray(formSelectorOptions) && formSelectorOptions.length > 1 && (
              <select
                value={currentForm}
                onChange={e => onSelectForm?.(e.target.value)}
                title="Switch form"
                style={{
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: "1px solid #e2e8f0",
                  height: 30,
                  flexShrink: 0,
                  fontWeight: 600,
                }}
              >
                {formSelectorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: "6px 8px",
                borderRadius: 5,
                border: "1px solid #e2e8f0",
                height: 30,
                flexShrink: 0,
              }}
            >
              <option value="index">Sort: CNO</option>
              <option value="name">Sort: Name</option>
              <option value="total">Sort: Total</option>
              <option value="agrd">Sort: Grade</option>
            </select>
            {hasStreamFilter && (
              <select
                value={streamFilter}
                onChange={e => setStreamFilter(e.target.value)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 5,
                  border: "1px solid #e2e8f0",
                  height: 30,
                  flexShrink: 0,
                }}
              >
                {availableStreamFilters.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              style={{
                padding: "6px 12px",
                background: "#0f2d6e",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 600,
                height: 30,
                flexShrink: 0,
              }}
            >
              {sortAsc ? "Asc" : "Desc"}
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 4,
              background: "#eef4ff",
              border: "1px solid #e2e8f0",
              color: "#26437a",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Working in: {effectiveExam}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 4,
              background: "#f8fafc",
              border: "1px solid #d9e2ec",
              color: "#3f536e",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Current Class: {currentClassLabel || "Unassigned"}
          </span>
          <span style={{ fontSize: 11, color: "#607086", lineHeight: 1.5 }}>
            Imports, exports, and saved marks apply to the current exam entry shown here.
          </span>
          <span style={{ fontSize: 11, color: "#607086", lineHeight: 1.5 }}>
            Switch classes from the sidebar or Forms &amp; Streams. Marks Entry does not edit class placement.
          </span>
        </div>
      </div>

      {unassignedCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 8,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            color: "#92400e",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontWeight: 700 }}>{unassignedCount}</span>
          <span>
            student{unassignedCount === 1 ? " is" : "s are"} not assigned to a stream and appear under
            &ldquo;Unassigned&rdquo;. Their class record is missing a stream value — assign it in
            Forms &amp; Streams so they group under the correct stream.
          </span>
        </div>
      )}

      {!hideSettings && (
        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 2,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Class Setup
          </div>

          <div style={styles.schoolPanel}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0f2d6e" }}>
              Global School Settings
            </div>
            <div style={{ fontSize: 10, color: "#667", lineHeight: 1.6 }}>
              School identity, logos, contacts, and export branding are now managed from the main Settings page so they stay consistent across all classes.
            </div>
          </div>

          <div style={styles.metaPanel}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0f2d6e" }}>Class Year & Form</div>
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
              <input
                type="text"
                placeholder="Stream"
                value={classStream}
                onChange={e => setClassStream(String(e.target.value || "").toUpperCase())}
                style={styles.metaInput}
              />
              <button
                style={styles.metaBtn}
                onClick={handleUpdateMeta}
                disabled={updatingMeta}
              >
                Save
              </button>
              {metaError && (
                <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>
                  {metaError}
                </div>
              )}
            </div>
          </div>

          <div style={styles.subjectPanel}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0f2d6e" }}>Subjects</div>
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
                    title={"Remove " + subj}
                  >
                    Remove
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
                Add Subject
              </button>
              {subjectError && (
                <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>
                  {subjectError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {addingNew && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: isMobile ? 14 : 18,
            boxShadow: "0 10px 26px rgba(0,51,102,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#0f2d6e" }}>Student Registration</h4>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
                Register a student with guardian details. Parents will appear automatically in management from the guardian information you save here.
              </div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#16a34a", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 4, padding: "5px 10px" }}>
              Real student data
            </div>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#0f2d6e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Student Details
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <TextInput
                  label="Admission Number"
                  value={newStudent.admission_no ?? ""}
                  onChange={v => setNewStudent({ ...newStudent, admission_no: normalizeAdmissionDraft(v) })}
                  error={errors.admission_no || errors.admissionNo}
                  placeholder="BSS-2026-0001"
                />
                <TextInput
                  label="CNO (Auto)"
                  value={newStudent.index_no}
                  onChange={v => setNewStudent({ ...newStudent, index_no: v })}
                  error={errors.index_no}
                />
                <TextInput
                  label="First Name"
                  value={newStudent.firstName ?? ""}
                  onChange={v => setNewStudent({ ...newStudent, firstName: v })}
                  error={errors.name}
                  required
                />
                <TextInput
                  label="Last Name"
                  value={newStudent.lastName ?? ""}
                  onChange={v => setNewStudent({ ...newStudent, lastName: v })}
                  required
                />
                <TextInput
                  label="Date of Birth"
                  type="date"
                  value={newStudent.dateOfBirth ?? ""}
                  onChange={v => setNewStudent({ ...newStudent, dateOfBirth: v })}
                />
                <SelectInput
                  label="Sex"
                  value={newStudent.sex}
                  onChange={v => setNewStudent({ ...newStudent, sex: v })}
                  options={[
                    { label: "Male", value: "M" },
                    { label: "Female", value: "F" },
                  ]}
                  required
                />
                <SelectInput
                  label="Status"
                  value={newStudent.status}
                  onChange={v => setNewStudent({ ...newStudent, status: v })}
                  options={[
                    { label: "Present", value: "present" },
                    { label: "Absent", value: "absent" },
                    { label: "Incomplete", value: "incomplete" },
                  ]}
                  required
                />
              </div>
            </div>

            {possibleDuplicateStudents.length > 0 && (
              <div
                style={{
                  border: "1px solid #fde68a",
                  background: "#fffbeb",
                  borderRadius: 12,
                  padding: isMobile ? 12 : 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>
                      Possible duplicate student
                    </div>
                    <div style={{ fontSize: 11, color: "#78350f", lineHeight: 1.5 }}>
                      A student with the same name already exists in this class. Review the record below before saving.
                    </div>
                  </div>
                  {duplicateSaveConfirmed && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 4, padding: "5px 10px" }}>
                      Save again to continue
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {possibleDuplicateStudents.map((student) => (
                    <div
                      key={student.id}
                      style={{
                        display: "grid",
                        gap: 4,
                        borderRadius: 10,
                        border: "1px solid #fcd34d",
                        background: "#fffdf5",
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{student.name}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#6b7280" }}>
                        <span><strong style={{ color: "#374151" }}>CNO:</strong> {student.indexNo || "-"}</span>
                        <span><strong style={{ color: "#374151" }}>Admission No:</strong> {student.admissionNo || "-"}</span>
                        <span><strong style={{ color: "#374151" }}>Sex:</strong> {student.sex || "-"}</span>
                      </div>
                      {(student.guardianName || student.guardianPhone) && (
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          <strong style={{ color: "#374151" }}>Guardian:</strong>{" "}
                          {[student.guardianName, student.guardianPhone].filter(Boolean).join(" - ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {optionalSubjectOptions.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#0f2d6e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Optional Subjects
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {optionalSubjectOptions.map((subject) => {
                    const checked = (newStudent.optionalSubjects || []).includes(subject);
                    return (
                      <label
                        key={subject}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: checked ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                          background: checked ? "#eff6ff" : "#ffffff",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#0f172a",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleNewStudentOptionalSubject(subject)}
                        />
                        <span>{subject}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#0f2d6e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Guardian Information
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <TextInput
                  label="Guardian Name"
                  value={newStudent.parentName ?? ""}
                  onChange={v => setNewStudent({ ...newStudent, parentName: v })}
                  placeholder="Required for parent list"
                  error={errors.parentName}
                  required
                />
                <TextInput
                  label="Guardian Phone"
                  value={newStudent.parentPhone ?? ""}
                  onChange={v => setNewStudent({ ...newStudent, parentPhone: normalizeTzPhoneDraft(v) })}
                  placeholder="255712345678"
                  type="tel"
                  inputMode="tel"
                />
                <TextInput
                  label="Address"
                  value={newStudent.address ?? ""}
                  onChange={v => setNewStudent({ ...newStudent, address: v })}
                />
              </div>
            </div>
            {errors._form && (
              <div
                style={{
                  marginTop: 4,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {errors._form}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button
              onClick={handleAddNew}
              disabled={editingLocked || savingNewStudent}
              style={{
                padding: "6px 16px",
                background: editingLocked || savingNewStudent ? "#94a3b8" : "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: editingLocked || savingNewStudent ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {savingNewStudent ? "Saving..." : duplicateSaveConfirmed && possibleDuplicateStudents.length > 0 ? "Save Anyway" : "Save"}
            </button>
            <button
              onClick={() => {
                if (savingNewStudent) return;
                setAddingNew(false);
                setDuplicateSaveConfirmed(false);
                setErrors({});
              }}
              disabled={savingNewStudent}
              style={{
                padding: "6px 16px",
                background: savingNewStudent ? "#94a3b8" : "#888",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: savingNewStudent ? "not-allowed" : "pointer",
                fontWeight: 600,
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
          No students yet. Import scores for existing students or add students from Student Records.
        </div>
      )}

      {bulkMode ? (
        <div style={styles.bulkPanel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0f2d6e" }}>Bulk Scoring Grid</div>
              <div style={{ fontSize: 10, color: "#667" }}>Enter scores for all students quickly.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {bulkNotice && (
                <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 600, alignSelf: "center" }}>
                  {bulkNotice}
                </div>
              )}
              <button
                onClick={handleBulkSave}
                disabled={editingLocked || bulkSaving || subjects.length === 0 || filtered.length === 0}
                style={{
                  padding: "6px 12px",
                  background: editingLocked || bulkSaving ? "#999" : "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  cursor: editingLocked || bulkSaving ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  height: 30,
                }}
              >
                {bulkSaving ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>

          <div style={styles.bulkTableScroller} tabIndex={0} role="region" aria-label="Bulk scoring table">
          <table style={styles.bulkTable}>
              <thead>
                <tr style={styles.stickyTh}>
                  {[
                    "CNO",
                    "Name",
                    ...subjects.map((s, index) => `${s.slice(0, 3)}${subjectMetadata[index]?.type === "optional" ? "*" : ""}`),
                  ].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      style={{
                        padding: "5px 6px",
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 10,
                        border: "1px solid #224488",
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
                    <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #e2e8f0", fontWeight: 600 }}>
                      {s.displayIndexNo || s.index_no}
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #e2e8f0" }}>{s.name}</td>
                    {subjects.map((_, si) => {
                      const visible = isSubjectVisibleForStudent(s, si);
                      return (
                        <td key={si} style={{ padding: "4px 4px", textAlign: "center", border: "1px solid #e2e8f0", background: visible ? "transparent" : "#f8fafc", color: visible ? "#334155" : "#94a3b8" }}>
                          {visible ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={bulkScores[s.id]?.[si] ?? ""}
                                onChange={(e) => handleBulkScoreChange(s.id, si, e.target.value)}
                                style={styles.bulkInput}
                              />
                              {(() => {
                                const v = bulkScores[s.id]?.[si];
                                const g = (v !== "" && v != null) ? getGrade(Number(v)) : null;
                                return g ? (
                                  <span style={gradeBadgeStyle(g)}>{g}</span>
                                ) : null;
                              })()}
                            </div>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 600 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={2 + subjects.length}
                      style={{ padding: 20, textAlign: "center", color: "#aaa", border: "1px solid #e0e8ff" }}
                    >
                      No students match your search
                    </td>
                  </tr>
                )}
                {subjects.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
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
      ) : compactLayout ? (
        /* ── Mobile student card list ─────────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!filtered.length && (
            <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 12 }}>
              No students match your search
            </div>
          )}
          {filtered.map((s) => {
            const isEditing = editId === s.id;
            if (isEditing) {
              return (
                <div key={s.id} style={{ background: "#f8fafc", border: "1px solid #0f2d6e", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#0f2d6e", marginBottom: 10 }}>
                    ✎ Editing: {s.name}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginBottom: 10, fontSize: 11, color: "#334155" }}>
                    <span>CNO: <b>{editData.index_no || "—"}</b></span>
                    <span>Sex: <b>{editData.sex || "—"}</b></span>
                    <span>Status: <b>{editData.status || "—"}</b></span>
                  </div>
                  {/* Subject scores grid */}
                  {subjects.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: "#667", fontWeight: 600, marginBottom: 6 }}>Scores</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                        {subjects.map((subj, si) => {
                          if (!isSubjectVisibleForStudent(editData, si)) {
                            return null;
                          }
                          const score = editData.grades?.[si]?.score ?? "";
                          const editGrade = editData.grades?.[si]?.grade ?? null;
                          return (
                            <div key={si} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", borderRadius: 5, padding: "4px 6px", border: "1px solid #e2e8f0" }}>
                              <span style={{ fontSize: 9, fontWeight: 600, color: "#555", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={subj}>{subj.slice(0, 8)}</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={score === "" ? "" : score}
                                onChange={e => {
                                  const normalized = normalizeMarkInput(e.target.value);
                                  const v = normalized === "" ? null : normalized;
                                  const newGrades = [...(editData.grades ?? [])];
                                  newGrades[si] = { ...newGrades[si], score: v, grade: v != null ? getGrade(v) : null };
                                  setEditData({ ...editData, grades: newGrades });
                                }}
                                style={{ width: 40, padding: "2px 4px", borderRadius: 3, border: "1px solid #e2e8f0", fontSize: 11, textAlign: "center" }}
                              />
                              {editGrade && (
                                <span style={gradeBadgeStyle(editGrade)}>{editGrade}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {errors._form && (
                    <div
                      style={{
                        marginBottom: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#b91c1c",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {errors._form}
                    </div>
                  )}
                  {/* Save/cancel */}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={handleSaveEdit}
                      disabled={editingLocked || savingEditStudent}
                      style={{ padding: "7px 18px", background: editingLocked || savingEditStudent ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: editingLocked || savingEditStudent ? "not-allowed" : "pointer" }}
                    >
                      {savingEditStudent ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        if (savingEditStudent) return;
                        setEditId(null);
                        setEditData(null);
                        setErrors({});
                      }}
                      disabled={savingEditStudent}
                      style={{ padding: "7px 18px", background: savingEditStudent ? "#94a3b8" : "#888", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: savingEditStudent ? "not-allowed" : "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={s.id} style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 12px",
              }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "#888", flexShrink: 0 }}>{s.displayIndexNo || s.index_no || "—"}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#0f2d6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 4,
                      background: s.sex === "F" ? "#fce8f7" : "#e4eeff",
                      color: s.sex === "F" ? "#6b0055" : "#0b4f9e",
                    }}>{s.sex === "F" ? "F" : "M"}</span>
                    {s.status === "absent" && (
                      <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 4, background: "#fff0f0", color: "#dc2626" }}>Absent</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => handleEdit(s)}
                      disabled={editingLocked}
                      style={{ padding: "4px 8px", background: editingLocked ? "#94a3b8" : "#0f2d6e", color: "#fff", border: "none", borderRadius: 5, cursor: editingLocked ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600 }}
                      title="Edit student"
                    >Edit</button>
                    <button
                      onClick={() => onShowModal("report-card-export", s.id)}
                      style={{ padding: "4px 8px", background: "#0f2d6e", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                      title="Export report card"
                    >Report</button>
                    {canDeleteStudents && (
                      <button
                        onClick={() => { if (!editingLocked && window.confirm(`Delete ${s.name || "this student"}?`)) onDeleteStudent(s.id); }}
                        disabled={editingLocked}
                        style={{ padding: "4px 8px", background: editingLocked ? "#94a3b8" : "#dc2626", color: "#fff", border: "none", borderRadius: 5, cursor: editingLocked ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600 }}
                        title="Delete student"
                      >Delete</button>
                    )}
                  </div>
                </div>
                {/* Subject scores */}
                {subjects.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 6px", marginBottom: 6 }}>
                    {subjects.map((subj, si) => {
                      if (!isSubjectVisibleForStudent(s, si)) return null;
                      const score = s.grades?.[si]?.score;
                      const grade = s.grades?.[si]?.grade;
                      if (score == null) return null;
                      return (
                        <span key={si} style={{
                          background: "#f4f7ff", border: "1px solid #e2e8f0", borderRadius: 4,
                          padding: "2px 5px", fontSize: 10, display: "inline-flex", gap: 3, alignItems: "center",
                        }}>
                          <span style={{ color: "#555", fontWeight: 600 }} title={subj}>{subj.slice(0, 4)}:</span>
                          <span style={{ fontWeight: 600, color: "#0f2d6e" }}>{score}</span>
                          {grade && <span style={gradeBadgeStyle(grade)}>{grade}</span>}
                        </span>
                      );
                    })}
                    {subjects.every((_, si) => s.grades?.[si]?.score == null) && (
                      <span style={{ fontSize: 10, color: "#bbb" }}>No scores entered</span>
                    )}
                  </div>
                )}
                {/* Summary row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", fontSize: 11 }}>
                  <span>Total: <b style={{ color: "#0f2d6e" }}>{s.total ?? "—"}</b></span>
                  <span>Avg: <b>{s.avg ?? "—"}</b></span>
                  {hasStreamFilter && <span>Stream: <b>{s.stream || "-"}</b></span>}
                  {s.agrd && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#334155" }}>
                      Grade:
                      <span style={gradeBadgeStyle(s.agrd)}>{s.agrd}</span>
                    </span>
                  )}
                  {s.div && <span style={{ fontWeight: 600, color: DIVISION_COLORS[s.div] }}>Div {s.div}</span>}
                  {s.posn && <span style={{ color: "#888" }}>#{s.posn}</span>}
                  {s.remarks && <span style={{ color: "#555", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }} title={s.remarks}>{s.remarks}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.tableScroller} tabIndex={0} role="region" aria-label="Student entry table">
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 11,
            background: "#fff",
            minWidth: "auto",
          }}
        >
          <thead>
            <tr style={styles.stickyTh}>
              {[
                { label: "CNO", align: "left" },
                { label: "Name", align: "left", minWidth: 120 },
                { label: "Sex", align: "center" },
                { label: "Status", align: "center", minWidth: 80 },
              ].map(({ label, align, minWidth }) => (
                <th key={label} style={{ padding: "7px 8px", textAlign: align, fontWeight: 600, fontSize: 11, border: "1px solid rgba(255,255,255,0.12)", letterSpacing: "0.04em", minWidth }}>
                  {label}
                </th>
              ))}
              {hasStreamFilter && (
                <th style={{ padding: "7px 8px", textAlign: "center", fontWeight: 600, fontSize: 11, border: "1px solid rgba(255,255,255,0.12)", letterSpacing: "0.04em", minWidth: 72 }}>
                  Stream
                </th>
              )}
              {subjects.map((subj, i) => (
                <th
                  key={i}
                  style={{
                    padding: "7px 4px",
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    maxWidth: 48,
                    letterSpacing: "0.02em",
                  }}
                  title={subj}
                >
                  {subj.slice(0, 4)}{subjectMetadata[i]?.type === "optional" ? "*" : ""}
                </th>
              ))}
              {[
                { label: "Total" },
                { label: "Avg" },
                { label: "Grade" },
                { label: "Div" },
                { label: "Remarks", align: "left", minWidth: 80 },
                { label: "Action", minWidth: 100 },
              ].map(({ label, align, minWidth }) => (
                <th key={label} style={{ padding: "7px 8px", textAlign: align ?? "center", fontWeight: 600, fontSize: 11, border: "1px solid rgba(255,255,255,0.12)", letterSpacing: "0.04em", minWidth }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const isEditing = editId === s.id;
              return (
                <React.Fragment key={s.id}>
                <tr
                  style={{
                    background: isEditing
                      ? "#f8fafc"
                      : i % 2 === 0
                      ? "#fff"
                      : "#f8fafc",
                    height: 36,
                  }}
                >
                  <td
                    style={{
                      padding: "4px 8px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                      fontWeight: 600,
                      fontSize: 11,
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.displayIndexNo || s.index_no}
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      textAlign: "left",
                      border: "1px solid #e2e8f0",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#1a2e4a",
                    }}
                  >
                    {s.name}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <span style={{
                      display: "inline-block",
                      padding: "1px 7px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      background: s.sex === "F" ? "#fce8f7" : "#e4eeff",
                      color: s.sex === "F" ? "#6b0055" : "#0b4f9e",
                    }}>{s.sex === "F" ? "F" : "M"}</span>
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      background: s.status === "absent" ? "#fff0f0" : s.status === "incomplete" ? "#fff8e0" : "#e8f8ee",
                      color: s.status === "absent" ? "#dc2626" : s.status === "incomplete" ? "#7a5800" : "#16a34a",
                    }}>
                      {s.status === "absent" ? "Absent" : s.status === "incomplete" ? "Incomplete" : "Present"}
                    </span>
                  </td>
                  {hasStreamFilter && (
                    <td
                      style={{
                        padding: "4px 6px",
                        textAlign: "center",
                        border: "1px solid #e2e8f0",
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      {s.stream || "-"}
                    </td>
                  )}

                  {/* Score inputs */}
                  {(classData.subjects ?? []).map((subj, si) => {
                    const visible = isSubjectVisibleForStudent(isEditing ? editData : s, si);
                    // In composite mode use grade.raw (current exam's entry) so teachers
                    // see and edit what they typed, not the combined average.
                    const rawVal = isEditing ? editData.grades?.[si]?.raw : s.grades?.[si]?.raw;
                    const editInitial = (rawVal != null && rawVal !== "ABS") ? rawVal : "";
                    const score = isEditing
                      ? editData.grades?.[si]?.score ?? ""
                      : gradeDisplayValue(s.grades?.[si]);
                    const viewGrade = s.grades?.[si]?.grade ?? null;
                    const editGrade = isEditing ? (editData.grades?.[si]?.grade ?? null) : null;
                    return (
                      <td
                        key={si}
                        style={{
                          padding: "4px 4px",
                          textAlign: "center",
                          border: "1px solid #e2e8f0",
                          minWidth: 55,
                          background: visible ? "transparent" : "#f8fafc",
                          color: visible ? "#334155" : "#94a3b8",
                        }}
                      >
                        {!visible ? (
                          <span style={{ fontSize: 10, fontWeight: 600 }}>—</span>
                        ) : isEditing ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editInitial === "" ? "" : editInitial}
                              onChange={e => {
                                const normalized = normalizeMarkInput(e.target.value);
                                const v = normalized === "" ? null : normalized;
                                const newGrades = [...(editData.grades ?? [])];
                                newGrades[si] = {
                                  ...newGrades[si],
                                  score: v,
                                  raw: v,
                                  grade: v != null ? getGrade(v) : null,
                                };
                                setEditData({ ...editData, grades: newGrades });
                              }}
                              style={{
                                width: 40,
                                padding: "2px 4px",
                                borderRadius: 3,
                                border: "1px solid #b8cdf5",
                                fontSize: 11,
                                textAlign: "center",
                              }}
                            />
                            <span style={gradeBadgeStyle(editGrade)}>
                              {editGrade ?? "–"}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}>
                            <span style={{ fontWeight: 600, fontSize: 11 }}>{score}</span>
                            {viewGrade && (
                              <span style={gradeBadgeStyle(viewGrade)}>
                                {viewGrade}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    {s.total ?? "–"}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                      fontSize: 11,
                    }}
                  >
                    {s.avg ?? "–"}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {s.agrd ? (
                      <span style={{
                        display: "inline-block",
                        padding: "1px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        background: GRADE_BACKGROUNDS[s.agrd],
                        color: GRADE_TEXT_COLOR,
                        border: "1px solid rgba(17, 24, 39, 0.08)",
                      }}>{s.agrd}</span>
                    ) : <span style={{ color: "#bbb", fontSize: 11 }}>–</span>}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {s.div && s.div !== "0" ? (
                      <span style={{
                        display: "inline-block",
                        padding: "1px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        background: "#e4eeff",
                        color: DIVISION_COLORS[s.div],
                      }}>Div {s.div}</span>
                    ) : s.div === "0" ? (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#999" }}>Div 0</span>
                    ) : <span style={{ color: "#bbb", fontSize: 11 }}>–</span>}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "left",
                      border: "1px solid #e2e8f0",
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
                          border: "1px solid #b8cdf5",
                          fontSize: 11,
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
                          fontSize: 11,
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
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button
                          onClick={handleSaveEdit}
                          disabled={editingLocked}
                          style={{
                            padding: "3px 6px",
                            background: editingLocked ? "#94a3b8" : "#16a34a",
                            color: "#fff",
                            border: "none",
                            borderRadius: 3,
                            cursor: editingLocked ? "not-allowed" : "pointer",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          Save
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
                            fontWeight: 600,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button
                          onClick={() => handleEdit(s)}
                          disabled={editingLocked}
                          style={{
                            padding: "3px 8px",
                            background: editingLocked ? "#94a3b8" : "#0f2d6e",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: editingLocked ? "not-allowed" : "pointer",
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onShowModal("report-card-export", s.id)}
                          style={{
                            padding: "3px 8px",
                            background: "#0f2d6e",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                          }}
                        >
                          Card
                        </button>
                        <button
                          onClick={() => {
                            if (!editingLocked && window.confirm(`Delete ${s.name || "this student"}?`)) {
                              onDeleteStudent(s.id);
                            }
                          }}
                          disabled={editingLocked || !canDeleteStudents}
                          style={{
                            padding: "3px 8px",
                            background: editingLocked ? "#94a3b8" : "#dc2626",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: editingLocked || !canDeleteStudents ? "not-allowed" : "pointer",
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                            display: canDeleteStudents ? undefined : "none",
                          }}
                        >
                          Del
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                </React.Fragment>
              );
            })}
            {!filtered.length && (
              <tr>
                <td
                  colSpan={hasStreamFilter ? 18 : 17}
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
