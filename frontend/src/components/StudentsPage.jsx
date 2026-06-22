import React, { useCallback, useMemo } from "react";
import { EntryPanel } from "./EntryPanel";
import { DEFAULT_EXAM_TYPE, getCompositeEntry } from "../utils/constants";
import { withPositions } from "../utils/grading";

function makeMergedStudentId(classId, studentId) {
  return `${String(classId || "").trim()}::${String(studentId || "").trim()}`;
}

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
  const relatedClasses = useMemo(
    () =>
      (classes || []).filter(
        (cls) =>
          String(cls.year || "").trim() === String(classData?.year || "").trim() &&
          String(cls.form || "").trim() === String(classData?.form || "").trim(),
      ),
    [classData?.form, classData?.year, classes],
  );

  const mergedClassData = useMemo(() => {
    const students = relatedClasses.flatMap((cls) =>
      (cls.students || []).map((student) => ({
        ...student,
        id: makeMergedStudentId(cls.id, student.id),
        originalStudentId: student.id,
        classId: cls.id,
        stream: cls.stream || "",
      })),
    );

    return {
      ...classData,
      id: `${classData?.year || ""}-${classData?.form || ""}-all-streams`,
      name: [classData?.form, classData?.year, "All Streams"].filter(Boolean).join(" ").trim(),
      stream: "All Streams",
      students,
    };
  }, [classData, relatedClasses]);

  const mergedComputed = useMemo(() => {
    const subjects = Array.isArray(classData?.subjects) ? classData.subjects : [];
    const effectiveExam = activeExam || classData?.school_info?.exam || DEFAULT_EXAM_TYPE;
    const rows = relatedClasses.flatMap((cls) => {
      const compositeEntry = getCompositeEntry(effectiveExam, cls.composite_config ?? {});
      return (cls.students || []).map((student) => {
        const examScores = student.examScores ?? {};
        const currentScores = Array.isArray(examScores[effectiveExam]) ? examScores[effectiveExam] : student.scores ?? [];
        const partnerScores = compositeEntry
          ? Array.isArray(examScores[compositeEntry.partnerExam])
            ? examScores[compositeEntry.partnerExam]
            : []
          : undefined;
        return {
          ...student,
          id: makeMergedStudentId(cls.id, student.id),
          originalStudentId: student.id,
          classId: cls.id,
          stream: cls.stream || "",
          scores: currentScores,
          ...(compositeEntry
            ? {
                partnerScores,
                compositeExcludedSubjects: compositeEntry.excludedSubjects ?? [],
              }
            : {}),
        };
      });
    });
    return withPositions(rows, subjects);
  }, [activeExam, classData?.school_info?.exam, classData?.subjects, relatedClasses]);

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
    />
  );
}
