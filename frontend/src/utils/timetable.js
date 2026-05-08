export const DEFAULT_TIMETABLE_DAYS = [
  { id: "monday", label: "Monday", shortLabel: "Mon", enabled: true },
  { id: "tuesday", label: "Tuesday", shortLabel: "Tue", enabled: true },
  { id: "wednesday", label: "Wednesday", shortLabel: "Wed", enabled: true },
  { id: "thursday", label: "Thursday", shortLabel: "Thu", enabled: true },
  { id: "friday", label: "Friday", shortLabel: "Fri", enabled: true },
];

export const DEFAULT_TIMETABLE_PERIODS = [
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
    type: type === "break" ? "break" : "lesson",
  };
}

export function normalizeTimetableSettings(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const inputDays = Array.isArray(source.days) ? source.days : [];
  const inputPeriods = Array.isArray(source.periods) ? source.periods : [];

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
  };
}

export function buildSlotKey(dayId, periodId) {
  return `${String(dayId || "").trim()}__${String(periodId || "").trim()}`;
}

export function normalizeTimetableEntry(entry = {}) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    subject: String(source.subject || "").trim(),
    teacherName: String(source.teacherName || source.teacher_name || "").trim(),
    teacherUsername: String(source.teacherUsername || source.teacher_username || "").trim(),
    room: String(source.room || "").trim(),
    note: String(source.note || "").trim(),
  };
}

export function normalizeClassTimetable(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const rawEntries = source.entries && typeof source.entries === "object" ? source.entries : {};
  const entries = {};
  Object.entries(rawEntries).forEach(([slotKey, value]) => {
    const normalized = normalizeTimetableEntry(value);
    if (normalized.subject || normalized.teacherName || normalized.teacherUsername || normalized.room || normalized.note) {
      entries[String(slotKey).trim()] = normalized;
    }
  });
  return { entries };
}

export function getEnabledTimetableDays(settings = {}) {
  return normalizeTimetableSettings(settings).days.filter((day) => day.enabled);
}

export function getLessonPeriods(settings = {}) {
  return normalizeTimetableSettings(settings).periods.filter((period) => period.type !== "break");
}

export function detectTeacherConflicts(classes = []) {
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
