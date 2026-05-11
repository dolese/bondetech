import React from "react";
import { buildSlotKey, isSharedTimetablePeriod } from "../../utils/timetable";
import { useViewport } from "../../utils/useViewport";
import "./Timetable.css";
import { useI18n } from "../../i18n";

function slotRange(period) {
  const range = [period.start, period.end].filter(Boolean).join(" - ");
  return range || period.label;
}

export function RoomViews({
  days,
  periods,
  roomDirectoryRows,
  selectedRoomKey,
  setSelectedRoomKey,
  selectedRoomRow,
  selectedRoomSchedule,
}) {
  const { isMobile } = useViewport();
  const { t } = useI18n();

  return (
    <section className="tt-section">
      <div className="tt-header-row">
        <div className="tt-title-block">
          <div className="tt-title">{t("ttRoomSchedule", "Room Timetable View")}</div>
          <div className="tt-sub">
            {t(
              "ttRoomScheduleSub",
              "Review one room across the week to spot gaps, overloads, or unexpected shared use.",
            )}
          </div>
        </div>
        <select
          className="tt-select"
          style={{ width: isMobile ? "100%" : 280 }}
          value={selectedRoomKey}
          onChange={(event) => setSelectedRoomKey(event.target.value)}
        >
          {roomDirectoryRows.map((room) => (
            <option key={room.id || room.name} value={String(room.name || "").trim().toLowerCase()}>
              {room.name || "Unnamed room"}
            </option>
          ))}
        </select>
      </div>

      {selectedRoomRow ? (
        <>
          <div className="tt-helper">
            {selectedRoomRow.periods || selectedRoomRow.classCount
              ? `${selectedRoomRow.name} is used in ${selectedRoomRow.periods || 0} period${
                  selectedRoomRow.periods === 1 ? "" : "s"
                } across ${selectedRoomRow.classCount || 0} class${
                  selectedRoomRow.classCount === 1 ? "" : "es"
                }.`
              : `${selectedRoomRow.name} has no timetable assignments yet.`}
          </div>
          <div className="tt-table-wrap">
            <table className="tt-compact-table">
              <thead>
                <tr>
                  <th className="tt-head-cell">{t("ttTime", "Time")}</th>
                  {days.map((day) => (
                    <th key={`room-${day.id}`} className="tt-head-cell">
                      {day.shortLabel || day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={`room-row-${period.id}`}>
                    <td className="tt-axis-cell">{slotRange(period)}</td>
                    {days.map((day) => {
                      const slotKey = buildSlotKey(day.id, period.id);
                      const entries = selectedRoomSchedule[slotKey] || [];
                      return (
                        <td key={slotKey} className="tt-body-cell">
                          {isSharedTimetablePeriod(period) ? (
                            <span className="tt-note">{period.label}</span>
                          ) : entries.length ? (
                            <div style={{ display: "grid", gap: 6 }}>
                              {entries.map((entry) => (
                                <div
                                  key={`${slotKey}-${entry.classLabel}-${entry.subject}`}
                                  style={{
                                    border: "1px solid #d7e1ec",
                                    borderRadius: 8,
                                    padding: "8px 10px",
                                    background: "#f8fafc",
                                  }}
                                >
                                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{entry.subject || "Assigned"}</div>
                                  <div className="tt-note">{entry.classLabel}</div>
                                  {entry.teacherName ? (
                                    <div className="tt-note">{entry.teacherName}</div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="tt-note">Free</span>
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
        <div className="tt-helper">Add or name rooms to inspect their weekly schedules here.</div>
      )}
    </section>
  );
}
