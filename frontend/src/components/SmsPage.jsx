import { useEffect, useMemo, useState } from "react";
import {
  fieldStyle,
  glassPanelStyle,
  pillStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  softCardStyle,
} from "../utils/designSystem";
import { API } from "../api";

const MESSAGE_TEMPLATES = [
  {
    key: "meeting",
    label: "Parent meeting",
    message:
      "Bonde Secondary School: Dear parent/guardian, you are requested to attend a school meeting on [DATE] at [TIME]. Thank you.",
  },
  {
    key: "exam",
    label: "Exam notice",
    message:
      "Bonde Secondary School: Dear parent/guardian, [STUDENT] will sit for [EXAM] starting on [DATE]. Please ensure preparation and punctual attendance.",
  },
  {
    key: "attendance",
    label: "Attendance follow-up",
    message:
      "Bonde Secondary School: Dear parent/guardian, [STUDENT] needs attendance follow-up. Please contact the school office as soon as possible.",
  },
  {
    key: "results",
    label: "Results ready",
    message:
      "Bonde Secondary School: Dear parent/guardian, the latest class results are ready on the portal. Please log in or contact the school for guidance.",
  },
];

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function uniqueRecipientKey(entry) {
  return `${entry.phone}|${entry.studentId || entry.classId || entry.classLabel}`;
}

function buildRecipientDirectory(classes = []) {
  return (classes || []).flatMap((cls) =>
    (cls.students || [])
      .map((student) => {
        const phone = normalizePhone(student.parentPhone || student.parent_phone || "");
        if (!phone) return null;
        return {
          id: `${cls.id}-${student.id}`,
          phone,
          parentName: String(student.parentName || student.parent_name || "").trim() || "Guardian",
          studentName: String(student.name || "").trim() || "Student",
          studentId: student.id,
          classId: cls.id,
          classLabel: [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim(),
          form: cls.form || "",
          stream: cls.stream || "",
          year: cls.year || "",
        };
      })
      .filter(Boolean)
  );
}

function exportRecipientsCsv(recipients) {
  const lines = [
    ["Phone", "Guardian", "Student", "Class"].join(","),
    ...recipients.map((entry) =>
      [
        entry.phone,
        `"${String(entry.parentName || "").replace(/"/g, '""')}"`,
        `"${String(entry.studentName || "").replace(/"/g, '""')}"`,
        `"${String(entry.classLabel || "").replace(/"/g, '""')}"`,
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bonde-sms-recipients.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function copyText(value) {
  if (!value) return Promise.resolve(false);
  return navigator.clipboard?.writeText(value).then(() => true).catch(() => false);
}

export function SmsPage({ classes = [], showToast }) {
  const [scope, setScope] = useState("all");
  const [year, setYear] = useState("all");
  const [form, setForm] = useState("all");
  const [classId, setClassId] = useState("all");
  const [senderId, setSenderId] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [message, setMessage] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [gatewayStatus, setGatewayStatus] = useState({ configured: false, loading: true });
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    API.getSmsGatewayStatus()
      .then((status) => {
        if (cancelled) return;
        setGatewayStatus({ ...status, loading: false });
        if (status?.senderId) {
          setSenderId((current) => current || status.senderId);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setGatewayStatus({ configured: false, loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allRecipients = useMemo(() => buildRecipientDirectory(classes), [classes]);
  const years = useMemo(
    () => Array.from(new Set(classes.map((cls) => String(cls.year || "")).filter(Boolean))).sort((a, b) => Number(b) - Number(a)),
    [classes]
  );
  const forms = useMemo(
    () => Array.from(new Set(classes.map((cls) => String(cls.form || "")).filter(Boolean))),
    [classes]
  );

  const classOptions = useMemo(() => {
    return classes
      .filter((cls) => (year === "all" || String(cls.year) === year) && (form === "all" || cls.form === form))
      .map((cls) => ({
        id: cls.id,
        label: [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim() || cls.name || "Class",
      }));
  }, [classes, form, year]);

  const filteredRecipients = useMemo(() => {
    let entries = allRecipients;
    if (scope === "year" && year !== "all") {
      entries = entries.filter((entry) => String(entry.year) === year);
    }
    if (scope === "form" && form !== "all") {
      entries = entries.filter((entry) => entry.form === form);
    }
    if (scope === "class" && classId !== "all") {
      entries = entries.filter((entry) => entry.classId === classId);
    }
    const deduped = Array.from(new Map(entries.map((entry) => [uniqueRecipientKey(entry), entry])).values());
    return deduped;
  }, [allRecipients, classId, form, scope, year]);

  const manualRecipientList = useMemo(
    () =>
      Array.from(
        new Set(
          manualNumbers
            .split(/[\s,;\n]+/)
            .map(normalizePhone)
            .filter(Boolean)
        )
      ),
    [manualNumbers]
  );

  const recipients = scope === "manual"
    ? manualRecipientList.map((phone, index) => ({
        id: `manual-${index}`,
        phone,
        parentName: "Manual recipient",
        studentName: "",
        classLabel: "Manual list",
      }))
    : filteredRecipients;

  const uniquePhones = Array.from(new Set(recipients.map((entry) => entry.phone)));
  const charCount = message.length;
  const smsSegments = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  const stats = [
    { label: "Recipients", value: recipients.length },
    { label: "Unique numbers", value: uniquePhones.length },
    { label: "Characters", value: charCount },
    { label: "SMS segments", value: smsSegments },
  ];

  const handleTemplateSelect = (template) => {
    setMessage(template.message);
  };

  const handleCopyMessage = async () => {
    const ok = await copyText(message);
    showToast?.(ok ? "SMS message copied" : "Unable to copy SMS message", ok ? "success" : "error");
  };

  const handleCopyNumbers = async () => {
    const ok = await copyText(uniquePhones.join(", "));
    showToast?.(ok ? "Recipient numbers copied" : "Unable to copy recipient numbers", ok ? "success" : "error");
  };

  const handleSendSms = async () => {
    if (!gatewayStatus.configured) {
      showToast?.("Beem Africa SMS credentials are not configured", "error");
      return;
    }
    if (!message.trim()) {
      showToast?.("Type the SMS message first", "error");
      return;
    }
    if (!recipients.length) {
      showToast?.("No valid recipients found for this SMS scope", "error");
      return;
    }

    setIsSending(true);
    setSendResult(null);
    try {
      const result = await API.sendSms({
        message,
        senderId,
        scheduleTime,
        recipients: recipients.map((entry, index) => ({
          id: entry.id || `recipient-${index + 1}`,
          phone: entry.phone,
        })),
      });
      setSendResult(result);
      showToast?.(
        `SMS submitted to ${result.valid ?? result.totalRequested ?? recipients.length} recipient${(result.valid ?? result.totalRequested ?? recipients.length) === 1 ? "" : "s"}`,
        "success"
      );
    } catch (err) {
      showToast?.(err.message || "Unable to send SMS right now", "error");
    } finally {
      setIsSending(false);
    }
  };

  const scopeDescription = {
    all: "Send to all guardian numbers available in the visible classes.",
    year: "Target all guardians in one academic year.",
    form: "Target all guardians in one form across streams.",
    class: "Target one specific class.",
    manual: "Paste external numbers manually when they are not already stored in the system.",
  }[scope];

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 14,
        display: "grid",
        gap: 16,
        background: "linear-gradient(180deg, #f7fafc 0%, #edf4fb 100%)",
      }}
    >
      <div style={{ ...glassPanelStyle({ padding: 18, radius: 24 }), display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...pillStyle({ tone: "blue" }), display: "inline-flex" }}>Communication</div>
            <div style={{ marginTop: 10, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>SMS Center</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", maxWidth: 760, lineHeight: 1.7 }}>
              Prepare guardian SMS messages from real class data, preview recipients, and send them through Beem Africa.
              You can still copy the message and export recipients when you want an external review first.
            </div>
          </div>
          <div style={{ ...softCardStyle({ padding: 12, radius: 18 }), minWidth: 240, display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Gateway status</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
              {gatewayStatus.loading
                ? "Checking Beem Africa SMS connection..."
                : gatewayStatus.configured
                ? `Beem Africa is connected${gatewayStatus.senderId ? ` with sender ${gatewayStatus.senderId}` : ""}.`
                : gatewayStatus.error || "Beem Africa credentials are not configured yet."}
            </div>
            <div style={{ ...pillStyle({ tone: gatewayStatus.configured ? "teal" : "amber" }), width: "fit-content" }}>
              {gatewayStatus.configured ? "Gateway connected" : "Gateway not configured"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {stats.map((item) => (
            <div key={item.label} style={{ ...softCardStyle({ padding: 14, radius: 18 }), display: "grid", gap: 4 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 24, color: "#0f172a", fontWeight: 900 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div style={{ ...glassPanelStyle({ padding: 16, radius: 24 }), display: "grid", gap: 14, alignContent: "start" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>Audience Targeting</div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{scopeDescription}</div>

          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>SMS Scope</span>
              <select value={scope} onChange={(e) => setScope(e.target.value)} style={fieldStyle()}>
                <option value="all">All Guardians</option>
                <option value="year">Academic Year</option>
                <option value="form">Form</option>
                <option value="class">Specific Class</option>
                <option value="manual">Manual Numbers</option>
              </select>
            </label>

            {scope === "year" && (
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Academic Year</span>
                <select value={year} onChange={(e) => setYear(e.target.value)} style={fieldStyle()}>
                  <option value="all">Select year</option>
                  {years.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </label>
            )}

            {scope === "form" && (
              <>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Academic Year</span>
                  <select value={year} onChange={(e) => setYear(e.target.value)} style={fieldStyle()}>
                    <option value="all">All years</option>
                    {years.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Form</span>
                  <select value={form} onChange={(e) => setForm(e.target.value)} style={fieldStyle()}>
                    <option value="all">Select form</option>
                    {forms.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {scope === "class" && (
              <>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Academic Year</span>
                  <select value={year} onChange={(e) => setYear(e.target.value)} style={fieldStyle()}>
                    <option value="all">All years</option>
                    {years.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Form</span>
                  <select value={form} onChange={(e) => setForm(e.target.value)} style={fieldStyle()}>
                    <option value="all">All forms</option>
                    {forms.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Class</span>
                  <select value={classId} onChange={(e) => setClassId(e.target.value)} style={fieldStyle()}>
                    <option value="all">Select class</option>
                    {classOptions.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.label}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {scope === "manual" && (
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Manual Numbers</span>
                <textarea
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  rows={6}
                  placeholder="255712345678, 255754000111"
                  style={{ ...fieldStyle(), resize: "vertical", minHeight: 120 }}
                />
              </label>
            )}
          </div>
        </div>

        <div style={{ ...glassPanelStyle({ padding: 16, radius: 24 }), display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>Message Composer</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MESSAGE_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  onClick={() => handleTemplateSelect(template)}
                  style={secondaryButtonStyle({ compact: true })}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Sender ID</span>
              <input
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder="INFO"
                style={fieldStyle()}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Schedule Time</span>
              <input
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                placeholder="Optional gateway schedule"
                style={fieldStyle()}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>SMS Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Type the SMS message to send to selected guardians..."
              style={{ ...fieldStyle(), resize: "vertical", minHeight: 170 }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handleSendSms} disabled={isSending || !gatewayStatus.configured} style={{ ...primaryButtonStyle({ compact: false }), opacity: isSending || !gatewayStatus.configured ? 0.6 : 1 }}>
              {isSending ? "Sending..." : "Send with Beem"}
            </button>
            <button onClick={handleCopyMessage} style={secondaryButtonStyle({ compact: false })}>
              Copy Message
            </button>
            <button onClick={handleCopyNumbers} style={secondaryButtonStyle({ compact: false })}>
              Copy Numbers
            </button>
            <button onClick={() => exportRecipientsCsv(recipients)} style={secondaryButtonStyle({ compact: false })}>
              Download Recipients CSV
            </button>
          </div>

          {sendResult ? (
            <div style={{ ...softCardStyle({ padding: 14, radius: 18 }), display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Latest send summary</div>
                <div style={{ ...pillStyle({ tone: sendResult.successful ? "teal" : "amber" }) }}>
                  {sendResult.successful ? "Submitted" : "Submitted with warnings"}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                {[
                  { label: "Requested", value: sendResult.totalRequested ?? 0 },
                  { label: "Valid", value: sendResult.valid ?? 0 },
                  { label: "Invalid", value: sendResult.invalid ?? 0 },
                  { label: "Batches", value: sendResult.batchCount ?? 0 },
                ].map((item) => (
                  <div key={item.label} style={{ ...softCardStyle({ padding: 12, radius: 14 }) }}>
                    <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em" }}>
                      {item.label}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ ...glassPanelStyle({ padding: 16, radius: 24 }), display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>Recipient Preview</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Preview the first recipients that will receive this message from the current selection.
            </div>
          </div>
          <div style={{ ...pillStyle({ tone: "teal" }), display: "inline-flex" }}>
            {uniquePhones.length} unique numbers
          </div>
        </div>

        {recipients.length === 0 ? (
          <div
            style={{
              ...softCardStyle({ padding: 20, radius: 18 }),
              textAlign: "center",
              color: "#64748b",
              fontSize: 13,
            }}
          >
            No recipient phones match the current SMS scope yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  {["Phone", "Guardian", "Student", "Class"].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "left",
                        padding: "11px 12px",
                        fontSize: 12,
                        color: "#475569",
                        borderBottom: "1px solid rgba(226,232,240,0.92)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recipients.slice(0, 20).map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                      {entry.phone}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155" }}>
                      {entry.parentName}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155" }}>
                      {entry.studentName || "-"}
                    </td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(241,245,249,1)", fontSize: 13, color: "#334155" }}>
                      {entry.classLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
