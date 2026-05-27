"use strict";

const GRADE_POINTS = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  F: 5,
};

function getGrade(score) {
  if (score === "" || score === null || score === undefined) return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  if (n >= 75) return "A";
  if (n >= 60) return "B";
  if (n >= 45) return "C";
  if (n >= 30) return "D";
  return "F";
}

function getGradePoints(grade) {
  return GRADE_POINTS[grade] ?? 5;
}

function getDivision(points) {
  if (points <= 17) return "I";
  if (points <= 21) return "II";
  if (points <= 25) return "III";
  if (points <= 33) return "IV";
  return "0";
}

function resolveCompositeEntry(examType, compositeConfig = {}) {
  const defaults = {
    "Midterm + Terminal": { partnerExam: "Terminal Exam" },
    "Terminal + Annual": { partnerExam: "Annual Exam" },
    "Monthly Average": { partnerExam: "Monthly Exam 2" },
    "September + Annual": { partnerExam: "Annual Exam" },
  };
  if (!defaults[examType]) return null;
  return { ...defaults[examType], ...(compositeConfig?.[examType] || {}) };
}

function computeStudent(student, subjects = []) {
  const rawPartner = student.partnerScores;
  const grades = (student.scores || []).map((score, index) => {
    const raw = typeof score === "string" ? score.trim() : score;
    const isAbsent = typeof raw === "string" && raw.toUpperCase() === "ABS";
    const current = isAbsent || raw === "" || raw === null || raw === undefined ? null : Number(raw);
    const currentScore = Number.isFinite(current) ? current : null;

    let effectiveScore = currentScore;
    let partnerRaw;

    if (rawPartner !== undefined) {
      const partnerScoreRaw = rawPartner[index];
      const partnerTrimmed =
        typeof partnerScoreRaw === "string" ? partnerScoreRaw.trim() : partnerScoreRaw;
      const partnerAbsent =
        typeof partnerTrimmed === "string" && partnerTrimmed.toUpperCase() === "ABS";
      const partnerNumeric =
        partnerAbsent || partnerTrimmed === "" || partnerTrimmed === null || partnerTrimmed === undefined
          ? null
          : Number(partnerTrimmed);
      const partnerScore = Number.isFinite(partnerNumeric) ? partnerNumeric : null;
      partnerRaw = partnerAbsent ? "ABS" : partnerScore;

      if (currentScore !== null && partnerScore !== null) {
        effectiveScore = (currentScore + partnerScore) / 2;
      } else {
        effectiveScore = currentScore ?? partnerScore;
      }
    }

    return {
      subj: subjects[index] ?? `Subject ${index + 1}`,
      score: Number.isFinite(effectiveScore) ? effectiveScore : null,
      grade: getGrade(effectiveScore),
      raw: isAbsent ? "ABS" : currentScore,
      ...(rawPartner !== undefined ? { partnerRaw } : {}),
    };
  });

  const numeric = grades.filter((grade) => grade.score !== null);
  const subjectsDone = numeric.length;
  const resultStatus =
    subjectsDone === 0 ? "ABSENT" : subjectsDone < 7 ? "INCOMPLETE" : "COMPLETE";

  if (!subjectsDone) {
    return {
      ...student,
      grades,
      total: null,
      avg: null,
      agrd: null,
      div: null,
      points: null,
      posn: null,
      subjectsDone,
      resultStatus,
    };
  }

  const total = numeric.reduce((sum, grade) => sum + grade.score, 0);
  const avg = total / numeric.length;
  let pts = null;
  let div = null;

  if (resultStatus === "COMPLETE") {
    pts = [...numeric]
      .sort((left, right) => getGradePoints(left.grade) - getGradePoints(right.grade))
      .slice(0, 7)
      .reduce((sum, grade) => sum + getGradePoints(grade.grade), 0);
    div = getDivision(pts);
  }

  return {
    ...student,
    grades,
    total,
    avg: Number(avg.toFixed(1)),
    agrd: getGrade(avg),
    div,
    points: pts,
    posn: null,
    subjectsDone,
    resultStatus,
  };
}

function withPositions(students = [], subjects = []) {
  const computed = students.map((student) => computeStudent(student, subjects));
  const ranked = [...computed]
    .filter((student) => student.total !== null)
    .sort((left, right) => right.total - left.total);

  const positionMap = new Map(ranked.map((student, index) => [student.id, index + 1]));
  return computed.map((student) => ({
    ...student,
    posn: positionMap.get(student.id) ?? null,
  }));
}

function getSubjectStats(students = [], subjects = []) {
  return subjects.map((subject, subjectIndex) => {
    let total = 0;
    let count = 0;
    let passCount = 0;
    students.forEach((student) => {
      const score = student?.grades?.[subjectIndex]?.score;
      if (score === null || score === undefined || score === "") return;
      total += Number(score);
      count += 1;
      if (Number(score) >= 30) passCount += 1;
    });
    return {
      subject,
      average: count ? Number((total / count).toFixed(1)) : 0,
      entries: count,
      passRate: count ? Number(((passCount / count) * 100).toFixed(1)) : 0,
    };
  });
}

function buildComputedStudents(classData = {}, examType = "") {
  const selectedExam = String(examType || classData?.schoolInfo?.exam || classData?.school_info?.exam || "March Exam").trim();
  const compositeEntry = resolveCompositeEntry(selectedExam, classData?.composite_config || classData?.compositeConfig || {});
  const subjects = Array.isArray(classData.subjects) ? classData.subjects : [];
  const hydratedStudents = (classData.students || []).map((student) => {
    const examScores = student.examScores && typeof student.examScores === "object" ? student.examScores : {};
    const scores = Array.isArray(examScores[selectedExam]) ? examScores[selectedExam] : Array.isArray(student.scores) ? student.scores : [];
    if (compositeEntry) {
      const partnerScores = Array.isArray(examScores[compositeEntry.partnerExam]) ? examScores[compositeEntry.partnerExam] : [];
      return { ...student, scores, partnerScores };
    }
    return { ...student, scores };
  });
  return withPositions(hydratedStudents, subjects);
}

function summarizeClassPerformance(classData = {}, examType = "") {
  const computedStudents = buildComputedStudents(classData, examType);
  const completeStudents = computedStudents.filter((student) => student.resultStatus === "COMPLETE");
  const incompleteStudents = computedStudents.filter((student) => student.resultStatus === "INCOMPLETE");
  const absentStudents = computedStudents.filter((student) => student.resultStatus === "ABSENT");
  const failedStudents = completeStudents.filter((student) => student.div === "0");
  const passedStudents = completeStudents.filter((student) => student.div && student.div !== "0");
  const completeAverages = completeStudents.map((student) => student.avg).filter((value) => value !== null);
  const divisionCounts = { I: 0, II: 0, III: 0, IV: 0, "0": 0 };
  completeStudents.forEach((student) => {
    if (student.div && Object.prototype.hasOwnProperty.call(divisionCounts, student.div)) {
      divisionCounts[student.div] += 1;
    }
  });

  const topStudents = [...completeStudents]
    .sort((left, right) => (left.posn || 9999) - (right.posn || 9999))
    .slice(0, 10)
    .map((student) => ({
      name: student.name,
      admissionNo: student.admissionNo || "",
      indexNo: student.indexNo || "",
      average: student.avg,
      division: student.div,
      points: student.points,
      position: student.posn,
    }));

  return {
    classId: classData.id,
    className: classData.name || [classData.form, classData.stream, classData.year].filter(Boolean).join(" "),
    form: classData.form || "",
    stream: classData.stream || "",
    year: classData.year || "",
    examType: String(examType || classData?.schoolInfo?.exam || classData?.school_info?.exam || "March Exam").trim(),
    totalStudents: computedStudents.length,
    completeCount: completeStudents.length,
    incompleteCount: incompleteStudents.length,
    absentCount: absentStudents.length,
    passCount: passedStudents.length,
    failCount: failedStudents.length,
    classAverage: completeAverages.length
      ? Number((completeAverages.reduce((sum, value) => sum + value, 0) / completeAverages.length).toFixed(1))
      : null,
    divisionCounts,
    topStudents,
    failedStudents: failedStudents.slice(0, 20).map((student) => ({
      name: student.name,
      admissionNo: student.admissionNo || "",
      indexNo: student.indexNo || "",
      average: student.avg,
      points: student.points,
      position: student.posn,
    })),
    incompleteStudents: incompleteStudents.slice(0, 20).map((student) => ({
      name: student.name,
      admissionNo: student.admissionNo || "",
      indexNo: student.indexNo || "",
      subjectsDone: student.subjectsDone,
      status: student.resultStatus,
    })),
    subjectStats: getSubjectStats(computedStudents, classData.subjects || []),
  };
}

module.exports = {
  getGrade,
  getDivision,
  computeStudent,
  withPositions,
  buildComputedStudents,
  summarizeClassPerformance,
};
