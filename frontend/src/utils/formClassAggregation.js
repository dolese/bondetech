import { DEFAULT_EXAM_TYPE, getCompositeEntry } from "./constants";
import { withPositions } from "./grading";

export function makeMergedStudentId(classId, studentId) {
  return `${String(classId || "").trim()}::${String(studentId || "").trim()}`;
}

export function buildFormWorkspace(classes = [], baseClass = null, activeExam = "") {
  if (!baseClass) {
    return {
      relatedClasses: [],
      classData: null,
      computed: [],
    };
  }

  const relatedClasses = (classes || []).filter(
    (cls) =>
      String(cls.year || "").trim() === String(baseClass?.year || "").trim() &&
      String(cls.form || "").trim() === String(baseClass?.form || "").trim(),
  );

  const mergedStudents = relatedClasses.flatMap((cls) =>
    (cls.students || []).map((student) => ({
      ...student,
      id: makeMergedStudentId(cls.id, student.id),
      originalStudentId: student.id,
      classId: cls.id,
      stream: cls.stream || "",
    })),
  );

  const effectiveExam = activeExam || baseClass?.school_info?.exam || DEFAULT_EXAM_TYPE;
  const subjects = Array.isArray(baseClass?.subjects) ? baseClass.subjects : [];
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

  return {
    relatedClasses,
    classData: {
      ...baseClass,
      id: `${baseClass?.year || ""}-${baseClass?.form || ""}-all-streams`,
      name: [baseClass?.form, baseClass?.year, "All Streams"].filter(Boolean).join(" ").trim(),
      stream: "",
      students: mergedStudents,
      rankTotalStudents: mergedStudents.length,
      classLabelOverride: baseClass?.form || baseClass?.name || "",
    },
    computed: withPositions(rows, subjects),
  };
}
