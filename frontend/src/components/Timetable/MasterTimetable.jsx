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

export function MasterTimetable({ masterRows, periods }) {
  const { t } = useI18n();
  return (
    <section className="tt-section">
      <div className="tt-title-block">
        <div className="tt-title">
          {t("ttSchoolGeneralTimetable", "School General Timetable")}
        </div>
        <div className="tt-sub">
          {t(
            "ttSchoolGeneralTimetableSub",
            "Master table grouped by day, form, and stream using the same school-wide structure.",
          )}
        </div>
      </div>

      <div className="tt-table-wrap">
        <table className="tt-table">
          <thead>
            <tr>
              <th className="tt-head-cell">{t("ttDay", "Day")}</th>
              <th className="tt-head-cell">{t("settingsForm", "Form")}</th>
              <th className="tt-head-cell">{t("ttStream", "Stream")}</th>
              {periods.map((period) => (
                <th key={`head-${period.id}`} className="tt-head-cell">
                  {slotRange(period)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {masterRows.flatMap((day) => {
              let dayRendered = false;
              let previousForm = "";
              let remainingFormRows = 0;
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
                  <tr key={`${day.id}-${cls.id || index}`}>
                    {firstDayRow ? (
                      <td className="tt-axis-cell" rowSpan={day.rowCount}>
                        {day.label}
                      </td>
                    ) : null}
                    {firstFormRow ? (
                      <td
                        className="tt-axis-cell"
                        rowSpan={day.formCounts[cls.form] || 1}
                      >
                        {tableCellText(cls.form)}
                      </td>
                    ) : null}
                    <td className="tt-axis-cell">{tableCellText(cls.stream)}</td>
                    {periods.map((period) => {
                      const slotKey = buildSlotKey(day.id, period.id);
                      if (isSharedTimetablePeriod(period)) {
                        if (!firstDayRow) return null;
                        return (
                          <td
                            key={`${day.id}-${period.id}`}
                            className="tt-shared-cell"
                            rowSpan={day.rowCount}
                          >
                            {tableCellText(period.label)}
                          </td>
                        );
                      }
                      const entry = cls.entries?.[slotKey];
                      return (
                        <td
                          key={`${cls.id}-${slotKey}`}
                          className="tt-body-cell"
                        >
                          {entry?.subject ? (
                            <>
                              <div style={{ fontWeight: 800 }}>
                                {entry.subject}
                              </div>
                              <div className="tt-note">
                                {[
                                  entry.teacherName || entry.teacherUsername,
                                  entry.room,
                                ]
                                  .filter(Boolean)
                                  .join(" | ")}
                              </div>
                            </>
                          ) : (
                            "-"
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
