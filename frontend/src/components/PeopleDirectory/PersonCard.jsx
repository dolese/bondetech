import React, { useMemo, useRef, useState } from 'react';
import { useViewport } from '../../utils/useViewport';
import './PeopleDirectory.css';

function formatDateTime(value) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
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

const MoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1.4"></circle>
    <circle cx="12" cy="12" r="1.4"></circle>
    <circle cx="12" cy="19" r="1.4"></circle>
  </svg>
);

export function PersonCard({
  entry,
  palette,
  handleCopy,
  onOpenStudentProfile,
  onOpenTimetable,
  onEditEntry,
  onDeleteEntry,
  canManageEntry = false,
}) {
  const { isMobile } = useViewport();
  const borderColor = getRoleBorderColor(entry.badge);
  const [menuOpen, setMenuOpen] = useState(false);
  const [studentsVisible, setStudentsVisible] = useState(false);
  const studentSectionRef = useRef(null);
  const actions = useMemo(
    () =>
      [
        onEditEntry ? { key: "edit", label: "Edit Parent", onClick: () => onEditEntry(entry) } : null,
        entry.students?.length
          ? {
              key: "students",
              label: "View Students",
              onClick: () => {
                setStudentsVisible(true);
                setTimeout(() => studentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
              },
            }
          : null,
        onDeleteEntry
          ? {
              key: "delete",
              label: "Delete",
              destructive: true,
              onClick: async () => {
                const confirmed = window.confirm(
                  `Delete this parent record from ${entry.students?.length || 0} linked student${(entry.students?.length || 0) === 1 ? "" : "s"}?`,
                );
                if (!confirmed) return;
                await onDeleteEntry(entry);
              },
            }
          : null,
      ].filter(Boolean),
    [entry, onDeleteEntry, onEditEntry],
  );

  return (
    <div
      className="dir-person-card"
      style={{
        borderLeft: borderColor !== "transparent" ? `5px solid ${borderColor}` : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Avatar */}
        <div
          style={{
            width: 46, height: 46, borderRadius: 12,
            background: getAvatarGradient(entry.name),
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 16, fontWeight: 600, flexShrink: 0,
            boxShadow: "none",
          }}
        >
          {getInitials(entry.name)}
        </div>
        
        {/* Info Header */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.name || "Unnamed"}
            </div>
            {canManageEntry && actions.length ? (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  type="button"
                  className="dir-action-btn"
                  onClick={() => setMenuOpen((current) => !current)}
                  aria-label="More actions"
                >
                  <MoreIcon />
                </button>
                {menuOpen ? (
                  <div className="dir-menu">
                    {actions.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        className={`dir-menu-item${action.destructive ? " destructive" : ""}`}
                        onClick={async () => {
                          setMenuOpen(false);
                          await action.onClick?.();
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div style={{ marginTop: 2, fontSize: 13, color: "#64748b", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 8 }}>
            {entry.subtitle || "System Record"}
            {entry.badge && (
              <div
                style={{
                  borderRadius: 6, padding: "3px 6px",
                  background: palette.soft, color: palette.accent,
                  fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em",
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
          gap: 12, background: "#f8fafc", padding: 12, borderRadius: 12, border: "1px solid #e2e8f0"
        }}
      >
        {entry.phone ? (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Phone
            </div>
            <div className="dir-copy-wrapper">
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{entry.phone}</div>
              <button className="dir-copy-btn" onClick={() => handleCopy(entry.phone)} title="Copy Phone">
                <CopyIcon />
              </button>
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a
                href={`tel:${entry.phone}`}
                style={{ color: palette.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}
              >
                Call
              </a>
            </div>
          </div>
        ) : null}
        {entry.email ? (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Email
            </div>
            <div className="dir-copy-wrapper">
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.email}
              </div>
              <button className="dir-copy-btn" onClick={() => handleCopy(entry.email)} title="Copy Email">
                <CopyIcon />
              </button>
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a
                href={`mailto:${entry.email}`}
                style={{ color: palette.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}
              >
                Email
              </a>
            </div>
          </div>
        ) : null}
        {entry.username ? (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Username
            </div>
            <div className="dir-copy-wrapper">
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{entry.username}</div>
              <button className="dir-copy-btn" onClick={() => handleCopy(entry.username)} title="Copy Username">
                <CopyIcon />
              </button>
            </div>
          </div>
        ) : null}
        {entry.lastSeen ? (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
          <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Address
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
            {entry.address}
          </div>
        </div>
      ) : null}

      {entry.students?.length ? (
        <div ref={studentSectionRef} className="dir-student-list">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Linked Students ({entry.students.length})
            </div>
            <button
              type="button"
              className="dir-mini-btn"
              onClick={() => setStudentsVisible((current) => !current)}
            >
              {studentsVisible ? "Hide" : "View Students"}
            </button>
          </div>
          {studentsVisible ? (
          <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Student records linked to this guardian
          </div>
          ) : null}
          {studentsVisible ? (
          <div style={{ display: "grid", gap: 8 }}>
            {entry.students.map((student) => (
              <div key={student.key} className="dir-student-item">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{student.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {student.indexNo ? `${student.indexNo} | ` : ""}
                    {student.classLabel}
                  </div>
                </div>
                <div className="dir-student-actions">
                  {(student.admissionNo || student.indexNo) && onOpenStudentProfile ? (
                    <button
                      type="button"
                      className="dir-mini-btn"
                      onClick={() =>
                        onOpenStudentProfile({
                          admissionNo: student.admissionNo || "",
                          indexNo: student.indexNo || "",
                          classId: student.classId || "",
                          studentId: student.studentId || "",
                        })
                      }
                    >
                      Open Profile
                    </button>
                  ) : null}
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 10, fontWeight: 600 }}>
                    {getInitials(student.name)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          ) : null}
        </div>
      ) : null}

      {entry.assignments?.length ? (
        <div className="dir-student-list">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Timetable Assignments ({entry.assignments.length})
            </div>
            {onOpenTimetable ? (
              <button type="button" className="dir-mini-btn" onClick={onOpenTimetable}>
                Open Timetable
              </button>
            ) : null}
          </div>
          {entry.assignmentSummary ? (
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              {entry.assignmentSummary}
            </div>
          ) : null}
          <div style={{ display: "grid", gap: 8 }}>
            {entry.assignments.map((assignment) => (
              <div key={assignment.key} className="dir-student-item">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{assignment.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{assignment.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
