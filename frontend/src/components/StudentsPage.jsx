import React from "react";
import { EntryPanel } from "./EntryPanel";

export function StudentsPage({
  classData,
  computed,
  onShowModal,
  onUpdateStudent,
  onDeleteStudent,
  onAddStudent,
  onReorderStudentCnos,
  canDeleteStudents,
  activeExam,
  onChangeExam,
}) {
  return (
    <EntryPanel
      classId={classData.id}
      classData={classData}
      computed={computed}
      onShowModal={onShowModal}
      onUpdateStudent={onUpdateStudent}
      onDeleteStudent={onDeleteStudent}
      onAddStudent={onAddStudent}
      onReorderStudentCnos={onReorderStudentCnos}
      canDeleteStudents={canDeleteStudents}
      hideSettings
      activeExam={activeExam}
      onChangeExam={onChangeExam}
    />
  );
}
