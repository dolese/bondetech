import { useEffect, useMemo, useState } from "react";
import { API } from "../api";
import { EXAM_TYPES, DEFAULT_EXAM_TYPE, getCompositeEntry } from "../utils/constants";
import { withPositions } from "../utils/grading";
import {
  fieldStyle,
  glassPanelStyle,
  pillStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  softCardStyle,
} from "../utils/designSystem";

const MESSAGE_TEMPLATES = [
  {
    key: "meeting",
    label: "Parent meeting",
    message:
      "Bonde Secondary School: Dear parent/guardian, you are requested to attend a school meeting on [DATE] at [TIME]. Thank you.",
  },
  {
    key: "exam",
    label: "Exam notice",
    message:
      "Bonde Secondary School: Dear parent/guardian, [STUDENT] will sit for [EXAM] starting on [DATE]. Please ensure preparation and punctual attendance.",
  },
  {
    key: "attendance",
    label: "Attendance follow-up",
    message:
      "Bonde Secondary School: Dear parent/guardian, [STUDENT] needs attendance follow-up. Please contact the school office as soon as possible.",
  },
  {
    key: "results",
    label: "Results ready",
    message:
      "Bonde Secondary School: Dear parent/guardian, the latest class results are ready on the portal. Please log in or contact the school for guidance.",
  },
];

const SUBJECT_LABELS = {
  CIV: "Civ",
  HTZ: "Htz",
  HIST: "Hist",
  GEO: "Geo",
  KISW: "Kisw",
  ENG: "Eng",
  BIOS: "Bio",
  "B/MATH": "B/Math",
  CHEM: "Chem",
  PHYS: "Phy",
  BS: "BS",
};

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function uniqueRecipientKey(entry) {
  return `${entry.phone}|${entry.studentId || entry.classId || entry.classLabel}`;
}

function formatNumber(value, decimals = 1) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return Number.isInteger(number) ? String(number) : number.toFixed(decimals);
}

function formatFormShort(form = "", stream = "") {
  const roman = String(form || "").replace(/^Form\s*/i, "").trim();
  const base = roman ? `F${roman}` : "Class";
  return stream ? `${base} ${stream}` : base;
}

function abbreviateSubject(subject = "") {
  return SUBJECT_LABELS[String(subject || "").trim().toUpperCase()] || String(subject || "").trim();
}

function buildRecipientDirectory(classes = []) {
  return (classes || []).flatMap((cls) =>
    (cls.students || [])
      .map((student) => {
        const phone = normalizePhone(student.parentPhone || student.parent_phone || "");
        if (!phone) return null;
        return {
          id: `${cls.id}-${student.id}`,
          phone,
          parentName: String(student.parentName || student.parent_name || "").trim() || "Guardian",
          studentName: String(student.name || "").trim() || "Student",
          studentId: student.id,
          indexNo: String(student.index_no || student.indexNo || "").trim(),
          classId: cls.id,
          classLabel: [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim(),
          form: cls.form || "",
          stream: cls.stream || "",
          year: cls.year || "",
        };
      })
      .filter(Boolean)
  );
}

function exportRecipientsCsv(recipients, includeMessage = false) {
  const header = ["Phone", "Guardian", "Student", "Class"];
  if (includeMessage) header.push("Message");
  const lines = [
    header.join(","),
    ...recipients.map((entry) =>
      [
        entry.phone,
        `"${String(entry.parentName || "").replace(/"/g, '""')}"`,
        `"${String(entry.studentName || "").replace(/"/g, '""')}"`,
        `"${String(entry.classLabel || "").replace(/"/g, '""')}"`,
        ...(includeMessage ? [`"${String(entry.message || "").replace(/"/g, '""')}"`] : []),
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = includeMessage ? "bonde-results-sms.csv" : "bonde-sms-recipients.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function copyText(value) {
  if (!value) return Promise.resolve(false);
  return navigator.clipboard?.writeText(value).then(() => true).catch(() => false);
}

function formatHistoryTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildExamOptionsForClass(cls = {}) {
  const values = new Set();
  values.add(String(cls?.school_info?.exam || "").trim() || DEFAULT_EXAM_TYPE);
  (cls?.monthly_exams || []).forEach((entry) => values.add(String(entry || "").trim()));
  (cls?.students || []).forEach((student) => {
    Object.keys(student?.examScores || {}).forEach((exam) => {
      const value = String(exam || "").trim();
      if (value) values.add(value);
    });
  });
  return Array.from(values)
    .filter(Boolean)
    .map((value) => ({
      value,
      label: EXAM_TYPES.find((entry) => entry.value === value)?.label || value,
    }));
}

function buildComputedStudentsForExam(cls = {}, examType) {
  const subjects = cls.subjects || [];
  const compositeEntry = getCompositeEntry(examType, cls.composite_config || {});
  const students = (cls.students || []).map((student) => {
    const examScores = student.examScores || {};
    const scores = Array.isArray(examScores[examType]) ? examScores[examType] : [];
    if (compositeEntry) {
      const partnerScores = Array.isArray(examScores[compositeEntry.partnerExam])
        ? examScores[compositeEntry.partnerExam]
        : [];
      return { ...student, scores, partnerScores };
    }
    return { ...student, scores };
  });
  return withPositions(students, subjects);
}

function buildResultsMessage(student, cls, language = "en") {
  const schoolName = "BONDE SEC SCHOOL";
  const classShort = formatFormShort(cls.form, cls.stream);
  const grades = Array.isArray(student.grades) ? student.grades : [];
  const subjectChunks = [];

  for (let index = 0; index < grades.length; index += 3) {
    const segment = grades
      .slice(index, index + 3)
      .map((grade) => {
        const subjectLabel = abbreviateSubject(grade?.subj);
        const scoreLabel = grade?.raw === "ABS" ? "ABS" : formatNumber(grade?.score);
        const gradeLabel = grade?.grade || "";
        return `${subjectLabel} ${scoreLabel}${gradeLabel ? ` ${gradeLabel}` : ""}`;
      })
      .join(", ");
    if (segment) subjectChunks.push(segment);
  }

  const divisionValue =
    student.resultStatus === "ABSENT"
      ? "ABS"
      : student.resultStatus === "INCOMPLETE"
      ? "INC"
      : student.div
      ? `Div ${student.div}`
      : "INC";

  const totalStudents = Math.max((cls.students || []).length, 1);
  if (language === "sw") {
    return [
      schoolName,
      `${student.name || "Mwanafunzi"} - ${classShort}`,
      ...subjectChunks,
      `Wastani ${formatNumber(student.avg)} | ${divisionValue} | Pointi ${student.points ?? "-"} | Nafasi ${student.posn ?? "-"} / ${totalStudents}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    schoolName,
    `${student.name || "Student"} - ${classShort}`,
    ...subjectChunks,
    `Avg ${formatNumber(student.avg)} | ${divisionValue} | Points ${student.points ?? "-"} | Position ${student.posn ?? "-"} / ${totalStudents}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function SmsPage({ classes = [], showToast, initialDraft = null, onDraftApplied }) {
  const [mode, setMode] = useState("custom");
  const [scope, setScope] = useState("all");
  const [year, setYear] = useState("all");
  const [form, setForm] = useState("all");
  const [classId, setClassId] = useState("all");
  const [resultsExam, setResultsExam] = useState(DEFAULT_EXAM_TYPE);
  const [resultsLanguage, setResultsLanguage] = useState("en");
  const [senderId, setSenderId] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [message, setMessage] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [gatewayStatus, setGatewayStatus] = useState({ configured: false, loading: true });
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let cancelled = false;
    API.getSmsGatewayStatus({ limit: 12 })
      .then((status) => {
        if (cancelled) return;
        setGatewayStatus({ ...status, loading: false });
        setHistory(Array.isArray(status?.history) ? status.history : []);
        if (status?.senderId) {
          setSenderId((current) => current || status.senderId);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setGatewayStatus({ configured: false, loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialDraft) return;
    setMode(initialDraft.mode || "custom");
    setScope("manual");
    setManualNumbers(initialDraft.phone || "");
    setMessage(
      initialDraft.message ||
        `Bonde Secondary School: Dear ${initialDraft.parentName || "parent/guardian"}, please contact the school regarding ${initialDraft.studentName || "the student"}.`
    );
    onDraftApplied?.();
  }, [initialDraft, onDraftApplied]);

  const allRecipients = useMemo(() => buildRecipientDirectory(classes), [classes]);
  const years = useMemo(
    () =>
      Array.from(new Set(classes.map((cls) => String(cls.year || "")).filter(Boolean))).sort(
        (a, b) => Number(b) - Number(a)
      ),
    [classes]
  );
  const forms = useMemo(
    () => Array.from(new Set(classes.map((cls) => String(cls.form || "")).filter(Boolean))),
    [classes]
  );

  const classOptions = useMemo(
    () =>
      classes
        .filter(
          (cls) =>
            (year === "all" || String(cls.year) === year) && (form === "all" || cls.form === form)
        )
        .map((cls) => ({
          id: cls.id,
          label: [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim() || cls.name || "Class",
        })),
    [classes, form, year]
  );

  const filteredRecipients = useMemo(() => {
    let entries = allRecipients;
    if (scope === "year" && year !== "all") {
      entries = entries.filter((entry) => String(entry.year) === year);
    }
    if (scope === "form" && form !== "all") {
      entries = entries.filter((entry) => entry.form === form);
    }
    if (scope === "class" && classId !== "all") {
      entries = entries.filter((entry) => entry.classId === classId);
    }
    return Array.from(new Map(entries.map((entry) => [uniqueRecipientKey(entry), entry])).values());
  }, [allRecipients, classId, form, scope, year]);

  const manualRecipientList = useMemo(
    () =>
      Array.from(
        new Set(
          manualNumbers
            .split(/[\s,;\n]+/)
            .map(normalizePhone)
            .filter(Boolean)
        )
      ),
    [manualNumbers]
  );

  const customRecipients =
    scope === "manual"
      ? manualRecipientList.map((phone, index) => ({
          id: `manual-${index}`,
          phone,
          parentName: "Manual recipient",
          studentName: "",
          classLabel: "Manual list",
        }))
      : filteredRecipients;

  const selectedResultsClass = useMemo(
    () => classes.find((cls) => cls.id === classId) || classOptions[0] && classes.find((cls) => cls.id === classOptions[0].id) || null,
    [classId, classOptions, classes]
  );

  useEffect(() => {
    if (mode !== "results") return;
    if (classId !== "all") return;
    if (classOptions[0]?.id) {
      setClassId(classOptions[0].id);
    }
  }, [classId, classOptions, mode]);

  const resultsExamOptions = useMemo(
    () => (selectedResultsClass ? buildExamOptionsForClass(selectedResultsClass) : []),
    [selectedResultsClass]
  );

  useEffect(() => {
    if (mode !== "results") return;
    if (!resultsExamOptions.length) {
      setResultsExam(DEFAULT_EXAM_TYPE);
      return;
    }
    if (!resultsExamOptions.some((entry) => entry.value === resultsExam)) {
      setResultsExam(resultsExamOptions[0].value);
    }
  }, [mode, resultsExam, resultsExamOptions]);

  const resultsRecipients = useMemo(() => {
    if (!selectedResultsClass) return [];
    const computed = buildComputedStudentsForExam(selectedResultsClass, resultsExam);
    return computed
      .map((student) => {
        const phone = normalizePhone(student.parentPhone || student.parent_phone || "");
        if (!phone) return null;
        return {
          id: `${selectedResultsClass.id}-${student.id}`,
          phone,
          parentName: String(student.parentName || student.parent_name || "").trim() || "Guardian",
          studentName: String(student.name || "").trim() || "Student",
          classLabel: [selectedResultsClass.form, selectedResultsClass.stream, selectedResultsClass.year]
            .filter(Boolean)
            .join(" ")
            .trim(),
          student,
          message: buildResultsMessage(student, selectedResultsClass, resultsLanguage),
        };
      })
      .filter(Boolean);
  }, [resultsExam, resultsLanguage, selectedResultsClass]);

  const recipients = mode === "results" ? resultsRecipients : customRecipients;
  const uniquePhones = Array.from(new Set(recipients.map((entry) => entry.phone)));
  const previewMessage = mode === "results" ? resultsRecipients[0]?.message || "" : message;
  const charCount = previewMessage.length;
  const smsSegments = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  const stats = [
    { label: "Recipients", value: recipients.length },
    { label: "Unique numbers", value: uniquePhones.length },
    { label: mode === "results" ? "Preview chars" : "Characters", value: charCount },
    { label: "SMS segments", value: smsSegments },
  ];

  const handleTemplateSelect = (template) => {
    setMode("custom");
    setMessage(template.message);
  };

  const handleCopyMessage = async () => {
    const ok = await copyText(previewMessage);
    showToast?.(ok ? "SMS message copied" : "Unable to copy SMS message", ok ? "success" : "error");
  };

  const handleCopyNumbers = async () => {
    const ok = await copyText(uniquePhones.join(", "));
    showToast?.(ok ? "Recipient numbers copied" : "Unable to copy recipient numbers", ok ? "success" : "error");
  };

  const handleSendSms = async () => {
    if (!gatewayStatus.configured) {
      showToast?.("Beem Africa SMS credentials are not configured", "error");
      return;
    }
    if (!recipients.length) {
      showToast?.("No valid recipients found for this SMS scope", "error");
      return;
    }
    if (mode === "custom" && !message.trim()) {
      showToast?.("Type the SMS message first", "error");
      return;
    }

    setIsSending(true);
    setSendResult(null);
    try {
      const payload =
        mode === "results"
          ? {
              senderId,
              scheduleTime,
              meta: {
                mode: "results",
                scope: "class",
                year: selectedResultsClass?.year || "",
                form: selectedResultsClass?.form || "",
                classId: selectedResultsClass?.id || "",
                classLabel:
                  [selectedResultsClass?.form, selectedResultsClass?.stream, selectedResultsClass?.year]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || "",
                exam: resultsExam,
                language: resultsLanguage,
                messagePreview: resultsRecipients[0]?.message || "",
              },
              jobs: resultsRecipients.map((entry, index) => ({
                key: entry.id || `result-${index + 1}`,
                recipientName: entry.studentName,
                recipientPhone: entry.phone,
                recipientIndexNo: entry.student?.index_no || entry.student?.indexNo || "",
                recipientParentName: entry.parentName,
                classLabel: entry.classLabel,
                message: entry.message,
                recipients: [{
                  id: entry.id || `recipient-${index + 1}`,
                  phone: entry.phone,
                  indexNo: entry.student?.index_no || entry.student?.indexNo || "",
                  studentName: entry.studentName,
                  parentName: entry.parentName,
                  classLabel: entry.classLabel,
                }],
              })),
            }
          : {
              message,
              senderId,
              scheduleTime,
              meta: {
                mode: "custom",
                scope,
                year: year !== "all" ? year : "",
                form: form !== "all" ? form : "",
                classId: classId !== "all" ? classId : "",
                classLabel: classOptions.find((entry) => entry.id === classId)?.label || "",
                messagePreview: message,
              },
              recipients: recipients.map((entry, index) => ({
                id: entry.id || `recipient-${index + 1}`,
                phone: entry.phone,
                indexNo: entry.indexNo || "",
                studentName: entry.studentName || "",
                parentName: entry.parentName || "",
                classLabel: entry.classLabel || "",
              })),
            };

      const result = await API.sendSms(payload);
      setSendResult(result);
      try {
        const refreshed = await API.getSmsHistory({ limit: 12 });
        setHistory(Array.isArray(refreshed?.history) ? refreshed.history : []);
      } catch {
        // keep latest summary even if history refresh fails
      }
      showToast?.(
        mode === "results"
          ? `Results SMS submitted for ${result.jobCount ?? recipients.length} student${(result.jobCount ?? recipients.length) === 1 ? "" : "s"}`
          : `SMS submitted to ${result.valid ?? result.totalRequested ?? recipients.length} recipient${(result.valid ?? result.totalRequested ?? recipients.length) === 1 ? "" : "s"}`,
        "success"
      );
    } catch (err) {
      showToast?.(err.message || "Unable to send SMS right now", "error");
    } finally {
      setIsSending(false);
    }
  };

  const scopeDescription =
    mode === "results"
      ? "Generate personalized report-result SMS automatically from saved student marks, grades, division, points, and position."
      : {
          all: "Send one shared message to all guardian numbers available in the visible classes.",
          year: "Target all guardians in one academic year.",
          form: "Target all guardians in one form across streams.",
          class: "Target one specific class.",
          manual: "Paste external numbers manually when they are not already stored in the system.",
        }[scope];

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 14,
        display: "grid",
        gap: 16,
        background: "linear-gradient(180deg, #f7fafc 0%, #edf4fb 100%)",
      }}
    >
      <div style={{ ...glassPanelStyle({ padding: 18, radius: 24 }), display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...pillStyle({ tone: "blue" }), display: "inline-flex" }}>Communication</div>
            <div style={{ marginTop: 10, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>SMS Center</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", maxWidth: 760, lineHeight: 1.7 }}>
              Prepare shared guardian notices or generate personalized student result SMS automatically from the saved marks in the system.
            </div>
          </div>
          <div style={{ ...softCardStyle({ padding: 12, radius: 18 }), minWidth: 240, display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Gateway status</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
              {gatewayStatus.loading
                ? "Checking Beem Africa SMS connection..."
                : gatewayStatus.configured
                ? `Beem Africa is connected${gatewayStatus.senderId ? ` with sender ${gatewayStatus.senderId}` : ""}.`
                : gatewayStatus.error || "Beem Africa credentials are not configured yet."}
            </div>
            <div style={{ ...pillStyle({ tone: gatewayStatus.configured ? "teal" : "amber" }), width: "fit-content" }}>
              {gatewayStatus.configured ? "Gateway connected" : "Gateway not configured"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setMode("custom")}
            style={mode === "custom" ? primaryButtonStyle({ compact: true }) : secondaryButtonStyle({ compact: true })}
          >
            Custom SMS
          </button>
          <button
            onClick={() => setMode("results")}
            style={mode === "results" ? primaryButtonStyle({ compact: true }) : secondaryButtonStyle({ compact: true })}
          >
            Results SMS
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {stats.map((item) => (
            <div key={item.label} style={{ ...softCardStyle({ padding: 14, radius: 18 }), display: "grid", gap: 4 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 24, color: "#0f172a", fontWeight: 900 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div style={{ ...glassPanelStyle({ padding: 16, radius: 24 }), display: "grid", gap: 14, alignContent: "start" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
            {mode === "results" ? "Results Targeting" : "Audience Targeting"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{scopeDescription}</div>

          {mode === "results" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Academic Year</span>
                <select value={year} onChange={(e) => setYear(e.target.value)} style={fieldStyle()}>
                  <option value="all">All years</option>
                  {years.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Form</span>
                <select value={form} onChange={(e) => setForm(e.target.value)} style={fieldStyle()}>
                  <option value="all">All forms</option>
                  {forms.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Class</span>
                <select value={classId} onChange={(e) => setClassId(e.target.value)} style={fieldStyle()}>
                  <option value="all">Select class</option>
                  {classOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Exam</span>
                <select value={resultsExam} onChange={(e) => setResultsExam(e.target.value)} style={fieldStyle()}>
                  {resultsExamOptions.map((entry) => (
                    <option key={entry.value} value={entry.value}>{entry.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Language</span>
                <select value={resultsLanguage} onChange={(e) => setResultsLanguage(e.target.value)} style={fieldStyle()}>
                  <option value="en">English</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </label>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>SMS Scope</span>
                <select value={scope} onChange={(e) => setScope(e.target.value)} style={fieldStyle()}>
                  <option value="all">All Guardians</option>
                  <option value="year">Academic Year</option>
                  <option value="form">Form</option>
                  <option value="class">Specific Class</option>
                  <option value="manual">Manual Numbers</option>
                </select>
              </label>

              {(scope === "year" || scope === "form" || scope === "class") && (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Academic Year</span>
                  <select value={year} onChange={(e) => setYear(e.target.value)} style={fieldStyle()}>
                    <option value="all">{scope === "year" ? "Select year" : "All years"}</option>
                    {years.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
              )}

              {(scope === "form" || scope === "class") && (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Form</span>
                  <select value={form} onChange={(e) => setForm(e.target.value)} style={fieldStyle()}>
                    <option value="all">{scope === "form" ? "Select form" : "All forms"}</option>
                    {forms.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
              )}

              {scope === "class" && (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Class</span>
                  <select value={classId} onChange={(e) => setClassId(e.target.value)} style={fieldStyle()}>
                    <option value="all">Select class</option>
                    {classOptions.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.label}</option>
                    ))}
                  </select>
                </label>
              )}

              {scope === "manual" && (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Manual Numbers</span>
                  <textarea
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                    rows={6}
                    placeholder="255712345678, 255754000111"
                    style={{ ...fieldStyle(), resize: "vertical", minHeight: 120 }}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        <div style={{ ...glassPanelStyle({ padding: 16, radius: 24 }), display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
              {mode === "results" ? "Results Message Preview" : "Message Composer"}
            </div>
            {mode === "custom" ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MESSAGE_TEMPLATES.map((template) => (
                  <button
                    key={template.key}
                    onClick={() => handleTemplateSelect(template)}
                    style={secondaryButtonStyle({ compact: true })}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ ...pillStyle({ tone: "teal" }) }}>{resultsExam || DEFAULT_EXAM_TYPE}</div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Sender ID</span>
              <input value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="INFO" style={fieldStyle()} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Schedule Time</span>
              <input
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                placeholder="Optional gateway schedule"
                style={fieldStyle()}
              />
            </label>
          </div>

          {mode === "results" ? (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Generated Example</span>
              <textarea
                value={previewMessage}
                readOnly
                rows={8}
                placeholder="Pick a class and exam to generate result messages."
                style={{ ...fieldStyle({ background: "rgba(248,250,252,0.92)" }), resize: "vertical", minHeight: 170 }}
              />
            </label>
          ) : (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>SMS Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                placeholder="Type the SMS message to send to selected guardians..."
                style={{ ...fieldStyle(), resize: "vertical", minHeight: 170 }}
              />
            </label>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleSendSms}
              disabled={isSending || !gatewayStatus.configured}
              style={{ ...primaryButtonStyle({ compact: false }), opacity: isSending || !gatewayStatus.configured ? 0.6 : 1 }}
            >
              {isSending ? "Sending..." : mode === "results" ? "Send Results SMS" : "Send with Beem"}
            </button>
            <button onClick={handleCopyMessage} style={secondaryButtonStyle({ compact: false })}>
              Copy {mode === "results" ? "Preview" : "Message"}
            </button>
            <button onClick={handleCopyNumbers} style={secondaryButtonStyle({ compact: false })}>
              Copy Numbers
            </button>
            <button
              onClick={() => exportRecipientsCsv(recipients, mode === "results")}
              style={secondaryButtonStyle({ compact: false })}
            >
              Download {mode === "results" ? "Results SMS CSV" : "Recipients CSV"}
            </button>
          </div>

          {sendResult ? (
            <div style={{ ...softCardStyle({ padding: 14, radius: 18 }), display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Latest send summary</div>
                <div style={{ ...pillStyle({ tone: sendResult.successful ? "teal" : "amber" }) }}>
                  {sendResult.successful ? "Submitted" : "Submitted with warnings"}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                {[
                  { label: mode === "results" ? "Students" : "Requested", value: sendResult.jobCount ?? sendResult.totalRequested ?? 0 },
                  { label: "Valid", value: sendResult.valid ?? 0 },
                  { label: "Invalid", value: sendResult.invalid ?? 0 },
                  { label: "Batches", value: sendResult.batchCount ?? 0 },
                ].map((item) => (
                  <div key={item.label} style={{ ...softCardStyle({ padding: 12, radius: 14 }) }}>
                    <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em" }}>
                      {item.label}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ ...glassPanelStyle({ padding: 16, radius: 24 }), display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>Send History</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Recent outbound SMS activity recorded from this portal.
            </div>
          </div>
          <div style={{ ...pillStyle({ tone: "blue" }), display: "inline-flex" }}>
            {history.length} recent log{history.length === 1 ? "" : "s"}
          </div>
        </div>

        {history.length === 0 ? (
          <div
            style={{
              ...softCardStyle({ padding: 18, radius: 18 }),
              textAlign: "center",
              fontSize: 13,
              color: "#64748b",
            }}
          >
            No SMS history has been recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  {["Time", "Mode", "Target", "Requested By", "Valid", "Status"].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "left",
                        padding: "11px 12px",
                        fontSize: 12,
                        color: "#475569",
                        borderBottom: "1px solid rgba(226,232,240,0.92)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155" }}>
                      {formatHistoryTime(entry.created_at)}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155", fontWeight: 700 }}>
                      {entry.mode === "results" ? "Results SMS" : "Custom SMS"}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>
                        {entry.class_label || entry.scope || "General"}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {(entry.exam ? `${entry.exam} · ` : "") + `${entry.total_requested || 0} recipient${Number(entry.total_requested || 0) === 1 ? "" : "s"}`}
                      </div>
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155" }}>
                      {entry.requested_by?.displayName || entry.requested_by?.username || "-"}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155", fontWeight: 700 }}>
                      {entry.valid ?? 0}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)" }}>
                      <span style={pillStyle({ tone: entry.successful ? "teal" : "amber" })}>
                        {entry.successful ? "Submitted" : "Warnings"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...glassPanelStyle({ padding: 16, radius: 24 }), display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
              {mode === "results" ? "Generated Results SMS" : "Recipient Preview"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {mode === "results"
                ? "Preview the first generated student-specific messages before sending."
                : "Preview the first recipients that will receive this shared message from the current selection."}
            </div>
          </div>
          <div style={{ ...pillStyle({ tone: "teal" }), display: "inline-flex" }}>
            {uniquePhones.length} unique numbers
          </div>
        </div>

        {recipients.length === 0 ? (
          <div
            style={{
              ...softCardStyle({ padding: 20, radius: 18 }),
              textAlign: "center",
              color: "#64748b",
              fontSize: 13,
            }}
          >
            {mode === "results"
              ? "No result messages can be generated for this class and exam yet."
              : "No recipient phones match the current SMS scope yet."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: mode === "results" ? 980 : 760 }}>
              <thead>
                <tr>
                  {(mode === "results"
                    ? ["Phone", "Guardian", "Student", "Class", "Message"]
                    : ["Phone", "Guardian", "Student", "Class"]
                  ).map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "left",
                        padding: "11px 12px",
                        fontSize: 12,
                        color: "#475569",
                        borderBottom: "1px solid rgba(226,232,240,0.92)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recipients.slice(0, 20).map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                      {entry.phone}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155" }}>
                      {entry.parentName}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155" }}>
                      {entry.studentName || "-"}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155" }}>
                      {entry.classLabel}
                    </td>
                    {mode === "results" ? (
                      <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 12, color: "#334155", whiteSpace: "pre-line", minWidth: 360 }}>
                        {entry.message}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
