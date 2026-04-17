import { validate, validateStudent, validateClass, validateSchoolInfo, sanitize, hasChanges } from "../validation";

// ─── validate.student ────────────────────────────────────────────────────────

describe("validate.student", () => {
  const valid = {
    name: "Alice Mwangi",
    sex: "F",
    status: "present",
    scores: [80, 70, 60],
  };

  it("accepts valid student data", () => {
    const { valid: ok, errors } = validate.student(valid);
    expect(ok).toBe(true);
    expect(errors).toEqual({});
  });

  it("rejects missing name", () => {
    const { valid: ok, errors } = validate.student({ ...valid, name: "" });
    expect(ok).toBe(false);
    expect(errors.name).toBeDefined();
  });

  it("rejects name shorter than 2 characters", () => {
    const { valid: ok, errors } = validate.student({ ...valid, name: "A" });
    expect(ok).toBe(false);
    expect(errors.name).toBeDefined();
  });

  it("rejects invalid sex", () => {
    const { valid: ok, errors } = validate.student({ ...valid, sex: "X" });
    expect(ok).toBe(false);
    expect(errors.sex).toBeDefined();
  });

  it("accepts M and F as valid sex values", () => {
    expect(validate.student({ ...valid, sex: "M" }).valid).toBe(true);
    expect(validate.student({ ...valid, sex: "F" }).valid).toBe(true);
  });

  it("rejects invalid status", () => {
    const { valid: ok, errors } = validate.student({ ...valid, status: "unknown" });
    expect(ok).toBe(false);
    expect(errors.status).toBeDefined();
  });

  it("accepts all valid status values", () => {
    for (const s of ["present", "absent", "incomplete"]) {
      expect(validate.student({ ...valid, status: s }).valid).toBe(true);
    }
  });

  it("rejects score > 100", () => {
    const { valid: ok, errors } = validate.student({ ...valid, scores: [101] });
    expect(ok).toBe(false);
    expect(errors["score_0"]).toBeDefined();
  });

  it("rejects score < 0", () => {
    const { valid: ok, errors } = validate.student({ ...valid, scores: [-1] });
    expect(ok).toBe(false);
    expect(errors["score_0"]).toBeDefined();
  });

  it("accepts score at boundaries 0 and 100", () => {
    expect(validate.student({ ...valid, scores: [0, 100] }).valid).toBe(true);
  });

  it("accepts ABS string as a valid score", () => {
    expect(validate.student({ ...valid, scores: ["ABS"] }).valid).toBe(true);
    expect(validate.student({ ...valid, scores: ["abs"] }).valid).toBe(true);
  });

  it("accepts empty / null scores without error", () => {
    expect(validate.student({ ...valid, scores: ["", null] }).valid).toBe(true);
  });

  it("rejects non-numeric, non-ABS score string", () => {
    const { valid: ok, errors } = validate.student({ ...valid, scores: ["abc"] });
    expect(ok).toBe(false);
    expect(errors["score_0"]).toBeDefined();
  });

  it("rejects non-string indexNo", () => {
    const { valid: ok, errors } = validate.student({ ...valid, indexNo: 123 });
    expect(ok).toBe(false);
    expect(errors.indexNo).toBeDefined();
  });

  it("accepts string indexNo", () => {
    expect(validate.student({ ...valid, indexNo: "S001" }).valid).toBe(true);
  });

  it("rejects non-string stream", () => {
    const { valid: ok, errors } = validate.student({ ...valid, stream: 42 });
    expect(ok).toBe(false);
    expect(errors.stream).toBeDefined();
  });
});

// ─── validate.class ──────────────────────────────────────────────────────────

describe("validate.class", () => {
  const valid = { name: "Form II 2025", subjects: ["MATH", "ENG"] };

  it("accepts valid class data", () => {
    expect(validate.class(valid).valid).toBe(true);
  });

  it("rejects missing class name", () => {
    const { valid: ok, errors } = validate.class({ ...valid, name: "" });
    expect(ok).toBe(false);
    expect(errors.name).toBeDefined();
  });

  it("rejects class name shorter than 2 characters", () => {
    const { valid: ok, errors } = validate.class({ ...valid, name: "A" });
    expect(ok).toBe(false);
    expect(errors.name).toBeDefined();
  });

  it("rejects empty subject names", () => {
    const { valid: ok, errors } = validate.class({ ...valid, subjects: ["MATH", ""] });
    expect(ok).toBe(false);
    expect(errors["subject_1"]).toBeDefined();
  });

  it("rejects duplicate subjects (case-insensitive)", () => {
    const { valid: ok, errors } = validate.class({ ...valid, subjects: ["math", "MATH"] });
    expect(ok).toBe(false);
    expect(errors["subject_1"]).toBeDefined();
  });

  it("accepts no subjects array", () => {
    expect(validate.class({ name: "Form I 2026" }).valid).toBe(true);
  });
});

// ─── validate.schoolInfo ─────────────────────────────────────────────────────

describe("validate.schoolInfo", () => {
  const valid = {
    name: "Bonde Sec",
    authority: "PMO",
    region: "Tanga",
    district: "Muheza",
    form: "Form I",
    term: "I",
    exam: "March Exam",
    year: "2026",
  };

  it("accepts valid school info", () => {
    expect(validate.schoolInfo(valid).valid).toBe(true);
  });

  it("rejects missing required fields", () => {
    for (const field of ["name", "authority", "region", "district", "form", "term", "exam", "year"]) {
      const data = { ...valid, [field]: "" };
      const { valid: ok, errors } = validate.schoolInfo(data);
      expect(ok).toBe(false);
      expect(errors[field]).toBeDefined();
    }
  });
});

// ─── validate.score ──────────────────────────────────────────────────────────

describe("validate.score", () => {
  it("accepts valid numeric scores", () => {
    expect(validate.score(0).valid).toBe(true);
    expect(validate.score(50).valid).toBe(true);
    expect(validate.score(100).valid).toBe(true);
  });

  it("accepts empty / null / undefined as valid (not required)", () => {
    expect(validate.score("").valid).toBe(true);
    expect(validate.score(null).valid).toBe(true);
    expect(validate.score(undefined).valid).toBe(true);
  });

  it("rejects NaN", () => {
    expect(validate.score("abc").valid).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(validate.score(-1).valid).toBe(false);
    expect(validate.score(101).valid).toBe(false);
  });

  it("respects custom min and max", () => {
    expect(validate.score(5, 10, 50).valid).toBe(false);
    expect(validate.score(10, 10, 50).valid).toBe(true);
    expect(validate.score(50, 10, 50).valid).toBe(true);
    expect(validate.score(51, 10, 50).valid).toBe(false);
  });
});

// ─── Named exports ───────────────────────────────────────────────────────────

describe("named export aliases", () => {
  it("validateStudent is the same as validate.student", () => {
    const data = { name: "Bob", sex: "M", status: "present" };
    expect(validateStudent(data)).toEqual(validate.student(data));
  });

  it("validateClass is the same as validate.class", () => {
    const data = { name: "Form I" };
    expect(validateClass(data)).toEqual(validate.class(data));
  });

  it("validateSchoolInfo is the same as validate.schoolInfo", () => {
    const data = {
      name: "X", authority: "Y", region: "Z", district: "D",
      form: "F", term: "T", exam: "E", year: "2026",
    };
    expect(validateSchoolInfo(data)).toEqual(validate.schoolInfo(data));
  });
});

// ─── sanitize ────────────────────────────────────────────────────────────────

describe("sanitize.text", () => {
  it("trims whitespace", () => {
    expect(sanitize.text("  hello  ")).toBe("hello");
  });

  it("returns empty string for non-string input", () => {
    expect(sanitize.text(123)).toBe("");
    expect(sanitize.text(null)).toBe("");
    expect(sanitize.text(undefined)).toBe("");
  });
});

describe("sanitize.number", () => {
  it("converts numeric string", () => {
    expect(sanitize.number("42")).toBe(42);
  });

  it("returns 0 for NaN input", () => {
    expect(sanitize.number("abc")).toBe(0);
    expect(sanitize.number(null)).toBe(0);
  });
});

describe("sanitize.score", () => {
  it("clamps to [0, 100]", () => {
    expect(sanitize.score(120)).toBe(100);
    expect(sanitize.score(-5)).toBe(0);
    expect(sanitize.score(50)).toBe(50);
  });

  it("returns empty string for NaN", () => {
    expect(sanitize.score("abc")).toBe("");
  });
});

// ─── hasChanges ──────────────────────────────────────────────────────────────

describe("hasChanges", () => {
  it("returns false for identical objects", () => {
    const obj = { a: 1, b: "hello" };
    expect(hasChanges(obj, { ...obj })).toBe(false);
  });

  it("returns true when values differ", () => {
    expect(hasChanges({ a: 1 }, { a: 2 })).toBe(true);
  });

  it("returns true when a key is added", () => {
    expect(hasChanges({ a: 1 }, { a: 1, b: 2 })).toBe(true);
  });
});
