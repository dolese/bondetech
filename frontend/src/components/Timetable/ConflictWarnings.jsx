import React from "react";
import "./Timetable.css";

export function ConflictWarnings({ teacherConflicts, roomConflicts, availabilityConflicts }) {
  const hasConflicts = teacherConflicts.length > 0 || roomConflicts.length > 0 || availabilityConflicts.length > 0;

  return (
    <section className="tt-section">
      <div className="tt-title-block">
        <div className="tt-title">Conflict Check</div>
        <div className="tt-sub">Pure logic review of teacher, room, and availability issues.</div>
      </div>

      {hasConflicts ? (
        <div className="tt-stack">
          {teacherConflicts.map((conflict, index) => (
            <div key={`teacher-conflict-${index}`} className="tt-conflict-box">
              <strong>Teacher conflict:</strong>
              <div>{conflict.teacherName} is assigned to more than one class in {conflict.slotKey}.</div>
            </div>
          ))}
          {roomConflicts.map((conflict, index) => (
            <div key={`room-conflict-${index}`} className="tt-conflict-box">
              <strong>Room conflict:</strong>
              <div>{conflict.room} is used by more than one class in {conflict.slotKey}.</div>
            </div>
          ))}
          {availabilityConflicts.map((conflict, index) => (
            <div key={`availability-conflict-${index}`} className="tt-conflict-box">
              <strong>Availability conflict:</strong>
              <div>{conflict.teacherName} is marked unavailable but still assigned to {conflict.classLabel} in {conflict.slotKey}.</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tt-okay-box">No timetable conflicts detected in the current saved data.</div>
      )}
    </section>
  );
}
