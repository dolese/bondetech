import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api";
import {
  fieldStyle,
  glassPanelStyle,
  pillStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  softCardStyle,
} from "../utils/designSystem";

function getClassLabel(classRecord = {}) {
  return (
    [classRecord.form, classRecord.stream, classRecord.year].filter(Boolean).join(" ").trim() ||
    classRecord.name ||
    "Class"
  );
}

function buildInitialMessages(activeClass) {
  const classLabel = activeClass ? getClassLabel(activeClass) : "your current classes";
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

export function AiAssistantPage({
  classes = [],
  activeClass = null,
  activeExam = "",
  currentUser = null,
}) {
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
        display: "grid",
        gap: 18,
        padding: 18,
        minHeight: 0,
      }}
    >
      <section style={glassPanelStyle({ padding: 20, radius: 28 })}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <span style={pillStyle({ tone: "blue" })}>AI Assistant</span>
          <span style={pillStyle({ tone: "slate" })}>Read-only</span>
          {currentUser?.role ? (
            <span style={pillStyle({ tone: "teal" })}>{String(currentUser.role).toUpperCase()}</span>
          ) : null}
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, color: "#0f172a" }}>
            Academic Assistant
          </h1>
          <p style={{ margin: 0, color: "#475569", fontSize: 14, maxWidth: 840 }}>
            Ask about class performance, incomplete students, Admission Number lookups, and guardian
            SMS drafting context. This assistant does not edit records or send SMS.
          </p>
        </div>
      </section>

      <section
        style={{
          ...softCardStyle({ padding: 16, radius: 22 }),
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Class Context</span>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              style={fieldStyle()}
            >
              <option value="">No fixed class</option>
              {classOptions.map((classRecord) => (
                <option key={classRecord.id} value={classRecord.id}>
                  {getClassLabel(classRecord)}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Exam Context</span>
            <div style={{ ...fieldStyle(), display: "flex", alignItems: "center", minHeight: 46 }}>
              {activeExam || "Use class default"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => sendMessage(suggestion)}
              disabled={isSending}
              style={secondaryButtonStyle({ compact: true })}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          ...glassPanelStyle({ padding: 0, radius: 28 }),
          display: "grid",
          minHeight: 520,
          overflow: "hidden",
        }}
      >
        <div
          ref={listRef}
          style={{
            minHeight: 0,
            overflowY: "auto",
            padding: 18,
            display: "grid",
            gap: 12,
            alignContent: "start",
          }}
        >
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            return (
              <div
                key={`${message.role}-${index}`}
                style={{
                  justifySelf: isAssistant ? "stretch" : "end",
                  maxWidth: isAssistant ? "100%" : "min(680px, 92%)",
                  ...softCardStyle({
                    padding: 14,
                    radius: 20,
                  }),
                  background: isAssistant
                    ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(241,245,255,0.92))"
                    : "linear-gradient(135deg, rgba(29,78,216,0.96), rgba(15,139,141,0.94))",
                  color: isAssistant ? "#0f172a" : "#ffffff",
                  border: isAssistant
                    ? "1px solid rgba(214,226,245,0.92)"
                    : "1px solid rgba(29,78,216,0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    opacity: 0.72,
                    marginBottom: 7,
                  }}
                >
                  {isAssistant ? "ACADEMIC ASSISTANT" : "YOU"}
                </div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.65,
                    fontSize: 14,
                  }}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {isSending ? (
            <div
              style={{
                ...softCardStyle({ padding: 14, radius: 20 }),
                maxWidth: 220,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", marginBottom: 7 }}>
                ACADEMIC ASSISTANT
              </div>
              <div style={{ color: "#334155", fontSize: 14 }}>Thinking…</div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(214,226,245,0.85)",
            padding: 16,
            display: "grid",
            gap: 10,
            background: "rgba(255,255,255,0.62)",
          }}
        >
          {error ? (
            <div
              style={{
                ...pillStyle({ tone: "red" }),
                justifySelf: "start",
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
            style={{ display: "grid", gap: 10 }}
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a class, a student Admission Number, incomplete results, or guardian SMS drafting."
              rows={4}
              style={{
                ...fieldStyle(),
                resize: "vertical",
                minHeight: 108,
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                Admission Number is preferred when you ask about a specific student.
              </span>
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                style={{
                  ...primaryButtonStyle(),
                  opacity: isSending || !draft.trim() ? 0.6 : 1,
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
