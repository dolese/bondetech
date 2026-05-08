import React, { useState } from "react";
import { buildSlotKey, isSharedTimetablePeriod } from "../utils/timetable";

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
      <path d="M5 3l.765 2.325a1 1 0 00.51.51L8.6 6.6l-2.325.765a1 1 0 00-.51.51L5 10.2l-.765-2.325a1 1 0 00-.51-.51L1.4 6.6l2.325-.765a1 1 0 00.51-.51L5 3z" />
    </svg>
  );
}

function slotDay(slotKey) {
  return String(slotKey || "").split("__")[0] || "";
}

function normalizeEntryPatch(target) {
  return {
    subject: String(target.subject || "").trim(),
    teacherName: String(target.teacherName || "").trim(),
    teacherUsername: String(target.teacherUsername || "").trim(),
    room: String(target.room || "").trim(),
    note: "",
  };
}

function countTeacherAssignmentsByDay(classes, currentClassId, draftEntries, teacherKey) {
  const counts = {};

  (classes || []).forEach((cls) => {
    const entries = cls?.id === currentClassId ? draftEntries : cls?.timetable?.entries || {};
    Object.entries(entries || {}).forEach(([slotKey, entry]) => {
      const entryTeacherKey = String(entry?.teacherUsername || entry?.teacherName || "").trim().toLowerCase();
      if (!entryTeacherKey || entryTeacherKey !== teacherKey) return;
      const dayId = slotDay(slotKey);
      counts[dayId] = (counts[dayId] || 0) + 1;
    });
  });

  return counts;
}

function countSubjectAssignmentsByDay(entries, subject) {
  const counts = {};
  Object.entries(entries || {}).forEach(([slotKey, entry]) => {
    if (String(entry?.subject || "").trim() !== subject) return;
    const dayId = slotDay(slotKey);
    counts[dayId] = (counts[dayId] || 0) + 1;
  });
  return counts;
}

function buildSlotMetaMap(days, periods) {
  const map = {};
  days.forEach((day, dayIndex) => {
    periods.forEach((period, periodIndex) => {
      const slotKey = buildSlotKey(day.id, period.id);
      map[slotKey] = {
        dayId: day.id,
        dayIndex,
        periodIndex,
        period,
      };
    });
  });
  return map;
}

function hasAdjacentSameSubject(draftEntries, slotMetaMap, slotKey, subject) {
  const current = slotMetaMap[slotKey];
  if (!current) return false;

  return Object.entries(draftEntries || {}).some(([otherSlotKey, entry]) => {
    if (String(entry?.subject || "").trim() !== subject) return false;
    const otherMeta = slotMetaMap[otherSlotKey];
    if (!otherMeta || otherMeta.dayId !== current.dayId) return false;
    return Math.abs(otherMeta.periodIndex - current.periodIndex) === 1;
  });
}

function roomHasConflict(classes, currentClassId, draftEntries, slotKey, room) {
  const roomKey = String(room || "").trim().toLowerCase();
  if (!roomKey) return false;

  return (classes || []).some((cls) => {
    const entries = cls?.id === currentClassId ? draftEntries : cls?.timetable?.entries || {};
    const entry = entries?.[slotKey];
    if (!entry) return false;
    return String(entry.room || "").trim().toLowerCase() === roomKey;
  });
}

function teacherHasConflict(classes, currentClassId, draftEntries, slotKey, teacherKey) {
  if (!teacherKey) return false;

  return (classes || []).some((cls) => {
    const entries = cls?.id === currentClassId ? draftEntries : cls?.timetable?.entries || {};
    const entry = entries?.[slotKey];
    if (!entry) return false;
    return String(entry.teacherUsername || entry.teacherName || "").trim().toLowerCase() === teacherKey;
  });
}

function scoreCandidate({
  slotKey,
  target,
  draftEntries,
  slotMetaMap,
  allClasses,
  classId,
  globalTimetable,
}) {
  const teacherKey = String(target.teacherUsername || target.teacherName || "").trim().toLowerCase();
  const unavailable = teacherKey ? globalTimetable?.teacherAvailability?.[teacherKey] || [] : [];
  if (unavailable.includes(slotKey)) return null;
  if (teacherHasConflict(allClasses, classId, draftEntries, slotKey, teacherKey)) return null;
  if (roomHasConflict(allClasses, classId, draftEntries, slotKey, target.room)) return null;

  const subjectDayCounts = countSubjectAssignmentsByDay(draftEntries, target.subject);
  const teacherDayCounts = countTeacherAssignmentsByDay(allClasses, classId, draftEntries, teacherKey);
  const dayId = slotMetaMap[slotKey]?.dayId || "";
  const sameDaySubjectCount = subjectDayCounts[dayId] || 0;
  const teacherDayLoad = teacherDayCounts[dayId] || 0;
  const adjacencyPenalty = hasAdjacentSameSubject(draftEntries, slotMetaMap, slotKey, target.subject) ? 18 : 0;

  let score = 100;
  score -= sameDaySubjectCount * 24;
  score -= teacherDayLoad * 5;
  score -= adjacencyPenalty;
  if (target.teacherName || target.teacherUsername) score += 8;
  if (target.room) score += 4;

  const meta = slotMetaMap[slotKey];
  if (meta && meta.periodIndex <= 1) score -= 4;
  if (meta && meta.periodIndex >= 5) score -= 3;

  return score;
}

export function AITimetableAssistant({
  classData,
  classTimetable,
  unmetSubjectTargets,
  allClasses,
  days,
  periods,
  onApplyEntries,
  globalTimetable,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState("");

  const handleAutoSchedule = () => {
    if (isProcessing || typeof onApplyEntries !== "function") return;
    setIsProcessing(true);
    setLastAction("Optimizing timetable allocations...");

    window.setTimeout(() => {
      const slotMetaMap = buildSlotMetaMap(days, periods);
      const draftEntries = { ...(classTimetable.entries || {}) };
      const appliedEntries = {};
      let assignmentsMade = 0;
      let missedAssignments = 0;

      const targets = [...(unmetSubjectTargets || [])]
        .map((target) => ({
          ...target,
          missing: Math.max(0, Number(target.target || 0) - Number(target.assigned || 0)),
        }))
        .filter((target) => target.missing > 0)
        .sort((a, b) => b.missing - a.missing || a.subject.localeCompare(b.subject));

      targets.forEach((target) => {
        let needed = target.missing;

        while (needed > 0) {
          let bestSlotKey = "";
          let bestScore = -Infinity;

          days.forEach((day) => {
            periods.forEach((period) => {
              if (isSharedTimetablePeriod(period)) return;
              const slotKey = buildSlotKey(day.id, period.id);
              if (draftEntries[slotKey]) return;

              const score = scoreCandidate({
                slotKey,
                target,
                draftEntries,
                slotMetaMap,
                allClasses,
                classId: classData?.id,
                globalTimetable,
              });
              if (score === null) return;
              if (score > bestScore) {
                bestScore = score;
                bestSlotKey = slotKey;
              }
            });
          });

          if (!bestSlotKey) {
            missedAssignments += needed;
            break;
          }

          const nextEntry = normalizeEntryPatch(target);
          draftEntries[bestSlotKey] = nextEntry;
          appliedEntries[bestSlotKey] = nextEntry;
          assignmentsMade += 1;
          needed -= 1;
        }
      });

      if (assignmentsMade > 0) {
        onApplyEntries(appliedEntries);
      }

      setIsProcessing(false);
      if (assignmentsMade === 0) {
        setLastAction("No safe auto-assignment could be made with the current teacher, room, and availability constraints.");
      } else if (missedAssignments > 0) {
        setLastAction(`Assigned ${assignmentsMade} period(s). ${missedAssignments} period(s) still need manual placement.`);
      } else {
        setLastAction(`Successfully optimized and assigned ${assignmentsMade} period(s).`);
      }
      window.setTimeout(() => setLastAction(""), 6000);
    }, 350);
  };

  if (!unmetSubjectTargets || unmetSubjectTargets.length === 0) {
    return (
      <div
        style={{
          padding: "16px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(20,184,166,0.1), rgba(16,185,129,0.05))",
          border: "1px solid rgba(16,185,129,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(16,185,129,0.15)",
          }}
        >
          <SparklesIcon />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#065f46" }}>Schedule Optimized</div>
          <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>
            All subject targets are currently met for this class.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "20px",
        background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(245,243,255,0.9))",
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 24px 48px rgba(139,92,246,0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
            boxShadow: "0 8px 24px rgba(139,92,246,0.3)",
          }}
        >
          <SparklesIcon />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b" }}>AI Timetable Assistant</div>
          <div style={{ fontSize: 13, color: "#4c1d95", marginTop: 4, lineHeight: 1.5 }}>
            I detected <strong>{unmetSubjectTargets.length}</strong> subject{unmetSubjectTargets.length === 1 ? "" : "s"} with
            unassigned periods. I now score available slots using teacher availability, teacher clashes, room clashes, and weekly
            subject spread before placing them.
          </div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.6)",
          borderRadius: "12px",
          padding: "12px",
          border: "1px dashed rgba(139,92,246,0.4)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#6d28d9",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Pending Assignments
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {unmetSubjectTargets.map((target) => (
            <div
              key={target.subject}
              style={{
                padding: "4px 10px",
                borderRadius: "999px",
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.2)",
                fontSize: 12,
                color: "#5b21b6",
                fontWeight: 700,
              }}
            >
              {target.subject} <span style={{ opacity: 0.6 }}>|</span> +{target.target - target.assigned}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 700, fontStyle: "italic", lineHeight: 1.4 }}>
          {lastAction || (isProcessing ? "Optimizing timetable allocations..." : "")}
        </div>
        <button
          onClick={handleAutoSchedule}
          disabled={isProcessing}
          style={{
            background: isProcessing ? "#cbd5e1" : "linear-gradient(135deg, #7c3aed, #db2777)",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 800,
            cursor: isProcessing ? "not-allowed" : "pointer",
            boxShadow: isProcessing ? "none" : "0 8px 24px rgba(219,39,119,0.3)",
            transition: "all 0.2s",
          }}
        >
          {isProcessing ? "Optimizing..." : "Optimize & Assign"}
        </button>
      </div>
    </div>
  );
}
