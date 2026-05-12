import React, { useMemo, useState } from "react";
import { useViewport } from "../../utils/useViewport";
import { StatsCard } from "./StatsCard";
import { PersonCard } from "./PersonCard";
import "./PeopleDirectory.css";

const EmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <path d="M11 8v6"></path>
    <path d="M8 11h6"></path>
  </svg>
);

function matchesSearch(entry, query) {
  if (!query) return true;
  const haystack = [
    entry.name,
    entry.phone,
    entry.email,
    entry.username,
    ...(entry.students || []).flatMap((student) => [
      student.name,
      student.admissionNo,
      student.indexNo,
      student.classLabel,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function PeopleDirectoryPage({
  title,
  description,
  entries = [],
  tone = "teal",
  onOpenStudentProfile,
  onOpenTimetable,
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
    <div className="dir-page-container">
      <div className="dir-header-card">
        <div>
          <div className="dir-header-title">{title}</div>
          <div className="dir-header-desc">{description}</div>
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
        className="dir-stats-grid"
        style={{
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
        }}
      >
        <StatsCard label="Total Records" value={stats.total} note="People currently listed in this directory." />
        <StatsCard label="Reachable Contacts" value={stats.withContact} note="Entries with a phone number or email saved." />
        <StatsCard label="Linked Students" value={stats.linkedStudents} note="Student records connected to these people." />
      </div>

      <div className="dir-search-card">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="dir-search-input"
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
        <div className="dir-person-grid">
            {filtered.map((entry) => (
              <PersonCard
                key={entry.key}
                entry={entry}
                palette={palette}
                handleCopy={handleCopy}
                onOpenStudentProfile={onOpenStudentProfile}
                onOpenTimetable={onOpenTimetable}
              />
            ))}
        </div>
      ) : (
        <div className="dir-empty-state">
          <EmptyIcon />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>No Records Found</div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>Try adjusting your search query.</div>
          </div>
        </div>
      )}
    </div>
  );
}
