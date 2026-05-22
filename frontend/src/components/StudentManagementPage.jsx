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
  fieldStyle,
  glassPanelStyle,
  pageBackground,
  pillStyle,
  premiumFontStack,
  primaryButtonStyle,
  secondaryButtonStyle,
  softCardStyle,
} from "../utils/designSystem";

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
    })),
  );
}

function findClassById(classes = [], classId = "") {
  return classes.find((cls) => cls.id === classId) || null;
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
  const [classFilter, setClassFilter] = useState("");
  const [modalMode, setModalMode] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());
  const [formError, setFormError] = useState("");
  const [promotionForm, setPromotionForm] = useState({ sourceClassId: "", targetClassId: "" });
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [promotionError, setPromotionError] = useState("");

  const classOptions = useMemo(
    () =>
      [...classes]
        .sort((left, right) => getClassLabel(left).localeCompare(getClassLabel(right), "en"))
        .map((cls) => ({
          id: cls.id,
          label: getClassLabel(cls),
        })),
    [classes],
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
      .filter((student) => !classFilter || student.classId === classFilter)
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
  }, [classFilter, query, students]);

  const stats = useMemo(
    () => ({
      students: students.length,
      classes: new Set(students.map((student) => student.classId)).size,
      guardians: students.filter((student) => student.parentName || student.parentPhone).length,
      missingGuardian: students.filter((student) => !student.parentName && !student.parentPhone).length,
    }),
    [students],
  );

  const openAddModal = () => {
    const defaultClass = classes.find((cls) => cls.id === classFilter) || classes[0];
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
      status: student.status || "present",
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || "",
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
      [key]: key === "admission_no" ? normalizeAdmissionDraft(value) : value,
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
    setSaving(true);
    const payload = {
      ...form,
      admission_no: normalizeAdmissionDraft(form.admission_no),
      name: String(form.name || "").trim(),
      index_no: String(form.index_no || "").trim(),
      parentName: String(form.parentName || "").trim(),
      parentPhone: String(form.parentPhone || "").trim(),
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

  const handlePromotion = async () => {
    if (!promotionForm.sourceClassId || !promotionForm.targetClassId) {
      setPromotionError("Select both the source class and the target class.");
      return;
    }
    if (promotionForm.sourceClassId === promotionForm.targetClassId) {
      setPromotionError("Source class and target class must be different.");
      return;
    }
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
          ...glassPanelStyle({ compact: isMobile, dense: isMobile, radius: isMobile ? 24 : 30 }),
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "inline-flex", ...pillStyle({ tone: "blue" }) }}>School-wide records</div>
            <div style={{ fontSize: isMobile ? 30 : 34, fontWeight: 900, color: "#0f172a", lineHeight: 1.05, marginTop: 10 }}>
              Student Management
            </div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 6, maxWidth: 720 }}>
              Manage student records across the school without changing the current class-based Student Entry workflow.
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            style={primaryButtonStyle()}
          >
            + Add Student
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            ["Students", stats.students, "All student records currently available."],
            ["Classes", stats.classes, "Classes linked to student records."],
            ["Guardians", stats.guardians, "Students with parent or guardian contact saved."],
            ["Need Contact", stats.missingGuardian, "Students still missing guardian information."],
          ].map(([label, value, note]) => (
            <div
              key={label}
              style={{ ...softCardStyle({ padding: 15, radius: 20 }), display: "grid", gap: 6 }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.7 }}>
                {label}
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#0f172a" }}>{value}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{note}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          ...glassPanelStyle({ compact: isMobile, dense: isMobile, radius: isMobile ? 24 : 30 }),
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>Academic Year Promotion</div>
          <div style={{ fontSize: 13, color: "#64748b", maxWidth: 760, lineHeight: 1.6 }}>
            Roll students into the next class while keeping their permanent identity, guardian details, and optional-subject setup aligned to the target class.
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Source Class
            </span>
            <select
              value={promotionForm.sourceClassId}
              onChange={(event) => setPromotionForm((prev) => ({ ...prev, sourceClassId: event.target.value }))}
              style={fieldStyle()}
            >
              <option value="">Select source class</option>
              {classOptions.map((cls) => (
                <option key={`source-${cls.id}`} value={cls.id}>
                  {cls.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Target Class
            </span>
            <select
              value={promotionForm.targetClassId}
              onChange={(event) => setPromotionForm((prev) => ({ ...prev, targetClassId: event.target.value }))}
              style={fieldStyle()}
            >
              <option value="">Select target class</option>
              {classOptions
                .filter((cls) => cls.id !== promotionForm.sourceClassId)
                .map((cls) => (
                  <option key={`target-${cls.id}`} value={cls.id}>
                    {cls.label}
                  </option>
                ))}
            </select>
          </label>
          <button type="button" onClick={handlePromotion} disabled={promotionSaving} style={primaryButtonStyle()}>
            {promotionSaving ? "Running..." : "Promote / Rollover"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          New class CNOs are generated in the target class. Existing target students with the same admission number are refreshed instead of duplicated.
        </div>
        {promotionError ? (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#b42318" }}>{promotionError}</div>
        ) : null}
      </section>

      <section
        style={{
          ...glassPanelStyle({ compact: isMobile, dense: isMobile, radius: isMobile ? 24 : 30 }),
          display: "grid",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>Directory</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Search, filter, and maintain full student records from one place.
            </div>
          </div>
          <div style={pillStyle({ tone: classFilter ? "teal" : "slate" })}>{filteredStudents.length} visible</div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(320px, 1.45fr) minmax(220px, 0.8fr)",
            gap: 12,
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by admission no, student name, CNO, parent, or class"
            style={fieldStyle()}
          />
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            style={fieldStyle()}
          >
            <option value="">All Classes</option>
            {classOptions.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.label}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            overflowX: "auto",
            borderRadius: 22,
            border: "1px solid rgba(214,226,245,0.92)",
            background: "rgba(255,255,255,0.82)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
            <thead>
              <tr>
                {["Admission No", "CNO", "Student", "Sex", "Status", "Class", "Guardian", "Phone", "Actions"].map((label) => (
                  <th
                    key={label}
                    style={{
                      textAlign: "left",
                      padding: "12px 10px",
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#475569",
                      borderBottom: "1px solid rgba(214,226,245,0.92)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                      background: "rgba(247,250,252,0.94)",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={`${student.classId}-${student.id}`} style={{ background: "rgba(255,255,255,0.52)" }}>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb", fontWeight: 800, color: "#0f172a" }}>
                    {student.admissionNo || student.admission_no || "-"}
                  </td>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb", fontWeight: 800, color: "#0f172a" }}>
                    {student.index_no || student.indexNo || "-"}
                  </td>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{student.name || "Unnamed Student"}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {student.parentName ? `Guardian: ${student.parentName}` : "Student record"}
                    </div>
                  </td>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb" }}>{student.sex || "-"}</td>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb" }}>
                    <span style={pillStyle({ tone: student.status === "present" ? "teal" : student.status === "absent" ? "amber" : "red" })}>
                      {student.status || "-"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb" }}>{student.classLabel}</td>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb" }}>{student.parentName || "-"}</td>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb" }}>{student.parentPhone || "-"}</td>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenStudentProfile?.({
                            admissionNo: student.admissionNo || student.admission_no || "",
                            indexNo: student.index_no || student.indexNo || "",
                          })
                        }
                        disabled={!(student.admissionNo || student.admission_no || student.index_no || student.indexNo)}
                        title={
                          student.admissionNo || student.admission_no || student.index_no || student.indexNo
                            ? "Open academic profile"
                            : "Student has no admission number or CNO yet"
                        }
                        style={{
                          ...secondaryButtonStyle({ compact: true }),
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
                      <button
                        type="button"
                        onClick={() => openEditModal(student)}
                        style={{
                          ...pillStyle({ tone: "blue" }),
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      {canDeleteStudents ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(student)}
                          style={{
                            ...pillStyle({ tone: "red" }),
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredStudents.length ? (
                <tr>
                  <td
                    colSpan={9}
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
        </div>
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
              ...glassPanelStyle({ compact: isMobile, dense: isMobile, radius: 26, padding: isMobile ? 16 : 22 }),
              display: "grid",
              gap: 14,
            }}
          >
            <div>
              <div style={{ display: "inline-flex", ...pillStyle({ tone: modalMode === "edit" ? "blue" : "teal" }) }}>
                {modalMode === "edit" ? "Update record" : "Create record"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginTop: 10 }}>
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
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Class</span>
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
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Stream</span>
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
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Admission Number</span>
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
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>CNO</span>
                <input
                  value={form.index_no}
                  onChange={(event) => updateField("index_no", event.target.value)}
                  placeholder="Leave blank for auto-assignment"
                  style={fieldStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Student Name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Full student name"
                  style={fieldStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Sex</span>
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
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Status</span>
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
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Parent / Guardian</span>
                <input
                  value={form.parentName}
                  onChange={(event) => updateField("parentName", event.target.value)}
                  placeholder="Guardian name"
                  style={fieldStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Guardian Phone</span>
                <input
                  value={form.parentPhone}
                  onChange={(event) => updateField("parentPhone", event.target.value)}
                  placeholder="Phone number"
                  style={fieldStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Address</span>
                <input
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="Home address"
                  style={fieldStyle()}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Remarks</span>
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
                  ...softCardStyle({ padding: 14, radius: 20 }),
                  display: "grid",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Optional Subjects</div>
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
                          borderRadius: 14,
                          border: checked ? "1px solid #93c5fd" : "1px solid #dbe6fb",
                          background: checked ? "rgba(219,234,254,0.72)" : "rgba(255,255,255,0.88)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOptionalSubject(subject)}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{subject}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div
              style={{
                ...softCardStyle({ padding: 14, radius: 20 }),
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
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Tabia na Mwenendo</div>
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
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>{label}</span>
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
                  fontWeight: 700,
                  color: "#8b2500",
                  background: "rgba(254,226,226,0.9)",
                  border: "1px solid rgba(248,113,113,0.35)",
                  borderRadius: 14,
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
