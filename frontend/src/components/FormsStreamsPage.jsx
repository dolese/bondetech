import { useCallback, useEffect, useMemo, useState } from "react";
import { API } from "../api";
import { CLASS_FORMS } from "../hooks/useClasses";
import { displayFontStack, premiumFontStack } from "../utils/designSystem";
import { useViewport } from "../utils/useViewport";

const STREAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_BULK_STREAM_STUDENTS = 200;

const palette = {
  ink: "#172033",
  muted: "#667085",
  line: "#dde3ec",
  panel: "#ffffff",
  canvas: "#f3f5f8",
  navy: "#0f2d6e",
  navySoft: "#eef3fb",
  green: "#177b63",
  greenSoft: "#eaf7f2",
  amber: "#a76512",
  amberSoft: "#fff6dc",
  red: "#b42318",
  redSoft: "#fff0ee",
};

function classLabel(stream = {}) {
  return [stream.form, stream.stream || "Unlabelled", stream.year].filter(Boolean).join(" ") || stream.name || "Stream";
}

function hasValidStreamLetter(stream = {}) {
  return /^[A-Z]$/.test(String(stream.stream || "").toUpperCase());
}

function studentKey(student = {}) {
  return `${student.classId || ""}:${student.id || ""}`;
}

function badge(label, tone = "navy") {
  const tones = {
    navy: [palette.navy, palette.navySoft],
    green: [palette.green, palette.greenSoft],
    amber: [palette.amber, palette.amberSoft],
    red: [palette.red, palette.redSoft],
    slate: ["#475467", "#f2f4f7"],
  };
  const [color, background] = tones[tone] || tones.navy;
  return {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "4px 10px",
    borderRadius: 999,
    background,
    color,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.01em",
  };
}

function buttonStyle({ primary = false, danger = false, disabled = false, compact = false } = {}) {
  const background = danger ? palette.red : primary ? palette.navy : "#fff";
  const color = primary || danger ? "#fff" : palette.ink;
  return {
    border: primary || danger ? "1px solid transparent" : `1px solid ${palette.line}`,
    borderRadius: 10,
    padding: compact ? "8px 12px" : "10px 14px",
    background: disabled ? "#e4e7ec" : background,
    color: disabled ? "#98a2b3" : color,
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: "none",
  };
}

function fieldStyle() {
  return {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${palette.line}`,
    borderRadius: 11,
    padding: "10px 12px",
    background: "#fff",
    color: palette.ink,
    fontSize: 13,
    fontWeight: 650,
    outline: "none",
  };
}

function Skeleton({ height = 96 }) {
  return (
    <div
      style={{
        height,
        borderRadius: 16,
        background: "linear-gradient(90deg,#eef1f5 25%,#f8fafc 45%,#eef1f5 65%)",
        backgroundSize: "220% 100%",
        animation: "formsStreamsPulse 1.4s ease infinite",
      }}
    />
  );
}

function EmptyState({ title, body, action = null }) {
  return (
    <div style={{ border: `1px dashed ${palette.line}`, borderRadius: 18, padding: "24px 18px", textAlign: "center", background: "#fbfcfe" }}>
      <div style={{ width: 38, height: 38, margin: "0 auto", borderRadius: 12, display: "grid", placeItems: "center", background: palette.navySoft, color: palette.navy, fontWeight: 900 }}>+</div>
      <div style={{ marginTop: 10, fontSize: 14, fontWeight: 850, color: palette.ink }}>{title}</div>
      <div style={{ margin: "5px auto 0", maxWidth: 440, fontSize: 12, color: palette.muted, lineHeight: 1.6 }}>{body}</div>
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

function FormCard({ item, selected, onSelect }) {
  const streamCount = Number(item?.streamCount || 0);
  const students = Number(item?.totalStudents || 0);
  const unassigned = Number(item?.unassignedCount || 0);
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        textAlign: "left",
        border: selected ? `1px solid ${palette.navy}` : `1px solid ${palette.line}`,
        borderRadius: 14,
        background: selected ? palette.navy : palette.panel,
        color: selected ? "#fff" : palette.ink,
        padding: 16,
        cursor: "pointer",
        boxShadow: selected ? "0 6px 18px rgba(15,45,110,0.16)" : "0 1px 2px rgba(16,24,40,0.06)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontFamily: displayFontStack, fontSize: 20, fontWeight: 650 }}>{item.form}</div>
        <span style={badge(item.active ? "Active" : "Inactive", item.active ? "green" : "slate")}>{item.active ? "Active" : "Inactive"}</span>
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{streamCount}</div>
          <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>Streams</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{students}</div>
          <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>Students</div>
        </div>
      </div>
      <div style={{ marginTop: 13, fontSize: 12, fontWeight: 500, opacity: 0.82 }}>
        {unassigned ? `${unassigned} need stream assignment` : "All students assigned"}
      </div>
    </button>
  );
}

function StreamCard({ stream, canManage, isMobile = false, onOpen, onEdit, onToggleStatus, onDelete, onDeleteLegacy }) {
  const count = Number(stream.studentCount || 0);
  const capacity = Number(stream.streamCapacity || 0);
  const available = capacity > 0 ? Math.max(0, capacity - count) : null;
  const ratio = capacity > 0 ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
  const inactive = stream.streamStatus === "inactive";
  const archived = Boolean(stream.archived);
  const validLetter = hasValidStreamLetter(stream);
  const actionCount = archived ? 1 : 1 + (canManage ? 2 + (count === 0 ? 1 : 0) : 0);
  const compactButtonWidth = actionCount > 1 ? `repeat(${actionCount}, minmax(0,1fr))` : "1fr";
  return (
    <article style={{ border: `1px solid ${palette.line}`, borderRadius: 14, padding: isMobile ? 13 : 16, background: archived ? "#fffaf0" : "#fff", display: "grid", gap: isMobile ? 10 : 13, boxShadow: "0 1px 2px rgba(16,24,40,0.05), 0 4px 14px rgba(16,24,40,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: palette.muted, fontWeight: 500 }}>Stream</div>
          <div style={{ fontFamily: displayFontStack, fontSize: validLetter ? (isMobile ? 24 : 28) : (isMobile ? 18 : 20), fontWeight: 650, color: palette.ink, marginTop: 2 }}>{validLetter ? stream.stream : "Unlabelled"}</div>
        </div>
        <span style={badge(archived ? "Archived" : inactive ? "Inactive" : "Active", archived ? "amber" : inactive ? "slate" : "green")}>
          {archived ? "Archived" : inactive ? "Inactive" : "Active"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 8 : 10 }}>
        <div><div style={{ fontSize: isMobile ? 17 : 19, fontWeight: 600, color: palette.ink }}>{count}</div><div style={{ fontSize: 11, color: palette.muted }}>Students</div></div>
        <div><div style={{ fontSize: isMobile ? 17 : 19, fontWeight: 600, color: palette.ink }}>{capacity || "-"}</div><div style={{ fontSize: 11, color: palette.muted }}>Capacity</div></div>
      </div>
      {capacity > 0 ? (
        <div>
          <div style={{ height: 6, borderRadius: 999, background: "#edf0f4", overflow: "hidden" }}><div style={{ width: `${ratio}%`, height: "100%", background: ratio >= 95 ? palette.red : ratio >= 80 ? palette.amber : palette.green }} /></div>
          <div style={{ fontSize: 11, color: palette.muted, marginTop: 5 }}>{available} place{available === 1 ? "" : "s"} available</div>
        </div>
      ) : null}
      <div style={{ paddingTop: isMobile ? 8 : 10, borderTop: `1px solid ${palette.line}`, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontSize: 12, color: palette.muted, fontWeight: 500 }}>Class teacher</div>
        <div style={{ fontSize: 12, color: palette.ink, fontWeight: 600, marginTop: 0, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stream.classTeacher || "Not assigned"}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? compactButtonWidth : undefined, gap: 7, flexWrap: isMobile ? undefined : "wrap" }}>
        {archived ? (
          canManage && count === 0 ? <button type="button" onClick={() => onDeleteLegacy(stream)} style={buttonStyle({ danger: true, compact: true })}>Delete</button> : null
        ) : (
          <>
            <button type="button" onClick={() => onOpen(stream)} style={buttonStyle({ compact: true })}>Open</button>
            {canManage ? <button type="button" onClick={() => onEdit(stream)} style={buttonStyle({ compact: true })}>Edit</button> : null}
            {canManage ? (
              <button type="button" onClick={() => onToggleStatus(stream)} style={buttonStyle({ compact: true })}>
                {inactive ? "Enable" : "Disable"}
              </button>
            ) : null}
            {canManage && count === 0 ? (
              <button type="button" onClick={() => onDelete(stream)} style={buttonStyle({ danger: true, compact: true })}>
                Delete
              </button>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

function StreamEditor({ state, teachers, usedStreams, busy, onChange, onClose, onSave }) {
  if (!state) return null;
  const editing = Boolean(state.id);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(15,23,42,0.48)", display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(440px,100%)", height: "100%", overflowY: "auto", background: "#fff", padding: "24px 20px", boxSizing: "border-box", boxShadow: "-18px 0 50px rgba(15,23,42,0.18)", display: "grid", alignContent: "start", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div><span style={badge(editing ? "Edit stream" : "New stream", "navy")}>{editing ? "Edit stream" : "New stream"}</span><h2 style={{ fontFamily: displayFontStack, fontWeight: 650, fontSize: 27, margin: "10px 0 0", color: palette.ink }}>{state.form}</h2><p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted }}>Configure the stream before it becomes available for student placement.</p></div>
          <button type="button" onClick={onClose} style={buttonStyle({ compact: true })}>Close</button>
        </div>
        <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 11, fontWeight: 800, color: palette.muted }}>Stream letter</span><select value={state.stream} onChange={(event) => onChange("stream", event.target.value)} style={fieldStyle()}>{!state.stream ? <option value="">No available stream letter</option> : null}{STREAM_LETTERS.map((letter) => { const usedByAnother = usedStreams.has(letter) && letter !== state.originalStream; return <option key={letter} value={letter} disabled={usedByAnother}>Stream {letter}{usedByAnother ? " (used)" : ""}</option>; })}</select></label>
        <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 11, fontWeight: 800, color: palette.muted }}>Capacity</span><input type="number" min="1" max="500" value={state.streamCapacity} onChange={(event) => onChange("streamCapacity", event.target.value)} style={fieldStyle()} /></label>
        <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 11, fontWeight: 800, color: palette.muted }}>Class teacher (optional)</span><select value={state.classTeacher} onChange={(event) => onChange("classTeacher", event.target.value)} style={fieldStyle()}><option value="">Not assigned</option>{teachers.map((teacher) => <option key={teacher.id || teacher.username} value={teacher.displayName || teacher.username}>{teacher.displayName || teacher.username}</option>)}</select></label>
        <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 11, fontWeight: 800, color: palette.muted }}>Status</span><select value={state.streamStatus} onChange={(event) => onChange("streamStatus", event.target.value)} style={fieldStyle()}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        {state.error ? <div style={{ padding: 12, borderRadius: 12, background: palette.redSoft, color: palette.red, fontSize: 12, fontWeight: 750 }}>{state.error}</div> : null}
        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}><button type="button" onClick={onClose} disabled={busy} style={buttonStyle()}>Cancel</button><button type="button" onClick={onSave} disabled={busy} style={buttonStyle({ primary: true, disabled: busy })}>{busy ? "Saving..." : editing ? "Save changes" : "Create stream"}</button></div>
      </div>
    </div>
  );
}

function ConfirmDialog({ state, busy, onCancel, onConfirm }) {
  if (!state) return null;
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 1250, display: "grid", placeItems: "center", padding: 16, background: "rgba(15,23,42,0.5)" }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(420px,100%)", borderRadius: 20, background: "#fff", padding: 20, boxShadow: "0 22px 60px rgba(15,23,42,0.24)" }}>
        <span style={badge(state.danger ? "Confirmation required" : "Review action", state.danger ? "red" : "navy")}>{state.danger ? "Confirmation required" : "Review action"}</span>
        <h3 style={{ margin: "12px 0 0", fontFamily: displayFontStack, fontSize: 23, color: palette.ink }}>{state.title}</h3>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: palette.muted, lineHeight: 1.6 }}>{state.body}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 18 }}><button type="button" onClick={onCancel} disabled={busy} style={buttonStyle()}>Cancel</button><button type="button" onClick={onConfirm} disabled={busy} style={buttonStyle({ primary: !state.danger, danger: state.danger, disabled: busy })}>{busy ? "Working..." : state.confirmLabel || "Confirm"}</button></div>
      </div>
    </div>
  );
}

export function FormsStreamsPage({
  classes = [],
  teachers = [],
  canCreateClasses = false,
  canAssignStreams = false,
  showToast,
  onNavigateToClass,
  onCreateClass,
  onReloadClasses,
}) {
  const { isMobile, isXs } = useViewport();
  const years = useMemo(() => {
    const values = new Set(classes.map((item) => String(item.year || "")).filter(Boolean));
    values.add(String(new Date().getFullYear()));
    return Array.from(values).sort((left, right) => Number(right) - Number(left));
  }, [classes]);
  const [selectedYear, setSelectedYear] = useState(() => years[0] || String(new Date().getFullYear()));
  const [selectedForm, setSelectedForm] = useState(CLASS_FORMS[0]);
  const [overview, setOverview] = useState({ forms: [], unassigned: [] });
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterClasses, setRosterClasses] = useState([]);
  const [editor, setEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [streamFilter, setStreamFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [selectedStudents, setSelectedStudents] = useState({});
  const [selectedUnassigned, setSelectedUnassigned] = useState({});
  const [targetForm, setTargetForm] = useState(CLASS_FORMS[0]);
  const [targetClassId, setTargetClassId] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.getFormsStreams({ year: selectedYear });
      setOverview({ forms: Array.isArray(data.forms) ? data.forms : [], unassigned: Array.isArray(data.unassigned) ? data.unassigned : [] });
    } catch (err) {
      showToast?.(err.message || "Unable to load forms and streams", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showToast]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const formItems = useMemo(() => CLASS_FORMS.map((form) => overview.forms.find((item) => item.form === form) || { form, active: false, streamCount: 0, totalStudents: 0, unassignedCount: 0, streams: [] }), [overview.forms]);
  const selectedFormItem = formItems.find((item) => item.form === selectedForm) || formItems[0];
  const streams = useMemo(() => [...(selectedFormItem?.streams || [])].sort((a, b) => String(a.stream).localeCompare(String(b.stream))), [selectedFormItem]);
  const currentStreams = useMemo(() => streams.filter((stream) => !stream.archived), [streams]);
  const archivedStreams = useMemo(() => streams.filter((stream) => stream.archived), [streams]);
  const rosterStreams = useMemo(() => currentStreams.filter((stream) => stream.streamStatus !== "inactive"), [currentStreams]);
  const activeStreams = useMemo(() => rosterStreams.filter(hasValidStreamLetter), [rosterStreams]);
  const usedStreams = useMemo(() => new Set(currentStreams.filter(hasValidStreamLetter).map((stream) => String(stream.stream).toUpperCase())), [currentStreams]);
  const nextStream = STREAM_LETTERS.find((letter) => !usedStreams.has(letter)) || "";

  const loadRoster = useCallback(async () => {
    if (!canAssignStreams || !rosterStreams.length) { setRosterClasses([]); return; }
    setLoadingRoster(true);
    try {
      const loaded = await Promise.all(rosterStreams.map((stream) => API.getClass(stream.id)));
      setRosterClasses(loaded.map((item) => ({ ...item, students: Array.isArray(item.students) ? item.students : [] })));
    } catch (err) {
      showToast?.(err.message || "Unable to load stream rosters", "error");
    } finally {
      setLoadingRoster(false);
    }
  }, [rosterStreams, canAssignStreams, showToast]);

  useEffect(() => { loadRoster(); setSelectedStudents({}); setTargetClassId(""); setTargetForm(selectedForm); }, [loadRoster, selectedForm]);

  const students = useMemo(() => rosterClasses.flatMap((cls) => (cls.students || []).map((student) => ({ ...student, classId: cls.id, stream: cls.stream, classLabel: classLabel(cls), admissionNo: student.admissionNo || student.admission_no || "" }))), [rosterClasses]);
  const filteredStudents = useMemo(() => students.filter((student) => {
    const needle = query.trim().toLowerCase();
    if (streamFilter && student.stream !== streamFilter) return false;
    if (genderFilter && student.sex !== genderFilter) return false;
    if (!needle) return true;
    return [student.name, student.admissionNo, student.indexNo, student.index_no].some((value) => String(value || "").toLowerCase().includes(needle));
  }), [genderFilter, query, streamFilter, students]);
  const unassigned = useMemo(() => (overview.unassigned || []).filter((student) => student.form === selectedForm && (!genderFilter || student.sex === genderFilter) && (!query.trim() || [student.name, student.admission_no].some((value) => String(value || "").toLowerCase().includes(query.trim().toLowerCase())))), [genderFilter, overview.unassigned, query, selectedForm]);

  const targetStreams = activeStreams.filter((stream) => stream.form === targetForm);
  const refreshAll = async () => { await Promise.all([loadOverview(), onReloadClasses?.()]); await loadRoster(); };

  const openCreate = () => setEditor({ form: selectedForm, stream: nextStream, originalStream: "", streamCapacity: 50, classTeacher: "", streamStatus: "active", error: "" });
  const openEdit = (stream) => {
    const originalStream = hasValidStreamLetter(stream) ? String(stream.stream).toUpperCase() : "";
    setEditor({ id: stream.id, form: stream.form, stream: originalStream || nextStream, originalStream, streamCapacity: stream.streamCapacity || Math.max(50, Number(stream.studentCount || 0)), classTeacher: stream.classTeacher || "", streamStatus: stream.streamStatus || "active", error: "" });
  };
  const saveStream = async () => {
    if (!editor || busy) return;
    const capacity = Number.parseInt(editor.streamCapacity, 10);
    if (!/^[A-Z]$/.test(editor.stream) || !Number.isFinite(capacity) || capacity < 1 || capacity > 500) { setEditor((current) => ({ ...current, error: "Use one stream letter and a capacity between 1 and 500." })); return; }
    setBusy(true);
    try {
      const payload = { year: selectedYear, form: editor.form, stream: editor.stream, streamCapacity: capacity, classTeacher: editor.classTeacher, streamStatus: editor.streamStatus, name: `${editor.form} ${editor.stream} ${selectedYear}` };
      const result = editor.id ? await API.updateStream(editor.id, payload) : await onCreateClass?.(payload);
      if (result?.ok === false) throw new Error(result.error || "Unable to create stream");
      showToast?.(editor.id ? "Stream updated" : "Stream created", "success");
      setEditor(null);
      await refreshAll();
    } catch (err) { setEditor((current) => ({ ...current, error: err.message || "Unable to save stream" })); } finally { setBusy(false); }
  };

  const toggleStreamStatus = (stream) => {
    const nextStatus = stream.streamStatus === "inactive" ? "active" : "inactive";
    setConfirm({ title: `${nextStatus === "inactive" ? "Disable" : "Enable"} ${classLabel(stream)}?`, body: nextStatus === "inactive" ? "A stream can only be disabled after all students have been moved. Existing marks and class history remain preserved." : "This stream will become available for new student assignments.", confirmLabel: nextStatus === "inactive" ? "Disable stream" : "Enable stream", danger: nextStatus === "inactive", run: async () => API.updateStream(stream.id, { streamStatus: nextStatus }) });
  };

  const deleteStream = (stream) => {
    setConfirm({
      title: `Delete ${classLabel(stream)}?`,
      body: "This permanently removes the empty stream. Students and live counts are protected because a stream with students cannot be deleted.",
      confirmLabel: "Delete permanently",
      danger: true,
      run: () => API.deleteStream(stream.id),
    });
  };

  const deleteLegacyStream = (stream) => {
    setConfirm({
      title: `Delete legacy record ${classLabel(stream)}?`,
      body: "This removes an old archived stream record permanently. Only empty legacy records can be deleted here.",
      confirmLabel: "Delete permanently",
      danger: true,
      run: () => API.deleteClass(stream.id, { permanent: true }),
    });
  };

  const runConfirmed = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    try { await confirm.run(); showToast?.("Forms and streams updated", "success"); setConfirm(null); setSelectedStudents({}); setSelectedUnassigned({}); await refreshAll(); } catch (err) { showToast?.(err.message || "Unable to complete action", "error"); } finally { setBusy(false); }
  };

  const selectedRoster = filteredStudents.filter((student) => selectedStudents[studentKey(student)]);
  const selectableStudents = filteredStudents.slice(0, MAX_BULK_STREAM_STUDENTS);
  const allFilteredSelected = selectableStudents.length > 0 && selectableStudents.every((student) => selectedStudents[studentKey(student)]);
  const toggleSelectAllFiltered = () => {
    setSelectedStudents((current) => {
      const next = { ...current };
      selectableStudents.forEach((student) => {
        const key = studentKey(student);
        if (allFilteredSelected) delete next[key];
        else next[key] = true;
      });
      return next;
    });
  };
  const selectedQueue = unassigned.filter((student) => selectedUnassigned[student.id]);
  const bulkMove = () => {
    if (!selectedRoster.length || !targetClassId) return;
    const assignments = selectedRoster.filter((student) => student.classId !== targetClassId).map((student) => ({ sourceClassId: student.classId, studentId: student.id }));
    if (!assignments.length) { showToast?.("Selected students are already in that stream", "error"); return; }
    setConfirm({ title: `Move ${assignments.length} student${assignments.length === 1 ? "" : "s"}?`, body: "Their previous stream records will be removed automatically and the target stream counts will update in one operation.", confirmLabel: "Confirm assignment", run: () => API.bulkAssignStudentsToStream(assignments, targetClassId) });
  };
  const unassignSelected = () => {
    if (!selectedRoster.length) return;
    setConfirm({
      title: `Mark ${selectedRoster.length} student${selectedRoster.length === 1 ? "" : "s"} unassigned?`,
      body: "They will leave their current stream and appear in the Unassigned Students queue until placed again.",
      confirmLabel: "Move to unassigned",
      danger: true,
      run: () => API.unassignStudentsFromStreams(
        selectedRoster.map((student) => ({ sourceClassId: student.classId, studentId: student.id })),
      ),
    });
  };
  const assignQueue = () => {
    if (!selectedQueue.length || !targetClassId) return;
    setConfirm({ title: `Assign ${selectedQueue.length} unassigned student${selectedQueue.length === 1 ? "" : "s"}?`, body: `They will be placed into ${classLabel(activeStreams.find((stream) => stream.id === targetClassId))}.`, confirmLabel: "Assign students", run: () => API.assignUnassignedStudentsToStream(selectedQueue.map((student) => student.id), targetClassId) });
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: isMobile ? "16px 12px 34px" : "28px 28px 44px", fontFamily: premiumFontStack, background: palette.canvas }}>
      <style>{`@keyframes formsStreamsPulse{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 20 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div><span style={badge("Academic structure", "amber")}>Academic structure</span><h1 style={{ margin: "10px 0 0", fontFamily: displayFontStack, fontSize: isXs ? 27 : 36, fontWeight: 650, color: palette.ink, letterSpacing: "-0.025em" }}>Forms &amp; Streams</h1><p style={{ margin: "7px 0 0", maxWidth: 650, fontSize: 13, color: palette.muted, lineHeight: 1.65 }}>Manage the four school forms, stream capacity, class teachers, and precise student placement from one controlled workspace.</p></div>
          <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} style={{ ...fieldStyle(), width: 150 }}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select>
        </header>

        {loading ? <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12 }}>{CLASS_FORMS.map((form) => <Skeleton key={form} height={150} />)}</div> : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12 }}>{formItems.map((item) => <FormCard key={item.form} item={item} selected={selectedForm === item.form} onSelect={() => { setSelectedForm(item.form); setQuery(""); setStreamFilter(""); setGenderFilter(""); }} />)}</div>
        )}

        <section style={{ border: `1px solid ${palette.line}`, borderRadius: 16, background: "#fff", padding: isMobile ? 16 : 22, boxShadow: "0 1px 2px rgba(16,24,40,0.05), 0 6px 20px rgba(16,24,40,0.04)", display: "grid", gap: 17 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><span style={badge(selectedFormItem?.active ? "Active form" : "Inactive form", selectedFormItem?.active ? "green" : "slate")}>{selectedFormItem?.active ? "Active form" : "Inactive form"}</span><h2 style={{ margin: "9px 0 0", fontFamily: displayFontStack, fontSize: 27, fontWeight: 650, color: palette.ink }}>{selectedForm} streams</h2><div style={{ marginTop: 4, fontSize: 12, color: palette.muted }}>{selectedFormItem?.streamCount || 0} streams | {selectedFormItem?.totalStudents || 0} students</div></div>{canCreateClasses ? <button type="button" onClick={openCreate} style={buttonStyle({ primary: true })}>+ Add Stream</button> : null}</div>
          {Number(selectedFormItem?.invalidStreamCount || 0) ? <div style={{ border: "1px solid #f0c36a", borderRadius: 14, padding: "11px 13px", background: palette.amberSoft, color: "#7a4610", fontSize: 12, lineHeight: 1.55 }}><strong>{selectedFormItem.invalidStreamCount} current class needs a stream letter.</strong> Edit the Unlabelled card and assign A-Z before using it as an assignment target.</div> : null}
          {loading ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}><Skeleton height={250} /><Skeleton height={250} /></div> : currentStreams.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 12 }}>{currentStreams.map((stream) => <StreamCard key={stream.id} stream={stream} canManage={canCreateClasses} isMobile={isMobile} onOpen={onNavigateToClass} onEdit={openEdit} onToggleStatus={toggleStreamStatus} onDelete={deleteStream} onDeleteLegacy={deleteLegacyStream} />)}</div> : <EmptyState title={`No streams in ${selectedForm}`} body="Create the first stream and define its capacity before assigning students." action={canCreateClasses ? <button type="button" onClick={openCreate} style={buttonStyle({ primary: true })}>Add first stream</button> : null} />}
          {archivedStreams.length ? <details style={{ borderTop: `1px solid ${palette.line}`, paddingTop: 14 }}><summary style={{ cursor: "pointer", color: palette.muted, fontSize: 12, fontWeight: 800 }}>Legacy archived records ({archivedStreams.length})</summary><div style={{ marginTop: 6, fontSize: 12, color: palette.muted, lineHeight: 1.55 }}>These are old history-only records from the previous archive workflow. New stream actions now use permanent delete for empty streams and do not create new archived duplicates.</div><div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 12 }}>{archivedStreams.map((stream) => <StreamCard key={stream.id} stream={stream} canManage={canCreateClasses} isMobile={isMobile} onOpen={onNavigateToClass} onEdit={openEdit} onToggleStatus={toggleStreamStatus} onDelete={deleteStream} onDeleteLegacy={deleteLegacyStream} />)}</div></details> : null}
        </section>

        {canAssignStreams ? (
          <section style={{ border: `1px solid ${palette.line}`, borderRadius: 16, background: "#fff", padding: isMobile ? 16 : 22, boxShadow: "0 1px 2px rgba(16,24,40,0.05), 0 6px 20px rgba(16,24,40,0.04)", display: "grid", gap: 16 }}>
            <div><span style={badge("Placement", "navy")}>Placement</span><h2 style={{ margin: "9px 0 0", fontFamily: displayFontStack, fontSize: 27, fontWeight: 650, color: palette.ink }}>Student-to-stream mapping</h2><p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted }}>Filter the current roster, select learners, then move them safely to another stream in {selectedForm}.</p></div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "minmax(240px,1.4fr) repeat(2,minmax(150px,0.6fr))", gap: 9 }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, admission number, or CNO" style={{ ...fieldStyle(), gridColumn: isMobile ? "1 / -1" : "auto" }} /><select value={streamFilter} onChange={(event) => setStreamFilter(event.target.value)} style={fieldStyle()}><option value="">All streams</option>{activeStreams.map((stream) => <option key={stream.id} value={stream.stream}>Stream {stream.stream}</option>)}</select><select value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)} style={fieldStyle()}><option value="">All genders</option><option value="F">Female</option><option value="M">Male</option></select></div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 10, padding: 12, borderRadius: 15, background: "#f8fafc", border: `1px solid ${palette.line}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 850, color: palette.ink }}>{selectedRoster.length ? `${selectedRoster.length} selected` : "Select students for bulk placement"}</div>
                <div style={{ fontSize: 11, color: palette.muted, marginTop: 3 }}>{filteredStudents.length > MAX_BULK_STREAM_STUDENTS ? `Bulk actions are limited to the first ${MAX_BULK_STREAM_STUDENTS} filtered students.` : `Select all ${filteredStudents.length} students matching the current filters.`}</div>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button type="button" onClick={toggleSelectAllFiltered} disabled={!selectableStudents.length} style={buttonStyle({ disabled: !selectableStudents.length })}>{allFilteredSelected ? "Clear filtered" : filteredStudents.length > MAX_BULK_STREAM_STUDENTS ? `Select first ${MAX_BULK_STREAM_STUDENTS}` : "Select all filtered"}</button>
                <select value={targetForm} onChange={(event) => { setTargetForm(event.target.value); setTargetClassId(""); }} style={{ ...fieldStyle(), width: 125 }} disabled><option>{selectedForm}</option></select>
                <select value={targetClassId} onChange={(event) => setTargetClassId(event.target.value)} style={{ ...fieldStyle(), width: 150 }}><option value="">Target stream</option>{targetStreams.map((stream) => <option key={stream.id} value={stream.id}>Stream {stream.stream}</option>)}</select>
                <button type="button" onClick={bulkMove} disabled={!selectedRoster.length || !targetClassId} style={buttonStyle({ primary: true, disabled: !selectedRoster.length || !targetClassId })}>Assign selected</button>
                <button type="button" onClick={unassignSelected} disabled={!selectedRoster.length} style={buttonStyle({ danger: true, disabled: !selectedRoster.length })}>Mark unassigned</button>
              </div>
            </div>
            {loadingRoster ? <div style={{ display: "grid", gap: 8 }}><Skeleton height={72} /><Skeleton height={72} /><Skeleton height={72} /></div> : !filteredStudents.length ? <EmptyState title="No students match these filters" body="Change the stream, gender, or search filters to review the roster." /> : (
              <div style={{ display: "grid", gap: 8 }}>{filteredStudents.map((student) => { const key = studentKey(student); const checked = Boolean(selectedStudents[key]); return <label key={key} style={{ display: "grid", gridTemplateColumns: isMobile ? "32px 1fr auto" : "32px minmax(200px,1.3fr) minmax(150px,0.8fr) 90px 110px", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 14, border: `1px solid ${checked ? "#9ab5dc" : palette.line}`, background: checked ? "#f1f6fc" : "#fff", cursor: "pointer" }}><input type="checkbox" checked={checked} onChange={() => setSelectedStudents((current) => ({ ...current, [key]: !current[key] }))} /><div><div style={{ fontSize: 13, fontWeight: 850, color: palette.ink }}>{student.name || "Unnamed student"}</div><div style={{ fontSize: 10, color: palette.muted, marginTop: 3 }}>{student.admissionNo || student.indexNo || student.index_no || "No admission number"}</div></div>{!isMobile ? <div style={{ fontSize: 11, color: palette.muted }}>{student.classLabel}</div> : null}{!isMobile ? <div style={{ fontSize: 12, fontWeight: 800 }}>{student.sex}</div> : null}<span style={badge(`Stream ${student.stream}`, "navy")}>Stream {student.stream}</span></label>; })}</div>
            )}
          </section>
        ) : null}

        {canAssignStreams ? (
          <section style={{ border: `1px solid ${Number(selectedFormItem?.unassignedCount || 0) ? "#f0c36a" : palette.line}`, borderRadius: 22, background: Number(selectedFormItem?.unassignedCount || 0) ? "#fffdf6" : "#fff", padding: isMobile ? 15 : 21, display: "grid", gap: 15 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><span style={badge("Unassigned students", unassigned.length ? "amber" : "green")}>Unassigned students</span><h2 style={{ margin: "9px 0 0", fontFamily: displayFontStack, fontSize: 25, fontWeight: 650, color: palette.ink }}>{unassigned.length ? `${unassigned.length} require placement` : "No placement warnings"}</h2><p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted }}>Students in {selectedForm} who currently have no stream appear here.</p></div>{unassigned.length ? <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}><select value={targetClassId} onChange={(event) => setTargetClassId(event.target.value)} style={{ ...fieldStyle(), width: 150 }}><option value="">Target stream</option>{targetStreams.map((stream) => <option key={stream.id} value={stream.id}>Stream {stream.stream}</option>)}</select><button type="button" onClick={assignQueue} disabled={!selectedQueue.length || !targetClassId} style={buttonStyle({ primary: true, disabled: !selectedQueue.length || !targetClassId })}>Assign selected</button></div> : null}</div>
            {!unassigned.length ? <EmptyState title="Every student has a stream" body="This form currently has no students waiting for stream assignment." /> : <div style={{ display: "grid", gap: 8 }}>{unassigned.map((student) => <label key={student.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", alignItems: "center", gap: 10, padding: 11, borderRadius: 13, border: `1px solid ${palette.line}`, background: "#fff", cursor: "pointer" }}><input type="checkbox" checked={Boolean(selectedUnassigned[student.id])} onChange={() => setSelectedUnassigned((current) => ({ ...current, [student.id]: !current[student.id] }))} /><div><div style={{ fontSize: 13, fontWeight: 850, color: palette.ink }}>{student.name || "Unnamed student"}</div><div style={{ fontSize: 10, color: palette.muted, marginTop: 3 }}>{student.admission_no || "No admission number"} | Previously stream {student.previous_stream || "-"}</div></div><span style={badge(student.sex === "F" ? "Female" : "Male", "slate")}>{student.sex === "F" ? "Female" : "Male"}</span></label>)}</div>}
          </section>
        ) : null}
      </div>
      <StreamEditor state={editor} teachers={teachers} usedStreams={usedStreams} busy={busy} onChange={(field, value) => setEditor((current) => ({ ...current, [field]: value, error: "" }))} onClose={() => !busy && setEditor(null)} onSave={saveStream} />
      <ConfirmDialog state={confirm} busy={busy} onCancel={() => !busy && setConfirm(null)} onConfirm={runConfirmed} />
    </div>
  );
}
