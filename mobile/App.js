import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { MOBILE_THEME } from "./src/theme";
import {
  clearStoredMobileToken,
  getStoredMobileToken,
  storeMobileToken,
} from "./src/storage";
import {
  getClasses,
  getClassById,
  getHomepageOverview,
  getSession,
  getStudentProfile,
  login,
} from "./src/api";
import {
  buildParentReportSnapshots,
  buildTeacherSchedule,
  formatClassLabel,
  formatRoleLabel,
  summarizeClassRoster,
  summarizeParentProfile,
  summarizeTeacherAssignments,
} from "./src/mobileData";

function ShellCard({ children, dense = false, subtle = false }) {
  return (
    <View
      style={[
        styles.card,
        dense && styles.cardDense,
        subtle && styles.cardSubtle,
      ]}
    >
      {children}
    </View>
  );
}

function SectionTitle({ eyebrow, title, detail }) {
  return (
    <View style={styles.sectionHeader}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

function MetricTile({ value, label, hint }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  );
}

function NoticeCard({ title, body, tone = "info" }) {
  const toneMap = {
    info: { border: "#bfdbfe", icon: "#2563eb", bg: "#eff6ff" },
    success: { border: "#bbf7d0", icon: "#059669", bg: "#ecfdf5" },
    warning: { border: "#fde68a", icon: "#d97706", bg: "#fffbeb" },
    accent: { border: "#ddd6fe", icon: "#7c3aed", bg: "#f5f3ff" },
  };
  const current = toneMap[tone] || toneMap.info;
  return (
    <View
      style={[
        styles.noticeCard,
        { borderColor: current.border, backgroundColor: current.bg },
      ]}
    >
      <View style={[styles.noticeIcon, { backgroundColor: "#ffffff" }]}>
        <Text style={[styles.noticeIconText, { color: current.icon }]}>
          {title.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeBody}>{body}</Text>
      </View>
    </View>
  );
}

function TabButton({ active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MiniMetric({ label, value }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricValue}>{value}</Text>
      <Text style={styles.miniMetricLabel}>{label}</Text>
    </View>
  );
}

function LoginScreen({
  username,
  password,
  rememberMe,
  onChangeUsername,
  onChangePassword,
  onChangeRememberMe,
  onSubmit,
  loading,
  error,
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.loginContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginHero}>
          <Text style={styles.loginEyebrow}>BONDE OS MOBILE</Text>
          <Text style={styles.loginTitle}>Teacher and parent access for Android.</Text>
          <Text style={styles.loginSubtitle}>
            This app connects to the same Bonde backend while staying separate
            from the current Vercel web deployment.
          </Text>
        </View>

        <ShellCard>
          <SectionTitle
            eyebrow="SIGN IN"
            title="Use your existing Bonde account"
            detail="Teachers and parents can sign in with the same credentials used in Bonde OS."
          />

          <View style={styles.formBlock}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              value={username}
              onChangeText={onChangeUsername}
              placeholder="admin@bonde.go.tz"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.formBlock}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              value={password}
              onChangeText={onChangePassword}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.rememberRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rememberTitle}>Keep me signed in</Text>
              <Text style={styles.rememberHint}>
                Stores the session securely on this device.
              </Text>
            </View>
            <Switch
              value={rememberMe}
              onValueChange={onChangeRememberMe}
              trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
              thumbColor={rememberMe ? "#2563eb" : "#f8fafc"}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={loading}
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </Pressable>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountTab({ user, onLogout, onRefresh, refreshing }) {
  return (
    <View style={styles.stack}>
      <ShellCard>
        <SectionTitle
          eyebrow="ACCOUNT"
          title={user.displayName || user.username}
          detail={`Role: ${formatRoleLabel(user.role)}`}
        />
        <View style={styles.infoList}>
          <Text style={styles.infoRow}>Username: {user.username}</Text>
          {user.email ? <Text style={styles.infoRow}>Email: {user.email}</Text> : null}
          {user.phone ? <Text style={styles.infoRow}>Phone: {user.phone}</Text> : null}
          {user.linkedIndexNo ? (
            <Text style={styles.infoRow}>Linked Index No: {user.linkedIndexNo}</Text>
          ) : null}
          {user.mustChangePassword ? (
            <Text style={[styles.infoRow, { color: "#b45309" }]}>
              Password change is currently handled in Bonde OS admin.
            </Text>
          ) : null}
        </View>
      </ShellCard>

      <View style={styles.inlineButtons}>
        <Pressable
          onPress={onRefresh}
          disabled={refreshing}
          style={[styles.secondaryButton, refreshing && styles.secondaryButtonDisabled]}
        >
          <Text style={styles.secondaryButtonText}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Text>
        </Pressable>
        <Pressable onPress={onLogout} style={styles.dangerButton}>
          <Text style={styles.dangerButtonText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AnnouncementsTab({ overview }) {
  const announcements = overview?.announcements || [];
  return (
    <View style={styles.stack}>
      <ShellCard>
        <SectionTitle
          eyebrow="ANNOUNCEMENTS"
          title="School notices"
          detail="Shared public notices pulled from the live Bonde homepage overview."
        />
        {announcements.length ? (
          <View style={styles.stack}>
            {announcements.map((announcement, index) => (
              <NoticeCard
                key={announcement.id || `announcement-${index}`}
                title={announcement.title || "Announcement"}
                body={announcement.description || ""}
                tone={announcement.tone || "info"}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No announcements are available right now.</Text>
        )}
      </ShellCard>
    </View>
  );
}

function TeacherHome({
  user,
  classes,
  selectedClassId,
  onSelectClass,
  classDetails,
}) {
  const summary = useMemo(
    () => summarizeTeacherAssignments(user, classes),
    [user, classes]
  );
  const activeClass = classes.find((entry) => entry.id === selectedClassId) || null;
  const [studentQuery, setStudentQuery] = useState("");
  const rosterSummary = useMemo(
    () => summarizeClassRoster(classDetails?.data || {}),
    [classDetails]
  );
  const filteredStudents = useMemo(() => {
    const students = Array.isArray(classDetails?.data?.students)
      ? classDetails.data.students
      : [];
    const query = String(studentQuery || "").trim().toLowerCase();
    if (!query) return students.slice(0, 16);
    return students
      .filter((student) =>
        [student?.name, student?.indexNo, student?.status]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value.includes(query))
      )
      .slice(0, 16);
  }, [classDetails, studentQuery]);

  return (
    <View style={styles.stack}>
      <ShellCard>
        <SectionTitle
          eyebrow="STAFF DASHBOARD"
          title={`Welcome, ${user.displayName || user.username}`}
          detail="Your mobile workspace is scoped to your assigned Bonde classes."
        />
        <View style={styles.metricGrid}>
          <MetricTile
            value={String(summary.assignedClasses)}
            label="Assigned Classes"
            hint="From explicit access and timetable"
          />
          <MetricTile
            value={String(summary.assignedSubjects)}
            label="Subjects"
            hint="Unique subjects you handle"
          />
          <MetricTile
            value={String(summary.timetablePeriods)}
            label="Timetable Periods"
            hint="Current scheduled lessons"
          />
        </View>
      </ShellCard>

      <ShellCard subtle>
        <SectionTitle
          eyebrow="ASSIGNMENTS"
          title="Class and subject coverage"
          detail="Tap a class to open its detail view."
        />
        <View style={styles.listStack}>
          {classes.length ? (
            classes.map((cls) => (
              <Pressable
                key={cls.id}
                onPress={() => onSelectClass(cls.id)}
                style={[
                  styles.classItem,
                  selectedClassId === cls.id && styles.classItemActive,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.classItemTitle}>{formatClassLabel(cls)}</Text>
                  <Text style={styles.classItemMeta}>
                    {cls.studentCount || 0} students | {(cls.subjects || []).length} subjects
                  </Text>
                </View>
                <Text style={styles.classItemAction}>
                  {selectedClassId === cls.id ? "Open" : "View"}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>No assigned classes are visible yet.</Text>
          )}
        </View>
      </ShellCard>

      {activeClass ? (
        <ShellCard>
          <SectionTitle
            eyebrow="CLASS DETAIL"
            title={formatClassLabel(activeClass)}
            detail="Students and current subject list from the live backend."
          />
          {classDetails?.loading ? (
            <ActivityIndicator color={MOBILE_THEME.primary} />
          ) : classDetails?.error ? (
            <Text style={styles.errorText}>{classDetails.error}</Text>
          ) : classDetails?.data ? (
            <View style={styles.stack}>
              <View style={styles.miniMetricRow}>
                <MiniMetric label="Students" value={String(rosterSummary.totalStudents)} />
                <MiniMetric label="Present" value={String(rosterSummary.present)} />
                <MiniMetric label="Absent" value={String(rosterSummary.absent)} />
                <MiniMetric label="Subjects" value={String(rosterSummary.subjectCount)} />
              </View>
              <View style={styles.chipRow}>
                {(classDetails.data.subjects || []).map((subject) => (
                  <View key={subject} style={styles.subjectChip}>
                    <Text style={styles.subjectChipText}>{subject}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.formBlockCompact}>
                <Text style={styles.inputLabel}>Find student</Text>
                <TextInput
                  value={studentQuery}
                  onChangeText={setStudentQuery}
                  placeholder="Search name, index no, or status"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
              <Text style={styles.subsectionLabel}>Students</Text>
              <View style={styles.studentList}>
                {filteredStudents.map((student) => (
                  <View key={student.id} style={styles.studentRow}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {(student.name || "?").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{student.name || "Unnamed Student"}</Text>
                      <Text style={styles.studentMeta}>
                        {student.indexNo || "-"} | {student.status || "present"}
                      </Text>
                    </View>
                  </View>
                ))}
                {!filteredStudents.length ? (
                  <Text style={styles.emptyText}>No students match this search.</Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </ShellCard>
      ) : null}
    </View>
  );
}

function TeacherTimetableTab({ user, classes }) {
  const schedule = useMemo(() => buildTeacherSchedule(user, classes), [user, classes]);

  return (
    <View style={styles.stack}>
      <ShellCard>
        <SectionTitle
          eyebrow="TIMETABLE"
          title="Your teaching schedule"
          detail="Built from the timetable entries already saved inside your visible classes."
        />
        {schedule.length ? (
          <View style={styles.stack}>
            {schedule.map((slot) => (
              <View key={`${slot.classId}-${slot.slotKey}`} style={styles.scheduleCard}>
                <View style={styles.scheduleTopRow}>
                  <Text style={styles.scheduleDay}>{slot.dayLabel}</Text>
                  <Text style={styles.scheduleTime}>{slot.periodTime || slot.periodLabel}</Text>
                </View>
                <Text style={styles.scheduleSubject}>{slot.subject}</Text>
                <Text style={styles.scheduleMeta}>
                  {slot.classLabel}
                  {slot.room ? ` | Room ${slot.room}` : ""}
                </Text>
                {slot.note ? <Text style={styles.scheduleNote}>{slot.note}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No timetable periods are assigned to this teacher yet.
          </Text>
        )}
      </ShellCard>
    </View>
  );
}

function ParentHome({ user, profile }) {
  const summary = useMemo(() => summarizeParentProfile(profile), [profile]);

  return (
    <View style={styles.stack}>
      <ShellCard>
        <SectionTitle
          eyebrow="PARENT DASHBOARD"
          title={profile?.name || user.displayName || user.username}
          detail={
            profile?.indexNo
              ? `Linked Index No: ${profile.indexNo}`
              : "No linked learner yet"
          }
        />
        <View style={styles.metricGrid}>
          <MetricTile
            value={String(summary.classCount)}
            label="Class Records"
            hint="Historical class entries"
          />
          <MetricTile
            value={summary.latestDivision}
            label="Latest Division"
            hint="Derived from latest saved result set"
          />
          <MetricTile
            value={summary.examCount}
            label="Exam Sets"
            hint="Saved across available entries"
          />
        </View>
      </ShellCard>

      {summary.latestResult ? (
        <ShellCard subtle>
          <SectionTitle
            eyebrow="LATEST RESULT"
            title={summary.latestResult.classLabel}
            detail={`${summary.latestResult.examLabel} | Avg ${summary.latestResult.averageLabel}`}
          />
          <View style={styles.chipRow}>
            {summary.latestResult.subjects.map((subject) => (
              <View
                key={`${subject.label}-${subject.score}`}
                style={styles.scoreChip}
              >
                <Text style={styles.scoreChipText}>
                  {subject.label} {subject.score}
                </Text>
              </View>
            ))}
          </View>
        </ShellCard>
      ) : null}

      <ShellCard>
        <SectionTitle
          eyebrow="RESULT HISTORY"
          title="Saved academic records"
          detail="Each card reflects one class entry from the current Bonde profile endpoint."
        />
        <View style={styles.stack}>
          {summary.entries.length ? (
            summary.entries.map((entry) => (
              <View
                key={`${entry.classId}-${entry.classLabel}`}
                style={styles.historyCard}
              >
                <Text style={styles.historyTitle}>{entry.classLabel}</Text>
                <Text style={styles.historyMeta}>
                  {entry.examCount} exam set{entry.examCount === 1 ? "" : "s"}
                  {entry.remarks ? ` | ${entry.remarks}` : ""}
                </Text>
                <View style={styles.chipRow}>
                  {entry.exams.slice(0, 4).map((exam) => (
                    <View
                      key={`${entry.classId}-${exam.name}`}
                      style={styles.subjectChip}
                    >
                      <Text style={styles.subjectChipText}>{exam.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No result history is available for this account.
            </Text>
          )}
        </View>
      </ShellCard>
    </View>
  );
}

function ParentResultsTab({ profile }) {
  const summary = useMemo(() => summarizeParentProfile(profile), [profile]);
  const snapshots = useMemo(() => buildParentReportSnapshots(profile), [profile]);

  return (
    <View style={styles.stack}>
      <ShellCard subtle>
        <SectionTitle
          eyebrow="REPORT SNAPSHOT"
          title="Latest class result cards"
          detail="A compact report-style summary built from the learner profile data currently exposed by the backend."
        />
        {snapshots.length ? (
          <View style={styles.stack}>
            {snapshots.map((snapshot) => (
              <View key={`${snapshot.classId}-${snapshot.latestExamName}`} style={styles.reportCard}>
                <View style={styles.reportCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportCardTitle}>{snapshot.classLabel}</Text>
                    <Text style={styles.reportCardMeta}>{snapshot.latestExamName}</Text>
                  </View>
                  <View style={styles.reportDivisionPill}>
                    <Text style={styles.reportDivisionText}>
                      {snapshot.division ? `Div ${snapshot.division}` : "INC"}
                    </Text>
                  </View>
                </View>
                <View style={styles.miniMetricRow}>
                  <MiniMetric
                    label="Average"
                    value={snapshot.average === null ? "INC" : String(snapshot.average)}
                  />
                  <MiniMetric
                    label="Subjects"
                    value={String(snapshot.latestSubjects.length)}
                  />
                </View>
                <View style={styles.chipRow}>
                  {snapshot.latestSubjects.map((subject) => (
                    <View
                      key={`${snapshot.classId}-${snapshot.latestExamName}-${subject.label}`}
                      style={styles.scoreChip}
                    >
                      <Text style={styles.scoreChipText}>
                        {subject.label} {subject.score}
                      </Text>
                    </View>
                  ))}
                </View>
                {snapshot.remarks ? (
                  <Text style={styles.reportRemarks}>Remarks: {snapshot.remarks}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No report snapshot is available yet.</Text>
        )}
      </ShellCard>

      <ShellCard>
        <SectionTitle
          eyebrow="EXAM DETAILS"
          title="Detailed saved exam records"
          detail="Grouped from the live learner profile endpoint."
        />
        {summary.allExams.length ? (
          <View style={styles.stack}>
            {summary.allExams.map((exam, index) => (
              <View
                key={`${exam.classId}-${exam.name}-${index}`}
                style={styles.historyCard}
              >
                <Text style={styles.historyTitle}>{exam.name}</Text>
                <Text style={styles.historyMeta}>
                  {exam.classLabel}
                  {exam.average !== null ? ` | Avg ${exam.average}` : ""}
                  {exam.division ? ` | Div ${exam.division}` : ""}
                </Text>
                <View style={styles.chipRow}>
                  {exam.subjects.map((subject) => (
                    <View
                      key={`${exam.classId}-${exam.name}-${subject.label}`}
                      style={styles.scoreChip}
                    >
                      <Text style={styles.scoreChipText}>
                        {subject.label} {subject.score}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No saved exam detail is available yet.</Text>
        )}
      </ShellCard>
    </View>
  );
}

function UnsupportedRole({ user, overview }) {
  return (
    <View style={styles.stack}>
      <ShellCard>
        <SectionTitle
          eyebrow="ROLE SUPPORT"
          title={`Mobile support for ${formatRoleLabel(user.role)}`}
          detail="This first Expo build is focused on teacher/staff and parent workflows."
        />
        <Text style={styles.sectionDetail}>
          The current account signed in successfully, but this mobile app still
          needs a dedicated workflow for this role.
        </Text>
      </ShellCard>
      <AnnouncementsTab overview={overview} />
    </View>
  );
}

export default function App() {
  const [authToken, setAuthToken] = useState("");
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [classes, setClasses] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classDetails, setClassDetails] = useState({
    loading: false,
    error: "",
    data: null,
  });
  const [tab, setTab] = useState("home");
  const [booting, setBooting] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [persistSession, setPersistSession] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const isStaffPortal = user && ["teacher", "academic", "admin"].includes(user.role);
  const isParentPortal = user && user.role === "parent";

  const loadTeacherClass = useCallback(async (classId, token) => {
    if (!classId) {
      setClassDetails({ loading: false, error: "", data: null });
      return;
    }
    setClassDetails({ loading: true, error: "", data: null });
    try {
      const data = await getClassById(classId, token);
      setClassDetails({ loading: false, error: "", data });
    } catch (err) {
      setClassDetails({
        loading: false,
        error: err.message || "Unable to load class details.",
        data: null,
      });
    }
  }, []);

  const loadSessionData = useCallback(
    async (token, sessionUser) => {
      const overviewPromise = getHomepageOverview().catch(() => null);

      if (["teacher", "academic", "admin"].includes(sessionUser.role)) {
        const classesData = await getClasses(token);
        const visibleClasses = Array.isArray(classesData) ? classesData : [];
        setClasses(visibleClasses);
        setProfile(null);
        const firstClassId = visibleClasses[0]?.id || "";
        setSelectedClassId(firstClassId);
        setOverview(await overviewPromise);
        if (firstClassId) {
          await loadTeacherClass(firstClassId, token);
        } else {
          setClassDetails({ loading: false, error: "", data: null });
        }
        return;
      }

      if (sessionUser.role === "parent" && sessionUser.linkedIndexNo) {
        const [homepageOverview, studentProfile] = await Promise.all([
          overviewPromise,
          getStudentProfile(sessionUser.linkedIndexNo),
        ]);
        setOverview(homepageOverview);
        setProfile(studentProfile);
        setClasses([]);
        setSelectedClassId("");
        setClassDetails({ loading: false, error: "", data: null });
        return;
      }

      setOverview(await overviewPromise);
      setClasses([]);
      setProfile(null);
      setSelectedClassId("");
      setClassDetails({ loading: false, error: "", data: null });
    },
    [loadTeacherClass]
  );

  const restoreSession = useCallback(async () => {
    setBooting(true);
    setError("");
    try {
      const storedToken = await getStoredMobileToken();
      if (!storedToken) {
        setBooting(false);
        return;
      }
      const { user: sessionUser } = await getSession(storedToken);
      setAuthToken(storedToken);
      setUser(sessionUser);
      setPersistSession(true);
      setTab("home");
      await loadSessionData(storedToken, sessionUser);
    } catch {
      await clearStoredMobileToken();
      setAuthToken("");
      setUser(null);
      setOverview(null);
      setClasses([]);
      setProfile(null);
      setSelectedClassId("");
      setClassDetails({ loading: false, error: "", data: null });
    } finally {
      setBooting(false);
    }
  }, [loadSessionData]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      setError("Enter both username and password.");
      return;
    }
    setLoginLoading(true);
    setError("");
    try {
      const result = await login({
        username: username.trim(),
        password,
        rememberMe,
      });
      const sessionUser = result.user;
      const token = result.token;
      if (rememberMe) {
        await storeMobileToken(token);
      } else {
        await clearStoredMobileToken();
      }
      setAuthToken(token);
      setUser(sessionUser);
      setPersistSession(rememberMe);
      setTab("home");
      setPassword("");
      await loadSessionData(token, sessionUser);
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setLoginLoading(false);
    }
  }, [loadSessionData, password, rememberMe, username]);

  const handleLogout = useCallback(async () => {
    await clearStoredMobileToken();
    setAuthToken("");
    setUser(null);
    setOverview(null);
    setClasses([]);
    setProfile(null);
    setSelectedClassId("");
    setClassDetails({ loading: false, error: "", data: null });
    setTab("home");
    setPersistSession(false);
    setError("");
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!authToken || !user) return;
    setRefreshing(true);
    try {
      const { user: sessionUser } = await getSession(authToken);
      setUser(sessionUser);
      if (persistSession) {
        await storeMobileToken(authToken);
      }
      await loadSessionData(authToken, sessionUser);
    } catch (err) {
      setError(err.message || "Unable to refresh session.");
    } finally {
      setRefreshing(false);
    }
  }, [authToken, loadSessionData, persistSession, user]);

  const handleSelectClass = useCallback(
    async (classId) => {
      setSelectedClassId(classId);
      await loadTeacherClass(classId, authToken);
    },
    [authToken, loadTeacherClass]
  );

  const tabs = useMemo(() => {
    if (isStaffPortal) {
      return [
        { key: "home", label: "Home" },
        { key: "timetable", label: "Timetable" },
        { key: "announcements", label: "Notices" },
        { key: "account", label: "Account" },
      ];
    }
    if (isParentPortal) {
      return [
        { key: "home", label: "Home" },
        { key: "results", label: "Reports" },
        { key: "announcements", label: "Notices" },
        { key: "account", label: "Account" },
      ];
    }
    return [
      { key: "home", label: "Home" },
      { key: "announcements", label: "Notices" },
      { key: "account", label: "Account" },
    ];
  }, [isParentPortal, isStaffPortal]);

  const content = useMemo(() => {
    if (!user) return null;
    if (isStaffPortal) {
      if (tab === "account") {
        return (
          <AccountTab
            user={user}
            onLogout={handleLogout}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        );
      }
      if (tab === "timetable") {
        return <TeacherTimetableTab user={user} classes={classes} />;
      }
      if (tab === "announcements") {
        return <AnnouncementsTab overview={overview} />;
      }
      return (
        <TeacherHome
          user={user}
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectClass={handleSelectClass}
          classDetails={classDetails}
        />
      );
    }

    if (isParentPortal) {
      if (tab === "account") {
        return (
          <AccountTab
            user={user}
            onLogout={handleLogout}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        );
      }
      if (tab === "results") {
        return <ParentResultsTab profile={profile} />;
      }
      if (tab === "announcements") {
        return <AnnouncementsTab overview={overview} />;
      }
      return <ParentHome user={user} profile={profile} />;
    }

    if (tab === "account") {
      return (
        <AccountTab
          user={user}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      );
    }

    if (tab === "announcements") {
      return <AnnouncementsTab overview={overview} />;
    }

    return <UnsupportedRole user={user} overview={overview} />;
  }, [
    classDetails,
    classes,
    handleLogout,
    handleRefresh,
    handleSelectClass,
    isParentPortal,
    isStaffPortal,
    overview,
    profile,
    refreshing,
    selectedClassId,
    tab,
    user,
  ]);

  if (booting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={MOBILE_THEME.primary} />
          <Text style={styles.loadingText}>Restoring secure session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        username={username}
        password={password}
        rememberMe={rememberMe}
        onChangeUsername={setUsername}
        onChangePassword={setPassword}
        onChangeRememberMe={setRememberMe}
        onSubmit={handleLogin}
        loading={loginLoading}
        error={error}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroBadge}>LIVE BACKEND</Text>
            <Pressable onPress={handleRefresh} style={styles.refreshPill}>
              <Text style={styles.refreshPillText}>
                {refreshing ? "Refreshing..." : "Refresh"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.heroTitle}>Bonde OS Mobile</Text>
          <Text style={styles.heroSubtitle}>
            Signed in as {formatRoleLabel(user.role)}. This mobile app is running
            independently from the current Bonde OS web admin.
          </Text>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((item) => (
            <TabButton
              key={item.key}
              active={tab === item.key}
              label={item.label}
              onPress={() => setTab(item.key)}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MOBILE_THEME.background,
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 18,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: MOBILE_THEME.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  loginContent: {
    paddingHorizontal: 18,
    paddingVertical: 28,
    gap: 18,
  },
  loginHero: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  loginEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    color: MOBILE_THEME.primary,
    marginBottom: 10,
  },
  loginTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  loginSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: MOBILE_THEME.muted,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e4ebf4",
    shadowColor: "#102a43",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardDense: {
    padding: 16,
  },
  cardSubtle: {
    backgroundColor: "#fcfdff",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#64748b",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  sectionDetail: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: MOBILE_THEME.muted,
  },
  formBlock: {
    marginBottom: 14,
  },
  formBlockCompact: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbe4f2",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: MOBILE_THEME.text,
    backgroundColor: "#f8fafc",
  },
  rememberRow: {
    marginTop: 2,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rememberTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: MOBILE_THEME.text,
  },
  rememberHint: {
    marginTop: 4,
    fontSize: 12,
    color: MOBILE_THEME.muted,
  },
  primaryButton: {
    backgroundColor: MOBILE_THEME.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f2",
  },
  secondaryButtonDisabled: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: MOBILE_THEME.text,
    fontSize: 14,
    fontWeight: "800",
  },
  dangerButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
  },
  dangerButtonText: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "900",
  },
  heroHeader: {
    gap: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroBadge: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: MOBILE_THEME.primary,
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  refreshPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f2",
  },
  refreshPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: MOBILE_THEME.text,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: MOBILE_THEME.muted,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tabButton: {
    flexGrow: 1,
    minWidth: 72,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f2",
  },
  tabButtonActive: {
    backgroundColor: MOBILE_THEME.primary,
    borderColor: MOBILE_THEME.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: MOBILE_THEME.text,
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  stack: {
    gap: 16,
  },
  miniMetricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  miniMetric: {
    flexGrow: 1,
    minWidth: 72,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  miniMetricValue: {
    fontSize: 16,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  miniMetricLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
  },
  metricGrid: {
    gap: 10,
  },
  metricTile: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: "#dbe7ff",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
    color: MOBILE_THEME.text,
  },
  metricHint: {
    marginTop: 4,
    fontSize: 12,
    color: MOBILE_THEME.muted,
  },
  listStack: {
    gap: 10,
  },
  classItem: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f2",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  classItemActive: {
    borderColor: "#93c5fd",
    backgroundColor: "#eff6ff",
  },
  classItemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: MOBILE_THEME.text,
  },
  classItemMeta: {
    marginTop: 4,
    fontSize: 12,
    color: MOBILE_THEME.muted,
  },
  classItemAction: {
    fontSize: 12,
    fontWeight: "900",
    color: MOBILE_THEME.primary,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: MOBILE_THEME.muted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subjectChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
  },
  subjectChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: MOBILE_THEME.primary,
  },
  scoreChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  scoreChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: MOBILE_THEME.text,
  },
  subsectionLabel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  studentList: {
    gap: 10,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    color: MOBILE_THEME.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  studentName: {
    fontSize: 14,
    fontWeight: "800",
    color: MOBILE_THEME.text,
  },
  studentMeta: {
    marginTop: 3,
    fontSize: 12,
    color: MOBILE_THEME.muted,
  },
  noticeCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeIconText: {
    fontSize: 12,
    fontWeight: "900",
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  noticeBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: MOBILE_THEME.muted,
  },
  infoList: {
    gap: 8,
  },
  infoRow: {
    fontSize: 14,
    color: MOBILE_THEME.text,
    lineHeight: 20,
  },
  inlineButtons: {
    flexDirection: "row",
    gap: 12,
  },
  historyCard: {
    borderRadius: 18,
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: "#dbe4f2",
    padding: 14,
    gap: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  historyMeta: {
    fontSize: 12,
    color: MOBILE_THEME.muted,
    lineHeight: 18,
  },
  reportCard: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f2",
    padding: 16,
    gap: 12,
  },
  reportCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  reportCardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  reportCardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: MOBILE_THEME.muted,
  },
  reportDivisionPill: {
    borderRadius: 999,
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reportDivisionText: {
    fontSize: 11,
    fontWeight: "900",
    color: MOBILE_THEME.primary,
  },
  reportRemarks: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },
  scheduleCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dbe4f2",
    backgroundColor: "#ffffff",
    gap: 6,
  },
  scheduleTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  scheduleDay: {
    fontSize: 12,
    fontWeight: "900",
    color: MOBILE_THEME.primary,
    letterSpacing: 0.4,
  },
  scheduleTime: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  scheduleSubject: {
    fontSize: 16,
    fontWeight: "900",
    color: MOBILE_THEME.text,
  },
  scheduleMeta: {
    fontSize: 13,
    color: MOBILE_THEME.muted,
  },
  scheduleNote: {
    fontSize: 12,
    color: "#64748b",
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: "700",
  },
});
