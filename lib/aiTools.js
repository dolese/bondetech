"use strict";

const { listClasses, getClassWithStudents } = require("./classes");
const { getStudentProfileByIdentifier } = require("./studentDirectory");
const { canAccessClassRecord } = require("./auth");
const { summarizeClassPerformance, buildComputedStudents } = require("./academicAnalytics");

function getClassLabel(classRecord = {}) {
  return (
    [classRecord.form, classRecord.stream, classRecord.year].filter(Boolean).join(" ").trim() ||
    classRecord.name ||
    "Class"
  );
}

function normalizeClassKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function getAccessibleClassSummaries(db, user) {
  const classes = await listClasses(db, { includeArchived: false });
  return user?.role === "teacher"
    ? classes.filter((classRecord) => canAccessClassRecord(user, classRecord))
    : classes;
}

async function resolveAccessibleClass(db, user, rawClassRef) {
  const classRef = String(rawClassRef || "").trim();
  if (!classRef) {
    throw new Error("classId is required");
  }

  const accessibleClasses = await getAccessibleClassSummaries(db, user);
  const directMatch = accessibleClasses.find((entry) => String(entry.id || "").trim() === classRef);
  if (directMatch) {
    return getClassWithStudents(db, directMatch.id);
  }

  const normalizedRef = normalizeClassKey(classRef);
  const labelMatch = accessibleClasses.find((entry) => {
    const candidates = [
      entry.name,
      getClassLabel(entry),
      [entry.form, entry.year].filter(Boolean).join(" ").trim(),
      [entry.form, entry.stream].filter(Boolean).join(" ").trim(),
    ];
    return candidates.some((candidate) => normalizeClassKey(candidate) === normalizedRef);
  });

  if (labelMatch) {
    return getClassWithStudents(db, labelMatch.id);
  }

  throw new Error(`I cannot find a class with the ID "${classRef}". Please double-check the class ID and try again.`);
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
  const classRef = String(args.classId || args.classLabel || "").trim();
  const classRecord = await resolveAccessibleClass(db, user, classRef);
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

function normalizeTone(value) {
  const tone = String(value || "").trim().toLowerCase();
  return tone === "urgent" || tone === "formal" || tone === "concise" ? tone : "formal";
}

function listExamTypes(classRecord = {}) {
  const exams = new Set();
  const defaultExam = String(classRecord?.schoolInfo?.exam || classRecord?.school_info?.exam || "").trim();
  if (defaultExam) exams.add(defaultExam);
  (classRecord.students || []).forEach((student) => {
    const examScores = student?.examScores && typeof student.examScores === "object" ? student.examScores : {};
    Object.keys(examScores).forEach((exam) => {
      const clean = String(exam || "").trim();
      if (clean) exams.add(clean);
    });
  });
  return [...exams];
}

function getPreviousExam(classRecord, currentExam, preferredPrevious) {
  const normalizedCurrent = String(currentExam || "").trim();
  const normalizedPreferred = String(preferredPrevious || "").trim();
  if (normalizedPreferred && normalizedPreferred !== normalizedCurrent) {
    return normalizedPreferred;
  }
  const exams = listExamTypes(classRecord).filter((exam) => exam !== normalizedCurrent);
  return exams[0] || "";
}

function buildToneMessage({ tone = "formal", guardianName = "Parent/Guardian", studentName = "student", classLabel = "the class", purpose = "academic follow-up" }) {
  if (tone === "urgent") {
    return `Bonde Secondary School: Urgent attention needed for ${studentName} (${classLabel}) regarding ${purpose}. Dear ${guardianName}, please contact the school office today.`;
  }
  if (tone === "concise") {
    return `Bonde Secondary School: Dear ${guardianName}, please contact the school about ${studentName} (${classLabel}) regarding ${purpose}.`;
  }
  return `Bonde Secondary School: Dear ${guardianName}, this is a formal follow-up regarding ${studentName} (${classLabel}) for ${purpose}. Kindly contact the school office at your earliest convenience.`;
}

async function compareClassTrendsTool(db, user, args = {}) {
  const classRef = String(args.classId || args.classLabel || "").trim();
  const classRecord = await resolveAccessibleClass(db, user, classRef);
  const currentExam = String(args.currentExam || args.examType || classRecord?.schoolInfo?.exam || classRecord?.school_info?.exam || "").trim();
  const previousExam = getPreviousExam(classRecord, currentExam, args.previousExam);
  if (!currentExam || !previousExam) {
    throw new Error("Both currentExam and previousExam are required to compare trends.");
  }
  const current = summarizeClassPerformance(classRecord, currentExam);
  const previous = summarizeClassPerformance(classRecord, previousExam);
  const currentPassRate = current.completeCount ? Number(((current.passCount / current.completeCount) * 100).toFixed(1)) : 0;
  const previousPassRate = previous.completeCount ? Number(((previous.passCount / previous.completeCount) * 100).toFixed(1)) : 0;
  return {
    classId: classRecord.id,
    classLabel: getClassLabel(classRecord),
    currentExam,
    previousExam,
    comparisons: {
      classAverageDelta: Number(((current.classAverage || 0) - (previous.classAverage || 0)).toFixed(1)),
      passRateDelta: Number((currentPassRate - previousPassRate).toFixed(1)),
      failCountDelta: Number(current.failCount || 0) - Number(previous.failCount || 0),
      incompleteDelta: Number(current.incompleteCount || 0) - Number(previous.incompleteCount || 0),
    },
    current,
    previous,
  };
}

async function getAtRiskStudentsTool(db, user, args = {}) {
  const classRef = String(args.classId || args.classLabel || "").trim();
  const classRecord = await resolveAccessibleClass(db, user, classRef);
  const examType = String(args.examType || classRecord?.schoolInfo?.exam || classRecord?.school_info?.exam || "").trim();
  if (!examType) {
    throw new Error("examType is required");
  }
  const previousExam = getPreviousExam(classRecord, examType, args.previousExam);
  const currentStudents = buildComputedStudents(classRecord, examType);
  const previousStudents = previousExam ? buildComputedStudents(classRecord, previousExam) : [];
  const previousById = new Map(previousStudents.map((student) => [student.id, student]));
  const byKey = new Map(
    (classRecord.students || []).map((student) => [
      `${String(student.admissionNo || "").toUpperCase()}::${String(student.indexNo || "").trim()}`,
      student,
    ])
  );
  const limit = Math.max(1, Math.min(Number(args.limit || 30), 100));

  const risks = currentStudents
    .map((student) => {
      let riskScore = 0;
      const reasons = [];
      if (student.resultStatus === "INCOMPLETE") {
        riskScore += 4;
        reasons.push("Incomplete results");
      } else if (student.resultStatus === "ABSENT") {
        riskScore += 5;
        reasons.push("Absent in selected exam");
      }
      if (student.div === "0") {
        riskScore += 5;
        reasons.push("Division 0");
      }
      if (typeof student.avg === "number" && student.avg < 45) {
        riskScore += 3;
        reasons.push(`Low average (${student.avg})`);
      }
      const previous = previousById.get(student.id);
      if (previous && typeof previous.avg === "number" && typeof student.avg === "number") {
        const drop = Number((student.avg - previous.avg).toFixed(1));
        if (drop <= -8) {
          riskScore += 3;
          reasons.push(`Average dropped by ${Math.abs(drop)} points vs ${previousExam}`);
        }
      }
      if (riskScore === 0) return null;
      const key = `${String(student.admissionNo || "").toUpperCase()}::${String(student.indexNo || "").trim()}`;
      const roster = byKey.get(key) || {};
      return {
        name: student.name || "",
        admissionNo: student.admissionNo || "",
        indexNo: student.indexNo || "",
        average: student.avg,
        division: student.div || "",
        status: student.resultStatus,
        riskScore,
        reasons,
        guardianName: roster.parentName || "",
        guardianPhone: roster.parentPhone || "",
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.riskScore - left.riskScore)
    .slice(0, limit);

  return {
    classId: classRecord.id,
    classLabel: getClassLabel(classRecord),
    examType,
    previousExam,
    totalAtRisk: risks.length,
    students: risks,
  };
}

async function buildGuardianContactQueueTool(db, user, args = {}) {
  const classRef = String(args.classId || args.classLabel || "").trim();
  const classRecord = await resolveAccessibleClass(db, user, classRef);
  const examType = String(args.examType || classRecord?.schoolInfo?.exam || classRecord?.school_info?.exam || "").trim();
  const purpose = String(args.purpose || "").trim() || `academic follow-up for ${examType || "current exam"}`;
  const tone = normalizeTone(args.tone);
  const limit = Math.max(1, Math.min(Number(args.limit || 30), 100));
  const summary = summarizeClassPerformance(classRecord, examType);
  const atRisk = await getAtRiskStudentsTool(db, user, {
    classId: classRecord.id,
    examType,
    previousExam: args.previousExam,
    limit,
  });
  const queue = atRisk.students
    .filter((student) => String(student.guardianPhone || "").trim())
    .slice(0, limit)
    .map((student, index) => ({
      key: `guardian-${index + 1}`,
      recipientName: student.guardianName || "Parent/Guardian",
      recipientPhone: student.guardianPhone,
      studentName: student.name,
      admissionNo: student.admissionNo,
      indexNo: student.indexNo,
      classLabel: getClassLabel(classRecord),
      reasons: student.reasons,
      message: buildToneMessage({
        tone,
        guardianName: student.guardianName || "Parent/Guardian",
        studentName: student.name || "student",
        classLabel: getClassLabel(classRecord),
        purpose,
      }),
    }));

  return {
    classId: classRecord.id,
    classLabel: getClassLabel(classRecord),
    examType,
    tone,
    purpose,
    notes:
      "This queue is draft-only and requires explicit user approval before sending SMS.",
    summary: {
      totalStudents: summary.totalStudents,
      failCount: summary.failCount,
      incompleteCount: summary.incompleteCount,
      atRiskCount: atRisk.totalAtRisk,
      queuedContacts: queue.length,
    },
    queue,
  };
}

function getAiToolDefinitions(options = {}) {
  const actionMode = options?.actionMode === true;
  const tools = [
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
      description: "Get a read-only academic summary for one class and exam. You may pass either the internal class id or a human class label like Form IV 2026.",
      parameters: {
        type: "object",
        properties: {
          classId: { type: "string", description: "The internal class id to summarize." },
          classLabel: { type: "string", description: "Optional class label such as Form IV 2026." },
          examType: { type: "string", description: "Optional exam type. If omitted, use the class's active exam." },
        },
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
    {
      type: "function",
      name: "get_at_risk_students",
      description: "Identify at-risk students in a class using low average, division 0, incomplete results, absence, and optional trend drop.",
      parameters: {
        type: "object",
        properties: {
          classId: { type: "string", description: "Internal class id." },
          classLabel: { type: "string", description: "Optional class label such as Form IV 2026." },
          examType: { type: "string", description: "Exam type to analyze." },
          previousExam: { type: "string", description: "Optional previous exam for trend comparison." },
          limit: { type: "number", description: "Max rows to return (1-100)." },
        },
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "compare_class_trends",
      description: "Compare class performance trends between a current exam and previous exam.",
      parameters: {
        type: "object",
        properties: {
          classId: { type: "string", description: "Internal class id." },
          classLabel: { type: "string", description: "Optional class label such as Form IV 2026." },
          currentExam: { type: "string", description: "Current exam name." },
          previousExam: { type: "string", description: "Previous exam name." },
          examType: { type: "string", description: "Fallback alias for current exam." },
        },
        additionalProperties: false,
      },
    },
  ];
  if (actionMode) {
    tools.push({
      type: "function",
      name: "build_guardian_contact_queue",
      description: "Build a guardian SMS queue from at-risk students. This prepares drafts only and never sends messages.",
      parameters: {
        type: "object",
        properties: {
          classId: { type: "string", description: "Internal class id." },
          classLabel: { type: "string", description: "Optional class label such as Form IV 2026." },
          examType: { type: "string", description: "Exam context." },
          previousExam: { type: "string", description: "Optional previous exam for trend checks." },
          purpose: { type: "string", description: "Short reason for contacting guardians." },
          tone: { type: "string", description: "formal, concise, or urgent." },
          limit: { type: "number", description: "Max queued contacts." },
        },
        additionalProperties: false,
      },
    });
  }
  return tools;
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
    case "get_at_risk_students":
      return getAtRiskStudentsTool(db, user, args);
    case "compare_class_trends":
      return compareClassTrendsTool(db, user, args);
    case "build_guardian_contact_queue":
      return buildGuardianContactQueueTool(db, user, args);
    default:
      throw new Error(`Unsupported AI tool: ${call.name}`);
  }
}

module.exports = {
  getAiToolDefinitions,
  executeAiTool,
  getAccessibleClassSummaries,
};
