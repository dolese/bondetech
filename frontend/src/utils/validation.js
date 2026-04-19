// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULES & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export const validate = {
  // Student validation
  student: (data) => {
    const errors = {};
    
    if (!data.name?.trim()) {
      errors.name = "Student name is required";
    } else if (data.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    
    const indexVal = data.indexNo ?? data.index_no;
    if (indexVal !== undefined && indexVal !== null) {
      if (typeof indexVal !== "string") {
        errors.indexNo = "Candidate number must be text";
      }
    }

    if (!["M", "F"].includes(data.sex)) {
      errors.sex = "Sex must be M or F";
    }
    
    if (!["present", "absent", "incomplete"].includes(data.status)) {
      errors.status = "Invalid status";
    }
    
    if (data.scores && Array.isArray(data.scores)) {
      data.scores.forEach((score, idx) => {
        if (score !== "" && score !== null) {
          if (typeof score === "string" && score.toUpperCase() === "ABS") {
            return;
          }
          const num = Number(score);
          if (isNaN(num) || num < 0 || num > 100) {
            errors[`score_${idx}`] = "Score must be 0-100";
          }
        }
      });
    }
    
    return { valid: Object.keys(errors).length === 0, errors };
  },

  // Class validation
  class: (data) => {
    const errors = {};
    
    if (!data.name?.trim()) {
      errors.name = "Class name is required";
    } else if (data.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    
    if (data.subjects && Array.isArray(data.subjects)) {
      const seen = new Set();
      data.subjects.forEach((s, idx) => {
        if (!s.trim()) {
          errors[`subject_${idx}`] = "Subject cannot be empty";
        } else if (seen.has(s.toLowerCase())) {
          errors[`subject_${idx}`] = "Duplicate subject";
        }
        seen.add(s.toLowerCase());
      });
    }
    
    return { valid: Object.keys(errors).length === 0, errors };
  },

  // School info validation
  schoolInfo: (data) => {
    const errors = {};
    const required = ["name", "authority", "region", "district", "form", "term", "exam", "year"];
    
    required.forEach(field => {
      if (!data[field]?.trim()) {
        errors[field] = `${field} is required`;
      }
    });
    
    return { valid: Object.keys(errors).length === 0, errors };
  },

  // Score validation
  score: (value, min = 0, max = 100) => {
    if (value === "" || value === null || value === undefined) {
      return { valid: true };
    }
    
    const num = Number(value);
    
    if (isNaN(num)) {
      return { valid: false, error: "Must be a number" };
    }
    
    if (num < min || num > max) {
      return { valid: false, error: `Must be between ${min} and ${max}` };
    }
    
    return { valid: true };
  },
};

// Named exports for components that import validateStudent directly
export const validateStudent = (data) => validate.student(data);
export const validateClass = (data) => validate.class(data);
export const validateSchoolInfo = (data) => validate.schoolInfo(data);

// Sanitize inputs
export const sanitize = {
  text: (value) => {
    if (typeof value !== "string") return "";
    return value.trim();
  },

  number: (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  },

  score: (value) => {
    const num = Number(value);
    if (isNaN(num)) return "";
    return Math.min(100, Math.max(0, num));
  },
};

// Check if form has unsaved changes
export const hasChanges = (original, current) => {
  return JSON.stringify(original) !== JSON.stringify(current);
};
