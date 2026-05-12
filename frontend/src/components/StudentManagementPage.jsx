import React, { useMemo, useState } from "react";
import { useViewport } from "../utils/useViewport";
import { CLASS_STREAMS, DEFAULT_CONDUCT } from "../hooks/useClasses";
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

function makeEmptyForm() {
  return {
    classId: "",
    classGroupKey: "",
    stream: "",
    id: "",
    index_no: "",
    name: "",
    sex: "M",
    status: "present",
    parentName: "",
    parentPhone: "",
    address: "",
    previousSchool: "",
    remarks: "",
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

export function StudentManagementPage({
  classes = [],
  canDeleteStudents = false,
  onOpenStudentProfile,
  onAddStudentToClass,
  onUpdateStudentInClass,
  onDeleteStudentFromClass,
}) {
  const { isMobile } = useViewport();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [modalMode, setModalMode] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());

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

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students
      .filter((student) => !classFilter || student.classId === classFilter)
      .filter((student) => {
        if (!needle) return true;
        const haystack = [
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
    setModalMode("add");
  };

  const openEditModal = (student) => {
    const targetClass = classes.find((cls) => cls.id === student.classId);
    setForm({
      classId: student.classId,
      classGroupKey: [targetClass?.form || student.form, targetClass?.year || student.year].filter(Boolean).join("|"),
      stream: String(targetClass?.stream || student.stream || "").trim().toUpperCase(),
      id: student.id,
      index_no: student.index_no || "",
      name: student.name || "",
      sex: student.sex || "M",
      status: student.status || "present",
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || "",
      address: student.address || "",
      previousSchool: student.previousSchool || "",
      remarks: student.remarks || "",
      conduct: { ...DEFAULT_CONDUCT, ...(student.conduct || {}) },
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode("");
    setForm(makeEmptyForm());
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const availableStreams = useMemo(() => {
    const group = classGroupOptions.find((entry) => entry.key === form.classGroupKey);
    return group?.streams || [];
  }, [classGroupOptions, form.classGroupKey]);

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
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!form.classId || !form.stream) return;
    if (!String(form.name || "").trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      name: String(form.name || "").trim(),
      index_no: String(form.index_no || "").trim(),
      parentName: String(form.parentName || "").trim(),
      parentPhone: String(form.parentPhone || "").trim(),
      address: String(form.address || "").trim(),
      previousSchool: String(form.previousSchool || "").trim(),
      remarks: String(form.remarks || "").trim(),
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
            placeholder="Search by student name, CNO, parent, or class"
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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
            <thead>
              <tr>
                {["CNO", "Student", "Sex", "Status", "Class", "Guardian", "Phone", "Actions"].map((label) => (
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
                    {student.index_no || student.indexNo || "-"}
                  </td>
                  <td style={{ padding: "14px 10px", borderBottom: "1px solid #edf2fb" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{student.name || "Unnamed Student"}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {student.previousSchool || "No previous school saved"}
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
                        onClick={() => onOpenStudentProfile?.(student.index_no || student.indexNo)}
                        disabled={!(student.index_no || student.indexNo)}
                        title={student.index_no || student.indexNo ? "Open academic profile" : "Student has no CNO/index number yet"}
                        style={{
                          ...secondaryButtonStyle({ compact: true }),
                          opacity: student.index_no || student.indexNo ? 1 : 0.55,
                          cursor: student.index_no || student.indexNo ? "pointer" : "not-allowed",
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

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Previous School</span>
                <input
                  value={form.previousSchool}
                  onChange={(event) => updateField("previousSchool", event.target.value)}
                  placeholder="Previous school"
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

            <div
              style={{
                ...softCardStyle({ padding: 14, radius: 20 }),
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Tabia na Mwenendo</div>
              <div style={{ display: "grid", gridTemplateColumns: fieldGridColumns, gap: 12 }}>
                {[
                  ["utendajiKazi", "Utendaji Kazi"],
                  ["nidhamNaUtii", "Nidhamu na Utii"],
                  ["utunzajiMali", "Utunzaji Mali"],
                  ["uongozi", "Uongozi"],
                  ["michezo", "Michezo"],
                  ["ushirikiano", "Ushirikiano"],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>{label}</span>
                    <input
                      value={form.conduct[key] || ""}
                      onChange={(event) => updateConductField(key, event.target.value)}
                      style={fieldStyle()}
                    />
                  </label>
                ))}
              </div>
            </div>

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
