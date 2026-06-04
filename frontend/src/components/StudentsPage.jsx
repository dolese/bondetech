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
  onUpdateSchool,
  onUpdateSubjects,
  onUpdateClassMeta,
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
      onUpdateSchool={onUpdateSchool}
      onUpdateSubjects={onUpdateSubjects}
      onUpdateClassMeta={onUpdateClassMeta}
      hideSettings={!onUpdateSchool && !onUpdateSubjects && !onUpdateClassMeta}
      activeExam={activeExam}
      onChangeExam={onChangeExam}
      resultsLocked={classData.published}
    />
  );
}
