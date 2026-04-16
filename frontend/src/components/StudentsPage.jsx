import React from "react";
import { EntryPanel } from "./EntryPanel";

export function StudentsPage({
  classData,
  computed,
  onShowModal,
  onUpdateStudent,
  onDeleteStudent,
  onAddStudent,
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
      hideSettings
      activeExam={activeExam}
      onChangeExam={onChangeExam}
    />
  );
}
