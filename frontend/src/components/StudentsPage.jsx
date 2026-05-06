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
      hideSettings
      activeExam={activeExam}
      onChangeExam={onChangeExam}
    />
  );
}
