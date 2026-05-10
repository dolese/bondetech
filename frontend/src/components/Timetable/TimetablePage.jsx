import React, { useEffect, useMemo, useState } from "react";
import {
  buildSubjectLoadSummary,
  buildTeacherLoadSummary,
  buildRoomLoadSummary,
  buildSlotKey,
  detectTeacherAvailabilityConflicts,
  detectTeacherConflicts,
  detectRoomConflicts,
  getEnabledTimetableDays,
  normalizeClassTimetable,
  normalizeTimetableSettings,
} from "../../utils/timetable";

import { StatsPanel } from "./StatsPanel";
import { ConflictWarnings } from "./ConflictWarnings";
import { TimetableSettings } from "./TimetableSettings";
import { TimetableGrid } from "./TimetableGrid";
import { TeacherViews } from "./TeacherViews";
import { MasterTimetable } from "./MasterTimetable";
import "./Timetable.css";
import { useI18n } from "../../i18n";

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

function buildDerivedRooms(classes = [], subjectTargets = []) {
  const rooms = new Map();

  (subjectTargets || []).forEach((target) => {
    const roomName = String(target.room || "").trim();
    if (!roomName) return;
    rooms.set(roomName.toLowerCase(), {
      id: `derived-${roomName.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`,
      name: roomName,
      type: "",
      capacity: "",
    });
  });

  (classes || []).forEach((cls) => {
    const timetable = normalizeClassTimetable(cls?.timetable);
    Object.values(timetable.entries || {}).forEach((entry) => {
      const roomName = String(entry.room || "").trim();
      if (!roomName) return;
      rooms.set(roomName.toLowerCase(), {
        id: `derived-${roomName.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`,
        name: roomName,
        type: "",
        capacity: "",
      });
    });
  });

  return Array.from(rooms.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeEditableRoom(room = {}) {
  const source = room && typeof room === "object" ? room : {};
  return {
    id: String(source.id || `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).trim(),
    name: String(source.name || source.label || "").trim(),
    type: String(source.type || "").trim(),
    capacity: String(source.capacity || "").trim(),
  };
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

export function TimetablePage({
  classData,
  allClasses,
  schoolSettings,
  teacherEntries,
  role,
  onSaveSchoolSettings,
  onUpdateTimetable,
}) {
  const { t } = useI18n();
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
  const editableRooms = useMemo(
    () => (Array.isArray(globalTimetable?.rooms) ? globalTimetable.rooms : []).map((room) => normalizeEditableRoom(room)),
    [globalTimetable]
  );
  const derivedRooms = useMemo(
    () => buildDerivedRooms(allClasses || [], classTimetable.subjectTargets || []),
    [allClasses, classTimetable.subjectTargets]
  );
  const roomDirectoryRows = useMemo(() => {
    const configuredNamedRooms = editableRooms.filter((room) => room.name);
    const usageRows = buildRoomLoadSummary(allClasses || [], [...configuredNamedRooms, ...derivedRooms]);
    const usageById = new Map(usageRows.map((room) => [room.id, room]));
    const usageByName = new Map(usageRows.map((room) => [String(room.name || "").trim().toLowerCase(), room]));

    const configuredRows = editableRooms.map((room) => {
      const roomNameKey = String(room.name || "").trim().toLowerCase();
      const usage = usageById.get(room.id) || (roomNameKey ? usageByName.get(roomNameKey) : null);
      return {
        ...room,
        isConfigured: true,
        periods: usage?.periods || 0,
        classCount: usage?.classCount || 0,
      };
    });

    const configuredIds = new Set(configuredRows.map((room) => room.id));
    const configuredNames = new Set(
      configuredRows
        .map((room) => String(room.name || "").trim().toLowerCase())
        .filter(Boolean)
    );

    const derivedOnlyRows = usageRows
      .filter((room) => {
        const roomNameKey = String(room.name || "").trim().toLowerCase();
        return !configuredIds.has(room.id) && !configuredNames.has(roomNameKey);
      })
      .map((room) => ({
        ...room,
        isConfigured: false,
      }));

    return [...configuredRows, ...derivedOnlyRows];
  }, [allClasses, derivedRooms, editableRooms]);
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
  const roomSuggestionId = `timetable-room-list-${classData?.id || "class"}`;
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

  const updateRoom = (roomId, field, value) => {
    setGlobalTimetable((prev) => ({
      ...(prev || {}),
      rooms: (Array.isArray(prev?.rooms) ? prev.rooms : []).map((room) =>
        room.id === roomId ? { ...room, [field]: value } : room
      ),
    }));
  };

  const addRoom = () => {
    setGlobalTimetable((prev) => ({
      ...(prev || {}),
      rooms: [
        ...(Array.isArray(prev?.rooms) ? prev.rooms : []),
        {
          id: `room-${Date.now()}`,
          name: "",
          type: "",
          capacity: "",
        },
      ],
    }));
  };

  const removeRoom = (roomId) => {
    setGlobalTimetable((prev) => ({
      ...(prev || {}),
      rooms: (Array.isArray(prev?.rooms) ? prev.rooms : []).filter((room) => room.id !== roomId),
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

  const statsProps = {
    days: days.length,
    lessonPeriods: periods.filter((period) => period.type === "lesson").length,
    teachers: teacherDirectoryRows.length,
    rooms: roomDirectoryRows.length,
    streams: streamRows.length,
    conflicts: teacherConflicts.length + roomConflicts.length + availabilityConflicts.length,
    unmetTargets: unmetSubjectTargets.length,
  };

  return (
    <div className="tt-page">
      <section className="tt-section">
        <div className="tt-header-row">
          <div className="tt-title-block">
            <div className="tt-title">{t("ttSetupTitle", "Timetable Setup")}</div>
            <div className="tt-sub">
              {t("ttSetupSub", "Clean timetable workflow: define periods and active days, review teachers and streams, set subject targets, then build the class timetable from one shared structure.")}
            </div>
          </div>
          <div className="tt-action-row">
            {canEditGlobal ? (
              <button className="tt-secondary-button" onClick={handleSaveGlobal} disabled={savingGlobal}>
                {savingGlobal ? t("ttSavingSchool", "Saving School...") : t("ttSaveSchoolSetup", "Save School Setup")}
              </button>
            ) : null}
            {canEditClass ? (
              <button className="tt-button" onClick={handleSaveClass} disabled={savingClass}>
                {savingClass ? t("ttSavingClass", "Saving Class...") : t("ttSaveClassTimetable", "Save {classLabel} Timetable", { classLabel: activeClassLabel || t("ttClass", "Class") })}
              </button>
            ) : null}
          </div>
        </div>

        <StatsPanel stats={statsProps} />
      </section>

      <TimetableSettings
        canEditGlobal={canEditGlobal}
        normalizedGlobalTimetable={normalizedGlobalTimetable}
        toggleDay={toggleDay}
        updatePeriod={updatePeriod}
        addPeriod={addPeriod}
        removePeriod={removePeriod}
        teacherDirectoryRows={teacherDirectoryRows}
        roomDirectoryRows={roomDirectoryRows}
        updateRoom={updateRoom}
        addRoom={addRoom}
        removeRoom={removeRoom}
        streamRows={streamRows}
      />

      <ConflictWarnings
        teacherConflicts={teacherConflicts}
        roomConflicts={roomConflicts}
        availabilityConflicts={availabilityConflicts}
      />

      <TimetableGrid
        activeClassLabel={activeClassLabel}
        canEditClass={canEditClass}
        classTimetable={classTimetable}
        classData={classData}
        subjectLoadSummary={subjectLoadSummary}
        teacherSuggestionId={teacherSuggestionId}
        teacherSuggestions={teacherSuggestions}
        roomSuggestionId={roomSuggestionId}
        roomDirectoryRows={roomDirectoryRows}
        updateSubjectTarget={updateSubjectTarget}
        updateClassEntry={updateClassEntry}
        days={days}
        periods={periods}
      />

      <TeacherViews
        canEditGlobal={canEditGlobal}
        days={days}
        periods={periods}
        teacherDirectoryRows={teacherDirectoryRows}
        selectedTeacherKey={selectedTeacherKey}
        setSelectedTeacherKey={setSelectedTeacherKey}
        selectedTeacherRow={selectedTeacherRow}
        selectedTeacherUnavailable={selectedTeacherUnavailable}
        toggleTeacherUnavailableSlot={toggleTeacherUnavailableSlot}
        selectedTeacherSchedule={selectedTeacherSchedule}
      />

      <MasterTimetable masterRows={masterRows} periods={periods} />
    </div>
  );
}
