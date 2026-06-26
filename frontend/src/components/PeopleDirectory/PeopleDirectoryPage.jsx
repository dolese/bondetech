import React, { useMemo, useState } from "react";
import { useViewport } from "../../utils/useViewport";
import { useI18n } from "../../i18n";
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

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7"></circle>
    <path d="m20 20-3.5-3.5"></path>
  </svg>
);

const FilterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16"></path>
    <path d="M7 12h10"></path>
    <path d="M10 18h4"></path>
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18.9 19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.12.9.34 1.76.66 2.57a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 7 7l1.29-1.72a2 2 0 0 1 2.11-.45c.81.32 1.67.54 2.57.66A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.5 11.5a8.5 8.5 0 1 1-15.2 5.3L4 21l4.3-1.1a8.5 8.5 0 0 1 12.2-8.4z"></path>
    <path d="M9.4 8.9c.2-.4.4-.4.7-.4h.6c.2 0 .5 0 .7.5.2.6.8 2 .9 2.1.1.1.1.3 0 .4l-.4.6c-.1.1-.2.3 0 .5.2.4.8 1.3 1.8 2.1 1.2 1 2.2 1.3 2.6 1.5.2.1.4.1.5-.1l.6-.7c.1-.2.3-.2.5-.1l2.1 1c.2.1.4.2.4.4 0 .1-.1.9-.5 1.3-.4.4-1.2.9-2.2.9s-2.2-.3-3.9-1.2c-1.1-.6-2-1.4-2.8-2.2-.8-.8-1.5-1.7-2-2.8-.5-1.1-.7-2-.5-2.8.2-.8.7-1.2.9-1.4z"></path>
  </svg>
);

const MoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1.4"></circle>
    <circle cx="12" cy="12" r="1.4"></circle>
    <circle cx="12" cy="19" r="1.4"></circle>
  </svg>
);

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getAvatarGradient(name) {
  const hash = Array.from(String(name || "")).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `linear-gradient(135deg, hsl(${hue}, 72%, 60%), hsl(${(hue + 38) % 360}, 80%, 46%))`;
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesSearch(entry, query) {
  if (!query) return true;
  const haystack = [
    entry.name,
    entry.phone,
    entry.email,
    entry.username,
    entry.address,
    entry.relationship,
    ...(entry.students || []).flatMap((student) => [
      student.name,
      student.indexNo,
      student.admissionNo,
      student.classLabel,
      student.stream,
      student.form,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function exportParentCsv(entries = []) {
  const header = ["Parent / Guardian", "Phone", "Relationship", "Location", "Linked Students"];
  const lines = [
    header.join(","),
    ...entries.map((entry) =>
      [
        `"${String(entry.name || "").replace(/"/g, '""')}"`,
        String(entry.phone || ""),
        `"${String(entry.relationship || "Guardian").replace(/"/g, '""')}"`,
        `"${String(entry.address || "Not set").replace(/"/g, '""')}"`,
        Number(entry.students?.length || 0),
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "parents-guardians.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function ParentTableRow({
  entry,
  rowNumber,
  onOpenStudentProfile,
  onOpenStudents,
  onEditEntry,
  onDeleteEntry,
  t,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const firstStudent = entry.students?.[0] || null;
  const actions = [
    onEditEntry ? { key: "edit", label: t("editParent", "Edit Parent"), onClick: () => onEditEntry(entry) } : null,
    entry.students?.length ? { key: "students", label: t("viewStudents", "View Students"), onClick: () => onOpenStudents(entry) } : null,
    onDeleteEntry
      ? {
          key: "delete",
          label: t("delete", "Delete"),
          destructive: true,
          onClick: async () => {
            const confirmed = window.confirm(
              t("deleteParentConfirm", "Delete this parent record from {count} linked student{suffix}?", {
                count: entry.students?.length || 0,
                suffix: (entry.students?.length || 0) === 1 ? "" : "s",
              }),
            );
            if (!confirmed) return;
            await onDeleteEntry(entry);
          },
        }
      : null,
  ].filter(Boolean);

  return (
    <tr className="dir-parent-row">
      <td>{rowNumber}</td>
      <td>
        <div className="dir-parent-cell-main">
          <div className="dir-parent-avatar" style={{ background: getAvatarGradient(entry.name) }}>
            {getInitials(entry.name)}
          </div>
          <div className="dir-parent-identity">
            <div className="dir-parent-name">{entry.name || t("unnamedGuardian", "Unnamed guardian")}</div>
            <div className="dir-parent-subtitle">{t("guardian", "Guardian")}</div>
          </div>
        </div>
      </td>
      <td>
        <div className="dir-parent-phone">{entry.phone || t("notSet", "Not set")}</div>
        <div className="dir-parent-phone-actions">
          {entry.phone ? (
            <>
              <a href={`tel:${entry.phone}`} className="dir-parent-phone-link"><PhoneIcon /></a>
              <a href={`https://wa.me/${String(entry.phone).replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="dir-parent-wa-link"><WhatsAppIcon /></a>
            </>
          ) : null}
        </div>
      </td>
      <td>
        <span className="dir-parent-badge">{entry.relationship || t("guardian", "Guardian")}</span>
      </td>
      <td>{entry.address || t("notSet", "Not set")}</td>
      <td>
        <div className="dir-parent-linked">
          <span className="dir-parent-count">{entry.students?.length || 0}</span>
          <button type="button" className="dir-parent-link-btn" onClick={() => onOpenStudents(entry)}>
            {t("view", "View")}
          </button>
        </div>
      </td>
      <td>
        <div className="dir-parent-actions">
          <button
            type="button"
            className="dir-parent-profile-btn"
            onClick={() => {
              if (!firstStudent || !onOpenStudentProfile) return;
              onOpenStudentProfile({
                admissionNo: firstStudent.admissionNo || "",
                indexNo: firstStudent.indexNo || "",
                classId: firstStudent.classId || "",
                studentId: firstStudent.studentId || "",
              });
            }}
            disabled={!firstStudent || !onOpenStudentProfile}
          >
            {t("viewProfile", "View Profile")}
          </button>
          <div className="dir-parent-menu-wrap">
            <button type="button" className="dir-parent-more-btn" onClick={() => setMenuOpen((current) => !current)}>
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
        </div>
      </td>
    </tr>
  );
}

export function PeopleDirectoryPage({
  title,
  description,
  entries = [],
  loading = false,
  tone = "teal",
  onOpenStudentProfile,
  onOpenTimetable,
  onEditEntry,
  onDeleteEntry,
}) {
  const { isMobile } = useViewport();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const [studentsEntry, setStudentsEntry] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [formFilter, setFormFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState("all");
  const [relationshipFilter, setRelationshipFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [viewMode, setViewMode] = useState(tone === "amber" ? "table" : "grouped");

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

  const isParentDirectory = tone === "amber" && Boolean(onEditEntry || onDeleteEntry);
  const isLoading = Boolean(loading);

  const normalizedEntries = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        relationship: entry.relationship || t("guardian", "Guardian"),
      })),
    [entries, t],
  );

  const formOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedEntries.flatMap((entry) => (entry.students || []).map((student) => student.form || String(student.classLabel || "").split(" ").slice(0, 2).join(" "))).filter(Boolean),
        ),
      ).sort(),
    [normalizedEntries],
  );

  const streamOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedEntries.flatMap((entry) =>
            (entry.students || [])
              .map((student) => student.stream || String(student.classLabel || "").split(" ")[2] || "")
              .filter(Boolean),
          ),
        ),
      ).sort(),
    [normalizedEntries],
  );

  const relationshipOptions = useMemo(
    () => Array.from(new Set(normalizedEntries.map((entry) => entry.relationship || t("guardian", "Guardian")))).sort(),
    [normalizedEntries, t],
  );

  const filtered = useMemo(() => {
    return normalizedEntries.filter((entry) => {
      if (!matchesSearch(entry, query)) return false;
      if (relationshipFilter !== "all" && normalizeValue(entry.relationship) !== normalizeValue(relationshipFilter)) {
        return false;
      }
      if (formFilter !== "all") {
        const hasForm = (entry.students || []).some(
          (student) => normalizeValue(student.form || String(student.classLabel || "").split(" ").slice(0, 2).join(" ")) === normalizeValue(formFilter),
        );
        if (!hasForm) return false;
      }
      if (streamFilter !== "all") {
        const hasStream = (entry.students || []).some(
          (student) => normalizeValue(student.stream || String(student.classLabel || "").split(" ")[2] || "") === normalizeValue(streamFilter),
        );
        if (!hasStream) return false;
      }
      return true;
    });
  }, [normalizedEntries, query, relationshipFilter, formFilter, streamFilter]);

  const stats = useMemo(
    () => ({
      total: normalizedEntries.length,
      withContact: normalizedEntries.filter((entry) => entry.phone || entry.email).length,
      linkedStudents: normalizedEntries.reduce((sum, entry) => sum + (entry.students?.length || 0), 0),
    }),
    [normalizedEntries],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageEntries = useMemo(
    () => filtered.slice((safePage - 1) * perPage, safePage * perPage),
    [filtered, perPage, safePage],
  );
  const groupedParentEntries = useMemo(() => {
    if (!isParentDirectory) return [];
    const groups = new Map();
    pageEntries.forEach((entry) => {
      const labels = Array.from(
        new Set(
          (entry.students || [])
            .map((student) => student.form || String(student.classLabel || "").split(" ").slice(0, 2).join(" "))
            .filter(Boolean),
        ),
      );
      const groupLabel = labels[0] || "Unassigned Form";
      if (!groups.has(groupLabel)) {
        groups.set(groupLabel, []);
      }
      groups.get(groupLabel).push(entry);
    });
    return Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right, "en", { sensitivity: "base", numeric: true }))
      .map(([label, records]) => ({ label, records }));
  }, [isParentDirectory, pageEntries]);

  const handleCopy = (text) => {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      name: String(entry?.name || "").trim(),
      phone: String(entry?.phone || "").trim(),
      address: String(entry?.address || "").trim(),
    });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditingEntry(null);
    setEditForm({ name: "", phone: "", address: "" });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editingEntry || !onEditEntry || saving) return;
    setSaving(true);
    const result = await onEditEntry(editingEntry, editForm);
    setSaving(false);
    if (result?.ok) {
      closeEdit();
    }
  };

  const openStudents = (entry) => {
    setStudentsEntry(entry);
  };

  const closeStudents = () => setStudentsEntry(null);

  const resetFilters = () => {
    setFormFilter("all");
    setStreamFilter("all");
    setRelationshipFilter("all");
    setQuery("");
    setPage(1);
  };

  const tableMode = isParentDirectory && viewMode === "table";

  return (
    <div className="dir-page-container">
      <div className="dir-header-card">
        <div className="dir-header-content">
          <div>
            <div className="dir-header-title">{title}</div>
            <div className="dir-header-desc">{description}</div>
          </div>
          {!isParentDirectory || viewMode === "grouped" ? (
            <div className="dir-header-badge">
              {filtered.length} record{filtered.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>
      </div>

      {!tableMode ? (
        <>
          <div
            className="dir-stats-grid"
            style={{
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            }}
          >
            <StatsCard label={t("totalRecords", "Total Records")} value={stats.total} note={t("totalRecordsNote", "People currently listed in this directory.")} />
            <StatsCard label={t("reachableContacts", "Reachable Contacts")} value={stats.withContact} note={t("reachableContactsNote", "Entries with a phone number or email saved.")} />
            <StatsCard label={t("linkedStudentsLabel", "Linked Students")} value={stats.linkedStudents} note={t("linkedStudentsNote", "Student records connected to these people.")} />
          </div>

          <div className="dir-search-card">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchDirectory", "Search {title}...", { title: String(title || "").toLowerCase() })}
              className="dir-search-input"
              onFocus={(e) => (e.target.style.borderColor = palette.accent)}
              onBlur={(e) => (e.target.style.borderColor = "rgba(203,213,225,0.95)")}
            />
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {t("showingRecords", "Showing {filtered} of {total} records{suffix}.", {
                  filtered: filtered.length,
                  total: entries.length,
                  suffix: query ? ` for "${query}"` : "",
                })}
              </div>
              {query ? (
                <button type="button" className="dir-action-btn" onClick={() => setQuery("")} style={{ padding: "7px 10px", fontSize: 12, fontWeight: 600 }}>
                  {t("clearSearch", "Clear Search")}
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
                  onEditEntry={onEditEntry ? openEdit : null}
                  onDeleteEntry={onDeleteEntry}
                  canManageEntry={Boolean(onEditEntry || onDeleteEntry)}
                />
              ))}
            </div>
          ) : (
            <div className="dir-empty-state">
              <EmptyIcon />
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{t("noRecordsFound", "No Records Found")}</div>
                <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>{t("adjustSearchQuery", "Try adjusting your search query.")}</div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="dir-parent-toolbar">
            <div className="dir-parent-search">
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t("parentSearchPlaceholder", "Search parent name, phone or student...")}
                disabled={isLoading}
              />
            </div>
            <div className="dir-parent-filters">
              <div className="dir-parent-view-toggle" role="tablist" aria-label={t("parentDirectoryView", "Parent directory view")}>
                {[
                  ["grouped", t("grouped", "Grouped")],
                  ["table", t("table", "Table")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`dir-parent-view-btn${viewMode === value ? " active" : ""}`}
                    onClick={() => {
                      setViewMode(value);
                      setPage(1);
                    }}
                    disabled={isLoading}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select className="dir-parent-select" value={formFilter} onChange={(event) => { setFormFilter(event.target.value); setPage(1); }} disabled={isLoading}>
                <option value="all">{t("allForms", "All Forms")}</option>
                {formOptions.map((form) => (
                  <option key={form} value={form}>{form}</option>
                ))}
              </select>
              <select className="dir-parent-select" value={streamFilter} onChange={(event) => { setStreamFilter(event.target.value); setPage(1); }} disabled={isLoading}>
                <option value="all">{t("allStreams", "All Streams")}</option>
                {streamOptions.map((stream) => (
                  <option key={stream} value={stream}>{stream}</option>
                ))}
              </select>
              <select className="dir-parent-select" value={relationshipFilter} onChange={(event) => { setRelationshipFilter(event.target.value); setPage(1); }} disabled={isLoading}>
                <option value="all">{t("allRelationships", "All Relationships")}</option>
                {relationshipOptions.map((relationship) => (
                  <option key={relationship} value={relationship}>{relationship}</option>
                ))}
              </select>
              <button type="button" className="dir-parent-filter-btn" onClick={resetFilters} disabled={isLoading}>
                <FilterIcon /> {t("resetFilters", "Reset")}
              </button>
            </div>
          </div>

          <div className="dir-parent-table-card">
            <div className="dir-parent-table-header">
              <div className="dir-parent-table-title">
                <h2>{t("parentDirectoryTitle", "Parent Directory")}</h2>
                <span>{t("parentDirectoryCount", "{count} parent{suffix}", { count: filtered.length, suffix: filtered.length === 1 ? "" : "s" })}</span>
              </div>
              <div className="dir-parent-bulk-actions">
                <button type="button" className="dir-parent-export-btn" onClick={() => exportParentCsv(filtered)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  {t("parentDirectoryExport", "Export")}
                </button>
                <button type="button" className="dir-parent-sms-btn" onClick={() => {
                  const phones = filtered.map((entry) => entry.phone).filter(Boolean).join(", ");
                  if (phones) window.location.href = `sms:?&addresses=${encodeURIComponent(phones)}`;
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  SMS
                </button>
                <button type="button" className="dir-parent-wa-btn" onClick={() => {
                  const firstPhone = filtered.find((entry) => entry.phone)?.phone || "";
                  if (firstPhone) window.open(`https://wa.me/${String(firstPhone).replace(/[^\d]/g, "")}`, "_blank", "noopener,noreferrer");
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.5 11.5a8.5 8.5 0 1 1-15.2 5.3L4 21l4.3-1.1a8.5 8.5 0 0 1 12.2-8.4z"></path>
                  </svg>
                  {t("whatsapp", "WhatsApp")}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="dir-empty-state">
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{t("parentDirectoryLoading", "Loading All Forms")}</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>{t("parentDirectoryLoadingSub", "Parent records are refreshing from every class so the page no longer depends on the active form.")}</div>
                </div>
              </div>
            ) : pageEntries.length ? (
              <>
                {!tableMode ? (
                  <div className="dir-parent-grouped">
                    {groupedParentEntries.map((group) => (
                      <section key={group.label} className="dir-parent-group">
                        <div className="dir-parent-group-head">
                          <div>
                            <div className="dir-parent-group-title">{group.label}</div>
                            <div className="dir-parent-group-meta">
                              {t("parentGroupMeta", "{count} parent{suffix} on this page", { count: group.records.length, suffix: group.records.length === 1 ? "" : "s" })}
                            </div>
                          </div>
                        </div>
                        <div className="dir-person-grid">
                          {group.records.map((entry) => (
                            <PersonCard
                              key={entry.key}
                              entry={entry}
                              palette={palette}
                              handleCopy={handleCopy}
                              onOpenStudentProfile={onOpenStudentProfile}
                              onOpenTimetable={onOpenTimetable}
                              onEditEntry={onEditEntry ? openEdit : null}
                              onDeleteEntry={onDeleteEntry}
                              canManageEntry={Boolean(onEditEntry || onDeleteEntry)}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="dir-parent-table-wrap">
                    <table className="dir-parent-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t("parentDirectory", "Parents / Guardians")}</th>
                          <th>{t("phone", "Phone")}</th>
                          <th>{t("relationship", "Relationship")}</th>
                          <th>{t("location", "Location")}</th>
                          <th>{t("linkedStudentsLabel", "Linked Students")}</th>
                          <th>{t("actions", "Actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageEntries.map((entry, index) => (
                          <ParentTableRow
                            key={entry.key}
                            entry={entry}
                            rowNumber={(safePage - 1) * perPage + index + 1}
                            onOpenStudentProfile={onOpenStudentProfile}
                            onOpenStudents={openStudents}
                            onEditEntry={openEdit}
                            onDeleteEntry={onDeleteEntry}
                            t={t}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="dir-parent-pagination">
                  <div className="dir-parent-pagination-info">
                    {t("showingRangeParents", "Showing {start} to {end} of {total} parents", {
                      start: (safePage - 1) * perPage + 1,
                      end: Math.min(safePage * perPage, filtered.length),
                      total: filtered.length,
                    })}
                  </div>
                  <div className="dir-parent-pagination-controls">
                    <button type="button" className="dir-parent-page-btn" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage <= 1}>
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`dir-parent-page-btn${pageNumber === safePage ? " active" : ""}`}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button type="button" className="dir-parent-page-btn" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage >= totalPages}>
                      ›
                    </button>
                    <select className="dir-parent-per-page" value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}>
                      {[10, 20, 30].map((value) => (
                        <option key={value} value={value}>{t("perPage", "{count} per page", { count: value })}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div className="dir-empty-state">
                <EmptyIcon />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{t("noParentsFound", "No Parents Found")}</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>{t("noParentsFoundSub", "Try changing the search or filter values.")}</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {studentsEntry ? (
        <div className="dir-modal-backdrop" onClick={closeStudents}>
          <div className="dir-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="dir-modal-head">
              <div>
                <div className="dir-modal-title">{t("parentStudentsTitle", "{name} Students", { name: studentsEntry.name || t("guardian", "Guardian") })}</div>
                <div className="dir-modal-subtitle">
                  {t("parentStudentsSub", "Linked students under this parent / guardian record.")}
                </div>
              </div>
              <button type="button" className="dir-action-btn" onClick={closeStudents}>
                {t("close", "Close")}
              </button>
            </div>
            <div className="dir-student-list" style={{ paddingTop: 0, borderTop: "none" }}>
              {(studentsEntry.students || []).map((student) => (
                <div key={student.key} className="dir-student-item">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{student.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {[student.admissionNo || student.indexNo || "", student.classLabel].filter(Boolean).join(" • ")}
                    </div>
                  </div>
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
                      {t("openProfile", "Open Profile")}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {editingEntry ? (
        <div className="dir-modal-backdrop" onClick={closeEdit}>
          <div className="dir-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="dir-modal-head">
              <div>
                <div className="dir-modal-title">{t("editParentTitle", "Edit Parent")}</div>
                <div className="dir-modal-subtitle">
                  {t("editParentSub", "Update guardian details across {count} linked student{suffix}.", {
                    count: editingEntry.students?.length || 0,
                    suffix: (editingEntry.students?.length || 0) === 1 ? "" : "s",
                  })}
                </div>
              </div>
              <button type="button" className="dir-action-btn" onClick={closeEdit}>
                {t("close", "Close")}
              </button>
            </div>
            <form onSubmit={submitEdit} className="dir-modal-form">
              <label className="dir-modal-field">
                <span>{t("nameLabel", "Name")}</span>
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                  className="dir-search-input"
                  placeholder={t("guardianName", "Guardian name")}
                />
              </label>
              <label className="dir-modal-field">
                <span>{t("phone", "Phone")}</span>
                <input
                  value={editForm.phone}
                  onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                  className="dir-search-input"
                  placeholder={t("guardianPhone", "Guardian phone")}
                />
              </label>
              <label className="dir-modal-field">
                <span>{t("address", "Address")}</span>
                <textarea
                  value={editForm.address}
                  onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))}
                  className="dir-search-input"
                  placeholder={t("address", "Address")}
                  rows={3}
                  style={{ resize: "vertical", minHeight: 90 }}
                />
              </label>
              <div className="dir-modal-actions">
                <button type="button" className="dir-secondary-btn" onClick={closeEdit} disabled={saving}>
                  {t("cancel", "Cancel")}
                </button>
                <button type="submit" className="dir-primary-btn" disabled={saving}>
                  {saving ? t("saving", "Saving...") : t("saveChanges", "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
