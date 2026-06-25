import { DEFAULT_EXAM_TYPE, getCompositeEntry } from "./constants";
import { withPositions } from "./grading";
import { assignFormDisplayIndexNos } from "./resultSheetShared";

export function makeMergedStudentId(classId, studentId) {
  return `${String(classId || "").trim()}::${String(studentId || "").trim()}`;
}

function isWorkspaceActiveClass(cls = {}) {
  return (
    cls &&
    cls.archived !== true &&
    String(cls.streamStatus || cls.stream_status || "active").trim().toLowerCase() !== "inactive"
  );
}

function getStudentIdentityKey(student = {}) {
  const admissionNo = String(student.admissionNo || student.admission_no || "").trim().toUpperCase();
  if (admissionNo) return `admission:${admissionNo}`;

  const indexNo = String(student.indexNo || student.index_no || "").trim().toUpperCase();
  if (indexNo && !indexNo.startsWith("TMP-")) return `cno:${indexNo}`;

  const name = String(student.name || "").trim().toUpperCase();
  const sex = String(student.sex || "").trim().toUpperCase();
  const parentPhone = String(student.parentPhone || student.parent_phone || "").trim();
  if (name) return `fallback:${name}:${sex}:${parentPhone}`;

  return `record:${String(student.classId || "").trim()}::${String(student.originalStudentId || student.id || "").trim()}`;
}

function dedupeWorkspaceStudents(students = []) {
  const seen = new Map();
  (Array.isArray(students) ? students : []).forEach((student) => {
    const key = getStudentIdentityKey(student);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, student);
      return;
    }

    const existingStream = String(existing.stream || "").trim();
    const nextStream = String(student.stream || "").trim();
    const existingAdmission = String(existing.admissionNo || existing.admission_no || "").trim();
    const nextAdmission = String(student.admissionNo || student.admission_no || "").trim();
    const existingIndex = String(existing.indexNo || existing.index_no || "").trim();
    const nextIndex = String(student.indexNo || student.index_no || "").trim();

    const shouldReplace =
      (!existingAdmission && !!nextAdmission) ||
      (!existingIndex && !!nextIndex) ||
      (!existingStream && !!nextStream);

    if (shouldReplace) {
      seen.set(key, student);
    }
  });
  return Array.from(seen.values());
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

  const mergedStudents = assignFormDisplayIndexNos(
    dedupeWorkspaceStudents(
      relatedClasses.flatMap((cls) =>
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
      ),
    ),
  );

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

  const dedupedRows = dedupeWorkspaceStudents(rows);
  const ranked = [...dedupedRows]
    .filter((student) => student.total !== null)
    .sort((left, right) => right.total - left.total);
  const positionMap = new Map(ranked.map((student, index) => [student.id, index + 1]));
  const computed = assignFormDisplayIndexNos(dedupedRows.map((student) => ({
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
