import React from "react";
import "./Timetable.css";
import { useI18n } from "../../i18n";

export function ConflictWarnings({ teacherConflicts, roomConflicts, availabilityConflicts }) {
  const { t } = useI18n();
  const hasConflicts = teacherConflicts.length > 0 || roomConflicts.length > 0 || availabilityConflicts.length > 0;

  return (
    <section className="tt-section">
      <div className="tt-title-block">
        <div className="tt-title">{t("ttConflictCheck", "Conflict Check")}</div>
        <div className="tt-sub">{t("ttConflictCheckSub", "Pure logic review of teacher, room, and availability issues.")}</div>
      </div>

      {hasConflicts ? (
        <div className="tt-stack">
          {teacherConflicts.map((conflict, index) => (
            <div key={`teacher-conflict-${index}`} className="tt-conflict-box">
              <strong>{t("ttTeacherConflict", "Teacher conflict")}:</strong>
              <div>{t("ttTeacherConflictDetail", "{teacher} is assigned to more than one class in {slot}.", { teacher: conflict.teacherName, slot: conflict.slotKey })}</div>
            </div>
          ))}
          {roomConflicts.map((conflict, index) => (
            <div key={`room-conflict-${index}`} className="tt-conflict-box">
              <strong>{t("ttRoomConflict", "Room conflict")}:</strong>
              <div>{t("ttRoomConflictDetail", "{room} is used by more than one class in {slot}.", { room: conflict.room, slot: conflict.slotKey })}</div>
            </div>
          ))}
          {availabilityConflicts.map((conflict, index) => (
            <div key={`availability-conflict-${index}`} className="tt-conflict-box">
              <strong>{t("ttAvailabilityConflict", "Availability conflict")}:</strong>
              <div>{t("ttAvailabilityConflictDetail", "{teacher} is marked unavailable but still assigned to {classLabel} in {slot}.", { teacher: conflict.teacherName, classLabel: conflict.classLabel, slot: conflict.slotKey })}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tt-okay-box">{t("ttNoConflicts", "No timetable conflicts detected in the current saved data.")}</div>
      )}
    </section>
  );
}
