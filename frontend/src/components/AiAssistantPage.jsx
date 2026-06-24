import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api";
import { useViewport } from "../utils/useViewport";
import { useI18n } from "../i18n";
import "./AiAssistantPage.css";

const CHAT_STORAGE_PREFIX = "ai_assistant_chat_v1";
const CHAT_RECENTS_STORAGE_KEY = "ai_assistant_recent_chats_v1";
const MAX_DRAFT_CHARS = 4000;

/* ─────────────────────────────────────────────
   Icons
   ───────────────────────────────────────────── */

const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
  </svg>
);

const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);

const CalculatorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"></rect>
    <line x1="8" y1="6" x2="16" y2="6"></line>
    <line x1="16" y1="14" x2="16" y2="18"></line>
    <path d="M16 10h.01"></path>
    <path d="M12 10h.01"></path>
    <path d="M8 10h.01"></path>
    <path d="M12 14h.01"></path>
    <path d="M8 14h.01"></path>
    <path d="M12 18h.01"></path>
    <path d="M8 18h.01"></path>
  </svg>
);

const PenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
    <path d="M2 2l7.586 7.586"></path>
    <circle cx="11" cy="11" r="2"></circle>
  </svg>
);

const CodeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const LightbulbIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6"></path>
    <path d="M10 22h4"></path>
    <path d="M12 2v1"></path>
    <path d="M12 7a5 5 0 0 1 5 5c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a5 5 0 0 1 5-5z"></path>
  </svg>
);

const LanguagesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const AttachmentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);

const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const LikeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
  </svg>
);

const DislikeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const DocumentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

const FileTextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const BookOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

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

function getClassLabel(classRecord) {
  if (!classRecord) return "All Classes";
  return [classRecord.form, classRecord.stream, classRecord.year].filter(Boolean).join(" ").trim() || "Selected Class";
}

function buildMessageTitle(messages = []) {
  const firstUser = (messages || []).find((entry) => entry.role === "user" && String(entry.content || "").trim());
  if (!firstUser) return "New chat";
  return String(firstUser.content || "").replace(/\s+/g, " ").trim().slice(0, 56) || "New chat";
}

function buildInitialMessages(activeClass) {
  const classLabel = activeClass ? `${activeClass.form} ${activeClass.stream} ${activeClass.year}`.trim() : "your accessible classes";
  return [
    {
      role: "assistant",
      content: `Hello! I'm your AI assistant. Ask me about **${classLabel}**, student performance, missing results, or guardian follow-up drafts.`,
      time: new Date(),
    },
  ];
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
        <ul key={`ul-${elements.length}`}>
          {listItems.map((li, i) => (
            <li key={i}>{renderInline(li)}</li>
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
          <pre key={`code-${elements.length}`}>
            <code>{codeBlock}</code>
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

    if (!line.trim()) {
      elements.push(<div key={`sp-${elements.length}`} style={{ height: 6 }} />);
      continue;
    }

    elements.push(
      <p key={`p-${elements.length}`}>
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  if (codeBlock !== null) {
    elements.push(
      <pre key={`code-${elements.length}`}>
        <code>{codeBlock}</code>
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

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(<code key={match.index}>{match[6]}</code>);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export function AiAssistantPage({
  currentUser = {},
  classes = [],
  activeExam = "",
  topBarHeight = 60,
  sessionMeta = {},
}) {
  const { isMobile, isTablet } = useViewport();
  const { t } = useI18n();
  
  const [selectedClassId, setSelectedClassId] = useState("");
  const [responseLanguage, setResponseLanguage] = useState("en");
  const [messages, setMessages] = useState(buildInitialMessages(null));
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [likedIndex, setLikedIndex] = useState(null);
  const [dislikedIndex, setDislikedIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState("chat");
  const [recentChats, setRecentChats] = useState([]);
  const [attachments, setAttachments] = useState([]);
  
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fabTimeoutRef = useRef(null);
  const documentInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const conversationStorageKey = buildConversationStorageKey(selectedClassId, activeExam);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const classOptions = useMemo(() => {
    return classes.map((c) => ({
      id: c.id,
      label: getClassLabel(c),
    }));
  }, [classes]);

  const workspacePromptMap = useMemo(() => ({
    chat: "",
    study: `Create a concise study guide for ${getClassLabel(selectedClass)}${activeExam ? ` for ${activeExam}` : ""}. Include weak areas, revision priorities, and 5 practice questions.`,
    math: `Solve this math or marks-calculation problem step by step for ${getClassLabel(selectedClass)}: `,
    write: `Rewrite and improve this school communication so it sounds professional, clear, and parent-friendly: `,
    code: "Help me design or debug a school system feature. Here is the requirement: ",
    explain: "Explain this academic concept in simple steps for secondary school students: ",
    translate: "Translate this school communication between English and Swahili while keeping the tone professional: ",
    resources: `List the key academic resources, missing records, and action points for ${getClassLabel(selectedClass)}${activeExam ? ` in ${activeExam}` : ""}.`,
    history: "",
    settings: "",
  }), [activeExam, selectedClass]);

  // Load saved conversation
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(conversationStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          return;
        }
      }
      setMessages(buildInitialMessages(selectedClass));
    } catch (e) {
      console.error("Failed to load conversation:", e);
      setMessages(buildInitialMessages(selectedClass));
    }
  }, [conversationStorageKey, selectedClass]);

  // Save conversation
  useEffect(() => {
    try {
      sessionStorage.setItem(conversationStorageKey, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save conversation:", e);
    }
  }, [messages, conversationStorageKey]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [draft]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_RECENTS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setRecentChats(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecentChats([]);
    }
  }, []);

  useEffect(() => {
    try {
      if (!Array.isArray(messages) || messages.length <= 1) return;
      const nextEntry = {
        storageKey: conversationStorageKey,
        title: buildMessageTitle(messages),
        updatedAt: new Date().toISOString(),
        classId: selectedClassId || "",
        classLabel: getClassLabel(selectedClass),
        exam: activeExam || "",
        messages: messages.map((entry) => ({
          role: entry.role,
          content: entry.content,
          time: entry.time instanceof Date ? entry.time.toISOString() : entry.time || new Date().toISOString(),
          meta: entry.meta || null,
        })),
      };
      setRecentChats((current) => {
        const merged = [nextEntry, ...current.filter((entry) => entry.storageKey !== nextEntry.storageKey)].slice(0, 8);
        localStorage.setItem(CHAT_RECENTS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    } catch {
      // Ignore storage errors and keep chat usable.
    }
  }, [activeExam, conversationStorageKey, messages, selectedClass, selectedClassId]);

  const sendMessage = async (content) => {
    const text = String(content || draft).trim();
    if (!text || isSending) return;

    if (text.length > MAX_DRAFT_CHARS) {
      setError(`Message too long (max ${MAX_DRAFT_CHARS} characters)`);
      return;
    }

    const attachmentSummary = attachments.length
      ? `\n\nAttachment context:\n${attachments.map((entry) => `- ${entry.label}: ${entry.name}`).join("\n")}`
      : "";
    const payloadText = `${text}${attachmentSummary}`.trim();

    const nextMessages = [
      ...messages,
      { role: "user", content: payloadText, time: new Date() },
    ];

    setMessages(nextMessages);
    setDraft("");
    setAttachments([]);
    setError("");
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
          responseLanguage,
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
  };

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();
      sendMessage(draft);
    }
  }

  function clearConversation() {
    sessionStorage.removeItem(conversationStorageKey);
    setMessages(buildInitialMessages(selectedClass));
    setAttachments([]);
    setError("");
    setActiveWorkspace("chat");
    setRecentChats((current) => {
      const next = current.filter((entry) => entry.storageKey !== conversationStorageKey);
      try {
        localStorage.setItem(CHAT_RECENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
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

  function handleLike(index) {
    setLikedIndex(index);
    setDislikedIndex(null);
  }

  function handleDislike(index) {
    setDislikedIndex(index);
    setLikedIndex(null);
  }

  function handleShare(content) {
    if (navigator.share) {
      navigator.share({
        title: "AI Assistant Response",
        text: content,
      }).catch(() => {});
    } else {
      copyMessage(content, -1);
    }
  }

  function focusComposer() {
    if (textareaRef.current) textareaRef.current.focus();
  }

  function applyPromptTemplate(template, opts = {}) {
    const nextText = String(template || "").trim();
    if (!nextText) return;
    setDraft((current) => {
      const existing = String(current || "").trim();
      return existing ? `${existing}\n${nextText}` : nextText;
    });
    setToolsMenuOpen(false);
    if (isMobile && opts.closeSidebar) setSidebarOpen(false);
    setTimeout(focusComposer, 0);
  }

  function handleWorkspaceSelect(workspaceId) {
    setActiveWorkspace(workspaceId);
    const prompt = workspacePromptMap[workspaceId];
    if (prompt) {
      setDraft(prompt);
      setTimeout(focusComposer, 0);
    }
    if (isMobile) setSidebarOpen(false);
  }

  function restoreRecentChat(chat) {
    if (!chat) return;
    setActiveWorkspace("history");
    setSelectedClassId(String(chat.classId || ""));
    setMessages(
      Array.isArray(chat.messages) && chat.messages.length
        ? chat.messages.map((entry) => ({
            ...entry,
            time: entry.time ? new Date(entry.time) : new Date(),
          }))
        : buildInitialMessages(null),
    );
    setError("");
    if (isMobile) setSidebarOpen(false);
  }

  function addAttachments(fileList, label) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    const prepared = files.map((file) => ({
      id: `${label}-${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      label,
      size: file.size || 0,
    }));
    setAttachments((current) => {
      const byId = new Map(current.map((entry) => [entry.id, entry]));
      prepared.forEach((entry) => byId.set(entry.id, entry));
      return Array.from(byId.values()).slice(-6);
    });
    setToolsMenuOpen(false);
    setTimeout(focusComposer, 0);
  }

  function removeAttachment(id) {
    setAttachments((current) => current.filter((entry) => entry.id !== id));
  }

  const navItems = [
    { id: "chat", label: "Chat", icon: <ChatIcon /> },
    { id: "study", label: "Study Helper", icon: <BookIcon /> },
    { id: "math", label: "Math Solver", icon: <CalculatorIcon /> },
    { id: "write", label: "Write & Improve", icon: <PenIcon /> },
    { id: "code", label: "Code Helper", icon: <CodeIcon /> },
    { id: "explain", label: "Explain Concept", icon: <LightbulbIcon /> },
    { id: "translate", label: "Translate", icon: <LanguagesIcon /> },
    { id: "resources", label: "Resources", icon: <FolderIcon /> },
    { id: "history", label: "History", icon: <HistoryIcon /> },
  ];

  return (
    <div className="ai-dashboard">
      {isMobile && sidebarOpen ? (
        <button
          type="button"
          className="ai-sidebar-overlay"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside className={`ai-sidebar ${isMobile ? (sidebarOpen ? "open" : "hidden") : ""}`}>
        <div className="ai-sidebar-header">
          <button className="ai-new-chat-btn" onClick={clearConversation}>
            <PlusIcon />
            New Chat
          </button>
        </div>

        <div className="ai-usage-section">
          <div className="ai-usage-label">
            <span>Daily Usage</span>
            <span>75%</span>
          </div>
          <div className="ai-usage-bar">
            <div className="ai-usage-progress" style={{ width: "75%" }}></div>
          </div>
          <div className="ai-usage-text">15 of 20 messages used</div>
          <button className="ai-upgrade-btn" style={{ marginTop: "12px" }}>
            Upgrade to Pro
          </button>
        </div>

        <nav className="ai-nav-section">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`ai-nav-item ${item.id === activeWorkspace ? "active" : ""}`}
              onClick={() => handleWorkspaceSelect(item.id)}
            >
              <span className="ai-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ai-history-section">
          <div className="ai-history-header">Recent Chats</div>
          {recentChats.length ? recentChats.map((chat) => (
            <button key={chat.storageKey} className="ai-history-item" onClick={() => restoreRecentChat(chat)}>
              <span className="ai-history-item-title">{chat.title}</span>
              <span className="ai-history-item-meta">{chat.classLabel}</span>
            </button>
          )) : (
            <div className="ai-history-empty">No saved chats yet.</div>
          )}
        </div>

        <div className="ai-sidebar-footer">
          <button className="ai-settings-btn" onClick={() => {
            setActiveWorkspace("settings");
            setDraft(`Current assistant settings:\n- Class scope: ${getClassLabel(selectedClass)}\n- Exam: ${activeExam || "Default exam"}\n- Response language: ${responseLanguage}\n\nSuggest the best assistant setup for this task: `);
            if (isMobile) setSidebarOpen(false);
            setTimeout(focusComposer, 0);
          }}>
            <span className="ai-nav-icon"><SettingsIcon /></span>
            Settings
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="ai-main">
        <header className="ai-chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isMobile && (
              <button 
                className="ai-mobile-sidebar-toggle" 
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <MenuIcon />
              </button>
            )}
            <div>
              <div className="ai-chat-title">AI Assistant</div>
              <div className="ai-chat-subtitle">
                {selectedClass ? `${selectedClass.form} ${selectedClass.stream}` : "All Classes"}
              </div>
            </div>
          </div>
          <div className="ai-chat-controls">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="ai-control-btn"
            >
              <option value="">All Classes</option>
              {classOptions.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.label}</option>
              ))}
            </select>
            <select
              value={responseLanguage}
              onChange={(e) => setResponseLanguage(e.target.value)}
              className="ai-control-btn"
            >
              <option value="en">English</option>
              <option value="sw">Swahili</option>
            </select>
          </div>
        </header>

        <div className="ai-messages">
          {messages.map((message, index) => (
            <div key={index} className={`ai-message ${message.role}`}>
              <div className={`ai-message-avatar ${message.role}`}>
                {message.role === "assistant" ? "AI" : "U"}
              </div>
              <div className="ai-message-content">
                <div className="ai-message-bubble">
                  {renderMarkdown(message.content)}
                </div>
                {message.role === "assistant" && (
                  <div className="ai-message-actions">
                    <button
                      className={`ai-action-icon ${copiedIndex === index ? "liked" : ""}`}
                      onClick={() => copyMessage(message.content, index)}
                      title="Copy"
                    >
                      <CopyIcon />
                    </button>
                    <button
                      className={`ai-action-icon ${likedIndex === index ? "liked" : ""}`}
                      onClick={() => handleLike(index)}
                      title="Like"
                    >
                      <LikeIcon />
                    </button>
                    <button
                      className={`ai-action-icon ${dislikedIndex === index ? "disliked" : ""}`}
                      onClick={() => handleDislike(index)}
                      title="Dislike"
                    >
                      <DislikeIcon />
                    </button>
                    <button
                      className="ai-action-icon"
                      onClick={() => handleShare(message.content)}
                      title="Share"
                    >
                      <ShareIcon />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isSending && (
            <div className="ai-message assistant">
              <div className="ai-message-avatar ai">AI</div>
              <div className="ai-message-content">
                <div className="ai-typing-indicator">
                  <div className="ai-typing-dot"></div>
                  <div className="ai-typing-dot"></div>
                  <div className="ai-typing-dot"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-input-area">
          <div className="ai-input-wrapper">
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
              multiple
              hidden
              onChange={(event) => {
                addAttachments(event.target.files, "Document");
                event.target.value = "";
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                addAttachments(event.target.files, "Image");
                event.target.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => {
                addAttachments(event.target.files, "Camera");
                event.target.value = "";
              }}
            />

            {attachments.length ? (
              <div className="ai-attachment-strip">
                {attachments.map((entry) => (
                  <div key={entry.id} className="ai-attachment-chip">
                    <span>{entry.label}: {entry.name}</span>
                    <button type="button" onClick={() => removeAttachment(entry.id)} aria-label={`Remove ${entry.name}`}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="ai-input-box">
              <div className="ai-input-leading">
                <div style={{ position: "relative" }}>
                  <button 
                    className="ai-input-btn ai-input-btn-plus"
                    title="Tools"
                    onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                  >
                    <PlusIcon />
                  </button>
                  {toolsMenuOpen && (
                    <div className="ai-tools-menu open">
                      <button className="ai-tools-menu-item" onClick={() => documentInputRef.current?.click()}>
                        <DocumentIcon />
                        Upload Document
                      </button>
                      <button className="ai-tools-menu-item" onClick={() => imageInputRef.current?.click()}>
                        <ImageIcon />
                        Upload Image
                      </button>
                      <button className="ai-tools-menu-item" onClick={() => cameraInputRef.current?.click()}>
                        <CameraIcon />
                        Take Photo
                      </button>
                      <button className="ai-tools-menu-item" onClick={() => applyPromptTemplate("Find a student by Admission Number and summarize the profile, marks, missing subjects, and guardian contact context.\nAdmission Number: ")}>
                        <UserIcon />
                        Attach Student
                      </button>
                      <button className="ai-tools-menu-item" onClick={() => applyPromptTemplate(`Analyze the results for ${getClassLabel(selectedClass)}${activeExam ? ` in ${activeExam}` : ""}. Highlight top performers, failed students, incomplete records, and action points.`)}>
                        <ChartIcon />
                        Analyze Results
                      </button>
                      <button className="ai-tools-menu-item" onClick={() => applyPromptTemplate(`Draft guardian SMS text for ${getClassLabel(selectedClass)}${activeExam ? ` in ${activeExam}` : ""}. Keep it short, professional, and ready to send.`)}>
                        <FileTextIcon />
                        Generate Report SMS
                      </button>
                      <button className="ai-tools-menu-item" onClick={() => applyPromptTemplate(`Create a lesson plan outline for ${getClassLabel(selectedClass)}. Subject: \nTopic: \nLearning objectives: `)}>
                        <BookOpenIcon />
                        Create Lesson Plan
                      </button>
                      <button className="ai-tools-menu-item" onClick={() => applyPromptTemplate("Draft a professional school notice for parents/students about: ")}>
                        <BellIcon />
                        Create Notice
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="ai-input-center">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about students, classes, results, timetables, or guardian follow-up..."
                  className="ai-input-field"
                  rows={1}
                  disabled={isSending}
                />
              </div>

              <div className="ai-input-trailing">
                <button className="ai-input-btn ai-input-btn-ghost" title="Voice input" disabled={isSending}>
                  <MicIcon />
                </button>
                <button
                  className="ai-input-btn send"
                  onClick={() => sendMessage(draft)}
                  disabled={!draft.trim() || isSending}
                  title="Send message"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
            <div className="ai-disclaimer">
              <span>{isSending ? "Generating response..." : "Enter to send. Shift + Enter for a new line."}</span>
              <span>AI can make mistakes. Verify important information.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
