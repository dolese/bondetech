// ═══════════════════════════════════════════════════════════════════════════════
// BACKEND VALIDATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

const ALLOWED_FORMS = ["Form I", "Form II", "Form III", "Form IV"];

// Validate student data
function validateStudent(data) {
  const errors = {};

  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    errors.name = "Student name is required";
  } else if (data.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  if (data.indexNo !== undefined && data.indexNo !== null) {
    if (typeof data.indexNo !== "string") {
      errors.indexNo = "Index number must be text";
    }
  }

  if (!["M", "F"].includes(data.sex)) {
    errors.sex = "Sex must be M or F";
  }

  if (!["present", "absent", "incomplete"].includes(data.status)) {
    errors.status = "Status must be present, absent, or incomplete";
  }

  if (data.scores && Array.isArray(data.scores)) {
    data.scores.forEach((score, idx) => {
      if (score !== "" && score !== null) {
        if (typeof score === "string" && score.toUpperCase() === "ABS") {
          return;
        }
        const num = Number(score);
        if (isNaN(num) || num < 0 || num > 100) {
          errors[`score_${idx}`] = `Score ${idx} must be between 0 and 100`;
        }
      }
    });
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// Validate class data
function validateClass(data) {
  const errors = {};

  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    errors.name = "Class name is required";
  } else if (data.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  if (data.subjects && Array.isArray(data.subjects)) {
    const seen = new Set();
    data.subjects.forEach((s, idx) => {
      if (!s || typeof s !== "string" || !s.trim()) {
        errors[`subject_${idx}`] = "Subject cannot be empty";
      } else if (seen.has(s.toLowerCase())) {
        errors[`subject_${idx}`] = "Duplicate subject";
      }
      if (s) seen.add(s.toLowerCase());
    });
  }

  if (data.year !== undefined) {
    const yearStr = String(data.year).trim();
    if (!/^[0-9]{4}$/.test(yearStr)) {
      errors.year = "Year must be a 4-digit number";
    }
  }

  if (data.form !== undefined) {
    if (!data.form || typeof data.form !== "string" || !data.form.trim()) {
      errors.form = "Form is required";
    } else if (!ALLOWED_FORMS.includes(data.form.trim())) {
      errors.form = "Form must be one of: Form I, Form II, Form III, Form IV";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// Validate school info
function validateSchoolInfo(data) {
  const errors = {};
  const required = ["name", "authority", "region", "district", "form", "term", "exam", "year"];

  required.forEach(field => {
    if (!data[field] || typeof data[field] !== "string" || !data[field].trim()) {
      errors[field] = `${field} is required`;
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

// Express middleware to validate student POST/PUT
function validateStudentMiddleware(req, res, next) {
  const validation = validateStudent(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.errors,
    });
  }
  next();
}

// Express middleware to validate class POST/PUT
function validateClassMiddleware(req, res, next) {
  const validation = validateClass(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.errors,
    });
  }
  next();
}

// Express middleware to validate school info
function validateSchoolInfoMiddleware(req, res, next) {
  if (req.body.schoolInfo) {
    const validation = validateSchoolInfo(req.body.schoolInfo);
    if (!validation.valid) {
      return res.status(400).json({
        error: "School info validation failed",
        details: validation.errors,
      });
    }
  }
  next();
}

// Sanitize text inputs
function sanitizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim().substring(0, 1000); // Max 1000 chars
}

// Sanitize number (score)
function sanitizeScore(value) {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "string" && value.toUpperCase() === "ABS") return "ABS";
  const num = Number(value);
  if (isNaN(num)) return "";
  return Math.min(100, Math.max(0, num));
}

// Sanitize array of scores
function sanitizeScores(scores) {
  if (!Array.isArray(scores)) return [];
  return scores.map(sanitizeScore);
}

module.exports = {
  ALLOWED_FORMS,
  validateStudent,
  validateClass,
  validateSchoolInfo,
  validateStudentMiddleware,
  validateClassMiddleware,
  validateSchoolInfoMiddleware,
  sanitizeText,
  sanitizeScore,
  sanitizeScores,
};
