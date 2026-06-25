import React, { useEffect, useMemo, useState } from "react";
import { API } from "../api";
import { computeStudent } from "../utils/grading";
import { DIVISION_COLORS, GRADE_BACKGROUNDS, GRADE_COLORS, GRADE_POINTS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import { pillStyle } from "../utils/designSystem";

const DIVISION_SCALE = [
  { key: "I", label: "Division I", range: "7-17 pts", note: "Excellent", color: "#14532d", bg: "#f0fdf4", border: "#bbf7d0" },
  { key: "II", label: "Division II", range: "18-21 pts", note: "Very good", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  { key: "III", label: "Division III", range: "22-25 pts", note: "Average", color: "#92400e", bg: "#fffbeb", border: "#fcd34d" },
  { key: "IV", label: "Division IV", range: "26-33 pts", note: "Below average", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  { key: "0", label: "Division 0", range: "34+ pts", note: "Fail", color: "#52525b", bg: "#f4f4f5", border: "#d4d4d8" },
];

const GRADE_SCALE = [
  { key: "A", label: "Grade A", range: "75-100 marks", points: "1 point", note: "Excellent" },
  { key: "B", label: "Grade B", range: "60-74 marks", points: "2 points", note: "Very good" },
  { key: "C", label: "Grade C", range: "45-59 marks", points: "3 points", note: "Average" },
  { key: "D", label: "Grade D", range: "30-44 marks", points: "4 points", note: "Pass" },
  { key: "F", label: "Grade F", range: "0-29 marks", points: "5 points", note: "Fail" },
];

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatHistoryTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEnrollmentMonth(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function getTrendInfo(resultHistory) {
  if (resultHistory.length < 2) return null;
  const recent = resultHistory[0].computed;
  const previous = resultHistory[1].computed;
  if (recent?.avg === null || recent?.avg === undefined || previous?.avg === null || previous?.avg === undefined) {
    return null;
  }
  const delta = Number((recent.avg - previous.avg).toFixed(1));
  if (Math.abs(delta) < 0.5) {
    return { delta, direction: "stable", label: "Stable from previous sitting", color: "#64748b" };
  }
  if (delta > 0) {
    return { delta, direction: "up", label: `Improved by ${delta} pts`, color: "#15803d" };
  }
  return { delta, direction: "down", label: `Dropped by ${Math.abs(delta)} pts`, color: "#b91c1c" };
}

function getBestDivision(resultHistory) {
  const order = ["I", "II", "III", "IV", "0"];
  let best = null;
  resultHistory.forEach((entry) => {
    const division = entry.computed?.div;
    if (!division) return;
    if (!best || order.indexOf(division) < order.indexOf(best)) {
      best = division;
    }
  });
  return best;
}

function getLatestClassEntry(profile) {
  const entries = Array.isArray(profile?.entries) ? profile.entries : [];
  return entries[entries.length - 1] || null;
}

function getGuardianIdentity(context) {
  if (!context) return { name: "Not assigned", phone: "", location: "" };
  return {
    name: context.parentName || "Guardian",
    phone: context.phone || "",
    location: context.location || "",
  };
}

function getCommunicationStatus(entry) {
  if (!entry) return "pending";
  if (entry.gateway_status) return String(entry.gateway_status).toLowerCase();
  if (Number(entry.delivered || 0) > 0) return "delivered";
  if (Number(entry.failed || 0) > 0) return "failed";
  return "pending";
}

function getCommunicationTone(status) {
  if (status === "delivered") return { label: "Delivered", bg: "#ecfdf3", color: "#15803d", border: "#bbf7d0" };
  if (status === "failed") return { label: "Failed", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
  return { label: "Pending", bg: "#fffbeb", color: "#a16207", border: "#fcd34d" };
}

function getResultLabel(result) {
  if (!result) return "-";
  if (result.resultStatus === "ABSENT") return "ABS";
  if (result.resultStatus === "INCOMPLETE") return "INC";
  return result.div ? `Div ${result.div}` : "-";
}

function getRiskSummary(latestResult, trend) {
  if (!latestResult) {
    return {
      tone: "slate",
      title: "No academic record available",
      text: "This student has no saved exam results yet. Enter marks to generate a complete profile summary.",
      badge: "No data",
    };
  }

  const failingSubjects = (latestResult.grades || []).filter((grade) => grade?.grade === "F").length;
  const incompleteSubjects = Math.max(0, 7 - Number(latestResult.subjectsDone || 0));

  if (latestResult.resultStatus === "INCOMPLETE") {
    return {
      tone: "amber",
      title: "Incomplete result requires follow-up",
      text: `Only ${latestResult.subjectsDone || 0} subjects were recorded. Add the remaining ${incompleteSubjects} subject${incompleteSubjects === 1 ? "" : "s"} to compute a final division and full points.`,
      badge: "Incomplete",
    };
  }

  if (latestResult.div === "0" || latestResult.agrd === "F" || failingSubjects >= 4) {
    return {
      tone: "red",
      title: "Academic alert - urgent intervention needed",
      text: `Latest average is ${formatNumber(latestResult.avg)} (Grade ${latestResult.agrd || "-"}) with ${failingSubjects} subject${failingSubjects === 1 ? "" : "s"} at Grade F. Teacher and guardian follow-up is strongly advised.`,
      badge: "At-risk",
    };
  }

  if (latestResult.div === "IV" || (trend && trend.direction === "down")) {
    return {
      tone: "amber",
      title: "Performance watch - monitor closely",
      text: trend?.direction === "down"
        ? `Performance has fallen by ${Math.abs(trend.delta)} points from the previous sitting. Keep close follow-up on weak subjects and attendance.`
        : "Current division is IV. Reinforcement is needed to prevent the student from slipping into failure range.",
      badge: "Monitor",
    };
  }

  return {
    tone: "teal",
    title: "Performance currently stable",
    text: `Latest result is ${getResultLabel(latestResult)} with average ${formatNumber(latestResult.avg)} and ${latestResult.points ?? "-"} division points.`,
    badge: "Stable",
  };
}

function getAlertToneStyles(tone) {
  if (tone === "red") return { bg: "#fef2f2", border: "#fca5a5", color: "#991b1b" };
  if (tone === "amber") return { bg: "#fff7ed", border: "#fdba74", color: "#9a3412" };
  if (tone === "teal") return { bg: "#ecfeff", border: "#99f6e4", color: "#0f766e" };
  return { bg: "#f8fafc", border: "#cbd5e1", color: "#475569" };
}

function MetricCard({ label, value, note, tone = "default" }) {
  const tones = {
    default: { bg: "#fff", border: "#e2e8f0", color: "#0f172a", note: "#64748b" },
    red: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", note: "#b91c1c" },
    amber: { bg: "#fff7ed", border: "#fed7aa", color: "#9a3412", note: "#c2410c" },
    teal: { bg: "#ecfeff", border: "#a5f3fc", color: "#115e59", note: "#0f766e" },
  };
  const palette = tones[tone] || tones.default;
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        padding: "14px 16px",
        display: "grid",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: palette.color }}>{value}</div>
      {note ? <div style={{ fontSize: 12, color: palette.note, fontWeight: 600 }}>{note}</div> : null}
    </div>
  );
}

function InfoCard({ title, rows = [] }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: "18px 20px",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(110px, 130px) 1fr",
              gap: 10,
              alignItems: "start",
              paddingBottom: 8,
              borderBottom: "1px solid #eef2f7",
            }}
          >
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{row.label}</div>
            <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 700, lineHeight: 1.45 }}>{row.value || "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunicationRow({ title, subtitle, status, actionLabel, onAction }) {
  const tone = getCommunicationTone(status);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 12,
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid #eef2f7",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", lineHeight: 1.55 }}>{subtitle}</div>
      </div>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          style={{
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {actionLabel}
        </button>
      ) : null}
      <span
        style={{
          borderRadius: 999,
          border: `1px solid ${tone.border}`,
          background: tone.bg,
          color: tone.color,
          padding: "5px 10px",
          fontSize: 11,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        {tone.label}
      </span>
    </div>
  );
}

function SubjectTile({ subject, gradeEntry }) {
  const grade = gradeEntry?.grade || "";
  const bg = grade ? GRADE_BACKGROUNDS[grade] || "#fff" : "#fffdfa";
  const color = grade ? GRADE_COLORS[grade] || "#0f172a" : "#0f172a";
  const isMissing = !gradeEntry || gradeEntry.score === null || gradeEntry.score === undefined;
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${grade ? `${color}40` : "#e2e8f0"}`,
        background: bg,
        padding: "12px 14px",
        display: "grid",
        gap: 5,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {subject}
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, color: isMissing ? "#0f172a" : color }}>
        {isMissing ? "-" : formatNumber(gradeEntry.score)}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: isMissing ? "#64748b" : color }}>
        {isMissing
          ? "Not entered"
          : `Grade ${gradeEntry.grade} - ${GRADE_POINTS[gradeEntry.grade] ?? "-"} pts`}
      </div>
    </div>
  );
}

function ScoreOverviewCard({ entry, isMobile }) {
  const computed = entry.computed;
  const missingCount = Math.max(0, (entry.subjects || []).length - Number(computed?.subjectsDone || 0));
  const fCount = (computed?.grades || []).filter((grade) => grade?.grade === "F").length;
  const currentDivision = computed?.div || (computed?.resultStatus === "INCOMPLETE" ? "INC" : computed?.resultStatus === "ABSENT" ? "ABS" : "-");

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: isMobile ? 16 : 18,
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
            {entry.examType} {entry.year}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
            {[entry.form, entry.stream, entry.className].filter(Boolean).join(" - ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {computed?.agrd ? (
            <span style={{ ...pillStyle({ tone: "slate" }), background: GRADE_BACKGROUNDS[computed.agrd] || "#f8fafc", color: GRADE_COLORS[computed.agrd] || "#0f172a", borderColor: "transparent" }}>
              Avg {formatNumber(computed.avg)} - {computed.agrd}
            </span>
          ) : null}
          <span
            style={{
              ...pillStyle({ tone: "slate" }),
              background: computed?.div ? `${DIVISION_COLORS[computed.div] || "#64748b"}18` : "#f8fafc",
              color: computed?.div ? DIVISION_COLORS[computed.div] || "#0f172a" : "#475569",
              borderColor: "transparent",
            }}
          >
            {currentDivision}
          </span>
          <span style={pillStyle({ tone: "slate" })}>
            {computed?.points ?? "-"} pts
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        {(entry.subjects || []).map((subject, index) => (
          <SubjectTile key={`${entry.key}-${subject}-${index}`} subject={subject} gradeEntry={computed?.grades?.[index]} />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <MetricCard label="Total score" value={computed?.total ?? "-"} />
        <MetricCard label="Division points" value={computed?.points ?? "-"} tone={computed?.div === "IV" || computed?.div === "0" ? "red" : "amber"} />
        <MetricCard label="Division" value={currentDivision} tone={computed?.div === "IV" || computed?.div === "0" ? "red" : "default"} />
      </div>

      {computed?.resultStatus === "INCOMPLETE" ? (
        <div
          style={{
            borderRadius: 14,
            border: "1px solid #fdba74",
            background: "#fff7ed",
            padding: "14px 16px",
            color: "#9a3412",
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          Incomplete result: {missingCount} subject{missingCount === 1 ? "" : "s"} still missing. Enter all required scores to generate a full division and final points.
        </div>
      ) : null}

      {computed?.resultStatus === "COMPLETE" && fCount > 0 ? (
        <div
          style={{
            borderRadius: 14,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: "14px 16px",
            color: "#991b1b",
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          This student scored Grade F in {fCount} subject{fCount === 1 ? "" : "s"} counted toward the current division.
        </div>
      ) : null}
    </div>
  );
}

function ScaleCard({ title, items, activeKey, renderSuffix }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: "16px 18px",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item) => {
          const active = item.key === activeKey;
          const activeDivision = DIVISION_SCALE.find((entry) => entry.key === item.key);
          const bg = active ? (activeDivision?.bg || GRADE_BACKGROUNDS[item.key] || "#f8fafc") : "#fff";
          const border = active ? (activeDivision?.border || `${GRADE_COLORS[item.key] || "#94a3b8"}45`) : "#e2e8f0";
          const color = active ? (activeDivision?.color || GRADE_COLORS[item.key] || "#0f172a") : "#0f172a";
          return (
            <div
              key={item.key}
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "center",
                borderRadius: 12,
                border: `1px solid ${border}`,
                background: bg,
                padding: "10px 12px",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 999, background: color }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color }}>{item.label}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "#64748b" }}>{item.range} - {item.note}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color }}>{renderSuffix ? renderSuffix(item, active) : ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BackButton({ onBack }) {
  return (
    <button
      type="button"
      onClick={onBack}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid #dbe2ea",
        background: "#fff",
        color: "#475569",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="m12 5-7 7 7 7" />
      </svg>
      Back
    </button>
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
            classId: String(studentRef.classId || "").trim(),
            studentId: String(studentRef.studentId || studentRef.id || "").trim(),
          }
        : { admissionNo: "", indexNo: String(indexNo || "").trim(), classId: "", studentId: "" },
    [indexNo, studentRef],
  );

  const profileTarget =
    resolvedStudentRef.admissionNo ||
    resolvedStudentRef.indexNo ||
    (resolvedStudentRef.classId && resolvedStudentRef.studentId
      ? `${resolvedStudentRef.classId}:${resolvedStudentRef.studentId}`
      : "");

  useEffect(() => {
    if (!profileTarget) return;
    setLoading(true);
    setError(null);
    API.getStudentProfile(resolvedStudentRef)
      .then(setProfile)
      .catch((err) => setError(err.message))
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
        if (!cancelled) setSmsLoading(false);
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
            entry.subjects,
          );
          return {
            key: `${entry.classId}-${entry.year}-${entry.form}-${entry.stream}-${examType}`,
            ...entry,
            examType,
            computed,
            classLabel: [entry.form, entry.stream, entry.year].filter(Boolean).join(" "),
          };
        }),
      )
      .sort((left, right) => {
        const yearDiff = (Number(right.year) || 0) - (Number(left.year) || 0);
        if (yearDiff !== 0) return yearDiff;
        return String(right.examType || "").localeCompare(String(left.examType || ""), "en");
      });
  }, [profile]);

  const latestEntry = getLatestClassEntry(profile);
  const latestResult = resultHistory[0]?.computed || null;
  const latestResultEntry = resultHistory[0] || null;
  const bestDivision = getBestDivision(resultHistory);
  const trend = getTrendInfo(resultHistory);
  const riskSummary = getRiskSummary(latestResult, trend);
  const alertStyles = getAlertToneStyles(riskSummary.tone);
  const failingSubjects = (latestResult?.grades || []).filter((grade) => grade?.grade === "F").length;
  const guardian = getGuardianIdentity(communicationContext);
  const latestClassLabel = latestEntry ? [latestEntry.form, latestEntry.stream, latestEntry.year].filter(Boolean).join(" ") : "-";
  const generatedCommunicationRows = useMemo(() => {
    const rows = [];
    (smsHistory || []).slice(0, 6).forEach((entry) => {
      const status = getCommunicationStatus(entry);
      rows.push({
        key: entry.id || `${entry.created_at}-${entry.exam || "sms"}`,
        title: entry.exam ? `${entry.exam} results sent` : "Guardian message sent",
        subtitle: [
          formatHistoryTime(entry.created_at),
          entry.message_preview ? entry.message_preview : "",
        ]
          .filter(Boolean)
          .join(" - "),
        status,
      });
    });

    if (latestResult?.resultStatus === "INCOMPLETE") {
      rows.push({
        key: "incomplete-recommendation",
        title: `${latestResultEntry?.examType || "Latest exam"} results - not yet complete`,
        subtitle: "Exam marked incomplete. Enter all required subject scores before sending the final results message.",
        status: "pending",
      });
    } else if (riskSummary.tone !== "teal") {
      rows.push({
        key: "academic-alert",
        title: "Academic alert - not yet sent",
        subtitle: "Recommended guardian action message based on the latest performance trend and division risk.",
        status: "pending",
        actionLabel: "Draft SMS",
      });
    }

    return rows;
  }, [latestResult, latestResultEntry?.examType, riskSummary.tone, smsHistory]);

  const pageStyle = {
    flex: 1,
    overflowY: "auto",
    padding: isXs ? 10 : isMobile ? 14 : 24,
    display: "grid",
    alignContent: "start",
    gap: 16,
    minHeight: 0,
    background: "#f8fafc",
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <BackButton onBack={onBack} />
        <div style={{ color: "#64748b", fontSize: 14, padding: "12px 2px" }}>Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <BackButton onBack={onBack} />
        <div
          style={{
            background: "#fff",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            borderRadius: 16,
            padding: "16px 18px",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <BackButton onBack={onBack} />
        {guardian.phone && onOpenSms ? (
          <button
            type="button"
            onClick={() => onOpenSms(communicationContext)}
            style={{
              border: "1px solid #dbeafe",
              background: "#0f172a",
              color: "#fff",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Draft guardian SMS
          </button>
        ) : null}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 20,
          padding: isMobile ? 16 : 20,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "72px minmax(0, 1fr) auto", gap: 14, alignItems: "start" }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              border: "2px solid #d6d3d1",
              background: "#fafaf9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
              color: "#292524",
            }}
          >
            {String(profile.name || "S")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() || "")
              .join("") || "S"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 28 : 30, fontWeight: 800, color: "#18181b", lineHeight: 1.06 }}>
              {profile.name || "Unknown student"}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#52525b", lineHeight: 1.6 }}>
              Adm. No: {profile.admissionNo || "-"} · CNO: {profile.indexNo || "-"} · {profile.sex === "F" ? "Female" : "Male"}
            </div>
            <div style={{ marginTop: 3, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
              {latestClassLabel} · Current academic record
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {latestEntry?.form ? <span style={pillStyle({ tone: "slate" })}>{latestEntry.form}</span> : null}
              {latestEntry?.stream ? <span style={pillStyle({ tone: "slate" })}>{latestEntry.stream}</span> : null}
              {latestEntry?.year ? <span style={pillStyle({ tone: "slate" })}>{latestEntry.year}</span> : null}
              <span style={pillStyle({ tone: riskSummary.tone === "red" ? "red" : riskSummary.tone === "amber" ? "amber" : "teal" })}>
                {riskSummary.badge}
              </span>
            </div>
          </div>
          <div style={{ textAlign: isMobile ? "left" : "right" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: latestResult?.div ? DIVISION_COLORS[latestResult.div] || "#7f1d1d" : "#0f172a" }}>
              {getResultLabel(latestResult)}
            </div>
            <div style={{ marginTop: 2, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              Current division
            </div>
            {trend ? (
              <div style={{ marginTop: 8, fontSize: 12, color: trend.color, fontWeight: 700 }}>
                {trend.direction === "down" ? "v" : trend.direction === "up" ? "^" : "-"} {trend.label}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${alertStyles.border}`,
            background: alertStyles.bg,
            color: alertStyles.color,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800 }}>{riskSummary.title}</div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, fontWeight: 600 }}>{riskSummary.text}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <MetricCard label="Exams recorded" value={resultHistory.length} />
        <MetricCard
          label="Latest avg"
          value={latestResult ? formatNumber(latestResult.avg) : "-"}
          note={latestResult?.agrd ? `Latest avg - Grade ${latestResult.agrd}` : null}
          tone={latestResult?.agrd === "F" ? "red" : latestResult?.agrd === "D" ? "amber" : "default"}
        />
        <MetricCard
          label="Division"
          value={getResultLabel(latestResult)}
          note={bestDivision ? `Best division ${bestDivision}` : null}
          tone={latestResult?.div === "IV" || latestResult?.div === "0" ? "red" : "default"}
        />
        <MetricCard
          label="Subjects at F"
          value={failingSubjects}
          note={failingSubjects ? "Subjects at Grade F" : "No current F subjects"}
          tone={failingSubjects > 0 ? "red" : "teal"}
        />
        <MetricCard label="Active class" value="1" note={latestClassLabel} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 12,
        }}
      >
        <InfoCard
          title="Student details"
          rows={[
            { label: "Full name", value: profile.name || "-" },
            { label: "Adm. No", value: profile.admissionNo || "-" },
            { label: "CNO", value: profile.indexNo || "-" },
            { label: "Sex", value: profile.sex === "F" ? "Female" : "Male" },
            { label: "Form / Class", value: latestClassLabel },
            { label: "Enrolled", value: latestEntry?.year ? formatEnrollmentMonth(`${latestEntry.year}-01-01`) : "-" },
          ]}
        />
        <InfoCard
          title="Teacher & guardian"
          rows={[
            { label: "Class teacher", value: latestEntry?.classTeacher || "Not assigned" },
            { label: "Guardian", value: guardian.name || "Not assigned" },
            { label: "Phone", value: guardian.phone || "Not set" },
            { label: "Location", value: guardian.location || "Not set" },
          ]}
        />
      </div>

      {latestResultEntry ? <ScoreOverviewCard entry={latestResultEntry} isMobile={isMobile} /> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 12,
        }}
      >
        <ScaleCard
          title="NECTA division scale"
          items={DIVISION_SCALE}
          activeKey={latestResult?.div || ""}
          renderSuffix={(item, active) => (active ? `${latestResult?.points ?? "-"} pts` : "")}
        />
        <ScaleCard
          title="Grade scale"
          items={GRADE_SCALE}
          activeKey={latestResult?.agrd || ""}
          renderSuffix={(item, active) => {
            if (!active) return item.points;
            const gradeCount = (latestResult?.grades || []).filter((grade) => grade?.grade === item.key).length;
            return gradeCount > 0 ? `${gradeCount} subject${gradeCount === 1 ? "" : "s"}` : item.points;
          }}
        />
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 18,
          padding: "16px 18px",
          display: "grid",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Communication history
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>
              Guardian contact actions and result message history.
            </div>
          </div>
          {guardian.phone && onOpenSms ? (
            <button
              type="button"
              onClick={() => onOpenSms(communicationContext)}
              style={{
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#0f172a",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Draft guardian SMS
            </button>
          ) : null}
        </div>

        {smsLoading ? (
          <div style={{ padding: "12px 0", fontSize: 13, color: "#64748b" }}>Loading communication history...</div>
        ) : generatedCommunicationRows.length ? (
          <div>
            {generatedCommunicationRows.map((row, index) => (
              <div key={row.key} style={{ borderBottom: index < generatedCommunicationRows.length - 1 ? "1px solid #eef2f7" : "none" }}>
                <CommunicationRow
                  title={row.title}
                  subtitle={row.subtitle}
                  status={row.status}
                  actionLabel={row.actionLabel}
                  onAction={row.actionLabel && onOpenSms ? () => onOpenSms(communicationContext) : null}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "12px 0", fontSize: 13, color: "#64748b" }}>
            No communication history recorded for this student yet.
          </div>
        )}
      </div>
    </div>
  );
}
