import React, { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api";
import { useI18n } from "../i18n";
import { useViewport } from "../utils/useViewport";

function getClassLabel(cls = {}) {
  const base = [cls.form, cls.stream].filter(Boolean).join(" ").trim();
  if (base && cls.year) return `${base} ${cls.year}`;
  return base || cls.name || "Unnamed Class";
}

function getUserTargetPage(user = {}) {
  if (user.role === "teacher" || user.role === "academic") return "teachers";
  if (user.role === "parent") return "parents";
  return "account";
}

function buildUserSubtitle(user = {}) {
  return [user.role, user.phone].filter(Boolean).join(" • ");
}

function buildStudentSubtitle(student = {}) {
  return [
    student.indexNo,
    [student.form, student.stream, student.year].filter(Boolean).join(" "),
    student.status,
  ]
    .filter(Boolean)
    .join(" • ");
}

export function CommandPalette({
  isOpen,
  onClose,
  classes = [],
  users = [],
  allowedClassIds = null,
  onSetPage,
  onPickClass,
  onOpenStudentProfile,
}) {
  const { t } = useI18n();
  const { isMobile } = useViewport();
  const [query, setQuery] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setStudentResults([]);
    setHighlightedIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setStudentResults([]);
      setLoadingStudents(false);
      return;
    }

    let cancelled = false;
    setLoadingStudents(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await API.searchStudents(normalizedQuery, { limit: 8 });
        if (!cancelled) {
          const filteredResults =
            allowedClassIds instanceof Set
              ? (Array.isArray(results) ? results : []).filter((student) =>
                  allowedClassIds.has(student.classId)
                )
              : Array.isArray(results)
              ? results
              : [];
          setStudentResults(filteredResults);
        }
      } catch {
        if (!cancelled) setStudentResults([]);
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [allowedClassIds, isOpen, query]);

  const items = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    const nextItems = [];
    const pages = [
      { label: t("dashboard"), key: "dashboard", icon: "DB" },
      { label: t("timetable"), key: "timetable", icon: "TT" },
      { label: "Account", key: "account", icon: "AC" },
      { label: "Teachers", key: "teachers", icon: "TC" },
      { label: "Parents", key: "parents", icon: "PR" },
    ];

    studentResults.forEach((student) => {
      nextItems.push({
        type: "student",
        id: `${student.classId}-${student.studentId}`,
        icon: "ST",
        label: student.name || "Student",
        subtitle: buildStudentSubtitle(student),
        action: () => onOpenStudentProfile?.(student.indexNo),
      });
    });

    pages.forEach((page) => {
      if (!normalizedQuery || page.label.toLowerCase().includes(normalizedQuery)) {
        nextItems.push({
          type: "page",
          id: page.key,
          label: page.label,
          icon: page.icon,
          action: () => onSetPage(page.key),
        });
      }
    });

    classes.forEach((cls) => {
      const classLabel = getClassLabel(cls);
      if (!normalizedQuery || classLabel.toLowerCase().includes(normalizedQuery)) {
        nextItems.push({
          type: "class",
          id: cls.id,
          label: classLabel,
          icon: "CL",
          subtitle: `${cls.studentCount || cls.students?.length || 0} students`,
          action: () => onPickClass(cls),
        });
      }
    });

    users.forEach((user) => {
      const haystack = [
        user.displayName,
        user.username,
        user.phone,
        user.email,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!normalizedQuery || haystack.includes(normalizedQuery)) {
        nextItems.push({
          type: "user",
          id: user.username || user.id,
          label: user.displayName || user.username || "User",
          icon: "US",
          subtitle: buildUserSubtitle(user),
          action: () => onSetPage(getUserTargetPage(user)),
        });
      }
    });

    return nextItems;
  }, [classes, onOpenStudentProfile, onPickClass, onSetPage, query, studentResults, t, users]);

  useEffect(() => {
    setHighlightedIndex((prev) => Math.min(prev, Math.max(items.length - 1, 0)));
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((prev) =>
          items.length ? (prev - 1 + items.length) % items.length : 0,
        );
        return;
      }
      if (event.key === "Enter") {
        if (!items[highlightedIndex]) return;
        event.preventDefault();
        items[highlightedIndex].action?.();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [highlightedIndex, isOpen, items, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: isMobile ? 60 : 120,
        paddingLeft: 16,
        paddingRight: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 660,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "74vh",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 800 }}>Search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlightedIndex(0);
            }}
            placeholder="Search students, classes, users, pages..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 18,
              color: "#0f172a",
              background: "transparent",
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            ESC
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: 8, flex: 1 }}>
          {loadingStudents ? (
            <div style={{ padding: "10px 14px", fontSize: 12, color: "#64748b", fontWeight: 700 }}>
              Searching students...
            </div>
          ) : null}
          {items.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              No results found for "{query}"
            </div>
          ) : (
            <div style={{ display: "grid", gap: 4 }}>
              {items.map((item, index) => {
                const active = index === highlightedIndex;
                return (
                  <button
                    key={`${item.type}-${item.id}-${index}`}
                    onClick={() => {
                      item.action?.();
                      onClose();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      border: "none",
                      background: active ? "#f1f5f9" : "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: 8,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span
                      style={{
                        minWidth: 34,
                        height: 34,
                        borderRadius: 10,
                        background: item.type === "student" ? "#dcfce7" : "#e2e8f0",
                        color: "#0f172a",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {item.icon}
                    </span>
                    <div style={{ flex: 1, display: "grid", gap: 2 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{item.label}</div>
                      {item.subtitle ? (
                        <div style={{ fontSize: 12, color: "#64748b" }}>{item.subtitle}</div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
