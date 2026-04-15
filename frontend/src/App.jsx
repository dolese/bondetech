import { useState, useMemo, useEffect, useCallback } from "react";
import { API } from "./api";
import { useViewport } from "./utils/useViewport";

// Import extracted components
import { Dashboard } from "./components/Dashboard";
import { ClassWorkspace } from "./components/ClassWorkspace";
import { ReportCardModal } from "./components/ReportCardModal";
import { CSVImportModal } from "./components/CSVImportModal";
import { Splash } from "./components/Splash";
import { Landing } from "./components/Landing";

// Import utilities
import { DEFAULT_SUBJECTS, DEFAULT_SCHOOL } from "./utils/constants";
import { withPositions } from "./utils/grading";

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════

const normalizeStudent = (student) => ({
  ...student,
  index_no: student.index_no ?? student.indexNo ?? "",
  stream: student.stream ?? "",
  scores: Array.isArray(student.scores) ? student.scores : [],
});

const normalizeClass = (cls) => ({
  ...cls,
  school_info: cls.school_info ?? cls.schoolInfo ?? DEFAULT_SCHOOL,
  subjects: cls.subjects ?? DEFAULT_SUBJECTS,
  students: (cls.students ?? []).map(normalizeStudent),
});

const toApiStudent = (student) => ({
  indexNo: student.indexNo ?? student.index_no ?? "",
  name: student.name ?? "",
  stream: student.stream ?? "",
  sex: student.sex ?? "M",
  status: student.status ?? "present",
  scores: Array.isArray(student.scores)
    ? student.scores
    : (student.grades ?? []).map(g => g?.score ?? ""),
});

export default function App() {
  const [classes, setClasses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loggedIn, setLoggedIn] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { isMobile } = useViewport();
  const topBarHeight = isMobile ? 52 : 46;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!loggedIn) return;
    setLoading(true);
    setError(null);
    API.getClasses()
      .then(data => {
        const normalized = data.map(normalizeClass);
        setClasses(normalized);
        if (normalized.length) {
          setActiveId(normalized[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot connect to server. Check your API configuration and try again.");
        setLoading(false);
      });
  }, [loggedIn]);

  const refreshClass = useCallback(async (id) => {
    try {
      const fresh = normalizeClass(await API.getClass(id));
      setClasses(prev => prev.map(c => (c.id === id ? fresh : c)));
    } catch (err) {
      // Keep UI responsive if refresh fails
    }
  }, []);

  useEffect(() => {
    if (loggedIn && activeId) {
      refreshClass(activeId);
    }
  }, [activeId, refreshClass, loggedIn]);

  useEffect(() => {
    if (isMobile) {
      setSideOpen(false);
    }
  }, [isMobile]);

  const activeClass = classes.find(c => c.id === activeId) ?? classes[0];

  const allComputed = useMemo(() => {
    return classes.map(c => ({
      ...c,
      computed: withPositions(c.students ?? [], c.subjects ?? DEFAULT_SUBJECTS),
    }));
  }, [classes]);

  const activeComputed = useMemo(() => {
    if (!activeClass) return [];
    return withPositions(activeClass.students ?? [], activeClass.subjects ?? DEFAULT_SUBJECTS);
  }, [activeClass]);

  // ── Class CRUD ──────────────────────────────────────────────────────────────
  const addClass = async () => {
    try {
      const c = await API.createClass({
        name: `Class ${classes.length + 1}`,
        schoolInfo: DEFAULT_SCHOOL,
        subjects: DEFAULT_SUBJECTS,
      });
      const normalized = normalizeClass({ ...c, students: [] });
      setClasses(prev => [...prev, normalized]);
      setActiveId(c.id);
      setPage("class");
      setRenamingId(c.id);
      setRenameVal(c.name);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deleteClass = async (id) => {
    try {
      await API.deleteClass(id);
      setClasses(prev => prev.filter(c => c.id !== id));
      if (activeId === id) {
        setActiveId(classes.find(c => c.id !== id)?.id ?? null);
      }
      setConfirmDel(null);
      showToast("Class deleted");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const confirmRename = async () => {
    if (!renameVal.trim()) {
      setRenamingId(null);
      return;
    }

    try {
      await API.updateClass(renamingId, { name: renameVal.trim() });
      setClasses(prev =>
        prev.map(c =>
          c.id === renamingId ? { ...c, name: renameVal.trim() } : c
        )
      );
      setRenamingId(null);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ── Student CRUD ───────────────────────────────────────────────────────────
  const onAddStudent = async (studentData) => {
    if (!activeClass) return;
    try {
      await API.addStudent(activeClass.id, toApiStudent(studentData));
      await refreshClass(activeClass.id);
      showToast("Student added");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onUpdateStudent = async (studentData, opts = {}) => {
    if (!activeClass) return;
    try {
      await API.updateStudent(activeClass.id, studentData.id, toApiStudent(studentData));
      await refreshClass(activeClass.id);
      if (!opts.silent) {
        showToast("Student updated");
      }
      return { ok: true };
    } catch (err) {
      if (!opts.silent) {
        showToast(err.message, "error");
      }
      return { ok: false, error: err.message };
    }
  };

  const onDeleteStudent = async (studentId) => {
    if (!activeClass) return;
    try {
      await API.deleteStudent(activeClass.id, studentId);
      await refreshClass(activeClass.id);
      showToast("Student deleted");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onBulkImport = async (rows) => {
    if (!activeClass) return;
    try {
      const payload = rows.map(toApiStudent);
      await API.bulkImport(activeClass.id, payload);
      await refreshClass(activeClass.id);
      showToast(`Imported ${rows.length} students`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onUpdateSchool = async (schoolInfo) => {
    if (!activeClass) return;
    try {
      await API.updateClass(activeClass.id, { schoolInfo });
      await refreshClass(activeClass.id);
      showToast("School info updated");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onUpdateSubjects = async (subjects) => {
    if (!activeClass) return;
    try {
      await API.updateClass(activeClass.id, { subjects });
      await refreshClass(activeClass.id);
      showToast("Subjects updated");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onUpdateClassMeta = async ({ year, form }) => {
    if (!activeClass) return;
    try {
      await API.updateClass(activeClass.id, { year, form });
      await refreshClass(activeClass.id);
      showToast("Class info updated");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onShowModal = (type, studentId = null) => {
    setModalType(type);
    if (studentId) {
      const found = activeComputed.find(s => s.id === studentId) ?? null;
      setSelectedStudent(found);
    }
  };

  const onCloseModal = () => {
    setModalType(null);
    setSelectedStudent(null);
  };

  const onOpenReportCard = (studentId) => {
    if (!studentId) return;
    const found = activeComputed.find(s => s.id === studentId) ?? null;
    setSelectedStudent(found);
    setModalType("report-card");
  };


  if (!loggedIn) {
    return (
      <Landing
        onLogin={() => {
          setLoggedIn(true);
          setPage("dashboard");
        }}
      />
    );
  }

  if (loading) return <Splash text="Loading data..." />;
  if (error) return <Splash text={error} isError />;

  const sidebarWidth = 232;

  return (
    <div style={{ ...S.root, ...(isMobile ? { overflow: "hidden" } : {}) }}>
      {toast && (
        <div
          style={{
            ...S.toast,
            background:
              toast.type === "error"
                ? "#a80000"
                : toast.type === "warning"
                ? "#d97706"
                : "#0b6b3a",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* SIDEBAR */}
      {isMobile && sideOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 19,
          }}
          onClick={() => setSideOpen(false)}
        />
      )}
      <div
        style={{
          ...S.sidebar,
          width: isMobile ? sidebarWidth : sideOpen ? sidebarWidth : 0,
          overflow: "hidden",
          transition: isMobile ? "transform 0.25s" : "width 0.25s",
          position: isMobile ? "fixed" : "relative",
          top: isMobile ? topBarHeight : 0,
          left: 0,
          height: isMobile ? `calc(100vh - ${topBarHeight}px)` : "auto",
          zIndex: isMobile ? 20 : "auto",
          transform: isMobile && !sideOpen ? `translateX(-${sidebarWidth}px)` : "translateX(0)",
        }}
      >
        <div style={S.sideInner}>
          <div style={S.sideLogo}>
            <span style={{ fontSize: 24 }}>🎓</span>
            <div>
              <div style={S.sideTitle}>BONDE SEC</div>
              <div style={S.sideSub}>Result System</div>
            </div>
          </div>

          <button
            onClick={() => {
              setPage("dashboard");
              if (isMobile) setSideOpen(false);
            }}
            style={{ ...S.dashBtn, ...(page === "dashboard" ? S.dashBtnOn : {}) }}
          >
            📊 Dashboard
          </button>

          <div style={S.sideSection}>CLASSES</div>
          <div style={S.classList}>
            {classes.map(cl => (
              <div key={cl.id} style={{ ...S.clItem, ...(cl.id === activeId && page === "class" ? S.clItemOn : {}) }}>
                {renamingId === cl.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    style={S.renInp}
                    onChange={e => setRenameVal(e.target.value)}
                    onBlur={confirmRename}
                    onKeyDown={e => {
                      if (e.key === "Enter") confirmRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                  />
                ) : (
                  <span
                    style={S.clName}
                    onClick={() => {
                      setActiveId(cl.id);
                      setPage("class");
                      if (isMobile) setSideOpen(false);
                    }}
                  >
                    📋 {cl.name}
                    <span style={S.clBadge}>{cl.studentCount ?? cl.students?.length ?? 0}</span>
                  </span>
                )}
                <div style={{ ...S.clActs, ...(isMobile ? { opacity: 1 } : {}) }}>
                  <button style={S.iBtn} title="Rename" onClick={() => { setRenamingId(cl.id); setRenameVal(cl.name); }}>✏️</button>
                  <button style={S.iBtn} title="Delete" onClick={() => setConfirmDel(cl.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addClass} style={S.addClBtn}>+ New Class</button>
          <div style={S.sideFooter}>
            <span style={{ color: "#5dbb6b", fontSize: 10, fontWeight: 700 }}>🗄️ Firebase / Firestore</span>
            <br />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>Data persists on server</span>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        <div style={{ ...S.topBar, height: topBarHeight, padding: isMobile ? "0 10px" : "0 16px" }}>
          <button style={S.menuBtn} onClick={() => setSideOpen(p => !p)}>☰</button>
          {!isMobile && <span style={S.topBrand}>🎓 BONDE SEC SCHOOL — RESULT SYSTEM</span>}
          <span style={{ ...S.topCls, ...(isMobile ? { fontSize: 10, padding: "3px 8px" } : {}) }}>
            {page === "dashboard" ? "📊 Dashboard" : activeClass?.name ?? ""}
          </span>
          <button
            style={{ ...S.logoutBtn, ...(isMobile ? { padding: "5px 8px", fontSize: 10 } : {}) }}
            onClick={() => {
              setLoggedIn(false);
              setClasses([]);
              setActiveId(null);
              setPage("dashboard");
            }}
          >
            Log out
          </button>
        </div>

        {/* Delete confirm dialog */}
        {confirmDel && (
          <div style={S.overlay}>
            <div style={S.dialog}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#8b2500", marginBottom: 8 }}>Delete Class?</div>
              <div style={{ fontSize: 13, color: "#444", marginBottom: 20 }}>
                Permanently delete <b>{classes.find(c => c.id === confirmDel)?.name}</b> and all its student data?
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button style={S.btnGray} onClick={() => setConfirmDel(null)}>Cancel</button>
                <button style={S.btnRed} onClick={() => deleteClass(confirmDel)}>Delete</button>
              </div>
            </div>
          </div>
        )}

        <div style={S.content}>
          {page === "dashboard" ? (
            <Dashboard
              allComputed={allComputed}
              onOpenClass={(id) => {
                setActiveId(id);
                setPage("class");
              }}
            />
          ) : activeClass ? (
            <ClassWorkspace
              classData={activeClass}
              computed={activeComputed}
              onShowModal={onShowModal}
              onUpdateStudent={onUpdateStudent}
              onDeleteStudent={onDeleteStudent}
              onAddStudent={onAddStudent}
              onUpdateSchool={onUpdateSchool}
              onUpdateSubjects={onUpdateSubjects}
              onUpdateClassMeta={onUpdateClassMeta}
              onOpenReportCard={onOpenReportCard}
            />
          ) : (
            <Splash text="Select a class from the sidebar" />
          )}
        </div>
      </div>

      {modalType === "csv-import" && activeClass && (
        <CSVImportModal
          classId={activeClass.id}
          subjects={activeClass.subjects ?? []}
          onImport={onBulkImport}
          onClose={onCloseModal}
        />
      )}

      {modalType === "report-card" && activeClass && (
        <ReportCardModal
          student={selectedStudent}
          classData={activeClass}
          onClose={onCloseModal}
        />
      )}

      {modalType === "report-card-export" && activeClass && (
        <ReportCardModal
          student={selectedStudent}
          classData={activeClass}
          onClose={onCloseModal}
          autoExport
          silent
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const S = {
  root: { display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI',Tahoma,sans-serif", background: "#e8edf5", color: "#1a1a2e", overflowY: "auto" },
  toast: { position: "fixed", top: 16, right: 16, zIndex: 9999, color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" },

  sidebar: { background: "#001a3d", flexShrink: 0 },
  sideInner: { width: 232, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" },
  sideLogo: { padding: "14px 14px 10px", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  sideTitle: { color: "#fff", fontWeight: 900, fontSize: 14, lineHeight: 1.2 },
  sideSub: { color: "#7ab3ff", fontSize: 9, fontWeight: 600, letterSpacing: 1 },
  dashBtn: { margin: "10px 10px 4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#c8d8f0", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, textAlign: "left" },
  dashBtnOn: { background: "rgba(100,160,255,0.22)", border: "1px solid rgba(100,160,255,0.4)", color: "#fff" },
  sideSection: { padding: "10px 14px 4px", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.28)", letterSpacing: 2, textTransform: "uppercase" },
  classList: { flex: 1, overflowY: "auto", padding: "4px 8px" },
  clItem: { display: "flex", alignItems: "center", borderRadius: 7, marginBottom: 3, padding: "5px 7px", transition: "background 0.15s", gap: 3 },
  clItemOn: { background: "rgba(100,160,255,0.2)", outline: "1.5px solid rgba(100,160,255,0.4)" },
  clName: { flex: 1, color: "#c8d8f0", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, cursor: "pointer" },
  clBadge: { background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "1px 6px", fontSize: 9, fontWeight: 700, color: "#7ab3ff", flexShrink: 0 },
  clMeta: { color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700, paddingRight: 4 },
  clActs: { display: "flex", gap: 1, opacity: 0.5 },
  iBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "1px", lineHeight: 1 },
  renInp: { flex: 1, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(100,160,255,0.5)", borderRadius: 4, color: "#fff", padding: "2px 6px", fontSize: 11, outline: "none" },
  addClBtn: { margin: "6px 10px", background: "rgba(100,160,255,0.12)", border: "1.5px dashed rgba(100,160,255,0.4)", color: "#7ab3ff", borderRadius: 7, padding: "7px", fontSize: 11, cursor: "pointer", fontWeight: 700 },
  sideFooter: { padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.07)" },
  yearHeader: { padding: "8px 8px 4px", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase" },

  main: { flex: 1, display: "flex", flexDirection: "column" },
  topBar: { background: "rgba(0,51,102,0.88)", padding: "0 16px", display: "flex", alignItems: "center", gap: 12, height: 46, flexShrink: 0, boxShadow: "0 6px 20px rgba(0,0,0,0.25)", position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.12)" },
  menuBtn: { background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: "4px 6px" },
  topBrand: { color: "#fff", fontWeight: 800, fontSize: 13, flex: 1, letterSpacing: 0.3 },
  topCls: { color: "#d7e6ff", fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.15)" },
  logoutBtn: { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 6, cursor: "pointer" },
  content: { flex: 1, display: "flex", flexDirection: "column" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  dialog: { background: "#fff", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.3)", padding: 20, maxWidth: 420, width: "90%" },

  btnGray: { background: "#eee", border: "none", borderRadius: 7, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 12 },
  btnRed: { background: "#cc2222", color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 12 },
};
