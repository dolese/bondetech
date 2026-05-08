import React, { useEffect, useMemo, useState } from "react";
import { useViewport } from "../utils/useViewport";
import {
  buildSubjectLoadSummary,
  buildTeacherLoadSummary,
  buildSlotKey,
  detectTeacherAvailabilityConflicts,
  detectTeacherConflicts,
  detectRoomConflicts,
  getEnabledTimetableDays,
  isSharedTimetablePeriod,
  normalizeClassTimetable,
  normalizeTimetableSettings,
} from "../utils/timetable";

function Icon({ children, size = 18, strokeWidth = 1.9 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ClockIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5v5l3.5 2" />
    </Icon>
  );
}

function AlertIcon() {
  return (
    <Icon>
      <path d="M12 3 21 19H3L12 3Z" />
      <path d="M12 9v4.5" />
      <path d="M12 17h.01" />
    </Icon>
  );
}

function PlusIcon() {
  return (
    <Icon>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

function DeleteIcon() {
  return (
    <Icon>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5.3h5V7" />
      <path d="M7.5 7.5 8.2 19h7.6l.7-11.5" />
      <path d="M10 10.5v5.5" />
      <path d="M14 10.5v5.5" />
    </Icon>
  );
}

function normalizeField(value) {
  return String(value || "").trim();
}

function slotLabel(period) {
  const range = [period.start, period.end].filter(Boolean).join(" - ");
  return range ? `${period.label} (${range})` : period.label;
}

function slotHeader(period) {
  return [period.start, period.end].filter(Boolean).join(" - ") || period.label;
}

function normalizeClassLabel(cls = {}) {
  return [cls.form, cls.year].filter(Boolean).join(" ").trim();
}

function parseFormOrder(form) {
  const raw = String(form || "").toUpperCase();
  if (!raw) return 999;
  const romanMatch = raw.match(/\b(I|II|III|IV|V|VI)\b/);
  if (romanMatch) {
    return {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
    }[romanMatch[1]] || 999;
  }
  const digitMatch = raw.match(/\d+/);
  return digitMatch ? Number(digitMatch[0]) : 999;
}

function compareClasses(a, b) {
  const formDiff = parseFormOrder(a?.form) - parseFormOrder(b?.form);
  if (formDiff !== 0) return formDiff;
  return normalizeClassLabel(a).localeCompare(normalizeClassLabel(b));
}

function printCellText(value) {
  const text = String(value || "").trim();
  return text || "-";
}

function buildTeacherSuggestions(entries) {
  return (entries || [])
    .map((entry) => ({
      value: entry.username || entry.name || "",
      label: entry.name || entry.username || "",
    }))
    .filter((entry) => entry.value || entry.label);
}

function ensureSubjectTargets(timetable, subjects = []) {
  const normalized = normalizeClassTimetable(timetable);
  const existingMap = new Map(
    (normalized.subjectTargets || []).map((target) => [target.subject, target])
  );
  return {
    ...normalized,
    subjectTargets: (subjects || []).map((subject) => ({
      subject,
      periodsPerWeek: existingMap.get(subject)?.periodsPerWeek || 0,
      teacherName: existingMap.get(subject)?.teacherName || "",
      teacherUsername: existingMap.get(subject)?.teacherUsername || "",
      room: existingMap.get(subject)?.room || "",
    })),
  };
}

export function TimetablePage({
  classData,
  allClasses,
  schoolSettings,
  teacherEntries,
  role,
  onSaveSchoolSettings,
  onUpdateTimetable,
}) {
  const { isMobile } = useViewport();
  const canEditGlobal = role === "admin";
  const canEditClass = role === "admin" || role === "academic" || role === "teacher";
  const [globalTimetable, setGlobalTimetable] = useState(() =>
    normalizeTimetableSettings(schoolSettings?.timetable)
  );
  const [classTimetable, setClassTimetable] = useState(() =>
    normalizeClassTimetable(classData?.timetable)
  );
  const [selectedTeacherKey, setSelectedTeacherKey] = useState("");
  const [printScope, setPrintScope] = useState("");
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingClass, setSavingClass] = useState(false);

  useEffect(() => {
    setGlobalTimetable(normalizeTimetableSettings(schoolSettings?.timetable));
  }, [schoolSettings]);

  useEffect(() => {
    setClassTimetable(ensureSubjectTargets(classData?.timetable, classData?.subjects || []));
  }, [classData?.id, classData?.timetable, classData?.subjects]);

  useEffect(() => {
    const handleAfterPrint = () => setPrintScope("");
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useEffect(() => {
    if (!printScope) {
      document.body.removeAttribute("data-timetable-print");
      return undefined;
    }
    document.body.setAttribute("data-timetable-print", printScope);
    const timer = window.setTimeout(() => window.print(), 80);
    return () => window.clearTimeout(timer);
  }, [printScope]);

  const days = useMemo(() => getEnabledTimetableDays(globalTimetable), [globalTimetable]);
  const normalizedGlobalTimetable = useMemo(() => normalizeTimetableSettings(globalTimetable), [globalTimetable]);
  const periods = useMemo(() => normalizedGlobalTimetable.periods, [normalizedGlobalTimetable]);
  const teacherSuggestions = useMemo(() => buildTeacherSuggestions(teacherEntries), [teacherEntries]);
  const teacherOptionMap = useMemo(
    () => new Map(teacherSuggestions.map((entry) => [String(entry.value || "").trim().toLowerCase(), entry.label || entry.value])),
    [teacherSuggestions]
  );
  const teacherSuggestionId = `teacher-suggestions-${classData?.id || "class"}`;

  const conflicts = useMemo(() => detectTeacherConflicts(allClasses || []), [allClasses]);
  const roomConflicts = useMemo(() => detectRoomConflicts(allClasses || []), [allClasses]);
  const availabilityConflicts = useMemo(
    () => detectTeacherAvailabilityConflicts(allClasses || [], normalizedGlobalTimetable),
    [allClasses, normalizedGlobalTimetable]
  );
  const teacherLoadSummary = useMemo(() => buildTeacherLoadSummary(allClasses || []), [allClasses]);
  const subjectLoadSummary = useMemo(
    () => buildSubjectLoadSummary({ ...classData, timetable: classTimetable }),
    [classData, classTimetable]
  );
  const unmetSubjectTargets = useMemo(
    () => subjectLoadSummary.filter((item) => item.target > item.assigned),
    [subjectLoadSummary]
  );
  const activeClassLabel = [classData?.form, classData?.year].filter(Boolean).join(" ");
  const sortedClasses = useMemo(
    () => [...(allClasses || [])].sort(compareClasses),
    [allClasses]
  );

  useEffect(() => {
    const availableTeacherKeys = Array.from(
      new Set([
        ...teacherLoadSummary.map((entry) => entry.teacherKey),
        ...teacherSuggestions.map((entry) => String(entry.value || "").trim().toLowerCase()).filter(Boolean),
      ])
    );
    if (!availableTeacherKeys.length) {
      setSelectedTeacherKey("");
      return;
    }
    if (!availableTeacherKeys.includes(selectedTeacherKey)) {
      setSelectedTeacherKey(availableTeacherKeys[0]);
    }
  }, [selectedTeacherKey, teacherLoadSummary, teacherSuggestions]);

  const masterTimetableByDay = useMemo(() => {
    return days.map((day) => {
      const dayClasses = sortedClasses.map((cls) => {
        const timetable = normalizeClassTimetable(cls?.timetable);
        return {
          id: cls.id,
          form: cls.form || "",
          year: cls.year || "",
          classLabel: normalizeClassLabel(cls),
          entries: timetable.entries || {},
        };
      });
      const formCounts = dayClasses.reduce((accumulator, entry) => {
        accumulator[entry.form] = (accumulator[entry.form] || 0) + 1;
        return accumulator;
      }, {});
      return {
        ...day,
        classes: dayClasses,
        rowCount: dayClasses.length || 1,
        formCounts,
      };
    });
  }, [days, sortedClasses]);

  const classPrintMatrix = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        slots: periods.map((period) => {
          const slotKey = buildSlotKey(day.id, period.id);
          return {
            period,
            slotKey,
            entry: classTimetable.entries?.[slotKey] || null,
          };
        }),
      })),
    [classTimetable.entries, days, periods]
  );

  const selectedTeacherSchedule = useMemo(() => {
    if (!selectedTeacherKey) return {};
    const schedule = {};
    (allClasses || []).forEach((cls) => {
      const timetable = normalizeClassTimetable(cls?.timetable);
      Object.entries(timetable.entries).forEach(([slotKey, entry]) => {
        const teacherKey = String(entry.teacherUsername || entry.teacherName || "").trim().toLowerCase();
        if (!teacherKey || teacherKey !== selectedTeacherKey) return;
        if (!schedule[slotKey]) schedule[slotKey] = [];
        schedule[slotKey].push({
          classLabel: [cls.form, cls.year].filter(Boolean).join(" "),
          subject: entry.subject,
          room: entry.room,
        });
      });
    });
    return schedule;
  }, [allClasses, selectedTeacherKey]);
  const selectedTeacherUnavailableSlots = useMemo(
    () => normalizedGlobalTimetable.teacherAvailability?.[selectedTeacherKey] || [],
    [normalizedGlobalTimetable, selectedTeacherKey]
  );
  const selectedTeacherDisplayName = useMemo(
    () =>
      teacherOptionMap.get(selectedTeacherKey)
      || teacherLoadSummary.find((entry) => entry.teacherKey === selectedTeacherKey)?.teacherName
      || "",
    [selectedTeacherKey, teacherLoadSummary, teacherOptionMap]
  );
  const teacherPrintMatrix = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        slots: periods.map((period) => {
          const slotKey = buildSlotKey(day.id, period.id);
          return {
            period,
            slotKey,
            entries: selectedTeacherSchedule[slotKey] || [],
            unavailable: selectedTeacherUnavailableSlots.includes(slotKey),
          };
        }),
      })),
    [days, periods, selectedTeacherSchedule, selectedTeacherUnavailableSlots]
  );

  const updateClassEntry = (slotKey, field, value) => {
    setClassTimetable((prev) => {
      const nextEntries = { ...(prev.entries || {}) };
      const subjectTargets = prev.subjectTargets || [];
      const nextEntry = {
        subject: "",
        teacherName: "",
        teacherUsername: "",
        room: "",
        note: "",
        ...(nextEntries[slotKey] || {}),
        [field]: value,
      };
      if (field === "subject") {
        const target = subjectTargets.find((item) => item.subject === value);
        if (target) {
          if (!nextEntry.teacherName) {
            nextEntry.teacherName = target.teacherName || target.teacherUsername || "";
            nextEntry.teacherUsername = target.teacherUsername || "";
          }
          if (!nextEntry.room) {
            nextEntry.room = target.room || "";
          }
        }
      }
      if (field === "teacherName") {
        const matched = teacherSuggestions.find((item) =>
          item.value.toLowerCase() === String(value || "").trim().toLowerCase()
          || item.label.toLowerCase() === String(value || "").trim().toLowerCase()
        );
        nextEntry.teacherUsername = matched?.value || "";
        nextEntry.teacherName = matched?.label || String(value || "").trim();
      }
      if (!nextEntry.subject && !nextEntry.teacherName && !nextEntry.teacherUsername && !nextEntry.room && !nextEntry.note) {
        delete nextEntries[slotKey];
      } else {
        nextEntries[slotKey] = nextEntry;
      }
      return { ...prev, entries: nextEntries };
    });
  };

  const updateSubjectTarget = (subject, field, value) => {
    setClassTimetable((prev) => ({
      ...prev,
      subjectTargets: (prev.subjectTargets || []).map((target) => {
        if (target.subject !== subject) return target;
        if (field === "teacherName") {
          const matched = teacherSuggestions.find((item) =>
            item.value.toLowerCase() === String(value || "").trim().toLowerCase()
            || item.label.toLowerCase() === String(value || "").trim().toLowerCase()
          );
          return {
            ...target,
            teacherName: matched?.label || String(value || "").trim(),
            teacherUsername: matched?.value || "",
          };
        }
        if (field === "periodsPerWeek") {
          const numeric = Math.max(0, Number(value || 0));
          return { ...target, periodsPerWeek: Number.isFinite(numeric) ? numeric : 0 };
        }
        return { ...target, [field]: value };
      }),
    }));
  };

  const handleSaveGlobal = async () => {
    if (!canEditGlobal || !onSaveSchoolSettings) return;
    setSavingGlobal(true);
    try {
      await onSaveSchoolSettings({
        ...schoolSettings,
        timetable: globalTimetable,
      });
    } finally {
      setSavingGlobal(false);
    }
  };

  const toggleTeacherUnavailableSlot = (slotKey) => {
    if (!canEditGlobal || !selectedTeacherKey) return;
    setGlobalTimetable((prev) => {
      const normalized = normalizeTimetableSettings(prev);
      const current = normalized.teacherAvailability?.[selectedTeacherKey] || [];
      const nextSlots = current.includes(slotKey)
        ? current.filter((item) => item !== slotKey)
        : [...current, slotKey];
      return {
        ...normalized,
        teacherAvailability: {
          ...(normalized.teacherAvailability || {}),
          [selectedTeacherKey]: nextSlots,
        },
      };
    });
  };

  const handleSaveClass = async () => {
    if (!canEditClass || !onUpdateTimetable) return;
    setSavingClass(true);
    try {
      await onUpdateTimetable(classTimetable);
    } finally {
      setSavingClass(false);
    }
  };

  const triggerPrint = (scope) => {
    setPrintScope(scope);
  };

  const addPeriod = () => {
    setGlobalTimetable((prev) => {
      const current = normalizeTimetableSettings(prev);
      const lessonCount = current.periods.filter((period) => period.type !== "break").length + 1;
      return {
        ...current,
        periods: [
          ...current.periods,
          {
            id: `period-${Date.now()}`,
            label: `Period ${lessonCount}`,
            shortLabel: `P${lessonCount}`,
            start: "",
            end: "",
            type: "lesson",
          },
        ],
      };
    });
  };

  const updatePeriod = (periodId, field, value) => {
    setGlobalTimetable((prev) => ({
      ...normalizeTimetableSettings(prev),
      periods: normalizeTimetableSettings(prev).periods.map((period) =>
        period.id === periodId ? { ...period, [field]: value } : period
      ),
    }));
  };

  const removePeriod = (periodId) => {
    setGlobalTimetable((prev) => ({
      ...normalizeTimetableSettings(prev),
      periods: normalizeTimetableSettings(prev).periods.filter((period) => period.id !== periodId),
    }));
  };

  const toggleDay = (dayId) => {
    setGlobalTimetable((prev) => ({
      ...normalizeTimetableSettings(prev),
      days: normalizeTimetableSettings(prev).days.map((day) =>
        day.id === dayId ? { ...day, enabled: !day.enabled } : day
      ),
    }));
  };

  const styles = {
    page: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      padding: isMobile ? 12 : 18,
      display: "grid",
      gap: 16,
      background:
        "radial-gradient(circle at top right, rgba(17,201,194,0.10), transparent 28%), linear-gradient(180deg, rgba(243,247,252,0.96), rgba(234,241,248,0.98))",
    },
    section: {
      background: "rgba(255,255,255,0.72)",
      border: "1px solid rgba(192,209,232,0.82)",
      borderRadius: 22,
      boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
      backdropFilter: "blur(16px)",
      padding: isMobile ? 14 : 18,
      display: "grid",
      gap: 14,
    },
    headingRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
    headingBlock: {
      display: "grid",
      gap: 4,
    },
    title: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: isMobile ? 18 : 22,
      fontWeight: 900,
      color: "#0f172a",
    },
    sub: {
      fontSize: 13,
      color: "#52627b",
      maxWidth: 760,
      lineHeight: 1.5,
    },
    button: {
      height: 40,
      padding: "0 16px",
      borderRadius: 12,
      border: "none",
      background: "linear-gradient(135deg, #0f766e, #0c4a6e)",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
      boxShadow: "0 16px 28px rgba(15,118,110,0.22)",
    },
    printButton: {
      height: 36,
      padding: "0 14px",
      borderRadius: 10,
      border: "1px solid rgba(14,116,144,0.22)",
      background: "linear-gradient(135deg, rgba(240,249,255,0.96), rgba(224,242,254,0.92))",
      color: "#0c4a6e",
      fontWeight: 800,
      cursor: "pointer",
    },
    mutedButton: {
      height: 36,
      padding: "0 14px",
      borderRadius: 10,
      border: "1px solid rgba(203,213,225,0.9)",
      background: "#fff",
      color: "#0f172a",
      fontWeight: 700,
      cursor: "pointer",
    },
    pills: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    },
    pill: (active) => ({
      padding: "8px 12px",
      borderRadius: 999,
      border: active ? "1px solid rgba(13,148,136,0.42)" : "1px solid rgba(203,213,225,0.9)",
      background: active ? "rgba(20,184,166,0.14)" : "rgba(255,255,255,0.82)",
      color: active ? "#0f766e" : "#334155",
      fontSize: 12,
      fontWeight: 800,
      cursor: canEditGlobal ? "pointer" : "default",
    }),
    grid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1.15fr 0.85fr",
      gap: 16,
      alignItems: "start",
    },
    cards: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
    },
    statCard: {
      borderRadius: 18,
      border: "1px solid rgba(203,213,225,0.85)",
      background: "rgba(255,255,255,0.86)",
      padding: "14px 15px",
      display: "grid",
      gap: 6,
    },
    statLabel: {
      fontSize: 11,
      letterSpacing: 1,
      fontWeight: 800,
      color: "#64748b",
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: 28,
      lineHeight: 1,
      fontWeight: 900,
      color: "#0f172a",
    },
    periodList: {
      display: "grid",
      gap: 10,
    },
    periodRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr 0.8fr 0.8fr auto",
      gap: 10,
      alignItems: "center",
      padding: "12px 12px",
      borderRadius: 16,
      border: "1px solid rgba(203,213,225,0.82)",
      background: "rgba(255,255,255,0.82)",
    },
    input: {
      width: "100%",
      minWidth: 0,
      height: 36,
      borderRadius: 10,
      border: "1px solid rgba(191,203,221,0.95)",
      background: "#fff",
      padding: "0 10px",
      fontSize: 13,
      color: "#0f172a",
      boxSizing: "border-box",
    },
    select: {
      width: "100%",
      minWidth: 0,
      height: 36,
      borderRadius: 10,
      border: "1px solid rgba(191,203,221,0.95)",
      background: "#fff",
      padding: "0 10px",
      fontSize: 13,
      color: "#0f172a",
      boxSizing: "border-box",
    },
    helper: {
      fontSize: 12,
      color: "#64748b",
    },
    conflictList: {
      display: "grid",
      gap: 10,
    },
    loadGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
      gap: 12,
    },
    loadGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
      gap: 12,
    },
    conflictItem: {
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(251,191,36,0.45)",
      background: "linear-gradient(135deg, rgba(254,240,138,0.32), rgba(255,255,255,0.9))",
      display: "grid",
      gap: 4,
    },
    board: {
      display: "grid",
      gap: 12,
    },
    tableWrap: {
      width: "100%",
      overflowX: "auto",
      borderRadius: 20,
      border: "1px solid rgba(148,163,184,0.42)",
      background: "rgba(255,255,255,0.9)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
    },
    masterTable: {
      width: "100%",
      minWidth: 1180,
      borderCollapse: "collapse",
      background:
        "radial-gradient(circle at center, rgba(16,185,129,0.05), transparent 32%), rgba(255,255,255,0.96)",
    },
    masterHeadCell: {
      border: "1px solid rgba(30,41,59,0.78)",
      padding: "8px 6px",
      background: "linear-gradient(180deg, rgba(223,237,214,0.94), rgba(214,229,202,0.92))",
      textAlign: "center",
      fontSize: 12,
      fontWeight: 900,
      color: "#111827",
      verticalAlign: "middle",
      whiteSpace: "pre-line",
    },
    masterBodyCell: {
      border: "1px solid rgba(51,65,85,0.72)",
      padding: "6px 5px",
      textAlign: "center",
      fontSize: 12,
      color: "#0f172a",
      verticalAlign: "middle",
      background: "rgba(255,255,255,0.94)",
    },
    masterAxisCell: {
      border: "1px solid rgba(51,65,85,0.72)",
      padding: "6px 5px",
      textAlign: "center",
      fontSize: 12,
      fontWeight: 900,
      color: "#111827",
      verticalAlign: "middle",
      background: "rgba(226,232,240,0.92)",
    },
    masterFormCell: {
      border: "1px solid rgba(51,65,85,0.72)",
      padding: "6px 5px",
      textAlign: "center",
      fontSize: 12,
      fontWeight: 800,
      color: "#111827",
      verticalAlign: "middle",
      background: "rgba(241,245,249,0.94)",
    },
    masterSharedCell: {
      border: "1px solid rgba(51,65,85,0.72)",
      padding: "6px 4px",
      textAlign: "center",
      fontSize: 12,
      fontWeight: 900,
      color: "#0f172a",
      verticalAlign: "middle",
      background: "linear-gradient(180deg, rgba(245,250,240,0.95), rgba(235,244,227,0.92))",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    masterLessonCell: {
      border: "1px solid rgba(51,65,85,0.72)",
      padding: "4px 4px",
      textAlign: "center",
      fontSize: 11,
      color: "#0f172a",
      verticalAlign: "middle",
      background: "rgba(255,255,255,0.96)",
      minWidth: 70,
    },
    masterLessonMain: {
      fontWeight: 800,
      letterSpacing: 0.1,
      lineHeight: 1.15,
    },
    masterLessonSub: {
      fontSize: 10,
      color: "#64748b",
      lineHeight: 1.1,
      marginTop: 2,
    },
    dayCard: {
      borderRadius: 18,
      border: "1px solid rgba(203,213,225,0.85)",
      background: "rgba(255,255,255,0.84)",
      overflow: "hidden",
    },
    dayHeader: {
      padding: "12px 14px",
      background: "linear-gradient(135deg, rgba(8,83,106,0.92), rgba(14,116,144,0.92))",
      color: "#fff",
      fontWeight: 900,
      letterSpacing: 0.2,
    },
    dayBody: {
      display: "grid",
    },
    slotRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "140px minmax(0, 1fr)",
      gap: 10,
      padding: "12px 14px",
      borderTop: "1px solid rgba(226,232,240,0.9)",
      alignItems: "start",
    },
    slotMeta: {
      display: "grid",
      gap: 2,
    },
    slotTitle: {
      fontSize: 13,
      fontWeight: 800,
      color: "#0f172a",
    },
    slotSub: {
      fontSize: 11,
      color: "#64748b",
    },
    occupancy: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    },
    badge: {
      display: "grid",
      gap: 2,
      borderRadius: 12,
      padding: "8px 10px",
      border: "1px solid rgba(191,219,254,0.9)",
      background: "linear-gradient(135deg, rgba(239,246,255,0.95), rgba(219,234,254,0.78))",
      minWidth: 140,
    },
    badgeTitle: {
      fontSize: 12,
      fontWeight: 800,
      color: "#0f172a",
    },
    badgeSub: {
      fontSize: 11,
      color: "#475569",
    },
    classBoard: {
      display: "grid",
      gap: 12,
    },
    classDayCard: {
      borderRadius: 20,
      border: "1px solid rgba(203,213,225,0.85)",
      background: "rgba(255,255,255,0.9)",
      overflow: "hidden",
    },
    classDayHeader: {
      padding: "12px 14px",
      background: "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(30,41,59,0.92))",
      color: "#fff",
      fontWeight: 900,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editorRows: {
      display: "grid",
    },
    editorRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "160px 1fr 1fr 0.8fr",
      gap: 10,
      padding: "12px 14px",
      alignItems: "center",
      borderTop: "1px solid rgba(226,232,240,0.9)",
    },
    breakRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "160px 1fr",
      gap: 10,
      padding: "12px 14px",
      alignItems: "center",
      borderTop: "1px solid rgba(226,232,240,0.9)",
      background: "rgba(248,250,252,0.9)",
    },
    emptyCell: {
      borderRadius: 12,
      padding: "10px 12px",
      border: "1px dashed rgba(191,203,221,0.9)",
      color: "#64748b",
      fontSize: 12,
      background: "rgba(248,250,252,0.72)",
    },
    allocationTable: {
      display: "grid",
      gap: 10,
    },
    allocationRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 120px 1fr 140px",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(203,213,225,0.82)",
      background: "rgba(255,255,255,0.82)",
      alignItems: "center",
    },
    loadChip: (balanced) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      padding: "5px 10px",
      background: balanced ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)",
      color: balanced ? "#166534" : "#b45309",
      border: `1px solid ${balanced ? "rgba(34,197,94,0.28)" : "rgba(245,158,11,0.3)"}`,
      fontSize: 11,
      fontWeight: 800,
    }),
    teacherLoadCard: {
      borderRadius: 16,
      border: "1px solid rgba(203,213,225,0.82)",
      background: "rgba(255,255,255,0.84)",
      padding: "12px 14px",
      display: "grid",
      gap: 6,
    },
    teacherGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "280px minmax(0, 1fr)",
      gap: 14,
      alignItems: "start",
    },
    teacherSelectCard: {
      borderRadius: 18,
      border: "1px solid rgba(203,213,225,0.82)",
      background: "rgba(255,255,255,0.86)",
      padding: "14px 15px",
      display: "grid",
      gap: 10,
    },
    unavailableCell: {
      borderRadius: 12,
      padding: "10px 12px",
      border: "1px solid rgba(148,163,184,0.36)",
      color: "#475569",
      fontSize: 12,
      background: "linear-gradient(135deg, rgba(241,245,249,0.95), rgba(226,232,240,0.9))",
    },
    unavailableToggle: (active) => ({
      height: 34,
      borderRadius: 10,
      border: active ? "1px solid rgba(220,38,38,0.35)" : "1px solid rgba(203,213,225,0.9)",
      background: active ? "rgba(254,226,226,0.9)" : "#fff",
      color: active ? "#b91c1c" : "#334155",
      fontWeight: 800,
      cursor: canEditGlobal ? "pointer" : "default",
    }),
    printOnly: {
      position: "absolute",
      left: -100000,
      top: "auto",
      width: 1,
      height: 1,
      overflow: "hidden",
    },
    printDoc: {
      display: "grid",
      gap: 10,
      padding: 18,
      color: "#111827",
      background: "#fff",
    },
    printDocHeader: {
      display: "grid",
      gap: 3,
      textAlign: "center",
    },
    printDocTitle: {
      fontSize: 24,
      fontWeight: 900,
      letterSpacing: 0.4,
    },
    printDocSub: {
      fontSize: 13,
      fontWeight: 700,
    },
    printTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 11,
      background: "#fff",
    },
    printHeadCell: {
      border: "1px solid #1f2937",
      padding: "6px 4px",
      textAlign: "center",
      fontWeight: 900,
      background: "#eef2f7",
      verticalAlign: "middle",
      whiteSpace: "pre-line",
    },
    printCell: {
      border: "1px solid #334155",
      padding: "5px 4px",
      textAlign: "center",
      verticalAlign: "middle",
    },
    printRowHeader: {
      border: "1px solid #334155",
      padding: "5px 4px",
      textAlign: "left",
      verticalAlign: "middle",
      fontWeight: 800,
      background: "#f8fafc",
    },
  };

  return (
    <div style={styles.page} data-print-root>
      <style>{`
        @media print {
          body[data-timetable-print] {
            background: #fff !important;
          }
          body[data-timetable-print] #root > * {
            visibility: hidden !important;
          }
          body[data-timetable-print] [data-print-root],
          body[data-timetable-print] [data-print-root] * {
            visibility: visible !important;
          }
          body[data-timetable-print] [data-print-root] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #fff !important;
          }
          body[data-timetable-print] [data-print-doc] {
            display: none !important;
          }
          body[data-timetable-print] [data-print-holder] {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: auto !important;
            height: auto !important;
            overflow: visible !important;
          }
          body[data-timetable-print="master"] [data-print-doc="master"],
          body[data-timetable-print="class"] [data-print-doc="class"],
          body[data-timetable-print="teacher"] [data-print-doc="teacher"] {
            display: grid !important;
          }
          body[data-timetable-print] [data-hide-on-print] {
            display: none !important;
          }
          @page {
            size: A3 landscape;
            margin: 10mm;
          }
        }
      `}</style>
      <section style={styles.section}>
        <div style={styles.headingRow}>
          <div style={styles.headingBlock}>
            <div style={styles.title}>
              <ClockIcon />
              Timetable Management
            </div>
            <div style={styles.sub}>
              Build one shared weekly structure for the school, then edit each class timetable against it with teacher-conflict checks.
            </div>
          </div>
          {canEditClass && (
            <button style={styles.button} onClick={handleSaveClass} disabled={savingClass}>
              {savingClass ? "Saving..." : `Save ${activeClassLabel || "Class"} Timetable`}
            </button>
          )}
        </div>

        <div style={styles.cards}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Active Days</div>
            <div style={styles.statValue}>{days.length}</div>
            <div style={styles.helper}>Enabled teaching days in the school timetable.</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Lesson Periods</div>
            <div style={styles.statValue}>{periods.filter((period) => period.type === "lesson").length}</div>
            <div style={styles.helper}>Only lesson periods accept subject and teacher assignments.</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Teacher Conflicts</div>
            <div style={{ ...styles.statValue, color: conflicts.length ? "#b45309" : "#0f766e" }}>{conflicts.length}</div>
            <div style={styles.helper}>Detected across all classes for the same day and period.</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Room Conflicts</div>
            <div style={{ ...styles.statValue, color: roomConflicts.length ? "#b45309" : "#0f766e" }}>{roomConflicts.length}</div>
            <div style={styles.helper}>Checks whether one room is booked by multiple classes in the same slot.</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Availability Violations</div>
            <div style={{ ...styles.statValue, color: availabilityConflicts.length ? "#b45309" : "#0f766e" }}>{availabilityConflicts.length}</div>
            <div style={styles.helper}>Assignments that fall inside a teacher's unavailable slots.</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Unmet Targets</div>
            <div style={{ ...styles.statValue, color: unmetSubjectTargets.length ? "#b45309" : "#0f766e" }}>{unmetSubjectTargets.length}</div>
            <div style={styles.helper}>Subjects in this class still below their weekly target.</div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.grid}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={styles.headingRow}>
              <div style={styles.headingBlock}>
                <div style={styles.title}>School Timetable Settings</div>
                <div style={styles.sub}>
                  These are whole-school timetable slots. Use `Lesson` for normal teaching periods, `Break` for fixed pauses, and `Shared Activity` for whole-school blocks like clubs, sports, assembly, or tests.
                </div>
              </div>
              {canEditGlobal && (
                <button style={styles.button} onClick={handleSaveGlobal} disabled={savingGlobal}>
                  {savingGlobal ? "Saving..." : "Save School Timetable"}
                </button>
              )}
            </div>

            <div>
              <div style={{ ...styles.statLabel, marginBottom: 8 }}>Active Days</div>
              <div style={styles.pills}>
                {normalizeTimetableSettings(globalTimetable).days.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    style={styles.pill(day.enabled)}
                    onClick={() => canEditGlobal && toggleDay(day.id)}
                    disabled={!canEditGlobal}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...styles.headingRow, marginBottom: 8 }}>
                <div style={styles.statLabel}>Periods</div>
                {canEditGlobal && (
                  <button type="button" style={styles.mutedButton} onClick={addPeriod}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <PlusIcon />
                      Add Period
                    </span>
                  </button>
                )}
              </div>
              <div style={styles.periodList}>
                {normalizeTimetableSettings(globalTimetable).periods.map((period) => (
                  <div key={period.id} style={styles.periodRow}>
                    <input
                      style={styles.input}
                      value={period.label}
                      onChange={(event) => updatePeriod(period.id, "label", event.target.value)}
                      disabled={!canEditGlobal}
                      placeholder="Label"
                    />
                    <input
                      style={styles.input}
                      value={period.start}
                      onChange={(event) => updatePeriod(period.id, "start", event.target.value)}
                      disabled={!canEditGlobal}
                      placeholder="Start"
                    />
                    <input
                      style={styles.input}
                      value={period.end}
                      onChange={(event) => updatePeriod(period.id, "end", event.target.value)}
                      disabled={!canEditGlobal}
                      placeholder="End"
                    />
                    <select
                      style={styles.select}
                      value={period.type}
                      onChange={(event) => updatePeriod(period.id, "type", event.target.value)}
                      disabled={!canEditGlobal}
                    >
                      <option value="lesson">Lesson</option>
                      <option value="break">Break</option>
                      <option value="shared">Shared Activity</option>
                    </select>
                    {canEditGlobal ? (
                      <button type="button" style={styles.mutedButton} onClick={() => removePeriod(period.id)}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <DeleteIcon />
                          Remove
                        </span>
                      </button>
                    ) : (
                      <div style={styles.helper}>{period.shortLabel}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div style={styles.headingBlock}>
              <div style={styles.title}>
                <AlertIcon />
                Conflict Review
              </div>
              <div style={styles.sub}>
                The timetable now checks teacher collisions and room collisions across all saved class timetables.
              </div>
            </div>

            <div style={styles.loadGrid}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={styles.statLabel}>Teacher Conflicts</div>
                {conflicts.length === 0 ? (
                  <div style={styles.emptyCell}>No teacher conflicts detected in the current saved timetable data.</div>
                ) : (
                  <div style={styles.conflictList}>
                    {conflicts.map((conflict, index) => (
                      <div key={`${conflict.slotKey}-${index}`} style={styles.conflictItem}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#7c2d12" }}>
                          {conflict.teacherName} is assigned to multiple classes at the same slot.
                        </div>
                        <div style={styles.helper}>
                          {conflict.classes.map((entry) => `${entry.classLabel}: ${entry.subject}`).join(" | ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={styles.statLabel}>Room Conflicts</div>
                {roomConflicts.length === 0 ? (
                  <div style={styles.emptyCell}>No room conflicts detected in the current saved timetable data.</div>
                ) : (
                  <div style={styles.conflictList}>
                    {roomConflicts.map((conflict, index) => (
                      <div key={`${conflict.slotKey}-${index}`} style={styles.conflictItem}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#7c2d12" }}>
                          Room {conflict.room} is booked by multiple classes at the same slot.
                        </div>
                        <div style={styles.helper}>
                          {conflict.classes.map((entry) => `${entry.classLabel}: ${entry.subject}`).join(" | ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={styles.statLabel}>Availability Violations</div>
                {availabilityConflicts.length === 0 ? (
                  <div style={styles.emptyCell}>No teacher availability violations detected in the current saved timetable data.</div>
                ) : (
                  <div style={styles.conflictList}>
                    {availabilityConflicts.map((conflict, index) => (
                      <div key={`${conflict.slotKey}-availability-${index}`} style={styles.conflictItem}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#7c2d12" }}>
                          {conflict.teacherName} is scheduled while marked unavailable.
                        </div>
                        <div style={styles.helper}>
                          {`${conflict.classLabel}: ${conflict.subject}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.headingBlock}>
          <div style={styles.title}>Teacher Weekly Load</div>
          <div style={styles.sub}>
            This shows how heavily each teacher is scheduled across all saved class timetables right now.
          </div>
        </div>
        {teacherLoadSummary.length ? (
          <div style={styles.loadGrid}>
            {teacherLoadSummary.map((entry) => (
              <div key={entry.teacherKey} style={styles.teacherLoadCard}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{entry.teacherName}</div>
                  <div style={styles.loadChip(entry.periods >= 1)}>
                    {entry.periods} period{entry.periods === 1 ? "" : "s"}
                  </div>
                </div>
                <div style={styles.helper}>
                  {entry.classes.map((item) => `${item.classLabel}: ${item.count}`).join(" | ")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyCell}>No teacher allocations have been saved yet.</div>
        )}
      </section>

      <section style={styles.section}>
        <div style={styles.headingBlock}>
          <div style={styles.headingRow}>
            <div style={styles.headingBlock}>
              <div style={styles.title}>Teacher Timetable View</div>
              <div style={styles.sub}>
                Inspect one teacher across the full week to see where they are scheduled by class, subject, and room.
              </div>
            </div>
            <button type="button" style={styles.printButton} onClick={() => triggerPrint("teacher")}>
              Print Teacher Timetable
            </button>
          </div>
        </div>

        {(teacherLoadSummary.length || teacherSuggestions.length) ? (
          <div style={styles.teacherGrid}>
            <div style={styles.teacherSelectCard}>
              <div style={styles.statLabel}>Select Teacher</div>
              <select
                style={styles.select}
                value={selectedTeacherKey}
                onChange={(event) => setSelectedTeacherKey(event.target.value)}
              >
                {Array.from(
                  new Set([
                    ...teacherLoadSummary.map((entry) => entry.teacherKey),
                    ...teacherSuggestions.map((entry) => String(entry.value || "").trim().toLowerCase()).filter(Boolean),
                  ])
                ).map((teacherKey) => (
                  <option key={teacherKey} value={teacherKey}>
                    {teacherOptionMap.get(teacherKey)
                      || teacherLoadSummary.find((entry) => entry.teacherKey === teacherKey)?.teacherName
                      || teacherKey}
                  </option>
                ))}
              </select>
              {selectedTeacherKey ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
                    {selectedTeacherDisplayName || "Teacher"}
                  </div>
                  <div style={styles.loadChip((teacherLoadSummary.find((entry) => entry.teacherKey === selectedTeacherKey)?.periods || 0) >= 1)}>
                    {(teacherLoadSummary.find((entry) => entry.teacherKey === selectedTeacherKey)?.periods || 0)} assigned period{(teacherLoadSummary.find((entry) => entry.teacherKey === selectedTeacherKey)?.periods || 0) === 1 ? "" : "s"}
                  </div>
                  <div style={styles.helper}>
                    {(teacherLoadSummary.find((entry) => entry.teacherKey === selectedTeacherKey)?.classes || [])
                      .map((item) => `${item.classLabel}: ${item.count}`)
                      .join(" | ") || "No saved teaching load yet."}
                  </div>
                </div>
              ) : null}
            </div>

            <div style={styles.board}>
              {days.map((day) => (
                <div key={`teacher-${day.id}`} style={styles.dayCard}>
                  <div style={styles.dayHeader}>{day.label}</div>
                  <div style={styles.dayBody}>
                    {periods.map((period) => {
                      const slotKey = buildSlotKey(day.id, period.id);
                      const occupancy = selectedTeacherSchedule[slotKey] || [];
                      return (
                        <div key={`teacher-${slotKey}`} style={styles.slotRow}>
                          <div style={styles.slotMeta}>
                            <div style={styles.slotTitle}>{period.label}</div>
                            <div style={styles.slotSub}>{slotLabel(period)}</div>
                          </div>
                          {isSharedTimetablePeriod(period) ? (
                            <div style={styles.emptyCell}>{period.label || "Shared school activity"}</div>
                          ) : selectedTeacherUnavailableSlots.includes(slotKey) && !occupancy.length ? (
                            <div style={styles.unavailableCell}>Marked unavailable for this teacher.</div>
                          ) : occupancy.length ? (
                            <div style={styles.occupancy}>
                              {occupancy.map((entry, index) => (
                                <div key={`teacher-occ-${slotKey}-${index}`} style={styles.badge}>
                                  <div style={styles.badgeTitle}>{entry.classLabel || "Class"}</div>
                                  <div style={styles.badgeSub}>{entry.subject || "Unassigned subject"}</div>
                                  <div style={styles.badgeSub}>{entry.room || "Room not set"}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={styles.emptyCell}>This teacher is free in this slot.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.emptyCell}>No teacher timetable can be shown until timetable entries are assigned.</div>
        )}
      </section>

      <section style={styles.section}>
        <div style={styles.headingRow}>
          <div style={styles.headingBlock}>
            <div style={styles.title}>School General Timetable</div>
            <div style={styles.sub}>
              This master grid follows the school sample structure: one sheet grouped by day, then form and stream, with shared slots spanning the full day block.
            </div>
          </div>
          <button type="button" style={styles.printButton} onClick={() => triggerPrint("master")}>
            Print School Timetable
          </button>
        </div>

        {masterTimetableByDay.some((day) => day.classes.length) ? (
          <div style={styles.tableWrap}>
            <table style={styles.masterTable}>
              <thead>
                <tr>
                  <th style={styles.masterHeadCell}>DAY</th>
                  <th style={styles.masterHeadCell}>FORM</th>
                  <th style={styles.masterHeadCell}>STREAM</th>
                  {periods.map((period) => (
                    <th key={`head-${period.id}`} style={styles.masterHeadCell}>
                      {slotHeader(period)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {masterTimetableByDay.map((day) => {
                  let dayRendered = false;
                  let previousForm = "";
                  let remainingFormRows = 0;
                  return day.classes.map((cls, classIndex) => {
                    const isFirstRowOfDay = !dayRendered;
                    const isFirstRowOfForm = cls.form !== previousForm || remainingFormRows <= 0;
                    if (isFirstRowOfForm) {
                      previousForm = cls.form;
                      remainingFormRows = day.formCounts[cls.form] || 1;
                    }
                    remainingFormRows -= 1;
                    dayRendered = true;

                    return (
                      <tr key={`${day.id}-${cls.id || cls.classLabel || classIndex}`}>
                        {isFirstRowOfDay ? (
                          <td style={styles.masterAxisCell} rowSpan={day.rowCount}>
                            {day.label}
                          </td>
                        ) : null}
                        {isFirstRowOfForm ? (
                          <td style={styles.masterFormCell} rowSpan={day.formCounts[cls.form] || 1}>
                            {cls.form || "-"}
                          </td>
                        ) : null}
                        <td style={styles.masterAxisCell}>{cls.year || "-"}</td>
                        {periods.map((period) => {
                          const slotKey = buildSlotKey(day.id, period.id);
                          if (isSharedTimetablePeriod(period)) {
                            if (!isFirstRowOfDay) return null;
                            return (
                              <td
                                key={`${day.id}-${period.id}-shared`}
                                style={styles.masterSharedCell}
                                rowSpan={day.rowCount}
                              >
                                {period.label || "Shared Activity"}
                              </td>
                            );
                          }

                          const entry = cls.entries?.[slotKey];
                          return (
                            <td
                              key={`${day.id}-${cls.classLabel}-${period.id}`}
                              style={styles.masterLessonCell}
                              title={
                                entry
                                  ? [entry.subject, entry.teacherName || entry.teacherUsername, entry.room].filter(Boolean).join(" | ")
                                  : `${cls.classLabel || "Class"} not assigned`
                              }
                            >
                              {entry?.subject ? (
                                <>
                                  <div style={styles.masterLessonMain}>{entry.subject}</div>
                                  {(entry.teacherName || entry.teacherUsername || entry.room) ? (
                                    <div style={styles.masterLessonSub}>
                                      {[entry.teacherName || entry.teacherUsername, entry.room].filter(Boolean).join(" | ")}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <div style={styles.masterLessonSub}>-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.emptyCell}>Add class timetable entries first, then the school master timetable will appear here automatically.</div>
        )}
      </section>

      <section style={styles.section}>
        <div style={styles.headingRow}>
          <div style={styles.headingBlock}>
            <div style={styles.title}>{activeClassLabel || "Class"} Subject Allocation</div>
            <div style={styles.sub}>
              Set the weekly target for each subject. The timetable editor below can then auto-fill the preferred teacher and room when you pick a subject.
            </div>
          </div>
          <div style={styles.helper}>These targets belong to this class only.</div>
        </div>

        <div style={styles.allocationTable}>
          {(classTimetable.subjectTargets || []).map((target) => {
            const summary = subjectLoadSummary.find((item) => item.subject === target.subject);
            const balanced = (summary?.assigned || 0) >= (summary?.target || 0) && (summary?.target || 0) > 0;
            return (
                  <div key={target.subject} style={styles.allocationRow}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>{target.subject}</div>
                    <div style={styles.loadChip(balanced)}>
                      Assigned {summary?.assigned || 0} / Target {summary?.target || 0}
                    </div>
                    {!balanced && (summary?.target || 0) > 0 ? (
                      <div style={{ fontSize: 11, color: "#b45309", fontWeight: 700 }}>
                        Need {(summary?.target || 0) - (summary?.assigned || 0)} more period{(summary?.target || 0) - (summary?.assigned || 0) === 1 ? "" : "s"}
                      </div>
                    ) : null}
                  </div>
                <input
                  type="number"
                  min="0"
                  style={styles.input}
                  value={target.periodsPerWeek}
                  onChange={(event) => updateSubjectTarget(target.subject, "periodsPerWeek", event.target.value)}
                  disabled={!canEditClass}
                  placeholder="Periods"
                />
                <input
                  style={styles.input}
                  list={teacherSuggestionId}
                  value={target.teacherName}
                  onChange={(event) => updateSubjectTarget(target.subject, "teacherName", event.target.value)}
                  disabled={!canEditClass}
                  placeholder="Preferred teacher"
                />
                <input
                  style={styles.input}
                  value={target.room}
                  onChange={(event) => updateSubjectTarget(target.subject, "room", event.target.value)}
                  disabled={!canEditClass}
                  placeholder="Preferred room"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.headingRow}>
          <div style={styles.headingBlock}>
            <div style={styles.title}>{activeClassLabel || "Class"} Timetable</div>
            <div style={styles.sub}>
              Edit one class timetable against the shared school structure. Break rows stay fixed; lesson rows take subject, teacher, and room.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {!canEditClass && <div style={styles.helper}>Read-only for your current role.</div>}
            <button type="button" style={styles.printButton} onClick={() => triggerPrint("class")}>
              Print Class Timetable
            </button>
          </div>
        </div>

        <datalist id={teacherSuggestionId}>
          {teacherSuggestions.map((teacher) => (
            <option key={`${teacher.value}-${teacher.label}`} value={teacher.label || teacher.value} />
          ))}
        </datalist>

        <div style={styles.classBoard}>
          {days.map((day) => (
            <div key={day.id} style={styles.classDayCard}>
              <div style={styles.classDayHeader}>
                <span>{day.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
                  {activeClassLabel || "Class"}
                </span>
              </div>
              <div style={styles.editorRows}>
                {periods.map((period) => {
                  const slotKey = buildSlotKey(day.id, period.id);
                  const entry = classTimetable.entries?.[slotKey] || {
                    subject: "",
                    teacherName: "",
                    teacherUsername: "",
                    room: "",
                    note: "",
                  };

                  if (isSharedTimetablePeriod(period)) {
                    return (
                      <div key={slotKey} style={styles.breakRow}>
                        <div style={styles.slotMeta}>
                          <div style={styles.slotTitle}>{period.label}</div>
                          <div style={styles.slotSub}>{slotLabel(period)}</div>
                        </div>
                        <div style={styles.emptyCell}>
                          {period.type === "break"
                            ? "Shared break period. No class lesson is assigned here."
                            : "Shared whole-school activity period. No class lesson is assigned here."}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={slotKey} style={styles.editorRow}>
                      <div style={styles.slotMeta}>
                        <div style={styles.slotTitle}>{period.label}</div>
                        <div style={styles.slotSub}>{slotLabel(period)}</div>
                      </div>
                      <select
                        style={styles.select}
                        value={entry.subject}
                        onChange={(event) => updateClassEntry(slotKey, "subject", event.target.value)}
                        disabled={!canEditClass}
                      >
                        <option value="">Select subject</option>
                        {(classData?.subjects || []).map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                      <input
                        style={styles.input}
                        list={teacherSuggestionId}
                        value={entry.teacherName}
                        onChange={(event) => updateClassEntry(slotKey, "teacherName", event.target.value)}
                        disabled={!canEditClass}
                        placeholder="Teacher"
                      />
                      <input
                        style={styles.input}
                        value={entry.room}
                        onChange={(event) => updateClassEntry(slotKey, "room", event.target.value)}
                        disabled={!canEditClass}
                        placeholder="Room"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
                ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.headingRow}>
          <div style={styles.headingBlock}>
            <div style={styles.title}>Teacher Availability</div>
            <div style={styles.sub}>
              Mark slots when a selected teacher should not be assigned. These become schedule warnings across all classes.
            </div>
          </div>
          {canEditGlobal ? (
            <div style={styles.helper}>Toggle unavailable slots, then save school timetable.</div>
          ) : (
            <div style={styles.helper}>Only administrators can edit teacher availability.</div>
          )}
        </div>

        {(teacherLoadSummary.length || teacherSuggestions.length) ? (
          <div style={styles.teacherGrid}>
            <div style={styles.teacherSelectCard}>
              <div style={styles.statLabel}>Teacher</div>
              <select
                style={styles.select}
                value={selectedTeacherKey}
                onChange={(event) => setSelectedTeacherKey(event.target.value)}
              >
                {Array.from(
                  new Set([
                    ...teacherLoadSummary.map((entry) => entry.teacherKey),
                    ...teacherSuggestions.map((entry) => String(entry.value || "").trim().toLowerCase()).filter(Boolean),
                  ])
                ).map((teacherKey) => (
                  <option key={`avail-${teacherKey}`} value={teacherKey}>
                    {teacherOptionMap.get(teacherKey)
                      || teacherLoadSummary.find((entry) => entry.teacherKey === teacherKey)?.teacherName
                      || teacherKey}
                  </option>
                ))}
              </select>
              <div style={styles.helper}>
                {selectedTeacherUnavailableSlots.length} unavailable slot{selectedTeacherUnavailableSlots.length === 1 ? "" : "s"} marked for {selectedTeacherDisplayName || "this teacher"}.
              </div>
            </div>

            <div style={styles.board}>
              {days.map((day) => (
                <div key={`availability-${day.id}`} style={styles.dayCard}>
                  <div style={styles.dayHeader}>{day.label}</div>
                  <div style={styles.dayBody}>
                    {periods.map((period) => {
                      const slotKey = buildSlotKey(day.id, period.id);
                      const active = selectedTeacherUnavailableSlots.includes(slotKey);
                      return (
                        <div key={`availability-${slotKey}`} style={styles.slotRow}>
                          <div style={styles.slotMeta}>
                            <div style={styles.slotTitle}>{period.label}</div>
                            <div style={styles.slotSub}>{slotLabel(period)}</div>
                          </div>
                          {isSharedTimetablePeriod(period) ? (
                            <div style={styles.emptyCell}>{period.label || "Shared school activity"}</div>
                          ) : (
                            <button
                              type="button"
                              style={styles.unavailableToggle(active)}
                              onClick={() => toggleTeacherUnavailableSlot(slotKey)}
                              disabled={!canEditGlobal}
                            >
                              {active ? "Unavailable" : "Available"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.emptyCell}>Teacher availability can be configured once teacher accounts exist.</div>
        )}
      </section>

      <div style={styles.printOnly} data-print-holder>
        <section style={styles.printDoc} data-print-doc="master">
          <div style={styles.printDocHeader}>
            <div style={styles.printDocTitle}>{schoolSettings?.schoolName || "School Timetable"}</div>
            <div style={styles.printDocSub}>GENERAL TIMETABLE</div>
            <div style={styles.printDocSub}>
              {schoolSettings?.academicYear || schoolSettings?.year || "Current Academic Year"}
            </div>
          </div>
          <table style={styles.printTable}>
            <thead>
              <tr>
                <th style={styles.printHeadCell}>DAY</th>
                <th style={styles.printHeadCell}>FORM</th>
                <th style={styles.printHeadCell}>STREAM</th>
                {periods.map((period) => (
                  <th key={`print-master-head-${period.id}`} style={styles.printHeadCell}>
                    {slotHeader(period)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {masterTimetableByDay.map((day) => {
                let dayRendered = false;
                let previousForm = "";
                let remainingFormRows = 0;
                return day.classes.map((cls, classIndex) => {
                  const isFirstRowOfDay = !dayRendered;
                  const isFirstRowOfForm = cls.form !== previousForm || remainingFormRows <= 0;
                  if (isFirstRowOfForm) {
                    previousForm = cls.form;
                    remainingFormRows = day.formCounts[cls.form] || 1;
                  }
                  remainingFormRows -= 1;
                  dayRendered = true;

                  return (
                    <tr key={`print-master-${day.id}-${cls.id || classIndex}`}>
                      {isFirstRowOfDay ? (
                        <td style={styles.printCell} rowSpan={day.rowCount}>{day.label}</td>
                      ) : null}
                      {isFirstRowOfForm ? (
                        <td style={styles.printCell} rowSpan={day.formCounts[cls.form] || 1}>{printCellText(cls.form)}</td>
                      ) : null}
                      <td style={styles.printCell}>{printCellText(cls.year)}</td>
                      {periods.map((period) => {
                        const slotKey = buildSlotKey(day.id, period.id);
                        if (isSharedTimetablePeriod(period)) {
                          if (!isFirstRowOfDay) return null;
                          return (
                            <td key={`print-master-shared-${day.id}-${period.id}`} style={styles.printCell} rowSpan={day.rowCount}>
                              {printCellText(period.label)}
                            </td>
                          );
                        }
                        const entry = cls.entries?.[slotKey];
                        return (
                          <td key={`print-master-cell-${day.id}-${cls.id}-${period.id}`} style={styles.printCell}>
                            {entry?.subject ? (
                              <>
                                <div style={{ fontWeight: 800 }}>{entry.subject}</div>
                                <div>{[entry.teacherName || entry.teacherUsername, entry.room].filter(Boolean).join(" | ")}</div>
                              </>
                            ) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </section>

        <section style={styles.printDoc} data-print-doc="class">
          <div style={styles.printDocHeader}>
            <div style={styles.printDocTitle}>{schoolSettings?.schoolName || "School Timetable"}</div>
            <div style={styles.printDocSub}>CLASS TIMETABLE</div>
            <div style={styles.printDocSub}>{activeClassLabel || "Class"}</div>
          </div>
          <table style={styles.printTable}>
            <thead>
              <tr>
                <th style={styles.printHeadCell}>DAY</th>
                {periods.map((period) => (
                  <th key={`print-class-head-${period.id}`} style={styles.printHeadCell}>
                    {slotHeader(period)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classPrintMatrix.map((day) => (
                <tr key={`print-class-${day.id}`}>
                  <td style={styles.printRowHeader}>{day.label}</td>
                  {day.slots.map(({ period, entry }) => (
                    <td key={`print-class-cell-${day.id}-${period.id}`} style={styles.printCell}>
                      {isSharedTimetablePeriod(period)
                        ? printCellText(period.label)
                        : entry?.subject
                        ? `${entry.subject}${entry.room ? ` | ${entry.room}` : ""}`
                        : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={styles.printDoc} data-print-doc="teacher">
          <div style={styles.printDocHeader}>
            <div style={styles.printDocTitle}>{schoolSettings?.schoolName || "School Timetable"}</div>
            <div style={styles.printDocSub}>TEACHER TIMETABLE</div>
            <div style={styles.printDocSub}>{selectedTeacherDisplayName || "Teacher"}</div>
          </div>
          <table style={styles.printTable}>
            <thead>
              <tr>
                <th style={styles.printHeadCell}>DAY</th>
                {periods.map((period) => (
                  <th key={`print-teacher-head-${period.id}`} style={styles.printHeadCell}>
                    {slotHeader(period)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teacherPrintMatrix.map((day) => (
                <tr key={`print-teacher-${day.id}`}>
                  <td style={styles.printRowHeader}>{day.label}</td>
                  {day.slots.map(({ period, entries, unavailable }) => (
                    <td key={`print-teacher-cell-${day.id}-${period.id}`} style={styles.printCell}>
                      {isSharedTimetablePeriod(period)
                        ? printCellText(period.label)
                        : entries.length
                        ? entries.map((entry) => `${entry.classLabel}: ${entry.subject}${entry.room ? ` | ${entry.room}` : ""}`).join(" / ")
                        : unavailable
                        ? "UNAVAILABLE"
                        : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
