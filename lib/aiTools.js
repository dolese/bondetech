"use strict";

const { listClasses, getClassWithStudents } = require("./classes");
const { getStudentProfileByIdentifier } = require("./studentDirectory");
const { canAccessClassRecord } = require("./auth");
const { summarizeClassPerformance } = require("./academicAnalytics");

function getClassLabel(classRecord = {}) {
  return (
    [classRecord.form, classRecord.stream, classRecord.year].filter(Boolean).join(" ").trim() ||
    classRecord.name ||
    "Class"
  );
}

async function getAccessibleClassSummaries(db, user) {
  const classes = await listClasses(db, { includeArchived: false });
  return user?.role === "teacher"
    ? classes.filter((classRecord) => canAccessClassRecord(user, classRecord))
    : classes;
}

async function getAccessibleClassById(db, user, classId) {
  const classRecord = await getClassWithStudents(db, classId);
  if (user?.role === "teacher" && !canAccessClassRecord(user, classRecord)) {
    throw new Error("You do not have permission to access that class");
  }
  return classRecord;
}

function normalizeProfileEntriesForUser(profile, user, accessibleClassIds) {
  if (!profile || user?.role !== "teacher") return profile;
  const allowedIds = new Set(accessibleClassIds || []);
  const entries = (profile.entries || []).filter((entry) => allowedIds.has(entry.classId));
  if (!entries.length) {
    throw new Error("You do not have permission to access that student");
  }
  return {
    ...profile,
    entries,
  };
}

async function listClassesTool(db, user) {
  const classes = await getAccessibleClassSummaries(db, user);
  return {
    classes: classes.map((classRecord) => ({
      id: classRecord.id,
      label: getClassLabel(classRecord),
      form: classRecord.form || "",
      stream: classRecord.stream || "",
      year: classRecord.year || "",
      studentCount: classRecord.studentCount || classRecord.student_count || 0,
    })),
  };
}

async function getClassSummaryTool(db, user, args = {}) {
  const classId = String(args.classId || "").trim();
  if (!classId) {
    throw new Error("classId is required");
  }
  const classRecord = await getAccessibleClassById(db, user, classId);
  const examType = String(args.examType || classRecord?.schoolInfo?.exam || "").trim();
  return summarizeClassPerformance(classRecord, examType);
}

async function searchStudentsTool(db, user, args = {}) {
  const query = String(args.query || "").trim().toLowerCase();
  if (!query) {
    throw new Error("query is required");
  }
  const classes = await getAccessibleClassSummaries(db, user);
  const matches = [];
  for (const classSummary of classes) {
    const classRecord = await getClassWithStudents(db, classSummary.id);
    (classRecord.students || []).forEach((student) => {
      const haystack = [
        student.name,
        student.indexNo,
        student.admissionNo,
        student.parentName,
        student.parentPhone,
        classRecord.form,
        classRecord.stream,
        classRecord.year,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return;
      matches.push({
        classId: classRecord.id,
        classLabel: getClassLabel(classRecord),
        name: student.name || "",
        admissionNo: student.admissionNo || "",
        indexNo: student.indexNo || "",
        sex: student.sex || "",
      });
    });
    if (matches.length >= 20) break;
  }
  return { results: matches.slice(0, 20) };
}

async function getStudentProfileTool(db, user, args = {}) {
  const profile = await getStudentProfileByIdentifier(db, {
    admissionNo: String(args.admissionNo || "").trim(),
    indexNo: String(args.indexNo || "").trim(),
  });
  const accessibleClasses = await getAccessibleClassSummaries(db, user);
  const accessibleClassIds = accessibleClasses.map((entry) => entry.id);
  return normalizeProfileEntriesForUser(profile, user, accessibleClassIds);
}

async function draftGuardianSmsTool(db, user, args = {}) {
  const identifiers = Array.isArray(args.students) ? args.students : [];
  const purpose = String(args.purpose || "").trim() || "school follow-up";
  const classes = await getAccessibleClassSummaries(db, user);
  const allowedIds = new Set(classes.map((entry) => entry.id));
  const recipients = [];

  for (const raw of identifiers) {
    const admissionNo = String(raw?.admissionNo || raw?.admission_no || "").trim().toUpperCase();
    const indexNo = String(raw?.indexNo || raw?.index_no || "").trim();
    if (!admissionNo && !indexNo) continue;
    const profile = await getStudentProfileByIdentifier(db, { admissionNo, indexNo });
    const eligibleEntries = (profile.entries || []).filter((entry) => allowedIds.has(entry.classId));
    if (!eligibleEntries.length) continue;
    const latest = eligibleEntries[eligibleEntries.length - 1];
    const classRecord = await getClassWithStudents(db, latest.classId);
    const exact = (classRecord.students || []).find(
      (student) =>
        (admissionNo && String(student.admissionNo || "").toUpperCase() === admissionNo) ||
        (indexNo && String(student.indexNo || "").trim() === indexNo)
    );
    recipients.push({
      name: profile.name || exact?.name || "Student",
      admissionNo: profile.admissionNo || admissionNo,
      indexNo: profile.indexNo || indexNo,
      guardianName: exact?.parentName || "Guardian",
      guardianPhone: exact?.parentPhone || "",
      classLabel: getClassLabel(classRecord),
    });
  }

  return {
    purpose,
    recipients,
    notes: recipients.length
      ? "Use these guardian details to draft a message. Do not claim it has been sent."
      : "No matching accessible students with guardian details were found.",
  };
}

function getAiToolDefinitions() {
  return [
    {
      type: "function",
      name: "list_classes",
      description: "List classes the current user is allowed to access.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "get_class_summary",
      description: "Get a read-only academic summary for one class and exam.",
      parameters: {
        type: "object",
        properties: {
          classId: { type: "string", description: "The class id to summarize." },
          examType: { type: "string", description: "Optional exam type. If omitted, use the class's active exam." },
        },
        required: ["classId"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "search_students",
      description: "Search accessible students by name, admission number, CNO, parent, or class keywords.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search phrase." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "get_student_profile",
      description: "Get one student's academic profile. Prefer admission number whenever available.",
      parameters: {
        type: "object",
        properties: {
          admissionNo: { type: "string", description: "Admission number, preferred when available." },
          indexNo: { type: "string", description: "CNO/index number, used as fallback." },
        },
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "draft_guardian_sms_context",
      description: "Return guardian/contact context for drafting an SMS. This does not send any message.",
      parameters: {
        type: "object",
        properties: {
          purpose: { type: "string", description: "Reason for the message, for example failed results or attendance follow-up." },
          students: {
            type: "array",
            items: {
              type: "object",
              properties: {
                admissionNo: { type: "string" },
                indexNo: { type: "string" },
              },
              additionalProperties: false,
            },
          },
        },
        required: ["students"],
        additionalProperties: false,
      },
    },
  ];
}

async function executeAiTool(db, user, call) {
  const args = call?.arguments ? JSON.parse(call.arguments) : {};
  switch (call.name) {
    case "list_classes":
      return listClassesTool(db, user);
    case "get_class_summary":
      return getClassSummaryTool(db, user, args);
    case "search_students":
      return searchStudentsTool(db, user, args);
    case "get_student_profile":
      return getStudentProfileTool(db, user, args);
    case "draft_guardian_sms_context":
      return draftGuardianSmsTool(db, user, args);
    default:
      throw new Error(`Unsupported AI tool: ${call.name}`);
  }
}

module.exports = {
  getAiToolDefinitions,
  executeAiTool,
  getAccessibleClassSummaries,
};
