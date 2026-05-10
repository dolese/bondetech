import React from "react";
import "./Timetable.css";
import { useI18n } from "../../i18n";

export function StatsPanel({ stats }) {
  const { t } = useI18n();
  return (
    <div className="tt-stats-row">
      <div className="tt-stat">
        <div className="tt-stat-label">{t("ttDays", "Days")}</div>
        <div className="tt-stat-value">{stats.days}</div>
        <div className="tt-note">{t("ttDaysSub", "Enabled teaching days.")}</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">{t("ttLessonPeriods", "Lesson Periods")}</div>
        <div className="tt-stat-value">{stats.lessonPeriods}</div>
        <div className="tt-note">{t("ttLessonPeriodsSub", "Periods that accept subject entries.")}</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">{t("ttTeachers", "Teachers")}</div>
        <div className="tt-stat-value">{stats.teachers}</div>
        <div className="tt-note">{t("ttTeachersSub", "Teacher and academic accounts available.")}</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">{t("ttRooms", "Rooms")}</div>
        <div className="tt-stat-value">{stats.rooms}</div>
        <div className="tt-note">{t("ttRoomsSub", "Configured and inferred timetable rooms.")}</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">{t("ttStreams", "Streams")}</div>
        <div className="tt-stat-value">{stats.streams}</div>
        <div className="tt-note">{t("ttStreamsSub", "Classes available for scheduling.")}</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">{t("ttConflicts", "Conflicts")}</div>
        <div className="tt-stat-value">{stats.conflicts}</div>
        <div className="tt-note">{t("ttConflictsSub", "Teacher, room, and availability issues.")}</div>
      </div>
      <div className="tt-stat">
        <div className="tt-stat-label">{t("ttUnmetTargets", "Unmet Targets")}</div>
        <div className="tt-stat-value">{stats.unmetTargets}</div>
        <div className="tt-note">{t("ttUnmetTargetsSub", "Subjects still below weekly target.")}</div>
      </div>
    </div>
  );
}
