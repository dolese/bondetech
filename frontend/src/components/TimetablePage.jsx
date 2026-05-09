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

function slotRange(period) {
  const range = [period.start, period.end].filter(Boolean).join(" - ");
  return range || period.label;
}

function ensureSubjectTargets(timetable, subjects = []) {
  const normalized = normalizeClassTimetable(timetable);
  const existing = new Map((normalized.subjectTargets || []).map((item) => [item.subject, item]));
  return {
    ...normalized,
    subjectTargets: (subjects || []).map((subject) => ({
      subject,
      periodsPerWeek: existing.get(subject)?.periodsPerWeek || 0,
      teacherName: existing.get(subject)?.teacherName || "",
      teacherUsername: existing.get(subject)?.teacherUsername || "",
      room: existing.get(subject)?.room || "",
    })),
  };
}

function buildTeacherSuggestions(entries) {
  return (entries || [])
    .map((entry) => ({
      key: String(entry.username || entry.name || "").trim().toLowerCase(),
      value: entry.username || entry.name || "",
      label: entry.name || entry.username || "",
      phone: entry.phone || "",
      badge: entry.badge || "",
      subtitle: entry.subtitle || "",
    }))
    .filter((entry) => entry.key && (entry.value || entry.label));
}

function groupMasterRows(days, periods, classes) {
  return days.map((day) => {
    const dayClasses = classes.map((cls) => {
      const timetable = normalizeClassTimetable(cls?.timetable);
      return {
        id: cls.id,
        form: cls.form || "",
        year: cls.year || "",
        classLabel: normalizeClassLabel(cls),
        entries: timetable.entries || {},
      };
    });
    const formCounts = dayClasses.reduce((acc, entry) => {
      acc[entry.form] = (acc[entry.form] || 0) + 1;
      return acc;
    }, {});
    return {
      ...day,
      classes: dayClasses,
      periods,
      rowCount: dayClasses.length || 1,
      formCounts,
    };
  });
}

function buildTeacherSchedule(days, periods, classes, selectedTeacherKey) {
  return days.map((day) => ({
    ...day,
    slots: periods.map((period) => {
      const slotKey = buildSlotKey(day.id, period.id);
      const entries = [];
      (classes || []).forEach((cls) => {
        const timetable = normalizeClassTimetable(cls?.timetable);
        const entry = timetable.entries?.[slotKey];
        const teacherKey = String(entry?.teacherUsername || entry?.teacherName || "").trim().toLowerCase();
        if (!teacherKey || teacherKey !== selectedTeacherKey) return;
        entries.push({
          classLabel: normalizeClassLabel(cls),
          subject: entry.subject || "",
          room: entry.room || "",
        });
      });
      return { period, slotKey, entries };
    }),
  }));
}

function tableCellText(value) {
  const text = String(value || "").trim();
  return text || "-";
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
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingClass, setSavingClass] = useState(false);

  useEffect(() => {
    setGlobalTimetable(normalizeTimetableSettings(schoolSettings?.timetable));
  }, [schoolSettings]);

  useEffect(() => {
    setClassTimetable(ensureSubjectTargets(classData?.timetable, classData?.subjects || []));
  }, [classData?.id, classData?.timetable, classData?.subjects]);

  const normalizedGlobalTimetable = useMemo(
    () => normalizeTimetableSettings(globalTimetable),
    [globalTimetable]
  );
  const days = useMemo(() => getEnabledTimetableDays(normalizedGlobalTimetable), [normalizedGlobalTimetable]);
  const periods = useMemo(() => normalizedGlobalTimetable.periods, [normalizedGlobalTimetable]);
  const sortedClasses = useMemo(() => [...(allClasses || [])].sort(compareClasses), [allClasses]);
  const teacherSuggestions = useMemo(() => buildTeacherSuggestions(teacherEntries), [teacherEntries]);
  const teacherLoadSummary = useMemo(() => buildTeacherLoadSummary(allClasses || []), [allClasses]);
  const subjectLoadSummary = useMemo(
    () => buildSubjectLoadSummary({ ...classData, timetable: classTimetable }),
    [classData, classTimetable]
  );
  const unmetSubjectTargets = useMemo(
    () => subjectLoadSummary.filter((item) => item.target > item.assigned),
    [subjectLoadSummary]
  );
  const teacherConflicts = useMemo(() => detectTeacherConflicts(allClasses || []), [allClasses]);
  const roomConflicts = useMemo(() => detectRoomConflicts(allClasses || []), [allClasses]);
  const availabilityConflicts = useMemo(
    () => detectTeacherAvailabilityConflicts(allClasses || [], normalizedGlobalTimetable),
    [allClasses, normalizedGlobalTimetable]
  );
  const activeClassLabel = useMemo(
    () => [classData?.form, classData?.year].filter(Boolean).join(" "),
    [classData]
  );
  const teacherLoadMap = useMemo(
    () => new Map(teacherLoadSummary.map((entry) => [entry.teacherKey, entry])),
    [teacherLoadSummary]
  );
  const masterRows = useMemo(
    () => groupMasterRows(days, periods, sortedClasses),
    [days, periods, sortedClasses]
  );
  const teacherDirectoryRows = useMemo(() => {
    return teacherSuggestions.map((teacher) => ({
      ...teacher,
      periods: teacherLoadMap.get(teacher.key)?.periods || 0,
      classCount: teacherLoadMap.get(teacher.key)?.classes?.length || 0,
      unavailableCount: normalizedGlobalTimetable.teacherAvailability?.[teacher.key]?.length || 0,
    }));
  }, [normalizedGlobalTimetable, teacherLoadMap, teacherSuggestions]);
  const streamRows = useMemo(
    () =>
      sortedClasses.map((cls) => {
        const timetable = normalizeClassTimetable(cls?.timetable);
        const lessonCount = Object.values(timetable.entries || {}).filter((entry) => entry.subject).length;
        return {
          id: cls.id,
          form: cls.form || "",
          stream: cls.year || "",
          classLabel: normalizeClassLabel(cls),
          subjectCount: (cls.subjects || []).length,
          lessonCount,
        };
      }),
    [sortedClasses]
  );

  useEffect(() => {
    const keys = teacherDirectoryRows.map((row) => row.key).filter(Boolean);
    if (!keys.length) {
      setSelectedTeacherKey("");
      return;
    }
    if (!keys.includes(selectedTeacherKey)) {
      setSelectedTeacherKey(keys[0]);
    }
  }, [selectedTeacherKey, teacherDirectoryRows]);

  const selectedTeacherSchedule = useMemo(
    () => buildTeacherSchedule(days, periods, allClasses || [], selectedTeacherKey),
    [allClasses, days, periods, selectedTeacherKey]
  );
  const selectedTeacherUnavailable = useMemo(
    () => normalizedGlobalTimetable.teacherAvailability?.[selectedTeacherKey] || [],
    [normalizedGlobalTimetable, selectedTeacherKey]
  );
  const selectedTeacherRow = useMemo(
    () => teacherDirectoryRows.find((row) => row.key === selectedTeacherKey) || null,
    [selectedTeacherKey, teacherDirectoryRows]
  );
  const teacherSuggestionId = `timetable-teacher-list-${classData?.id || "class"}`;

  const styles = {
    page: {
      minHeight: 0,
      overflowY: "auto",
      padding: isMobile ? 12 : 18,
      display: "grid",
      gap: 16,
      background: "#f3f6fa",
    },
    section: {
      background: "#fff",
      border: "1px solid #d7e1ec",
      borderRadius: 14,
      padding: isMobile ? 12 : 16,
      display: "grid",
      gap: 12,
    },
    headerRow: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    titleBlock: {
      display: "grid",
      gap: 4,
    },
    title: {
      fontSize: isMobile ? 18 : 22,
      fontWeight: 900,
      color: "#0f172a",
    },
    sub: {
      fontSize: 13,
      color: "#52627b",
      lineHeight: 1.5,
    },
    actionRow: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
    },
    button: {
      height: 38,
      padding: "0 14px",
      borderRadius: 10,
      border: "1px solid #c7d4e4",
      background: "#0f766e",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
    },
    secondaryButton: {
      height: 36,
      padding: "0 12px",
      borderRadius: 10,
      border: "1px solid #c7d4e4",
      background: "#fff",
      color: "#0f172a",
      fontWeight: 700,
      cursor: "pointer",
    },
    helper: {
      fontSize: 12,
      color: "#64748b",
    },
    statsRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, minmax(0, 1fr))",
      gap: 10,
    },
    stat: {
      border: "1px solid #d7e1ec",
      borderRadius: 12,
      padding: "10px 12px",
      display: "grid",
      gap: 4,
      background: "#fbfdff",
    },
    statLabel: {
      fontSize: 11,
      fontWeight: 800,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 900,
      color: "#0f172a",
      lineHeight: 1,
    },
    twoCol: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
      gap: 16,
      alignItems: "start",
    },
    stack: {
      display: "grid",
      gap: 14,
    },
    tableWrap: {
      width: "100%",
      overflowX: "auto",
      border: "1px solid #d7e1ec",
      borderRadius: 12,
    },
    table: {
      width: "100%",
      minWidth: 720,
      borderCollapse: "collapse",
      background: "#fff",
    },
    compactTable: {
      width: "100%",
      borderCollapse: "collapse",
      background: "#fff",
    },
    headCell: {
      borderBottom: "1px solid #d7e1ec",
      borderRight: "1px solid #e6edf5",
      padding: "8px 10px",
      textAlign: "left",
      background: "#f5f8fc",
      fontSize: 12,
      fontWeight: 900,
      color: "#334155",
      whiteSpace: "nowrap",
    },
    bodyCell: {
      borderBottom: "1px solid #edf2f7",
      borderRight: "1px solid #f1f5f9",
      padding: "8px 10px",
      fontSize: 12,
      color: "#0f172a",
      verticalAlign: "top",
    },
    axisCell: {
      borderBottom: "1px solid #edf2f7",
      borderRight: "1px solid #e6edf5",
      padding: "8px 10px",
      fontSize: 12,
      fontWeight: 800,
      color: "#0f172a",
      background: "#fafcff",
      verticalAlign: "top",
      whiteSpace: "nowrap",
    },
    sharedCell: {
      borderBottom: "1px solid #edf2f7",
      borderRight: "1px solid #e6edf5",
      padding: "8px 10px",
      fontSize: 12,
      fontWeight: 800,
      color: "#0f172a",
      background: "#f8fcf7",
      textAlign: "center",
      verticalAlign: "middle",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    input: {
      width: "100%",
      minWidth: 0,
      height: 34,
      border: "1px solid #c7d4e4",
      borderRadius: 8,
      padding: "0 10px",
      fontSize: 13,
      background: "#fff",
      boxSizing: "border-box",
    },
    select: {
      width: "100%",
      minWidth: 0,
      height: 34,
      border: "1px solid #c7d4e4",
      borderRadius: 8,
      padding: "0 10px",
      fontSize: 13,
      background: "#fff",
      boxSizing: "border-box",
    },
    checkboxRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
    },
    checkboxLabel: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      color: "#0f172a",
      fontWeight: 700,
    },
    conflictBox: {
      border: "1px solid #fed7aa",
      borderRadius: 10,
      background: "#fff7ed",
      padding: "10px 12px",
      display: "grid",
      gap: 6,
    },
    okayBox: {
      border: "1px solid #bbf7d0",
      borderRadius: 10,
      background: "#f0fdf4",
      padding: "10px 12px",
      color: "#166534",
      fontWeight: 700,
      fontSize: 13,
    },
    note: {
      fontSize: 11,
      color: "#64748b",
    },
  };

  const updatePeriod = (periodId, field, value) => {
    setGlobalTimetable((prev) => ({
      ...normalizeTimetableSettings(prev),
      periods: normalizeTimetableSettings(prev).periods.map((period) =>
        period.id === periodId ? { ...period, [field]: value } : period
      ),
    }));
  };

  const addPeriod = () => {
    setGlobalTimetable((prev) => {
      const current = normalizeTimetableSettings(prev);
      const lessonCount = current.periods.filter((period) => period.type === "lesson").length + 1;
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

  const updateClassEntry = (slotKey, field, value) => {
    setClassTimetable((prev) => {
      const nextEntries = { ...(prev.entries || {}) };
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
        const target = (prev.subjectTargets || []).find((item) => item.subject === value);
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
        const matched = teacherSuggestions.find(
          (item) =>
            item.value.toLowerCase() === String(value || "").trim().toLowerCase()
            || item.label.toLowerCase() === String(value || "").trim().toLowerCase()
        );
        nextEntry.teacherUsername = matched?.value || "";
        nextEntry.teacherName = matched?.label || String(value || "").trim();
      }
      if (
        !nextEntry.subject
        && !nextEntry.teacherName
        && !nextEntry.teacherUsername
        && !nextEntry.room
        && !nextEntry.note
      ) {
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
        if (field === "periodsPerWeek") {
          const numeric = Math.max(0, Number(value || 0));
          return { ...target, periodsPerWeek: Number.isFinite(numeric) ? numeric : 0 };
        }
        if (field === "teacherName") {
          const matched = teacherSuggestions.find(
            (item) =>
              item.value.toLowerCase() === String(value || "").trim().toLowerCase()
              || item.label.toLowerCase() === String(value || "").trim().toLowerCase()
          );
          return {
            ...target,
            teacherName: matched?.label || String(value || "").trim(),
            teacherUsername: matched?.value || "",
          };
        }
        return { ...target, [field]: value };
      }),
    }));
  };

  const toggleTeacherUnavailableSlot = (slotKey) => {
    if (!canEditGlobal || !selectedTeacherKey) return;
    setGlobalTimetable((prev) => {
      const normalized = normalizeTimetableSettings(prev);
      const current = normalized.teacherAvailability?.[selectedTeacherKey] || [];
      const next = current.includes(slotKey)
        ? current.filter((item) => item !== slotKey)
        : [...current, slotKey];
      return {
        ...normalized,
        teacherAvailability: {
          ...(normalized.teacherAvailability || {}),
          [selectedTeacherKey]: next,
        },
      };
    });
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

  const handleSaveClass = async () => {
    if (!canEditClass || !onUpdateTimetable) return;
    setSavingClass(true);
    try {
      await onUpdateTimetable(classTimetable);
    } finally {
      setSavingClass(false);
    }
  };

  return (
    <div style={styles.page}>
      <section style={styles.section}>
        <div style={styles.headerRow}>
          <div style={styles.titleBlock}>
            <div style={styles.title}>Timetable Setup</div>
            <div style={styles.sub}>
              Clean timetable workflow: define periods and active days, review teachers and streams, set subject targets, then build the class timetable from one shared structure.
            </div>
          </div>
          <div style={styles.actionRow}>
            {canEditGlobal ? (
              <button style={styles.secondaryButton} onClick={handleSaveGlobal} disabled={savingGlobal}>
                {savingGlobal ? "Saving School..." : "Save School Setup"}
              </button>
            ) : null}
            {canEditClass ? (
              <button style={styles.button} onClick={handleSaveClass} disabled={savingClass}>
                {savingClass ? "Saving Class..." : `Save ${activeClassLabel || "Class"} Timetable`}
              </button>
            ) : null}
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Days</div>
            <div style={styles.statValue}>{days.length}</div>
            <div style={styles.note}>Enabled teaching days.</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Lesson Periods</div>
            <div style={styles.statValue}>{periods.filter((period) => period.type === "lesson").length}</div>
            <div style={styles.note}>Periods that accept subject entries.</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Teachers</div>
            <div style={styles.statValue}>{teacherDirectoryRows.length}</div>
            <div style={styles.note}>Teacher and academic accounts available.</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Streams</div>
            <div style={styles.statValue}>{streamRows.length}</div>
            <div style={styles.note}>Classes available for scheduling.</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Conflicts</div>
            <div style={styles.statValue}>{teacherConflicts.length + roomConflicts.length + availabilityConflicts.length}</div>
            <div style={styles.note}>Teacher, room, and availability issues.</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Unmet Targets</div>
            <div style={styles.statValue}>{unmetSubjectTargets.length}</div>
            <div style={styles.note}>Subjects still below weekly target.</div>
          </div>
        </div>
      </section>

      <div style={styles.twoCol}>
        <section style={styles.section}>
          <div style={styles.titleBlock}>
            <div style={styles.title}>School Time Setup</div>
            <div style={styles.sub}>These settings apply to the whole school timetable.</div>
          </div>

          <div style={styles.stack}>
            <div>
              <div style={{ ...styles.statLabel, marginBottom: 8 }}>Active Days</div>
              <div style={styles.checkboxRow}>
                {normalizedGlobalTimetable.days.map((day) => (
                  <label key={day.id} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={() => toggleDay(day.id)}
                      disabled={!canEditGlobal}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.headCell}>Label</th>
                    <th style={styles.headCell}>Start</th>
                    <th style={styles.headCell}>End</th>
                    <th style={styles.headCell}>Type</th>
                    <th style={styles.headCell}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedGlobalTimetable.periods.map((period) => (
                    <tr key={period.id}>
                      <td style={styles.bodyCell}>
                        <input
                          style={styles.input}
                          value={period.label}
                          onChange={(event) => updatePeriod(period.id, "label", event.target.value)}
                          disabled={!canEditGlobal}
                        />
                      </td>
                      <td style={styles.bodyCell}>
                        <input
                          style={styles.input}
                          value={period.start}
                          onChange={(event) => updatePeriod(period.id, "start", event.target.value)}
                          disabled={!canEditGlobal}
                        />
                      </td>
                      <td style={styles.bodyCell}>
                        <input
                          style={styles.input}
                          value={period.end}
                          onChange={(event) => updatePeriod(period.id, "end", event.target.value)}
                          disabled={!canEditGlobal}
                        />
                      </td>
                      <td style={styles.bodyCell}>
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
                      </td>
                      <td style={styles.bodyCell}>
                        <button style={styles.secondaryButton} onClick={() => removePeriod(period.id)} disabled={!canEditGlobal}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEditGlobal ? (
              <div style={styles.actionRow}>
                <button style={styles.secondaryButton} onClick={addPeriod}>Add Period</button>
              </div>
            ) : null}
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.titleBlock}>
            <div style={styles.title}>Conflict Check</div>
            <div style={styles.sub}>Pure logic review of teacher, room, and availability issues.</div>
          </div>

          {teacherConflicts.length || roomConflicts.length || availabilityConflicts.length ? (
            <div style={styles.stack}>
              {teacherConflicts.map((conflict, index) => (
                <div key={`teacher-conflict-${index}`} style={styles.conflictBox}>
                  <strong>Teacher conflict:</strong>
                  <div>{conflict.teacherName} is assigned to more than one class in {conflict.slotKey}.</div>
                </div>
              ))}
              {roomConflicts.map((conflict, index) => (
                <div key={`room-conflict-${index}`} style={styles.conflictBox}>
                  <strong>Room conflict:</strong>
                  <div>{conflict.room} is used by more than one class in {conflict.slotKey}.</div>
                </div>
              ))}
              {availabilityConflicts.map((conflict, index) => (
                <div key={`availability-conflict-${index}`} style={styles.conflictBox}>
                  <strong>Availability conflict:</strong>
                  <div>{conflict.teacherName} is marked unavailable but still assigned to {conflict.classLabel} in {conflict.slotKey}.</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.okayBox}>No timetable conflicts detected in the current saved data.</div>
          )}
        </section>
      </div>

      <div style={styles.twoCol}>
        <section style={styles.section}>
          <div style={styles.titleBlock}>
            <div style={styles.title}>Teacher Setup</div>
            <div style={styles.sub}>Teachers available for timetable assignment are taken from user accounts already created by admin.</div>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.compactTable}>
              <thead>
                <tr>
                  <th style={styles.headCell}>Teacher</th>
                  <th style={styles.headCell}>Account</th>
                  <th style={styles.headCell}>Weekly Load</th>
                  <th style={styles.headCell}>Classes</th>
                  <th style={styles.headCell}>Unavailable Slots</th>
                </tr>
              </thead>
              <tbody>
                {teacherDirectoryRows.length ? (
                  teacherDirectoryRows.map((teacher) => (
                    <tr key={teacher.key}>
                      <td style={styles.bodyCell}>
                        <div style={{ fontWeight: 800 }}>{teacher.label}</div>
                        <div style={styles.note}>{teacher.subtitle || teacher.badge}</div>
                      </td>
                      <td style={styles.bodyCell}>{tableCellText(teacher.value)}</td>
                      <td style={styles.bodyCell}>{teacher.periods}</td>
                      <td style={styles.bodyCell}>{teacher.classCount}</td>
                      <td style={styles.bodyCell}>{teacher.unavailableCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={styles.bodyCell} colSpan={5}>No teacher accounts available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.titleBlock}>
            <div style={styles.title}>Available Streams</div>
            <div style={styles.sub}>These are the class streams currently available for the school timetable.</div>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.compactTable}>
              <thead>
                <tr>
                  <th style={styles.headCell}>Form</th>
                  <th style={styles.headCell}>Stream</th>
                  <th style={styles.headCell}>Subjects</th>
                  <th style={styles.headCell}>Assigned Lessons</th>
                </tr>
              </thead>
              <tbody>
                {streamRows.length ? (
                  streamRows.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.bodyCell}>{tableCellText(row.form)}</td>
                      <td style={styles.bodyCell}>{tableCellText(row.stream)}</td>
                      <td style={styles.bodyCell}>{row.subjectCount}</td>
                      <td style={styles.bodyCell}>{row.lessonCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={styles.bodyCell} colSpan={4}>No streams available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section style={styles.section}>
        <div style={styles.titleBlock}>
          <div style={styles.title}>{activeClassLabel || "Class"} Subject Setup</div>
          <div style={styles.sub}>Set the subjects, target periods, preferred teacher, and room for this class.</div>
        </div>

        <datalist id={teacherSuggestionId}>
          {teacherSuggestions.map((teacher) => (
            <option key={`${teacher.key}-${teacher.value}`} value={teacher.label || teacher.value} />
          ))}
        </datalist>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.headCell}>Subject</th>
                <th style={styles.headCell}>Target / Week</th>
                <th style={styles.headCell}>Assigned</th>
                <th style={styles.headCell}>Preferred Teacher</th>
                <th style={styles.headCell}>Room</th>
              </tr>
            </thead>
            <tbody>
              {(classTimetable.subjectTargets || []).map((target) => {
                const summary = subjectLoadSummary.find((item) => item.subject === target.subject);
                return (
                  <tr key={target.subject}>
                    <td style={styles.bodyCell}>
                      <strong>{target.subject}</strong>
                    </td>
                    <td style={styles.bodyCell}>
                      <input
                        type="number"
                        min="0"
                        style={styles.input}
                        value={target.periodsPerWeek}
                        onChange={(event) => updateSubjectTarget(target.subject, "periodsPerWeek", event.target.value)}
                        disabled={!canEditClass}
                      />
                    </td>
                    <td style={styles.bodyCell}>
                      {summary?.assigned || 0}
                      {summary?.target > summary?.assigned ? (
                        <div style={{ ...styles.note, color: "#b45309" }}>
                          Need {summary.target - summary.assigned} more
                        </div>
                      ) : null}
                    </td>
                    <td style={styles.bodyCell}>
                      <input
                        style={styles.input}
                        list={teacherSuggestionId}
                        value={target.teacherName}
                        onChange={(event) => updateSubjectTarget(target.subject, "teacherName", event.target.value)}
                        disabled={!canEditClass}
                      />
                    </td>
                    <td style={styles.bodyCell}>
                      <input
                        style={styles.input}
                        value={target.room}
                        onChange={(event) => updateSubjectTarget(target.subject, "room", event.target.value)}
                        disabled={!canEditClass}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.titleBlock}>
          <div style={styles.title}>{activeClassLabel || "Class"} Timetable Editor</div>
          <div style={styles.sub}>Use the clean day tables below to assign subject, teacher, and room for this class.</div>
        </div>

        <div style={styles.stack}>
          {days.map((day) => (
            <div key={day.id} style={styles.tableWrap}>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.headCell} colSpan={4}>{day.label}</th>
                  </tr>
                  <tr>
                    <th style={styles.headCell}>Time</th>
                    <th style={styles.headCell}>Subject / Activity</th>
                    <th style={styles.headCell}>Teacher</th>
                    <th style={styles.headCell}>Room</th>
                  </tr>
                </thead>
                <tbody>
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
                        <tr key={slotKey}>
                          <td style={styles.axisCell}>{slotRange(period)}</td>
                          <td style={styles.sharedCell} colSpan={3}>{period.label || "Shared Activity"}</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={slotKey}>
                        <td style={styles.axisCell}>{slotRange(period)}</td>
                        <td style={styles.bodyCell}>
                          <select
                            style={styles.select}
                            value={entry.subject}
                            onChange={(event) => updateClassEntry(slotKey, "subject", event.target.value)}
                            disabled={!canEditClass}
                          >
                            <option value="">Select subject</option>
                            {(classData?.subjects || []).map((subject) => (
                              <option key={subject} value={subject}>{subject}</option>
                            ))}
                          </select>
                        </td>
                        <td style={styles.bodyCell}>
                          <input
                            style={styles.input}
                            list={teacherSuggestionId}
                            value={entry.teacherName}
                            onChange={(event) => updateClassEntry(slotKey, "teacherName", event.target.value)}
                            disabled={!canEditClass}
                          />
                        </td>
                        <td style={styles.bodyCell}>
                          <input
                            style={styles.input}
                            value={entry.room}
                            onChange={(event) => updateClassEntry(slotKey, "room", event.target.value)}
                            disabled={!canEditClass}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.twoCol}>
        <section style={styles.section}>
          <div style={styles.headerRow}>
            <div style={styles.titleBlock}>
              <div style={styles.title}>Teacher Availability Setup</div>
              <div style={styles.sub}>Choose one teacher, then mark slots that teacher should not teach.</div>
            </div>
            <select
              style={{ ...styles.select, width: isMobile ? "100%" : 260 }}
              value={selectedTeacherKey}
              onChange={(event) => setSelectedTeacherKey(event.target.value)}
            >
              {teacherDirectoryRows.map((teacher) => (
                <option key={teacher.key} value={teacher.key}>{teacher.label}</option>
              ))}
            </select>
          </div>

          {selectedTeacherRow ? (
            <>
              <div style={styles.helper}>
                {selectedTeacherRow.label} currently has {selectedTeacherRow.unavailableCount} blocked slot{selectedTeacherRow.unavailableCount === 1 ? "" : "s"}.
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.compactTable}>
                  <thead>
                    <tr>
                      <th style={styles.headCell}>Time</th>
                      {days.map((day) => (
                        <th key={`availability-${day.id}`} style={styles.headCell}>{day.shortLabel || day.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((period) => (
                      <tr key={`availability-row-${period.id}`}>
                        <td style={styles.axisCell}>{slotRange(period)}</td>
                        {days.map((day) => {
                          const slotKey = buildSlotKey(day.id, period.id);
                          const active = selectedTeacherUnavailable.includes(slotKey);
                          return (
                            <td key={slotKey} style={styles.bodyCell}>
                              {isSharedTimetablePeriod(period) ? (
                                <span style={styles.note}>{period.label}</span>
                              ) : (
                                <button
                                  style={{
                                    ...styles.secondaryButton,
                                    width: "100%",
                                    background: active ? "#fee2e2" : "#fff",
                                    color: active ? "#991b1b" : "#0f172a",
                                    borderColor: active ? "#fca5a5" : "#c7d4e4",
                                  }}
                                  onClick={() => toggleTeacherUnavailableSlot(slotKey)}
                                  disabled={!canEditGlobal}
                                >
                                  {active ? "Unavailable" : "Available"}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={styles.okayBox}>No teacher selected.</div>
          )}
        </section>

        <section style={styles.section}>
          <div style={styles.titleBlock}>
            <div style={styles.title}>Teacher Timetable View</div>
            <div style={styles.sub}>Read-only weekly view for the selected teacher.</div>
          </div>

          {selectedTeacherRow ? (
            <div style={styles.tableWrap}>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.headCell}>Day</th>
                    <th style={styles.headCell}>Time</th>
                    <th style={styles.headCell}>Assignment</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeacherSchedule.flatMap((day) =>
                    day.slots.map((slot, index) => {
                      const unavailable = selectedTeacherUnavailable.includes(slot.slotKey);
                      return (
                        <tr key={`${day.id}-${slot.slotKey}`}>
                          {index === 0 ? (
                            <td style={styles.axisCell} rowSpan={day.slots.length}>{day.label}</td>
                          ) : null}
                          <td style={styles.axisCell}>{slotRange(slot.period)}</td>
                          <td style={styles.bodyCell}>
                            {isSharedTimetablePeriod(slot.period)
                              ? slot.period.label
                              : slot.entries.length
                              ? slot.entries.map((entry) => `${entry.classLabel}: ${entry.subject}${entry.room ? ` | ${entry.room}` : ""}`).join(" / ")
                              : unavailable
                              ? "Unavailable"
                              : "Free"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.okayBox}>Choose a teacher to inspect the weekly timetable.</div>
          )}
        </section>
      </div>

      <section style={styles.section}>
        <div style={styles.titleBlock}>
          <div style={styles.title}>School General Timetable</div>
          <div style={styles.sub}>Master table grouped by day, form, and stream using the same school-wide structure.</div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.headCell}>Day</th>
                <th style={styles.headCell}>Form</th>
                <th style={styles.headCell}>Stream</th>
                {periods.map((period) => (
                  <th key={`head-${period.id}`} style={styles.headCell}>{slotRange(period)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {masterRows.flatMap((day) => {
                let dayRendered = false;
                let previousForm = "";
                let remainingFormRows = 0;
                return day.classes.map((cls, index) => {
                  const firstDayRow = !dayRendered;
                  const firstFormRow = cls.form !== previousForm || remainingFormRows <= 0;
                  if (firstFormRow) {
                    previousForm = cls.form;
                    remainingFormRows = day.formCounts[cls.form] || 1;
                  }
                  remainingFormRows -= 1;
                  dayRendered = true;

                  return (
                    <tr key={`${day.id}-${cls.id || index}`}>
                      {firstDayRow ? (
                        <td style={styles.axisCell} rowSpan={day.rowCount}>{day.label}</td>
                      ) : null}
                      {firstFormRow ? (
                        <td style={styles.axisCell} rowSpan={day.formCounts[cls.form] || 1}>{tableCellText(cls.form)}</td>
                      ) : null}
                      <td style={styles.axisCell}>{tableCellText(cls.year)}</td>
                      {periods.map((period) => {
                        const slotKey = buildSlotKey(day.id, period.id);
                        if (isSharedTimetablePeriod(period)) {
                          if (!firstDayRow) return null;
                          return (
                            <td key={`${day.id}-${period.id}`} style={styles.sharedCell} rowSpan={day.rowCount}>
                              {tableCellText(period.label)}
                            </td>
                          );
                        }
                        const entry = cls.entries?.[slotKey];
                        return (
                          <td key={`${cls.id}-${slotKey}`} style={styles.bodyCell}>
                            {entry?.subject ? (
                              <>
                                <div style={{ fontWeight: 800 }}>{entry.subject}</div>
                                <div style={styles.note}>
                                  {[entry.teacherName || entry.teacherUsername, entry.room].filter(Boolean).join(" | ")}
                                </div>
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
        </div>
      </section>
    </div>
  );
}
