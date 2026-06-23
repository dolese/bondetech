import React from "react";
import { buildSlotKey, isSharedTimetablePeriod } from "../../utils/timetable";
import "./Timetable.css";
import { useI18n } from "../../i18n";

function slotRange(period) {
  const range = [period.start, period.end].filter(Boolean).join(" - ");
  return range || period.label;
}

function tableCellText(value) {
  const text = String(value || "").trim();
  return text || "-";
}

function sharedCellModifier(period) {
  const t = String(period?.type || "").toLowerCase();
  if (t === "break") return "mt-shared--break";
  if (t === "shared") return "mt-shared--activity";
  return "";
}

export function MasterTimetable({ masterRows, periods }) {
  const { t } = useI18n();
  return (
    <section className="tt-section mt-section">
      <div className="mt-title-bar">
        <div className="mt-title">
          {t("ttSchoolGeneralTimetable", "School General Timetable")}
        </div>
        <div className="mt-sub">
          {t(
            "ttSchoolGeneralTimetableSub",
            "Master table grouped by day, form, and stream.",
          )}
        </div>
      </div>

      <div className="tt-table-wrap mt-table-wrap">
        <table className="tt-table mt-table">
          <thead>
            <tr>
              <th className="mt-head-cell">{t("ttDay", "Day")}</th>
              <th className="mt-head-cell">{t("settingsForm", "Form")}</th>
              <th className="mt-head-cell">{t("ttStream", "Stream")}</th>
              {periods.map((period) => (
                <th key={`head-${period.id}`} className="mt-head-cell">
                  {slotRange(period)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {masterRows.flatMap((day, dayIndex) => {
              let dayRendered = false;
              let previousForm = "";
              let remainingFormRows = 0;
              const bandClass = dayIndex % 2 === 0 ? "mt-row--even" : "mt-row--odd";
              return day.classes.map((cls, index) => {
                const firstDayRow = !dayRendered;
                const firstFormRow =
                  cls.form !== previousForm || remainingFormRows <= 0;
                if (firstFormRow) {
                  previousForm = cls.form;
                  remainingFormRows = day.formCounts[cls.form] || 1;
                }
                remainingFormRows -= 1;
                dayRendered = true;

                return (
                  <tr key={`${day.id}-${cls.id || index}`} className={bandClass}>
                    {firstDayRow ? (
                      <td className="mt-day-cell" rowSpan={day.rowCount}>
                        <span className="mt-day-label">{day.label}</span>
                      </td>
                    ) : null}
                    {firstFormRow ? (
                      <td
                        className="mt-form-cell"
                        rowSpan={day.formCounts[cls.form] || 1}
                      >
                        {tableCellText(cls.form)}
                      </td>
                    ) : null}
                    <td className="mt-stream-cell">{tableCellText(cls.stream)}</td>
                    {periods.map((period) => {
                      const slotKey = buildSlotKey(day.id, period.id);
                      if (isSharedTimetablePeriod(period)) {
                        if (!firstDayRow) return null;
                        return (
                          <td
                            key={`${day.id}-${period.id}`}
                            className={`mt-shared-cell ${sharedCellModifier(period)}`}
                            rowSpan={day.rowCount}
                          >
                            <span className="mt-shared-label">{period.label}</span>
                          </td>
                        );
                      }
                      const entry = cls.entries?.[slotKey];
                      return (
                        <td
                          key={`${cls.id}-${slotKey}`}
                          className="mt-body-cell"
                        >
                          {entry?.subject ? (
                            <>
                              <div className="mt-subject">
                                {entry.subject}
                              </div>
                              <div className="mt-note">
                                {[
                                  entry.teacherName || entry.teacherUsername,
                                  entry.room,
                                ]
                                  .filter(Boolean)
                                  .join(" | ")}
                              </div>
                            </>
                          ) : (
                            <span className="mt-empty">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
