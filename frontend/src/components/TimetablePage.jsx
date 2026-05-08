import React, { useEffect, useMemo, useState } from "react";
import { useViewport } from "../utils/useViewport";
import {
  buildSlotKey,
  detectTeacherConflicts,
  getEnabledTimetableDays,
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

function buildTeacherSuggestions(entries) {
  return (entries || [])
    .map((entry) => ({
      value: entry.username || entry.name || "",
      label: entry.name || entry.username || "",
    }))
    .filter((entry) => entry.value || entry.label);
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
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingClass, setSavingClass] = useState(false);

  useEffect(() => {
    setGlobalTimetable(normalizeTimetableSettings(schoolSettings?.timetable));
  }, [schoolSettings]);

  useEffect(() => {
    setClassTimetable(normalizeClassTimetable(classData?.timetable));
  }, [classData?.id, classData?.timetable]);

  const days = useMemo(() => getEnabledTimetableDays(globalTimetable), [globalTimetable]);
  const periods = useMemo(() => normalizeTimetableSettings(globalTimetable).periods, [globalTimetable]);
  const teacherSuggestions = useMemo(() => buildTeacherSuggestions(teacherEntries), [teacherEntries]);
  const teacherSuggestionId = `teacher-suggestions-${classData?.id || "class"}`;

  const conflicts = useMemo(() => detectTeacherConflicts(allClasses || []), [allClasses]);
  const activeClassLabel = [classData?.form, classData?.year].filter(Boolean).join(" ");

  const generalOverview = useMemo(() => {
    const slots = {};
    (allClasses || []).forEach((cls) => {
      const timetable = normalizeClassTimetable(cls?.timetable);
      Object.entries(timetable.entries).forEach(([slotKey, entry]) => {
        if (!entry.subject) return;
        if (!slots[slotKey]) slots[slotKey] = [];
        slots[slotKey].push({
          classLabel: [cls.form, cls.year].filter(Boolean).join(" "),
          subject: entry.subject,
          teacherName: entry.teacherName || entry.teacherUsername,
          room: entry.room,
        });
      });
    });
    return slots;
  }, [allClasses]);

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
      return { entries: nextEntries };
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
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
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
  };

  return (
    <div style={styles.page}>
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
            <div style={styles.statValue}>{periods.filter((period) => period.type !== "break").length}</div>
            <div style={styles.helper}>Only lesson periods accept subject and teacher assignments.</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Teacher Conflicts</div>
            <div style={{ ...styles.statValue, color: conflicts.length ? "#b45309" : "#0f766e" }}>{conflicts.length}</div>
            <div style={styles.helper}>Detected across all classes for the same day and period.</div>
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
                  These are whole-school timetable slots. Class timetables reuse these day and period definitions.
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
                The first timetable rule enforced here is teacher availability across classes in the same slot.
              </div>
            </div>

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
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.headingBlock}>
          <div style={styles.title}>School General Timetable Overview</div>
          <div style={styles.sub}>
            This is the master view across all classes, grouped by day and period from the currently saved class timetables.
          </div>
        </div>

        <div style={styles.board}>
          {days.map((day) => (
            <div key={day.id} style={styles.dayCard}>
              <div style={styles.dayHeader}>{day.label}</div>
              <div style={styles.dayBody}>
                {periods.map((period) => {
                  const slotKey = buildSlotKey(day.id, period.id);
                  const occupancy = generalOverview[slotKey] || [];
                  return (
                    <div key={slotKey} style={styles.slotRow}>
                      <div style={styles.slotMeta}>
                        <div style={styles.slotTitle}>{period.label}</div>
                        <div style={styles.slotSub}>{slotLabel(period)}</div>
                      </div>
                      {period.type === "break" ? (
                        <div style={styles.emptyCell}>Break slot</div>
                      ) : occupancy.length ? (
                        <div style={styles.occupancy}>
                          {occupancy.map((entry, index) => (
                            <div key={`${slotKey}-${entry.classLabel}-${index}`} style={styles.badge}>
                              <div style={styles.badgeTitle}>{entry.classLabel || "Class"}</div>
                              <div style={styles.badgeSub}>{entry.subject || "Unassigned subject"}</div>
                              <div style={styles.badgeSub}>
                                {[entry.teacherName, entry.room].filter(Boolean).join(" | ") || "Teacher/room not set"}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={styles.emptyCell}>No class scheduled here yet.</div>
                      )}
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
            <div style={styles.title}>{activeClassLabel || "Class"} Timetable</div>
            <div style={styles.sub}>
              Edit one class timetable against the shared school structure. Break rows stay fixed; lesson rows take subject, teacher, and room.
            </div>
          </div>
          {!canEditClass && <div style={styles.helper}>Read-only for your current role.</div>}
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

                  if (period.type === "break") {
                    return (
                      <div key={slotKey} style={styles.breakRow}>
                        <div style={styles.slotMeta}>
                          <div style={styles.slotTitle}>{period.label}</div>
                          <div style={styles.slotSub}>{slotLabel(period)}</div>
                        </div>
                        <div style={styles.emptyCell}>Shared break period. No class lesson is assigned here.</div>
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
    </div>
  );
}
