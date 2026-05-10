import React from "react";
import "./Timetable.css";

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
  return (
    <div className="tt-two-col">
      <div className="tt-stack">
        <section className="tt-section">
          <div className="tt-title-block">
            <div className="tt-title">School Time Setup</div>
            <div className="tt-sub">These settings apply to the whole school timetable.</div>
          </div>

          <div className="tt-stack">
            <div>
              <div className="tt-stat-label" style={{ marginBottom: 8 }}>Active Days</div>
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
                    <th className="tt-head-cell">Label</th>
                    <th className="tt-head-cell">Start</th>
                    <th className="tt-head-cell">End</th>
                    <th className="tt-head-cell">Type</th>
                    <th className="tt-head-cell">Action</th>
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
                          <option value="lesson">Lesson</option>
                          <option value="break">Break</option>
                          <option value="shared">Shared Activity</option>
                        </select>
                      </td>
                      <td className="tt-body-cell">
                        <button className="tt-secondary-button" onClick={() => removePeriod(period.id)} disabled={!canEditGlobal}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEditGlobal ? (
              <div className="tt-action-row">
                <button className="tt-secondary-button" onClick={addPeriod}>Add Period</button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="tt-section">
          <div className="tt-title-block">
            <div className="tt-title">Available Streams</div>
            <div className="tt-sub">These are the class streams currently available for the school timetable.</div>
          </div>
          <div className="tt-table-wrap">
            <table className="tt-compact-table">
              <thead>
                <tr>
                  <th className="tt-head-cell">Form</th>
                  <th className="tt-head-cell">Stream</th>
                  <th className="tt-head-cell">Subjects</th>
                  <th className="tt-head-cell">Assigned Lessons</th>
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
                    <td className="tt-body-cell" colSpan={4}>No streams available yet.</td>
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
            <div className="tt-title">Teacher Setup</div>
            <div className="tt-sub">Teachers available for timetable assignment are taken from user accounts already created by admin.</div>
          </div>
          <div className="tt-table-wrap">
            <table className="tt-compact-table">
              <thead>
                <tr>
                  <th className="tt-head-cell">Teacher</th>
                  <th className="tt-head-cell">Account</th>
                  <th className="tt-head-cell">Weekly Load</th>
                  <th className="tt-head-cell">Classes</th>
                  <th className="tt-head-cell">Unavailable Slots</th>
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
                    <td className="tt-body-cell" colSpan={5}>No teacher accounts available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="tt-section">
          <div className="tt-title-block">
            <div className="tt-title">Room Setup</div>
            <div className="tt-sub">Maintain the rooms available for timetable assignment and review how often they are used.</div>
          </div>
          <div className="tt-table-wrap">
            <table className="tt-compact-table">
              <thead>
                <tr>
                  <th className="tt-head-cell">Room</th>
                  <th className="tt-head-cell">Type</th>
                  <th className="tt-head-cell">Capacity</th>
                  <th className="tt-head-cell">Used Periods</th>
                  <th className="tt-head-cell">Classes</th>
                  <th className="tt-head-cell">Action</th>
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
                              <div className="tt-note">Inferred from current timetable data</div>
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
                              Remove
                            </button>
                          ) : (
                            <span className="tt-note">Derived</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="tt-body-cell" colSpan={6}>No rooms available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {canEditGlobal ? (
            <div className="tt-action-row">
              <button className="tt-secondary-button" onClick={addRoom}>Add Room</button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
