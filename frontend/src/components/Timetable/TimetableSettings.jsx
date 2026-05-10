import React from "react";
import "./Timetable.css";
import { useI18n } from "../../i18n";

function tableCellText(value) {
  const text = String(value || "").trim();
  return text || "-";
}

export function TimetableSettings({
  canEditGlobal,
  normalizedGlobalTimetable,
  toggleDay,
  updatePeriod,
  addPeriod,
  removePeriod,
  teacherDirectoryRows,
  roomDirectoryRows,
  updateRoom,
  addRoom,
  removeRoom,
  streamRows,
}) {
  const { t } = useI18n();
  return (
    <div className="tt-two-col">
      <div className="tt-stack">
        <section className="tt-section">
          <div className="tt-title-block">
            <div className="tt-title">{t("ttSchoolTimeSetup", "School Time Setup")}</div>
            <div className="tt-sub">{t("ttSchoolTimeSetupSub", "These settings apply to the whole school timetable.")}</div>
          </div>

          <div className="tt-stack">
            <div>
               <div className="tt-stat-label" style={{ marginBottom: 8 }}>{t("ttActiveDays", "Active Days")}</div>
              <div className="tt-checkbox-row">
                {normalizedGlobalTimetable.days.map((day) => (
                  <label key={day.id} className="tt-checkbox-label">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={() => toggleDay(day.id)}
                      disabled={!canEditGlobal}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="tt-table-wrap">
              <table className="tt-compact-table">
                <thead>
                  <tr>
                     <th className="tt-head-cell">{t("ttLabel", "Label")}</th>
                     <th className="tt-head-cell">{t("ttStart", "Start")}</th>
                     <th className="tt-head-cell">{t("ttEnd", "End")}</th>
                     <th className="tt-head-cell">{t("ttType", "Type")}</th>
                     <th className="tt-head-cell">{t("ttAction", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedGlobalTimetable.periods.map((period) => (
                    <tr key={period.id}>
                      <td className="tt-body-cell">
                        <input
                          className="tt-input"
                          value={period.label}
                          onChange={(event) => updatePeriod(period.id, "label", event.target.value)}
                          disabled={!canEditGlobal}
                        />
                      </td>
                      <td className="tt-body-cell">
                        <input
                          className="tt-input"
                          value={period.start}
                          onChange={(event) => updatePeriod(period.id, "start", event.target.value)}
                          disabled={!canEditGlobal}
                        />
                      </td>
                      <td className="tt-body-cell">
                        <input
                          className="tt-input"
                          value={period.end}
                          onChange={(event) => updatePeriod(period.id, "end", event.target.value)}
                          disabled={!canEditGlobal}
                        />
                      </td>
                      <td className="tt-body-cell">
                        <select
                          className="tt-select"
                          value={period.type}
                          onChange={(event) => updatePeriod(period.id, "type", event.target.value)}
                          disabled={!canEditGlobal}
                        >
                          <option value="lesson">{t("ttTypeLesson", "Lesson")}</option>
                          <option value="break">{t("ttTypeBreak", "Break")}</option>
                          <option value="shared">{t("ttTypeSharedActivity", "Shared Activity")}</option>
                        </select>
                      </td>
                      <td className="tt-body-cell">
                        <button className="tt-secondary-button" onClick={() => removePeriod(period.id)} disabled={!canEditGlobal}>
                          {t("remove", "Remove")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEditGlobal ? (
              <div className="tt-action-row">
                 <button className="tt-secondary-button" onClick={addPeriod}>{t("ttAddPeriod", "Add Period")}</button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="tt-section">
          <div className="tt-title-block">
            <div className="tt-title">{t("ttAvailableStreams", "Available Streams")}</div>
            <div className="tt-sub">{t("ttAvailableStreamsSub", "These are the class streams currently available for the school timetable.")}</div>
          </div>
          <div className="tt-table-wrap">
            <table className="tt-compact-table">
              <thead>
                <tr>
                   <th className="tt-head-cell">{t("settingsForm", "Form")}</th>
                   <th className="tt-head-cell">{t("ttStream", "Stream")}</th>
                   <th className="tt-head-cell">{t("settingsSubjects", "Subjects")}</th>
                   <th className="tt-head-cell">{t("ttAssignedLessons", "Assigned Lessons")}</th>
                </tr>
              </thead>
              <tbody>
                {streamRows.length ? (
                  streamRows.map((row) => (
                    <tr key={row.id}>
                      <td className="tt-body-cell">{tableCellText(row.form)}</td>
                      <td className="tt-body-cell">{tableCellText(row.stream)}</td>
                      <td className="tt-body-cell">{row.subjectCount}</td>
                      <td className="tt-body-cell">{row.lessonCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                     <td className="tt-body-cell" colSpan={4}>{t("ttNoStreams", "No streams available yet.")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="tt-stack">
        <section className="tt-section">
          <div className="tt-title-block">
            <div className="tt-title">{t("ttTeacherSetup", "Teacher Setup")}</div>
            <div className="tt-sub">{t("ttTeacherSetupSub", "Teachers available for timetable assignment are taken from user accounts already created by admin.")}</div>
          </div>
          <div className="tt-table-wrap">
            <table className="tt-compact-table">
              <thead>
                <tr>
                   <th className="tt-head-cell">{t("ttTeacher", "Teacher")}</th>
                   <th className="tt-head-cell">{t("ttAccount", "Account")}</th>
                   <th className="tt-head-cell">{t("ttWeeklyLoad", "Weekly Load")}</th>
                   <th className="tt-head-cell">{t("ttClasses", "Classes")}</th>
                   <th className="tt-head-cell">{t("ttUnavailableSlots", "Unavailable Slots")}</th>
                </tr>
              </thead>
              <tbody>
                {teacherDirectoryRows.length ? (
                  teacherDirectoryRows.map((teacher) => (
                    <tr key={teacher.key}>
                      <td className="tt-body-cell">
                        <div style={{ fontWeight: 800 }}>{teacher.label}</div>
                        <div className="tt-note">{teacher.subtitle || teacher.badge}</div>
                      </td>
                      <td className="tt-body-cell">{tableCellText(teacher.value)}</td>
                      <td className="tt-body-cell">{teacher.periods}</td>
                      <td className="tt-body-cell">{teacher.classCount}</td>
                      <td className="tt-body-cell">{teacher.unavailableCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                     <td className="tt-body-cell" colSpan={5}>{t("ttNoTeacherAccounts", "No teacher accounts available yet.")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="tt-section">
          <div className="tt-title-block">
            <div className="tt-title">{t("ttRoomSetup", "Room Setup")}</div>
            <div className="tt-sub">{t("ttRoomSetupSub", "Maintain the rooms available for timetable assignment and review how often they are used.")}</div>
          </div>
          <div className="tt-table-wrap">
            <table className="tt-compact-table">
              <thead>
                <tr>
                   <th className="tt-head-cell">{t("ttRoom", "Room")}</th>
                   <th className="tt-head-cell">{t("ttType", "Type")}</th>
                   <th className="tt-head-cell">{t("ttCapacity", "Capacity")}</th>
                   <th className="tt-head-cell">{t("ttUsedPeriods", "Used Periods")}</th>
                   <th className="tt-head-cell">{t("ttClasses", "Classes")}</th>
                   <th className="tt-head-cell">{t("ttAction", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {roomDirectoryRows.length ? (
                  roomDirectoryRows.map((room) => {
                    const isConfigured = room.isConfigured !== false;
                    return (
                      <tr key={room.id}>
                        <td className="tt-body-cell">
                          {isConfigured ? (
                            <input
                              className="tt-input"
                              value={room.name}
                              onChange={(event) => updateRoom(room.id, "name", event.target.value)}
                              disabled={!canEditGlobal}
                            />
                          ) : (
                            <>
                              <div style={{ fontWeight: 800 }}>{room.name}</div>
                               <div className="tt-note">{t("ttInferredFromData", "Inferred from current timetable data")}</div>
                            </>
                          )}
                        </td>
                        <td className="tt-body-cell">
                          {isConfigured ? (
                            <input
                              className="tt-input"
                              value={room.type || ""}
                              onChange={(event) => updateRoom(room.id, "type", event.target.value)}
                              disabled={!canEditGlobal}
                            />
                          ) : (
                            tableCellText(room.type)
                          )}
                        </td>
                        <td className="tt-body-cell">
                          {isConfigured ? (
                            <input
                              className="tt-input"
                              value={room.capacity || ""}
                              onChange={(event) => updateRoom(room.id, "capacity", event.target.value)}
                              disabled={!canEditGlobal}
                            />
                          ) : (
                            tableCellText(room.capacity)
                          )}
                        </td>
                        <td className="tt-body-cell">{room.periods || 0}</td>
                        <td className="tt-body-cell">{room.classCount || 0}</td>
                        <td className="tt-body-cell">
                          {isConfigured ? (
                            <button className="tt-secondary-button" onClick={() => removeRoom(room.id)} disabled={!canEditGlobal}>
                               {t("remove", "Remove")}
                            </button>
                          ) : (
                             <span className="tt-note">{t("ttDerived", "Derived")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                     <td className="tt-body-cell" colSpan={6}>{t("ttNoRooms", "No rooms available yet.")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {canEditGlobal ? (
            <div className="tt-action-row">
               <button className="tt-secondary-button" onClick={addRoom}>{t("ttAddRoom", "Add Room")}</button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
