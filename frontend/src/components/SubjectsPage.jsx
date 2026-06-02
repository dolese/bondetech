import { useMemo, useState } from "react";
import { CLASS_FORMS } from "../hooks/useClasses";
import { premiumFontStack } from "../utils/designSystem";
import { DEFAULT_SUBJECTS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";

function getSubjectType(subjectName, metadataList = []) {
  const lower = subjectName.toLowerCase();
  const entry = metadataList.find(
    (m) => String(m?.name || m?.subject || "").toLowerCase() === lower
  );
  return entry?.type === "optional" ? "optional" : "compulsory";
}

function buildCatalogue(classes) {
  const map = new Map();

  classes.forEach((cls) => {
    const subjects = Array.isArray(cls.subjects) ? cls.subjects : DEFAULT_SUBJECTS;
    const meta = Array.isArray(cls.subject_metadata) ? cls.subject_metadata : [];

    subjects.forEach((subject) => {
      const name = String(subject || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      const type = getSubjectType(name, meta);

      if (!map.has(key)) {
        map.set(key, { name, type, classes: [], forms: new Set() });
      }
      const entry = map.get(key);
      if (type === "optional") entry.type = "optional";
      entry.classes.push({
        id: cls.id,
        label: [cls.form, cls.stream, cls.year].filter(Boolean).join(" "),
        form: cls.form || "",
        year: cls.year || "",
      });
      if (cls.form) entry.forms.add(cls.form);
    });
  });

  return Array.from(map.values())
    .map((entry) => ({ ...entry, forms: entry.forms }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

function TypeBadge({ type }) {
  const isOptional = type === "optional";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.3,
        borderRadius: 6,
        padding: "3px 8px",
        background: isOptional ? "#fef3c7" : "#eff6ff",
        color: isOptional ? "#92400e" : "#1d4ed8",
      }}
    >
      {isOptional ? "OPTIONAL" : "COMPULSORY"}
    </span>
  );
}

function FormTick({ present }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: 8,
        background: present ? "#d1fae5" : "#f1f5f9",
        color: present ? "#059669" : "#cbd5e1",
        fontSize: present ? 14 : 16,
        fontWeight: 900,
      }}
    >
      {present ? "✓" : "—"}
    </span>
  );
}

function SubjectRow({ entry, expanded, onToggle, onNavigate }) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <tr
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onToggle}
        style={{
          background: expanded
            ? "linear-gradient(135deg,#edf4ff,#f5f9ff)"
            : hovered
            ? "#f8fbff"
            : "transparent",
          cursor: "pointer",
          transition: "background 0.15s",
          borderBottom: expanded ? "none" : "1px solid rgba(226,232,240,0.6)",
        }}
      >
        <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                color: expanded ? "#2563eb" : "#94a3b8",
                transition: "transform 0.15s",
                display: "inline-block",
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              ▶
            </span>
            {entry.name}
          </span>
        </td>
        <td style={{ padding: "14px 12px" }}>
          <TypeBadge type={entry.type} />
        </td>
        {CLASS_FORMS.map((form) => (
          <td key={form} style={{ padding: "14px 12px", textAlign: "center" }}>
            <FormTick present={entry.forms.has(form)} />
          </td>
        ))}
        <td style={{ padding: "14px 16px", textAlign: "right" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              height: 24,
              padding: "0 8px",
              borderRadius: 999,
              background: expanded ? "rgba(37,99,235,0.12)" : "#f1f5f9",
              color: expanded ? "#2563eb" : "#64748b",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {entry.classes.length}
          </span>
        </td>
      </tr>

      {expanded && (
        <tr style={{ borderBottom: "1px solid rgba(226,232,240,0.6)" }}>
          <td
            colSpan={CLASS_FORMS.length + 3}
            style={{ padding: "0 16px 14px 40px", background: "linear-gradient(135deg,#edf4ff,#f5f9ff)" }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
              Classes teaching {entry.name}:
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {entry.classes
                .sort((a, b) => {
                  const formOrder = CLASS_FORMS.indexOf(a.form) - CLASS_FORMS.indexOf(b.form);
                  if (formOrder !== 0) return formOrder;
                  return a.label.localeCompare(b.label, "en");
                })
                .map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(cls.id);
                    }}
                    style={{
                      border: "1px solid rgba(37,99,235,0.25)",
                      borderRadius: 10,
                      padding: "5px 12px",
                      background: "#fff",
                      color: "#2563eb",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {cls.label}
                  </button>
                ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function SubjectsPage({ classes = [], onNavigateToClass }) {
  const { isMobile, isXs } = useViewport();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterForm, setFilterForm] = useState("all");
  const [expandedSubject, setExpandedSubject] = useState(null);

  const catalogue = useMemo(() => buildCatalogue(classes), [classes]);

  const filtered = useMemo(() => {
    let list = catalogue;
    if (filterType !== "all") list = list.filter((e) => e.type === filterType);
    if (filterForm !== "all") list = list.filter((e) => e.forms.has(filterForm));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [catalogue, filterType, filterForm, search]);

  const stats = useMemo(() => ({
    total: catalogue.length,
    compulsory: catalogue.filter((e) => e.type === "compulsory").length,
    optional: catalogue.filter((e) => e.type === "optional").length,
    classes: classes.length,
  }), [catalogue, classes]);

  const handleToggle = (name) => {
    setExpandedSubject((prev) => (prev === name ? null : name));
  };

  const handleNavigate = (classId) => {
    onNavigateToClass?.(classId);
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: isMobile ? "14px 12px 28px" : "28px 28px 40px",
        fontFamily: premiumFontStack,
        background: "#f1f5fb",
        minHeight: 0,
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: isMobile ? 16 : 24 }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: isXs ? 20 : 26, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Subjects
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "6px 0 0", fontWeight: 600 }}>
            School-wide subject catalogue aggregated from all classes
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
          {[
            { label: "Total Subjects", value: stats.total, sub: "unique subjects" },
            { label: "Compulsory", value: stats.compulsory, sub: "required for all" },
            { label: "Optional", value: stats.optional, sub: "elective subjects" },
            { label: "Classes", value: stats.classes, sub: "classes tracked" },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              style={{
                borderRadius: 20,
                border: "1px solid rgba(226,232,240,0.92)",
                background: "linear-gradient(180deg,#ffffff,#f8fbff)",
                boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
                padding: isMobile ? "14px 16px" : "18px 22px",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>{value}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginTop: 4 }}>{label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: 600 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(226,232,240,0.92)",
            background: "#ffffff",
            boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
            padding: isMobile ? "12px 14px" : "14px 18px",
            display: "grid",
            gap: 8,
          }}
        >
          <input
            type="text"
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "1px solid rgba(226,232,240,0.92)",
              borderRadius: 12,
              padding: "9px 14px",
              fontSize: 13,
              fontWeight: 600,
              color: "#0f172a",
              outline: "none",
              background: "#f8faff",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                flex: isXs ? "1 1 calc(50% - 4px)" : undefined,
                border: "1px solid rgba(226,232,240,0.92)",
                borderRadius: 12,
                padding: "9px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: "#475569",
                background: "#f8faff",
                cursor: "pointer",
              }}
            >
              <option value="all">All Types</option>
              <option value="compulsory">Compulsory</option>
              <option value="optional">Optional</option>
            </select>
            <select
              value={filterForm}
              onChange={(e) => setFilterForm(e.target.value)}
              style={{
                flex: isXs ? "1 1 calc(50% - 4px)" : undefined,
                border: "1px solid rgba(226,232,240,0.92)",
                borderRadius: 12,
                padding: "9px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: "#475569",
                background: "#f8faff",
                cursor: "pointer",
              }}
            >
              <option value="all">All Forms</option>
              {CLASS_FORMS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {(search || filterType !== "all" || filterForm !== "all") && (
              <button
                type="button"
                onClick={() => { setSearch(""); setFilterType("all"); setFilterForm("all"); }}
                style={{
                  border: "1px solid rgba(226,232,240,0.92)",
                  borderRadius: 12,
                  padding: "9px 14px",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#64748b",
                  background: "#f8faff",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginLeft: "auto" }}>
              {filtered.length} of {catalogue.length}
            </span>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div
            style={{
              borderRadius: 20,
              border: "1px solid rgba(226,232,240,0.92)",
              background: "#ffffff",
              padding: "48px 24px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {catalogue.length === 0
              ? "No subjects found. Add subjects in class Settings."
              : "No subjects match your filters."}
          </div>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div
            style={{
              borderRadius: 20,
              border: "1px solid rgba(226,232,240,0.92)",
              background: "#ffffff",
              boxShadow: "0 14px 40px rgba(15,23,42,0.07)",
              overflow: "hidden",
              minWidth: 480,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "linear-gradient(180deg,#f8faff,#f1f5fe)",
                    borderBottom: "1px solid rgba(226,232,240,0.92)",
                  }}
                >
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: 1.2, textTransform: "uppercase" }}>
                    Subject
                  </th>
                  <th style={{ padding: "12px 12px", textAlign: "left", fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: 1.2, textTransform: "uppercase" }}>
                    Type
                  </th>
                  {CLASS_FORMS.map((form) => (
                    <th
                      key={form}
                      style={{ padding: "12px 12px", textAlign: "center", fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: 1.2, textTransform: "uppercase", whiteSpace: "nowrap" }}
                    >
                      {form.replace("Form ", "Frm ")}
                    </th>
                  ))}
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: 1.2, textTransform: "uppercase" }}>
                    Classes
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <SubjectRow
                    key={entry.name}
                    entry={entry}
                    expanded={expandedSubject === entry.name}
                    onToggle={() => handleToggle(entry.name)}
                    onNavigate={handleNavigate}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </div>{/* end scroll wrapper */}
        )}

        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontWeight: 600 }}>
          Subjects are managed per-class in <strong>Settings</strong>. Click any row to see which classes teach that subject.
        </p>
      </div>
    </div>
  );
}
