import { useMemo, useState } from "react";
import { CLASS_FORMS } from "../hooks/useClasses";
import { premiumFontStack } from "../utils/designSystem";
import { DEFAULT_SUBJECTS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";

function normalizeSubjectName(value) {
  return String(value || "").trim();
}

function getSubjectType(subjectName, metadataList = []) {
  const lower = normalizeSubjectName(subjectName).toLowerCase();
  const entry = metadataList.find(
    (item) => normalizeSubjectName(item?.name || item?.subject || "").toLowerCase() === lower
  );
  return entry?.type === "optional" ? "optional" : "compulsory";
}

function getClassLabel(cls = {}) {
  return [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim();
}

function buildCatalogue(classes) {
  const map = new Map();

  classes.forEach((cls) => {
    const subjects = Array.isArray(cls.subjects) ? cls.subjects : DEFAULT_SUBJECTS;
    const metadata = Array.isArray(cls.subject_metadata) ? cls.subject_metadata : [];

    subjects.forEach((subject) => {
      const name = normalizeSubjectName(subject);
      if (!name) return;
      const key = name.toLowerCase();
      const type = getSubjectType(name, metadata);

      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          type,
          classes: [],
          forms: new Set(),
          typeCounts: { compulsory: 0, optional: 0 },
        });
      }

      const entry = map.get(key);
      entry.typeCounts[type] += 1;
      if (entry.typeCounts.optional > entry.typeCounts.compulsory) {
        entry.type = "optional";
      }
      entry.classes.push({
        id: cls.id,
        label: getClassLabel(cls),
        form: cls.form || "",
        year: cls.year || "",
        stream: cls.stream || "",
        type,
      });
      if (cls.form) {
        entry.forms.add(cls.form);
      }
    });
  });

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      forms: entry.forms,
      hasMixedTypes: entry.typeCounts.compulsory > 0 && entry.typeCounts.optional > 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}

function TypeBadge({ type }) {
  const isOptional = type === "optional";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.04em",
        borderRadius: 999,
        padding: "4px 9px",
        background: isOptional ? "#fef3c7" : "#eff6ff",
        color: isOptional ? "#92400e" : "#1d4ed8",
        textTransform: "uppercase",
      }}
    >
      {isOptional ? "Optional" : "Compulsory"}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(226,232,240,0.92)",
        background: "linear-gradient(180deg,#ffffff,#f8fbff)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginTop: 4 }}>{label}</div>
      {sub ? <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: 600 }}>{sub}</div> : null}
    </div>
  );
}

function ScopeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? "none" : "1px solid rgba(203,213,225,0.9)",
        borderRadius: 999,
        padding: "8px 12px",
        background: active ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#ffffff",
        color: active ? "#ffffff" : "#475569",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: active ? "0 8px 20px rgba(37,99,235,0.2)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function SubjectRow({
  entry,
  expanded,
  onToggle,
  onNavigate,
  canManage,
  totalClasses,
  onApplyMissing,
  onSyncType,
  busyKey,
}) {
  const missingCount = Math.max(totalClasses - entry.classes.length, 0);
  const teachingTypeLabel =
    entry.typeCounts.optional > entry.typeCounts.compulsory ? "optional" : "compulsory";

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          background: expanded ? "linear-gradient(135deg,#edf4ff,#f5f9ff)" : "transparent",
          cursor: "pointer",
          transition: "background 0.15s",
          borderBottom: expanded ? "none" : "1px solid rgba(226,232,240,0.6)",
        }}
      >
        <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                color: expanded ? "#2563eb" : "#94a3b8",
                transition: "transform 0.15s",
                display: "inline-block",
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              {">"}
            </span>
            {entry.name}
          </span>
        </td>
        <td style={{ padding: "14px 12px" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <TypeBadge type={entry.type} />
            {entry.hasMixedTypes ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#b45309",
                  background: "#fff7ed",
                  borderRadius: 999,
                  padding: "4px 8px",
                  textTransform: "uppercase",
                }}
              >
                Mixed
              </span>
            ) : null}
          </div>
        </td>
        {CLASS_FORMS.map((form) => (
          <td key={form} style={{ padding: "14px 12px", textAlign: "center" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 8,
                background: entry.forms.has(form) ? "#d1fae5" : "#f1f5f9",
                color: entry.forms.has(form) ? "#059669" : "#cbd5e1",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {entry.forms.has(form) ? "OK" : "-"}
            </span>
          </td>
        ))}
        <td style={{ padding: "14px 16px", textAlign: "right" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 38,
              height: 24,
              padding: "0 8px",
              borderRadius: 999,
              background: expanded ? "rgba(37,99,235,0.12)" : "#f1f5f9",
              color: expanded ? "#2563eb" : "#64748b",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {entry.classes.length}
          </span>
        </td>
      </tr>

      {expanded ? (
        <tr style={{ borderBottom: "1px solid rgba(226,232,240,0.6)" }}>
          <td
            colSpan={CLASS_FORMS.length + 3}
            style={{ padding: "0 16px 16px 40px", background: "linear-gradient(135deg,#edf4ff,#f5f9ff)" }}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginTop: 2 }}>
                Classes teaching {entry.name}:
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {entry.classes
                  .slice()
                  .sort((left, right) => {
                    const formOrder = CLASS_FORMS.indexOf(left.form) - CLASS_FORMS.indexOf(right.form);
                    if (formOrder !== 0) return formOrder;
                    return left.label.localeCompare(right.label, "en");
                  })
                  .map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
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
                      <span style={{ color: "#94a3b8", marginLeft: 6, fontWeight: 700 }}>
                        {cls.type}
                      </span>
                    </button>
                  ))}
              </div>

              {canManage ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    disabled={busyKey === `missing-${entry.key}` || missingCount === 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onApplyMissing(entry);
                    }}
                    style={{
                      border: "1px solid rgba(37,99,235,0.22)",
                      borderRadius: 10,
                      padding: "7px 12px",
                      background: "#ffffff",
                      color: "#1d4ed8",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: missingCount === 0 ? "not-allowed" : "pointer",
                      opacity: missingCount === 0 ? 0.55 : 1,
                    }}
                  >
                    {busyKey === `missing-${entry.key}`
                      ? "Applying..."
                      : missingCount > 0
                      ? `Add to ${missingCount} missing class${missingCount === 1 ? "" : "es"}`
                      : "Already in all visible classes"}
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `sync-${entry.key}-compulsory`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSyncType(entry, "compulsory");
                    }}
                    style={{
                      border: "1px solid rgba(37,99,235,0.18)",
                      borderRadius: 10,
                      padding: "7px 12px",
                      background: teachingTypeLabel === "compulsory" ? "#eff6ff" : "#ffffff",
                      color: "#1d4ed8",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {busyKey === `sync-${entry.key}-compulsory` ? "Saving..." : "Sync compulsory"}
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `sync-${entry.key}-optional`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSyncType(entry, "optional");
                    }}
                    style={{
                      border: "1px solid rgba(180,83,9,0.18)",
                      borderRadius: 10,
                      padding: "7px 12px",
                      background: teachingTypeLabel === "optional" ? "#fff7ed" : "#ffffff",
                      color: "#b45309",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {busyKey === `sync-${entry.key}-optional` ? "Saving..." : "Sync optional"}
                  </button>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function SubjectsPage({
  classes = [],
  canManage = false,
  onNavigateToClass,
  onApplySubjectMaster,
}) {
  const { isMobile, isXs } = useViewport();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterForm, setFilterForm] = useState("all");
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [subjectDraftType, setSubjectDraftType] = useState("compulsory");
  const [applyScope, setApplyScope] = useState("all");
  const [applyYear, setApplyYear] = useState("all");
  const [applyForms, setApplyForms] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [actionError, setActionError] = useState("");
  const [masterBusy, setMasterBusy] = useState(false);
  const [rowBusyKey, setRowBusyKey] = useState("");

  const years = useMemo(() => {
    const values = new Set(classes.map((cls) => String(cls.year || "").trim()).filter(Boolean));
    return Array.from(values).sort((left, right) => Number(right) - Number(left));
  }, [classes]);

  const catalogue = useMemo(() => buildCatalogue(classes), [classes]);

  const filtered = useMemo(() => {
    let list = catalogue;
    if (filterType !== "all") list = list.filter((entry) => entry.type === filterType);
    if (filterForm !== "all") list = list.filter((entry) => entry.forms.has(filterForm));
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter((entry) => entry.name.toLowerCase().includes(query));
    }
    return list;
  }, [catalogue, filterForm, filterType, search]);

  const stats = useMemo(() => ({
    total: catalogue.length,
    compulsory: catalogue.filter((entry) => entry.type === "compulsory").length,
    optional: catalogue.filter((entry) => entry.type === "optional").length,
    mixed: catalogue.filter((entry) => entry.hasMixedTypes).length,
  }), [catalogue]);

  const targetClasses = useMemo(() => {
    return classes
      .filter((cls) => (applyYear === "all" ? true : String(cls.year || "") === applyYear))
      .filter((cls) => (applyForms.length ? applyForms.includes(cls.form) : true))
      .sort((left, right) => getClassLabel(left).localeCompare(getClassLabel(right), "en"));
  }, [applyForms, applyYear, classes]);

  const selectedTargetIds = useMemo(() => {
    if (applyScope === "all") {
      return classes.map((cls) => cls.id);
    }
    if (applyScope === "forms") {
      if (!applyForms.length) return [];
      return targetClasses.map((cls) => cls.id);
    }
    return targetClasses
      .filter((cls) => selectedClassIds.includes(cls.id))
      .map((cls) => cls.id);
  }, [applyScope, classes, selectedClassIds, targetClasses]);

  const selectedTargetCount = selectedTargetIds.length;

  const toggleForm = (form) => {
    setApplyForms((current) =>
      current.includes(form) ? current.filter((entry) => entry !== form) : [...current, form]
    );
  };

  const toggleClassSelection = (classId) => {
    setSelectedClassIds((current) =>
      current.includes(classId) ? current.filter((entry) => entry !== classId) : [...current, classId]
    );
  };

  const handleApplyMaster = async () => {
    const normalizedName = normalizeSubjectName(subjectDraft);
    if (!normalizedName) {
      setActionError("Subject name is required");
      return;
    }
    if (applyScope === "forms" && applyForms.length === 0) {
      setActionError("Choose at least one form");
      return;
    }
    if (applyScope === "classes" && selectedTargetCount === 0) {
      setActionError("Choose at least one class");
      return;
    }
    setActionError("");
    setMasterBusy(true);
    try {
      await onApplySubjectMaster?.({
        classIds: selectedTargetIds,
        subjectName: normalizedName,
        subjectType: subjectDraftType,
      });
      setSubjectDraft("");
      if (applyScope === "classes") {
        setSelectedClassIds([]);
      }
    } catch (error) {
      setActionError(error.message);
    } finally {
      setMasterBusy(false);
    }
  };

  const handleApplyMissing = async (entry) => {
    const existingIds = new Set(entry.classes.map((cls) => cls.id));
    const missingIds = classes.filter((cls) => !existingIds.has(cls.id)).map((cls) => cls.id);
    if (!missingIds.length) return;
    setRowBusyKey(`missing-${entry.key}`);
    setActionError("");
    try {
      await onApplySubjectMaster?.({
        classIds: missingIds,
        subjectName: entry.name,
        subjectType: entry.type,
      });
    } catch (error) {
      setActionError(error.message);
    } finally {
      setRowBusyKey("");
    }
  };

  const handleSyncType = async (entry, nextType) => {
    const targetIds = entry.classes.map((cls) => cls.id);
    if (!targetIds.length) return;
    const key = `sync-${entry.key}-${nextType}`;
    setRowBusyKey(key);
    setActionError("");
    try {
      await onApplySubjectMaster?.({
        classIds: targetIds,
        subjectName: entry.name,
        subjectType: nextType,
      });
    } catch (error) {
      setActionError(error.message);
    } finally {
      setRowBusyKey("");
    }
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
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: isMobile ? 16 : 24 }}>
        <div>
          <h1 style={{ fontSize: isXs ? 20 : 26, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Subjects
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "6px 0 0", fontWeight: 600 }}>
            School-wide subject master with bulk rollout to forms and classes.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
          <StatCard label="Total subjects" value={stats.total} sub="unique subject names" />
          <StatCard label="Compulsory" value={stats.compulsory} sub="dominant type across classes" />
          <StatCard label="Optional" value={stats.optional} sub="elective coverage" />
          <StatCard label="Mixed setups" value={stats.mixed} sub="type inconsistencies to resolve" />
        </div>

        {canManage ? (
          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(226,232,240,0.92)",
              background: "linear-gradient(180deg,#ffffff,#f8fbff)",
              boxShadow: "0 14px 40px rgba(15,23,42,0.07)",
              padding: isMobile ? "16px 14px" : "18px 20px",
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Subject master actions</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 600 }}>
                Add a subject once, choose its type, then apply it to all classes, selected forms, or hand-picked classes.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(220px,1.2fr) 180px auto", gap: 10 }}>
              <input
                type="text"
                placeholder="Subject name"
                value={subjectDraft}
                onChange={(event) => setSubjectDraft(event.target.value)}
                style={{
                  border: "1px solid rgba(226,232,240,0.92)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0f172a",
                  background: "#f8faff",
                  outline: "none",
                }}
              />
              <select
                value={subjectDraftType}
                onChange={(event) => setSubjectDraftType(event.target.value)}
                style={{
                  border: "1px solid rgba(226,232,240,0.92)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#475569",
                  background: "#f8faff",
                }}
              >
                <option value="compulsory">Compulsory</option>
                <option value="optional">Optional</option>
              </select>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ScopeButton active={applyScope === "all"} onClick={() => setApplyScope("all")}>
                  All classes
                </ScopeButton>
                <ScopeButton active={applyScope === "forms"} onClick={() => setApplyScope("forms")}>
                  By form
                </ScopeButton>
                <ScopeButton active={applyScope === "classes"} onClick={() => setApplyScope("classes")}>
                  Pick classes
                </ScopeButton>
              </div>
            </div>

            {applyScope !== "all" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    value={applyYear}
                    onChange={(event) => setApplyYear(event.target.value)}
                    style={{
                      border: "1px solid rgba(226,232,240,0.92)",
                      borderRadius: 12,
                      padding: "9px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      background: "#ffffff",
                    }}
                  >
                    <option value="all">All years</option>
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {CLASS_FORMS.map((form) => (
                      <button
                        key={form}
                        type="button"
                        onClick={() => toggleForm(form)}
                        style={{
                          border: applyForms.includes(form) ? "none" : "1px solid rgba(203,213,225,0.9)",
                          borderRadius: 999,
                          padding: "7px 12px",
                          background: applyForms.includes(form) ? "#e0e7ff" : "#ffffff",
                          color: applyForms.includes(form) ? "#3730a3" : "#475569",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {form}
                      </button>
                    ))}
                  </div>
                </div>

                {applyScope === "classes" ? (
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(226,232,240,0.92)",
                      background: "#ffffff",
                      padding: "12px",
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {targetClasses.length ? (
                      targetClasses.map((cls) => {
                        const active = selectedClassIds.includes(cls.id);
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => toggleClassSelection(cls.id)}
                            style={{
                              border: active ? "none" : "1px solid rgba(203,213,225,0.9)",
                              borderRadius: 10,
                              padding: "7px 10px",
                              background: active ? "#dbeafe" : "#f8fafc",
                              color: active ? "#1d4ed8" : "#475569",
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {getClassLabel(cls)}
                          </button>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                        No classes match the current year and form filters.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={handleApplyMaster}
                disabled={masterBusy}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "11px 16px",
                  background: "#003366",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {masterBusy ? "Applying..." : `Apply to ${selectedTargetCount} class${selectedTargetCount === 1 ? "" : "es"}`}
              </button>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                Target scope: {applyScope === "all" ? "all visible classes" : applyScope === "forms" ? "filtered forms" : "selected classes"}
              </div>
            </div>

            {actionError ? (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid #fecaca",
                  background: "#fff1f2",
                  color: "#b91c1c",
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {actionError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: 8,
            borderRadius: 18,
            border: "1px solid rgba(226,232,240,0.92)",
            background: "#ffffff",
            boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
            padding: isMobile ? "12px 14px" : "14px 18px",
          }}
        >
          <input
            type="text"
            placeholder="Search subjects..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
              onChange={(event) => setFilterType(event.target.value)}
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
              <option value="all">All types</option>
              <option value="compulsory">Compulsory</option>
              <option value="optional">Optional</option>
            </select>
            <select
              value={filterForm}
              onChange={(event) => setFilterForm(event.target.value)}
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
              <option value="all">All forms</option>
              {CLASS_FORMS.map((form) => (
                <option key={form} value={form}>{form}</option>
              ))}
            </select>
            {(search || filterType !== "all" || filterForm !== "all") ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterType("all");
                  setFilterForm("all");
                }}
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
            ) : null}
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginLeft: "auto" }}>
              {filtered.length} of {catalogue.length}
            </span>
          </div>
        </div>

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
            {catalogue.length === 0 ? "No subjects found. Add subjects in class Settings." : "No subjects match your filters."}
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
                minWidth: 540,
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
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Subject
                    </th>
                    <th style={{ padding: "12px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Type
                    </th>
                    {CLASS_FORMS.map((form) => (
                      <th
                        key={form}
                        style={{ padding: "12px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap" }}
                      >
                        {form.replace("Form ", "Frm ")}
                      </th>
                    ))}
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Classes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <SubjectRow
                      key={entry.key}
                      entry={entry}
                      expanded={expandedSubject === entry.key}
                      onToggle={() => setExpandedSubject((current) => (current === entry.key ? null : entry.key))}
                      onNavigate={onNavigateToClass}
                      canManage={canManage}
                      totalClasses={classes.length}
                      onApplyMissing={handleApplyMissing}
                      onSyncType={handleSyncType}
                      busyKey={rowBusyKey}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontWeight: 600 }}>
          The catalogue is built from visible classes. Use the master actions above to roll out subjects consistently, then use class Settings only for exceptions.
        </p>
      </div>
    </div>
  );
}
