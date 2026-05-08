const DEFAULT_TIMETABLE_DAYS = [
  { id: "monday", label: "Monday", shortLabel: "Mon", enabled: true },
  { id: "tuesday", label: "Tuesday", shortLabel: "Tue", enabled: true },
  { id: "wednesday", label: "Wednesday", shortLabel: "Wed", enabled: true },
  { id: "thursday", label: "Thursday", shortLabel: "Thu", enabled: true },
  { id: "friday", label: "Friday", shortLabel: "Fri", enabled: true },
];

const DEFAULT_TIMETABLE_PERIODS = [
  { id: "period-1", label: "Period 1", shortLabel: "P1", start: "07:30", end: "08:10", type: "lesson" },
  { id: "period-2", label: "Period 2", shortLabel: "P2", start: "08:10", end: "08:50", type: "lesson" },
  { id: "short-break", label: "Break", shortLabel: "BR", start: "08:50", end: "09:10", type: "break" },
  { id: "period-3", label: "Period 3", shortLabel: "P3", start: "09:10", end: "09:50", type: "lesson" },
  { id: "period-4", label: "Period 4", shortLabel: "P4", start: "09:50", end: "10:30", type: "lesson" },
  { id: "lunch", label: "Lunch", shortLabel: "LN", start: "10:30", end: "11:00", type: "break" },
  { id: "period-5", label: "Period 5", shortLabel: "P5", start: "11:00", end: "11:40", type: "lesson" },
  { id: "period-6", label: "Period 6", shortLabel: "P6", start: "11:40", end: "12:20", type: "lesson" },
  { id: "period-7", label: "Period 7", shortLabel: "P7", start: "12:20", end: "13:00", type: "lesson" },
];

function normalizeDay(day = {}, fallback = {}) {
  const source = day && typeof day === "object" ? day : {};
  return {
    id: String(source.id || fallback.id || "").trim(),
    label: String(source.label || fallback.label || "").trim(),
    shortLabel: String(source.shortLabel || source.short_label || fallback.shortLabel || fallback.short_label || "").trim(),
    enabled: source.enabled !== false,
  };
}

function normalizePeriod(period = {}, fallback = {}) {
  const source = period && typeof period === "object" ? period : {};
  const type = String(source.type || fallback.type || "lesson").trim().toLowerCase();
  return {
    id: String(source.id || fallback.id || "").trim(),
    label: String(source.label || fallback.label || "").trim(),
    shortLabel: String(source.shortLabel || source.short_label || fallback.shortLabel || fallback.short_label || "").trim(),
    start: String(source.start || fallback.start || "").trim(),
    end: String(source.end || fallback.end || "").trim(),
    type: type === "break" || type === "shared" ? type : "lesson",
  };
}

function normalizeTimetableSettings(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const inputDays = Array.isArray(source.days) ? source.days : [];
  const inputPeriods = Array.isArray(source.periods) ? source.periods : [];
  const rawTeacherAvailability =
    source.teacherAvailability && typeof source.teacherAvailability === "object"
      ? source.teacherAvailability
      : source.teacher_availability && typeof source.teacher_availability === "object"
      ? source.teacher_availability
      : {};

  const days = DEFAULT_TIMETABLE_DAYS.map((fallback) => {
    const override = inputDays.find((item) => String(item?.id || "").trim() === fallback.id);
    return normalizeDay(override, fallback);
  }).filter((day) => day.id && day.label);

  const extraDays = inputDays
    .filter((item) => !days.some((day) => day.id === String(item?.id || "").trim()))
    .map((item) => normalizeDay(item))
    .filter((day) => day.id && day.label);

  const periods = DEFAULT_TIMETABLE_PERIODS.map((fallback) => {
    const override = inputPeriods.find((item) => String(item?.id || "").trim() === fallback.id);
    return normalizePeriod(override, fallback);
  }).filter((period) => period.id && period.label);

  const extraPeriods = inputPeriods
    .filter((item) => !periods.some((period) => period.id === String(item?.id || "").trim()))
    .map((item) => normalizePeriod(item))
    .filter((period) => period.id && period.label);

  return {
    days: [...days, ...extraDays],
    periods: [...periods, ...extraPeriods],
    teacherAvailability: Object.fromEntries(
      Object.entries(rawTeacherAvailability).map(([teacherKey, slots]) => [
        String(teacherKey || "").trim().toLowerCase(),
        Array.isArray(slots)
          ? slots.map((slot) => String(slot || "").trim()).filter(Boolean)
          : [],
      ])
    ),
  };
}

function buildSlotKey(dayId, periodId) {
  return `${String(dayId || "").trim()}__${String(periodId || "").trim()}`;
}

function normalizeTimetableEntry(entry = {}) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    subject: String(source.subject || "").trim(),
    teacherName: String(source.teacherName || source.teacher_name || "").trim(),
    teacherUsername: String(source.teacherUsername || source.teacher_username || "").trim(),
    room: String(source.room || "").trim(),
    note: String(source.note || "").trim(),
  };
}

function normalizeSubjectTarget(target = {}, fallback = {}) {
  const source = target && typeof target === "object" ? target : {};
  const periodsPerWeek = Number(source.periodsPerWeek ?? source.periods_per_week ?? fallback.periodsPerWeek ?? 0);
  return {
    subject: String(source.subject || fallback.subject || "").trim(),
    periodsPerWeek: Number.isFinite(periodsPerWeek) && periodsPerWeek > 0 ? periodsPerWeek : 0,
    teacherName: String(source.teacherName || source.teacher_name || fallback.teacherName || "").trim(),
    teacherUsername: String(source.teacherUsername || source.teacher_username || fallback.teacherUsername || "").trim(),
    room: String(source.room || fallback.room || "").trim(),
  };
}

function normalizeClassTimetable(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const rawEntries = source.entries && typeof source.entries === "object" ? source.entries : {};
  const rawSubjectTargets = Array.isArray(source.subjectTargets)
    ? source.subjectTargets
    : Array.isArray(source.subject_targets)
    ? source.subject_targets
    : [];
  const entries = {};
  Object.entries(rawEntries).forEach(([slotKey, value]) => {
    const normalized = normalizeTimetableEntry(value);
    if (normalized.subject || normalized.teacherName || normalized.teacherUsername || normalized.room || normalized.note) {
      entries[String(slotKey).trim()] = normalized;
    }
  });
  const subjectTargets = rawSubjectTargets
    .map((target) => normalizeSubjectTarget(target))
    .filter((target) => target.subject);
  return { entries, subjectTargets };
}

function detectTeacherConflicts(classes = []) {
  const slotTeacherMap = new Map();

  classes.forEach((cls) => {
    const timetable = normalizeClassTimetable(cls?.timetable);
    Object.entries(timetable.entries).forEach(([slotKey, entry]) => {
      const teacherKey = String(entry.teacherUsername || entry.teacherName || "").trim().toLowerCase();
      if (!teacherKey) return;
      const combinedKey = `${slotKey}::${teacherKey}`;
      const items = slotTeacherMap.get(combinedKey) || [];
      items.push({
        classId: cls.id,
        classLabel: [cls.form, cls.year].filter(Boolean).join(" "),
        subject: entry.subject,
        teacherName: entry.teacherName || entry.teacherUsername,
      });
      slotTeacherMap.set(combinedKey, items);
    });
  });

  return Array.from(slotTeacherMap.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([combinedKey, entries]) => {
      const [slotKey] = combinedKey.split("::");
      return {
        type: "teacher",
        slotKey,
        teacherName: entries[0].teacherName,
        classes: entries,
      };
    });
}

function detectRoomConflicts(classes = []) {
  const slotRoomMap = new Map();

  classes.forEach((cls) => {
    const timetable = normalizeClassTimetable(cls?.timetable);
    Object.entries(timetable.entries).forEach(([slotKey, entry]) => {
      const roomKey = String(entry.room || "").trim().toLowerCase();
      if (!roomKey) return;
      const combinedKey = `${slotKey}::${roomKey}`;
      const items = slotRoomMap.get(combinedKey) || [];
      items.push({
        classId: cls.id,
        classLabel: [cls.form, cls.year].filter(Boolean).join(" "),
        subject: entry.subject,
        room: entry.room,
      });
      slotRoomMap.set(combinedKey, items);
    });
  });

  return Array.from(slotRoomMap.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([combinedKey, entries]) => {
      const [slotKey] = combinedKey.split("::");
      return {
        type: "room",
        slotKey,
        room: entries[0].room,
        classes: entries,
      };
    });
}

function buildTeacherLoadSummary(classes = []) {
  const map = new Map();
  classes.forEach((cls) => {
    const timetable = normalizeClassTimetable(cls?.timetable);
    Object.values(timetable.entries).forEach((entry) => {
      const key = String(entry.teacherUsername || entry.teacherName || "").trim().toLowerCase();
      if (!key) return;
      const current = map.get(key) || {
        teacherKey: key,
        teacherName: entry.teacherName || entry.teacherUsername,
        periods: 0,
        classes: new Map(),
      };
      current.periods += 1;
      const classLabel = [cls.form, cls.year].filter(Boolean).join(" ");
      current.classes.set(classLabel, (current.classes.get(classLabel) || 0) + 1);
      map.set(key, current);
    });
  });

  return Array.from(map.values())
    .map((entry) => ({
      teacherKey: entry.teacherKey,
      teacherName: entry.teacherName,
      periods: entry.periods,
      classes: Array.from(entry.classes.entries()).map(([classLabel, count]) => ({ classLabel, count })),
    }))
    .sort((a, b) => b.periods - a.periods || a.teacherName.localeCompare(b.teacherName));
}

function detectTeacherAvailabilityConflicts(classes = [], settings = {}) {
  const availability = normalizeTimetableSettings(settings).teacherAvailability || {};
  const conflicts = [];

  classes.forEach((cls) => {
    const timetable = normalizeClassTimetable(cls?.timetable);
    Object.entries(timetable.entries).forEach(([slotKey, entry]) => {
      const teacherKey = String(entry.teacherUsername || entry.teacherName || "").trim().toLowerCase();
      if (!teacherKey || !Array.isArray(availability[teacherKey])) return;
      if (!availability[teacherKey].includes(slotKey)) return;
      conflicts.push({
        type: "availability",
        slotKey,
        teacherName: entry.teacherName || entry.teacherUsername,
        classLabel: [cls.form, cls.year].filter(Boolean).join(" "),
        subject: entry.subject,
      });
    });
  });

  return conflicts;
}

module.exports = {
  DEFAULT_TIMETABLE_DAYS,
  DEFAULT_TIMETABLE_PERIODS,
  normalizeTimetableSettings,
  normalizeClassTimetable,
  buildSlotKey,
  detectTeacherConflicts,
  detectRoomConflicts,
  buildTeacherLoadSummary,
  detectTeacherAvailabilityConflicts,
};
