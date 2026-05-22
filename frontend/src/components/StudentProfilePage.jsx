import React, { useEffect, useMemo, useState } from "react";
import { API } from "../api";
import { computeStudent } from "../utils/grading";
import { GRADE_COLORS, DIVISION_COLORS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import {
  glassPanelStyle,
  pillStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  softCardStyle,
} from "../utils/designSystem";

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatHistoryTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StudentProfilePage({
  studentRef = null,
  indexNo,
  onBack,
  communicationContext = null,
  onOpenSms = null,
  loadSmsHistory = null,
}) {
  const { isXs, isMobile } = useViewport();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [smsHistory, setSmsHistory] = useState([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const resolvedStudentRef = useMemo(
    () =>
      studentRef && typeof studentRef === "object"
        ? {
            admissionNo: String(studentRef.admissionNo || studentRef.admission_no || "").trim().toUpperCase(),
            indexNo: String(studentRef.indexNo || studentRef.index_no || "").trim(),
          }
        : { admissionNo: "", indexNo: String(indexNo || "").trim() },
    [indexNo, studentRef]
  );
  const profileTarget = resolvedStudentRef.admissionNo || resolvedStudentRef.indexNo;

  useEffect(() => {
    if (!profileTarget) return;
    setLoading(true);
    setError(null);
    API.getStudentProfile(resolvedStudentRef)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [profileTarget, resolvedStudentRef]);

  useEffect(() => {
    if (!profileTarget || !loadSmsHistory) return;
    let cancelled = false;
    setSmsLoading(true);
    Promise.resolve(loadSmsHistory(resolvedStudentRef))
      .then((payload) => {
        if (cancelled) return;
        setSmsHistory(Array.isArray(payload?.history) ? payload.history : []);
      })
      .catch(() => {
        if (cancelled) return;
        setSmsHistory([]);
      })
      .finally(() => {
        if (cancelled) return;
        setSmsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadSmsHistory, profileTarget, resolvedStudentRef]);

  const resultHistory = useMemo(() => {
    if (!profile?.entries?.length) return [];
    return profile.entries
      .flatMap((entry) =>
        Object.entries(entry.examScores || {}).map(([examType, scores]) => {
          const computed = computeStudent(
            {
              id: `${entry.classId}-${examType}`,
              name: profile.name,
              sex: profile.sex,
              status: entry.status,
              scores,
              remarks: entry.remarks,
            },
            entry.subjects
          );
          return {
            key: `${entry.classId}-${entry.year}-${examType}`,
            classId: entry.classId,
            className: entry.className,
            form: entry.form,
            stream: entry.stream,
            year: entry.year,
            examType,
            subjects: entry.subjects,
            remarks: entry.remarks,
            computed,
          };
        })
      )
      .sort((left, right) => {
        const yearDiff = (Number(right.year) || 0) - (Number(left.year) || 0);
        if (yearDiff !== 0) return yearDiff;
        return String(left.form || "").localeCompare(String(right.form || ""), "en");
      });
  }, [profile]);

  const latestResult = resultHistory[0]?.computed || null;

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      padding: isXs ? 8 : isMobile ? 10 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minHeight: 0,
      background: "linear-gradient(180deg, #f7fafc 0%, #edf4fb 100%)",
    },
    backBtn: secondaryButtonStyle({ compact: true }),
    th: {
      padding: isXs ? "6px 6px" : "8px 10px",
      background: "#173b74",
      color: "#fff",
      fontWeight: 800,
      fontSize: isXs ? 9 : 11,
      textAlign: "center",
      border: "1px solid rgba(255,255,255,0.1)",
      whiteSpace: "nowrap",
    },
    td: {
      padding: isXs ? "6px 6px" : "8px 10px",
      border: "1px solid rgba(226,232,240,0.95)",
      fontSize: isXs ? 9 : 11,
      textAlign: "center",
      background: "#fff",
    },
  };

  if (loading) {
    return (
      <div style={styles.panel}>
        <button style={styles.backBtn} onClick={onBack}>{"<-"} Back</button>
        <div style={{ color: "#64748b", fontSize: 13 }}>Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.panel}>
        <button style={styles.backBtn} onClick={onBack}>{"<-"} Back</button>
        <div style={{ color: "#8b2500", fontSize: 13 }}>{error}</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={styles.panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <button style={styles.backBtn} onClick={onBack}>{"<-"} Back</button>
        {communicationContext?.phone && onOpenSms ? (
          <button
            style={primaryButtonStyle({ compact: true })}
            onClick={() => onOpenSms(communicationContext)}
          >
            Message Guardian
          </button>
        ) : null}
      </div>

      <div style={{ ...glassPanelStyle({ padding: 18, radius: 24 }), display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...pillStyle({ tone: "blue" }), display: "inline-flex" }}>Student Profile</div>
            <div style={{ marginTop: 10, fontSize: isXs ? 22 : 28, fontWeight: 900, color: "#0f172a" }}>
              {profile.name || "Unknown Student"}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
              <strong>Admission No:</strong> {profile.admissionNo || "-"}{" "}
              <span style={{ margin: "0 6px" }}>•</span>
              <strong>CNO:</strong> {profile.indexNo}{" "}
              <span style={{ margin: "0 6px" }}>•</span>
              <strong>Sex:</strong> {profile.sex === "F" ? "Female" : "Male"}
            </div>
            {communicationContext?.parentName || communicationContext?.phone ? (
              <div style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                <strong>Guardian:</strong> {communicationContext?.parentName || "Guardian"}{" "}
                {communicationContext?.phone ? `(${communicationContext.phone})` : ""}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {[
            { label: "Classes", value: profile.entries?.length || 0 },
            { label: "Exams Recorded", value: resultHistory.length },
            { label: "Latest Average", value: latestResult ? formatNumber(latestResult.avg) : "-" },
            { label: "Latest Division", value: latestResult?.div ? `Div ${latestResult.div}` : latestResult?.resultStatus === "ABSENT" ? "ABS" : "INC" },
          ].map((item) => (
            <div key={item.label} style={{ ...softCardStyle({ padding: 14, radius: 18 }), display: "grid", gap: 4 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...glassPanelStyle({ padding: 16, radius: 24 }), display: "grid", gap: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Results History</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
            Every saved exam record for this student across the classes found in the system.
          </div>
        </div>

        {resultHistory.length === 0 ? (
          <div style={{ ...softCardStyle({ padding: 18, radius: 18 }), color: "#64748b", fontSize: 13 }}>
            No academic records found.
          </div>
        ) : (
          resultHistory.map((entry) => {
            const computed = entry.computed;
            const divisionText =
              computed?.resultStatus === "ABSENT"
                ? "ABS"
                : computed?.resultStatus === "INCOMPLETE"
                ? "INC"
                : computed?.div
                ? `Div ${computed.div}`
                : "-";
            return (
              <div key={entry.key} style={{ ...softCardStyle({ padding: 16, radius: 20 }), display: "grid", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#173b74" }}>
                      {entry.className || [entry.form, entry.stream, entry.year].filter(Boolean).join(" ")}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      {entry.form} {entry.stream || ""} {entry.year} • {entry.examType}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={pillStyle({ tone: "blue" })}>Avg {formatNumber(computed?.avg)}</span>
                    <span
                      style={{
                        ...pillStyle({ tone: "teal" }),
                        background: computed?.div ? DIVISION_COLORS[computed.div] || "#0f766e" : "#94a3b8",
                        color: "#fff",
                      }}
                    >
                      {divisionText}
                    </span>
                    <span style={pillStyle({ tone: "amber" })}>Points {computed?.points ?? "-"}</span>
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
                    <thead>
                      <tr>
                        {entry.subjects.map((subject) => (
                          <th key={subject} style={styles.th}>{subject}</th>
                        ))}
                        <th style={styles.th}>Total</th>
                        <th style={styles.th}>Avg</th>
                        <th style={styles.th}>Grade</th>
                        <th style={styles.th}>Division</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {entry.subjects.map((_, index) => {
                          const grade = computed.grades?.[index];
                          const display = grade?.raw === "ABS" ? "ABS" : grade?.score ?? "-";
                          return (
                            <td key={index} style={styles.td}>
                              {display}
                            </td>
                          );
                        })}
                        <td style={{ ...styles.td, fontWeight: 800 }}>{computed.total ?? "-"}</td>
                        <td style={styles.td}>{formatNumber(computed.avg)}</td>
                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 800,
                            color: GRADE_COLORS[computed.agrd] || "#0f172a",
                          }}
                        >
                          {computed.agrd ?? "-"}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 800,
                            color: computed.div ? DIVISION_COLORS[computed.div] || "#0f172a" : "#475569",
                          }}
                        >
                          {divisionText}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {entry.remarks ? (
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
                    <strong>Remarks:</strong> {entry.remarks}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {loadSmsHistory ? (
        <div style={{ ...glassPanelStyle({ padding: 16, radius: 24 }), display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Communication History</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
              Recent outbound SMS linked to this student&apos;s results or guardian contact.
            </div>
          </div>

          {smsLoading ? (
            <div style={{ ...softCardStyle({ padding: 18, radius: 18 }), fontSize: 13, color: "#64748b" }}>
              Loading SMS history...
            </div>
          ) : smsHistory.length === 0 ? (
            <div style={{ ...softCardStyle({ padding: 18, radius: 18 }), fontSize: 13, color: "#64748b" }}>
              No communication history recorded for this student yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {smsHistory.map((entry) => (
                <div key={entry.id} style={{ ...softCardStyle({ padding: 14, radius: 18 }), display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                      {entry.mode === "results" ? "Results SMS" : "Custom SMS"}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={pillStyle({ tone: entry.successful ? "teal" : "amber" })}>
                        {entry.successful ? "Submitted" : "Warnings"}
                      </span>
                      <span style={pillStyle({ tone: "blue" })}>{formatHistoryTime(entry.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
                    <strong>By:</strong> {entry.requested_by?.displayName || entry.requested_by?.username || "-"}{" "}
                    {entry.exam ? <>• <strong>Exam:</strong> {entry.exam}</> : null}
                  </div>
                  {entry.message_preview ? (
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                      {entry.message_preview}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
