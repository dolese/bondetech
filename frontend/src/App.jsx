import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewport } from "./utils/useViewport";
import { Dashboard } from "./components/Dashboard";
import { StudentsPage } from "./components/StudentsPage";
import { ResultsPage } from "./components/ResultsPage";
import { ReportsPage } from "./components/ReportsPage";
import { TimetablePage } from "./components/Timetable/TimetablePage";
import { SettingsPage } from "./components/SettingsPage";
import { AccountPage } from "./components/AccountPage";
import { PeopleDirectoryPage } from "./components/PeopleDirectory/PeopleDirectoryPage";
import { ReportCardModal } from "./components/ReportCardModal";
import { CSVImportModal } from "./components/CSVImportModal";
import { JSONImportModal } from "./components/JSONImportModal";
import { XLSXImportModal } from "./components/XLSXImportModal";
import { StudentManagementPage } from "./components/StudentManagementPage";
import { SmsPage } from "./components/SmsPage";
import { AiAssistantPage } from "./components/AiAssistantPage";
import { FormsStreamsPage } from "./components/FormsStreamsPage";
import { SubjectsPage } from "./components/SubjectsPage";
import { ExamsPage } from "./components/ExamsPage";
import { ContentManagementPage } from "./components/ContentManagementPage/ContentManagementPage";
import { Splash } from "./components/Splash";
import { Landing } from "./components/Landing";
import { StudentProfilePage } from "./components/StudentProfilePage";
import { AppSidebar } from "./components/AppSidebar";
import { AppTopBar } from "./components/AppTopBar";
import { DeleteClassDialog } from "./components/DeleteClassDialog";
import { CommandPalette } from "./components/CommandPalette";
import { OnboardingTour } from "./components/OnboardingTour";
import { UserGuideModal } from "./components/UserGuideModal";
import { useSession } from "./hooks/useSession";
import { CLASS_FORMS, CLASS_STREAMS, useClasses } from "./hooks/useClasses";
import { API } from "./api";
import { useI18n } from "./i18n";
import { DEFAULT_EXAM_TYPE, DEFAULT_SCHOOL } from "./utils/constants";
import { mergeClassSchoolInfo, normalizeSchoolSettings } from "./utils/schoolSettings";
import { premiumFontStack } from "./utils/designSystem";
import { buildFormWorkspace } from "./utils/formClassAggregation";

const CLASS_ACCESS_ROLES = new Set(["admin", "academic", "teacher"]);

function getClassDisplayLabel(cls = {}, { includeYear = true } = {}) {
  const parts = [cls.form, cls.stream].filter(Boolean);
  const base = parts.join(" ").trim() || cls.name || "Unnamed Class";
  return includeYear && cls.year ? `${base} ${cls.year}` : base;
}

function getDefaultPageForUser(user) {
  if (!user) return "dashboard";
  if (CLASS_ACCESS_ROLES.has(user.role)) return "dashboard";
  return getLinkedStudentsForUser(user).length ? "profile" : "account";
}

function getLinkedStudentsForUser(user = {}) {
  const linkedStudents = Array.isArray(user?.linkedStudents) ? user.linkedStudents : [];
  const normalized = linkedStudents
    .map((entry) => ({
      admissionNo: String(entry?.admissionNo || entry?.admission_no || "").trim().toUpperCase(),
      indexNo: String(entry?.indexNo || entry?.index_no || "").trim(),
    }))
    .filter((entry) => entry.admissionNo || entry.indexNo);

  if (normalized.length) {
    return normalized.filter(
      (entry, index, collection) =>
        collection.findIndex(
          (candidate) =>
            candidate.admissionNo === entry.admissionNo && candidate.indexNo === entry.indexNo
        ) === index
    );
  }

  const linkedIndexNo = String(user?.linkedIndexNo || "").trim();
  return linkedIndexNo ? [{ admissionNo: "", indexNo: linkedIndexNo }] : [];
}

function formatLinkedStudentLabel(studentRef = {}, index = 0) {
  if (studentRef.admissionNo && studentRef.indexNo) {
    return `${studentRef.admissionNo} / ${studentRef.indexNo}`;
  }
  if (studentRef.admissionNo) return studentRef.admissionNo;
  if (studentRef.indexNo) return studentRef.indexNo;
  return `Student ${index + 1}`;
}

function buildParentDirectory(classes) {
  const parentMap = new Map();
  classes.forEach((cls) => {
    (cls.students || []).forEach((student) => {
      const name = String(student.parentName || "").trim();
      const phone = String(student.parentPhone || "").trim();
      const address = String(student.address || "").trim();
      if (!name && !phone) return;
      const key = (phone || name).toLowerCase();
      const existing = parentMap.get(key) || {
        key,
        name: name || phone || "Guardian",
        phone,
        address,
        subtitle: "Guardian record from student registration",
        badge: "",
        students: [],
      };
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.address && address) existing.address = address;
      existing.students.push({
        key: `${cls.id}-${student.id}`,
        classId: cls.id,
        studentId: student.id,
        name: student.name || "Unnamed Student",
        indexNo: student.index_no || student.indexNo || "",
        admissionNo: student.admissionNo || student.admission_no || "",
        form: cls.form || "",
        stream: cls.stream || "",
        year: cls.year || "",
        classLabel: getClassDisplayLabel(cls),
      });
      parentMap.set(key, existing);
    });
  });

  return Array.from(parentMap.values())
    .map((entry) => ({
      ...entry,
      badge: `${entry.students.length} student${entry.students.length === 1 ? "" : "s"}`,
      students: entry.students.sort((a, b) => a.name.localeCompare(b.name, "en")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

function normalizeProfileTarget(target) {
  if (target && typeof target === "object") {
    return {
      admissionNo: String(target.admissionNo || target.admission_no || "").trim().toUpperCase(),
      indexNo: String(target.indexNo || target.index_no || "").trim(),
    };
  }
  const raw = String(target || "").trim();
  const upper = raw.toUpperCase();
  const looksLikeAdmissionNo = /^[A-Z0-9]+-\d{4}-\d{4,}$/.test(upper);
  return {
    admissionNo: looksLikeAdmissionNo ? upper : "",
    indexNo: looksLikeAdmissionNo ? "" : raw,
  };
}

function buildTeacherDirectory(users, classes) {
  const assignmentMap = new Map();
  (classes || []).forEach((cls) => {
    const classLabel = getClassDisplayLabel(cls);
    Object.values(cls.timetable?.entries || {}).forEach((entry) => {
      const teacherKey = String(entry.teacherUsername || entry.teacherName || "")
        .trim()
        .toLowerCase();
      if (!teacherKey) return;
      const current = assignmentMap.get(teacherKey) || {
        periods: 0,
        classes: new Map(),
        subjects: new Set(),
      };
      current.periods += 1;
      current.classes.set(classLabel, (current.classes.get(classLabel) || 0) + 1);
      if (entry.subject) current.subjects.add(entry.subject);
      assignmentMap.set(teacherKey, current);
    });
  });

  return users
    .filter((user) => user.role === "teacher" || user.role === "academic")
    .map((user) => {
      const teacherKey = String(user.username || user.displayName || "")
        .trim()
        .toLowerCase();
      const assignment = assignmentMap.get(teacherKey);
      const classAssignments = Array.from(assignment?.classes?.entries?.() || [])
        .map(([label, count]) => ({
          key: `${teacherKey}-${label}`,
          label,
          meta: `${count} period${count === 1 ? "" : "s"}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "en"));

      return {
        key: user.id || user.username,
        name: user.displayName || user.username || "Teacher",
        username: user.username || "",
        phone: user.phone || "",
        email: user.email || "",
        lastSeen: user.lastLoginAt || "",
        badge: user.active === false ? "Inactive" : "Active",
        subtitle:
          user.role === "academic"
            ? "Academic staff account created and managed by admin"
            : "Teacher account created and managed by admin",
        assignments: classAssignments,
        assignmentSummary: assignment
          ? `${assignment.periods} period${assignment.periods === 1 ? "" : "s"} across ${
              classAssignments.length
            } class${classAssignments.length === 1 ? "" : "es"}`
          : "No timetable assignments yet",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

function normalizeTeacherKey(...values) {
  return (
    values
      .map((value) => String(value || "").trim().toLowerCase())
      .find(Boolean) || ""
  );
}

function getTeacherScopedClassIds(classes, user) {
  const assignedClassIds = new Set(
    [
      user?.teacherAssignments?.classTeacherClassId || "",
      ...((user?.teacherAssignments?.subjectAssignments || []).map((entry) => entry?.classId || "")),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );
  const teacherKeys = new Set(
    [normalizeTeacherKey(user?.username), normalizeTeacherKey(user?.displayName)].filter(Boolean)
  );
  if (!teacherKeys.size && !assignedClassIds.size) return new Set();

  return new Set(
    (classes || [])
      .filter((cls) =>
        assignedClassIds.has(cls.id) ||
        Object.values(cls.timetable?.entries || {}).some((entry) =>
          teacherKeys.has(normalizeTeacherKey(entry.teacherUsername, entry.teacherName))
        )
      )
      .map((cls) => cls.id)
  );
}

function buildTeacherPortalSummary(classes, user) {
  const assignedClassIds = new Set(
    [
      user?.teacherAssignments?.classTeacherClassId || "",
      ...((user?.teacherAssignments?.subjectAssignments || []).map((entry) => entry?.classId || "")),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );
  const assignedSubjects = new Set(
    (user?.teacherAssignments?.subjectAssignments || [])
      .map((entry) => String(entry?.subject || "").trim())
      .filter(Boolean)
  );
  const teacherKeys = new Set(
    [normalizeTeacherKey(user?.username), normalizeTeacherKey(user?.displayName)].filter(Boolean)
  );
  const classMap = new Map();
  const subjects = new Set();
  let assignedPeriods = 0;

  (classes || []).forEach((cls) => {
    const classLabel = getClassDisplayLabel(cls);
    if (assignedClassIds.has(cls.id)) {
      classMap.set(classLabel, classMap.get(classLabel) || 0);
    }
    Object.values(cls.timetable?.entries || {}).forEach((entry) => {
      if (teacherKeys.has(normalizeTeacherKey(entry.teacherUsername, entry.teacherName))) {
        assignedPeriods += 1;
        classMap.set(classLabel, (classMap.get(classLabel) || 0) + 1);
        if (entry.subject) subjects.add(entry.subject);
      }
    });
  });

  assignedSubjects.forEach((subject) => subjects.add(subject));

  return {
    assignedClasses: classMap.size,
    assignedPeriods,
    subjectCount: subjects.size,
    classAssignments: Array.from(classMap.entries())
      .map(([label, periods]) => ({ label, periods }))
      .sort((a, b) => a.label.localeCompare(b.label, "en")),
  };
}

function findStudentCommunicationContext(classes, studentRef) {
  const normalizedIndexNo = String(studentRef?.indexNo || studentRef || "").trim().toLowerCase();
  const normalizedAdmissionNo = String(studentRef?.admissionNo || "").trim().toLowerCase();
  if (!normalizedIndexNo && !normalizedAdmissionNo) return null;

  const matches = [];
  (classes || []).forEach((cls) => {
    (cls.students || []).forEach((student) => {
      const studentIndexNo = String(student.index_no || student.indexNo || "").trim();
      const studentAdmissionNo = String(student.admissionNo || student.admission_no || "")
        .trim()
        .toLowerCase();
      const matchesAdmission = normalizedAdmissionNo && studentAdmissionNo === normalizedAdmissionNo;
      const matchesIndex = normalizedIndexNo && studentIndexNo.toLowerCase() === normalizedIndexNo;
      if (!matchesAdmission && !matchesIndex) return;
      matches.push({
        indexNo: studentIndexNo,
        admissionNo: String(student.admissionNo || student.admission_no || "").trim().toUpperCase(),
        phone: String(student.parentPhone || student.parent_phone || "").trim(),
        parentName: String(student.parentName || student.parent_name || "").trim(),
        studentName: String(student.name || "").trim(),
        classId: cls.id,
        classLabel: [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim(),
        year: cls.year || "",
        form: cls.form || "",
        stream: cls.stream || "",
      });
    });
  });

  matches.sort((left, right) => Number(right.year || 0) - Number(left.year || 0));
  return matches[0] || null;
}

export default function App() {
  const { t } = useI18n();
  const [page, setPageRaw] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || "dashboard";
  });
  const setPage = useCallback((p) => {
    setPageRaw(p);
    window.history.replaceState(null, "", `#${p}`);
  }, []);
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) setPageRaw(hash);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const [accountInitialTab, setAccountInitialTab] = useState("profile");
  const [sideOpen, setSideOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 720 : true
  );
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchProfileTarget, setSearchProfileTarget] = useState(null);
  const [schoolSettings, setSchoolSettings] = useState(DEFAULT_SCHOOL);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [smsDraft, setSmsDraft] = useState(null);
  const [parentDirectoryEntries, setParentDirectoryEntries] = useState([]);
  const [parentDirectoryLoading, setParentDirectoryLoading] = useState(false);
  const { isMobile } = useViewport();
  const topBarHeight = isMobile ? 64 : 78;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const classNavItems = [
    { key: "students", icon: "S", label: "Marks Entry", requiresClass: true },
    { key: "results", icon: "R", label: t("resultSheets", "Result Sheets"), requiresClass: true },
    { key: "timetable", icon: "T", label: t("timetable", "Timetable"), requiresClass: true },
    { key: "reports", icon: "P", label: t("reportCards", "Report Cards"), requiresClass: true },
    { key: "settings", icon: "C", label: t("settings"), requiresClass: true },
  ];

  const {
    currentUser,
    loggedIn,
    authReady,
    managedUsers,
    authLogs,
    handleLogin,
    handleSaveAccount,
    handleChangePassword,
    loadUsers,
    loadAuthLogs,
    handleCreateUser,
    handleUpdateUser,
    handleLogout: logoutSession,
  } = useSession({
    onLoginSuccess: (user) => {
      setPage(getDefaultPageForUser(user));
      const linkedStudents = getLinkedStudentsForUser(user);
      if (linkedStudents.length) {
        setSearchProfileTarget(linkedStudents[0]);
      }
    },
    onAccountSaved: () => showToast(t("accountUpdated")),
  });

  const role = currentUser?.role || "";
  const canAccessClassData = CLASS_ACCESS_ROLES.has(role);
  const canManageUsers = role === "admin";
  const canViewSettings = role === "admin" || role === "academic";
  const canManageStudentsGlobally = role === "admin" || role === "academic";
  const canUseSms = CLASS_ACCESS_ROLES.has(role);
  const canUseAi = CLASS_ACCESS_ROLES.has(role);
  const navItems = [
    ...classNavItems.filter((item) => canViewSettings || item.key !== "settings"),
    ...(canManageStudentsGlobally
      ? [{ key: "student-management", label: "Student Records", requiresClass: false }]
      : []),
    { key: "forms-streams", label: "Forms & Streams", requiresClass: false },
    { key: "subjects", label: "Subjects", requiresClass: false },
    { key: "exams", label: "Exams", requiresClass: false },
    ...(canUseSms
      ? [{ key: "sms", label: t("sms", "SMS"), requiresClass: false }]
      : []),
    ...(canUseAi
      ? [{ key: "ai-assistant", label: t("aiAssistant", "AI Assistant"), requiresClass: false }]
      : []),
    ...(canManageUsers
      ? [
          { key: "teachers", label: t("teachers"), requiresClass: false },
          { key: "parents", label: t("parents"), requiresClass: false },
        ]
      : []),
    ...(canViewSettings
      ? [{ key: "content-management", label: "Content Management", requiresClass: false }]
      : []),
  ];

  const {
    classes,
    activeId,
    setActiveId,
    activeExam,
    setActiveExam,
    activeClass,
    loading,
    error,
    expandedYears,
    auditLogs,
    allComputed,
    activeComputed,
    toggleYear,
    addClass,
    deleteClass,
    saveExamForClass,
    onAddStudent,
    onAddStudentToClass,
    onUpdateStudent,
    onUpdateStudentInClass,
    onDeleteStudent,
    onDeleteStudentFromClass,
    onMoveStudentToClass,
    onPromoteStudents,
    onBulkImport,
    onReorderStudentCnos,
    onUpdateSchool,
    onUpdateSubjects,
    onUpdateSubjectAssignments,
    onApplySubjectMaster,
    onUpdateMonthlyExams,
    onUpdateClassMeta,
    onArchiveClass,
    onRestoreClass,
    onRestoreClassById,
    onPublishClass,
    onUnpublishClass,
    onExportBackup,
    onImportBackup,
    onLoadAuditLog,
    onChangeExam,
    onUpdateCompositeConfig,
    onUpdateTimetable,
    onApplyExamMaster,
    reloadClasses,
    refreshClassesWithStudents,
    hydrateAllClassesWithStudents,
    resetClassesState,
  } = useClasses({
    loggedIn: loggedIn && canAccessClassData,
    showToast,
    onNavigate: setPage,
    schoolSettings,
  });
  const normalizedSchoolSettings = useMemo(
    () => normalizeSchoolSettings(schoolSettings),
    [schoolSettings]
  );
  const mergeDisplayClass = useCallback(
    (cls) => (
      cls
        ? {
            ...cls,
            school_info: mergeClassSchoolInfo(cls.school_info ?? {}, normalizedSchoolSettings),
          }
        : cls
    ),
    [normalizedSchoolSettings]
  );
  const displayActiveClass = useMemo(
    () => mergeDisplayClass(activeClass),
    [activeClass, mergeDisplayClass]
  );
  const displayAllComputed = useMemo(
    () => allComputed.map((cls) => mergeDisplayClass(cls)),
    [allComputed, mergeDisplayClass]
  );
  const teacherScopedClassIds = useMemo(
    () => (role === "teacher" ? getTeacherScopedClassIds(classes, currentUser) : null),
    [classes, currentUser, role]
  );
  const visibleClasses = useMemo(
    () =>
      role === "teacher"
        ? classes.filter((cls) => teacherScopedClassIds?.has(cls.id))
        : classes,
    [classes, role, teacherScopedClassIds]
  );
  const visibleClassesByYear = useMemo(() => {
    const map = {};
    visibleClasses.forEach((cls) => {
      if (!cls.year) return;
      if (!map[cls.year]) map[cls.year] = [];
      map[cls.year].push(cls);
    });
    return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a));
  }, [visibleClasses]);
  const visibleUnorganizedClasses = useMemo(
    () => visibleClasses.filter((cls) => !cls.year),
    [visibleClasses]
  );
  const visibleAllComputed = useMemo(
    () =>
      role === "teacher"
        ? displayAllComputed.filter((cls) => teacherScopedClassIds?.has(cls.id))
        : displayAllComputed,
    [displayAllComputed, role, teacherScopedClassIds]
  );
  const activeFormWorkspace = useMemo(
    () => buildFormWorkspace(visibleClasses, displayActiveClass, activeExam),
    [activeExam, displayActiveClass, visibleClasses]
  );

  const hydratedFormsRef = useRef(new Set());
  useEffect(() => {
    if (!displayActiveClass) return;
    const form = String(displayActiveClass.form || "").trim();
    const year = String(displayActiveClass.year || "").trim();
    if (!form) return;
    const formKey = `${year}::${form}`;
    if (hydratedFormsRef.current.has(formKey)) return;
    const needsHydration = visibleClasses.filter(
      (cls) =>
        String(cls.year || "").trim() === year &&
        String(cls.form || "").trim() === form &&
        !(cls.students?.length),
    );
    hydratedFormsRef.current.add(formKey);
    if (!needsHydration.length) return;
    refreshClassesWithStudents(needsHydration.map((cls) => cls.id)).catch(() => {});
  }, [displayActiveClass, refreshClassesWithStudents, visibleClasses]);

  const selectedStudentWorkspace = useMemo(() => {
    if (!selectedStudent?.classId) return activeFormWorkspace;
    const realClass =
      visibleClasses.find((cls) => String(cls.id) === String(selectedStudent.classId)) ||
      displayActiveClass;
    return buildFormWorkspace(visibleClasses, realClass, activeExam);
  }, [activeExam, activeFormWorkspace, displayActiveClass, selectedStudent, visibleClasses]);
  const selectedStudentClassData = useMemo(() => {
    if (!selectedStudent?.classId) return displayActiveClass;
    const realClass =
      visibleAllComputed.find((cls) => String(cls.id) === String(selectedStudent.classId)) ||
      displayActiveClass;
    return {
      ...realClass,
      rankTotalStudents:
        selectedStudentWorkspace.classData?.rankTotalStudents ||
        selectedStudentWorkspace.computed?.length ||
        realClass?.students?.length ||
        0,
      classLabelOverride:
        selectedStudentWorkspace.classData?.classLabelOverride ||
        realClass?.form ||
        realClass?.name ||
        "",
    };
  }, [displayActiveClass, selectedStudent, selectedStudentWorkspace, visibleAllComputed]);
  const teacherPortalSummary = useMemo(
    () => (role === "teacher" ? buildTeacherPortalSummary(visibleClasses, currentUser) : null),
    [currentUser, role, visibleClasses]
  );
  const linkedStudents = useMemo(
    () => getLinkedStudentsForUser(currentUser),
    [currentUser]
  );
  const activeProfileCommunicationContext = useMemo(
    () => findStudentCommunicationContext(classes, searchProfileTarget),
    [classes, searchProfileTarget]
  );
  const teacherDirectory = useMemo(
    () => buildTeacherDirectory(managedUsers, classes),
    [classes, managedUsers],
  );
  const parentDirectory = useMemo(() => buildParentDirectory(classes), [classes]);

  useEffect(() => {
    if (page === "parents") return;
    setParentDirectoryEntries(parentDirectory);
    setParentDirectoryLoading(false);
  }, [page, parentDirectory]);

  const handleUpdateParentDirectoryEntry = useCallback(async (entry, updates = {}) => {
    const linkedStudents = Array.isArray(entry?.students) ? entry.students : [];
    if (!linkedStudents.length) {
      showToast("No linked students found for this guardian", "error");
      return { ok: false, error: "No linked students found for this guardian" };
    }

    const nextName = String(updates.name ?? entry?.name ?? "").trim();
    const nextPhone = String(updates.phone ?? entry?.phone ?? "").trim();
    const nextAddress = String(updates.address ?? entry?.address ?? "").trim();
    if (!nextName && !nextPhone) {
      showToast("Parent name or phone is required", "error");
      return { ok: false, error: "Parent name or phone is required" };
    }

    const results = await Promise.all(
      linkedStudents.map((student) =>
        onUpdateStudentInClass?.(
          student.classId,
          {
            id: student.studentId,
            parentName: nextName,
            parentPhone: nextPhone,
            address: nextAddress,
          },
          { silent: true },
        ),
      ),
    );

    const failed = results.find((result) => !result?.ok);
    if (failed) {
      showToast(failed.error || "Unable to update parent details", "error");
      return failed;
    }

    showToast("Parent details updated");
    return { ok: true };
  }, [onUpdateStudentInClass, showToast]);

  const handleDeleteParentDirectoryEntry = useCallback(async (entry) => {
    const linkedStudents = Array.isArray(entry?.students) ? entry.students : [];
    if (!linkedStudents.length) {
      showToast("No linked students found for this guardian", "error");
      return { ok: false, error: "No linked students found for this guardian" };
    }

    const results = await Promise.all(
      linkedStudents.map((student) =>
        onUpdateStudentInClass?.(
          student.classId,
          {
            id: student.studentId,
            parentName: "",
            parentPhone: "",
            address: "",
          },
          { silent: true },
        ),
      ),
    );

    const failed = results.find((result) => !result?.ok);
    if (failed) {
      showToast(failed.error || "Unable to delete parent record", "error");
      return failed;
    }

    showToast("Parent record removed");
    return { ok: true };
  }, [onUpdateStudentInClass, showToast]);

  const handleLogout = useCallback(() => {
    logoutSession();
    resetClassesState();
    setPage("dashboard");
  }, [logoutSession, resetClassesState]);

  const handleLoadHomepageContent = useCallback(async () => {
    return API.getHomepageContent();
  }, []);

  const handleSaveHomepageContent = useCallback(async (content) => {
    const saved = await API.saveHomepageContent(content);
    showToast(t("homepageUpdated"));
    return saved;
  }, [showToast, t]);

  const handleLoadSchoolSettings = useCallback(async () => {
    const loaded = await API.getSchoolSettings();
    const normalized = normalizeSchoolSettings(loaded);
    setSchoolSettings(normalized);
    return normalized;
  }, []);

  const handleSaveSchoolSettings = useCallback(async (nextSettings) => {
    const saved = await API.saveSchoolSettings(nextSettings);
    const normalized = normalizeSchoolSettings(saved);
    setSchoolSettings(normalized);
    showToast(t("schoolSettingsUpdated"));
    return normalized;
  }, [showToast, t]);

  useEffect(() => {
    if (isMobile) {
      setSideOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!loggedIn) {
      setSchoolSettings(DEFAULT_SCHOOL);
      return;
    }
    Promise.resolve(handleLoadSchoolSettings()).catch(() => {
      setSchoolSettings(DEFAULT_SCHOOL);
    });
  }, [handleLoadSchoolSettings, loggedIn]);

  useEffect(() => {
    if (!loggedIn || !currentUser) return;
    if (canAccessClassData) return;
    setSearchProfileTarget(linkedStudents[0] || null);
    if (["dashboard", "students", "results", "timetable", "reports", "settings", "sms"].includes(page)) {
      setPage(getDefaultPageForUser(currentUser));
    }
  }, [canAccessClassData, currentUser, linkedStudents, loggedIn, page]);

  useEffect(() => {
    if (role !== "teacher") return;
    if (!visibleClasses.length) {
      setActiveId(null);
      if (["students", "results", "timetable", "reports", "settings"].includes(page)) {
        setPage("dashboard");
      }
      return;
    }
    if (!activeClass || !teacherScopedClassIds?.has(activeClass.id)) {
      setActiveId(visibleClasses[0].id);
    }
  }, [activeClass, page, role, setActiveId, teacherScopedClassIds, visibleClasses]);

  useEffect(() => {
    if (page === "settings" && !canViewSettings) {
      setPage(canAccessClassData ? "students" : "account");
    }
  }, [canAccessClassData, canViewSettings, page]);

  useEffect(() => {
    if (page === "student-management" && !canManageStudentsGlobally) {
      setPage(canAccessClassData ? "students" : "account");
    }
  }, [canAccessClassData, canManageStudentsGlobally, page]);

  useEffect(() => {
    if (!loggedIn || !canManageStudentsGlobally || page !== "student-management") return;
    Promise.resolve(hydrateAllClassesWithStudents()).catch(() => {});
  }, [canManageStudentsGlobally, hydrateAllClassesWithStudents, loggedIn, page]);

  useEffect(() => {
    if (!loggedIn || !canManageUsers || page !== "parents") return;
    let active = true;
    
    // Only show loading if we don't already have parent entries
    const needsLoading = parentDirectoryEntries.length === 0;
    if (needsLoading) {
      setParentDirectoryLoading(true);
    }
    
    Promise.resolve(hydrateAllClassesWithStudents())
      .then((freshClasses) => {
        if (!active) return;
        const source = Array.isArray(freshClasses) && freshClasses.length ? freshClasses : classes;
        setParentDirectoryEntries(buildParentDirectory(source));
      })
      .catch(() => {
        if (!active) return;
        setParentDirectoryEntries(buildParentDirectory(classes));
      })
      .finally(() => {
        if (active && needsLoading) setParentDirectoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canManageUsers, hydrateAllClassesWithStudents, loggedIn, page]);

  useEffect(() => {
    if (page === "sms" && !canUseSms) {
      setPage(canAccessClassData ? "students" : "account");
    }
  }, [canAccessClassData, canUseSms, page]);

  useEffect(() => {
    if (page === "ai-assistant" && !canUseAi) {
      setPage(canAccessClassData ? "students" : "account");
    }
  }, [canAccessClassData, canUseAi, page]);

  useEffect(() => {
    if (!loggedIn || role !== "admin") return;
    Promise.resolve(loadUsers()).catch(() => {});
    Promise.resolve(loadAuthLogs(12)).catch(() => {});
  }, [loadAuthLogs, loadUsers, loggedIn, role]);

  const onShowModal = useCallback((type, studentTarget = null) => {
    setModalType(type);
    if (!studentTarget) {
      setSelectedStudent(null);
      return;
    }
    if (studentTarget && typeof studentTarget === "object") {
      const classId = String(studentTarget.classId || "").trim();
      const originalStudentId = String(studentTarget.originalStudentId || studentTarget.id || "").trim();
      const fromClass = classId
        ? visibleAllComputed
            .find((cls) => cls.id === classId)
            ?.computed?.find((student) => String(student.id || "").trim() === originalStudentId)
        : null;
      setSelectedStudent(fromClass ? { ...fromClass, ...studentTarget } : studentTarget);
      return;
    }
    const found = activeFormWorkspace.computed.find((student) => student.id === studentTarget) ?? null;
    setSelectedStudent(found);
  }, [activeFormWorkspace.computed, visibleAllComputed]);

  const onCloseModal = useCallback(() => {
    setModalType(null);
    setSelectedStudent(null);
  }, []);

  const onOpenReportCard = useCallback((studentTarget) => {
    if (!studentTarget) return;

    if (studentTarget && typeof studentTarget === "object") {
      const classId = String(studentTarget.classId || "").trim();
      const originalStudentId = String(
        studentTarget.originalStudentId || studentTarget.id || "",
      ).trim();
      const fromClass = classId
        ? visibleAllComputed
            .find((cls) => String(cls.id) === classId)
            ?.computed?.find(
              (student) => String(student.id || "").trim() === originalStudentId,
            )
        : null;
      setSelectedStudent(fromClass ? { ...fromClass, ...studentTarget } : studentTarget);
      setModalType("report-card");
      return;
    }

    const studentId = String(
      studentTarget,
    ).trim();
    if (!studentId) return;

    const activeMatch = activeFormWorkspace.computed.find(
      (student) => String(student.id || "").trim() === studentId,
    );
    if (activeMatch) {
      setSelectedStudent(activeMatch);
      setModalType("report-card");
      return;
    }

    const matched = visibleAllComputed
      .flatMap((cls) =>
        (cls.computed ?? []).map((student) => ({
          ...student,
          classId: cls.id,
          originalStudentId: student.id,
        })),
      )
      .find((student) => String(student.id || "").trim() === studentId);

    if (!matched) {
      console.warn("[App] Report card student not found", { studentTarget });
      return;
    }

    setSelectedStudent(matched);
    setModalType("report-card");
  }, [activeFormWorkspace.computed, visibleAllComputed]);

  const handleOpenStudentProfile = useCallback((target) => {
    const ref = normalizeProfileTarget(target);
    if (!ref.admissionNo && !ref.indexNo) return;
    setSearchProfileTarget(ref);
    setPage("profile");
    if (isMobile) setSideOpen(false);
  }, [isMobile]);

  const handlePickClass = useCallback((cls) => {
    if (!cls) return;
    setActiveId(cls.id);
    setPage("students");
    if (isMobile) setSideOpen(false);
  }, [isMobile, setActiveId]);

  const handleConfirmDelete = useCallback(() => {
    if (!confirmDel) return;
    deleteClass(confirmDel);
    setConfirmDel(null);
  }, [confirmDel, deleteClass]);

  if (!authReady) {
    return <Splash text={t("checkingSession")} />;
  }
  if (!loggedIn) {
    return <Landing onLogin={handleLogin} />;
  }

  if (canAccessClassData && loading) return <Splash text={t("loadingData")} />;
  if (canAccessClassData && error) return <Splash text={error} isError />;

  const sidebarWidth = 248;
  const sidebarCollapsedWidth = 72;
  const isClassPage = canAccessClassData && ["students", "results", "timetable", "reports", "settings"].includes(page);
  const accountLabel = currentUser?.displayName || currentUser?.username || t("account");
  const accountSubtitle = currentUser?.email || currentUser?.username || "";

  const topBarLabel = (() => {
    if (page === "dashboard") return t("dashboard");
    if (page === "profile") return t("studentProfile");
    if (page === "account") return t("account");
    if (page === "teachers") return t("teachers");
    if (page === "parents") return t("parents");
    if (page === "sms") return t("sms", "SMS");
    if (page === "ai-assistant") return t("aiAssistant", "AI Assistant");
    if (page === "forms-streams") return "Forms & Streams";
    if (page === "subjects") return "Subjects";
    if (page === "exams") return "Exams";
    if (page === "content-management") return "Content Management";
    if (page === "reports") return t("reportCards", "Report Cards");
    if (page === "results") return t("resultSheets", "Result Sheets");
    if (!activeClass) return "";
    const parts = [];
    if (activeClass.form) parts.push(activeClass.form);
    if (activeClass.year) parts.push(activeClass.year);
    return parts.join(" - ");
  })();

  const closeSide = () => {
    if (isMobile) setSideOpen(false);
  };

  const noClassBlock = (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        padding: 24,
        background: "#f8fafc",
      }}
    >
      <div style={{ fontSize: 52 }}>{t("classesSection")}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#003366" }}>{t("noClassSelected")}</div>
      <div style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>
        {`${t("selectClass")}...`}
      </div>
    </div>
  );

  return (
    <div style={{ ...S.root, ...(isMobile ? { overflow: "hidden", height: "100dvh" } : {}) }}>
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

      {canAccessClassData && (
        <AppSidebar
          isMobile={isMobile}
          sideOpen={sideOpen}
          topBarHeight={topBarHeight}
          sidebarWidth={sidebarWidth}
          collapsedWidth={sidebarCollapsedWidth}
          page={page}
          activeId={activeId}
          activeClass={activeClass}
          isClassPage={isClassPage}
          classesByYear={visibleClassesByYear}
          expandedYears={expandedYears}
          forms={CLASS_FORMS}
          streams={CLASS_STREAMS}
          unorganizedClasses={visibleUnorganizedClasses}
          accountLabel={accountLabel}
          accountSubtitle={accountSubtitle}
          navItems={navItems}
          canCreateClasses={role === "admin"}
          classesHeading={role === "teacher" ? "MY CLASSES" : undefined}
          styles={S}
          onClose={closeSide}
          onToggleSidebar={() => setSideOpen((prev) => !prev)}
          onToggleYear={toggleYear}
          onAddClass={addClass}
          onPickClass={handlePickClass}
          onSetPage={setPage}
        />
      )}

      <div style={S.main}>
        <AppTopBar
          isMobile={isMobile}
          currentUser={currentUser}
          authLogs={authLogs}
          page={page}
          topBarHeight={topBarHeight}
          topBarLabel={topBarLabel}
          accountLabel={accountLabel}
          showMenu={canAccessClassData}
          styles={S}
          onToggleSidebar={() => setSideOpen((prev) => !prev)}
          onOpenSidebar={() => setSideOpen(true)}
          onOpenAccount={() => { setAccountInitialTab("profile"); setPage("account"); }}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenUserGuide={() => setShowUserGuide(true)}
          onLogout={handleLogout}
        />

        {confirmDel && (
          <DeleteClassDialog
            className={classes.find((cls) => cls.id === confirmDel)?.name}
            styles={S}
            onCancel={() => setConfirmDel(null)}
            onConfirm={handleConfirmDelete}
          />
        )}

        <div style={S.content}>
          {page === "dashboard" && (
            canAccessClassData ? (
              <Dashboard
                currentUser={currentUser}
                managedUsers={managedUsers}
                authLogs={authLogs}
                allComputed={visibleAllComputed}
                allowedClassIds={role === "teacher" ? new Set(visibleClasses.map((cls) => cls.id)) : null}
                teacherScope={teacherPortalSummary}
                onLoadUsers={loadUsers}
                onLoadAuthLogs={loadAuthLogs}
                onOpenClass={(id) => {
                  setActiveId(id);
                  setPage("students");
                }}
                onViewProfile={(studentRef) => {
                  handleOpenStudentProfile(studentRef);
                }}
                onOpenAccount={() => { setAccountInitialTab("profile"); setPage("account"); }}
                onOpenHomepageEditor={canManageUsers ? () => { setAccountInitialTab("homepage"); setPage("account"); } : undefined}
                onOpenReports={() => {
                  if (activeClass) {
                    setPage("reports");
                  } else if (visibleClasses[0]) {
                    setActiveId(visibleClasses[0].id);
                    setPage("reports");
                  }
                }}
                onOpenTimetable={() => {
                  if (activeClass) {
                    setPage("timetable");
                  } else if (visibleClasses[0]) {
                    setActiveId(visibleClasses[0].id);
                    setPage("timetable");
                  }
                }}
                onOpenSettings={() => {
                  if (!canViewSettings) {
                    setAccountInitialTab("profile");
                    setPage("account");
                    return;
                  }
                  if (activeClass) {
                    setPage("settings");
                  } else if (visibleClasses[0]) {
                    setActiveId(visibleClasses[0].id);
                    setPage("settings");
                  }
                }}
                onExportBackup={onExportBackup}
              />
            ) : (
              <AccountPage
                user={currentUser}
                users={managedUsers}
                classes={classes}
                authLogs={authLogs}
                canManageUsers={canManageUsers}
                initialTab={accountInitialTab}
                onLoadUsers={loadUsers}
                onLoadAuthLogs={loadAuthLogs}
                onLoadHomepageContent={handleLoadHomepageContent}
                onSaveProfile={handleSaveAccount}
                onChangePassword={handleChangePassword}
                onCreateUser={handleCreateUser}
                onUpdateUser={handleUpdateUser}
                onSaveHomepageContent={handleSaveHomepageContent}
                onLogout={handleLogout}
              />
            )
          )}

          {page === "account" && (
            <AccountPage
              user={currentUser}
              users={managedUsers}
              classes={classes}
              authLogs={authLogs}
              canManageUsers={canManageUsers}
              initialTab={accountInitialTab}
              onLoadUsers={loadUsers}
              onLoadAuthLogs={loadAuthLogs}
              onLoadHomepageContent={handleLoadHomepageContent}
              onSaveProfile={handleSaveAccount}
              onChangePassword={handleChangePassword}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onSaveHomepageContent={handleSaveHomepageContent}
              onLogout={handleLogout}
            />
          )}

          {page === "students" && (
            activeClass ? (
              <StudentsPage
                classData={activeClass}
                classes={visibleClasses}
                onShowModal={onShowModal}
                onUpdateStudentInClass={onUpdateStudentInClass}
                onDeleteStudentFromClass={onDeleteStudentFromClass}
                onAddStudent={onAddStudent}
                onReorderStudentCnos={role === "admin" ? onReorderStudentCnos : null}
                canDeleteStudents={role === "admin" || role === "academic"}
                onUpdateSchool={role === "admin" ? onUpdateSchool : null}
                activeExam={activeExam}
                onChangeExam={onChangeExam}
              />
            ) : (
              noClassBlock
            )
          )}

          {page === "student-management" && canManageStudentsGlobally && (
            <StudentManagementPage
              classes={classes}
              canDeleteStudents={role === "admin" || role === "academic"}
              onOpenStudentProfile={handleOpenStudentProfile}
              onAddStudentToClass={onAddStudentToClass}
              onUpdateStudentInClass={onUpdateStudentInClass}
              onDeleteStudentFromClass={onDeleteStudentFromClass}
              onPromoteStudents={onPromoteStudents}
            />
          )}

          {page === "teachers" && canManageUsers && (
            <PeopleDirectoryPage
              title={t("teachers")}
              description={t("peopleTeachersDescription")}
              entries={teacherDirectory}
              tone="teal"
              onOpenTimetable={() => setPage("timetable")}
            />
          )}

          {page === "parents" && canManageUsers && (
            <PeopleDirectoryPage
              title={t("parents")}
              description={t("peopleParentsDescription")}
              entries={parentDirectoryEntries}
              loading={parentDirectoryLoading}
              tone="amber"
              onOpenStudentProfile={handleOpenStudentProfile}
              onEditEntry={handleUpdateParentDirectoryEntry}
              onDeleteEntry={handleDeleteParentDirectoryEntry}
            />
          )}

          {page === "forms-streams" && canAccessClassData && (
            <FormsStreamsPage
              classes={visibleClasses}
              teachers={(managedUsers || []).filter((user) => user.role === "teacher" && user.active !== false)}
              canCreateClasses={role === "admin"}
              canAssignStreams={role === "admin" || role === "academic"}
              showToast={showToast}
              onNavigateToClass={(cls) => {
                setActiveId(cls.id);
                setPage("students");
                if (isMobile) setSideOpen(false);
              }}
              onCreateClass={async (opts) => {
                return addClass({ ...opts, navigate: false });
              }}
              onRestoreClass={async (classId) => {
                const result = await onRestoreClassById(classId);
                if (isMobile) setSideOpen(false);
                return result;
              }}
              onMoveStudentToClass={onMoveStudentToClass}
              onReloadClasses={reloadClasses}
            />
          )}

          {page === "exams" && canAccessClassData && (
            <ExamsPage
              classes={visibleClasses}
              canManage={role === "admin"}
              onApplyExamMaster={onApplyExamMaster}
              onChangeClassExam={async (cls, exam) => {
                await saveExamForClass(cls, exam);
                if (cls.id === activeId) setActiveExam(exam);
              }}
              onNavigateToClass={(classId) => {
                setActiveId(classId);
                setPage("students");
                if (isMobile) setSideOpen(false);
              }}
            />
          )}

          {page === "subjects" && canAccessClassData && (
            <SubjectsPage
              classes={visibleClasses}
              canManage={role === "admin" || role === "academic"}
              onApplySubjectMaster={onApplySubjectMaster}
              onUpdateSubjectAssignments={onUpdateSubjectAssignments}
              onNavigateToClass={(classId) => {
                setActiveId(classId);
                setPage("students");
                if (isMobile) setSideOpen(false);
              }}
            />
          )}

          {page === "sms" && canUseSms && (
            <SmsPage
              classes={visibleClasses}
              showToast={showToast}
              initialDraft={smsDraft}
              onDraftApplied={() => setSmsDraft(null)}
              onRefreshRecipientClasses={refreshClassesWithStudents}
            />
          )}

          {page === "ai-assistant" && canUseAi && (
            <AiAssistantPage
              classes={visibleClasses}
              activeClass={displayActiveClass}
              activeExam={activeExam}
              currentUser={currentUser}
              topBarHeight={topBarHeight}
              onApproveAction={(actionDraft) => {
                const queue = Array.isArray(actionDraft?.queue) ? actionDraft.queue : [];
                if (!queue.length) return;
                setSmsDraft({
                  mode: "custom",
                  phone: queue.map((entry) => entry.recipientPhone).filter(Boolean).join(", "),
                  parentName: queue[0]?.recipientName || "",
                  studentName: queue[0]?.studentName || "",
                  message: queue[0]?.message || "",
                });
                setPage("sms");
              }}
            />
          )}

          {page === "content-management" && canViewSettings && (
            <ContentManagementPage showToast={showToast} />
          )}

          {page === "results" && (
            activeClass ? (
              <ResultsPage
                classData={{ ...(activeFormWorkspace.classData || displayActiveClass), school_info: { ...((activeFormWorkspace.classData || displayActiveClass)?.school_info ?? {}), exam: activeExam } }}
                computed={activeFormWorkspace.computed}
                allClasses={visibleClasses}
                onOpenReportCard={onOpenReportCard}
                onHydrateClasses={refreshClassesWithStudents}
              />
            ) : (
              noClassBlock
            )
          )}

          {page === "timetable" && (
            activeClass ? (
              <TimetablePage
                classData={activeClass}
                allClasses={role === "teacher" ? visibleClasses : classes}
                schoolSettings={normalizedSchoolSettings}
                teacherEntries={teacherDirectory}
                role={role}
                onSaveSchoolSettings={handleSaveSchoolSettings}
                onUpdateTimetable={role === "admin" ? onUpdateTimetable : null}
              />
            ) : (
              noClassBlock
            )
          )}

          {page === "reports" && (
            activeClass ? (
              <ReportsPage
                classData={{ ...(activeFormWorkspace.classData || displayActiveClass), school_info: { ...((activeFormWorkspace.classData || displayActiveClass)?.school_info ?? {}), exam: activeExam } }}
                computed={activeFormWorkspace.computed}
                allClasses={visibleClasses}
                onOpenReportCard={onOpenReportCard}
                onSelectClass={(id, exam) => {
                  setActiveId(id);
                  setActiveExam(exam || DEFAULT_EXAM_TYPE);
                }}
                onHydrateClasses={refreshClassesWithStudents}
              />
            ) : (
              noClassBlock
            )
          )}

          {page === "settings" && (
            activeClass ? (
              <SettingsPage
                classData={activeClass}
                schoolSettings={normalizedSchoolSettings}
                onUpdateClassMeta={onUpdateClassMeta}
                onUpdateSchool={onUpdateSchool}
                onSaveSchoolSettings={handleSaveSchoolSettings}
                onUpdateSubjects={onUpdateSubjects}
                onUpdateMonthlyExams={onUpdateMonthlyExams}
                onUpdateCompositeConfig={onUpdateCompositeConfig}
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

          {page === "profile" && searchProfileTarget && (
            <div style={{ display: "grid", gap: 12, minHeight: 0 }}>
              {!canAccessClassData && linkedStudents.length > 1 ? (
                <div style={{ padding: isMobile ? "10px 10px 0" : "14px 16px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {linkedStudents.map((studentRef, index) => {
                    const isActive =
                      studentRef.admissionNo === searchProfileTarget?.admissionNo &&
                      studentRef.indexNo === searchProfileTarget?.indexNo;
                    return (
                      <button
                        key={`${studentRef.admissionNo}-${studentRef.indexNo}-${index}`}
                        type="button"
                        onClick={() => setSearchProfileTarget(studentRef)}
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${isActive ? "#2563eb" : "#cbd5e1"}`,
                          background: isActive ? "#dbeafe" : "#fff",
                          color: isActive ? "#1d4ed8" : "#475569",
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {formatLinkedStudentLabel(studentRef, index)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <StudentProfilePage
                studentRef={searchProfileTarget}
                onBack={() => setPage("dashboard")}
                communicationContext={activeProfileCommunicationContext}
                loadSmsHistory={
                  canUseSms
                    ? (studentRef) =>
                        studentRef?.indexNo
                          ? API.getSmsHistory({
                              indexNo: studentRef.indexNo,
                              limit: 8,
                            })
                          : Promise.resolve({ history: [] })
                    : null
                }
              onOpenSms={
                canUseSms
                  ? (context) => {
                      setSmsDraft({
                        mode: "custom",
                        phone: context?.phone || "",
                        parentName: context?.parentName || "",
                        studentName: context?.studentName || "",
                        message: `Bonde Secondary School: Dear ${context?.parentName || "parent/guardian"}, please contact the school regarding ${context?.studentName || "the student"}.`,
                      });
                      setPage("sms");
                    }
                  : null
              }
              />
            </div>
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

      {modalType === "json-import" && activeClass && (
        <JSONImportModal
          classId={activeClass.id}
          subjects={activeClass.subjects ?? []}
          onImport={onBulkImport}
          onClose={onCloseModal}
        />
      )}

      {modalType === "xlsx-import" && activeClass && (
        <XLSXImportModal
          classId={activeClass.id}
          subjects={activeClass.subjects ?? []}
          onImport={onBulkImport}
          onClose={onCloseModal}
        />
      )}

      {modalType === "report-card" && activeClass && (
        <ReportCardModal
          student={selectedStudent}
          classData={{ ...selectedStudentClassData, school_info: { ...(selectedStudentClassData?.school_info ?? {}), exam: activeExam } }}
          onClose={onCloseModal}
        />
      )}

      {modalType === "report-card-export" && activeClass && (
        <ReportCardModal
          student={selectedStudent}
          classData={{ ...selectedStudentClassData, school_info: { ...(selectedStudentClassData?.school_info ?? {}), exam: activeExam } }}
          onClose={onCloseModal}
          autoExport
          silent
        />
      )}


      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        classes={visibleAllComputed}
        users={managedUsers}
        allowedClassIds={role === "teacher" ? new Set(visibleClasses.map((cls) => cls.id)) : null}
        onSetPage={setPage}
        onOpenStudentProfile={handleOpenStudentProfile}
        onPickClass={(cls) => {
          setActiveId(cls.id);
          setPage('students');
        }}
      />

      {loggedIn && currentUser && (
        <OnboardingTour role={currentUser.role} />
      )}

      {showUserGuide && (
        <UserGuideModal
          onClose={() => setShowUserGuide(false)}
          role={role}
          canAccessClassData={canAccessClassData}
          canManageUsers={canManageUsers}
          canViewSettings={canViewSettings}
          hasActiveClass={Boolean(activeClass)}
          activeClassLabel={[activeClass?.form, activeClass?.year].filter(Boolean).join(" ")}
          onNavigate={(nextPage) => {
            if (!nextPage) return;
            setShowUserGuide(false);
            setPage(nextPage);
          }}
          onOpenSearch={() => {
            setShowUserGuide(false);
            setIsCommandPaletteOpen(true);
          }}
        />
      )}

    </div>
  );
}

const S = {
  root: { display: "flex", minHeight: "100dvh", fontFamily: premiumFontStack, background: "#e8edf5", color: "#1a1a2e", overflowY: "auto" },
  toast: { position: "fixed", top: 16, right: 16, zIndex: 9999, color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" },

  sidebar: { background: "#001a3d", flexShrink: 0 },
  sideInner: { width: 240, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" },
  sideLogo: { padding: "14px 14px 10px", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  sideTitle: { color: "#fff", fontWeight: 900, fontSize: 14, lineHeight: 1.2 },
  sideSub: { color: "#7ab3ff", fontSize: 9, fontWeight: 600, letterSpacing: 1 },
  navBtn: { margin: "4px 10px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#c8d8f0", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, textAlign: "left", width: "calc(100% - 20px)" },
  navBtnOn: { background: "rgba(100,160,255,0.22)", border: "1px solid rgba(100,160,255,0.4)", color: "#fff" },
  navBtnDisabled: { opacity: 0.35, cursor: "not-allowed" },
  sideSection: { padding: "10px 14px 4px", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.28)", letterSpacing: 2, textTransform: "uppercase" },
  classList: { flex: 1, overflowY: "auto", padding: "4px 8px" },
  yearRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px 4px", cursor: "pointer", borderRadius: 6, marginBottom: 1 },
  yearLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" },
  addYearBtn: { background: "rgba(100,160,255,0.15)", border: "1px solid rgba(100,160,255,0.3)", color: "#7ab3ff", borderRadius: 4, padding: "0 5px", fontSize: 13, cursor: "pointer", lineHeight: "16px" },
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
  accountBtn: { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 6, cursor: "pointer", maxWidth: 150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  accountBtnOn: { background: "rgba(90,180,255,0.22)", border: "1px solid rgba(90,180,255,0.35)" },
  logoutBtn: { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 6, cursor: "pointer" },
  content: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  dialog: { background: "#fff", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.3)", padding: 20, maxWidth: 420, width: "90%" },
  btnGray: { background: "#eee", border: "none", borderRadius: 7, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 12 },
  btnRed: { background: "#cc2222", color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 12 },
};
