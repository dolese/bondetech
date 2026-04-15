// ═══════════════════════════════════════════════════════════════════════════════
// GRADING LOGIC & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

import { GRADE_POINTS } from "./constants";

// Convert raw score to grade letter
export const getGrade = (score) => {
  if (score === "" || score === null || score === undefined) {
    return null;
  }
  
  const n = Number(score);
  if (isNaN(n)) {
    return null;
  }
  
  if (n >= 75) return "A";
  if (n >= 60) return "B";
  if (n >= 45) return "C";
  if (n >= 30) return "D";
  return "F";
};

// Get grade points
export const getGradePoints = (grade) => {
  return GRADE_POINTS[grade] ?? 5;
};

// Get division from total points
export const getDivision = (points) => {
  if (points <= 17) return "I";
  if (points <= 21) return "II";
  if (points <= 25) return "III";
  if (points <= 33) return "IV";
  return "0";
};

// Get grade description
export const getGradeDescription = (grade) => {
  const descriptions = {
    A: "Excellent",
    B: "Very Good",
    C: "Average",
    D: "Below Average",
    F: "Fail",
  };
  return descriptions[grade] || "";
};

// Compute student performance
export const computeStudent = (student, subjects = []) => {
  const grades = (student.scores || []).map((sc, i) => {
    const raw = typeof sc === "string" ? sc.trim() : sc;
    const isAbsent = typeof raw === "string" && raw.toUpperCase() === "ABS";
    const score = isAbsent || raw === "" || raw === null || raw === undefined ? null : Number(raw);
    return {
      subj: subjects[i] ?? `Subject ${i + 1}`,
      score: Number.isFinite(score) ? score : null,
      grade: getGrade(score),
      raw: isAbsent ? "ABS" : score,
    };
  });

  const numeric = grades.filter(g => g.score !== null);
  const subjectsDone = numeric.length;

  let resultStatus = "ABSENT";
  if (subjectsDone === 0) {
    resultStatus = "ABSENT";
  } else if (subjectsDone < 7) {
    resultStatus = "INCOMPLETE";
  } else {
    resultStatus = "COMPLETE";
  }

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

  const total = numeric.reduce((a, g) => a + g.score, 0);
  const avg = total / numeric.length;
  const agrd = getGrade(avg);

  let pts = null;
  let div = null;
  if (resultStatus === "COMPLETE") {
    pts = [...numeric]
      .sort((a, b) => getGradePoints(a.grade) - getGradePoints(b.grade))
      .slice(0, 7)
      .reduce((a, g) => a + getGradePoints(g.grade), 0);
    div = getDivision(pts);
  }

  return {
    ...student,
    grades,
    total,
    avg: Number(avg.toFixed(1)),
    agrd,
    div,
    points: pts,
    posn: null, // Will be set by ranking function
    subjectsDone,
    resultStatus,
  };
};

// Rank students and assign positions
export const withPositions = (students = [], subjects = []) => {
  const raw = students.map(s => computeStudent(s, subjects));
  
  const ranked = [...raw]
    .filter(s => s.total !== null)
    .sort((a, b) => b.total - a.total);

  const positionMap = {};
  ranked.forEach((s, i) => {
    positionMap[s.id] = i + 1;
  });

  return raw.map(s => ({
    ...s,
    posn: positionMap[s.id] ?? null,
  }));
};

// Get subject statistics
export const getSubjectStats = (students, subjects) => {
  const stats = {};

  subjects.forEach((subject, si) => {
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let total = 0;
    let count = 0;

    students.forEach(s => {
      const score = s.grades?.[si]?.score;
      if (score !== null && score !== undefined && score !== "") {
        const grade = getGrade(score);
        if (grade) {
          grades[grade]++;
        }
        total += score;
        count++;
      }
    });

    stats[subject] = {
      grades,
      avg: count > 0 ? Number((total / count).toFixed(1)) : 0,
      count,
    };
  });

  return stats;
};

// Get division distribution
export const getDivisionStats = (students) => {
  const stats = { I: 0, II: 0, III: 0, IV: 0, "0": 0 };
  
  students.forEach(s => {
    if (s.div) {
      stats[s.div]++;
    }
  });
  
  return stats;
};

// Get pass/fail rates
export const getPassRates = (students) => {
  const present = students.filter(s => s.status === "present" && s.total !== null);
  
  if (present.length === 0) {
    return { passCount: 0, failCount: 0, passRate: 0 };
  }

  const passCount = present.filter(s => s.div !== "0").length;
  const failCount = present.length - passCount;
  const passRate = Math.round((passCount / present.length) * 100);

  return { passCount, failCount, passRate };
};
