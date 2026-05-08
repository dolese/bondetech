import React, { useMemo, useState } from "react";
import { useViewport } from "../utils/useViewport";

function formatDateTime(value) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function matchesSearch(entry, query) {
  if (!query) return true;
  const haystack = [
    entry.name,
    entry.phone,
    entry.email,
    entry.username,
    ...(entry.students || []).flatMap((student) => [
      student.name,
      student.indexNo,
      student.classLabel,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarGradient(name) {
  const hash = Array.from(name || "").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 40) % 360}, 80%, 40%))`;
}

function getRoleBorderColor(badge) {
  const b = (badge || "").toLowerCase();
  if (b.includes("admin")) return "#8b5cf6"; // Purple
  if (b.includes("academic")) return "#16a34a"; // Green
  if (b.includes("teacher") || b.includes("staff")) return "#3b82f6"; // Blue
  if (b.includes("parent")) return "#10b981"; // Green
  return "transparent";
}

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const EmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <path d="M11 8v6"></path>
    <path d="M8 11h6"></path>
  </svg>
);

export function PeopleDirectoryPage({
  title,
  description,
  entries = [],
  tone = "teal",
}) {
  const { isMobile } = useViewport();
  const [query, setQuery] = useState("");

  const palette =
    tone === "amber"
      ? {
          accent: "#b45309",
          soft: "rgba(245,158,11,0.12)",
          border: "rgba(245,158,11,0.22)",
        }
      : {
          accent: "#0f8b8d",
          soft: "rgba(15,139,141,0.12)",
          border: "rgba(15,139,141,0.18)",
        };

  const filtered = useMemo(
    () => entries.filter((entry) => matchesSearch(entry, query)),
    [entries, query]
  );

  const stats = useMemo(() => ({
    total: entries.length,
    withContact: entries.filter((entry) => entry.phone || entry.email).length,
    linkedStudents: entries.reduce((sum, entry) => sum + (entry.students?.length || 0), 0),
  }), [entries]);

  const handleCopy = (text) => {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 18,
        display: "grid",
        gap: 16,
        background: "linear-gradient(180deg, #eef4fb 0%, #f8fbff 100%)",
      }}
    >
      <style>{`
        .dir-person-card {
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dir-person-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 48px rgba(15,23,42,0.08) !important;
        }
        .dir-copy-btn {
          opacity: 0;
          color: #94a3b8;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          margin-left: 2px;
          border-radius: 4px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
        }
        .dir-copy-btn:hover {
          color: #0f172a;
          background: #f1f5f9;
        }
        .dir-copy-wrapper {
          display: flex;
          align-items: center;
          height: 24px;
        }
        .dir-copy-wrapper:hover .dir-copy-btn {
          opacity: 1;
        }
        .dir-action-btn {
          color: #94a3b8;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 6px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dir-action-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
          border-color: #e2e8f0;
        }
      `}</style>

      <div
        style={{
          background: "rgba(255,255,255,0.94)",
          borderRadius: 24,
          border: "1px solid rgba(226,232,240,0.92)",
          boxShadow: "0 18px 48px rgba(15,23,42,0.06)",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>{title}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>
            {description}
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "9px 14px",
            background: palette.soft,
            border: `1px solid ${palette.border}`,
            color: palette.accent,
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "Total Records", value: stats.total, note: "People currently listed in this directory." },
          { label: "Reachable Contacts", value: stats.withContact, note: "Entries with a phone number or email saved." },
          { label: "Linked Students", value: stats.linkedStudents, note: "Student records connected to these people." },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "rgba(255,255,255,0.94)",
              borderRadius: 20,
              border: "1px solid rgba(226,232,240,0.92)",
              boxShadow: "0 14px 36px rgba(15,23,42,0.05)",
              padding: "16px 18px",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase" }}>
              {item.label}
            </div>
            <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 900, color: "#0f172a" }}>{item.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{item.note}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.94)",
          borderRadius: 20,
          border: "1px solid rgba(226,232,240,0.92)",
          boxShadow: "0 14px 36px rgba(15,23,42,0.05)",
          padding: 14,
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(203,213,225,0.95)",
            background: "#fff",
            outline: "none",
            fontSize: 14,
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = palette.accent)}
          onBlur={(e) => (e.target.style.borderColor = "rgba(203,213,225,0.95)")}
        />
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Showing <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> of{" "}
            <strong style={{ color: "#0f172a" }}>{entries.length}</strong> records
            {query ? ` for "${query}"` : ""}.
          </div>
          {query ? (
            <button
              type="button"
              className="dir-action-btn"
              onClick={() => setQuery("")}
              style={{ padding: "7px 10px", fontSize: 12, fontWeight: 800 }}
            >
              Clear Search
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((entry) => {
            const borderColor = getRoleBorderColor(entry.badge);
            return (
              <div
                key={entry.key}
                className="dir-person-card"
                style={{
                  background: "rgba(255,255,255,0.97)",
                  borderRadius: 24,
                  border: "1px solid rgba(226,232,240,0.92)",
                  borderLeft: borderColor !== "transparent" ? `5px solid ${borderColor}` : undefined,
                  boxShadow: "0 18px 46px rgba(15,23,42,0.05)",
                  padding: "18px 18px 16px",
                  display: "grid",
                  gap: 16,
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      background: getAvatarGradient(entry.name),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.1)",
                    }}
                  >
                    {getInitials(entry.name)}
                  </div>
                  
                  {/* Info Header */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {entry.name || "Unnamed"}
                      </div>
                    </div>
                    <div style={{ marginTop: 2, fontSize: 13, color: "#64748b", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 8 }}>
                      {entry.subtitle || "System Record"}
                      {entry.badge && (
                        <div
                          style={{
                            borderRadius: 6,
                            padding: "3px 6px",
                            background: palette.soft,
                            color: palette.accent,
                            fontWeight: 800,
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {entry.badge}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                    background: "#f8fafc",
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid #f1f5f9"
                  }}
                >
                  {entry.phone ? (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
                        Phone
                      </div>
                      <div className="dir-copy-wrapper">
                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{entry.phone}</div>
                        <button className="dir-copy-btn" onClick={() => handleCopy(entry.phone)} title="Copy Phone">
                          <CopyIcon />
                        </button>
                      </div>
                      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a
                          href={`tel:${entry.phone}`}
                          style={{
                            color: palette.accent,
                            fontSize: 11,
                            fontWeight: 800,
                            textDecoration: "none",
                          }}
                        >
                          Call
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {entry.email ? (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
                        Email
                      </div>
                      <div className="dir-copy-wrapper">
                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.email}
                        </div>
                        <button className="dir-copy-btn" onClick={() => handleCopy(entry.email)} title="Copy Email">
                          <CopyIcon />
                        </button>
                      </div>
                      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a
                          href={`mailto:${entry.email}`}
                          style={{
                            color: palette.accent,
                            fontSize: 11,
                            fontWeight: 800,
                            textDecoration: "none",
                          }}
                        >
                          Email
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {entry.username ? (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
                        Username
                      </div>
                      <div className="dir-copy-wrapper">
                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{entry.username}</div>
                        <button className="dir-copy-btn" onClick={() => handleCopy(entry.username)} title="Copy Username">
                          <CopyIcon />
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {entry.lastSeen ? (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
                        Last Activity
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#475569", fontWeight: 600 }}>
                        {formatDateTime(entry.lastSeen)}
                      </div>
                    </div>
                  ) : null}
                </div>

                {entry.address ? (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
                      Address
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                      {entry.address}
                    </div>
                  </div>
                ) : null}

                {entry.students?.length ? (
                  <div
                    style={{
                      paddingTop: 14,
                      borderTop: "1px dashed rgba(226,232,240,0.9)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
                      Linked Students ({entry.students.length})
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {entry.students.map((student) => (
                        <div
                          key={student.key}
                          style={{
                            borderRadius: 12,
                            background: "#f1f5f9",
                            border: "1px solid rgba(226,232,240,0.6)",
                            padding: "8px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{student.name}</div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                              {student.indexNo ? `${student.indexNo} | ` : ""}
                              {student.classLabel}
                            </div>
                          </div>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 10, fontWeight: 800 }}>
                            {getInitials(student.name)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,255,255,0.94)",
            borderRadius: 24,
            border: "1px dashed rgba(203,213,225,0.8)",
            boxShadow: "0 18px 46px rgba(15,23,42,0.03)",
            padding: "48px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16
          }}
        >
          <EmptyIcon />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>No Records Found</div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>Try adjusting your search query.</div>
          </div>
        </div>
      )}
    </div>
  );
}
