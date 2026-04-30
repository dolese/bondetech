import { useCallback, useEffect, useState } from "react";
import { useViewport } from "./utils/useViewport";
import { Dashboard } from "./components/Dashboard";
import { StudentsPage } from "./components/StudentsPage";
import { ResultsPage } from "./components/ResultsPage";
import { ReportsPage } from "./components/ReportsPage";
import { SettingsPage } from "./components/SettingsPage";
import { AccountPage } from "./components/AccountPage";
import { ReportCardModal } from "./components/ReportCardModal";
import { CSVImportModal } from "./components/CSVImportModal";
import { JSONImportModal } from "./components/JSONImportModal";
import { Splash } from "./components/Splash";
import { Landing } from "./components/Landing";
import { ExamPickerScreen } from "./components/ExamPickerScreen";
import { StudentProfilePage } from "./components/StudentProfilePage";
import { AppSidebar } from "./components/AppSidebar";
import { AppTopBar } from "./components/AppTopBar";
import { DeleteClassDialog } from "./components/DeleteClassDialog";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { useSession } from "./hooks/useSession";
import { CLASS_FORMS, useClasses } from "./hooks/useClasses";
import { API } from "./api";
import { useI18n } from "./i18n";

const MOBILE_NAV_HEIGHT = 94;

const CLASS_ACCESS_ROLES = new Set(["admin", "teacher"]);

function getDefaultPageForUser(user) {
  if (!user) return "dashboard";
  if (CLASS_ACCESS_ROLES.has(user.role)) return "dashboard";
  return user.linkedIndexNo ? "profile" : "account";
}

export default function App() {
  const { t } = useI18n();
  const [page, setPage] = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 720 : true
  );
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [examPickerClass, setExamPickerClass] = useState(null);
  const [searchProfileIndexNo, setSearchProfileIndexNo] = useState(null);
  const { isMobile } = useViewport();
  const topBarHeight = isMobile ? 52 : 46;

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const classNavItems = [
    { key: "students", icon: "S", label: t("students") },
    { key: "results", icon: "R", label: t("results") },
    { key: "reports", icon: "P", label: t("reports") },
    { key: "settings", icon: "C", label: t("settings") },
  ];

  const {
    currentUser,
    loggedIn,
    authReady,
    managedUsers,
    handleLogin,
    handleSaveAccount,
    handleChangePassword,
    loadUsers,
    handleCreateUser,
    handleUpdateUser,
    handleLogout: logoutSession,
  } = useSession({
    onLoginSuccess: (user) => {
      setPage(getDefaultPageForUser(user));
      if (user?.linkedIndexNo) {
        setSearchProfileIndexNo(user.linkedIndexNo);
      }
    },
    onAccountSaved: () => showToast(t("accountUpdated")),
  });

  const role = currentUser?.role || "";
  const canAccessClassData = CLASS_ACCESS_ROLES.has(role);
  const canManageUsers = role === "admin";
  const canViewSettings = role === "admin";
  const navItems = canViewSettings
    ? classNavItems
    : classNavItems.filter((item) => item.key !== "settings");

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
    classesByYear,
    unorganizedClasses,
    toggleYear,
    addClass,
    deleteClass,
    saveExamForClass,
    onAddStudent,
    onUpdateStudent,
    onDeleteStudent,
    onBulkImport,
    onUpdateSchool,
    onUpdateSubjects,
    onUpdateMonthlyExams,
    onUpdateClassMeta,
    onArchiveClass,
    onRestoreClass,
    onPublishClass,
    onUnpublishClass,
    onExportBackup,
    onImportBackup,
    onLoadAuditLog,
    onChangeExam,
    resetClassesState,
  } = useClasses({
    loggedIn: loggedIn && canAccessClassData,
    showToast,
    onNavigate: setPage,
  });

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

  useEffect(() => {
    if (isMobile) {
      setSideOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!loggedIn || !currentUser) return;
    if (canAccessClassData) return;
    setSearchProfileIndexNo(currentUser.linkedIndexNo || null);
    if (["dashboard", "students", "results", "reports", "settings"].includes(page)) {
      setPage(getDefaultPageForUser(currentUser));
    }
  }, [canAccessClassData, currentUser, loggedIn, page]);

  useEffect(() => {
    if (page === "settings" && !canViewSettings) {
      setPage(canAccessClassData ? "students" : "account");
    }
  }, [canAccessClassData, canViewSettings, page]);

  const onShowModal = useCallback((type, studentId = null) => {
    setModalType(type);
    if (studentId) {
      const found = activeComputed.find((student) => student.id === studentId) ?? null;
      setSelectedStudent(found);
    }
  }, [activeComputed]);

  const onCloseModal = useCallback(() => {
    setModalType(null);
    setSelectedStudent(null);
  }, []);

  const onOpenReportCard = useCallback((studentId) => {
    if (!studentId) return;
    const found = activeComputed.find((student) => student.id === studentId) ?? null;
    setSelectedStudent(found);
    setModalType("report-card");
  }, [activeComputed]);

  const handleExamPickerSelect = useCallback((exam) => {
    const cls = examPickerClass;
    setExamPickerClass(null);
    if (!cls) return;
    setActiveId(cls.id);
    setActiveExam(exam);
    saveExamForClass(cls, exam);
    setPage("students");
    if (isMobile) setSideOpen(false);
  }, [examPickerClass, isMobile, saveExamForClass, setActiveExam, setActiveId]);

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

  const sidebarWidth = 240;
  const isClassPage = canAccessClassData && ["students", "results", "reports", "settings"].includes(page);
  const accountLabel = currentUser?.displayName || currentUser?.username || t("account");

  const topBarLabel = (() => {
    if (page === "dashboard") return t("dashboard");
    if (page === "profile") return t("studentProfile");
    if (page === "account") return t("account");
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
      <div style={{ fontSize: 52 }}>Classes</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#003366" }}>{t("noClassSelected")}</div>
      <div style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>
        {isMobile
          ? `${t("openClasses")}.`
          : `${t("selectClass")}...`}
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
          {t("openClasses")}
        </button>
      )}
    </div>
  );

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

      {canAccessClassData && (
        <AppSidebar
          isMobile={isMobile}
          sideOpen={sideOpen}
          topBarHeight={topBarHeight}
          sidebarWidth={sidebarWidth}
          page={page}
          activeId={activeId}
          activeClass={activeClass}
          isClassPage={isClassPage}
          classesByYear={classesByYear}
          expandedYears={expandedYears}
          forms={CLASS_FORMS}
          unorganizedClasses={unorganizedClasses}
          accountLabel={accountLabel}
          navItems={navItems}
          styles={S}
          onClose={closeSide}
          onToggleYear={toggleYear}
          onAddClass={addClass}
          onPickClass={setExamPickerClass}
          onSetPage={setPage}
        />
      )}

      <div style={S.main}>
        <AppTopBar
          isMobile={isMobile}
          page={page}
          topBarHeight={topBarHeight}
          topBarLabel={topBarLabel}
          accountLabel={accountLabel}
          showMenu={canAccessClassData}
          styles={S}
          onToggleSidebar={() => setSideOpen((prev) => !prev)}
          onOpenSidebar={() => setSideOpen(true)}
          onOpenAccount={() => setPage("account")}
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

        <div style={{ ...S.content, ...(isMobile ? { paddingBottom: MOBILE_NAV_HEIGHT } : {}) }}>
          {page === "dashboard" && (
            canAccessClassData ? (
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
            ) : (
              <AccountPage
                user={currentUser}
                users={managedUsers}
                canManageUsers={canManageUsers}
                onLoadUsers={loadUsers}
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
              canManageUsers={canManageUsers}
              onLoadUsers={loadUsers}
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
                allClasses={allComputed}
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

      {examPickerClass && (
        <ExamPickerScreen
          classData={examPickerClass}
          onPick={handleExamPickerSelect}
          onCancel={() => setExamPickerClass(null)}
        />
      )}

      {isMobile && (
        canAccessClassData && (
        <MobileBottomNav
          page={page}
          activeClass={activeClass}
          styles={S}
          onSetPage={setPage}
        />
        )
      )}
    </div>
  );
}

const S = {
  root: { display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI',Tahoma,sans-serif", background: "#e8edf5", color: "#1a1a2e", overflowY: "auto" },
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
