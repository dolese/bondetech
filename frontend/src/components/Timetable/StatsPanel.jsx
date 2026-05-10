import React from "react";
import "./Timetable.css";

export function StatsPanel({ stats }) {
  return (
    <div className="tt-stats-row">
      <div className="tt-stat">
        <div className="tt-stat-label">Days</div>
        <div className="tt-stat-value">{stats.days}</div>
        <div className="tt-note">Enabled teaching days.</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">Lesson Periods</div>
        <div className="tt-stat-value">{stats.lessonPeriods}</div>
        <div className="tt-note">Periods that accept subject entries.</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">Teachers</div>
        <div className="tt-stat-value">{stats.teachers}</div>
        <div className="tt-note">Teacher and academic accounts available.</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">Rooms</div>
        <div className="tt-stat-value">{stats.rooms}</div>
        <div className="tt-note">Configured and inferred timetable rooms.</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">Streams</div>
        <div className="tt-stat-value">{stats.streams}</div>
        <div className="tt-note">Classes available for scheduling.</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">Conflicts</div>
        <div className="tt-stat-value">{stats.conflicts}</div>
        <div className="tt-note">Teacher, room, and availability issues.</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">Unmet Targets</div>
        <div className="tt-stat-value">{stats.unmetTargets}</div>
        <div className="tt-note">Subjects still below weekly target.</div>
      </div>
    </div>
  );
}
