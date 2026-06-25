import { useMemo, useState } from "react";
import { displayFontStack, premiumFontStack } from "../utils/designSystem";
import { useViewport } from "../utils/useViewport";

function initialsOf(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function StatCard({ label, value, note }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "14px 16px",
        display: "grid",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#0f172a", lineHeight: 1.1 }}>{value}</div>
      {note ? <div style={{ fontSize: 12, color: "#94a3b8" }}>{note}</div> : null}
    </div>
  );
}

function Chip({ children, tone = "slate" }) {
  const tones = {
    slate: { bg: "#f1f5f9", fg: "#334155", bd: "#e2e8f0" },
    blue: { bg: "#eff6ff", fg: "#1d4ed8", bd: "#dbeafe" },
    teal: { bg: "#ecfdf5", fg: "#0f766e", bd: "#d1fae5" },
    amber: { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
  };
  const c = tones[tone] || tones.slate;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 6,
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.bd}`,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function TeacherCard({ teacher, canManage, onManage }) {
  const waPhone = String(teacher.phone || "").replace(/[^\d]/g, "");
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: teacher.active ? "#0f2d6e" : "#94a3b8",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 15,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initialsOf(teacher.name)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teacher.name}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>@{teacher.username || "—"}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Chip tone={teacher.role === "academic" ? "blue" : "slate"}>
          {teacher.role === "academic" ? "Academic staff" : "Teacher"}
        </Chip>
        <Chip tone={teacher.active ? "teal" : "amber"}>{teacher.active ? "Active" : "Inactive"}</Chip>
        {teacher.classTeacherOf ? <Chip tone="amber">Class teacher · {teacher.classTeacherOf}</Chip> : null}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Subjects ({teacher.subjects.length})
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {teacher.subjects.length ? (
            teacher.subjects.map((s) => <Chip key={s} tone="blue">{s}</Chip>)
          ) : (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>No subjects from the timetable yet.</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#475569" }}>
        <span><b style={{ color: "#0f172a", fontWeight: 600 }}>{teacher.classCount}</b> class{teacher.classCount === 1 ? "" : "es"}</span>
        <span><b style={{ color: "#0f172a", fontWeight: 600 }}>{teacher.periods}</b> period{teacher.periods === 1 ? "" : "s"}/week</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingTop: 4, borderTop: "1px solid #f1f5f9" }}>
        {teacher.phone ? (
          <>
            <a href={`tel:${teacher.phone}`} style={linkBtn}>Call</a>
            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer" style={linkBtn}>WhatsApp</a>
          </>
        ) : (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>No phone on file</span>
        )}
        {teacher.email ? <a href={`mailto:${teacher.email}`} style={linkBtn}>Email</a> : null}
        {canManage ? (
          <button type="button" onClick={() => onManage?.(teacher)} style={{ ...linkBtn, marginLeft: "auto", border: "1px solid #0f2d6e", color: "#0f2d6e", cursor: "pointer", background: "#fff" }}>
            Manage
          </button>
        ) : null}
      </div>
    </div>
  );
}

const linkBtn = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#334155",
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

export function TeachersPage({ entries = [], canManage = false, onManageTeacher, onOpenTimetable }) {
  const { isMobile } = useViewport();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const stats = useMemo(
    () => ({
      total: entries.length,
      active: entries.filter((t) => t.active).length,
      academic: entries.filter((t) => t.role === "academic").length,
      periods: entries.reduce((sum, t) => sum + (t.periods || 0), 0),
    }),
    [entries],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((t) => {
      if (statusFilter === "active" && !t.active) return false;
      if (statusFilter === "inactive" && t.active) return false;
      if (!needle) return true;
      const haystack = [t.name, t.username, t.email, ...(t.subjects || [])].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [entries, query, statusFilter]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: "#f8fafc",
        padding: isMobile ? "12px 10px 28px" : "20px 24px 32px",
        fontFamily: premiumFontStack,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 14 }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: isMobile ? 16 : "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontFamily: displayFontStack, fontSize: isMobile ? 22 : 26, fontWeight: 500, color: "#0f172a", margin: 0 }}>
              Teachers
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
              Teaching staff, their subjects and class load. Accounts are created and managed in the Account page.
            </p>
          </div>
          {onOpenTimetable ? (
            <button
              type="button"
              onClick={onOpenTimetable}
              style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#334155", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Open Timetable
            </button>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
          <StatCard label="Teachers" value={stats.total} note="Total teaching staff" />
          <StatCard label="Active" value={stats.active} note="Currently enabled" />
          <StatCard label="Academic staff" value={stats.academic} note="Academic role accounts" />
          <StatCard label="Periods / week" value={stats.periods} note="Across the timetable" />
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: isMobile ? 12 : 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teacher name, username or subject..."
            style={{ flex: 1, minWidth: 200, padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600, color: "#334155", background: "#fff", cursor: "pointer" }}
          >
            <option value="all">All status</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <span style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>
            {filtered.length} of {entries.length}
          </span>
        </div>

        {filtered.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 12,
            }}
          >
            {filtered.map((teacher) => (
              <TeacherCard key={teacher.key} teacher={teacher} canManage={canManage} onManage={onManageTeacher} />
            ))}
          </div>
        ) : (
          <div
            style={{
              background: "#ffffff",
              border: "1px dashed #cbd5e1",
              borderRadius: 12,
              padding: "48px 20px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>No teachers found</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {entries.length ? "Try a different search or filter." : "Add teacher accounts from the Account page."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
