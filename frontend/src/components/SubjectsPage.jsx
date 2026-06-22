import { useMemo, useState } from "react";
import { CLASS_FORMS } from "../hooks/useClasses";
import { displayFontStack, fieldStyle, premiumFontStack } from "../utils/designSystem";
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
        map.set(key, { key, name, type, classes: [], forms: new Set(), typeCounts: { compulsory: 0, optional: 0 } });
      }
      const entry = map.get(key);
      entry.typeCounts[type] += 1;
      if (entry.typeCounts.optional > entry.typeCounts.compulsory) entry.type = "optional";
      entry.classes.push({ id: cls.id, label: getClassLabel(cls), form: cls.form || "", year: cls.year || "", stream: cls.stream || "", type });
      if (cls.form) entry.forms.add(cls.form);
    });
  });
  return Array.from(map.values())
    .map((entry) => ({ ...entry, forms: entry.forms, hasMixedTypes: entry.typeCounts.compulsory > 0 && entry.typeCounts.optional > 0 }))
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}

function TypeBadge({ type }) {
  const opt = type === "optional";
  return (
    <span style={{ fontSize: 11, fontWeight: 500, borderRadius: 4, padding: "2px 7px", background: opt ? "#fef3c7" : "#eff6ff", color: opt ? "#92400e" : "#1d4ed8" }}>
      {opt ? "Optional" : "Compulsory"}
    </span>
  );
}

function SubjectRow({ entry, expanded, onToggle, onNavigate, canManage, totalClasses, onApplyMissing, onSyncType, busyKey }) {
  const missingCount = Math.max(totalClasses - entry.classes.length, 0);
  const teachingTypeLabel = entry.typeCounts.optional > entry.typeCounts.compulsory ? "optional" : "compulsory";

  return (
    <>
      <tr onClick={onToggle} style={{ background: expanded ? "#f8fafc" : "transparent", cursor: "pointer", borderBottom: expanded ? "none" : "1px solid #f1f5f9" }}>
        <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: expanded ? "#0f2d6e" : "#94a3b8", transition: "transform 0.15s", display: "inline-block", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>{">"}</span>
            {entry.name}
          </span>
        </td>
        <td style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <TypeBadge type={entry.type} />
            {entry.hasMixedTypes ? <span style={{ fontSize: 10, fontWeight: 500, color: "#b45309", background: "#fff7ed", borderRadius: 4, padding: "2px 6px" }}>Mixed</span> : null}
          </div>
        </td>
        {CLASS_FORMS.map((form) => (
          <td key={form} style={{ padding: "10px 8px", textAlign: "center" }}>
            {entry.forms.has(form) ? (
              <span style={{ color: "#10b981", fontSize: 13 }}>&#10003;</span>
            ) : (
              <span style={{ color: "#e2e8f0", fontSize: 12 }}>-</span>
            )}
          </td>
        ))}
        <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, fontWeight: 500, color: expanded ? "#0f2d6e" : "#64748b" }}>
          {entry.classes.length}
        </td>
      </tr>

      {expanded ? (
        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
          <td colSpan={CLASS_FORMS.length + 3} style={{ padding: "0 14px 14px 36px", background: "#f8fafc" }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Classes teaching {entry.name}:
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {entry.classes.slice().sort((a, b) => {
                  const fo = CLASS_FORMS.indexOf(a.form) - CLASS_FORMS.indexOf(b.form);
                  return fo !== 0 ? fo : a.label.localeCompare(b.label, "en");
                }).map((cls) => (
                  <button key={cls.id} type="button" onClick={(e) => { e.stopPropagation(); onNavigate(cls.id); }} style={{
                    border: "1px solid #dbeafe", borderRadius: 6, padding: "4px 10px", background: "#fff",
                    color: "#0f2d6e", fontSize: 12, fontWeight: 500, cursor: "pointer",
                  }}>
                    {cls.label} <span style={{ color: "#94a3b8", fontSize: 11 }}>{cls.type}</span>
                  </button>
                ))}
              </div>
              {canManage ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="button" disabled={busyKey === `missing-${entry.key}` || missingCount === 0} onClick={(e) => { e.stopPropagation(); onApplyMissing(entry); }} style={{
                    border: "1px solid #dbeafe", borderRadius: 6, padding: "5px 10px", background: "#fff",
                    color: "#1d4ed8", fontSize: 12, fontWeight: 500, cursor: missingCount === 0 ? "not-allowed" : "pointer", opacity: missingCount === 0 ? 0.5 : 1,
                  }}>
                    {busyKey === `missing-${entry.key}` ? "Applying..." : missingCount > 0 ? `Add to ${missingCount} missing` : "In all classes"}
                  </button>
                  <button type="button" disabled={busyKey === `sync-${entry.key}-compulsory`} onClick={(e) => { e.stopPropagation(); onSyncType(entry, "compulsory"); }} style={{
                    border: "1px solid #dbeafe", borderRadius: 6, padding: "5px 10px",
                    background: teachingTypeLabel === "compulsory" ? "#eff6ff" : "#fff", color: "#1d4ed8", fontSize: 12, fontWeight: 500, cursor: "pointer",
                  }}>
                    {busyKey === `sync-${entry.key}-compulsory` ? "Saving..." : "Sync compulsory"}
                  </button>
                  <button type="button" disabled={busyKey === `sync-${entry.key}-optional`} onClick={(e) => { e.stopPropagation(); onSyncType(entry, "optional"); }} style={{
                    border: "1px solid #fde68a", borderRadius: 6, padding: "5px 10px",
                    background: teachingTypeLabel === "optional" ? "#fff7ed" : "#fff", color: "#b45309", fontSize: 12, fontWeight: 500, cursor: "pointer",
                  }}>
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

export function SubjectsPage({ classes = [], canManage = false, onNavigateToClass, onApplySubjectMaster }) {
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
    if (applyScope === "all") return classes.map((cls) => cls.id);
    if (applyScope === "forms") return applyForms.length ? targetClasses.map((cls) => cls.id) : [];
    return targetClasses.filter((cls) => selectedClassIds.includes(cls.id)).map((cls) => cls.id);
  }, [applyScope, applyForms, classes, selectedClassIds, targetClasses]);

  const selectedTargetCount = selectedTargetIds.length;

  const toggleForm = (form) => setApplyForms((c) => c.includes(form) ? c.filter((e) => e !== form) : [...c, form]);
  const toggleClassSelection = (classId) => setSelectedClassIds((c) => c.includes(classId) ? c.filter((e) => e !== classId) : [...c, classId]);

  const handleApplyMaster = async () => {
    const normalizedName = normalizeSubjectName(subjectDraft);
    if (!normalizedName) { setActionError("Subject name is required"); return; }
    if (applyScope === "forms" && applyForms.length === 0) { setActionError("Choose at least one form"); return; }
    if (applyScope === "classes" && selectedTargetCount === 0) { setActionError("Choose at least one class"); return; }
    setActionError("");
    setMasterBusy(true);
    try {
      await onApplySubjectMaster?.({ classIds: selectedTargetIds, subjectName: normalizedName, subjectType: subjectDraftType });
      setSubjectDraft("");
      if (applyScope === "classes") setSelectedClassIds([]);
    } catch (error) { setActionError(error.message); } finally { setMasterBusy(false); }
  };

  const handleApplyMissing = async (entry) => {
    const existingIds = new Set(entry.classes.map((cls) => cls.id));
    const missingIds = classes.filter((cls) => !existingIds.has(cls.id)).map((cls) => cls.id);
    if (!missingIds.length) return;
    setRowBusyKey(`missing-${entry.key}`);
    setActionError("");
    try { await onApplySubjectMaster?.({ classIds: missingIds, subjectName: entry.name, subjectType: entry.type }); }
    catch (error) { setActionError(error.message); } finally { setRowBusyKey(""); }
  };

  const handleSyncType = async (entry, nextType) => {
    const targetIds = entry.classes.map((cls) => cls.id);
    if (!targetIds.length) return;
    setRowBusyKey(`sync-${entry.key}-${nextType}`);
    setActionError("");
    try { await onApplySubjectMaster?.({ classIds: targetIds, subjectName: entry.name, subjectType: nextType }); }
    catch (error) { setActionError(error.message); } finally { setRowBusyKey(""); }
  };

  const scopeBtn = (value, label) => {
    const active = applyScope === value;
    return (
      <button type="button" onClick={() => setApplyScope(value)} style={{
        padding: "5px 12px", fontSize: 12, fontWeight: active ? 600 : 400, borderRadius: 6,
        border: active ? "1px solid #0f2d6e" : "1px solid #e2e8f0",
        background: active ? "#0f2d6e" : "#fff", color: active ? "#fff" : "#475569", cursor: "pointer",
      }}>{label}</button>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 12px 28px" : "20px 24px 32px", fontFamily: premiumFontStack, background: "#f8f9fb", minHeight: 0 }}>
      <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gap: isMobile ? 14 : 18 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: displayFontStack, fontSize: isXs ? 20 : 24, fontWeight: 500, color: "#0f172a", margin: 0 }}>Subjects</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
              {stats.total} subjects &middot; {stats.compulsory} compulsory &middot; {stats.optional} optional{stats.mixed ? ` · ${stats.mixed} mixed` : ""}
            </p>
          </div>
        </div>

        {canManage ? (
          <details style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: isMobile ? "14px" : "16px 18px" }}>
            <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0f172a", userSelect: "none" }}>
              Add or roll out a subject
            </summary>
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Name a subject, choose its type, then apply to all classes, selected forms, or hand-picked classes.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(200px,1.2fr) 160px auto", gap: 8, alignItems: "center" }}>
                <input type="text" placeholder="Subject name" value={subjectDraft} onChange={(e) => setSubjectDraft(e.target.value)} style={fieldStyle()} />
                <select value={subjectDraftType} onChange={(e) => setSubjectDraftType(e.target.value)} style={fieldStyle()}>
                  <option value="compulsory">Compulsory</option>
                  <option value="optional">Optional</option>
                </select>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {scopeBtn("all", "All classes")}
                  {scopeBtn("forms", "By form")}
                  {scopeBtn("classes", "Pick classes")}
                </div>
              </div>

              {applyScope !== "all" ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={applyYear} onChange={(e) => setApplyYear(e.target.value)} style={fieldStyle()}>
                      <option value="all">All years</option>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {CLASS_FORMS.map((form) => {
                        const active = applyForms.includes(form);
                        return (
                          <button key={form} type="button" onClick={() => toggleForm(form)} style={{
                            padding: "5px 10px", fontSize: 12, fontWeight: active ? 600 : 400, borderRadius: 6,
                            border: active ? "1px solid #0f2d6e" : "1px solid #e2e8f0",
                            background: active ? "#eef3fb" : "#fff", color: active ? "#0f2d6e" : "#475569", cursor: "pointer",
                          }}>{form}</button>
                        );
                      })}
                    </div>
                  </div>
                  {applyScope === "classes" ? (
                    <div style={{ border: "1px solid #f1f5f9", borderRadius: 8, padding: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {targetClasses.length ? targetClasses.map((cls) => {
                        const active = selectedClassIds.includes(cls.id);
                        return (
                          <button key={cls.id} type="button" onClick={() => toggleClassSelection(cls.id)} style={{
                            border: active ? "1px solid #0f2d6e" : "1px solid #e2e8f0", borderRadius: 6, padding: "5px 10px",
                            background: active ? "#eef3fb" : "#fff", color: active ? "#0f2d6e" : "#475569", fontSize: 12, fontWeight: 500, cursor: "pointer",
                          }}>{getClassLabel(cls)}</button>
                        );
                      }) : <div style={{ fontSize: 12, color: "#94a3b8" }}>No classes match the filter.</div>}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={handleApplyMaster} disabled={masterBusy} style={{
                  border: "none", borderRadius: 8, padding: "8px 16px", background: "#0f2d6e", color: "#fff",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: masterBusy ? 0.6 : 1,
                }}>
                  {masterBusy ? "Applying..." : `Apply to ${selectedTargetCount} class${selectedTargetCount === 1 ? "" : "es"}`}
                </button>
              </div>
              {actionError ? <div style={{ borderRadius: 8, border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", padding: "8px 10px", fontSize: 12 }}>{actionError}</div> : null}
            </div>
          </details>
        ) : null}

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: isMobile ? "10px 12px" : "12px 16px", display: "grid", gap: 8 }}>
          <input type="text" placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...fieldStyle(), width: "100%", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...fieldStyle(), flex: isXs ? "1 1 calc(50% - 3px)" : undefined }}>
              <option value="all">All types</option>
              <option value="compulsory">Compulsory</option>
              <option value="optional">Optional</option>
            </select>
            <select value={filterForm} onChange={(e) => setFilterForm(e.target.value)} style={{ ...fieldStyle(), flex: isXs ? "1 1 calc(50% - 3px)" : undefined }}>
              <option value="all">All forms</option>
              {CLASS_FORMS.map((form) => <option key={form} value={form}>{form}</option>)}
            </select>
            {(search || filterType !== "all" || filterForm !== "all") ? (
              <button type="button" onClick={() => { setSearch(""); setFilterType("all"); setFilterForm("all"); }} style={{ background: "none", border: "none", fontSize: 12, color: "#3b82f6", cursor: "pointer", padding: 0 }}>Clear</button>
            ) : null}
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>{filtered.length} of {catalogue.length}</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {catalogue.length === 0 ? "No subjects found. Add subjects in class Settings." : "No subjects match your filters."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden", minWidth: 540 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</th>
                    {CLASS_FORMS.map((form) => (
                      <th key={form} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        {form.replace("Form ", "F")}
                      </th>
                    ))}
                    <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <SubjectRow key={entry.key} entry={entry} expanded={expandedSubject === entry.key} onToggle={() => setExpandedSubject((c) => (c === entry.key ? null : entry.key))} onNavigate={onNavigateToClass} canManage={canManage} totalClasses={classes.length} onApplyMissing={handleApplyMissing} onSyncType={handleSyncType} busyKey={rowBusyKey} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
          The catalogue is built from visible classes. Use the master actions above to roll out subjects consistently.
        </p>
      </div>
    </div>
  );
}
