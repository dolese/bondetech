import {
  getGrade,
  getGradePoints,
  getDivision,
  getGradeDescription,
  computeStudent,
  withPositions,
  getSubjectStats,
  getDivisionStats,
  getPassRates,
} from "../grading";

// ─── getGrade ────────────────────────────────────────────────────────────────

describe("getGrade", () => {
  it("returns A for score >= 75", () => {
    expect(getGrade(75)).toBe("A");
    expect(getGrade(100)).toBe("A");
    expect(getGrade(90)).toBe("A");
  });

  it("returns B for score 60–74", () => {
    expect(getGrade(60)).toBe("B");
    expect(getGrade(74)).toBe("B");
  });

  it("returns C for score 45–59", () => {
    expect(getGrade(45)).toBe("C");
    expect(getGrade(59)).toBe("C");
  });

  it("returns D for score 30–44", () => {
    expect(getGrade(30)).toBe("D");
    expect(getGrade(44)).toBe("D");
  });

  it("returns F for score < 30", () => {
    expect(getGrade(0)).toBe("F");
    expect(getGrade(29)).toBe("F");
  });

  it("returns null for empty / null / undefined", () => {
    expect(getGrade("")).toBeNull();
    expect(getGrade(null)).toBeNull();
    expect(getGrade(undefined)).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(getGrade("ABS")).toBeNull();
    expect(getGrade("abc")).toBeNull();
  });

  it("handles numeric strings", () => {
    expect(getGrade("80")).toBe("A");
    expect(getGrade("29")).toBe("F");
  });
});

// ─── getGradePoints ──────────────────────────────────────────────────────────

describe("getGradePoints", () => {
  it("returns correct points for each grade", () => {
    expect(getGradePoints("A")).toBe(1);
    expect(getGradePoints("B")).toBe(2);
    expect(getGradePoints("C")).toBe(3);
    expect(getGradePoints("D")).toBe(4);
    expect(getGradePoints("F")).toBe(5);
  });

  it("returns 5 for unknown grade", () => {
    expect(getGradePoints("X")).toBe(5);
    expect(getGradePoints(null)).toBe(5);
    expect(getGradePoints(undefined)).toBe(5);
  });
});

// ─── getDivision ─────────────────────────────────────────────────────────────

describe("getDivision", () => {
  it("returns Division I for points <= 17", () => {
    expect(getDivision(7)).toBe("I");
    expect(getDivision(17)).toBe("I");
  });

  it("returns Division II for points 18–21", () => {
    expect(getDivision(18)).toBe("II");
    expect(getDivision(21)).toBe("II");
  });

  it("returns Division III for points 22–25", () => {
    expect(getDivision(22)).toBe("III");
    expect(getDivision(25)).toBe("III");
  });

  it("returns Division IV for points 26–33", () => {
    expect(getDivision(26)).toBe("IV");
    expect(getDivision(33)).toBe("IV");
  });

  it("returns Division 0 for points > 33", () => {
    expect(getDivision(34)).toBe("0");
    expect(getDivision(35)).toBe("0");
  });
});

// ─── getGradeDescription ─────────────────────────────────────────────────────

describe("getGradeDescription", () => {
  it("returns correct descriptions", () => {
    expect(getGradeDescription("A")).toBe("Excellent");
    expect(getGradeDescription("B")).toBe("Very Good");
    expect(getGradeDescription("C")).toBe("Average");
    expect(getGradeDescription("D")).toBe("Below Average");
    expect(getGradeDescription("F")).toBe("Fail");
  });

  it("returns empty string for unknown grade", () => {
    expect(getGradeDescription("X")).toBe("");
    expect(getGradeDescription(null)).toBe("");
  });
});

// ─── computeStudent ──────────────────────────────────────────────────────────

const SUBJECTS_7 = ["CIV", "HIST", "GEO", "KISW", "ENG", "BIOS", "MATH"];
const SUBJECTS_11 = ["CIV", "HTZ", "HIST", "GEO", "KISW", "ENG", "BIOS", "B/MATH", "CHEM", "PHYS", "BS"];

const mkStudent = (scores, overrides = {}) => ({
  id: "s1",
  name: "Test Student",
  sex: "M",
  status: "present",
  scores,
  ...overrides,
});

describe("computeStudent", () => {
  it("handles absent student (no scores)", () => {
    const result = computeStudent(mkStudent([]), SUBJECTS_7);
    expect(result.total).toBeNull();
    expect(result.avg).toBeNull();
    expect(result.div).toBeNull();
    expect(result.resultStatus).toBe("ABSENT");
  });

  it("handles all ABS scores", () => {
    const result = computeStudent(mkStudent(["ABS", "ABS", "ABS", "ABS", "ABS", "ABS", "ABS"]), SUBJECTS_7);
    expect(result.total).toBeNull();
    expect(result.resultStatus).toBe("ABSENT");
  });

  it("handles incomplete student (< 7 numeric scores)", () => {
    const result = computeStudent(mkStudent([80, 70, "", "", "", "", ""]), SUBJECTS_7);
    expect(result.resultStatus).toBe("INCOMPLETE");
    expect(result.total).toBe(150);
    expect(result.div).toBeNull();
    expect(result.points).toBeNull();
  });

  it("computes complete student with exactly 7 subjects", () => {
    // 7 As (80 each) → points = 7×1 = 7 → Div I
    const scores = [80, 80, 80, 80, 80, 80, 80];
    const result = computeStudent(mkStudent(scores), SUBJECTS_7);
    expect(result.resultStatus).toBe("COMPLETE");
    expect(result.total).toBe(560);
    expect(result.avg).toBe(80);
    expect(result.agrd).toBe("A");
    expect(result.div).toBe("I");
    expect(result.points).toBe(7);
  });

  it("uses best 7 subjects when more than 7", () => {
    // 11 subjects: first 7 = 80 (A=1pt each), last 4 = 10 (F=5pts)
    // Best 7 = first 7, points = 7
    const scores = [80, 80, 80, 80, 80, 80, 80, 10, 10, 10, 10];
    const result = computeStudent(mkStudent(scores), SUBJECTS_11);
    expect(result.points).toBe(7);
    expect(result.div).toBe("I");
  });

  it("handles mixed ABS and numeric scores", () => {
    // 6 numeric + 1 ABS → incomplete
    const scores = [80, 70, 60, 50, 40, 30, "ABS"];
    const result = computeStudent(mkStudent(scores), SUBJECTS_7);
    expect(result.resultStatus).toBe("INCOMPLETE");
    expect(result.total).toBe(330);
  });

  it("attaches grade details to each subject", () => {
    const scores = [80];
    const result = computeStudent(mkStudent(scores), ["MATH"]);
    expect(result.grades[0].grade).toBe("A");
    expect(result.grades[0].score).toBe(80);
  });

  it("posn is null (set by withPositions)", () => {
    const result = computeStudent(mkStudent([80, 80, 80, 80, 80, 80, 80]), SUBJECTS_7);
    expect(result.posn).toBeNull();
  });
});

// ─── withPositions ───────────────────────────────────────────────────────────

describe("withPositions", () => {
  it("assigns correct rank order", () => {
    const students = [
      mkStudent([50, 50, 50, 50, 50, 50, 50], { id: "s1" }),
      mkStudent([80, 80, 80, 80, 80, 80, 80], { id: "s2" }),
      mkStudent([60, 60, 60, 60, 60, 60, 60], { id: "s3" }),
    ];
    const result = withPositions(students, SUBJECTS_7);
    const byId = Object.fromEntries(result.map(s => [s.id, s]));
    expect(byId["s2"].posn).toBe(1);
    expect(byId["s3"].posn).toBe(2);
    expect(byId["s1"].posn).toBe(3);
  });

  it("students with no total get posn null", () => {
    const students = [
      mkStudent([], { id: "s1" }),
      mkStudent([80, 80, 80, 80, 80, 80, 80], { id: "s2" }),
    ];
    const result = withPositions(students, SUBJECTS_7);
    const byId = Object.fromEntries(result.map(s => [s.id, s]));
    expect(byId["s1"].posn).toBeNull();
    expect(byId["s2"].posn).toBe(1);
  });

  it("handles ties (same total → same position)", () => {
    const scores = [80, 80, 80, 80, 80, 80, 80];
    const students = [
      mkStudent(scores, { id: "s1" }),
      mkStudent(scores, { id: "s2" }),
    ];
    const result = withPositions(students, SUBJECTS_7);
    // Both get the same posn value (1 and 2 based on sort stability)
    expect(result.every(s => s.posn !== null)).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(withPositions([], SUBJECTS_7)).toEqual([]);
  });
});

// ─── getSubjectStats ─────────────────────────────────────────────────────────

describe("getSubjectStats", () => {
  it("computes grade distribution and average per subject", () => {
    const subjects = ["MATH", "ENG"];
    const computedStudents = [
      { grades: [{ score: 80, grade: "A" }, { score: 60, grade: "B" }] },
      { grades: [{ score: 75, grade: "A" }, { score: 45, grade: "C" }] },
    ];
    const stats = getSubjectStats(computedStudents, subjects);
    expect(stats["MATH"].grades.A).toBe(2);
    expect(stats["MATH"].count).toBe(2);
    expect(stats["MATH"].avg).toBe(77.5);
    expect(stats["ENG"].grades.B).toBe(1);
    expect(stats["ENG"].grades.C).toBe(1);
  });

  it("returns zero avg and count for subjects with no scores", () => {
    const stats = getSubjectStats([], ["MATH"]);
    expect(stats["MATH"].avg).toBe(0);
    expect(stats["MATH"].count).toBe(0);
  });
});

// ─── getDivisionStats ────────────────────────────────────────────────────────

describe("getDivisionStats", () => {
  it("counts each division", () => {
    const students = [
      { div: "I" },
      { div: "I" },
      { div: "II" },
      { div: "0" },
      { div: null },
    ];
    const stats = getDivisionStats(students);
    expect(stats["I"]).toBe(2);
    expect(stats["II"]).toBe(1);
    expect(stats["0"]).toBe(1);
    expect(stats["III"]).toBe(0);
  });
});

// ─── getPassRates ────────────────────────────────────────────────────────────

describe("getPassRates", () => {
  it("returns pass/fail counts and rate", () => {
    const students = [
      { total: 400, div: "I" },
      { total: 350, div: "II" },
      { total: 200, div: "0" },
      { total: null, div: null },
    ];
    const { passCount, failCount, passRate } = getPassRates(students);
    expect(passCount).toBe(2);
    expect(failCount).toBe(1);
    expect(passRate).toBe(67);
  });

  it("returns zeros when no complete students", () => {
    const { passCount, failCount, passRate } = getPassRates([{ total: null, div: null }]);
    expect(passCount).toBe(0);
    expect(failCount).toBe(0);
    expect(passRate).toBe(0);
  });
});
