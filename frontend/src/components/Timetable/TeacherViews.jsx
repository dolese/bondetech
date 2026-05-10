import React from "react";
import { buildSlotKey, isSharedTimetablePeriod } from "../../utils/timetable";
import { useViewport } from "../../utils/useViewport";
import "./Timetable.css";
import { useI18n } from "../../i18n";

function slotRange(period) {
  const range = [period.start, period.end].filter(Boolean).join(" - ");
  return range || period.label;
}

export function TeacherViews({
  canEditGlobal,
  days,
  periods,
  teacherDirectoryRows,
  selectedTeacherKey,
  setSelectedTeacherKey,
  selectedTeacherRow,
  selectedTeacherUnavailable,
  toggleTeacherUnavailableSlot,
  selectedTeacherSchedule,
}) {
  const { isMobile } = useViewport();
  const { t } = useI18n();

  return (
    <div className="tt-two-col">
      <section className="tt-section">
        <div className="tt-header-row">
          <div className="tt-title-block">
            <div className="tt-title">{t("ttTeacherAvailabilitySetup", "Teacher Availability Setup")}</div>
            <div className="tt-sub">{t("ttTeacherAvailabilitySetupSub", "Choose one teacher, then mark slots that teacher should not teach.")}</div>
          </div>
          <select
            className="tt-select"
            style={{ width: isMobile ? "100%" : 260 }}
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
            <div className="tt-helper">
              {t("ttTeacherBlockedSlots", "{name} currently has {count} blocked slot{suffix}.", { name: selectedTeacherRow.label, count: selectedTeacherRow.unavailableCount, suffix: selectedTeacherRow.unavailableCount === 1 ? "" : "s" })}
            </div>
            <div className="tt-table-wrap">
              <table className="tt-compact-table">
                <thead>
                  <tr>
                    <th className="tt-head-cell">{t("ttTime", "Time")}</th>
                    {days.map((day) => (
                      <th key={`availability-${day.id}`} className="tt-head-cell">{day.shortLabel || day.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={`availability-row-${period.id}`}>
                      <td className="tt-axis-cell">{slotRange(period)}</td>
                      {days.map((day) => {
                        const slotKey = buildSlotKey(day.id, period.id);
                        const active = selectedTeacherUnavailable.includes(slotKey);
                        return (
                          <td key={slotKey} className="tt-body-cell">
                            {isSharedTimetablePeriod(period) ? (
                              <span className="tt-note">{period.label}</span>
                            ) : (
                              <button
                                className="tt-secondary-button"
                                style={{
                                  width: "100%",
                                  background: active ? "#fee2e2" : "#fff",
                                  color: active ? "#991b1b" : "#0f172a",
                                  borderColor: active ? "#fca5a5" : "#c7d4e4",
                                }}
                                onClick={() => toggleTeacherUnavailableSlot(slotKey)}
                                disabled={!canEditGlobal}
                              >
                                 {active ? t("ttUnavailable", "Unavailable") : t("ttAvailable", "Available")}
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
           <div className="tt-okay-box">{t("ttNoTeacherSelected", "No teacher selected.")}</div>
        )}
      </section>

      <section className="tt-section">
        <div className="tt-title-block">
          <div className="tt-title">{t("ttTeacherTimetableView", "Teacher Timetable View")}</div>
          <div className="tt-sub">{t("ttTeacherTimetableViewSub", "Read-only weekly view for the selected teacher.")}</div>
        </div>

        {selectedTeacherRow ? (
          <div className="tt-table-wrap">
            <table className="tt-compact-table">
              <thead>
                <tr>
                  <th className="tt-head-cell">{t("ttDay", "Day")}</th>
                  <th className="tt-head-cell">{t("ttTime", "Time")}</th>
                  <th className="tt-head-cell">{t("ttAssignment", "Assignment")}</th>
                </tr>
              </thead>
              <tbody>
                {selectedTeacherSchedule.flatMap((day) =>
                  day.slots.map((slot, index) => {
                    const unavailable = selectedTeacherUnavailable.includes(slot.slotKey);
                    return (
                      <tr key={`${day.id}-${slot.slotKey}`}>
                        {index === 0 ? (
                          <td className="tt-axis-cell" rowSpan={day.slots.length}>{day.label}</td>
                        ) : null}
                        <td className="tt-axis-cell">{slotRange(slot.period)}</td>
                        <td className="tt-body-cell">
                          {isSharedTimetablePeriod(slot.period)
                            ? slot.period.label
                            : slot.entries.length
                            ? slot.entries.map((entry) => `${entry.classLabel}: ${entry.subject}${entry.room ? ` | ${entry.room}` : ""}`).join(" / ")
                            : unavailable
                            ? t("ttUnavailable", "Unavailable")
                            : t("ttFree", "Free")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
           <div className="tt-okay-box">{t("ttChooseTeacherInspect", "Choose a teacher to inspect the weekly timetable.")}</div>
        )}
      </section>
    </div>
  );
}
