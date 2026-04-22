import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import { API } from "./api";
import { useViewport } from "./utils/useViewport";

// Import extracted components
import { Dashboard } from "./components/Dashboard";
import { StudentsPage } from "./components/StudentsPage";
import { ResultsPage } from "./components/ResultsPage";
import { ReportsPage } from "./components/ReportsPage";
import { SettingsPage } from "./components/SettingsPage";
import { ReportCardModal } from "./components/ReportCardModal";
import { CSVImportModal } from "./components/CSVImportModal";
import { JSONImportModal } from "./components/JSONImportModal";
import { Splash } from "./components/Splash";
import { Landing } from "./components/Landing";
import { ExamPickerScreen } from "./components/ExamPickerScreen";
import { StudentProfilePage } from "./components/StudentProfilePage";

// Import utilities
import { DEFAULT_SUBJECTS, DEFAULT_SCHOOL, DEFAULT_EXAM_TYPE } from "./utils/constants";
import { withPositions } from "./utils/grading";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const FORMS = ["Form I", "Form II", "Form III", "Form IV"];
const MOBILE_NAV_HEIGHT = 94;

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAV ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const HomeNavIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const StudentsNavIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);
const ResultsNavIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
);
const ReportsNavIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </svg>
);
const SettingsNavIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════

const normalizeStudent = (student) => {
  const scores = Array.isArray(student.scores) ? student.scores : [];
  const rawExamScores = (student.examScores && typeof student.examScores === "object") ? student.examScores : {};
  // Legacy migration: students created before per-exam storage only have a top-level
  // `scores` field.  Map those scores to the default exam so they remain visible.
  const examScores =
    Object.keys(rawExamScores).length === 0 && scores.length > 0
      ? { [DEFAULT_EXAM_TYPE]: scores }
      : rawExamScores;
  return {
    ...student,
    index_no: student.index_no ?? student.indexNo ?? "",
    remarks: student.remarks ?? "",
    scores,
    examScores,
  };
};

const normalizeClass = (cls) => ({
  ...cls,
  school_info: cls.school_info ?? cls.schoolInfo ?? DEFAULT_SCHOOL,
  subjects: cls.subjects ?? DEFAULT_SUBJECTS,
  students: (cls.students ?? []).map(normalizeStudent),
  archived: cls.archived ?? false,
  published: cls.published ?? false,
  publishedAt: cls.publishedAt ?? cls.published_at ?? null,
  monthly_exams: Array.isArray(cls.monthly_exams)
    ? cls.monthly_exams
    : Array.isArray(cls.monthlyExams)
    ? cls.monthlyExams
    : [],
});

const toApiStudent = (student) => ({
  indexNo: student.indexNo ?? student.index_no ?? "",
  name: student.name ?? "",
  sex: student.sex ?? "M",
  status: student.status ?? "present",
  remarks: student.remarks ?? "",
  scores: Array.isArray(student.scores)
    ? student.scores
    : (student.grades ?? []).map(g => g?.score ?? ""),
  examType: student.examType,
});

export default function App() {
  const [classes, setClasses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeExam, setActiveExam] = useState(DEFAULT_EXAM_TYPE);
  const [page, setPage] = useState("dashboard");
  const [loggedIn, setLoggedIn] = useState(false);
  const [sideOpen, setSideOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 720 : true
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [examPickerClass, setExamPickerClass] = useState(null); // class object shown in exam picker
  const [auditLogs, setAuditLogs] = useState(null);
  const [searchProfileIndexNo, setSearchProfileIndexNo] = useState(null);
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
        // Expand all years that have classes, and always expand the current year
        const years = new Set(normalized.map(c => c.year).filter(Boolean));
        years.add(String(new Date().getFullYear()));
        setExpandedYears(years);
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
    // Reset audit log cache when switching classes
    setAuditLogs(null);
  }, [activeId, refreshClass, loggedIn]);

  useEffect(() => {
    if (isMobile) {
      setSideOpen(false);
    }
  }, [isMobile]);

  const activeClass = classes.find(c => c.id === activeId) ?? classes[0];

  // Sync activeExam to the selected class's saved exam whenever the active class changes.
  useEffect(() => {
    setActiveExam(activeClass?.school_info?.exam || DEFAULT_EXAM_TYPE);
  }, [activeClass?.id]); // only re-run when the selected class changes

  // Helper: resolve a student's scores for a given exam type.
  const resolveExamScores = useCallback((student, examType) => {
    const examScores = student.examScores ?? {};
    // Only return scores that were explicitly saved for this exam.
    // Do NOT fall back to the generic `scores` field — that field always holds
    // the most-recently-saved exam's data and would cause marks from one exam
    // to bleed into every other exam.
    return examScores[examType] ?? [];
  }, []);

  const allComputed = useMemo(() => {
    return classes.map(c => {
      const examType = c.school_info?.exam || DEFAULT_EXAM_TYPE;
      const studentsWithExamScores = (c.students ?? []).map(s => ({
        ...s,
        scores: resolveExamScores(s, examType),
      }));
      return {
        ...c,
        computed: withPositions(studentsWithExamScores, c.subjects ?? DEFAULT_SUBJECTS),
      };
    });
  }, [classes, resolveExamScores]);

  const activeComputed = useMemo(() => {
    if (!activeClass) return [];
    const studentsWithExamScores = (activeClass.students ?? []).map(s => ({
      ...s,
      scores: resolveExamScores(s, activeExam),
    }));
    return withPositions(studentsWithExamScores, activeClass.subjects ?? DEFAULT_SUBJECTS);
  }, [activeClass, activeExam, resolveExamScores]);

  // Group classes by year (sorted descending).
  // Auto-include all years from 2026 up to the current year so year rows and
  // their Form I–IV slots are visible even before any class is created.
  const classesByYear = useMemo(() => {
    const map = {};
    classes.forEach(cl => {
      if (!cl.year) return;
      if (!map[cl.year]) map[cl.year] = [];
      map[cl.year].push(cl);
    });
    const currentYear = new Date().getFullYear();
    for (let y = 2026; y <= currentYear; y++) {
      const key = String(y);
      if (!map[key]) map[key] = [];
    }
    return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a));
  }, [classes]);

  // Classes that have no year set (unorganized)
  const unorganizedClasses = useMemo(
    () => classes.filter(c => !c.year),
    [classes]
  );

  const toggleYear = (year) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  // ── Class CRUD ──────────────────────────────────────────────────────────────
  const addClass = async (opts = {}) => {
    try {
      const year = opts.year || DEFAULT_SCHOOL.year;
      const form = opts.form || FORMS[0];
      // Prevent duplicate (year, form) combinations
      if (classes.some(c => c.year === year && c.form === form)) {
        showToast(`${form} ${year} already exists`, "error");
        return;
      }
      const c = await API.createClass({
        name: `${form} ${year}`,
        schoolInfo: DEFAULT_SCHOOL,
        subjects: DEFAULT_SUBJECTS,
        year,
        form,
      });
      const normalized = normalizeClass({ ...c, students: [] });
      setClasses(prev => [...prev, normalized]);
      setActiveId(c.id);
      setPage("students");
      // Ensure the new class's year is expanded in the sidebar
      setExpandedYears(prev => new Set([...prev, year]));
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deleteClass = async (id) => {
    try {
      await API.deleteClass(id);
      setClasses(prev => prev.filter(c => c.id !== id));
      if (activeId === id) {
        const remaining = classes.find(c => c.id !== id);
        setActiveId(remaining?.id ?? null);
        setPage(remaining ? "students" : "dashboard");
      }
      setConfirmDel(null);
      showToast("Class deleted");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ── Student CRUD ───────────────────────────────────────────────────────────
  const onAddStudent = async (studentData) => {
    if (!activeClass) return;
    try {
      await API.addStudent(activeClass.id, toApiStudent({ ...studentData, examType: activeExam }));
      await refreshClass(activeClass.id);
      showToast("Student added");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onUpdateStudent = async (studentData, opts = {}) => {
    if (!activeClass) return;
    try {
      await API.updateStudent(activeClass.id, studentData.id, toApiStudent({ ...studentData, examType: studentData.examType ?? activeExam }));
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
      const payload = rows.map(r => toApiStudent({ ...r, examType: activeExam }));
      const result = await API.bulkImport(activeClass.id, payload, activeExam);
      await refreshClass(activeClass.id);
      const { created = 0, updated = 0, skipped = 0 } = result ?? {};
      const parts = [];
      if (created > 0) parts.push(`${created} new`);
      if (updated > 0) parts.push(`${updated} updated`);
      if (skipped > 0) parts.push(`${skipped} unchanged`);
      showToast(parts.length ? `Import done: ${parts.join(", ")}` : "Nothing to import");
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

  const onUpdateMonthlyExams = async (monthlyExams) => {
    if (!activeClass) return;
    try {
      await API.updateClass(activeClass.id, { monthlyExams });
      setClasses(prev =>
        prev.map(c => c.id === activeClass.id ? { ...c, monthly_exams: monthlyExams } : c)
      );
      await refreshClass(activeClass.id);
      showToast("Monthly exams updated");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onUpdateClassMeta = async ({ year, form, name }) => {
    if (!activeClass) return;
    try {
      const updates = {};
      if (year !== undefined) updates.year = year;
      if (form !== undefined) updates.form = form;
      if (name !== undefined) updates.name = name.trim();
      // Prevent duplicate (year, form) combinations on other classes
      const newYear = updates.year ?? activeClass.year;
      const newForm = updates.form ?? activeClass.form;
      if ((updates.year !== undefined || updates.form !== undefined) &&
          classes.some(c => c.id !== activeClass.id && c.year === newYear && c.form === newForm)) {
        showToast(`${newForm} ${newYear} already exists`, "error");
        return;
      }
      await API.updateClass(activeClass.id, updates);
      // Update local state immediately so sidebar reflects the rename
      setClasses(prev =>
        prev.map(c => (c.id === activeClass.id ? { ...c, ...updates } : c))
      );
      await refreshClass(activeClass.id);
      // Expand the new year in the sidebar if it changed
      if (year) {
        setExpandedYears(prev => new Set([...prev, year]));
      }
      showToast("Class info updated");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Silently persist the active exam to a class's school_info so it is
  // remembered per-form across sessions.
  const saveExamForClass = useCallback(async (classObj, exam) => {
    if (!classObj) return;
    try {
      const updated_school_info = { ...(classObj.school_info ?? DEFAULT_SCHOOL), exam };
      await API.updateClass(classObj.id, { schoolInfo: updated_school_info });
      // Update local state immediately without a full refresh to avoid flicker
      setClasses(prev =>
        prev.map(c =>
          c.id === classObj.id
            ? { ...c, school_info: { ...(c.school_info ?? {}), exam } }
            : c
        )
      );
    } catch (_err) {
      // Silent – exam persistence is best-effort
    }
  }, []);

  const onArchiveClass = async () => {
    if (!activeClass) return;
    try {
      await API.deleteClass(activeClass.id); // soft delete
      setClasses(prev => prev.map(c => c.id === activeClass.id ? { ...c, archived: true } : c));
      showToast("Class archived");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onRestoreClass = async () => {
    if (!activeClass) return;
    try {
      const updated = normalizeClass(await API.restoreClass(activeClass.id));
      setClasses(prev => prev.map(c => c.id === activeClass.id ? { ...updated, students: c.students } : c));
      showToast("Class restored");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onPublishClass = async () => {
    if (!activeClass) return;
    try {
      const result = await API.publishClass(activeClass.id);
      setClasses(prev => prev.map(c => c.id === activeClass.id
        ? { ...c, published: result.published, publishedAt: result.published_at }
        : c));
      showToast("Results published");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onUnpublishClass = async () => {
    if (!activeClass) return;
    try {
      await API.unpublishClass(activeClass.id);
      setClasses(prev => prev.map(c => c.id === activeClass.id
        ? { ...c, published: false, publishedAt: null }
        : c));
      showToast("Results unpublished");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onExportBackup = async () => {
    try {
      const data = await API.backup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `school-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Backup exported");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onImportBackup = async (parsed) => {
    try {
      if (!parsed || !Array.isArray(parsed.classes)) {
        showToast("Invalid backup file", "error");
        return;
      }
      const result = await API.restore(parsed);
      showToast(`Restore: ${result.created} created, ${result.skipped} skipped`);
      // Reload classes
      const data = await API.getClasses();
      setClasses(data.map(normalizeClass));
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const onLoadAuditLog = async () => {
    if (!activeClass) return;
    try {
      const logs = await API.getAuditLog(activeClass.id);
      setAuditLogs(logs);
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

  // Called when the user changes the exam in the workspace toolbar.
  // Updates local state immediately and silently persists the choice to the class.
  const onChangeExam = useCallback((exam) => {
    setActiveExam(exam);
    saveExamForClass(activeClass, exam);
  }, [activeClass, saveExamForClass]);

  // Called when the user picks an exam in the ExamPickerScreen.
  const handleExamPickerSelect = useCallback((exam) => {
    const cls = examPickerClass;
    setExamPickerClass(null);
    if (!cls) return;
    setActiveId(cls.id);
    setActiveExam(exam);
    saveExamForClass(cls, exam);
    setPage("students");
    if (isMobile) setSideOpen(false);
  }, [examPickerClass, saveExamForClass, isMobile]);


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

  const sidebarWidth = 240;
  const isClassPage = ["students", "results", "reports", "settings"].includes(page);

  // Top bar label
  const topBarLabel = (() => {
    if (page === "dashboard") return "📊 Dashboard";
    if (page === "profile") return "👤 Student Profile";
    if (!activeClass) return "";
    const parts = [];
    if (activeClass.form) parts.push(activeClass.form);
    if (activeClass.year) parts.push(activeClass.year);
    return parts.join(" — ");
  })();

  const closeSide = () => { if (isMobile) setSideOpen(false); };

  // Friendly empty state shown on class-specific pages when no class is selected.
  const noClassBlock = (
    <div style={{
      display: "flex",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16,
      padding: 24,
      background: "#f8fafc",
    }}>
      <div style={{ fontSize: 52 }}>📂</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#003366" }}>No class selected</div>
      <div style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>
        {isMobile
          ? "Tap the button below to browse classes."
          : "Choose a class from the sidebar to get started."}
      </div>
      {isMobile && (
        <button
          onClick={() => setSideOpen(true)}
          style={{
            padding: "10px 24px",
            background: "#003366",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,51,102,0.25)",
          }}
        >
          ☰ Select Class
        </button>
      )}
    </div>
  );

  const NAV_ITEMS = [
    { key: "students", icon: "👥", label: "Students" },
    { key: "results",  icon: "📋", label: "Results"  },
    { key: "reports",  icon: "📄", label: "Reports"  },
    { key: "settings", icon: "⚙️",  label: "Settings" },
  ];

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

      {/* SIDEBAR OVERLAY (mobile) */}
      {isMobile && sideOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 19 }}
          onClick={() => setSideOpen(false)}
        />
      )}

      {/* SIDEBAR */}
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
          {/* Logo */}
          <div style={S.sideLogo}>
            <span style={{ fontSize: 24 }}>🎓</span>
            <div>
              <div style={S.sideTitle}>BONDE SEC</div>
              <div style={S.sideSub}>{isMobile ? "Select a class" : "Result System"}</div>
            </div>
          </div>

          {/* Dashboard */}
          <button
            onClick={() => { setPage("dashboard"); closeSide(); }}
            style={{ ...S.navBtn, ...(page === "dashboard" ? S.navBtnOn : {}) }}
          >
            📊 Dashboard
          </button>

          {/* Students — year → form hierarchy */}
          <div style={S.sideSection}>STUDENTS</div>
          <div style={S.classList}>
            {classesByYear.map(([year, yearClasses]) => (
              <div key={year}>
                {/* Year header row */}
                <div style={S.yearRow} onClick={() => toggleYear(year)}>
                  <span style={S.yearLabel}>
                    {expandedYears.has(year) ? "▾" : "▸"} {year}
                  </span>
                  {yearClasses.length < FORMS.length && (
                    <button
                      style={S.addYearBtn}
                      title={`Add new class for ${year}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextForm = FORMS.find(f => !yearClasses.some(c => c.form === f));
                        if (nextForm) addClass({ year, form: nextForm });
                      }}
                    >
                      +
                    </button>
                  )}
                </div>

                {/* Form slots */}
                {expandedYears.has(year) && FORMS.map(form => {
                  const cls = yearClasses.find(c => c.form === form);
                  const isActive = cls && cls.id === activeId && isClassPage;
                  return (
                    <div
                      key={form}
                      style={{
                        ...S.formItem,
                        ...(isActive ? S.formItemOn : {}),
                        ...(cls ? {} : S.formItemEmpty),
                      }}
                      onClick={() => {
                        if (cls) {
                          setExamPickerClass(cls);
                        } else {
                          addClass({ year, form });
                        }
                      }}
                      title={cls ? cls.name : `Create ${form} ${year}`}
                    >
                      <span style={S.formLabel}>{form}</span>
                      {cls ? (
                        <span style={S.clBadge}>
                          {cls.studentCount ?? cls.students?.length ?? 0}
                        </span>
                      ) : (
                        <span style={S.addSlotBtn}>+</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Unorganized classes (no year set) */}
            {unorganizedClasses.length > 0 && (
              <div>
                <div style={{ ...S.yearRow, cursor: "default" }}>
                  <span style={{ ...S.yearLabel, color: "rgba(255,255,255,0.3)" }}>Unorganized</span>
                </div>
                {unorganizedClasses.map(cl => (
                  <div
                    key={cl.id}
                    style={{
                      ...S.formItem,
                      ...(cl.id === activeId && isClassPage ? S.formItemOn : {}),
                    }}
                    onClick={() => { setExamPickerClass(cl); }}
                    title={cl.name}
                  >
                    <span style={{ ...S.formLabel, color: "#c8d8f0" }}>📋 {cl.name}</span>
                    <span style={S.clBadge}>
                      {cl.studentCount ?? cl.students?.length ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-class nav items */}
          <div style={S.sideSection}>CLASS</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => { if (activeClass) { setPage(item.key); closeSide(); } }}
              disabled={!activeClass}
              style={{
                ...S.navBtn,
                ...(page === item.key ? S.navBtnOn : {}),
                ...(!activeClass ? S.navBtnDisabled : {}),
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}

          <div style={S.sideFooter}>
            <span style={{ color: "#5dbb6b", fontSize: 10, fontWeight: 700 }}>🗄️ Firebase / Firestore</span>
            <br />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>Data persists on server</span>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        {/* Top bar */}
        <div style={{ ...S.topBar, height: topBarHeight, padding: isMobile ? "0 10px" : "0 16px" }}>
          <button style={S.menuBtn} onClick={() => setSideOpen(p => !p)}>☰</button>
          {!isMobile && <span style={S.topBrand}>🎓 BONDE SEC SCHOOL — RESULT SYSTEM</span>}
          {isMobile ? (
            <button
              style={{ ...S.topCls, fontSize: 10, padding: "3px 8px", cursor: "pointer", background: "rgba(255,255,255,0.16)" }}
              onClick={() => setSideOpen(true)}
              title="Switch class"
            >
              {topBarLabel || "Select class"}
            </button>
          ) : (
            <span style={S.topCls}>{topBarLabel}</span>
          )}
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

        {/* Page content */}
        <div style={{ ...S.content, ...(isMobile ? { paddingBottom: MOBILE_NAV_HEIGHT } : {}) }}>
          {page === "dashboard" && (
            <Dashboard
              allComputed={allComputed}
              onOpenClass={(id) => {
                setActiveId(id);
                setPage("students");
              }}
              onViewProfile={(indexNo) => {
                setSearchProfileIndexNo(indexNo);
                setPage("profile");
              }}
            />
          )}

          {page === "students" && (
            activeClass ? (
              <StudentsPage
                classData={activeClass}
                computed={activeComputed}
                onShowModal={onShowModal}
                onUpdateStudent={onUpdateStudent}
                onDeleteStudent={onDeleteStudent}
                onAddStudent={onAddStudent}
                activeExam={activeExam}
                onChangeExam={onChangeExam}
              />
            ) : (
              noClassBlock
            )
          )}

          {page === "results" && (
            activeClass ? (
              <ResultsPage
                classData={{ ...activeClass, school_info: { ...(activeClass.school_info ?? {}), exam: activeExam } }}
                computed={activeComputed}
                onOpenReportCard={onOpenReportCard}
              />
            ) : (
              noClassBlock
            )
          )}

          {page === "reports" && (
            activeClass ? (
              <ReportsPage
                classData={{ ...activeClass, school_info: { ...(activeClass.school_info ?? {}), exam: activeExam } }}
                computed={activeComputed}
                onOpenReportCard={onOpenReportCard}
              />
            ) : (
              noClassBlock
            )
          )}

          {page === "settings" && (
            activeClass ? (
              <SettingsPage
                classData={activeClass}
                onUpdateClassMeta={onUpdateClassMeta}
                onUpdateSchool={onUpdateSchool}
                onUpdateSubjects={onUpdateSubjects}
                onUpdateMonthlyExams={onUpdateMonthlyExams}
                onDeleteClass={() => setConfirmDel(activeClass.id)}
                onArchiveClass={onArchiveClass}
                onRestoreClass={onRestoreClass}
                onPublishClass={onPublishClass}
                onUnpublishClass={onUnpublishClass}
                onExportBackup={onExportBackup}
                onImportBackup={onImportBackup}
                auditLogs={auditLogs}
                onLoadAuditLog={onLoadAuditLog}
              />
            ) : (
              noClassBlock
            )
          )}

          {page === "profile" && searchProfileIndexNo && (
            <StudentProfilePage
              indexNo={searchProfileIndexNo}
              onBack={() => setPage("dashboard")}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {modalType === "csv-import" && activeClass && (
        <CSVImportModal
          classId={activeClass.id}
          subjects={activeClass.subjects ?? []}
          onImport={onBulkImport}
          onClose={onCloseModal}
        />
      )}

      {modalType === "json-import" && activeClass && (
        <JSONImportModal
          classId={activeClass.id}
          subjects={activeClass.subjects ?? []}
          onImport={onBulkImport}
          onClose={onCloseModal}
        />
      )}

      {modalType === "report-card" && activeClass && (
        <ReportCardModal
          student={selectedStudent}
          classData={{ ...activeClass, school_info: { ...(activeClass.school_info ?? {}), exam: activeExam } }}
          onClose={onCloseModal}
        />
      )}

      {modalType === "report-card-export" && activeClass && (
        <ReportCardModal
          student={selectedStudent}
          classData={{ ...activeClass, school_info: { ...(activeClass.school_info ?? {}), exam: activeExam } }}
          onClose={onCloseModal}
          autoExport
          silent
        />
      )}

      {/* Exam picker — shown when user clicks a Form in the sidebar */}
      {examPickerClass && (
        <ExamPickerScreen
          classData={examPickerClass}
          onPick={handleExamPickerSelect}
          onCancel={() => setExamPickerClass(null)}
        />
      )}

      {/* BOTTOM NAV TABS (mobile only) */}
      {isMobile && (
        <nav style={S.bottomNav}>
          {[
            { key: "dashboard", Icon: HomeNavIcon,     label: "Home"     },
            { key: "students",  Icon: StudentsNavIcon, label: "Students" },
            { key: "results",   Icon: ResultsNavIcon,  label: "Results"  },
            { key: "reports",   Icon: ReportsNavIcon,  label: "Report"   },
            { key: "settings",  Icon: SettingsNavIcon, label: "Settings" },
          ].map((item, idx) => {
            const isActive = page === item.key;
            const disabled = item.key !== "dashboard" && !activeClass;
            return (
              <Fragment key={item.key}>
                {idx > 0 && <div style={S.navTabDivider} />}}
                <button
                  key={item.key}
                  style={{
                    ...S.tabBtn,
                    ...(disabled ? S.tabBtnDisabled : {}),
                  }}
                  disabled={disabled}
                  onClick={() => setPage(item.key)}
                  aria-label={item.label}
                >
                  {isActive && <div style={S.tabActiveBar} />}
                  <div
                    style={{
                      ...S.tabIconCircle,
                      ...(isActive ? S.tabIconCircleActive : {}),
                    }}
                  >
                    <item.Icon />
                  </div>
                  <span
                    style={{
                      ...S.tabLabel,
                      ...(isActive ? S.tabLabelActive : {}),
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              </Fragment>
            );
          })}
        </nav>
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
  sideInner: { width: 240, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" },
  sideLogo: { padding: "14px 14px 10px", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  sideTitle: { color: "#fff", fontWeight: 900, fontSize: 14, lineHeight: 1.2 },
  sideSub: { color: "#7ab3ff", fontSize: 9, fontWeight: 600, letterSpacing: 1 },

  // Top-level nav buttons (Dashboard + Results/Reports/Settings)
  navBtn: { margin: "4px 10px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#c8d8f0", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, textAlign: "left", width: "calc(100% - 20px)" },
  navBtnOn: { background: "rgba(100,160,255,0.22)", border: "1px solid rgba(100,160,255,0.4)", color: "#fff" },
  navBtnDisabled: { opacity: 0.35, cursor: "not-allowed" },

  sideSection: { padding: "10px 14px 4px", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.28)", letterSpacing: 2, textTransform: "uppercase" },
  classList: { flex: 1, overflowY: "auto", padding: "4px 8px" },

  // Year row
  yearRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px 4px", cursor: "pointer", borderRadius: 6, marginBottom: 1 },
  yearLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" },
  addYearBtn: { background: "rgba(100,160,255,0.15)", border: "1px solid rgba(100,160,255,0.3)", color: "#7ab3ff", borderRadius: 4, padding: "0 5px", fontSize: 13, cursor: "pointer", lineHeight: "16px" },

  // Form slot items under a year
  formItem: { display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 6, marginBottom: 2, padding: "5px 10px 5px 18px", cursor: "pointer", transition: "background 0.15s" },
  formItemOn: { background: "rgba(100,160,255,0.2)", outline: "1.5px solid rgba(100,160,255,0.4)" },
  formItemEmpty: { opacity: 0.45 },
  formLabel: { color: "#c8d8f0", fontSize: 11, fontWeight: 600 },
  addSlotBtn: { color: "#7ab3ff", fontSize: 13, fontWeight: 700, paddingRight: 2 },
  clBadge: { background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "1px 6px", fontSize: 9, fontWeight: 700, color: "#7ab3ff", flexShrink: 0 },

  addClBtn: { margin: "6px 10px", background: "rgba(100,160,255,0.12)", border: "1.5px dashed rgba(100,160,255,0.4)", color: "#7ab3ff", borderRadius: 7, padding: "7px", fontSize: 11, cursor: "pointer", fontWeight: 700 },
  sideFooter: { padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.07)" },

  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topBar: { background: "rgba(0,51,102,0.88)", padding: "0 16px", display: "flex", alignItems: "center", gap: 12, height: 46, flexShrink: 0, boxShadow: "0 6px 20px rgba(0,0,0,0.25)", position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.12)" },
  menuBtn: { background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: "4px 6px" },
  topBrand: { color: "#fff", fontWeight: 800, fontSize: 13, flex: 1, letterSpacing: 0.3 },
  topCls: { color: "#d7e6ff", fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.15)" },
  logoutBtn: { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 6, cursor: "pointer" },
  content: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  dialog: { background: "#fff", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.3)", padding: 20, maxWidth: 420, width: "90%" },

  btnGray: { background: "#eee", border: "none", borderRadius: 7, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 12 },
  btnRed: { background: "#cc2222", color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 12 },

  bottomNav: { position: "fixed", bottom: 14, left: 14, right: 14, height: 76, background: "#fff", borderRadius: 24, display: "flex", alignItems: "center", zIndex: 30, boxShadow: "0 4px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)", overflow: "visible" },
  navTabDivider: { width: 1, height: 40, background: "rgba(0,0,0,0.07)", flexShrink: 0 },
  tabBtn: { flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: "0 0 4px", position: "relative", height: "100%" },
  tabBtnDisabled: { opacity: 0.3, cursor: "not-allowed" },
  tabActiveBar: { position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 36, height: 3, borderRadius: 2, background: "#0da8a8" },
  tabIconCircle: { width: 52, height: 52, borderRadius: "50%", background: "#eef0f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#3d4f6e", transition: "transform 0.22s ease, background 0.22s ease, box-shadow 0.22s ease" },
  tabIconCircleActive: { background: "linear-gradient(145deg, #1ac8c8, #0a8585)", color: "#fff", transform: "translateY(-16px)", boxShadow: "0 6px 20px rgba(0,168,168,0.45), 0 0 0 6px rgba(0,168,168,0.1)" },
  tabLabel: { fontSize: 10, fontWeight: 600, color: "#8898aa", letterSpacing: 0.2, lineHeight: 1 },
  tabLabelActive: { color: "#0da8a8", fontWeight: 700 },
};
