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

function computeConductScore(student, subjects = [], classData = {}) {
  const subjectCount = Array.isArray(subjects) ? subjects.length : 0;
  const avg = Number(student?.avg);
  const missingCount = getMissingScoreCount(student, subjectCount);
  const remarks = String(student?.remarks || "").toLowerCase();
  const previousAvg = getPreviousAverage(student, subjects, classData?.school_info?.exam || "");

  if (student?.resultStatus === "ABSENT") {
    return { score: 20, hardGrade: "C", missingCount, previousAvg };
  }
  if (missingCount > 2) {
    return { score: 45, hardGrade: "C", missingCount, previousAvg };
  }

  let score = 100;

  if (student?.resultStatus === "INCOMPLETE") score -= 25;
  score -= missingCount * 8;

  if (Number.isFinite(avg)) {
    if (avg < 40) score -= 15;
    else if (avg < 60) score -= 8;
  }

  if (Number.isFinite(previousAvg) && Number.isFinite(avg)) {
    const trend = avg - previousAvg;
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
  const { score, hardGrade } = computeConductScore(student, subjects, classData);
  if (hardGrade) return hardGrade;
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  return "C";
}

export function buildSuggestedConductProfile(student, subjects = [], classData = {}) {
  const grade = getSuggestedConductGrade(student, subjects, classData);
  return Object.fromEntries(CONDUCT_FIELDS.map(([key]) => [key, grade]));
}

export function mergeConductWithSuggestion(student, subjects = [], classData = {}) {
  const suggested = buildSuggestedConductProfile(student, subjects, classData);
  const current = student?.conduct && typeof student.conduct === "object" ? student.conduct : {};
  return CONDUCT_FIELDS.reduce((acc, [key]) => {
    acc[key] = normalizeConductGrade(current[key]) || suggested[key];
    return acc;
  }, {});
}
