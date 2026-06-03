import { computeStudent } from "./grading";

export const CONDUCT_FIELDS = [
  ["utendajiKazi", "UTENDAJI KAZI"],
  ["nidhamNaUtii", "NIDHAM NA UTII"],
  ["utunzajiMali", "UTUNZAJI MALI"],
  ["uongozi", "UONGOZI"],
  ["michezo", "MICHEZO"],
  ["ushirikiano", "USHIRIKIANO"],
];

export const CONDUCT_GRADE_OPTIONS = ["A", "B", "C"];

export function normalizeConductGrade(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return CONDUCT_GRADE_OPTIONS.includes(normalized) ? normalized : "";
}

function getPreviousAverage(student, subjects = [], currentExam = "") {
  const examScores =
    student?.examScores && typeof student.examScores === "object" ? student.examScores : {};
  const examKeys = Object.keys(examScores).filter(
    (exam) => exam && exam !== currentExam && Array.isArray(examScores[exam])
  );
  if (!examKeys.length) return null;
  const previousExam = examKeys[examKeys.length - 1];
  const computed = computeStudent(
    {
      ...student,
      scores: examScores[previousExam],
    },
    subjects
  );
  return Number.isFinite(Number(computed?.avg)) ? Number(computed.avg) : null;
}

function getMissingScoreCount(student, subjectCount) {
  const grades = Array.isArray(student?.grades) ? student.grades : [];
  return Math.max(
    0,
    (subjectCount || grades.length) -
      grades.filter((grade) => grade?.raw === "ABS" || grade?.score !== null).length
  );
}

function computeConductSignals(student, subjects = [], classData = {}) {
  const subjectCount = Array.isArray(subjects) ? subjects.length : 0;
  const avg = Number(student?.avg);
  const missingCount = getMissingScoreCount(student, subjectCount);
  const remarks = String(student?.remarks || "").toLowerCase();
  const previousAvg = getPreviousAverage(student, subjects, classData?.school_info?.exam || "");
  const resultStatus = String(student?.resultStatus || "").toUpperCase();
  const isAbsent = resultStatus === "ABSENT";
  const isIncomplete = resultStatus === "INCOMPLETE";
  const trend =
    Number.isFinite(previousAvg) && Number.isFinite(avg) ? avg - previousAvg : null;

  return {
    avg,
    missingCount,
    remarks,
    previousAvg,
    resultStatus,
    isAbsent,
    isIncomplete,
    trend,
  };
}

function computeOverallConductScore(student, subjects = [], classData = {}) {
  const { avg, missingCount, remarks, previousAvg, resultStatus, trend } =
    computeConductSignals(student, subjects, classData);

  if (resultStatus === "ABSENT") {
    return { score: 20, hardGrade: "C", missingCount, previousAvg };
  }
  if (missingCount > 2) {
    return { score: 45, hardGrade: "C", missingCount, previousAvg };
  }

  let score = 100;

  if (resultStatus === "INCOMPLETE") score -= 25;
  score -= missingCount * 8;

  if (Number.isFinite(avg)) {
    if (avg < 40) score -= 15;
    else if (avg < 60) score -= 8;
  }

  if (Number.isFinite(previousAvg) && Number.isFinite(avg)) {
    if (trend <= -10) score -= 10;
    else if (trend <= -5) score -= 6;
    else if (trend >= 8) score += 4;
  }

  if (/(warning|concern|indiscipline|poor|late|misconduct|utoro|nidhamu|tatizo|absent)/i.test(remarks)) {
    score -= 10;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    hardGrade: "",
    missingCount,
    previousAvg,
  };
}

export function getSuggestedConductGrade(student, subjects = [], classData = {}) {
  const { score, hardGrade } = computeOverallConductScore(student, subjects, classData);
  if (hardGrade) return hardGrade;
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  return "C";
}

function shiftGrade(baseGrade, delta = 0) {
  const index = CONDUCT_GRADE_OPTIONS.indexOf(baseGrade);
  if (index < 0) return "B";
  return CONDUCT_GRADE_OPTIONS[Math.max(0, Math.min(CONDUCT_GRADE_OPTIONS.length - 1, index + delta))];
}

function hasKeyword(remarks, pattern) {
  return pattern.test(String(remarks || ""));
}

export function buildSuggestedConductProfile(student, subjects = [], classData = {}) {
  const baseGrade = getSuggestedConductGrade(student, subjects, classData);
  const {
    avg,
    missingCount,
    remarks,
    isAbsent,
    isIncomplete,
    trend,
  } = computeConductSignals(student, subjects, classData);

  const positiveLeadership = hasKeyword(remarks, /(leader|uongozi|responsible|example|prefect|role model)/i);
  const negativeDiscipline = hasKeyword(remarks, /(warning|indiscipline|misconduct|late|utoro|nidhamu|tatizo|absent)/i);
  const positiveCooperation = hasKeyword(remarks, /(cooperate|ushirikiano|team|helpful|respectful|obedient)/i);
  const positiveSports = hasKeyword(remarks, /(sports|michezo|game|athletic|football|netball|volley)/i);
  const negativeProperty = hasKeyword(remarks, /(property|mali|damage|careless|destructive)/i);

  const utendajiKazi =
    isAbsent || missingCount > 2
      ? "C"
      : Number.isFinite(avg) && avg >= 75
      ? shiftGrade(baseGrade, -1)
      : Number.isFinite(avg) && avg < 45
      ? shiftGrade(baseGrade, 1)
      : baseGrade;

  const nidhamNaUtii =
    isAbsent || negativeDiscipline
      ? "C"
      : isIncomplete
      ? shiftGrade(baseGrade, 1)
      : positiveCooperation
      ? shiftGrade(baseGrade, -1)
      : baseGrade;

  const utunzajiMali =
    negativeProperty
      ? "C"
      : negativeDiscipline
      ? shiftGrade(baseGrade, 1)
      : shiftGrade(baseGrade, -1);

  const uongozi =
    positiveLeadership
      ? "A"
      : Number.isFinite(avg) && avg >= 80 && !negativeDiscipline
      ? shiftGrade(baseGrade, -1)
      : Number.isFinite(trend) && trend <= -10
      ? shiftGrade(baseGrade, 1)
      : baseGrade;

  const michezo =
    positiveSports
      ? "A"
      : isAbsent
      ? shiftGrade(baseGrade, 1)
      : "B";

  const ushirikiano =
    negativeDiscipline
      ? shiftGrade(baseGrade, 1)
      : positiveCooperation
      ? "A"
      : isAbsent
      ? "C"
      : baseGrade;

  return {
    utendajiKazi: normalizeConductGrade(utendajiKazi) || "B",
    nidhamNaUtii: normalizeConductGrade(nidhamNaUtii) || "B",
    utunzajiMali: normalizeConductGrade(utunzajiMali) || "B",
    uongozi: normalizeConductGrade(uongozi) || "B",
    michezo: normalizeConductGrade(michezo) || "B",
    ushirikiano: normalizeConductGrade(ushirikiano) || "B",
  };
}

export function mergeConductWithSuggestion(student, subjects = [], classData = {}) {
  const suggested = buildSuggestedConductProfile(student, subjects, classData);
  const current = student?.conduct && typeof student.conduct === "object" ? student.conduct : {};
  return CONDUCT_FIELDS.reduce((acc, [key]) => {
    acc[key] = normalizeConductGrade(current[key]) || suggested[key];
    return acc;
  }, {});
}
