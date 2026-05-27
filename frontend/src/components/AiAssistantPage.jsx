import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api";
import { useViewport } from "../utils/useViewport";
import {
  fieldStyle,
  pillStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../utils/designSystem";

function getClassLabel(classRecord = {}) {
  return (
    [classRecord.form, classRecord.stream, classRecord.year].filter(Boolean).join(" ").trim() ||
    classRecord.name ||
    "Class"
  );
}

function buildInitialMessages(activeClass) {
  const classLabel = activeClass ? getClassLabel(activeClass) : "your accessible classes";
  return [
    {
      role: "assistant",
      content: `I can summarize ${classLabel}, find incomplete or failed students, search by Admission Number, and draft guardian SMS text. I am read-only.`,
    },
  ];
}

function buildSuggestionPrompts(classRecord) {
  if (!classRecord) {
    return [
      "List the classes I can access.",
      "Explain what you can help with.",
      "How should I search for a student by Admission Number?",
    ];
  }
  const label = getClassLabel(classRecord);
  return [
    `Summarize ${label}.`,
    `Who failed in ${label}?`,
    `Which students are incomplete in ${label}?`,
    `Draft guardian SMS context for failed students in ${label}.`,
  ];
}

function AssistantBadge() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.34), transparent 45%), linear-gradient(135deg, #eff6ff, #ffffff)",
        border: "1px solid rgba(191,219,254,0.96)",
        boxShadow: "0 10px 24px rgba(37,99,235,0.10)",
        color: "#1d4ed8",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3.8 14.4 8l4.7.8-3.3 3.3.6 4.7L12 14.7 7.6 16.8l.6-4.7-3.3-3.3 4.7-.8Z" />
        <path d="M12 8.8v6.2" />
        <path d="M8.9 11.9h6.2" />
      </svg>
    </div>
  );
}

function UserBadge() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #1d4ed8, #0f8b8d)",
        boxShadow: "0 12px 24px rgba(29,78,216,0.20)",
        color: "#ffffff",
        flexShrink: 0,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: "0.08em",
      }}
    >
      YOU
    </div>
  );
}

function ContextChip({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        minWidth: 0,
        padding: "12px 14px",
        borderRadius: 16,
        background: "rgba(248,250,252,0.88)",
        border: "1px solid rgba(226,232,240,0.96)",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748b" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: "#0f172a",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function AiAssistantPage({
  classes = [],
  activeClass = null,
  activeExam = "",
  currentUser = null,
  topBarHeight = 64,
}) {
  const { isMobile, isXs } = useViewport();
  const [selectedClassId, setSelectedClassId] = useState(() => activeClass?.id || "");
  const [messages, setMessages] = useState(() => buildInitialMessages(activeClass));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!selectedClassId && activeClass?.id) {
      setSelectedClassId(activeClass.id);
    }
  }, [activeClass, selectedClassId]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isSending]);

  const classOptions = useMemo(
    () =>
      (classes || [])
        .slice()
        .sort((left, right) => getClassLabel(left).localeCompare(getClassLabel(right), "en")),
    [classes]
  );

  const selectedClass = useMemo(() => {
    if (selectedClassId) {
      return classOptions.find((entry) => entry.id === selectedClassId) || null;
    }
    return activeClass || null;
  }, [activeClass, classOptions, selectedClassId]);

  const suggestions = useMemo(() => buildSuggestionPrompts(selectedClass), [selectedClass]);

  async function sendMessage(content) {
    const text = String(content || "").trim();
    if (!text || isSending) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const response = await API.aiChat({
        messages: nextMessages,
        context: {
          activeClassId: selectedClass?.id || "",
          activeExam: activeExam || "",
        },
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: String(response?.reply || "I could not generate a response."),
        },
      ]);
    } catch (err) {
      setError(err.message || "Unable to contact the AI assistant.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      style={{
        padding: isMobile ? 10 : 18,
        minHeight: 0,
        display: "grid",
        ...(isMobile
          ? {
              height: `calc(100dvh - ${topBarHeight}px)`,
              overflowY: "auto",
              overflowX: "hidden",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
              WebkitOverflowScrolling: "touch",
            }
          : null),
      }}
    >
      <section
        style={{
          minHeight: isMobile ? "auto" : "calc(100vh - 170px)",
          display: "grid",
          gridTemplateRows: isMobile ? "auto auto auto auto" : "auto auto minmax(0, 1fr) auto",
          borderRadius: isMobile ? 22 : 30,
          border: "1px solid rgba(226,232,240,0.92)",
          background:
            "radial-gradient(circle at top left, rgba(219,234,254,0.70), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,250,255,0.94))",
          boxShadow: "0 24px 56px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
          overflow: isMobile ? "visible" : "hidden",
          marginBottom: isMobile ? 6 : 0,
        }}
      >
        <header
          style={{
            padding: isMobile ? "16px 16px 14px" : "20px 22px 16px",
            borderBottom: "1px solid rgba(226,232,240,0.84)",
            display: "grid",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              alignItems: isMobile ? "stretch" : "center",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
              <AssistantBadge />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, lineHeight: 1.1, color: "#0f172a" }}>
                    Academic Assistant
                  </h1>
                  <span style={pillStyle({ tone: "blue" })}>Read-only</span>
                  {currentUser?.role ? (
                    <span style={pillStyle({ tone: "slate" })}>
                      {String(currentUser.role).toUpperCase()}
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
                  School operations chat for results, student lookups, and guardian message drafting.
                </p>
              </div>
            </div>

            <label style={{ display: "grid", gap: 6, minWidth: 240, maxWidth: 320, flex: "1 1 260px" }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748b" }}>
                CLASS CONTEXT
              </span>
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                style={{ ...fieldStyle(), paddingRight: 36 }}
              >
                <option value="">No fixed class</option>
                {classOptions.map((classRecord) => (
                  <option key={classRecord.id} value={classRecord.id}>
                    {getClassLabel(classRecord)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <ContextChip label="Selected Class" value={selectedClass ? getClassLabel(selectedClass) : "Flexible"} />
            <ContextChip label="Exam Context" value={activeExam || "Use class default"} />
            <ContextChip label="Student Identity" value="Admission Number preferred" />
          </div>
        </header>

        <div
          style={{
            padding: isMobile ? "12px 16px 10px" : "14px 22px 10px",
            borderBottom: "1px solid rgba(226,232,240,0.78)",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => sendMessage(suggestion)}
              disabled={isSending}
              style={{
                ...secondaryButtonStyle({ compact: true }),
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div
          ref={listRef}
          style={{
            minHeight: 0,
            overflowY: isMobile ? "visible" : "auto",
            padding: isMobile ? "18px 16px 18px" : "26px 22px 22px",
            display: "grid",
            gap: isMobile ? 18 : 24,
            alignContent: "start",
          }}
        >
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            return (
              <div
                key={`${message.role}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "minmax(0, 1fr)"
                    : isAssistant
                    ? "36px minmax(0, 820px)"
                    : "minmax(0, 820px) 36px",
                  justifyContent: isAssistant ? "start" : "end",
                  alignItems: "start",
                  gap: 14,
                }}
              >
                {!isMobile && isAssistant ? <AssistantBadge /> : null}
                <div
                  style={{
                    maxWidth: 820,
                    justifySelf: isAssistant ? "start" : "end",
                    borderRadius: isAssistant ? (isMobile ? 20 : 0) : 24,
                    padding: isAssistant ? "2px 0 0" : "16px 18px",
                    background: isAssistant
                      ? isMobile
                        ? "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(243,247,255,0.92))"
                        : "transparent"
                      : "linear-gradient(135deg, #1d4ed8, #0f8b8d)",
                    color: isAssistant ? "#0f172a" : "#ffffff",
                    boxShadow: isAssistant
                      ? isMobile
                        ? "0 10px 22px rgba(15,23,42,0.05)"
                        : "none"
                      : "0 16px 32px rgba(29,78,216,0.18)",
                    border: isAssistant && isMobile ? "1px solid rgba(226,232,240,0.92)" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    {isMobile ? (
                      isAssistant ? <AssistantBadge /> : <UserBadge />
                    ) : null}
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                        color: isAssistant ? "#64748b" : "rgba(255,255,255,0.78)",
                      }}
                    >
                      {isAssistant ? "ACADEMIC ASSISTANT" : "YOU"}
                    </div>
                  </div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.72,
                      fontSize: 15,
                    }}
                  >
                    {message.content}
                  </div>
                </div>
                {!isMobile && !isAssistant ? <UserBadge /> : null}
              </div>
            );
          })}

          {isSending ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "36px auto",
                gap: 14,
                alignItems: "start",
              }}
            >
              {!isMobile ? <AssistantBadge /> : null}
              <div
                style={{
                  paddingTop: 2,
                  ...(isMobile
                    ? {
                        borderRadius: 20,
                        border: "1px solid rgba(226,232,240,0.92)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(243,247,255,0.92))",
                        boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
                        padding: "14px 16px",
                      }
                    : null),
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  {isMobile ? <AssistantBadge /> : null}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      color: "#64748b",
                    }}
                  >
                    ACADEMIC ASSISTANT
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#334155" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#94a3b8",
                      boxShadow: "18px 0 0 #cbd5e1, 36px 0 0 #e2e8f0",
                      marginRight: 36,
                    }}
                  />
                  Thinking...
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            padding: isMobile ? "14px 16px 16px" : "16px 22px 22px",
            borderTop: "1px solid rgba(226,232,240,0.84)",
            background: "rgba(255,255,255,0.90)",
            display: "grid",
            gap: 10,
            position: "relative",
          }}
        >
          {error ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(248,113,113,0.24)",
                background: "rgba(254,242,242,0.92)",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(draft);
            }}
            style={{
              display: "grid",
              gap: 12,
              borderRadius: 22,
              border: "1px solid rgba(214,226,245,0.96)",
              background: "#ffffff",
              boxShadow: "0 18px 32px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.96)",
              padding: isXs ? 12 : 14,
            }}
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a class, a student Admission Number, incomplete results, or guardian SMS drafting."
              rows={3}
              style={{
                border: "none",
                outline: "none",
                resize: "none",
                minHeight: isMobile ? 74 : 86,
                fontFamily: "inherit",
                fontSize: 15,
                lineHeight: 1.6,
                color: "#0f172a",
                background: "transparent",
                padding: "2px 2px 0",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                Admission Number is preferred when you ask about a specific student.
              </span>
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                style={{
                  ...primaryButtonStyle(),
                  borderRadius: 16,
                  minWidth: isMobile ? 132 : 148,
                  opacity: isSending || !draft.trim() ? 0.58 : 1,
                  cursor: isSending || !draft.trim() ? "not-allowed" : "pointer",
                }}
              >
                Send Message
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
