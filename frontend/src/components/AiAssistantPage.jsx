import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api";
import { useViewport } from "../utils/useViewport";
import { fieldStyle, pillStyle } from "../utils/designSystem";
import { useI18n } from "../i18n";

const CHAT_STORAGE_PREFIX = "ai_assistant_chat_v1";
const MAX_DRAFT_CHARS = 4000;

const ACTION_TONES = ["formal", "concise", "urgent"];

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

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
      content: `I can summarize **${classLabel}**, find incomplete or failed students, search by Admission Number, and draft guardian SMS text.\n\nI am **read-only** — I do not modify any data.`,
      time: new Date(),
    },
  ];
}

function getPreferredLanguageText(lang = "en") {
  return lang === "sw" ? "sw" : "en";
}

function buildSuggestionPrompts(classRecord) {
  if (!classRecord) {
    return [
      { text: "List the classes I can access." },
      { text: "Explain what you can help with." },
      { text: "How should I search for a student by Admission Number?" },
    ];
  }

  const label = getClassLabel(classRecord);
  return [
    { text: `Summarize ${label}.` },
    { text: `Who failed in ${label}?` },
    { text: `Which students are incomplete in ${label}?` },
    { text: `Draft guardian SMS for failed students in ${label}.` },
  ];
}

function buildSavedTemplates(role, classRecord) {
  const label = classRecord ? getClassLabel(classRecord) : "the active class";
  if (role === "admin" || role === "academic") {
    return [
      { text: `Find at-risk students in ${label}.` },
      { text: `Compare trends for ${label} between this exam and the previous exam.` },
      { text: `Build guardian contact queue for at-risk students in ${label}.` },
    ];
  }
  return [
    { text: `Summarize ${label}.` },
    { text: `Show incomplete students in ${label}.` },
    { text: `What follow-up should I prioritize for ${label}?` },
  ];
}

function buildFollowupPrompts(latestAssistantText, selectedClass) {
  const baseLabel = selectedClass ? getClassLabel(selectedClass) : "this class";
  const text = String(latestAssistantText || "").toLowerCase();
  const prompts = [];
  if (text.includes("at-risk") || text.includes("division 0") || text.includes("failed")) {
    prompts.push(`Create an intervention checklist for ${baseLabel}.`);
    prompts.push(`Draft guardian follow-up for the highest-risk students in ${baseLabel}.`);
  }
  if (text.includes("incomplete") || text.includes("absent")) {
    prompts.push(`List missing-result and absent students in ${baseLabel} with next actions.`);
  }
  prompts.push(`Give me a concise summary for ${baseLabel}.`);
  return [...new Set(prompts)].slice(0, 3);
}

function formatTime(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getRoleLabel(role = "") {
  const normalized = String(role || "").trim().toLowerCase();
  if (!normalized) return "User";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getProviderLabel(provider = "") {
  const normalized = String(provider || "").trim().toLowerCase();
  if (normalized === "openai") return "OpenAI";
  if (normalized === "gemini") return "Gemini";
  return "Assistant";
}

function buildAssistantMetaSummary(meta = {}) {
  const parts = [];
  if (meta?.confidence?.level) parts.push(`Confidence ${String(meta.confidence.level).toUpperCase()}`);
  if (meta?.citations?.classLabel) parts.push(meta.citations.classLabel);
  if (meta?.citations?.examType) parts.push(meta.citations.examType);
  if (Number(meta?.citations?.studentCount || 0) > 0) {
    parts.push(`${Number(meta.citations.studentCount)} students`);
  }
  return parts;
}

function buildConversationStorageKey(classId, examName) {
  const classPart = classId || "all-classes";
  const examPart = examName || "default-exam";
  return `${CHAT_STORAGE_PREFIX}:${classPart}:${examPart}`;
}

/* ─────────────────────────────────────────────
   Lightweight Markdown Renderer
   ───────────────────────────────────────────── */

function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let codeBlock = null;
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={mdStyles.ul}>
          {listItems.map((li, i) => (
            <li key={i} style={mdStyles.li}>{renderInline(li)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (codeBlock !== null) {
        elements.push(
          <pre key={`code-${elements.length}`} style={mdStyles.pre}>
            <code style={mdStyles.code}>{codeBlock}</code>
          </pre>
        );
        codeBlock = null;
      } else {
        flushList();
        codeBlock = "";
      }
      continue;
    }

    if (codeBlock !== null) {
      codeBlock += (codeBlock ? "\n" : "") + line;
      continue;
    }

    if (/^[\s]*[-*•]\s/.test(line)) {
      listItems.push(line.replace(/^[\s]*[-*•]\s/, ""));
      continue;
    }
    if (/^[\s]*\d+[.)]\s/.test(line)) {
      listItems.push(line.replace(/^[\s]*\d+[.)]\s/, ""));
      continue;
    }
    flushList();

    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableRows = [line];
      while (i + 1 < lines.length && lines[i + 1].includes("|") && lines[i + 1].trim().startsWith("|")) {
        i++;
        tableRows.push(lines[i]);
      }
      const parsedRows = tableRows
        .filter((r) => !/^[\s|:-]+$/.test(r))
        .map((r) =>
          r.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((c) => c.trim())
        );
      if (parsedRows.length > 0) {
        elements.push(
          <div key={`tbl-${elements.length}`} style={mdStyles.tableWrap}>
            <table style={mdStyles.table}>
              <thead>
                <tr>
                  {parsedRows[0].map((cell, ci) => (
                    <th key={ci} style={mdStyles.th}>{renderInline(cell)}</th>
                  ))}
                </tr>
              </thead>
              {parsedRows.length > 1 && (
                <tbody>
                  {parsedRows.slice(1).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={mdStyles.td}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        );
      }
      continue;
    }

    if (!line.trim()) {
      elements.push(<div key={`sp-${elements.length}`} style={{ height: 6 }} />);
      continue;
    }

    elements.push(
      <p key={`p-${elements.length}`} style={mdStyles.p}>
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  if (codeBlock !== null) {
    elements.push(
      <pre key={`code-${elements.length}`} style={mdStyles.pre}>
        <code style={mdStyles.code}>{codeBlock}</code>
      </pre>
    );
  }

  return elements;
}

function renderInline(text) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[2]}</strong>);
    } else if (match[4]) {
      parts.push(<em key={key++}>{match[4]}</em>);
    } else if (match[6]) {
      parts.push(
        <code key={key++} style={mdStyles.inlineCode}>{match[6]}</code>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

const mdStyles = {
  p: { margin: "0 0 4px", lineHeight: 1.75, fontSize: 15, color: "#2f2a24" },
  ul: { margin: "4px 0 6px", paddingLeft: 20, lineHeight: 1.75 },
  li: { margin: "3px 0", fontSize: 15 },
  pre: {
    margin: "10px 0",
    padding: "14px 16px",
    borderRadius: 10,
    background: "#f6f1e8",
    border: "1px solid #e8dfd2",
    overflowX: "auto",
    fontSize: 13,
    lineHeight: 1.6,
  },
  code: { fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace", fontSize: 13, color: "#2f2a24" },
  inlineCode: {
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    fontSize: 13,
    background: "#f6f1e8",
    padding: "2px 6px",
    borderRadius: 5,
    border: "1px solid #e8dfd2",
    color: "#2f2a24",
  },
  tableWrap: { overflowX: "auto", margin: "10px 0" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    padding: "9px 13px",
    borderBottom: "2px solid #e8dfd2",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.02em",
    color: "#7b6f61",
    background: "#f6f1e8",
  },
  td: {
    padding: "8px 13px",
    borderBottom: "1px solid #eee4d7",
    color: "#2f2a24",
    fontSize: 14,
  },
};

/* ─────────────────────────────────────────────
   CSS Keyframes (injected once)
   ───────────────────────────────────────────── */

const KEYFRAMES_ID = "__ai-assistant-keyframes__";

function injectKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes aiBounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
      40% { transform: translateY(-5px); opacity: 1; }
    }
    @keyframes aiSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes aiFabIn {
      from { opacity: 0; transform: translateY(8px) scale(0.9); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .ai-msg-enter { animation: aiSlideIn 0.28s cubic-bezier(0.16,1,0.3,1) both; }
    .ai-bounce-dot { animation: aiBounce 1.4s infinite ease-in-out both; }
    .ai-fab-enter { animation: aiFabIn 0.22s ease-out both; }
    .ai-textarea::placeholder { color: #9f9588; }
    .ai-textarea:focus { outline: none; }
    .ai-send-btn { transition: opacity 0.15s, transform 0.15s; }
    .ai-send-btn:not(:disabled):hover { opacity: 0.88; transform: scale(1.04); }
    .ai-clear-btn { transition: background 0.15s, color 0.15s; }
    .ai-clear-btn:hover { background: #fef2f2 !important; color: #dc2626 !important; border-color: #fca5a5 !important; }
    .ai-plus-btn { transition: background 0.15s, transform 0.15s; }
    .ai-plus-btn:hover { background: #f4f4f5 !important; transform: scale(1.06); }
    .ai-scroll-fab { transition: opacity 0.15s, transform 0.15s; }
    .ai-scroll-fab:hover { opacity: 0.8; transform: scale(1.08); }
    .ai-suggestion-btn { transition: background 0.15s, border-color 0.15s; }
    .ai-suggestion-btn:hover { background: #f3ecdf !important; border-color: #d6c8b1 !important; }
    .ai-copy-btn { transition: background 0.12s, color 0.12s; opacity: 0; }
    .ai-msg-row:hover .ai-copy-btn { opacity: 1; }
    .ai-followup-btn { transition: background 0.15s, border-color 0.15s; }
    .ai-followup-btn:hover { background: #f3ecdf !important; border-color: #d6c8b1 !important; }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────── */

function AiAvatar({ animate = false }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #f5ecdb, #efe3cb)",
        color: "#9a6b30",
        marginTop: 2,
      }}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l2.09 6.26L20 11l-5.91 1.74L12 19l-2.09-6.26L4 11l5.91-1.74Z" />
      </svg>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="ai-msg-enter ai-msg-row" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <AiAvatar animate />
      <div style={{
        background: "#fffdf8",
        border: "1px solid #e8dfd2",
        borderRadius: "18px",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="ai-bounce-dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#b9aa95",
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({ text, onClick, disabled }) {
  return (
    <button
      type="button"
      className="ai-suggestion-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 16px",
        borderRadius: 16,
        border: "1px solid #e8dfd2",
        background: "#fffdf8",
        fontSize: 14,
        fontWeight: 500,
        color: "#2f2a24",
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        lineHeight: 1.45,
      }}
    >
      {text}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export function AiAssistantPage({
  classes = [],
  activeClass = null,
  activeExam = "",
  currentUser = null,
  topBarHeight = 64,
  onApproveAction = null,
}) {
  const { t, language } = useI18n();
  const { isMobile, isXs, isTablet } = useViewport();
  const [selectedClassId, setSelectedClassId] = useState(() => activeClass?.id || "");
  const [messages, setMessages] = useState(() => buildInitialMessages(activeClass));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [responseLanguage, setResponseLanguage] = useState(() => getPreferredLanguageText(language));
  const [guardianTone, setGuardianTone] = useState("formal");
  const [actionMode, setActionMode] = useState(false);
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const fabTimeoutRef = useRef(null);

  useEffect(() => { injectKeyframes(); }, []);
  useEffect(() => () => {
    if (fabTimeoutRef.current) clearTimeout(fabTimeoutRef.current);
  }, []);
  useEffect(() => {
    setResponseLanguage(getPreferredLanguageText(language));
  }, [language]);

  useEffect(() => {
    if (!selectedClassId && activeClass?.id) {
      setSelectedClassId(activeClass.id);
    }
  }, [activeClass, selectedClassId]);

  const scrollToBottom = useCallback((smooth = true) => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isSending, scrollToBottom]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    const handleScroll = () => {
      const distFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      setShowScrollFab(distFromBottom > 120);
    };
    node.addEventListener("scroll", handleScroll, { passive: true });
    return () => node.removeEventListener("scroll", handleScroll);
  }, []);

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

  const conversationStorageKey = useMemo(
    () => buildConversationStorageKey(selectedClassId, activeExam),
    [selectedClassId, activeExam]
  );

  const suggestions = useMemo(() => buildSuggestionPrompts(selectedClass), [selectedClass]);
  const savedTemplates = useMemo(
    () => buildSavedTemplates(String(currentUser?.role || "").toLowerCase(), selectedClass),
    [currentUser?.role, selectedClass]
  );
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages]
  );
  const sessionMeta = latestAssistantMessage?.meta?.session || null;
  const followupPrompts = useMemo(
    () => buildFollowupPrompts(latestAssistantMessage?.content, selectedClass),
    [latestAssistantMessage?.content, selectedClass]
  );

  const isFreshConversation = messages.length <= 1 && messages[0]?.role === "assistant";

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, []);

  useEffect(() => { autoResize(); }, [draft, autoResize]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(conversationStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed
          .filter((entry) => entry && typeof entry.content === "string")
          .map((entry) => ({
            role: entry.role === "user" ? "user" : "assistant",
            content: String(entry.content),
            time: entry.time ? new Date(entry.time) : new Date(),
            meta: entry.meta && typeof entry.meta === "object" ? entry.meta : null,
          }));
        if (normalized.length > 0) {
          setMessages(normalized);
          return;
        }
      }
    } catch (_) {
      // ignore malformed cached conversations
    }

    setMessages(buildInitialMessages(selectedClass));
    setError("");
  }, [conversationStorageKey, selectedClass]);

  useEffect(() => {
    sessionStorage.setItem(conversationStorageKey, JSON.stringify(messages));
  }, [conversationStorageKey, messages]);

  async function sendMessage(content) {
    const text = String(content || "").trim();
    if (!text || isSending) return;
    if (text.length > MAX_DRAFT_CHARS) {
      setError(`Message is too long. Please keep it under ${MAX_DRAFT_CHARS} characters.`);
      return;
    }

    const nextMessages = [...messages, { role: "user", content: text, time: new Date() }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setShowQuickActions(false);
    setIsSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await API.aiChat({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        context: {
          activeClassId: selectedClass?.id || "",
          activeExam: activeExam || "",
          actionMode,
          responseLanguage,
          guardianTone,
        },
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: String(response?.reply || "I could not generate a response."),
          time: new Date(),
          meta: response?.meta && typeof response.meta === "object" ? response.meta : null,
        },
      ]);
    } catch (err) {
      setError(err.message || "Unable to contact the AI assistant.");
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();
      sendMessage(draft);
    }
  }

  function clearConversation() {
    sessionStorage.removeItem(conversationStorageKey);
    setMessages(buildInitialMessages(selectedClass));
    setError("");
    setShowQuickActions(false);
  }

  async function copyMessage(content, index) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setCopiedIndex(index);
      if (fabTimeoutRef.current) clearTimeout(fabTimeoutRef.current);
      fabTimeoutRef.current = setTimeout(() => setCopiedIndex(null), 1400);
    } catch (_) {
      setError("Unable to copy text from this browser.");
    }
  }

  function exportMessage(content, index) {
    try {
      const blob = new Blob([String(content || "")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai-summary-${index + 1}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (_) {
      setError("Unable to export summary from this browser.");
    }
  }

  const chatMaxWidth = isMobile ? "100%" : isTablet ? "100%" : 900;
  const msgMaxWidth = 700;

  return (
    <div
      style={{
        padding: isMobile ? 0 : 18,
        background: "#f8f5ee",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        height: isMobile ? `calc(100dvh - ${topBarHeight}px)` : "auto",
        maxHeight: isMobile ? `calc(100dvh - ${topBarHeight}px)` : "calc(100vh - 110px)",
        overflow: "hidden",
      }}
    >
      <section
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          maxWidth: chatMaxWidth,
          width: "100%",
          margin: isMobile ? 0 : "0 auto",
          borderRadius: isMobile ? 0 : 24,
          border: isMobile ? "none" : "1px solid #e8dfd2",
          background: "#f8f5ee",
          boxShadow: isMobile ? "none" : "0 8px 28px rgba(98,78,44,0.08)",
          overflow: "hidden",
        }}
      >
        {/* ── HEADER ── */}
        <header
          style={{
            padding: isMobile ? "12px 16px 10px" : "14px 20px 12px",
            borderBottom: "1px solid #eee4d7",
            background: "#f8f5ee",
            flexShrink: 0,
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}>
            {/* Left: Title */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
              <AiAvatar />
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                  <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 18, lineHeight: 1.2, color: "#2f2a24", fontWeight: 700 }}>
                    Academic Assistant
                  </h1>
                  <span style={pillStyle({ tone: "blue" })}>Read-only</span>
                  <span style={pillStyle({ tone: "slate" })}>{getRoleLabel(currentUser?.role)}</span>
                  {actionMode && <span style={pillStyle({ tone: "green" })}>Action mode</span>}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: "#7b6f61", fontWeight: 500 }}>
                  School operations chat for results, student lookups, and guardian drafts.
                </div>
              </div>
            </div>

            {/* Right: Controls */}
            <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
              <label style={{ display: "grid", gap: 3, minWidth: isMobile ? 0 : 180, flex: "1 1 160px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#a1a1aa", textTransform: "uppercase" }}>
                  Class
                </span>
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  style={{ ...fieldStyle(), paddingRight: 32, fontSize: 13 }}
                >
                  <option value="">No fixed class</option>
                  {classOptions.map((classRecord) => (
                    <option key={classRecord.id} value={classRecord.id}>
                      {getClassLabel(classRecord)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 3, minWidth: 100 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#a1a1aa", textTransform: "uppercase" }}>
                  Language
                </span>
                <select
                  value={responseLanguage}
                  onChange={(event) => setResponseLanguage(event.target.value === "sw" ? "sw" : "en")}
                  style={{ ...fieldStyle(), paddingRight: 24, fontSize: 13 }}
                >
                  <option value="en">{t("english", "English")}</option>
                  <option value="sw">{t("swahili", "Swahili")}</option>
                </select>
              </label>

              {actionMode && (
                <label style={{ display: "grid", gap: 3, minWidth: 110 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#a1a1aa", textTransform: "uppercase" }}>
                    Tone
                  </span>
                  <select
                    value={guardianTone}
                    onChange={(event) => setGuardianTone(ACTION_TONES.includes(event.target.value) ? event.target.value : "formal")}
                    style={{ ...fieldStyle(), paddingRight: 24, fontSize: 13 }}
                  >
                    {ACTION_TONES.map((toneValue) => (
                      <option key={toneValue} value={toneValue}>{toneValue}</option>
                    ))}
                  </select>
                </label>
              )}

              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={actionMode}
                  onChange={(event) => setActionMode(event.target.checked)}
                  style={{ accentColor: "#9a6b30" }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#52525b", whiteSpace: "nowrap" }}>Action mode</span>
              </label>

              {messages.length > 1 && (
                <button
                  type="button"
                  className="ai-clear-btn"
                  onClick={clearConversation}
                  title="Clear conversation"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: "1px solid #decdb7",
                    background: "#fffaf2",
                    color: "#7b6f61",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                  {!isXs && "Clear"}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── QUICK ACTIONS (toggled) ── */}
        <div
          style={{
            padding: isMobile ? "10px 16px" : "10px 20px",
            borderBottom: "1px solid #eee4d7",
            background: "#f3ecdf",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={pillStyle({ tone: "slate" })}>
            {selectedClass ? getClassLabel(selectedClass) : "Flexible class context"}
          </span>
          <span style={pillStyle({ tone: "slate" })}>
            {activeExam || "Default exam context"}
          </span>
          <span style={pillStyle({ tone: "slate" })}>
            {responseLanguage === "sw" ? "Swahili responses" : "English responses"}
          </span>
          {sessionMeta?.provider && (
            <span style={pillStyle({ tone: sessionMeta.fallbackUsed ? "amber" : "green" })}>
              {getProviderLabel(sessionMeta.provider)}
              {sessionMeta.fallbackUsed ? " fallback" : ""}
            </span>
          )}
          {Number.isFinite(Number(sessionMeta?.remainingRequests)) && (
            <span style={pillStyle({ tone: "slate" })}>
              {Number(sessionMeta.remainingRequests)} requests left
            </span>
          )}
        </div>

        {showQuickActions && !isFreshConversation && (
          <div
            style={{
              padding: isMobile ? "10px 16px" : "10px 20px",
              borderBottom: "1px solid #eee4d7",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              background: "#f3ecdf",
              flexShrink: 0,
            }}
          >
            {suggestions.map((s) => (
              <button
                key={s.text}
                type="button"
                className="ai-suggestion-btn"
                onClick={() => {
                  setShowQuickActions(false);
                  sendMessage(s.text);
                }}
                disabled={isSending}
                style={{
                  borderRadius: 999,
                  fontWeight: 500,
                  padding: "7px 13px",
                  fontSize: 13,
                  background: "#fffdf8",
                  border: "1px solid #e8dfd2",
                  color: "#2f2a24",
                  cursor: isSending ? "not-allowed" : "pointer",
                  opacity: isSending ? 0.5 : 1,
                }}
              >
                {s.text}
              </button>
            ))}
          </div>
        )}

        {/* ── MESSAGE LIST ── */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: isMobile ? "20px 16px" : "28px 28px 20px",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 18 : 24,
            WebkitOverflowScrolling: "touch",
            background: "#f8f5ee",
            position: "relative",
          }}
        >
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";

            if (isAssistant) {
              return (
                <div
                  key={`${message.role}-${index}`}
                  className="ai-msg-enter ai-msg-row"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    maxWidth: msgMaxWidth,
                    alignSelf: "flex-start",
                    width: "100%",
                    animationDelay: `${Math.min(index * 0.04, 0.25)}s`,
                  }}
                >
                  <AiAvatar />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Message bubble */}
                    <div
                      style={{
                        background: "#fffdf8",
                        border: "1px solid #e8dfd2",
                        borderRadius: "20px",
                        padding: "14px 18px",
                        color: "#2f2a24",
                      }}
                    >
                      <div style={{ fontSize: 15, lineHeight: 1.75 }}>
                        {renderMarkdown(message.content)}
                      </div>

                      {message?.meta?.confidence && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #eee4d7", fontSize: 12, color: "#7b6f61", display: "grid", gap: 3 }}>
                          <div>
                            Confidence: <strong style={{ color: "#4a4034" }}>{String(message.meta.confidence.level || "low").toUpperCase()}</strong>
                          </div>
                          {Array.isArray(message.meta.confidence.reasons) && message.meta.confidence.reasons.length > 0 && (
                            <div>{message.meta.confidence.reasons.join(" · ")}</div>
                          )}
                          {message?.meta?.citations && (
                            <div>
                              Data: {message.meta.citations.classLabel || "Flexible"} · {message.meta.citations.examType || "Default"} · {Number(message.meta.citations.studentCount || 0)} students
                            </div>
                          )}
                        </div>
                      )}

                      {actionMode && message?.meta?.actionDraft?.queue?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            onClick={() => onApproveAction?.(message.meta.actionDraft)}
                            style={{
                              border: "1px solid #bbf7d0",
                              background: "#f0fdf4",
                              color: "#166534",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Approve and open SMS queue ({message.meta.actionDraft.queue.length})
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Below-bubble actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, paddingLeft: 2 }}>
                      <button
                        type="button"
                        className="ai-copy-btn"
                        onClick={() => copyMessage(message.content, index)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid #e8dfd2",
                          background: "#fffdf8",
                          color: "#7b6f61",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        aria-label="Copy message"
                      >
                        {copiedIndex === index ? (
                          <>
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Copied
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                      {message.time && (
                        <span style={{ fontSize: 11, color: "#9f9588" }}>{formatTime(message.time)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // User message
            return (
              <div
                key={`${message.role}-${index}`}
                className="ai-msg-enter"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  maxWidth: msgMaxWidth,
                  alignSelf: "flex-end",
                  width: "100%",
                  animationDelay: `${Math.min(index * 0.04, 0.25)}s`,
                }}
              >
                <div
                  style={{
                    maxWidth: isMobile ? "88%" : "78%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 5,
                  }}
                >
                  <div
                    style={{
                      background: "#e9e2d5",
                      border: "1px solid #d9ccb8",
                      borderRadius: "20px",
                      padding: "12px 18px",
                      color: "#2f2a24",
                    }}
                  >
                    <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {message.content}
                    </div>
                  </div>
                  {message.time && (
                    <span style={{ fontSize: 11, color: "#9f9588", paddingRight: 2 }}>{formatTime(message.time)}</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── INLINE SUGGESTIONS (fresh conversation) ── */}
          {isFreshConversation && (
            <div
              className="ai-msg-enter"
              style={{
                maxWidth: msgMaxWidth,
                alignSelf: "flex-start",
                width: "100%",
                animationDelay: "0.12s",
              }}
            >
              <div style={{ paddingLeft: 42 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#9f9588", marginBottom: 10, letterSpacing: "0.03em", textTransform: "uppercase" }}>
                  Suggestions
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 8,
                }}>
                  {suggestions.map((s) => (
                    <SuggestionCard
                      key={s.text}
                      text={s.text}
                      onClick={() => sendMessage(s.text)}
                      disabled={isSending}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FOLLOW-UP PROMPTS ── */}
          {!isFreshConversation && followupPrompts.length > 0 && !isSending && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, maxWidth: msgMaxWidth, paddingLeft: 42 }}>
              {followupPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="ai-followup-btn"
                  style={{
                    borderRadius: 999,
                    border: "1px solid #e8dfd2",
                    background: "#fffdf8",
                    color: "#4a4034",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "7px 13px",
                    cursor: "pointer",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* ── TYPING INDICATOR ── */}
          {isSending && <TypingIndicator />}

          {/* ── SCROLL TO BOTTOM FAB ── */}
          {showScrollFab && (
            <button
              type="button"
              className="ai-scroll-fab ai-fab-enter"
              onClick={() => scrollToBottom(true)}
              style={{
                position: "sticky",
                bottom: 8,
                alignSelf: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid #e8dfd2",
                background: "#fffdf8",
                boxShadow: "0 2px 12px rgba(98,78,44,0.14)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#7b6f61",
                zIndex: 5,
              }}
              aria-label="Scroll to bottom"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* ── INPUT BAR ── */}
        <div
          style={{
            padding: isMobile ? "10px 12px calc(env(safe-area-inset-bottom, 0px) + 10px)" : "12px 20px 16px",
            borderTop: "1px solid #eee4d7",
            background: "#f8f5ee",
            flexShrink: 0,
          }}
        >
          {/* Error bar */}
          {error && (
            <div
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid #fca5a5",
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
              </svg>
              {error}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(draft);
            }}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              borderRadius: 16,
              border: "1.5px solid #dfd2bf",
              background: "#fffdf8",
              padding: isXs ? 6 : 8,
              transition: "border-color 0.15s",
            }}
          >
            {/* Quick-action toggle */}
            <button
              type="button"
              className="ai-plus-btn"
              onClick={() => setShowQuickActions((current) => !current)}
              style={{
                width: isMobile ? 38 : 40,
                height: isMobile ? 38 : 40,
                borderRadius: "50%",
                border: "1px solid #dfd2bf",
                background: showQuickActions ? "#f3ecdf" : "#fffdf8",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: showQuickActions ? "#9a6b30" : "#7b6f61",
                flexShrink: 0,
                transform: showQuickActions ? "rotate(45deg)" : "none",
                transition: "transform 0.2s ease, color 0.15s, background 0.15s",
              }}
              aria-label="Toggle quick prompts"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              className="ai-textarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isMobile
                ? "Ask about a class or student…"
                : "Ask about a class, student, results, or SMS drafting…"
              }
              rows={1}
              enterKeyHint="send"
              maxLength={MAX_DRAFT_CHARS}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                minHeight: isMobile ? 26 : 28,
                maxHeight: 140,
                fontFamily: "inherit",
                fontSize: isMobile ? 16 : 15,
                lineHeight: 1.55,
                color: "#2f2a24",
                background: "transparent",
                padding: "9px 4px",
                overflowY: "auto",
              }}
            />

            {/* Send button */}
            <button
              type="submit"
              className="ai-send-btn"
              disabled={isSending || !draft.trim()}
              style={{
                width: isMobile ? 38 : 40,
                height: isMobile ? 38 : 40,
                borderRadius: "50%",
                border: "none",
                background: draft.trim() && !isSending ? "#9a6b30" : "#e8dfd2",
                color: "#fffdf8",
                display: "grid",
                placeItems: "center",
                cursor: isSending || !draft.trim() ? "not-allowed" : "pointer",
                flexShrink: 0,
                transition: "background 0.2s ease",
              }}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </form>

          {/* Footer hint */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            fontSize: 11,
            color: "#9f9588",
            fontWeight: 500,
            padding: "5px 4px 0",
            gap: 8,
          }}>
            {draft.length > MAX_DRAFT_CHARS / 2 && (
              <span style={{ color: draft.length >= MAX_DRAFT_CHARS ? "#ef4444" : "#bcb1a3" }}>
                {draft.length}/{MAX_DRAFT_CHARS}
              </span>
            )}
            {!isMobile && (
              <span style={{ color: "#bcb1a3" }}>
                <kbd style={{ padding: "1px 5px", borderRadius: 4, border: "1px solid #e8dfd2", background: "#f6f1e8", fontSize: 10, color: "#9f9588" }}>Enter</kbd>
                {" to send · "}
                <kbd style={{ padding: "1px 5px", borderRadius: 4, border: "1px solid #e8dfd2", background: "#f6f1e8", fontSize: 10, color: "#9f9588" }}>Shift+Enter</kbd>
                {" for new line"}
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
