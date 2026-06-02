import React, { useEffect, useMemo, useState } from "react";
import { API } from "../api";
import { computeStudent } from "../utils/grading";
import { GRADE_COLORS, GRADE_BACKGROUNDS, DIVISION_COLORS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import { pillStyle } from "../utils/designSystem";

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatHistoryTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTrendInfo(resultHistory) {
  if (resultHistory.length < 2) return null;
  const recent = resultHistory[0].computed;
  const prev = resultHistory[1].computed;
  if (!recent?.avg || !prev?.avg) return null;
  const diff = recent.avg - prev.avg;
  if (Math.abs(diff) < 0.5) return { label: "Stable", color: "#71717a", symbol: "→" };
  if (diff > 0) return { label: `+${diff.toFixed(1)} from previous`, color: "#16a34a", symbol: "↑" };
  return { label: `${diff.toFixed(1)} from previous`, color: "#dc2626", symbol: "↓" };
}

function getBestDivision(resultHistory) {
  const divOrder = ["I", "II", "III", "IV", "0"];
  let best = null;
  for (const entry of resultHistory) {
    const div = entry.computed?.div;
    if (!div) continue;
    if (!best || divOrder.indexOf(div) < divOrder.indexOf(best)) best = div;
  }
  return best;
}

/* ── Subject cell with grade coloring ── */
function ScoreCell({ gradeEntry, isXs }) {
  if (!gradeEntry) {
    return (
      <td style={{ padding: isXs ? "8px 5px" : "10px 8px", textAlign: "center", borderRight: "1px solid #f4f4f5", borderBottom: "1px solid #f4f4f5", color: "#a1a1aa", fontSize: isXs ? 11 : 13 }}>
        —
      </td>
    );
  }

  const isAbsent = gradeEntry.raw === "ABS";
  const score = isAbsent ? null : gradeEntry.score;
  const letter = gradeEntry.grade;
  const bg = !isAbsent && letter ? (GRADE_BACKGROUNDS[letter] || "#f9fafb") : "#fafafa";
  const color = !isAbsent && letter ? (GRADE_COLORS[letter] || "#18181b") : "#71717a";

  return (
    <td style={{
      padding: isXs ? "8px 5px" : "10px 8px",
      textAlign: "center",
      background: bg,
      borderRight: "1px solid rgba(255,255,255,0.6)",
      borderBottom: "1px solid #f4f4f5",
    }}>
      {isAbsent ? (
        <span style={{ fontSize: isXs ? 10 : 12, fontWeight: 700, color: "#71717a" }}>ABS</span>
      ) : (
        <>
          <div style={{ fontSize: isXs ? 12 : 14, fontWeight: 700, color, lineHeight: 1.1 }}>
            {score ?? "—"}
          </div>
          {letter && (
            <div style={{ fontSize: isXs ? 9 : 10, fontWeight: 800, color, opacity: 0.7, marginTop: 1 }}>
              {letter}
            </div>
          )}
        </>
      )}
    </td>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e4e4e7",
      borderRadius: 14,
      padding: "14px 16px",
      display: "grid",
      gap: 4,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "#18181b", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#71717a", marginTop: 1 }}>{sub}</div>}
    </div>
  );
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
    return () => { cancelled = true; };
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
  const trend = getTrendInfo(resultHistory);
  const bestDivision = getBestDivision(resultHistory);

  const panelStyle = {
    flex: 1,
    overflowY: "auto",
    padding: isXs ? 8 : isMobile ? 12 : 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minHeight: 0,
    background: "#f9fafb",
  };

  const backBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 8,
    border: "1px solid #e4e4e7",
    background: "#ffffff",
    color: "#52525b",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };

  if (loading) {
    return (
      <div style={panelStyle}>
        <button style={backBtnStyle} onClick={onBack}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="m12 5-7 7 7 7" />
          </svg>
          Back
        </button>
        <div style={{ color: "#71717a", fontSize: 14, padding: "20px 0" }}>Loading profile…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={panelStyle}>
        <button style={backBtnStyle} onClick={onBack}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="m12 5-7 7 7 7" />
          </svg>
          Back
        </button>
        <div style={{ color: "#b91c1c", fontSize: 14, padding: "20px 0" }}>{error}</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={panelStyle}>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <button style={backBtnStyle} onClick={onBack}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="m12 5-7 7 7 7" />
          </svg>
          Back
        </button>
        {communicationContext?.phone && onOpenSms ? (
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              background: "#18181b",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => onOpenSms(communicationContext)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16h.19z" />
            </svg>
            Message Guardian
          </button>
        ) : null}
      </div>

      {/* ── Identity card ── */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e4e4e7",
        borderRadius: 16,
        padding: "20px 22px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isXs ? 22 : 26, fontWeight: 800, color: "#18181b", lineHeight: 1.2 }}>
              {profile.name || "Unknown Student"}
            </div>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 13, color: "#71717a" }}>
              {profile.admissionNo && (
                <span><strong style={{ color: "#52525b" }}>Admission No</strong> {profile.admissionNo}</span>
              )}
              <span><strong style={{ color: "#52525b" }}>CNO</strong> {profile.indexNo || "—"}</span>
              <span><strong style={{ color: "#52525b" }}>Sex</strong> {profile.sex === "F" ? "Female" : "Male"}</span>
            </div>
            {(communicationContext?.parentName || communicationContext?.phone) && (
              <div style={{ marginTop: 6, fontSize: 13, color: "#71717a" }}>
                <strong style={{ color: "#52525b" }}>Guardian</strong>{" "}
                {communicationContext?.parentName || "Guardian"}
                {communicationContext?.phone ? ` · ${communicationContext.phone}` : ""}
              </div>
            )}
          </div>
          {trend && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              borderRadius: 999,
              background: trend.color === "#16a34a" ? "#f0fdf4" : trend.color === "#dc2626" ? "#fef2f2" : "#f4f4f5",
              border: `1px solid ${trend.color === "#16a34a" ? "#bbf7d0" : trend.color === "#dc2626" ? "#fecaca" : "#e4e4e7"}`,
              fontSize: 13,
              fontWeight: 700,
              color: trend.color,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 16 }}>{trend.symbol}</span>
              {trend.label}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <StatCard label="Classes" value={profile.entries?.length || 0} />
        <StatCard label="Exams" value={resultHistory.length} />
        <StatCard
          label="Latest Average"
          value={latestResult ? formatNumber(latestResult.avg) : "—"}
          sub={latestResult?.agrd ? `Grade ${latestResult.agrd}` : null}
          color={latestResult?.agrd ? GRADE_COLORS[latestResult.agrd] : undefined}
        />
        <StatCard
          label="Latest Division"
          value={latestResult?.div ? `Div ${latestResult.div}` : latestResult?.resultStatus === "ABSENT" ? "ABS" : latestResult ? "INC" : "—"}
          color={latestResult?.div ? (DIVISION_COLORS[latestResult.div] || "#18181b") : undefined}
        />
        {bestDivision && resultHistory.length > 1 && (
          <StatCard
            label="Best Division"
            value={`Div ${bestDivision}`}
            color={DIVISION_COLORS[bestDivision] || "#18181b"}
          />
        )}
      </div>

      {/* ── Results history ── */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e4e4e7",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f4f4f5" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#18181b" }}>Results History</div>
          <div style={{ marginTop: 3, fontSize: 12, color: "#a1a1aa" }}>
            Every saved exam record across all classes — subject scores are color-coded by grade.
          </div>
        </div>

        {resultHistory.length === 0 ? (
          <div style={{ padding: "24px 20px", color: "#a1a1aa", fontSize: 14 }}>
            No academic records found for this student.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {resultHistory.map((entry, entryIndex) => {
              const computed = entry.computed;
              const divisionText =
                computed?.resultStatus === "ABSENT" ? "ABS"
                : computed?.resultStatus === "INCOMPLETE" ? "INC"
                : computed?.div ? `Div ${computed.div}` : "—";

              // Find best and worst subject indices (by numeric score)
              const numericScores = (computed?.grades || []).map((g, i) => ({
                i,
                score: typeof g?.score === "number" ? g.score : null,
              })).filter((x) => x.score !== null);
              const bestIdx = numericScores.length > 0
                ? numericScores.reduce((a, b) => (b.score > a.score ? b : a)).i
                : -1;
              const worstIdx = numericScores.length > 1
                ? numericScores.reduce((a, b) => (b.score < a.score ? b : a)).i
                : -1;

              return (
                <div
                  key={entry.key}
                  style={{
                    borderBottom: entryIndex < resultHistory.length - 1 ? "1px solid #f4f4f5" : "none",
                    padding: isXs ? "14px 12px" : "18px 20px",
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {/* Exam header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#18181b" }}>
                        {entry.className || [entry.form, entry.stream, entry.year].filter(Boolean).join(" ")}
                      </div>
                      <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2 }}>
                        {entry.form}{entry.stream ? ` ${entry.stream}` : ""} · {entry.year} · {entry.examType}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {computed?.agrd && (
                        <span style={{
                          ...pillStyle({ tone: "blue" }),
                          background: GRADE_BACKGROUNDS[computed.agrd] || undefined,
                          color: GRADE_COLORS[computed.agrd] || undefined,
                          borderColor: "transparent",
                        }}>
                          Avg {formatNumber(computed?.avg)} · {computed.agrd}
                        </span>
                      )}
                      {computed?.div && (
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#ffffff",
                          background: DIVISION_COLORS[computed.div] || "#71717a",
                        }}>
                          {divisionText}
                        </span>
                      )}
                      {!computed?.div && divisionText !== "—" && (
                        <span style={pillStyle({ tone: "slate" })}>{divisionText}</span>
                      )}
                      {typeof computed?.points === "number" && (
                        <span style={pillStyle({ tone: "slate" })}>
                          {computed.points} pts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject scores table */}
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #f4f4f5" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", minWidth: entry.subjects.length * (isXs ? 46 : 60) }}>
                      <thead>
                        <tr>
                          {entry.subjects.map((subject, si) => (
                            <th
                              key={subject}
                              style={{
                                padding: isXs ? "7px 5px" : "8px 8px",
                                background: si === bestIdx ? "#f0fdf4" : si === worstIdx ? "#fef2f2" : "#fafafa",
                                color: si === bestIdx ? "#15803d" : si === worstIdx ? "#b91c1c" : "#71717a",
                                fontWeight: 700,
                                fontSize: isXs ? 9 : 11,
                                textAlign: "center",
                                borderRight: "1px solid #f4f4f5",
                                borderBottom: "1px solid #f4f4f5",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {subject}
                              {si === bestIdx && <span style={{ marginLeft: 3, fontSize: 9 }}>★</span>}
                            </th>
                          ))}
                          {["Total", "Avg", "Div"].map((h) => (
                            <th key={h} style={{
                              padding: isXs ? "7px 5px" : "8px 8px",
                              background: "#fafafa",
                              color: "#71717a",
                              fontWeight: 700,
                              fontSize: isXs ? 9 : 11,
                              textAlign: "center",
                              borderRight: "1px solid #f4f4f5",
                              borderBottom: "1px solid #f4f4f5",
                              whiteSpace: "nowrap",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {entry.subjects.map((_, si) => (
                            <ScoreCell
                              key={si}
                              gradeEntry={computed.grades?.[si]}
                              isXs={isXs}
                            />
                          ))}
                          <td style={{ padding: isXs ? "10px 5px" : "10px 8px", textAlign: "center", fontWeight: 700, fontSize: isXs ? 12 : 14, color: "#18181b", borderRight: "1px solid #f4f4f5", borderBottom: "1px solid #f4f4f5" }}>
                            {computed.total ?? "—"}
                          </td>
                          <td style={{ padding: isXs ? "10px 5px" : "10px 8px", textAlign: "center", fontWeight: 700, fontSize: isXs ? 12 : 14, color: "#18181b", borderRight: "1px solid #f4f4f5", borderBottom: "1px solid #f4f4f5" }}>
                            {formatNumber(computed.avg)}
                          </td>
                          <td style={{
                            padding: isXs ? "10px 5px" : "10px 8px",
                            textAlign: "center",
                            fontWeight: 800,
                            fontSize: isXs ? 12 : 14,
                            color: computed.div ? (DIVISION_COLORS[computed.div] || "#18181b") : "#a1a1aa",
                            borderBottom: "1px solid #f4f4f5",
                          }}>
                            {divisionText}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {entry.remarks ? (
                    <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.65 }}>
                      <strong style={{ color: "#52525b" }}>Remarks:</strong> {entry.remarks}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Communication history ── */}
      {loadSmsHistory ? (
        <div style={{
          background: "#ffffff",
          border: "1px solid #e4e4e7",
          borderRadius: 16,
          overflow: "hidden",
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f4f4f5" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#18181b" }}>Communication History</div>
            <div style={{ marginTop: 3, fontSize: 12, color: "#a1a1aa" }}>
              Outbound SMS linked to this student's results or guardian contact.
            </div>
          </div>

          {smsLoading ? (
            <div style={{ padding: "20px", color: "#a1a1aa", fontSize: 13 }}>Loading…</div>
          ) : smsHistory.length === 0 ? (
            <div style={{ padding: "20px", color: "#a1a1aa", fontSize: 13 }}>
              No communication history recorded for this student yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {smsHistory.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "14px 20px",
                    borderBottom: i < smsHistory.length - 1 ? "1px solid #f4f4f5" : "none",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#18181b" }}>
                      {entry.mode === "results" ? "Results SMS" : "Custom SMS"}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={pillStyle({ tone: entry.successful ? "teal" : "amber" })}>
                        {entry.successful ? "Submitted" : "Warnings"}
                      </span>
                      <span style={{ fontSize: 11, color: "#a1a1aa", padding: "3px 0" }}>
                        {formatHistoryTime(entry.created_at)}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.6 }}>
                    <strong style={{ color: "#52525b" }}>By:</strong>{" "}
                    {entry.requested_by?.displayName || entry.requested_by?.username || "—"}
                    {entry.exam ? <> · <strong style={{ color: "#52525b" }}>Exam:</strong> {entry.exam}</> : null}
                  </div>
                  {entry.message_preview ? (
                    <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.65, whiteSpace: "pre-line", background: "#f9fafb", padding: "8px 12px", borderRadius: 8 }}>
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
