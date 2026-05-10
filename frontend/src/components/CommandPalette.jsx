import React, { useEffect, useRef, useState } from "react";
import { useViewport } from "../utils/useViewport";
import { useI18n } from "../i18n";

function getClassLabel(cls = {}) {
  return cls.name || [cls.form, cls.year].filter(Boolean).join(" ") || "Unnamed Class";
}

function getUserTargetPage(user = {}) {
  if (user.role === "teacher" || user.role === "academic") return "teachers";
  if (user.role === "parent") return "parents";
  return "account";
}

export function CommandPalette({
  isOpen,
  onClose,
  classes = [],
  users = [],
  onSetPage,
  onPickClass,
}) {
  const { t } = useI18n();
  const { isMobile } = useViewport();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();
  const items = [];

  const pages = [
    { label: t("dashboard"), key: "dashboard", icon: "DB" },
    { label: t("timetable"), key: "timetable", icon: "TT" },
    { label: "Account", key: "account", icon: "AC" },
    { label: "Teachers", key: "teachers", icon: "TC" },
    { label: "Parents", key: "parents", icon: "PR" },
  ];

  pages.forEach((page) => {
    if (!normalizedQuery || page.label.toLowerCase().includes(normalizedQuery)) {
      items.push({
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
      items.push({
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
    const name = String(user.displayName || user.username || "").toLowerCase();
    const phone = String(user.phone || "").toLowerCase();
    if (!normalizedQuery || name.includes(normalizedQuery) || phone.includes(normalizedQuery)) {
      items.push({
        type: "user",
        id: user.username || user.id,
        label: user.displayName || user.username || "User",
        icon: "US",
        subtitle: user.role || "",
        action: () => onSetPage(getUserTargetPage(user)),
      });
    }
  });

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
          maxWidth: 600,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "70vh",
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search classes, teachers, pages..."
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
          {items.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              No results found for "{query}"
            </div>
          ) : (
            <div style={{ display: "grid", gap: 4 }}>
              {items.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}-${index}`}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: 8,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    style={{
                      minWidth: 34,
                      height: 34,
                      borderRadius: 10,
                      background: "#e2e8f0",
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
