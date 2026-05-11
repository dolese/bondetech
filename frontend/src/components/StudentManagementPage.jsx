import React, { useMemo, useState } from "react";
import { useViewport } from "../utils/useViewport";
import { DEFAULT_CONDUCT } from "../hooks/useClasses";

function getClassLabel(cls = {}) {
  const base = [cls.form, cls.stream].filter(Boolean).join(" ").trim();
  if (base && cls.year) return `${base} ${cls.year}`;
  return base || cls.name || "Class";
}

function makeEmptyForm() {
  return {
    classId: "",
    id: "",
    index_no: "",
    name: "",
    sex: "M",
    status: "present",
    dateOfBirth: "",
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

  const students = useMemo(() => flattenStudents(classes), [classes]);

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students
      .filter((student) => !classFilter || student.classId === classFilter)
      .filter((student) => {
        if (!needle) return true;
        const haystack = [
          student.index_no,
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
    }),
    [students],
  );

  const openAddModal = () => {
    setForm({
      ...makeEmptyForm(),
      classId: classFilter || classOptions[0]?.id || "",
    });
    setModalMode("add");
  };

  const openEditModal = (student) => {
    setForm({
      classId: student.classId,
      id: student.id,
      index_no: student.index_no || "",
      name: student.name || "",
      sex: student.sex || "M",
      status: student.status || "present",
      dateOfBirth: student.dateOfBirth || "",
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
    if (!form.classId) return;
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
        background: "#f6f9ff",
        padding: isMobile ? 10 : 16,
        display: "grid",
        gap: 14,
      }}
    >
      <section
        style={{
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #dbe7ff",
          boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
          padding: isMobile ? 14 : 18,
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
            <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
              Student Management
            </div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 6, maxWidth: 720 }}>
              Manage student records across the school without changing the current class-based Student Entry workflow.
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            style={{
              border: "none",
              borderRadius: 12,
              background: "linear-gradient(135deg, #0f766e, #0ea5a4)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              padding: "11px 16px",
              cursor: "pointer",
            }}
          >
            + Student Management
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            ["Students", stats.students, "All student records currently available."],
            ["Classes", stats.classes, "Classes linked to student records."],
            ["Guardians", stats.guardians, "Students with parent or guardian contact saved."],
          ].map(([label, value, note]) => (
            <div
              key={label}
              style={{
                borderRadius: 16,
                border: "1px solid #dbe7ff",
                background: "linear-gradient(180deg, #f8fbff, #eef5ff)",
                padding: 14,
                display: "grid",
                gap: 6,
              }}
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
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #dbe7ff",
          boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
          padding: isMobile ? 14 : 18,
          display: "grid",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(260px, 1.4fr) minmax(220px, 1fr)",
            gap: 12,
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by student name, CNO, parent, or class"
            style={{
              borderRadius: 12,
              border: "1px solid #d6e2f5",
              padding: "12px 14px",
              fontSize: 14,
              outline: "none",
            }}
          />
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            style={{
              borderRadius: 12,
              border: "1px solid #d6e2f5",
              padding: "12px 14px",
              fontSize: 14,
              background: "#fff",
              outline: "none",
            }}
          >
            <option value="">All Classes</option>
            {classOptions.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
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
                      borderBottom: "1px solid #dbe7ff",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={`${student.classId}-${student.id}`}>
                  <td style={{ padding: "12px 10px", borderBottom: "1px solid #edf2fb", fontWeight: 800, color: "#0f172a" }}>
                    {student.index_no || "-"}
                  </td>
                  <td style={{ padding: "12px 10px", borderBottom: "1px solid #edf2fb" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{student.name || "Unnamed Student"}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {student.previousSchool || "No previous school saved"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 10px", borderBottom: "1px solid #edf2fb" }}>{student.sex || "-"}</td>
                  <td style={{ padding: "12px 10px", borderBottom: "1px solid #edf2fb" }}>{student.status || "-"}</td>
                  <td style={{ padding: "12px 10px", borderBottom: "1px solid #edf2fb" }}>{student.classLabel}</td>
                  <td style={{ padding: "12px 10px", borderBottom: "1px solid #edf2fb" }}>{student.parentName || "-"}</td>
                  <td style={{ padding: "12px 10px", borderBottom: "1px solid #edf2fb" }}>{student.parentPhone || "-"}</td>
                  <td style={{ padding: "12px 10px", borderBottom: "1px solid #edf2fb" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => onOpenStudentProfile?.(student.index_no || student.indexNo)}
                        style={{
                          border: "1px solid #cdd9ee",
                          borderRadius: 10,
                          background: "#fff",
                          color: "#0f172a",
                          fontWeight: 700,
                          padding: "7px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(student)}
                        style={{
                          border: "1px solid #bfdbfe",
                          borderRadius: 10,
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontWeight: 700,
                          padding: "7px 10px",
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
                            border: "1px solid #fecaca",
                            borderRadius: 10,
                            background: "#fef2f2",
                            color: "#b91c1c",
                            fontWeight: 700,
                            padding: "7px 10px",
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
              background: "#fff",
              borderRadius: 22,
              border: "1px solid #dbe7ff",
              boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
              padding: isMobile ? 16 : 22,
              display: "grid",
              gap: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
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
                  value={form.classId}
                  onChange={(event) => updateField("classId", event.target.value)}
                  disabled={modalMode === "edit"}
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px", background: "#fff" }}
                >
                  <option value="">Select class</option>
                  {classOptions.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.label}
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
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Student Name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Full student name"
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Date of Birth</span>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => updateField("dateOfBirth", event.target.value)}
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Sex</span>
                <select
                  value={form.sex}
                  onChange={(event) => updateField("sex", event.target.value)}
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px", background: "#fff" }}
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
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px", background: "#fff" }}
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
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Guardian Phone</span>
                <input
                  value={form.parentPhone}
                  onChange={(event) => updateField("parentPhone", event.target.value)}
                  placeholder="Phone number"
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Address</span>
                <input
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="Home address"
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Previous School</span>
                <input
                  value={form.previousSchool}
                  onChange={(event) => updateField("previousSchool", event.target.value)}
                  placeholder="Previous school"
                  style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px" }}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Remarks</span>
              <textarea
                value={form.remarks}
                onChange={(event) => updateField("remarks", event.target.value)}
                rows={3}
                style={{ borderRadius: 14, border: "1px solid #d6e2f5", padding: "12px 14px", resize: "vertical" }}
              />
            </label>

            <div
              style={{
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                background: "#f8fbff",
                padding: 14,
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
                      style={{ borderRadius: 12, border: "1px solid #d6e2f5", padding: "11px 12px" }}
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
                  border: "1px solid #d6e2f5",
                  borderRadius: 12,
                  background: "#fff",
                  color: "#334155",
                  fontWeight: 800,
                  padding: "11px 16px",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.classId || !String(form.name || "").trim()}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #0f766e, #0ea5a4)",
                  color: "#fff",
                  fontWeight: 800,
                  padding: "11px 16px",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving || !form.classId || !String(form.name || "").trim() ? 0.65 : 1,
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
