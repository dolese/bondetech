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
  // Only the admission number is a permanent, globally-unique identity, so it is
  // the only safe key for collapsing a student that genuinely appears in more
  // than one class document.
  const admissionNo = String(student.admissionNo || student.admission_no || "").trim().toUpperCase();
  if (admissionNo) return `admission:${admissionNo}`;

  // Without an admission number we must NOT dedupe on CNO or name+sex+phone:
  // CNOs reset per stream (Stream A and Stream B both start at S6509/0001) and
  // names can repeat, so those keys collapse distinct students and make whole
  // streams disappear from Marks Entry. Key by the actual record instead so each
  // real student is always kept.
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

  const resolveStream = (cls, student) =>
    String(cls.stream || student.stream || student.stream_name || "").trim();

  const mergedStudents = assignFormDisplayIndexNos(
    dedupeWorkspaceStudents(
      relatedClasses.flatMap((cls) =>
        (cls.students || []).map((student) => {
          const stream = resolveStream(cls, student);
          return {
            ...student,
            id: makeMergedStudentId(cls.id, student.id),
            originalStudentId: student.id,
            classId: cls.id,
            form: cls.form || "",
            stream,
            year: cls.year || "",
            classLabel: [cls.form, stream, cls.year].filter(Boolean).join(" ").trim(),
          };
        }),
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
      // Scores are strictly per-exam. Only the default exam may fall back to the
      // legacy top-level `scores` (which mirrors the default exam); every other
      // exam with no saved marks must read blank, never another exam's marks.
      const currentScores = Array.isArray(examScores[effectiveExam])
        ? examScores[effectiveExam]
        : effectiveExam === DEFAULT_EXAM_TYPE
        ? student.scores ?? []
        : [];
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
        stream: resolveStream(cls, student),
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

  const diagnostics = buildWorkspaceDiagnostics(baseClass, relatedClasses, mergedStudents);

  return {
    relatedClasses,
    diagnostics,
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

// Counts the merged form roster by stream and flags students whose class has no
// stream value (they surface as "Unassigned" in Marks Entry). Enable verbose
// per-render logging from the browser console with:
//   window.__BONDE_DEBUG_WORKSPACE = true
function buildWorkspaceDiagnostics(baseClass, relatedClasses, mergedStudents) {
  const streamCounts = {};
  let unassignedStudentsCount = 0;
  mergedStudents.forEach((student) => {
    const stream = String(student.stream || "").trim();
    if (!stream) {
      unassignedStudentsCount += 1;
      return;
    }
    streamCounts[stream] = (streamCounts[stream] || 0) + 1;
  });

  const totalStudentsInForm = relatedClasses.reduce(
    (sum, cls) => sum + (Array.isArray(cls.students) ? cls.students.length : 0),
    0,
  );
  const unassignedClasses = relatedClasses
    .filter((cls) => !String(cls.stream || "").trim() && (cls.students || []).length)
    .map((cls) => ({ classId: cls.id, name: cls.name || "", students: (cls.students || []).length }));

  const diagnostics = {
    form: String(baseClass?.form || "").trim(),
    year: String(baseClass?.year || "").trim(),
    streams: relatedClasses.map((cls) => String(cls.stream || "").trim() || "(blank)"),
    streamCounts,
    totalStudentsInForm,
    returnedStudentsCount: mergedStudents.length,
    unassignedStudentsCount,
    unassignedClasses,
  };

  if (typeof window !== "undefined" && window.__BONDE_DEBUG_WORKSPACE) {
    // eslint-disable-next-line no-console
    console.debug("[buildFormWorkspace]", diagnostics);
  }

  return diagnostics;
}
