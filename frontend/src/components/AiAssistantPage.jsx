import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api";
import { useViewport } from "../utils/useViewport";
import { fieldStyle, pillStyle } from "../utils/designSystem";

const CHAT_STORAGE_PREFIX = "ai_assistant_chat_v1";
const MAX_DRAFT_CHARS = 4000;

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
      content: `👋 Welcome! I can summarize **${classLabel}**, find incomplete or failed students, search by Admission Number, and draft guardian SMS text.\n\nI am **read-only** — I won't modify any data.`,
      time: new Date(),
    },
  ];
}

function buildSuggestionPrompts(classRecord) {
  if (!classRecord) {
    return [
      { icon: "📋", text: "List the classes I can access." },
      { icon: "💡", text: "Explain what you can help with." },
      { icon: "🔍", text: "How should I search for a student by Admission Number?" },
    ];
  }
  const label = getClassLabel(classRecord);
  return [
    { icon: "📊", text: `Summarize ${label}.` },
    { icon: "❌", text: `Who failed in ${label}?` },
    { icon: "⚠️", text: `Which students are incomplete in ${label}?` },
    { icon: "📱", text: `Draft guardian SMS for failed students in ${label}.` },
  ];
}

function formatTime(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

    // Code block fence
    if (line.trim().startsWith("```")) {
      if (codeBlock !== null) {
        // Close code block
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

    // List items
    if (/^[\s]*[-*•]\s/.test(line)) {
      listItems.push(line.replace(/^[\s]*[-*•]\s/, ""));
      continue;
    }
    // Numbered list
    if (/^[\s]*\d+[.)]\s/.test(line)) {
      listItems.push(line.replace(/^[\s]*\d+[.)]\s/, ""));
      continue;
    }
    flushList();

    // Table row
    if (line.includes("|") && line.trim().startsWith("|")) {
      // Collect all table rows
      const tableRows = [line];
      while (i + 1 < lines.length && lines[i + 1].includes("|") && lines[i + 1].trim().startsWith("|")) {
        i++;
        tableRows.push(lines[i]);
      }
      const parsedRows = tableRows
        .filter((r) => !/^[\s|:-]+$/.test(r)) // filter separator rows
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

    // Empty line → spacer
    if (!line.trim()) {
      elements.push(<div key={`sp-${elements.length}`} style={{ height: 8 }} />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${elements.length}`} style={mdStyles.p}>
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  // Close unclosed code block
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
  // Process bold, italic, inline code
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
      parts.push(<strong key={key++} style={{ fontWeight: 800 }}>{match[2]}</strong>);
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
  p: { margin: "0 0 4px", lineHeight: 1.72, fontSize: 15 },
  ul: { margin: "4px 0 8px", paddingLeft: 22, lineHeight: 1.72 },
  li: { margin: "2px 0", fontSize: 15 },
  pre: {
    margin: "8px 0",
    padding: "14px 16px",
    borderRadius: 14,
    background: "rgba(15,23,42,0.06)",
    border: "1px solid rgba(226,232,240,0.7)",
    overflowX: "auto",
    fontSize: 13,
    lineHeight: 1.55,
  },
  code: { fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace", fontSize: 13 },
  inlineCode: {
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    fontSize: 13,
    background: "rgba(15,23,42,0.07)",
    padding: "2px 6px",
    borderRadius: 6,
    border: "1px solid rgba(226,232,240,0.5)",
  },
  tableWrap: { overflowX: "auto", margin: "8px 0" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    borderBottom: "2px solid rgba(226,232,240,0.9)",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: "0.03em",
    color: "#475569",
    background: "rgba(248,250,252,0.8)",
  },
  td: {
    padding: "7px 12px",
    borderBottom: "1px solid rgba(226,232,240,0.6)",
    color: "#1e293b",
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
      0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
      40% { transform: translateY(-7px); opacity: 1; }
    }
    @keyframes aiSlideIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes aiPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.25); }
      50% { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
    }
    @keyframes aiFabIn {
      from { opacity: 0; transform: translateY(10px) scale(0.8); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .ai-msg-enter { animation: aiSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
    .ai-bounce-dot { animation: aiBounce 1.4s infinite ease-in-out both; }
    .ai-badge-pulse { animation: aiPulse 2s infinite; }
    .ai-fab-enter { animation: aiFabIn 0.25s ease-out both; }
    .ai-textarea::placeholder { color: #94a3b8; }
    .ai-textarea:focus { outline: none; }
    .ai-suggestion-btn {
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .ai-suggestion-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(29,78,216,0.12) !important;
      border-color: rgba(59,130,246,0.4) !important;
      background: rgba(239,246,255,0.95) !important;
    }
    .ai-send-btn { transition: all 0.2s ease; }
    .ai-send-btn:not(:disabled):hover {
      transform: scale(1.06);
      box-shadow: 0 8px 20px rgba(5,5,5,0.25);
    }
    .ai-clear-btn { transition: all 0.15s ease; }
    .ai-clear-btn:hover {
      background: rgba(248,113,113,0.12) !important;
      color: #dc2626 !important;
    }
    .ai-plus-btn { transition: all 0.2s ease; }
    .ai-plus-btn:hover {
      transform: scale(1.08);
      background: rgba(239,246,255,0.9) !important;
      border-color: rgba(59,130,246,0.3) !important;
    }
    .ai-scroll-fab { transition: all 0.2s ease; }
    .ai-scroll-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 8px 24px rgba(15,23,42,0.18) !important;
    }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────── */

function AssistantBadge({ animate = false }) {
  return (
    <div
      aria-hidden="true"
      className={animate ? "ai-badge-pulse" : ""}
      style={{
        width: 38,
        height: 38,
        borderRadius: 13,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.3), transparent 50%), linear-gradient(135deg, #eff6ff, #ffffff)",
        border: "1px solid rgba(191,219,254,0.9)",
        boxShadow: "0 8px 20px rgba(37,99,235,0.12)",
        color: "#1d4ed8",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        width: 38,
        height: 38,
        borderRadius: 13,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #1d4ed8, #0f8b8d)",
        boxShadow: "0 8px 20px rgba(29,78,216,0.18)",
        color: "#ffffff",
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: "0.08em",
      }}
    >
      YOU
    </div>
  );
}

function TypingIndicator({ isMobile }) {
  const thinkingPhrases = ["Thinking", "Analyzing data", "Searching records"];
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % thinkingPhrases.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ai-msg-enter" style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "38px minmax(0, 1fr)" : "38px minmax(0, 1fr)",
      gap: 14,
      alignItems: "start",
    }}>
      <AssistantBadge animate />
      <div style={{
        borderRadius: 20,
        padding: "16px 20px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,248,255,0.92))",
        border: "1px solid rgba(214,226,245,0.8)",
        boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="ai-bounce-dot"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                  animationDelay: `${i * 0.16}s`,
                }}
              />
            ))}
          </div>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#64748b",
            letterSpacing: "0.01em",
          }}>
            {thinkingPhrases[phraseIndex]}…
          </span>
        </div>
      </div>
    </div>
  );
}

function ContextChip({ label, value }) {
  return (
    <div style={{
      display: "flex",
      gap: 7,
      alignItems: "center",
      minWidth: 0,
      padding: "7px 12px",
      borderRadius: 999,
      background: "rgba(248,250,252,0.7)",
      border: "1px solid rgba(226,232,240,0.85)",
      backdropFilter: "blur(8px)",
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#94a3b8", whiteSpace: "nowrap", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );
}

function SuggestionCard({ icon, text, onClick, disabled }) {
  return (
    <button
      type="button"
      className="ai-suggestion-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderRadius: 16,
        border: "1px solid rgba(214,226,245,0.85)",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
        fontSize: 13,
        fontWeight: 700,
        color: "#334155",
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        lineHeight: 1.4,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <span>{text}</span>
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
}) {
  const { isMobile, isXs, isTablet } = useViewport();
  const [selectedClassId, setSelectedClassId] = useState(() => activeClass?.id || "");
  const [messages, setMessages] = useState(() => buildInitialMessages(activeClass));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const fabTimeoutRef = useRef(null);

  // Inject CSS keyframes once
  useEffect(() => { injectKeyframes(); }, []);
  useEffect(() => () => {
    if (fabTimeoutRef.current) clearTimeout(fabTimeoutRef.current);
  }, []);

  // Sync selected class from parent
  useEffect(() => {
    if (!selectedClassId && activeClass?.id) {
      setSelectedClassId(activeClass.id);
    }
  }, [activeClass, selectedClassId]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isSending, scrollToBottom]);

  // Track scroll position for FAB
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

  // Class selector
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

  // Determine if this is a fresh conversation (only welcome msg)
  const isFreshConversation = messages.length <= 1 && messages[0]?.role === "assistant";

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, []);

  useEffect(() => { autoResize(); }, [draft, autoResize]);

  // Restore conversation for current class/exam context
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

  // Send message
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
    setIsSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await API.aiChat({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
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
          time: new Date(),
        },
      ]);
    } catch (err) {
      setError(err.message || "Unable to contact the AI assistant.");
    } finally {
      setIsSending(false);
    }
  }

  // Keyboard handler
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();
      sendMessage(draft);
    }
  }

  // Clear conversation
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
      fabTimeoutRef.current = setTimeout(() => setCopiedIndex(null), 1200);
    } catch (_) {
      setError("Unable to copy text from this browser.");
    }
  }

  const chatMaxWidth = isMobile ? "100%" : isTablet ? "100%" : 1200;
  const msgMaxWidth = 720;

  return (
    <div
      style={{
        padding: isMobile ? 0 : 18,
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
          borderRadius: isMobile ? 0 : 28,
          border: isMobile ? "none" : "1px solid rgba(214,226,245,0.8)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(248,250,252,0.95))",
          boxShadow: isMobile ? "none" : "0 20px 50px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.96)",
          overflow: "hidden",
        }}
      >
        {/* ── HEADER ── */}
        <header
          style={{
            padding: isMobile ? "14px 16px 10px" : "16px 24px 12px",
            borderBottom: "1px solid rgba(226,232,240,0.8)",
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(12px)",
            flexShrink: 0,
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: isMobile ? "start" : "center",
          }}>
            {/* Left: Title */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0, flex: "1 1 auto" }}>
              <AssistantBadge />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 21, lineHeight: 1.15, color: "#0f172a", fontWeight: 900 }}>
                    Academic Assistant
                  </h1>
                  <span style={pillStyle({ tone: "blue" })}>AI</span>
                  <span style={pillStyle({ tone: "slate" })}>Read-only</span>
                </div>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13, fontWeight: 500 }}>
                  Results, student lookups, and guardian drafting
                </p>
              </div>
            </div>

            {/* Right: Class selector + Clear */}
            <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", flexShrink: 0 }}>
              <label style={{ display: "grid", gap: 4, minWidth: isMobile ? 0 : 200, maxWidth: 260, flex: "1 1 200px" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase" }}>
                  Class Context
                </span>
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  style={{ ...fieldStyle(), paddingRight: 36, fontSize: 13 }}
                >
                  <option value="">No fixed class</option>
                  {classOptions.map((classRecord) => (
                    <option key={classRecord.id} value={classRecord.id}>
                      {getClassLabel(classRecord)}
                    </option>
                  ))}
                </select>
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
                    gap: 6,
                    padding: "9px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(226,232,240,0.85)",
                    background: "rgba(255,255,255,0.8)",
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                  {!isXs && "Clear"}
                </button>
              )}
            </div>
          </div>

          {/* Context chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            <ContextChip label="Class" value={selectedClass ? getClassLabel(selectedClass) : "Flexible"} />
            <ContextChip label="Exam" value={activeExam || "Default"} />
            <ContextChip label="Identity" value="Admission No." />
            {currentUser?.role && (
              <ContextChip label="Role" value={String(currentUser.role).toUpperCase()} />
            )}
          </div>
        </header>

        {/* ── QUICK ACTIONS (toggled) ── */}
        {showQuickActions && !isFreshConversation && (
          <div
            style={{
              padding: isMobile ? "10px 16px" : "10px 24px",
              borderBottom: "1px solid rgba(226,232,240,0.7)",
              display: "flex",
              flexWrap: "wrap",
              gap: 7,
              background: "rgba(248,250,252,0.5)",
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
                  fontWeight: 700,
                  padding: isMobile ? "8px 13px" : "9px 14px",
                  fontSize: 12,
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid rgba(214,226,245,0.85)",
                  boxShadow: "0 2px 6px rgba(15,23,42,0.03)",
                  color: "#334155",
                  cursor: isSending ? "not-allowed" : "pointer",
                  opacity: isSending ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>{s.icon}</span>
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
            padding: isMobile ? "20px 16px 20px" : "24px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 16 : 22,
            WebkitOverflowScrolling: "touch",
            background: "linear-gradient(180deg, rgba(255,255,255,0), rgba(248,250,252,0.4) 100%)",
            position: "relative",
          }}
        >
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            return (
              <div
                key={`${message.role}-${index}`}
                className="ai-msg-enter"
                style={{
                  display: "grid",
                  gridTemplateColumns: isAssistant
                    ? "38px minmax(0, 1fr)"
                    : "minmax(0, 1fr) 38px",
                  justifyContent: isAssistant ? "start" : "end",
                  alignItems: "start",
                  gap: 12,
                  maxWidth: msgMaxWidth,
                  alignSelf: isAssistant ? "flex-start" : "flex-end",
                  width: "100%",
                  animationDelay: `${Math.min(index * 0.05, 0.3)}s`,
                }}
              >
                {isAssistant && <AssistantBadge />}
                <div
                  style={{
                    borderRadius: isAssistant ? 20 : 20,
                    padding: "14px 18px",
                    background: isAssistant
                      ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,248,255,0.92))"
                      : "linear-gradient(135deg, rgba(29,78,216,0.96), rgba(14,116,144,0.92))",
                    color: isAssistant ? "#0f172a" : "#ffffff",
                    boxShadow: isAssistant
                      ? "0 4px 16px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)"
                      : "0 8px 24px rgba(29,78,216,0.16)",
                    border: isAssistant ? "1px solid rgba(214,226,245,0.75)" : "none",
                    position: "relative",
                  }}
                >
                  {/* Role label + timestamp */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                  }}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      color: isAssistant ? "#94a3b8" : "rgba(255,255,255,0.6)",
                      textTransform: "uppercase",
                    }}>
                      {isAssistant ? "ACADEMIC ASSISTANT" : "YOU"}
                    </div>
                    {message.time && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {isAssistant && (
                          <button
                            type="button"
                            onClick={() => copyMessage(message.content, index)}
                            style={{
                              border: "1px solid rgba(203,213,225,0.7)",
                              background: "rgba(255,255,255,0.8)",
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#64748b",
                              cursor: "pointer",
                            }}
                            aria-label="Copy assistant message"
                          >
                            {copiedIndex === index ? "Copied" : "Copy"}
                          </button>
                        )}
                        <div style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: isAssistant ? "#cbd5e1" : "rgba(255,255,255,0.45)",
                        }}>
                          {formatTime(message.time)}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ fontSize: 15, lineHeight: 1.72, color: isAssistant ? "#0f172a" : "#ffffff" }}>
                    {isAssistant ? renderMarkdown(message.content) : (
                      <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                    )}
                  </div>
                </div>
                {!isAssistant && <UserBadge />}
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
                animationDelay: "0.15s",
              }}
            >
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 10,
                marginTop: 4,
              }}>
                {suggestions.map((s) => (
                  <SuggestionCard
                    key={s.text}
                    icon={s.icon}
                    text={s.text}
                    onClick={() => sendMessage(s.text)}
                    disabled={isSending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── TYPING INDICATOR ── */}
          {isSending && <TypingIndicator isMobile={isMobile} />}

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
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid rgba(226,232,240,0.9)",
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 6px 18px rgba(15,23,42,0.12)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#475569",
                zIndex: 5,
              }}
              aria-label="Scroll to bottom"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="m19 12-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* ── INPUT BAR ── */}
        <div
          style={{
            padding: isMobile ? "10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px)" : "12px 24px 16px",
            borderTop: "1px solid rgba(226,232,240,0.8)",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            flexShrink: 0,
          }}
        >
          {/* Error bar */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(248,113,113,0.22)",
                background: "rgba(254,242,242,0.92)",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" /><path d="M12 16h.01" />
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
              borderRadius: 22,
              border: "1px solid rgba(214,226,245,0.88)",
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 8px 24px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.96)",
              padding: isXs ? 7 : 9,
            }}
          >
            {/* Quick-action toggle */}
            <button
              type="button"
              className="ai-plus-btn"
              onClick={() => setShowQuickActions((current) => !current)}
              style={{
                width: isMobile ? 44 : 48,
                height: isMobile ? 44 : 48,
                borderRadius: "50%",
                border: "1px solid rgba(226,232,240,0.8)",
                background: showQuickActions
                  ? "rgba(239,246,255,0.9)"
                  : "linear-gradient(180deg, #ffffff, #f8fafc)",
                boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: showQuickActions ? "#2563eb" : "#475569",
                flexShrink: 0,
                transform: showQuickActions ? "rotate(45deg)" : "none",
                transition: "transform 0.25s ease, color 0.2s, background 0.2s",
              }}
              aria-label="Toggle quick prompts"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
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
                : "Ask about a class, student Admission Number, results, or SMS drafting…"
              }
              rows={1}
              enterKeyHint="send"
              maxLength={MAX_DRAFT_CHARS}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                minHeight: isMobile ? 28 : 32,
                maxHeight: 140,
                fontFamily: "inherit",
                fontSize: isMobile ? 16 : 16,
                lineHeight: 1.5,
                color: "#0f172a",
                background: "transparent",
                padding: "10px 6px",
                overflowY: "auto",
              }}
            />

            {/* Send button */}
            <button
              type="submit"
              className="ai-send-btn"
              disabled={isSending || !draft.trim()}
              style={{
                width: isMobile ? 44 : 48,
                height: isMobile ? 44 : 48,
                borderRadius: "50%",
                border: "none",
                background: draft.trim() && !isSending
                  ? "linear-gradient(135deg, #1d4ed8, #0e7490)"
                  : "#cbd5e1",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                cursor: isSending || !draft.trim() ? "not-allowed" : "pointer",
                flexShrink: 0,
                transition: "background 0.25s ease",
              }}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </form>

          {/* Footer hint */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#94a3b8",
            fontWeight: 600,
            padding: "6px 8px 0",
          }}>
            <span>Admission Number is preferred for specific students</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: draft.length >= MAX_DRAFT_CHARS ? "#ef4444" : "#cbd5e1" }}>
                {draft.length}/{MAX_DRAFT_CHARS}
              </span>
              {!isMobile && (
                <span style={{ color: "#cbd5e1" }}>
                <kbd style={{
                  padding: "2px 6px",
                  borderRadius: 5,
                  border: "1px solid rgba(226,232,240,0.8)",
                  background: "rgba(248,250,252,0.9)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94a3b8",
                }}>Enter</kbd>
                {" to send · "}
                <kbd style={{
                  padding: "2px 6px",
                  borderRadius: 5,
                  border: "1px solid rgba(226,232,240,0.8)",
                  background: "rgba(248,250,252,0.9)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94a3b8",
                }}>Shift+Enter</kbd>
                {" for new line"}
                </span>
              )}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
