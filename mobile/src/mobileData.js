export const MOBILE_TIMETABLE_DAYS = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
];

export const MOBILE_TIMETABLE_PERIODS = [
  { id: "period-1", label: "Period 1", time: "08:00-08:40" },
  { id: "period-2", label: "Period 2", time: "08:40-09:20" },
  { id: "period-3", label: "Period 3", time: "09:20-10:00" },
  { id: "period-4", label: "Period 4", time: "10:00-10:40" },
  { id: "short-break", label: "Break", time: "10:40-11:00" },
  { id: "period-5", label: "Period 5", time: "11:00-11:40" },
  { id: "period-6", label: "Period 6", time: "11:40-12:20" },
  { id: "period-7", label: "Period 7", time: "12:20-13:00" },
  { id: "lunch", label: "Lunch", time: "13:00-13:40" },
  { id: "period-8", label: "Period 8", time: "13:40-14:20" },
  { id: "period-9", label: "Period 9", time: "14:20-15:00" },
  { id: "period-10", label: "Activities", time: "15:00-15:30" },
];

const DEFAULT_EXAM_TYPE = "March Exam";
const GRADE_POINTS = { A: 1, B: 2, C: 3, D: 4, F: 5 };
const COMPOSITE_EXAM_CONFIG = {
  "Terminal Exam": { partnerExam: "March Exam" },
  "September Exam": { partnerExam: "Pre-Mock Exam" },
  "Annual Exam": { partnerExam: "September Exam" },
};

function getGrade(score) {
  if (score === "" || score === null || score === undefined) return null;
  const number = Number(score);
  if (!Number.isFinite(number)) return null;
  if (number >= 75) return "A";
  if (number >= 60) return "B";
  if (number >= 45) return "C";
  if (number >= 30) return "D";
  return "F";
}

function getGradePoints(grade) {
  return GRADE_POINTS[String(grade || "").toUpperCase()] ?? 5;
}

function getDivision(points) {
  if (points <= 17) return "I";
  if (points <= 21) return "II";
  if (points <= 25) return "III";
  if (points <= 33) return "IV";
  return "0";
}

function getCompositeEntry(examType = "", classCompositeConfig = {}) {
  const defaults = COMPOSITE_EXAM_CONFIG[examType];
  if (!defaults) return null;
  const override = classCompositeConfig?.[examType] ?? {};
  return { ...defaults, ...override };
}

function toNumericScore(value) {
  const raw = typeof value === "string" ? value.trim() : value;
  if (
    raw === "" ||
    raw === null ||
    raw === undefined ||
    (typeof raw === "string" && raw.toUpperCase() === "ABS")
  ) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeStudentResult(student = {}, subjects = [], examType = DEFAULT_EXAM_TYPE, compositeConfig = {}) {
  const examScores = student.examScores && typeof student.examScores === "object" ? student.examScores : {};
  const currentScores = Array.isArray(examScores[examType])
    ? examScores[examType]
    : Array.isArray(student.scores)
    ? student.scores
    : [];
  const compositeEntry = getCompositeEntry(examType, compositeConfig);
  const partnerScores =
    compositeEntry && Array.isArray(examScores[compositeEntry.partnerExam])
      ? examScores[compositeEntry.partnerExam]
      : null;

  const grades = subjects.map((subject, index) => {
    const currentRaw = currentScores[index];
    const partnerRaw = partnerScores ? partnerScores[index] : undefined;
    const current = toNumericScore(currentRaw);
    const partner = toNumericScore(partnerRaw);
    let score = current;

    if (partnerScores) {
      if (current !== null && partner !== null) score = (current + partner) / 2;
      else score = current ?? partner;
    }

    return {
      subject,
      raw: typeof currentRaw === "string" ? currentRaw.trim().toUpperCase() : currentRaw,
      score: score !== null ? Number(score.toFixed(1)) : null,
      grade: getGrade(score),
    };
  });

  const numericGrades = grades.filter((entry) => entry.score !== null);
  const subjectsDone = numericGrades.length;
  const status = subjectsDone === 0 ? "ABSENT" : subjectsDone < 7 ? "INCOMPLETE" : "COMPLETE";

  if (!numericGrades.length) {
    return {
      ...student,
      grades,
      total: null,
      average: null,
      averageGrade: null,
      division: null,
      points: null,
      resultStatus: status,
      subjectsDone,
    };
  }

  const total = numericGrades.reduce((sum, entry) => sum + entry.score, 0);
  const average = Number((total / numericGrades.length).toFixed(1));
  const averageGrade = getGrade(average);
  let points = null;
  let division = null;

  if (status === "COMPLETE") {
    points = [...numericGrades]
      .sort((left, right) => getGradePoints(left.grade) - getGradePoints(right.grade))
      .slice(0, 7)
      .reduce((sum, entry) => sum + getGradePoints(entry.grade), 0);
    division = getDivision(points);
  }

  return {
    ...student,
    grades,
    total: Number(total.toFixed(1)),
    average,
    averageGrade,
    division,
    points,
    resultStatus: status,
    subjectsDone,
  };
}

function withPositions(students = []) {
  const ranked = students
    .filter((student) => student.total !== null)
    .slice()
    .sort((left, right) => (right.total || 0) - (left.total || 0));
  const positions = new Map();
  ranked.forEach((student, index) => {
    positions.set(student.id, index + 1);
  });
  return students.map((student) => ({
    ...student,
    position: positions.get(student.id) || null,
  }));
}

function formatDivisionValue(student = {}) {
  if (student.resultStatus === "ABSENT") return "ABS";
  if (student.resultStatus === "INCOMPLETE") return "INC";
  return student.division || "-";
}

export function formatRoleLabel(role = "") {
  const normalized = String(role || "").trim().toLowerCase();
  if (!normalized) return "User";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatClassLabel(cls = {}) {
  return [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim() || cls.name || "Unnamed Class";
}

function normalizeTeacherKeys(user = {}) {
  return [user?.username, user?.displayName]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function parseSlotKey(slotKey = "") {
  const [dayId, periodId] = String(slotKey || "").split("__");
  return {
    dayId: dayId || "",
    periodId: periodId || "",
  };
}

function getDayLabel(dayId = "") {
  return (
    MOBILE_TIMETABLE_DAYS.find((day) => day.id === dayId)?.label ||
    String(dayId || "").trim()
  );
}

function getPeriodMeta(periodId = "") {
  return (
    MOBILE_TIMETABLE_PERIODS.find((period) => period.id === periodId) || {
      id: periodId,
      label: periodId,
      time: "",
    }
  );
}

export function summarizeTeacherAssignments(user = {}, classes = []) {
  const explicitSubjects = new Set(
    (user?.teacherAssignments?.subjectAssignments || [])
      .map((entry) => String(entry?.subject || "").trim())
      .filter(Boolean)
  );

  let timetablePeriods = 0;
  const teacherKeys = normalizeTeacherKeys(user);

  (classes || []).forEach((cls) => {
    Object.values(cls.timetable?.entries || {}).forEach((entry) => {
      const teacherKey = String(entry?.teacherUsername || entry?.teacherName || "")
        .trim()
        .toLowerCase();
      if (teacherKeys.includes(teacherKey)) {
        timetablePeriods += 1;
        if (entry.subject) {
          explicitSubjects.add(String(entry.subject).trim().toUpperCase());
        }
      }
    });
  });

  return {
    assignedClasses: classes.length,
    assignedSubjects: explicitSubjects.size,
    timetablePeriods,
    classLabels: classes.map((cls) => formatClassLabel(cls)),
  };
}

export function buildTeacherSchedule(user = {}, classes = []) {
  const teacherKeys = normalizeTeacherKeys(user);
  const slots = [];

  (classes || []).forEach((cls) => {
    Object.entries(cls.timetable?.entries || {}).forEach(([slotKey, entry]) => {
      const teacherKey = String(entry?.teacherUsername || entry?.teacherName || "")
        .trim()
        .toLowerCase();
      if (!teacherKeys.includes(teacherKey)) return;
      const { dayId, periodId } = parseSlotKey(slotKey);
      const period = getPeriodMeta(periodId);
      slots.push({
        slotKey,
        classId: cls.id,
        classLabel: formatClassLabel(cls),
        dayId,
        dayLabel: getDayLabel(dayId),
        periodId,
        periodLabel: period.label,
        periodTime: period.time,
        subject: entry.subject || "Lesson",
        room: entry.room || "",
        note: entry.note || "",
      });
    });
  });

  return slots.sort((left, right) => {
    const dayIndexGap =
      MOBILE_TIMETABLE_DAYS.findIndex((day) => day.id === left.dayId) -
      MOBILE_TIMETABLE_DAYS.findIndex((day) => day.id === right.dayId);
    if (dayIndexGap !== 0) return dayIndexGap;
    return (
      MOBILE_TIMETABLE_PERIODS.findIndex((period) => period.id === left.periodId) -
      MOBILE_TIMETABLE_PERIODS.findIndex((period) => period.id === right.periodId)
    );
  });
}

function summarizeExamScores(subjects = [], examScores = {}) {
  const examEntries = Object.entries(examScores || {})
    .map(([name, values]) => ({
      name,
      values: Array.isArray(values) ? values : [],
    }))
    .filter((entry) => entry.values.length);

  const latestExam = examEntries[examEntries.length - 1] || null;
  const latestSubjects = latestExam
    ? latestExam.values
        .map((score, index) => ({
          label: subjects[index] || `S${index + 1}`,
          score: String(score ?? "").trim() || "-",
        }))
        .filter((item) => item.score !== "-")
    : [];

  const numericScores = latestSubjects
    .map((item) => Number(item.score))
    .filter((value) => Number.isFinite(value));

  const average = numericScores.length
    ? Math.round(
        numericScores.reduce((sum, value) => sum + value, 0) / numericScores.length
      )
    : null;

  let division = "INC";
  if (average !== null) {
    if (average >= 75) division = "I";
    else if (average >= 65) division = "II";
    else if (average >= 45) division = "III";
    else if (average >= 30) division = "IV";
    else division = "0";
  }

  return {
    examCount: examEntries.length,
    latestExamName: latestExam?.name || "No Exam",
    latestSubjects,
    average,
    division,
    exams: examEntries.map((exam) => ({
      name: exam.name,
      subjects: exam.values
        .map((score, index) => ({
          label: subjects[index] || `S${index + 1}`,
          score: String(score ?? "").trim() || "-",
        }))
        .filter((item) => item.score !== "-"),
    })),
  };
}

export function summarizeParentProfile(profile) {
  const entries = (profile?.entries || []).map((entry) => {
    const resultSummary = summarizeExamScores(entry.subjects, entry.examScores);
    return {
      classId: entry.classId,
      year: entry.year || "",
      form: entry.form || "",
      stream: entry.stream || "",
      classLabel:
        [entry.form, entry.stream, entry.year].filter(Boolean).join(" ").trim() ||
        entry.className ||
        "Class",
      remarks: entry.remarks || "",
      examCount: resultSummary.examCount,
      exams: resultSummary.exams,
      latestExamName: resultSummary.latestExamName,
      average: resultSummary.average,
      division: resultSummary.division,
      latestSubjects: resultSummary.latestSubjects,
    };
  });

  const latestResult = [...entries]
    .filter((entry) => entry.examCount > 0)
    .sort((left, right) => {
      const yearGap = (Number(right.year) || 0) - (Number(left.year) || 0);
      if (yearGap !== 0) return yearGap;
      return String(right.form || "").localeCompare(String(left.form || ""), "en");
    })[0];

  const allExams = entries.flatMap((entry) =>
    entry.exams.map((exam) => ({
      classId: entry.classId,
      classLabel: entry.classLabel,
      remarks: entry.remarks,
      division: entry.division,
      average: entry.average,
      name: exam.name,
      subjects: exam.subjects,
    }))
  );

  return {
    classCount: entries.length,
    examCount: String(entries.reduce((sum, entry) => sum + entry.examCount, 0)),
    latestDivision: latestResult?.division ? `Div ${latestResult.division}` : "INC",
    latestResult: latestResult
      ? {
          classLabel: latestResult.classLabel,
          examLabel: latestResult.latestExamName,
          averageLabel:
            latestResult.average === null ? "INC" : String(latestResult.average),
          subjects: latestResult.latestSubjects.slice(0, 8),
        }
      : null,
    entries,
    allExams,
  };
}

export function summarizeClassRoster(classData = {}) {
  const students = Array.isArray(classData?.students) ? classData.students : [];
  const subjects = Array.isArray(classData?.subjects) ? classData.subjects : [];

  let present = 0;
  let absent = 0;
  let incomplete = 0;

  students.forEach((student) => {
    const status = String(student?.status || "present").trim().toLowerCase();
    if (status === "absent") absent += 1;
    else if (status === "incomplete") incomplete += 1;
    else present += 1;
  });

  return {
    totalStudents: students.length,
    present,
    absent,
    incomplete,
    subjectCount: subjects.length,
  };
}

export function buildParentReportSnapshots(profile) {
  const summary = summarizeParentProfile(profile);
  return summary.entries
    .filter((entry) => entry.examCount > 0)
    .map((entry) => ({
      classId: entry.classId,
      classLabel: entry.classLabel,
      latestExamName: entry.latestExamName,
      average: entry.average,
      division: entry.division,
      remarks: entry.remarks,
      latestSubjects: entry.latestSubjects,
    }))
    .sort((left, right) => left.classLabel.localeCompare(right.classLabel, "en"));
}

export function buildClassResultSummary(classData = {}) {
  const subjects = Array.isArray(classData.subjects) ? classData.subjects : [];
  const students = Array.isArray(classData.students) ? classData.students : [];
  const schoolInfo = classData.school_info ?? classData.schoolInfo ?? {};
  const examType = schoolInfo.exam || DEFAULT_EXAM_TYPE;
  const computedStudents = withPositions(
    students.map((student) =>
      computeStudentResult(student, subjects, examType, classData.composite_config ?? classData.compositeConfig ?? {})
    )
  );

  const completeStudents = computedStudents.filter((student) => student.resultStatus === "COMPLETE");
  const incompleteStudents = computedStudents.filter((student) => student.resultStatus === "INCOMPLETE");
  const absentStudents = computedStudents.filter((student) => student.resultStatus === "ABSENT");
  const passCount = completeStudents.filter((student) => student.division && student.division !== "0").length;
  const failCount = completeStudents.filter((student) => student.division === "0").length;
  const classAverage = completeStudents.length
    ? (
        completeStudents.reduce((sum, student) => sum + Number(student.average || 0), 0) /
        completeStudents.length
      ).toFixed(1)
    : "0.0";

  const divisionCounts = { I: 0, II: 0, III: 0, IV: 0, "0": 0 };
  completeStudents.forEach((student) => {
    if (student.division && divisionCounts[student.division] !== undefined) {
      divisionCounts[student.division] += 1;
    }
  });

  const subjectSummaries = subjects.map((subject, index) => {
    const entries = computedStudents
      .map((student) => student.grades?.[index])
      .filter((entry) => entry && entry.score !== null);
    const average = entries.length
      ? (entries.reduce((sum, entry) => sum + Number(entry.score || 0), 0) / entries.length).toFixed(1)
      : "0.0";
    const passCountForSubject = entries.filter((entry) => Number(entry.score) >= 30).length;
    return {
      subject,
      entries: entries.length,
      average,
      passRate: entries.length ? `${((passCountForSubject / entries.length) * 100).toFixed(1)}%` : "0.0%",
    };
  });

  const rankedStudents = computedStudents
    .slice()
    .sort((left, right) => {
      if ((right.total || 0) !== (left.total || 0)) return (right.total || 0) - (left.total || 0);
      return String(left.name || "").localeCompare(String(right.name || ""), "en");
    });

  return {
    examType,
    totalStudents: computedStudents.length,
    completeCount: completeStudents.length,
    incompleteCount: incompleteStudents.length,
    absentCount: absentStudents.length,
    passCount,
    failCount,
    classAverage,
    divisionCounts,
    subjectSummaries,
    topPerformers: rankedStudents.filter((student) => student.total !== null).slice(0, 5),
    students: rankedStudents,
    formatDivisionValue,
  };
}
