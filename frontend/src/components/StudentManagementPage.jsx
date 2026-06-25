import React, { useMemo, useState } from "react";
import { useViewport } from "../utils/useViewport";
import { CLASS_STREAMS, DEFAULT_CONDUCT } from "../hooks/useClasses";
import {
  buildSuggestedConductProfile,
  CONDUCT_FIELDS,
  CONDUCT_GRADE_OPTIONS,
  getSuggestedConductGrade,
  normalizeConductGrade,
} from "../utils/conductAssessment";
import {
  displayFontStack,
  fieldStyle,
  glassPanelStyle,
  pageBackground,
  pillStyle,
  premiumFontStack,
  primaryButtonStyle,
  secondaryButtonStyle,
  softCardStyle,
} from "../utils/designSystem";
import { normalizeTzPhone, normalizeTzPhoneDraft } from "../utils/phone";

function getClassLabel(cls = {}) {
  const base = [cls.form, cls.stream].filter(Boolean).join(" ").trim();
  if (base && cls.year) return `${base} ${cls.year}`;
  return base || cls.name || "Class";
}

function normalizeAdmissionDraft(value) {
  const raw = String(value || "").toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";
  if (/^\d{4}-\d*$/.test(raw)) return `BSS-${raw}`;
  if (/^BSS(?=\d{4}-\d*$)/.test(raw)) return `BSS-${raw.slice(3)}`;
  if (raw.startsWith("BSS--")) return `BSS-${raw.slice(5)}`;
  return raw;
}

const ENROLLMENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "promoted", label: "Promoted" },
  { value: "transferred", label: "Transferred" },
  { value: "graduated", label: "Graduated" },
  { value: "repeater", label: "Repeater" },
  { value: "left", label: "Left School" },
];

const ENROLLMENT_STATUS_LABELS = Object.fromEntries(
  ENROLLMENT_STATUS_OPTIONS.map((entry) => [entry.value, entry.label])
);

function getEnrollmentTone(value) {
  switch (value) {
    case "active":
      return "teal";
    case "promoted":
      return "blue";
    case "graduated":
      return "amber";
    case "transferred":
      return "slate";
    case "repeater":
      return "red";
    case "left":
      return "red";
    default:
      return "slate";
  }
}

function getEnrollmentLabel(value) {
  return ENROLLMENT_STATUS_LABELS[String(value || "").trim().toLowerCase()] || "Active";
}

function makeEmptyForm() {
  return {
    classId: "",
    classGroupKey: "",
    stream: "",
    id: "",
    admission_no: "",
    index_no: "",
    name: "",
    sex: "M",
    enrollmentStatus: "active",
    status: "present",
    parentName: "",
    parentPhone: "",
    address: "",
    remarks: "",
    optionalSubjectsConfigured: true,
    optionalSubjects: [],
    conduct: { ...DEFAULT_CONDUCT },
  };
}

function flattenStudents(classes = []) {
  return classes.flatMap((cls) =>
    (cls.students || []).map((student) => ({
      ...student,
      classId: cls.id,
      classLabel: getClassLabel(cls),
      className: cls.name || "",
      year: cls.year || "",
      form: cls.form || "",
      stream: cls.stream || "",
      enrollmentStatus: student.enrollmentStatus ?? student.enrollment_status ?? "active",
    })),
  );
}

function findClassById(classes = [], classId = "") {
  return classes.find((cls) => cls.id === classId) || null;
}

function makeStudentKey(student = {}) {
  return `${student.classId || ""}:${student.id || ""}`;
}

function buildStudentAvatar(student = {}) {
  const name = String(student.name || "").trim();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "S";
  const palette = student.sex === "F"
    ? { bg: "linear-gradient(135deg, #fdf2f8, #f5d0fe)", fg: "#a21caf" }
    : { bg: "linear-gradient(135deg, #eff6ff, #dbeafe)", fg: "#1d4ed8" };
  return { initials, ...palette };
}

function attendanceTone(status = "") {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "present") return "teal";
  if (normalized === "absent") return "red";
  return "amber";
}

export function StudentManagementPage({
  classes = [],
  canDeleteStudents = false,
  onOpenStudentProfile,
  onAddStudentToClass,
  onUpdateStudentInClass,
  onDeleteStudentFromClass,
  onPromoteStudents,
}) {
  const { isMobile } = useViewport();
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [selectedStudentKey, setSelectedStudentKey] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [modalMode, setModalMode] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());
  const [formError, setFormError] = useState("");
  const [promotionForm, setPromotionForm] = useState({ sourceClassId: "", targetClassId: "" });
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [promotionError, setPromotionError] = useState("");

  const yearOptions = useMemo(
    () =>
      Array.from(new Set(classes.map((cls) => String(cls.year || "").trim()).filter(Boolean))).sort(
        (left, right) => Number(right) - Number(left) || right.localeCompare(left, "en")
      ),
    [classes]
  );

  const formOptions = useMemo(
    () =>
      Array.from(
        new Set(
          classes
            .filter((cls) => !yearFilter || String(cls.year || "").trim() === yearFilter)
            .map((cls) => String(cls.form || "").trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right, "en")),
    [classes, yearFilter]
  );

  const allClassOptions = useMemo(
    () =>
      [...classes]
        .sort((left, right) => getClassLabel(left).localeCompare(getClassLabel(right), "en"))
        .map((cls) => ({
          id: cls.id,
          label: getClassLabel(cls),
        })),
    [classes],
  );

  const classOptions = useMemo(
    () =>
      [...classes]
        .filter((cls) => !yearFilter || String(cls.year || "").trim() === yearFilter)
        .filter((cls) => !formFilter || String(cls.form || "").trim() === formFilter)
        .sort((left, right) => getClassLabel(left).localeCompare(getClassLabel(right), "en"))
      .map((cls) => ({
          id: cls.id,
          label: getClassLabel(cls),
        })),
    [classes, formFilter, yearFilter],
  );

  const classGroupOptions = useMemo(() => {
    const groups = new Map();
    classes.forEach((cls) => {
      const groupKey = [cls.form, cls.year].filter(Boolean).join("|");
      if (!groupKey) return;
      const current = groups.get(groupKey) || {
        key: groupKey,
        label: [cls.form, cls.year].filter(Boolean).join(" ").trim(),
        streams: [],
      };
      current.streams.push({
        stream: String(cls.stream || "").trim().toUpperCase(),
        classId: cls.id,
      });
      groups.set(groupKey, current);
    });
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        streams: group.streams
          .filter((entry) => entry.stream)
          .sort((left, right) => left.stream.localeCompare(right.stream, "en")),
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "en"));
  }, [classes]);

  const students = useMemo(() => flattenStudents(classes), [classes]);
  const selectedClass = useMemo(() => findClassById(classes, form.classId), [classes, form.classId]);
  const optionalSubjectOptions = useMemo(
    () =>
      (selectedClass?.subject_metadata || [])
        .filter((entry) => entry?.type === "optional")
        .map((entry) => String(entry.name || entry.subject || "").trim())
        .filter(Boolean),
    [selectedClass],
  );
  const selectedStudentRecord = useMemo(
    () =>
      form.id && selectedClass
        ? (selectedClass.students || []).find((student) => student.id === form.id) || null
        : null,
    [form.id, selectedClass]
  );
  const suggestedConductProfile = useMemo(
    () =>
      selectedStudentRecord && selectedClass
        ? buildSuggestedConductProfile(selectedStudentRecord, selectedClass.subjects || [], selectedClass)
        : null,
    [selectedClass, selectedStudentRecord]
  );
  const suggestedConductGrade = useMemo(
    () =>
      selectedStudentRecord && selectedClass
        ? getSuggestedConductGrade(selectedStudentRecord, selectedClass.subjects || [], selectedClass)
        : "",
    [selectedClass, selectedStudentRecord]
  );

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students
      .filter((student) => !yearFilter || String(student.year || "").trim() === yearFilter)
      .filter((student) => !formFilter || String(student.form || "").trim() === formFilter)
      .filter((student) => !classFilter || student.classId === classFilter)
      .filter(
        (student) =>
          !lifecycleFilter ||
          String(student.enrollmentStatus || "")
            .trim()
            .toLowerCase() === lifecycleFilter
      )
      .filter((student) => {
        if (!needle) return true;
        const haystack = [
          student.admissionNo || student.admission_no,
          student.index_no || student.indexNo,
          student.name,
          student.sex,
          student.status,
          student.parentName,
          student.parentPhone,
          student.classLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
  }, [classFilter, formFilter, lifecycleFilter, query, students, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedStudents = useMemo(
    () => filteredStudents.slice((safePage - 1) * perPage, safePage * perPage),
    [filteredStudents, safePage, perPage],
  );

  React.useEffect(() => { setPage(1); }, [query, yearFilter, formFilter, classFilter, lifecycleFilter, perPage]);

  const groupedStudents = useMemo(() => {
    const years = new Map();
    filteredStudents.forEach((student) => {
      const yearKey = String(student.year || "No Year").trim() || "No Year";
      const formKey = String(student.form || "Unassigned Form").trim() || "Unassigned Form";
      const classKey = student.classId;
      const classLabel = student.classLabel || "Class";
      if (!years.has(yearKey)) years.set(yearKey, new Map());
      const forms = years.get(yearKey);
      if (!forms.has(formKey)) forms.set(formKey, new Map());
      const classesMap = forms.get(formKey);
      if (!classesMap.has(classKey)) {
        classesMap.set(classKey, { classId: classKey, classLabel, students: [] });
      }
      classesMap.get(classKey).students.push(student);
    });

    return Array.from(years.entries())
      .sort(([left], [right]) => Number(right) - Number(left) || right.localeCompare(left, "en"))
      .map(([year, forms]) => ({
        year,
        forms: Array.from(forms.entries())
          .sort(([left], [right]) => left.localeCompare(right, "en"))
          .map(([formName, classesMap]) => ({
            formName,
            classes: Array.from(classesMap.values())
              .map((entry) => ({
                ...entry,
                students: [...entry.students].sort((left, right) => left.name.localeCompare(right.name, "en")),
              }))
              .sort((left, right) => left.classLabel.localeCompare(right.classLabel, "en")),
          })),
      }));
  }, [filteredStudents]);

  const stats = useMemo(
    () => ({
      students: students.length,
      classes: new Set(students.map((student) => student.classId)).size,
      guardians: students.filter((student) => student.parentName || student.parentPhone).length,
      missingGuardian: students.filter((student) => !student.parentName && !student.parentPhone).length,
      active: students.filter((student) => (student.enrollmentStatus || "active") === "active").length,
    }),
    [students],
  );
  const selectedStudent = useMemo(
    () => students.find((student) => makeStudentKey(student) === selectedStudentKey) || null,
    [selectedStudentKey, students]
  );

  React.useEffect(() => {
    if (!selectedStudentKey) return;
    if (!students.some((student) => makeStudentKey(student) === selectedStudentKey)) {
      setSelectedStudentKey("");
    }
  }, [selectedStudentKey, students]);

  React.useEffect(() => {
    if (!selectedStudent && filteredStudents.length) {
      setSelectedStudentKey(makeStudentKey(filteredStudents[0]));
    }
  }, [filteredStudents, selectedStudent]);

  const openAddModal = () => {
    const scopedClasses = classes
      .filter((cls) => !yearFilter || String(cls.year || "").trim() === yearFilter)
      .filter((cls) => !formFilter || String(cls.form || "").trim() === formFilter);
    const defaultClass =
      scopedClasses.find((cls) => cls.id === classFilter) ||
      scopedClasses[0] ||
      classes[0];
    const defaultGroupKey = defaultClass ? [defaultClass.form, defaultClass.year].filter(Boolean).join("|") : classGroupOptions[0]?.key || "";
    const defaultStream = String(defaultClass?.stream || classGroupOptions[0]?.streams?.[0]?.stream || "").trim().toUpperCase();
    setForm({
      ...makeEmptyForm(),
      classId: defaultClass?.id || "",
      classGroupKey: defaultGroupKey,
      stream: defaultStream,
    });
    setFormError("");
    setModalMode("add");
  };

  const openEditModal = (student) => {
    const targetClass = classes.find((cls) => cls.id === student.classId);
    setForm({
      classId: student.classId,
      classGroupKey: [targetClass?.form || student.form, targetClass?.year || student.year].filter(Boolean).join("|"),
      stream: String(targetClass?.stream || student.stream || "").trim().toUpperCase(),
      id: student.id,
      admission_no: student.admissionNo || student.admission_no || "",
      index_no: student.index_no || "",
      name: student.name || "",
      sex: student.sex || "M",
      enrollmentStatus: student.enrollmentStatus || student.enrollment_status || "active",
      status: student.status || "present",
      parentName: student.parentName || "",
      parentPhone: normalizeTzPhoneDraft(student.parentPhone || ""),
      address: student.address || "",
      remarks: student.remarks || "",
      optionalSubjectsConfigured: true,
      optionalSubjects: Array.isArray(student.optionalSubjects) ? student.optionalSubjects : [],
      conduct: { ...DEFAULT_CONDUCT, ...(student.conduct || {}) },
    });
    setFormError("");
    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode("");
    setForm(makeEmptyForm());
    setFormError("");
  };

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]:
        key === "admission_no"
          ? normalizeAdmissionDraft(value)
          : key === "parentPhone"
          ? normalizeTzPhoneDraft(value)
          : value,
    }));
  };

  const availableStreams = useMemo(() => {
    const group = classGroupOptions.find((entry) => entry.key === form.classGroupKey);
    return group?.streams || [];
  }, [classGroupOptions, form.classGroupKey]);

  React.useEffect(() => {
    if (!optionalSubjectOptions.length) {
      if ((form.optionalSubjects || []).length) {
        setForm((prev) => ({ ...prev, optionalSubjects: [] }));
      }
      return;
    }
    const allowed = new Set(optionalSubjectOptions);
    const nextSubjects = (form.optionalSubjects || []).filter((entry) => allowed.has(entry));
    if (nextSubjects.length !== (form.optionalSubjects || []).length) {
      setForm((prev) => ({ ...prev, optionalSubjects: nextSubjects }));
    }
  }, [form.optionalSubjects, optionalSubjectOptions]);

  React.useEffect(() => {
    if (formFilter && !formOptions.includes(formFilter)) {
      setFormFilter("");
    }
  }, [formFilter, formOptions]);

  React.useEffect(() => {
    if (classFilter && !classOptions.some((entry) => entry.id === classFilter)) {
      setClassFilter("");
    }
  }, [classFilter, classOptions]);

  const updateClassGroup = (groupKey) => {
    const group = classGroupOptions.find((entry) => entry.key === groupKey);
    const stream = group?.streams?.[0]?.stream || "";
    const classId = group?.streams?.[0]?.classId || "";
    setForm((prev) => ({
      ...prev,
      classGroupKey: groupKey,
      stream,
      classId,
    }));
  };

  const updateStream = (stream) => {
    const normalized = String(stream || "").trim().toUpperCase();
    const matched = availableStreams.find((entry) => entry.stream === normalized);
    setForm((prev) => ({
      ...prev,
      stream: normalized,
      classId: matched?.classId || prev.classId,
    }));
  };

  const updateConductField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      conduct: {
        ...prev.conduct,
        [key]: normalizeConductGrade(value),
      },
    }));
  };

  const toggleOptionalSubject = (subject) => {
    const normalized = String(subject || "").trim();
    if (!normalized) return;
    setForm((prev) => {
      const exists = (prev.optionalSubjects || []).includes(normalized);
      return {
        ...prev,
        optionalSubjects: exists
          ? (prev.optionalSubjects || []).filter((entry) => entry !== normalized)
          : [...(prev.optionalSubjects || []), normalized],
      };
    });
  };

  const applySuggestedConduct = () => {
    if (!suggestedConductProfile) return;
    setForm((prev) => ({
      ...prev,
      conduct: {
        ...prev.conduct,
        ...suggestedConductProfile,
      },
    }));
  };

  const handleSave = async () => {
    if (!form.classId || !form.stream) return;
    if (!String(form.name || "").trim()) {
      setFormError("Student name is required.");
      return;
    }
    setFormError("");
    const rawParentPhone = String(form.parentPhone || "").trim();
    const parentPhone = normalizeTzPhone(rawParentPhone);
    if (rawParentPhone && !parentPhone) {
      setFormError("Enter a valid Tanzania mobile number, for example 255712345678.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      admission_no: normalizeAdmissionDraft(form.admission_no),
      name: String(form.name || "").trim(),
      index_no: String(form.index_no || "").trim(),
      parentName: String(form.parentName || "").trim(),
      parentPhone,
      address: String(form.address || "").trim(),
      remarks: String(form.remarks || "").trim(),
      optionalSubjectsConfigured: true,
      optionalSubjects: (form.optionalSubjects || [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    };
    try {
      const result =
        modalMode === "edit"
          ? await onUpdateStudentInClass?.(form.classId, payload)
          : await onAddStudentToClass?.(form.classId, payload);
      if (result?.ok === false) return;
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student) => {
    if (!canDeleteStudents) return;
    const confirmed = window.confirm(`Delete ${student.name || "this student"}?`);
    if (!confirmed) return;
    await onDeleteStudentFromClass?.(student.classId, student.id);
  };

  const fieldGridColumns = isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))";

  const openProfileForStudent = (student) =>
    onOpenStudentProfile?.({
      admissionNo: student.admissionNo || student.admission_no || "",
      indexNo: student.index_no || student.indexNo || "",
    });

  const handlePromotion = async () => {
    if (!promotionForm.sourceClassId || !promotionForm.targetClassId) {
      setPromotionError("Select both the source class and the target class.");
      return;
    }
    if (promotionForm.sourceClassId === promotionForm.targetClassId) {
      setPromotionError("Source class and target class must be different.");
      return;
    }
    const srcLabel = allClassOptions.find((c) => c.id === promotionForm.sourceClassId)?.label || "source class";
    const tgtLabel = allClassOptions.find((c) => c.id === promotionForm.targetClassId)?.label || "target class";
    const confirmed = window.confirm(
      `Promote all students from "${srcLabel}" into "${tgtLabel}"?\n\nThis will roll over all active students and generate new CNOs in the target class. This cannot be undone.`
    );
    if (!confirmed) return;
    setPromotionError("");
    setPromotionSaving(true);
    try {
      const result = await onPromoteStudents?.(
        promotionForm.sourceClassId,
        promotionForm.targetClassId
      );
      if (result?.ok === false) {
        setPromotionError(result.error || "Unable to complete promotion.");
        return;
      }
    } finally {
      setPromotionSaving(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: pageBackground,
        padding: isMobile ? 10 : 18,
        display: "grid",
        gap: 14,
        fontFamily: premiumFontStack,
      }}
    >
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#ffffff",
          padding: isMobile ? 14 : 20,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: displayFontStack, fontSize: isMobile ? 22 : 26, fontWeight: 500, color: "#0f172a", lineHeight: 1.15 }}>
              Student Records
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              {stats.students} students across {stats.classes} classes
            </div>
          </div>
          <button type="button" onClick={openAddModal} style={primaryButtonStyle()}>+ Add Student</button>
        </div>

        <div
          style={{
            display: "flex",
            gap: isMobile ? 12 : 20,
            flexWrap: "wrap",
            padding: "10px 0",
            borderTop: "1px solid #f1f5f9",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          {[
            ["Active", stats.active],
            ["Guardians", stats.guardians],
            ["Need contact", stats.missingGuardian],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{value}</span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
            </div>
          ))}
        </div>

        <details style={{ cursor: "default" }}>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569", userSelect: "none" }}>
            Academic year promotion
          </summary>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto",
                gap: 10,
                alignItems: "end",
              }}
            >
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Source</span>
                <select value={promotionForm.sourceClassId} onChange={(event) => setPromotionForm((prev) => ({ ...prev, sourceClassId: event.target.value }))} style={fieldStyle()}>
                  <option value="">Select source class</option>
                  {allClassOptions.map((cls) => <option key={`source-${cls.id}`} value={cls.id}>{cls.label}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Target</span>
                <select value={promotionForm.targetClassId} onChange={(event) => setPromotionForm((prev) => ({ ...prev, targetClassId: event.target.value }))} style={fieldStyle()}>
                  <option value="">Select target class</option>
                  {allClassOptions.filter((cls) => cls.id !== promotionForm.sourceClassId).map((cls) => <option key={`target-${cls.id}`} value={cls.id}>{cls.label}</option>)}
                </select>
              </label>
              <button type="button" onClick={handlePromotion} disabled={promotionSaving} style={primaryButtonStyle()}>
                {promotionSaving ? "Running..." : "Promote"}
              </button>
            </div>
            {promotionError ? <div style={{ fontSize: 12, fontWeight: 600, color: "#b42318" }}>{promotionError}</div> : null}
          </div>
        </details>
      </section>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#ffffff",
          padding: isMobile ? 14 : 20,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{filteredStudents.length} of {students.length}</span>
            {(query || classFilter || formFilter || yearFilter || lifecycleFilter) && (
              <button
                type="button"
                onClick={() => { setQuery(""); setYearFilter(""); setFormFilter(""); setClassFilter(""); setLifecycleFilter(""); }}
                style={{ background: "none", border: "none", fontSize: 12, color: "#3b82f6", cursor: "pointer", padding: 0 }}
              >
                Clear
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              ["grouped", "Grouped"],
              ["table", "Table"],
            ].map(([value, label]) => {
              const active = viewMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setViewMode(value)}
                  style={{
                    padding: "5px 12px", fontSize: 12, fontWeight: active ? 600 : 400,
                    borderRadius: 6,
                    border: active ? "1px solid #0f2d6e" : "1px solid #e2e8f0",
                    background: active ? "#0f2d6e" : "#fff",
                    color: active ? "#fff" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "minmax(240px, 1.2fr) repeat(4, minmax(130px, 0.65fr))",
            gap: 8,
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, admission no, CNO..."
            style={fieldStyle()}
          />
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} style={fieldStyle()}>
            <option value="">All Years</option>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select value={formFilter} onChange={(event) => setFormFilter(event.target.value)} style={fieldStyle()}>
            <option value="">All Forms</option>
            {formOptions.map((formOption) => <option key={formOption} value={formOption}>{formOption}</option>)}
          </select>
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} style={fieldStyle()}>
            <option value="">All Classes</option>
            {classOptions.map((cls) => <option key={cls.id} value={cls.id}>{cls.label}</option>)}
          </select>
          <select value={lifecycleFilter} onChange={(event) => setLifecycleFilter(event.target.value)} style={fieldStyle()}>
            <option value="">All Statuses</option>
            {ENROLLMENT_STATUS_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
          </select>
        </div>

        {viewMode === "table" ? (
          <div
            style={{
              overflowX: "auto",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 1060 }}>
            <thead>
              <tr>
                {["", "Student", "Admission No.", "Gender", "Class", "Status", "Attendance", "Actions"].map((label) => (
                  <th
                    key={label}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#64748b",
                      borderBottom: "1px solid #e2e8f0",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                      background: "#f8fafc",
                    }}
                  >
                    {label || <input type="checkbox" aria-label="Select all students" style={{ width: 16, height: 16 }} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student) => {
                const avatar = buildStudentAvatar(student);
                const hasId = !!(student.admissionNo || student.admission_no || student.index_no || student.indexNo);
                return (
                <tr
                  key={`${student.classId}-${student.id}`}
                  onClick={() => setSelectedStudentKey(makeStudentKey(student))}
                  style={{
                    background:
                      makeStudentKey(student) === selectedStudentKey
                        ? "#f8fbff"
                        : "#ffffff",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <input type="checkbox" aria-label={`Select ${student.name || "student"}`} style={{ width: 16, height: 16, accentColor: "#0f2d6e" }} onClick={(event) => event.stopPropagation()} />
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          background: avatar.bg,
                          color: avatar.fg,
                          fontSize: 15,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {avatar.initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.01em" }}>
                          {student.name || "Unnamed Student"}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                          {student.index_no || student.indexNo || "No CNO"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", fontWeight: 500, color: "#334155", fontSize: 13, whiteSpace: "nowrap" }}>
                    {student.admissionNo || student.admission_no || "-"}
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", color: "#334155", fontSize: 13 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 15, color: student.sex === "F" ? "#ec4899" : "#3b82f6" }}>
                        {student.sex === "F" ? "♀" : "♂"}
                      </span>
                      <span>{student.sex === "F" ? "Female" : student.sex === "M" ? "Male" : "-"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", color: "#334155", fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{student.form || "-"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                      {student.stream ? `Stream ${student.stream}` : "Unassigned"}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color: getEnrollmentTone(student.enrollmentStatus) === "teal" ? "#0d9488" : getEnrollmentTone(student.enrollmentStatus) === "red" ? "#dc2626" : "#475569", whiteSpace: "nowrap" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: getEnrollmentTone(student.enrollmentStatus) === "teal" ? "#10b981" : getEnrollmentTone(student.enrollmentStatus) === "red" ? "#ef4444" : getEnrollmentTone(student.enrollmentStatus) === "blue" ? "#3b82f6" : getEnrollmentTone(student.enrollmentStatus) === "amber" ? "#f59e0b" : "#94a3b8" }} />
                      {getEnrollmentLabel(student.enrollmentStatus)}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color: student.status === "absent" ? "#dc2626" : "#0d9488", whiteSpace: "nowrap" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: student.status === "absent" ? "#ef4444" : "#10b981" }} />
                      {student.status === "absent" ? "Absent" : student.status === "incomplete" ? "Incomplete" : "Present"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openProfileForStudent(student)}
                        disabled={!hasId}
                        title={hasId ? "Open academic profile" : "No admission number or CNO yet"}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "5px 12px", fontSize: 12, fontWeight: 500,
                          borderRadius: 6, border: "1px solid #3b82f6", background: "#ffffff",
                          color: "#3b82f6", cursor: hasId ? "pointer" : "not-allowed",
                          opacity: hasId ? 1 : 0.45, whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>&#128100;</span> Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(student)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "5px 12px", fontSize: 12, fontWeight: 500,
                          borderRadius: 6, border: "1px solid #e2e8f0", background: "#ffffff",
                          color: "#334155", cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>&#9998;</span> Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          const key = makeStudentKey(student);
                          setSelectedStudentKey((prev) => prev === key ? "" : key);
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 28, height: 28, padding: 0, fontSize: 16,
                          borderRadius: 6, border: "1px solid #e2e8f0", background: "#ffffff",
                          color: "#64748b", cursor: "pointer",
                        }}
                        title="More actions"
                      >
                        &#8942;
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {!filteredStudents.length ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "24px 14px",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: 14,
                    }}
                  >
                    No students match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
            </table>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                padding: "12px 18px",
                borderTop: "1px solid #f1f5f9",
                color: "#64748b",
                fontSize: 13,
                background: "#ffffff",
              }}
            >
              <div>
                Showing {filteredStudents.length ? (safePage - 1) * perPage + 1 : 0} to {Math.min(safePage * perPage, filteredStudents.length)} of {filteredStudents.length} students
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: safePage <= 1 ? "#cbd5e1" : "#334155", cursor: safePage <= 1 ? "default" : "pointer", fontSize: 14, display: "grid", placeItems: "center" }}>&lsaquo;</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: "#94a3b8" }}>...</span>
                    ) : (
                      <button key={item} type="button" onClick={() => setPage(item)} style={{ minWidth: 32, height: 32, borderRadius: 6, border: item === safePage ? "1px solid #0f2d6e" : "1px solid #e2e8f0", background: item === safePage ? "#0f2d6e" : "#fff", color: item === safePage ? "#fff" : "#334155", cursor: "pointer", fontSize: 13, fontWeight: item === safePage ? 600 : 400 }}>{item}</button>
                    )
                  )}
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: safePage >= totalPages ? "#cbd5e1" : "#334155", cursor: safePage >= totalPages ? "default" : "pointer", fontSize: 14, display: "grid", placeItems: "center" }}>&rsaquo;</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select value={perPage} onChange={(event) => setPerPage(Number(event.target.value))} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, color: "#334155", background: "#fff", cursor: "pointer" }}>
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {groupedStudents.map((yearGroup) => (
              <div key={yearGroup.year} style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{yearGroup.year}</div>
                  <div style={pillStyle({ tone: "blue" })}>
                    {yearGroup.forms.reduce((count, formEntry) => count + formEntry.classes.reduce((sum, cls) => sum + cls.students.length, 0), 0)} students
                  </div>
                </div>
                {yearGroup.forms.map((formEntry) => (
                  <div key={`${yearGroup.year}-${formEntry.formName}`} style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{formEntry.formName}</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {formEntry.classes.map((classEntry) => (
                        <div
                          key={classEntry.classId}
                          style={{
                            ...softCardStyle({ padding: 14, radius: 12 }),
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{classEntry.classLabel}</div>
                            <div style={pillStyle({ tone: "slate" })}>{classEntry.students.length} students</div>
                          </div>
                          <div style={{ display: "grid", gap: 8 }}>
                            {classEntry.students.map((student) => (
                              <div
                                key={`${classEntry.classId}-${student.id}`}
                                onClick={() => setSelectedStudentKey(makeStudentKey(student))}
                                style={{
                                  borderRadius: 12,
                                  border:
                                    makeStudentKey(student) === selectedStudentKey
                                      ? "1px solid #3b82f6"
                                      : "1px solid #e2e8f0",
                                  background:
                                    makeStudentKey(student) === selectedStudentKey
                                      ? "#eff6ff"
                                      : "#ffffff",
                                  padding: "12px 12px 10px",
                                  display: "grid",
                                  gap: 8,
                                  cursor: "pointer",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textTransform: "uppercase" }}>{student.name || "Unnamed Student"}</div>
                                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                                      {(student.admissionNo || student.admission_no || "No admission no")} | {(student.index_no || student.indexNo || "No CNO")}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    <span style={pillStyle({ tone: getEnrollmentTone(student.enrollmentStatus) })}>
                                      {getEnrollmentLabel(student.enrollmentStatus)}
                                    </span>
                                    <span style={pillStyle({ tone: student.status === "present" ? "teal" : student.status === "absent" ? "amber" : "red" })}>
                                      {student.status || "-"}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: "grid", gap: 2, fontSize: 12, color: "#475569" }}>
                                  <div>Guardian: {student.parentName || "-"}</div>
                                  <div>Phone: {student.parentPhone || "-"}</div>
                                </div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} onClick={(event) => event.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => openProfileForStudent(student)}
                                    disabled={!(student.admissionNo || student.admission_no || student.index_no || student.indexNo)}
                                    style={{
                                      ...primaryButtonStyle({ compact: true }),
                                      opacity:
                                        student.admissionNo || student.admission_no || student.index_no || student.indexNo ? 1 : 0.55,
                                      cursor:
                                        student.admissionNo || student.admission_no || student.index_no || student.indexNo
                                          ? "pointer"
                                          : "not-allowed",
                                    }}
                                  >
                                    Profile
                                  </button>
                                  <button type="button" onClick={() => openEditModal(student)} style={secondaryButtonStyle({ compact: true })}>
                                    Edit
                                  </button>
                                  {canDeleteStudents ? (
                                    <button type="button" onClick={() => handleDelete(student)} style={{ ...pillStyle({ tone: "red" }), cursor: "pointer" }}>
                                      Delete
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {!groupedStudents.length ? (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px dashed #e2e8f0",
                  background: "#ffffff",
                  padding: "24px 14px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                No students match the current filters.
              </div>
            ) : null}
          </div>
        )}
      </section>

      {modalMode ? (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.52)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 70,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(880px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              ...glassPanelStyle({ compact: isMobile, dense: isMobile, radius: 12, padding: isMobile ? 16 : 22 }),
              display: "grid",
              gap: 14,
            }}
          >
            <div>
              <div style={{ display: "inline-flex", ...pillStyle({ tone: modalMode === "edit" ? "blue" : "teal" }) }}>
                {modalMode === "edit" ? "Update record" : "Create record"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "#0f172a", marginTop: 10 }}>
                {modalMode === "edit" ? "Edit Student" : "Add Student"}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                {modalMode === "edit"
                  ? "Update student profile information without changing the class-based entry page."
                  : "Create a student record directly into the selected class."}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: fieldGridColumns, gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Class</span>
                <select
                  value={form.classGroupKey}
                  onChange={(event) => updateClassGroup(event.target.value)}
                  disabled={modalMode === "edit"}
                  style={fieldStyle()}
                >
                  <option value="">Select form and year</option>
                  {classGroupOptions.map((cls) => (
                    <option key={cls.key} value={cls.key}>
                      {cls.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Stream</span>
                <select
                  value={form.stream}
                  onChange={(event) => updateStream(event.target.value)}
                  style={fieldStyle()}
                >
                  <option value="">Select stream</option>
                  {(availableStreams.length ? availableStreams : CLASS_STREAMS.map((stream) => ({ stream, classId: "" }))).map((entry) => (
                    <option key={entry.stream} value={entry.stream}>
                      {entry.stream}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Admission Number</span>
                <input
                  value={form.admission_no}
                  onChange={(event) => updateField("admission_no", event.target.value)}
                  placeholder="BSS-2026-0001"
                  style={fieldStyle()}
                />
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Optional for now. If used, keep the permanent format `SCHOOLCODE-YEAR-SEQUENCE`.
                </span>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>CNO</span>
                <input
                  value={form.index_no}
                  onChange={(event) => updateField("index_no", event.target.value)}
                  placeholder="Leave blank for auto-assignment"
                  style={fieldStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Student Name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Full student name"
                  style={fieldStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Sex</span>
                <select
                  value={form.sex}
                  onChange={(event) => updateField("sex", event.target.value)}
                  style={fieldStyle()}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Lifecycle Status</span>
                <select
                  value={form.enrollmentStatus}
                  onChange={(event) => updateField("enrollmentStatus", event.target.value)}
                  style={fieldStyle()}
                >
                  {ENROLLMENT_STATUS_OPTIONS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Record Status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  style={fieldStyle()}
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Parent / Guardian</span>
                <input
                  value={form.parentName}
                  onChange={(event) => updateField("parentName", event.target.value)}
                  placeholder="Guardian name"
                  style={fieldStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Guardian Phone</span>
                <input
                  value={form.parentPhone}
                  onChange={(event) => updateField("parentPhone", event.target.value)}
                  placeholder="255712345678"
                  type="tel"
                  inputMode="tel"
                  style={fieldStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Address</span>
                <input
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="Home address"
                  style={fieldStyle()}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Remarks</span>
              <textarea
                value={form.remarks}
                onChange={(event) => updateField("remarks", event.target.value)}
                rows={3}
                style={{ ...fieldStyle(), resize: "vertical" }}
              />
            </label>

            {optionalSubjectOptions.length ? (
              <div
                style={{
                  ...softCardStyle({ padding: 14, radius: 12 }),
                  display: "grid",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Optional Subjects</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Select only the optional subjects this student actually takes. Compulsory subjects stay available automatically.
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {optionalSubjectOptions.map((subject) => {
                    const checked = (form.optionalSubjects || []).includes(subject);
                    return (
                      <label
                        key={subject}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: checked ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                          background: checked ? "#eff6ff" : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOptionalSubject(subject)}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{subject}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div
              style={{
                ...softCardStyle({ padding: 14, radius: 12 }),
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Tabia na Mwenendo</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Use A, B, or C only. Blank fields will fall back to the system suggestion on the report card.
                  </div>
                </div>
                {suggestedConductGrade ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={pillStyle({ tone: suggestedConductGrade === "A" ? "teal" : suggestedConductGrade === "B" ? "amber" : "red" })}>
                      Suggested {suggestedConductGrade}
                    </div>
                    <button type="button" onClick={applySuggestedConduct} style={secondaryButtonStyle({ compact: true })}>
                      Apply Suggestion
                    </button>
                  </div>
                ) : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: fieldGridColumns, gap: 12 }}>
                {CONDUCT_FIELDS.map(([key, label]) => (
                  <label key={key} style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{label}</span>
                    <select
                      value={form.conduct[key] || ""}
                      onChange={(event) => updateConductField(key, event.target.value)}
                      style={fieldStyle()}
                    >
                      <option value="">Use suggestion</option>
                      {CONDUCT_GRADE_OPTIONS.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            {formError ? (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#dc2626",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                {formError}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                style={{
                  ...secondaryButtonStyle(),
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.classId || !form.stream || !String(form.name || "").trim()}
                style={{
                  ...primaryButtonStyle(),
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving || !form.classId || !form.stream || !String(form.name || "").trim() ? 0.65 : 1,
                }}
              >
                {saving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Add Student"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
