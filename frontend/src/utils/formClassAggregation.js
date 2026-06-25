import { DEFAULT_EXAM_TYPE, getCompositeEntry } from "./constants";
import { withPositions } from "./grading";
import { assignFormDisplayIndexNos } from "./resultSheetShared";

export function makeMergedStudentId(classId, studentId) {
  return `${String(classId || "").trim()}::${String(studentId || "").trim()}`;
}

function isWorkspaceActiveClass(cls = {}) {
  return cls && cls.archived !== true;
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
      isWorkspaceActiveClass(cls) &&
      String(cls.year || "").trim() === String(baseClass?.year || "").trim() &&
      String(cls.form || "").trim() === String(baseClass?.form || "").trim(),
  );

  const mergedStudents = assignFormDisplayIndexNos(relatedClasses.flatMap((cls) =>
    (cls.students || []).map((student) => ({
      ...student,
      id: makeMergedStudentId(cls.id, student.id),
      originalStudentId: student.id,
      classId: cls.id,
      form: cls.form || "",
      stream: cls.stream || "",
      year: cls.year || "",
      classLabel: [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim(),
    })),
  ));

  const effectiveExam = activeExam || baseClass?.school_info?.exam || DEFAULT_EXAM_TYPE;
  const subjects = Array.from(
    new Set(
      relatedClasses.flatMap((cls) => (Array.isArray(cls.subjects) ? cls.subjects : [])),
    ),
  );
  const rows = relatedClasses.flatMap((cls) => {
    const compositeEntry = getCompositeEntry(effectiveExam, cls.composite_config ?? {});
    const computedRows = (cls.students || []).map((student) => {
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
    const streamRankedRows = withPositions(computedRows, cls.subjects ?? []);
    return streamRankedRows.map((student) => ({
      ...student,
      form: cls.form || "",
      year: cls.year || "",
      classLabel: [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim(),
      streamPosn: student.posn,
      streamTotalStudents: (cls.students || []).length,
    }));
  });

  const ranked = [...rows]
    .filter((student) => student.total !== null)
    .sort((left, right) => right.total - left.total);
  const positionMap = new Map(ranked.map((student, index) => [student.id, index + 1]));
  const computed = assignFormDisplayIndexNos(rows.map((student) => ({
    ...student,
    formPosn: positionMap.get(student.id) ?? null,
    posn: positionMap.get(student.id) ?? null,
  })));

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
      subjects,
    },
    computed,
  };
}
