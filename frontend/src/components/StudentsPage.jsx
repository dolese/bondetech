import React, { useCallback, useMemo } from "react";
import { EntryPanel } from "./EntryPanel";
import { buildFormWorkspace } from "../utils/formClassAggregation";

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
      return onUpdateStudentInClass?.(
        targetClassId,
        {
          ...studentData,
          id: originalStudentId,
        },
        opts,
      );
    },
    [onUpdateStudentInClass],
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
    />
  );
}
