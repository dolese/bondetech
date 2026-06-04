import { useEffect, useMemo, useState } from "react";
import { API } from "../api";
import { CLASS_FORMS, CLASS_STREAMS } from "../hooks/useClasses";
import { premiumFontStack } from "../utils/designSystem";
import { useViewport } from "../utils/useViewport";

function StatCard({ label, value, sub }) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(226,232,240,0.92)",
        background: "linear-gradient(180deg,#ffffff,#f8fbff)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
        padding: "18px 22px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginTop: 4 }}>{label}</div>
      {sub ? <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: 600 }}>{sub}</div> : null}
    </div>
  );
}

function ClassCell({ cls, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const isPublished = cls.published;
  const isArchived = cls.archived;
  const studentCount = cls.studentCount ?? cls.students?.length ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(cls)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        padding: "14px 12px",
        cursor: "pointer",
        background: hovered
          ? "linear-gradient(135deg,#edf4ff,#f5f9ff)"
          : "linear-gradient(180deg,#ffffff,#f8fbff)",
        boxShadow: hovered
          ? "0 10px 28px rgba(37,99,235,0.12)"
          : "0 4px 16px rgba(15,23,42,0.05)",
        border: hovered ? "1px solid rgba(37,99,235,0.25)" : "1px solid rgba(226,232,240,0.92)",
        textAlign: "center",
        transition: "all 0.18s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        width: "100%",
      }}
      title={`${cls.form} ${cls.stream} ${cls.year}`}
    >
      <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{studentCount}</div>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>students</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
        {isPublished && (
          <span style={pillStyle("#059669", "#d1fae5")}>
            PUBLISHED
          </span>
        )}
        {isArchived && (
          <span style={pillStyle("#92400e", "#fef3c7")}>
            ARCHIVED
          </span>
        )}
        {!isPublished && !isArchived && (
          <span style={pillStyle("#2563eb", "#eff6ff")}>
            ACTIVE
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>
        {isArchived ? "Review restore" : "Open class"}
      </div>
    </button>
  );
}

function EmptyCell({ canCreate, onCreate }) {
  const [hovered, setHovered] = useState(false);
  if (!canCreate) {
    return (
      <div
        style={{
          borderRadius: 16,
          border: "1px dashed rgba(203,213,225,0.7)",
          padding: "14px 12px",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 88,
        }}
      >
        <span style={{ color: "#cbd5e1", fontSize: 18, fontWeight: 700 }}>-</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onCreate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1.5px dashed ${hovered ? "rgba(37,99,235,0.5)" : "rgba(148,163,184,0.5)"}`,
        borderRadius: 16,
        padding: "14px 12px",
        cursor: "pointer",
        background: hovered ? "rgba(239,246,255,0.8)" : "#fafbfc",
        color: hovered ? "#2563eb" : "#94a3b8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        minHeight: 88,
        transition: "all 0.18s ease",
        width: "100%",
      }}
      title="Review class creation"
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3 }}>NEW CLASS</span>
    </button>
  );
}

function ActionPanel({ action, busy, onConfirm, onCancel }) {
  if (!action) return null;

  const isRestore = action.mode === "restore";
  const heading = isRestore ? "Restore archived class" : "Create class";
  const detail = `${action.form} ${action.stream} ${action.year}`.trim();

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(191,219,254,0.92)",
          background: "linear-gradient(180deg,#ffffff,#f8fbff)",
          boxShadow: "0 18px 44px rgba(15,23,42,0.12)",
          padding: "18px 20px",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" }}>
              Stream Action Review
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{heading}</div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 4, fontWeight: 700 }}>{detail}</div>
          </div>
          <span style={pillStyle(isRestore ? "#92400e" : "#2563eb", isRestore ? "#fef3c7" : "#eff6ff")}>
            {isRestore ? "RESTORE" : "CREATE"}
          </span>
        </div>

        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          {isRestore
            ? "This archived class already owns this year, form, and stream slot. Restoring it is safer than creating a duplicate record."
            : "Review the academic year, form, and stream before creating. This action seeds a fresh class workspace and makes it active immediately."}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              border: "none",
              borderRadius: 12,
              padding: "10px 16px",
              background: isRestore ? "linear-gradient(135deg,#d97706,#b45309)" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "#fff",
              fontWeight: 800,
              cursor: busy ? "wait" : "pointer",
              boxShadow: isRestore ? "0 10px 24px rgba(180,83,9,0.24)" : "0 10px 24px rgba(37,99,235,0.24)",
            }}
          >
            {busy ? "Working..." : isRestore ? "Restore Archived Class" : "Create Class"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              borderRadius: 12,
              padding: "10px 16px",
              background: "#fff",
              color: "#334155",
              border: "1px solid rgba(203,213,225,0.9)",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function pillStyle(color, background) {
  return {
    fontSize: 9,
    fontWeight: 800,
    color,
    background,
    borderRadius: 6,
    padding: "2px 6px",
    letterSpacing: 0.3,
  };
}

export function FormsStreamsPage({
  classes = [],
  canCreateClasses = false,
  onNavigateToClass,
  onCreateClass,
  onRestoreClass,
}) {
  const years = useMemo(() => {
    const found = new Set(classes.map((cls) => cls.year).filter(Boolean));
    const current = String(new Date().getFullYear());
    found.add(current);
    return Array.from(found).sort((a, b) => Number(b) - Number(a));
  }, [classes]);

  const [selectedYear, setSelectedYear] = useState(() => {
    const current = String(new Date().getFullYear());
    const found = new Set(classes.map((cls) => cls.year).filter(Boolean));
    return found.has(current) ? current : (Array.from(found).sort((a, b) => Number(b) - Number(a))[0] || current);
  });
  const [archivedClasses, setArchivedClasses] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const { isMobile, isXs } = useViewport();

  useEffect(() => {
    let cancelled = false;
    if (!canCreateClasses) {
      setArchivedClasses([]);
      return () => {
        cancelled = true;
      };
    }
    setLoadingArchived(true);
    API.getClasses({ includeArchived: true })
      .then((allClasses) => {
        if (cancelled) return;
        setArchivedClasses(
          (Array.isArray(allClasses) ? allClasses : [])
            .filter((cls) => cls.archived)
            .map((cls) => ({
              ...cls,
              stream: String(cls.stream || "").trim().toUpperCase(),
            })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setArchivedClasses([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingArchived(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canCreateClasses]);

  const yearClasses = useMemo(
    () => classes.filter((cls) => cls.year === selectedYear),
    [classes, selectedYear],
  );
  const archivedYearClasses = useMemo(
    () => archivedClasses.filter((cls) => cls.year === selectedYear),
    [archivedClasses, selectedYear],
  );

  const classMap = useMemo(() => {
    const map = new Map();
    yearClasses.forEach((cls) => {
      const key = `${cls.form}::${String(cls.stream || "").trim().toUpperCase()}`;
      map.set(key, cls);
    });
    archivedYearClasses.forEach((cls) => {
      const key = `${cls.form}::${String(cls.stream || "").trim().toUpperCase()}`;
      if (!map.has(key)) {
        map.set(key, cls);
      }
    });
    return map;
  }, [yearClasses, archivedYearClasses]);

  const displayStreams = CLASS_STREAMS;

  const stats = useMemo(() => {
    const totalStudents = yearClasses.reduce(
      (sum, cls) => sum + (cls.studentCount ?? cls.students?.length ?? 0),
      0,
    );
    const activeForms = new Set(yearClasses.filter((cls) => !cls.archived).map((cls) => cls.form)).size;
    const published = yearClasses.filter((cls) => cls.published).length;
    const archived = archivedYearClasses.length;
    return { totalClasses: yearClasses.length, totalStudents, activeForms, published, archived };
  }, [yearClasses, archivedYearClasses]);

  const formStats = useMemo(() => {
    const map = new Map();
    CLASS_FORMS.forEach((form) => {
      const formClasses = yearClasses.filter((cls) => cls.form === form);
      const students = formClasses.reduce(
        (sum, cls) => sum + (cls.studentCount ?? cls.students?.length ?? 0),
        0,
      );
      const archived = archivedYearClasses.filter((cls) => cls.form === form).length;
      map.set(form, { classes: formClasses.length, students, archived });
    });
    return map;
  }, [yearClasses, archivedYearClasses]);

  const handleSelectCell = (cls) => {
    if (cls.archived) {
      setAction({
        mode: "restore",
        classId: cls.id,
        form: cls.form,
        stream: cls.stream,
        year: cls.year,
      });
      return;
    }
    onNavigateToClass?.(cls);
  };

  const handleCreate = (form, stream) => {
    setAction({ mode: "create", form, stream, year: selectedYear });
  };

  const handleConfirm = async () => {
    if (!action || busy) return;
    setBusy(true);
    try {
      if (action.mode === "restore") {
        await onRestoreClass?.(action.classId);
      } else {
        await onCreateClass?.({ year: action.year, form: action.form, stream: action.stream });
      }
      setAction(null);
    } finally {
      setBusy(false);
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
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: isMobile ? 16 : 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: isXs ? 20 : 26, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
              Forms &amp; Streams
            </h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: "6px 0 0", fontWeight: 600 }}>
              Manage active streams safely, review archived classes, and avoid accidental duplicate creation.
            </p>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => {
                  setSelectedYear(year);
                  setAction(null);
                }}
                style={{
                  border: selectedYear === year ? "none" : "1px solid rgba(226,232,240,0.92)",
                  borderRadius: 12,
                  padding: "8px 16px",
                  cursor: "pointer",
                  background: selectedYear === year
                    ? "linear-gradient(135deg,#2563eb,#1d4ed8)"
                    : "#ffffff",
                  color: selectedYear === year ? "#ffffff" : "#475569",
                  fontSize: 13,
                  fontWeight: 800,
                  boxShadow: selectedYear === year
                    ? "0 4px 12px rgba(37,99,235,0.3)"
                    : "0 2px 6px rgba(15,23,42,0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
          <StatCard label="Active Classes" value={stats.totalClasses} sub={`${selectedYear} academic year`} />
          <StatCard label="Total Students" value={stats.totalStudents} sub="enrolled this year" />
          <StatCard label="Forms in Use" value={stats.activeForms} sub={`of ${CLASS_FORMS.length} forms`} />
          <StatCard label="Published" value={stats.published} sub="results published" />
          <StatCard label="Archived Slots" value={stats.archived} sub={loadingArchived ? "checking archived classes" : "restorable classes in this year"} />
        </div>

        <div style={{
          borderRadius: 18,
          border: "1px solid rgba(226,232,240,0.9)",
          background: "#fff",
          padding: isMobile ? "12px 14px" : "14px 18px",
          color: "#64748b",
          fontSize: 12,
          lineHeight: 1.7,
          fontWeight: 600,
        }}>
          Empty cells no longer create classes immediately. Archived stream classes remain visible here so you can restore them instead of creating duplicate records.
        </div>

        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div
            style={{
              borderRadius: 24,
              border: "1px solid rgba(226,232,240,0.92)",
              background: "linear-gradient(180deg,#ffffff,#f8fbff)",
              boxShadow: "0 14px 40px rgba(15,23,42,0.07)",
              overflow: "hidden",
              minWidth: isMobile ? 440 : 560,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `${isMobile ? "140px" : "200px"} repeat(${displayStreams.length}, 1fr)`,
                borderBottom: "1px solid rgba(226,232,240,0.92)",
                background: "linear-gradient(180deg,#f8faff,#f1f5fe)",
                padding: "0 16px",
              }}
            >
              <div style={{ padding: "14px 8px", fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: 1.2, textTransform: "uppercase" }}>
                Form
              </div>
              {displayStreams.map((stream) => (
                <div
                  key={stream}
                  style={{
                    padding: isMobile ? "10px 4px" : "14px 8px",
                    textAlign: "center",
                    fontSize: isMobile ? 11 : 13,
                    fontWeight: 900,
                    color: "#334155",
                  }}
                >
                  {isMobile ? stream : `Stream ${stream}`}
                </div>
              ))}
            </div>

            {CLASS_FORMS.map((form, formIdx) => {
              const fs = formStats.get(form) || { classes: 0, students: 0, archived: 0 };
              return (
                <div
                  key={form}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `${isMobile ? "140px" : "200px"} repeat(${displayStreams.length}, 1fr)`,
                    borderBottom: formIdx < CLASS_FORMS.length - 1 ? "1px solid rgba(226,232,240,0.7)" : "none",
                    padding: isMobile ? "8px 10px" : "12px 16px",
                    gap: isMobile ? 6 : 10,
                    alignItems: "center",
                    background: formIdx % 2 === 0 ? "transparent" : "rgba(248,250,252,0.5)",
                  }}
                >
                  <div style={{ padding: "4px 8px" }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{form}</div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 3 }}>
                      {fs.classes} active class{fs.classes !== 1 ? "es" : ""} · {fs.students} students
                    </div>
                    {fs.archived ? (
                      <div style={{ fontSize: 11, color: "#92400e", fontWeight: 700, marginTop: 4 }}>
                        {fs.archived} archived stream{fs.archived !== 1 ? "s" : ""}
                      </div>
                    ) : null}
                  </div>

                  {displayStreams.map((stream) => {
                    const key = `${form}::${stream}`;
                    const cls = classMap.get(key);
                    return (
                      <div key={stream}>
                        {cls ? (
                          <ClassCell cls={cls} onSelect={handleSelectCell} />
                        ) : (
                          <EmptyCell
                            canCreate={canCreateClasses}
                            onCreate={() => handleCreate(form, stream)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>Legend:</span>
          {[
            { label: "Active", color: "#2563eb", bg: "#eff6ff" },
            { label: "Published", color: "#059669", bg: "#d1fae5" },
            { label: "Archived", color: "#92400e", bg: "#fef3c7" },
          ].map(({ label, color, bg }) => (
            <span
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#475569" }}
            >
              <span style={{ background: bg, color, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: 0.3 }}>
                {label.toUpperCase()}
              </span>
              {label}
            </span>
          ))}
          {canCreateClasses && (
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
              · Use <strong style={{ color: "#2563eb" }}>New Class</strong> to review a stream slot before creation, or restore archived slots directly from the grid.
            </span>
          )}
        </div>

        <ActionPanel
          action={action}
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={() => !busy && setAction(null)}
        />
      </div>
    </div>
  );
}
