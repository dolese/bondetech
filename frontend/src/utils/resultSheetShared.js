import { DEFAULT_SCHOOL } from "./constants";

export const RESULT_SHEET_PAGE_MM = {
  width: 420,
  height: 297,
};

export const RESULT_SHEET_LAYOUT = {
  pagePaddingPx: 18,
  pageGapPx: 14,
};

const DIVISION_ORDER = ["I", "II", "III", "IV", "0"];

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function averageOf(values) {
  if (!values.length) return "0.0";
  return (values.reduce((sum, value) => sum + toNumber(value), 0) / values.length).toFixed(1);
}

function summarizeSex(students, status) {
  const male = students.filter((student) => student.sex === "M");
  const female = students.filter((student) => student.sex === "F");
  const filterStatus = (group) => (status ? group.filter((student) => student.resultStatus === status) : group);
  return {
    male: filterStatus(male),
    female: filterStatus(female),
  };
}

export function buildResultSheetModel(classData, computed) {
  const subjects = classData.subjects ?? [];
  const students = (computed ?? [])
    .filter((student) => student.total !== null)
    .sort((a, b) => (a.posn ?? Infinity) - (b.posn ?? Infinity));
  const schoolInfo = { ...DEFAULT_SCHOOL, ...(classData.school_info ?? {}) };
  const classLabel = classData.form ?? schoolInfo.form ?? classData.name ?? "";
  const hasRemarks = students.some((student) => student.remarks && student.remarks.trim());

  const completeStudents = students.filter((student) => student.resultStatus === "COMPLETE");
  const incompleteStudents = students.filter((student) => student.resultStatus === "INCOMPLETE");
  const absentStudents = students.filter((student) => student.resultStatus === "ABSENT");

  const divisionCount = { I: 0, II: 0, III: 0, IV: 0, "0": 0 };
  completeStudents.forEach((student) => {
    if (student.div && divisionCount[student.div] !== undefined) {
      divisionCount[student.div] += 1;
    }
  });

  const allGrades = ["A", "B", "C", "D", "F"];
  const gradeCount = {};
  allGrades.forEach((grade) => {
    gradeCount[grade] = completeStudents.filter((student) => student.agrd === grade).length;
  });

  const completeAverages = completeStudents.map((student) => student.avg).filter((value) => value !== null && value !== undefined);
  const completeAverage = averageOf(completeAverages);
  const passCount = completeStudents.filter((student) => student.div && student.div !== "0").length;
  const failCount = completeStudents.filter((student) => student.div === "0").length;

  const totalSex = summarizeSex(students);
  const completeSex = summarizeSex(students, "COMPLETE");
  const incompleteSex = summarizeSex(students, "INCOMPLETE");
  const absentSex = summarizeSex(students, "ABSENT");

  const sexSummary = {
    total: {
      male: totalSex.male.length,
      female: totalSex.female.length,
    },
    complete: {
      male: completeSex.male.length,
      female: completeSex.female.length,
    },
    incomplete: {
      male: incompleteSex.male.length,
      female: incompleteSex.female.length,
    },
    absent: {
      male: absentSex.male.length,
      female: absentSex.female.length,
    },
    average: {
      male: averageOf(completeSex.male.map((student) => student.avg).filter((value) => value !== null && value !== undefined)),
      female: averageOf(completeSex.female.map((student) => student.avg).filter((value) => value !== null && value !== undefined)),
    },
    pass: {
      male: completeSex.male.filter((student) => student.div && student.div !== "0").length,
      female: completeSex.female.filter((student) => student.div && student.div !== "0").length,
    },
    fail: {
      male: completeSex.male.filter((student) => student.div === "0").length,
      female: completeSex.female.filter((student) => student.div === "0").length,
    },
  };

  return {
    className: classData.name,
    classLabel,
    classData,
    computed,
    subjects,
    students,
    schoolInfo,
    hasRemarks,
    gradeCount,
    divisionCount,
    passCount,
    failCount,
    completeAverage,
    allGrades,
    completeStudents,
    incompleteStudents,
    absentStudents,
    meta: {
      year: schoolInfo.year || "",
      term: schoolInfo.term || "",
      exam: schoolInfo.exam || schoolInfo.term || "",
      classLabel,
    },
    summaryRows: [
      ["Total Students", students.length],
      ["Complete Results (>=7 Subjects)", completeStudents.length],
      ["Incomplete Results (1-6 Subjects)", incompleteStudents.length],
      ["Absent (No Subject)", absentStudents.length],
      ["Class Average (Complete Only)", completeAverage],
      ["Pass Count (Division I-IV)", passCount],
      ["Fail Count (Division 0)", failCount],
    ],
    divisionRows: DIVISION_ORDER.map((division) => [`Division ${division === "0" ? "0 (Fail)" : `${division}:`}`, divisionCount[division] || 0]),
    sexSummary,
  };
}

export function getResultSheetHead(model) {
  return [
    [
      "Rank",
      "Adm No",
      "Student Name",
      "Sex",
      ...model.subjects,
      "TOTAL",
      "AVERAGE",
      "POINTS",
      "DIVISION",
      "STATUS",
      ...(model.hasRemarks ? ["REMARKS"] : []),
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
    student.points ?? "-",
    student.div ?? "-",
    student.resultStatus ?? "-",
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
  return model.divisionRows.map(([label, value]) => [label.replace(":", ""), value]);
}
