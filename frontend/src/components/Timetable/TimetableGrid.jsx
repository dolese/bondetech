import React from "react";
import { buildSlotKey, isSharedTimetablePeriod } from "../../utils/timetable";
import "./Timetable.css";
import { useI18n } from "../../i18n";

function slotRange(period) {
  const range = [period.start, period.end].filter(Boolean).join(" - ");
  return range || period.label;
}

export function TimetableGrid({
  activeClassLabel,
  canEditClass,
  classTimetable,
  classData,
  subjectLoadSummary,
  teacherSuggestionId,
  teacherSuggestions,
  roomSuggestionId,
  roomDirectoryRows,
  updateSubjectTarget,
  updateClassEntry,
  days,
  periods,
}) {
  const { t } = useI18n();
  return (
    <>
      <section className="tt-section">
        <div className="tt-title-block">
          <div className="tt-title">
            {t("ttClassSubjectSetup", "{classLabel} Subject Setup", {
              classLabel: activeClassLabel || t("ttClass", "Class"),
            })}
          </div>
          <div className="tt-sub">
            {t(
              "ttClassSubjectSetupSub",
              "Set the subjects, target periods, preferred teacher, and room for this class.",
            )}
          </div>
        </div>

        <datalist id={teacherSuggestionId}>
          {teacherSuggestions.map((teacher) => (
            <option
              key={`${teacher.key}-${teacher.value}`}
              value={teacher.label || teacher.value}
            />
          ))}
        </datalist>
        <datalist id={roomSuggestionId}>
          {roomDirectoryRows.map((room) => (
            <option key={`${room.id}-${room.name}`} value={room.name} />
          ))}
        </datalist>

        <div className="tt-table-wrap">
          <table className="tt-table">
            <thead>
              <tr>
                <th className="tt-head-cell">
                  {t("analysisSubject", "Subject")}
                </th>
                <th className="tt-head-cell">
                  {t("ttTargetPerWeek", "Target / Week")}
                </th>
                <th className="tt-head-cell">{t("ttAssigned", "Assigned")}</th>
                <th className="tt-head-cell">
                  {t("ttPreferredTeacher", "Preferred Teacher")}
                </th>
                <th className="tt-head-cell">{t("ttRoom", "Room")}</th>
              </tr>
            </thead>
            <tbody>
              {(classTimetable.subjectTargets || []).map((target) => {
                const summary = subjectLoadSummary.find(
                  (item) => item.subject === target.subject,
                );
                return (
                  <tr key={target.subject}>
                    <td className="tt-body-cell">
                      <strong>{target.subject}</strong>
                    </td>
                    <td className="tt-body-cell">
                      <input
                        type="number"
                        min="0"
                        className="tt-input"
                        value={target.periodsPerWeek}
                        onChange={(event) =>
                          updateSubjectTarget(
                            target.subject,
                            "periodsPerWeek",
                            event.target.value,
                          )
                        }
                        disabled={!canEditClass}
                      />
                    </td>
                    <td className="tt-body-cell">
                      {summary?.assigned || 0}
                      {summary?.target > summary?.assigned ? (
                        <div style={{ fontSize: 11, color: "#b45309" }}>
                          {t("ttNeedMore", "Need {count} more", {
                            count: summary.target - summary.assigned,
                          })}
                        </div>
                      ) : null}
                    </td>
                    <td className="tt-body-cell">
                      <input
                        className="tt-input"
                        list={teacherSuggestionId}
                        value={target.teacherName}
                        onChange={(event) =>
                          updateSubjectTarget(
                            target.subject,
                            "teacherName",
                            event.target.value,
                          )
                        }
                        disabled={!canEditClass}
                      />
                    </td>
                    <td className="tt-body-cell">
                      <input
                        className="tt-input"
                        value={target.room}
                        list={roomSuggestionId}
                        onChange={(event) =>
                          updateSubjectTarget(
                            target.subject,
                            "room",
                            event.target.value,
                          )
                        }
                        disabled={!canEditClass}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tt-section">
        <div className="tt-title-block">
          <div className="tt-title">
            {t("ttClassTimetableEditor", "{classLabel} Timetable Editor", {
              classLabel: activeClassLabel || t("ttClass", "Class"),
            })}
          </div>
          <div className="tt-sub">
            {t(
              "ttClassTimetableEditorSub",
              "Use the clean day tables below to assign subject, teacher, and room for this class.",
            )}
          </div>
        </div>

        <div className="tt-stack">
          {days.map((day) => (
            <div key={day.id} className="tt-table-wrap">
              <table className="tt-compact-table">
                <thead>
                  <tr>
                    <th className="tt-head-cell" colSpan={4}>
                      {day.label}
                    </th>
                  </tr>
                  <tr>
                    <th className="tt-head-cell">{t("ttTime", "Time")}</th>
                    <th className="tt-head-cell">
                      {t("ttSubjectActivity", "Subject / Activity")}
                    </th>
                    <th className="tt-head-cell">
                      {t("ttTeacher", "Teacher")}
                    </th>
                    <th className="tt-head-cell">{t("ttRoom", "Room")}</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => {
                    const slotKey = buildSlotKey(day.id, period.id);
                    const entry = classTimetable.entries?.[slotKey] || {
                      subject: "",
                      teacherName: "",
                      teacherUsername: "",
                      room: "",
                      note: "",
                    };

                    if (isSharedTimetablePeriod(period)) {
                      return (
                        <tr key={slotKey}>
                          <td className="tt-axis-cell">{slotRange(period)}</td>
                          <td className="tt-shared-cell" colSpan={3}>
                            {period.label ||
                              t("ttTypeSharedActivity", "Shared Activity")}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={slotKey}>
                        <td className="tt-axis-cell">{slotRange(period)}</td>
                        <td className="tt-body-cell">
                          <select
                            className="tt-select"
                            value={entry.subject}
                            onChange={(event) =>
                              updateClassEntry(
                                slotKey,
                                "subject",
                                event.target.value,
                              )
                            }
                            disabled={!canEditClass}
                          >
                            <option value="">
                              {t("ttSelectSubject", "Select subject")}
                            </option>
                            {(classData?.subjects || []).map((subject) => (
                              <option key={subject} value={subject}>
                                {subject}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="tt-body-cell">
                          <input
                            className="tt-input"
                            list={teacherSuggestionId}
                            value={entry.teacherName}
                            onChange={(event) =>
                              updateClassEntry(
                                slotKey,
                                "teacherName",
                                event.target.value,
                              )
                            }
                            disabled={!canEditClass}
                          />
                        </td>
                        <td className="tt-body-cell">
                          <input
                            className="tt-input"
                            value={entry.room}
                            list={roomSuggestionId}
                            onChange={(event) =>
                              updateClassEntry(
                                slotKey,
                                "room",
                                event.target.value,
                              )
                            }
                            disabled={!canEditClass}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
