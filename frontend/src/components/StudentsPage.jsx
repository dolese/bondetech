import React, { useCallback, useMemo } from "react";
import { EntryPanel } from "./EntryPanel";
import { buildFormWorkspace, remapScoresBySubjectName } from "../utils/formClassAggregation";

export function StudentsPage({
  classData,
  classes = [],
  onShowModal,
  onUpdateStudentInClass,
  onDeleteStudentFromClass,
  onAddStudent,
  onReorderStudentCnos,
  canDeleteStudents,
  onUpdateSchool,
  activeExam,
  onChangeExam,
  onPickClass,
}) {
  const formWorkspace = useMemo(
    () => buildFormWorkspace(classes, classData, activeExam),
    [activeExam, classData, classes],
  );
  const mergedClassData = formWorkspace.classData || classData;
  const mergedComputed = formWorkspace.computed || [];
  const streamFilterOptions = useMemo(() => {
    const streamValues = Array.from(
      new Set(
        mergedClassData.students
          .map((student) => String(student.stream || "").trim().toUpperCase())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right, "en"));
    return [
      { value: "all", label: "All Streams" },
      ...streamValues.map((value) => ({ value, label: `Stream ${value}` })),
      { value: "unassigned", label: "Unassigned" },
    ];
  }, [mergedClassData.students]);

  // Form switcher so Marks Entry isn't tied to the sidebar's active form.
  const formSelectorOptions = useMemo(() => {
    const map = new Map();
    classes.forEach((cls) => {
      const form = String(cls.form || "").trim();
      const year = String(cls.year || "").trim();
      if (!form) return;
      const key = `${form}|${year}`;
      if (!map.has(key)) {
        map.set(key, { value: key, label: [form, year].filter(Boolean).join(" "), classId: cls.id });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "en", { numeric: true }),
    );
  }, [classes]);

  const currentForm = `${String(classData.form || "").trim()}|${String(classData.year || "").trim()}`;

  const handleSelectForm = useCallback(
    (key) => {
      const option = formSelectorOptions.find((entry) => entry.value === key);
      if (option?.classId) onPickClass?.(option.classId);
    },
    [formSelectorOptions, onPickClass],
  );

  const handleShowModal = useCallback(
    (type, studentId = null) => {
      if (!studentId) {
        onShowModal?.(type);
        return;
      }
      const target =
        mergedComputed.find((student) => student.id === studentId) ??
        mergedComputed.find((student) => student.originalStudentId === studentId) ??
        null;
      onShowModal?.(type, target || studentId);
    },
    [mergedComputed, onShowModal],
  );

  const handleUpdateStudent = useCallback(
    (studentData, opts = {}) => {
      const targetClassId = String(studentData?.classId || "").trim();
      const originalStudentId = studentData?.originalStudentId || studentData?.id;
      if (!targetClassId || !originalStudentId) {
        return { ok: false, error: "Student class mapping not found" };
      }
      // The grid edits scores against the merged UNION subject order, but the
      // target stream stores them against its own subject order. Remap by name
      // so an edited mark is written to the correct subject (and not truncated
      // by the backend's length clamp).
      let payload = { ...studentData, id: originalStudentId };
      if (Array.isArray(studentData?.scores)) {
        const targetClass = classes.find(
          (cls) => String(cls.id) === targetClassId,
        );
        const targetSubjects = targetClass?.subjects ?? mergedClassData.subjects ?? [];
        payload = {
          ...payload,
          scores: remapScoresBySubjectName(
            mergedClassData.subjects ?? [],
            targetSubjects,
            studentData.scores,
          ),
        };
      }
      return onUpdateStudentInClass?.(targetClassId, payload, opts);
    },
    [onUpdateStudentInClass, classes, mergedClassData.subjects],
  );

  const handleDeleteStudent = useCallback(
    (studentId) => {
      const target = mergedComputed.find((student) => student.id === studentId) ?? null;
      if (!target?.classId || !target?.originalStudentId) {
        return { ok: false, error: "Student class mapping not found" };
      }
      return onDeleteStudentFromClass?.(target.classId, target.originalStudentId);
    },
    [mergedComputed, onDeleteStudentFromClass],
  );

  return (
    <EntryPanel
      classId={mergedClassData.id}
      classData={mergedClassData}
      computed={mergedComputed}
      onShowModal={handleShowModal}
      onUpdateStudent={handleUpdateStudent}
      onDeleteStudent={handleDeleteStudent}
      onAddStudent={onAddStudent}
      onReorderStudentCnos={null}
      canDeleteStudents={canDeleteStudents}
      onUpdateSchool={onUpdateSchool}
      hideSettings
      activeExam={activeExam}
      onChangeExam={onChangeExam}
      resultsLocked={classData.published}
      streamFilterOptions={streamFilterOptions}
      formSelectorOptions={formSelectorOptions}
      currentForm={currentForm}
      onSelectForm={handleSelectForm}
    />
  );
}
