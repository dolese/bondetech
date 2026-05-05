import { DEFAULT_SCHOOL } from "./constants";

export const RESULT_SHEET_PAGE_MM = {
  width: 420,
  height: 297,
};

export const RESULT_SHEET_LAYOUT = {
  pagePaddingPx: 18,
  pageGapPx: 14,
};

export function buildResultSheetModel(classData, computed) {
  const subjects = classData.subjects ?? [];
  const students = (computed ?? [])
    .filter((student) => student.total !== null)
    .sort((a, b) => (a.posn ?? Infinity) - (b.posn ?? Infinity));
  const schoolInfo = classData.school_info ?? DEFAULT_SCHOOL;
  const hasRemarks = students.some((student) => student.remarks && student.remarks.trim());

  const divisionCount = {};
  students.forEach((student) => {
    if (student.div) {
      divisionCount[student.div] = (divisionCount[student.div] || 0) + 1;
    }
  });

  const allGrades = ["A", "B", "C", "D", "F"];
  const gradeCount = {};
  allGrades.forEach((grade) => {
    gradeCount[grade] = students.filter((student) => student.agrd === grade).length;
  });

  const complete = students.filter((student) => student.div);
  const passCount = complete.filter((student) => student.div !== "0").length;
  const passRate = complete.length > 0 ? Math.round((passCount / complete.length) * 100) : 0;
  const averageScore = students.length
    ? (students.reduce((sum, student) => sum + (student.total || 0), 0) / students.length).toFixed(1)
    : "0";

  return {
    className: classData.name,
    classData,
    computed,
    subjects,
    students,
    schoolInfo,
    hasRemarks,
    gradeCount,
    divisionCount,
    passCount,
    passRate,
    averageScore,
    allGrades,
    summaryCards: [
      ["Students", students.length],
      ["Passed", passCount],
      ["Pass Rate", `${passRate}%`],
      ["Div I", divisionCount["I"] || 0],
      ["Avg Score", averageScore],
    ],
  };
}

export function getResultSheetHead(model) {
  return [
    [
      "Pos",
      "CNO",
      "Name",
      "Sex",
      ...model.subjects,
      "Total",
      "Avg",
      "Grade",
      "Division",
      "Points",
      ...(model.hasRemarks ? ["Remarks"] : []),
    ],
  ];
}

export function getResultSheetBody(model, students = model.students) {
  return students.map((student) => [
    student.posn ?? "-",
    student.index_no ?? "",
    student.name ?? "",
    student.sex ?? "",
    ...model.subjects.map((_, index) => {
      const grade = student.grades?.[index];
      return grade?.raw === "ABS" ? "ABS" : (grade?.score ?? "-");
    }),
    student.total ?? "-",
    student.avg ?? "-",
    student.agrd ?? "-",
    student.div ?? "-",
    student.points ?? "-",
    ...(model.hasRemarks ? [student.remarks ? student.remarks.trim() : ""] : []),
  ]);
}

export function getResultSheetDateLabel() {
  return new Date().toLocaleDateString();
}

export function buildGradeTable(model) {
  return model.allGrades.map((grade) => [grade, model.gradeCount[grade] || 0]);
}

export function buildDivisionTable(model) {
  return ["I", "II", "III", "IV", "0"].map((division) => [`Div ${division}`, model.divisionCount[division] || 0]);
}
