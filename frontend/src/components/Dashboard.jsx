import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api";
import { exportElementToPdf } from "../utils/pdfExport";
import { useViewport } from "../utils/useViewport";
import {
  glassPanelStyle,
  pageBackground,
  pillStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  softCardStyle,
} from "../utils/designSystem";

const TONE_STYLES = {
  info: {
    background: "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(14,165,233,0.07))",
    border: "rgba(37,99,235,0.16)",
    chip: "#2563eb",
  },
  success: {
    background: "linear-gradient(135deg, rgba(5,150,105,0.10), rgba(20,184,166,0.08))",
    border: "rgba(5,150,105,0.16)",
    chip: "#059669",
  },
  warning: {
    background: "linear-gradient(135deg, rgba(217,119,6,0.10), rgba(245,158,11,0.08))",
    border: "rgba(217,119,6,0.18)",
    chip: "#d97706",
  },
  accent: {
    background: "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(168,85,247,0.08))",
    border: "rgba(124,58,237,0.16)",
    chip: "#7c3aed",
  },
};

const FORMS = ["Form I", "Form II", "Form III", "Form IV"];

function Icon({ children, size = 20, strokeWidth = 1.9 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <Icon>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M4.6 18c1.4-3.6 9.4-3.6 10.8 0" />
      <path d="M18 8v6" />
      <path d="M15 11h6" />
    </Icon>
  );
}

function TeacherIcon() {
  return (
    <Icon>
      <path d="M3.5 8 12 4l8.5 4-8.5 4-8.5-4Z" />
      <path d="M7 10.2v4.3c0 1.6 2.2 3 5 3s5-1.4 5-3v-4.3" />
      <path d="M20 9.5v5" />
    </Icon>
  );
}

function ClipboardIcon() {
  return (
    <Icon>
      <rect x="7" y="5" width="10" height="15" rx="2.5" />
      <path d="M10 5.2h4" />
      <path d="M9.5 11h5" />
      <path d="M9.5 15h5" />
    </Icon>
  );
}

function BookIcon() {
  return (
    <Icon>
      <path d="M5.5 5.5h8a3 3 0 0 1 3 3v10h-8a3 3 0 0 0-3 3Z" />
      <path d="M18.5 5.5h-8a3 3 0 0 0-3 3v10h8a3 3 0 0 1 3 3Z" />
    </Icon>
  );
}

function PieIcon() {
  return (
    <Icon>
      <path d="M12 3v9h9" />
      <path d="M20.2 14.2A8.2 8.2 0 1 1 10 3.2" />
    </Icon>
  );
}

function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m16.2 16.2 3.8 3.8" />
    </Icon>
  );
}

function ArrowRightIcon() {
  return (
    <Icon>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}

function ShieldIcon() {
  return (
    <Icon>
      <path d="M12 3.5 19 6v5.2c0 4.3-2.8 8-7 9.3-4.2-1.3-7-5-7-9.3V6l7-2.5Z" />
      <path d="m9.3 12 1.9 1.9 3.8-4" />
    </Icon>
  );
}

function SettingsIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19 12a7.4 7.4 0 0 0-.1-1.1l2-1.4-2-3.4-2.3.8a7.3 7.3 0 0 0-1.8-1L14.4 3h-4.8L9.2 5.9a7.3 7.3 0 0 0-1.8 1l-2.3-.8-2 3.4 2 1.4a7.4 7.4 0 0 0 0 2.2l-2 1.4 2 3.4 2.3-.8a7.3 7.3 0 0 0 1.8 1l.4 2.9h4.8l.4-2.9a7.3 7.3 0 0 0 1.8-1l2.3.8 2-3.4-2-1.4c.1-.4.1-.8.1-1.1Z" />
    </Icon>
  );
}

function ExportIcon() {
  return (
    <Icon>
      <path d="M12 4v11" />
      <path d="m8.5 8 3.5-4 3.5 4" />
      <path d="M5 19h14" />
    </Icon>
  );
}

function ActivityIcon() {
  return (
    <Icon>
      <path d="M3 12h4l2.2-4 4 8 2.3-4H21" />
    </Icon>
  );
}

function BellIcon() {
  return (
    <Icon>
      <path d="M6 17.2V11a6 6 0 1 1 12 0v6.2l1.7 1.5H4.3L6 17.2Z" />
      <path d="M10 19.3a2.3 2.3 0 0 0 4 0" />
    </Icon>
  );
}

function formatRole(role) {
  if (!role) return "Staff";
  if (role === "admin") return "Super Administrator";
  if (role === "academic") return "Academic Officer";
  return `${role.slice(0, 1).toUpperCase()}${role.slice(1)}`;
}

function normalize(value) {
  return String(value || "").trim();
}

function sortYears(values) {
  return [...values].sort((a, b) => Number(b) - Number(a));
}

function sortForms(values) {
  return [...values].sort((a, b) => {
    const aIndex = FORMS.indexOf(a);
    const bIndex = FORMS.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return String(a).localeCompare(String(b));
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function initialsFromUser(user) {
  const pieces = String(user?.displayName || user?.username || "Admin")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  return pieces.map((piece) => piece[0]?.toUpperCase() || "").join("") || "AD";
}

function calculatePassRate(students) {
  const completed = students.filter((student) => student?.div !== null && student?.div !== undefined && student?.div !== "");
  if (!completed.length) return 0;
  const passed = completed.filter((student) => student.div !== "0").length;
  return Math.round((passed / completed.length) * 100);
}

function calculateAverage(students) {
  const scored = students.filter((student) => typeof student?.avg === "number" || typeof student?.total === "number");
  if (!scored.length) return 0;
  const total = scored.reduce((sum, student) => {
    if (typeof student.avg === "number") return sum + student.avg;
    return sum + (Number(student.total || 0) / Math.max((student.grades || []).filter((grade) => grade?.score != null).length, 1));
  }, 0);
  return Number((total / scored.length).toFixed(1));
}

function countEnteredScores(classes) {
  return classes.reduce((sum, cls) => {
    const students = Array.isArray(cls.computed) ? cls.computed : [];
    return (
      sum +
      students.reduce(
        (studentSum, student) =>
          studentSum +
          (Array.isArray(student.grades)
            ? student.grades.filter((grade) => grade?.score !== null && grade?.score !== undefined).length
            : 0),
        0
      )
    );
  }, 0);
}

function buildOverviewSeries(classes) {
  const grouped = sortForms(
    Array.from(new Set(classes.map((cls) => normalize(cls.form)).filter(Boolean)))
  ).map((form) => {
    const formClasses = classes.filter((cls) => normalize(cls.form) === form);
    const students = formClasses.flatMap((cls) => cls.computed || []).filter((student) => student?.total !== null);
    return {
      label: form,
      value: calculatePassRate(students),
      average: calculateAverage(students),
      count: students.length,
    };
  });

  return grouped.length
    ? grouped
    : FORMS.map((form) => ({ label: form, value: 0, average: 0, count: 0 }));
}

function buildTrendCaption(current, previous, suffix = "") {
  if (!previous && current) return `New activity${suffix}`;
  if (!current && !previous) return "No change";
  if (current === previous) return "No change";
  const delta = current - previous;
  const percent = previous ? Math.round((Math.abs(delta) / previous) * 100) : 100;
  return `${delta > 0 ? "+" : "-"} ${percent}%${suffix}`;
}

function scoreActivityTone(item) {
  if (item.type === "alert") return { color: "#dc2626", bg: "rgba(220,38,38,0.10)" };
  if (item.type === "success") return { color: "#059669", bg: "rgba(5,150,105,0.12)" };
  if (item.type === "accent") return { color: "#7c3aed", bg: "rgba(124,58,237,0.12)" };
  if (item.type === "warning") return { color: "#d97706", bg: "rgba(217,119,6,0.12)" };
  return { color: "#2563eb", bg: "rgba(37,99,235,0.10)" };
}

function buildActivities(authLogs, classes) {
  const items = [];

  authLogs.forEach((log) => {
    if (!log?.createdAt) return;
    const failed = log.status === "failed";
    items.push({
      id: `auth-${log.id || `${log.username}-${log.createdAt}`}`,
      title: failed
        ? `Failed ${log.action || "login"} attempt`
        : log.action === "bootstrap"
        ? "Bootstrap administrator created"
        : `${log.username || "User"} signed in`,
      subtitle: failed
        ? log.reason || "Authentication failed"
        : log.reason || formatRole(log.role),
      time: log.createdAt,
      type: failed ? "alert" : log.action === "bootstrap" ? "accent" : "success",
    });
  });

  classes.forEach((cls) => {
    if (cls?.created_at) {
      items.push({
        id: `class-created-${cls.id}`,
        title: `${cls.name || cls.form || "Class"} configured`,
        subtitle: `${cls.studentCount || cls.student_count || 0} students ready for entry`,
        time: cls.created_at,
        type: "info",
      });
    }
    if (cls?.published_at || cls?.published) {
      items.push({
        id: `class-published-${cls.id}`,
        title: `${cls.name || cls.form || "Class"} results published`,
        subtitle: cls.school_info?.exam || "Latest exam session is public",
        time: cls.published_at || cls.updated_at || cls.created_at,
        type: "accent",
      });
    }
  });

  return items
    .filter((item) => item.time)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);
}

function buildChartPath(points, width, height, padding) {
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;
  const coords = points.map((point, index) => {
    const x = padding.left + step * index;
    const y = padding.top + innerHeight - (Math.max(0, Math.min(100, point.value)) / 100) * innerHeight;
    return { x, y, value: point.value, label: point.label };
  });

  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const area = coords.length
    ? `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${(height - padding.bottom).toFixed(2)} L ${coords[0].x.toFixed(2)} ${(height - padding.bottom).toFixed(2)} Z`
    : "";

  return { coords, line, area, innerHeight };
}

function MetricCard({ item, compact, dense }) {
  return (
    <div
      style={{
        ...glassPanelStyle({
          compact,
          dense,
          radius: dense ? 18 : 24,
          padding: dense ? "12px 12px 11px" : compact ? "15px 15px 13px" : "18px 18px 16px",
        }),
        minHeight: dense ? 104 : compact ? 132 : 162,
        display: "grid",
        alignContent: "space-between",
        gap: dense ? 8 : 12,
      }}
    >
      <div
        style={{
          width: dense ? 42 : 58,
          height: dense ? 42 : 58,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: item.color,
          background: item.iconBackground,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.65), 0 14px 24px ${item.shadow}`,
        }}
      >
        {item.icon}
      </div>
      <div>
        <div style={{ fontSize: dense ? 13 : 14, color: "#334155", fontWeight: 700 }}>{item.label}</div>
        <div style={{ marginTop: dense ? 5 : 8, fontSize: dense ? 22 : compact ? 28 : 34, lineHeight: 1, fontWeight: 900, color: "#0f172a" }}>
          {item.value}
        </div>
        <div style={{ marginTop: dense ? 5 : 10, fontSize: dense ? 11 : 13, fontWeight: 700, color: item.deltaColor, lineHeight: 1.35 }}>
          {item.delta}
        </div>
      </div>
    </div>
  );
}

function ActionTile({ label, icon, color, bg, onClick, disabled = false, dense = false }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        ...glassPanelStyle({
          dense,
          radius: dense ? 16 : 20,
          padding: dense ? "11px 11px 10px" : "14px 14px 12px",
        }),
        background: disabled
          ? "linear-gradient(135deg, rgba(248,250,252,0.94), rgba(241,245,249,0.84))"
          : "linear-gradient(135deg, rgba(255,255,255,0.86), rgba(246,250,255,0.72))",
        display: "grid",
        gap: dense ? 8 : 12,
        justifyItems: "start",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        boxShadow: disabled ? "none" : "0 14px 36px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.88)",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: dense ? 38 : 50,
          height: dense ? 38 : 50,
          borderRadius: dense ? 12 : 18,
          display: "grid",
          placeItems: "center",
          color,
          background: bg,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: dense ? 12 : 14, fontWeight: 800, color: "#0f172a", lineHeight: 1.25 }}>{label}</div>
    </button>
  );
}

export function Dashboard({
  currentUser,
  managedUsers = [],
  authLogs = [],
  allComputed = [],
  onLoadUsers,
  onLoadAuthLogs,
  onOpenClass,
  onViewProfile,
  onOpenAccount,
  onOpenReports,
  onOpenSettings,
  onExportBackup,
}) {
  const { isXs, isMobile, isTablet, isShort } = useViewport();
  const compact = isMobile || (isTablet && !isShort);
  const dense = isMobile || isShort;
  const glassPanel = glassPanelStyle({ compact, dense });
  const dashboardRef = useRef(null);
  const [filterYear, setFilterYear] = useState("all");
  const [overview, setOverview] = useState({ announcements: [], highlights: [], stats: {}, formBreakdown: [] });
  const [overviewError, setOverviewError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!managedUsers.length && typeof onLoadUsers === "function") {
      Promise.resolve(onLoadUsers()).catch(() => {});
    }
  }, [managedUsers.length, onLoadUsers]);

  useEffect(() => {
    if (!authLogs.length && typeof onLoadAuthLogs === "function") {
      Promise.resolve(onLoadAuthLogs(12)).catch(() => {});
    }
  }, [authLogs.length, onLoadAuthLogs]);

  useEffect(() => {
    let cancelled = false;
    API.getHomepageOverview()
      .then((payload) => {
        if (cancelled) return;
        setOverview(payload || { announcements: [], highlights: [], stats: {}, formBreakdown: [] });
        setOverviewError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setOverviewError(err.message || "Unable to load homepage overview");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(
    () =>
      sortYears(
        Array.from(new Set(allComputed.map((cls) => normalize(cls.year)).filter(Boolean)))
      ),
    [allComputed]
  );

  useEffect(() => {
    if (filterYear === "all" && years.length) {
      setFilterYear(years[0]);
      return;
    }
    if (filterYear !== "all" && filterYear && !years.includes(filterYear) && years.length) {
      setFilterYear(years[0]);
    }
  }, [filterYear, years]);

  const selectedYear = filterYear === "all" ? years[0] || "" : filterYear;

  const filteredClasses = useMemo(() => {
    if (!selectedYear) return allComputed;
    return allComputed.filter((cls) => normalize(cls.year) === selectedYear);
  }, [allComputed, selectedYear]);

  const previousYear = useMemo(() => years.find((year) => year !== selectedYear) || "", [selectedYear, years]);
  const previousClasses = useMemo(
    () => allComputed.filter((cls) => previousYear && normalize(cls.year) === previousYear),
    [allComputed, previousYear]
  );

  const allStudents = useMemo(
    () => filteredClasses.flatMap((cls) => (Array.isArray(cls.computed) ? cls.computed : [])),
    [filteredClasses]
  );

  const previousStudents = useMemo(
    () => previousClasses.flatMap((cls) => (Array.isArray(cls.computed) ? cls.computed : [])),
    [previousClasses]
  );

  const uniqueSubjects = useMemo(
    () => Array.from(new Set(filteredClasses.flatMap((cls) => cls.subjects || []).filter(Boolean))),
    [filteredClasses]
  );

  const totalStudents = filteredClasses.reduce(
    (sum, cls) => sum + Number(cls.studentCount ?? cls.student_count ?? cls.students?.length ?? cls.computed?.length ?? 0),
    0
  );
  const previousStudentCount = previousClasses.reduce(
    (sum, cls) => sum + Number(cls.studentCount ?? cls.student_count ?? cls.students?.length ?? cls.computed?.length ?? 0),
    0
  );
  const teacherCount = managedUsers.filter((user) => (user.role === "teacher" || user.role === "academic") && user.active !== false).length;
  const totalResults = countEnteredScores(filteredClasses);
  const previousResults = countEnteredScores(previousClasses);
  const passRate = calculatePassRate(allStudents.filter((student) => student?.total !== null));
  const previousPassRate = calculatePassRate(previousStudents.filter((student) => student?.total !== null));
  const chartSeries = useMemo(() => buildOverviewSeries(filteredClasses), [filteredClasses]);
  const activities = useMemo(() => buildActivities(authLogs, filteredClasses), [authLogs, filteredClasses]);

  const successfulAuthRate = authLogs.length
    ? Math.round((authLogs.filter((log) => log.status === "success").length / authLogs.length) * 100)
    : 100;
  const publishedClassesCount = filteredClasses.filter((cls) => cls.published || cls.published_at).length;
  const classCoverage = filteredClasses.length ? Math.round((publishedClassesCount / filteredClasses.length) * 100) : 0;
  const dataCompleteness = totalStudents && uniqueSubjects.length
    ? Math.min(100, Math.round((totalResults / (totalStudents * uniqueSubjects.length)) * 100))
    : 0;
  const activeFormsCount = new Set(filteredClasses.map((cls) => normalize(cls.form)).filter(Boolean)).size;
  const loginEventsCount = authLogs.length;
  const homepageAnnouncementCount = (overview.announcements || []).length;
  const operationalStats = [
    ["Published Classes", `${publishedClassesCount} / ${filteredClasses.length || 0}`, "#16a34a"],
    ["Auth Success", `${successfulAuthRate}%`, "#2563eb"],
    ["Data Complete", `${dataCompleteness}%`, "#7c3aed"],
    ["Active Forms", `${activeFormsCount}`, "#ea580c"],
  ];

  const welcomeName = currentUser?.displayName || currentUser?.username || "Administrator";
  const latestSuccessLog = authLogs.find((log) => log.status === "success" && log.username === currentUser?.username);
  const lastLogin = currentUser?.lastLoginAt || latestSuccessLog?.createdAt || "";

  const kpiItems = [
    {
      label: "Total Students",
      value: totalStudents.toLocaleString(),
      icon: <UserPlusIcon />,
      color: "#0f8b8d",
      iconBackground: "linear-gradient(145deg, rgba(20,184,166,0.14), rgba(103,232,249,0.18))",
      shadow: "rgba(15,139,141,0.14)",
      delta: buildTrendCaption(totalStudents, previousStudentCount, " this year"),
      deltaColor: "#059669",
    },
    {
      label: "Total Teachers",
      value: teacherCount.toLocaleString(),
      icon: <TeacherIcon />,
      color: "#2563eb",
      iconBackground: "linear-gradient(145deg, rgba(59,130,246,0.14), rgba(191,219,254,0.24))",
      shadow: "rgba(37,99,235,0.14)",
      delta: `${managedUsers.filter((user) => user.active !== false).length.toLocaleString()} active accounts`,
      deltaColor: "#2563eb",
    },
    {
      label: "Total Subjects",
      value: uniqueSubjects.length.toLocaleString(),
      icon: <ClipboardIcon />,
      color: "#d97706",
      iconBackground: "linear-gradient(145deg, rgba(251,146,60,0.16), rgba(254,215,170,0.24))",
      shadow: "rgba(217,119,6,0.16)",
      delta: `${filteredClasses.length.toLocaleString()} classes configured`,
      deltaColor: "#b45309",
    },
    {
      label: "Total Results",
      value: totalResults.toLocaleString(),
      icon: <BookIcon />,
      color: "#7c3aed",
      iconBackground: "linear-gradient(145deg, rgba(167,139,250,0.16), rgba(221,214,254,0.24))",
      shadow: "rgba(124,58,237,0.14)",
      delta: buildTrendCaption(totalResults, previousResults, " this year"),
      deltaColor: "#7c3aed",
    },
    {
      label: "Average Pass Rate",
      value: `${passRate}%`,
      icon: <PieIcon />,
      color: "#ef4444",
      iconBackground: "linear-gradient(145deg, rgba(252,165,165,0.18), rgba(254,226,226,0.24))",
      shadow: "rgba(239,68,68,0.14)",
      delta: buildTrendCaption(passRate, previousPassRate, " from last year"),
      deltaColor: "#dc2626",
    },
  ];

  const { coords, line, area } = useMemo(
    () =>
      buildChartPath(chartSeries, 860, 310, {
        top: 26,
        right: 26,
        bottom: 42,
        left: 46,
      }),
    [chartSeries]
  );

  const quickActions = [
    {
      label: "Add Student",
      icon: <UserPlusIcon />,
      color: "#0f8b8d",
      bg: "linear-gradient(145deg, rgba(20,184,166,0.14), rgba(204,251,241,0.5))",
      onClick: () => {
        const firstClass = filteredClasses[0] || allComputed[0];
        if (firstClass) onOpenClass?.(firstClass.id);
      },
      disabled: !(filteredClasses[0] || allComputed[0]),
    },
    {
      label: "Manage Users",
      icon: <TeacherIcon />,
      color: "#2563eb",
      bg: "linear-gradient(145deg, rgba(59,130,246,0.14), rgba(219,234,254,0.55))",
      onClick: onOpenAccount,
    },
    {
      label: "Results Reports",
      icon: <ClipboardIcon />,
      color: "#d97706",
      bg: "linear-gradient(145deg, rgba(251,146,60,0.14), rgba(255,237,213,0.6))",
      onClick: onOpenReports,
    },
    {
      label: "System Settings",
      icon: <SettingsIcon />,
      color: "#7c3aed",
      bg: "linear-gradient(145deg, rgba(167,139,250,0.14), rgba(237,233,254,0.55))",
      onClick: onOpenSettings,
    },
    {
      label: "Export Dashboard",
      icon: <ExportIcon />,
      color: "#059669",
      bg: "linear-gradient(145deg, rgba(74,222,128,0.14), rgba(220,252,231,0.55))",
      onClick: () => exportElementToPdf(dashboardRef.current, `admin-dashboard-${selectedYear || "current"}.pdf`, "portrait", "a4", 6),
    },
    {
      label: "Backup Data",
      icon: <ShieldIcon />,
      color: "#ea580c",
      bg: "linear-gradient(145deg, rgba(251,146,60,0.14), rgba(255,237,213,0.6))",
      onClick: onExportBackup,
    },
  ];

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults(null);
      setSearchError("");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const results = await API.searchStudents(query, { limit: compact ? 8 : 10 });
      setSearchResults(results);
    } catch (err) {
      setSearchError(err.message || "Unable to search students");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [compact, searchQuery]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: dense ? 10 : compact ? 14 : 20,
        background: pageBackground,
      }}
    >
      <div ref={dashboardRef} style={{ maxWidth: 1460, margin: "0 auto", display: "grid", gap: dense ? 12 : compact ? 16 : 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
            gap: dense ? 12 : 18,
          }}
        >
          <div
            style={{
              ...glassPanel,
              borderRadius: 30,
              padding: dense ? 14 : compact ? 18 : 22,
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "auto 1fr",
              gap: dense ? 12 : compact ? 16 : 22,
              alignItems: "center",
            }}
          >
            <div style={{ display: "grid", justifyItems: compact ? "start" : "center", gap: dense ? 8 : 12 }}>
              <div
                style={{
                  width: dense ? 74 : compact ? 94 : 122,
                  height: dense ? 74 : compact ? 94 : 122,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #dbeafe, #99f6e4)",
                  padding: dense ? 4 : 5,
                  boxShadow: "0 18px 40px rgba(15,23,42,0.10)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background: "linear-gradient(145deg, #1f3c88, #11998e)",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: dense ? 22 : compact ? 28 : 36,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {initialsFromUser(currentUser)}
                </div>
              </div>
              <div
                style={{
                  width: dense ? 36 : 46,
                  height: dense ? 36 : 46,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #14b8a6, #0f8b8d)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 16px 30px rgba(15,139,141,0.22)",
                  marginTop: dense ? -50 : compact ? -64 : -70,
                  marginLeft: dense ? 46 : compact ? 60 : 78,
                }}
              >
                <ShieldIcon />
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ ...pillStyle({ tone: "teal" }), display: "inline-flex" }}>Operations Console</div>
              <div style={{ fontSize: dense ? 14 : compact ? 16 : 18, color: "#0f172a", fontWeight: 700, marginTop: dense ? 10 : 12 }}>Welcome back,</div>
              <div style={{ fontSize: dense ? 28 : compact ? 34 : 44, lineHeight: 1.02, marginTop: 8, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {welcomeName}
              </div>
              <div style={{ marginTop: dense ? 10 : 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={pillStyle({ tone: "blue" })}>{formatRole(currentUser?.role)}</span>
                <span style={{ fontSize: dense ? 14 : 16, color: "#475569", fontWeight: 600 }}>Bonde Secondary School</span>
              </div>
              {dense && (
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {[
                    ["Students", totalStudents.toLocaleString()],
                    ["Pass Rate", `${passRate}%`],
                    ["Results", totalResults.toLocaleString()],
                    ["Teachers", teacherCount.toLocaleString()],
                  ].map(([label, value]) => (
                    <div key={label} style={{ ...softCardStyle({ padding: 10, radius: 16 }), display: "grid", gap: 2 }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                      <div style={{ fontSize: 18, color: "#0f172a", fontWeight: 900 }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
              {!dense && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={pillStyle({ tone: "teal" })}>{totalStudents.toLocaleString()} students</span>
                  <span style={pillStyle({ tone: "amber" })}>{teacherCount.toLocaleString()} staff</span>
                  <span style={pillStyle({ tone: "blue" })}>{passRate}% pass rate</span>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              ...glassPanel,
              borderRadius: 30,
              padding: dense ? 15 : compact ? 18 : 22,
              display: "grid",
              gap: 12,
            }}
          >
            {[
              ["Last Login", formatDateTime(lastLogin)],
              ["Role", formatRole(currentUser?.role), { chip: true, chipColor: "#16a34a", chipBg: "rgba(34,197,94,0.10)" }],
              ["Status", "Online", { dot: true, dotColor: "#16a34a" }],
            ].map(([label, value, meta]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  paddingBottom: 12,
                  borderBottom: label === "Status" ? "none" : "1px solid rgba(226,232,240,0.9)",
                }}
              >
                <div style={{ color: "#475569", fontSize: 15, fontWeight: 700 }}>{label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0f172a", fontWeight: 800, textAlign: "right" }}>
                  {meta?.dot && (
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: meta.dotColor, boxShadow: "0 0 0 5px rgba(34,197,94,0.12)" }} />
                  )}
                  {meta?.chip ? (
                    <span style={pillStyle({ tone: "teal" })}>
                      {value}
                    </span>
                  ) : (
                    <span style={{ fontSize: 15 }}>{value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : isTablet
              ? "repeat(3, minmax(0, 1fr))"
              : "repeat(5, minmax(0, 1fr))",
            gap: dense ? 10 : 16,
          }}
        >
          {kpiItems.map((item) => (
            <MetricCard key={item.label} item={item} compact={compact} dense={dense} />
          ))}
        </div>

        <div
          style={{
            ...glassPanel,
            borderRadius: 30,
            padding: dense ? 14 : compact ? 18 : 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: compact ? "stretch" : "center",
              flexDirection: compact ? "column" : "row",
              justifyContent: "space-between",
              gap: 14,
              marginBottom: dense ? 14 : 18,
            }}
          >
            <div>
              <div style={{ fontSize: compact ? 18 : 20, color: "#0f172a", fontWeight: 900 }}>Results Overview</div>
              <div style={{ marginTop: 5, fontSize: 14, color: "#64748b", fontWeight: 600 }}>
                {selectedYear ? `${selectedYear} academic year` : "Current academic view"}
              </div>
            </div>
            <select
              value={filterYear}
              onChange={(event) => setFilterYear(event.target.value)}
              style={{
                alignSelf: compact ? "stretch" : "center",
                ...softCardStyle({ padding: "12px 14px", radius: 16 }),
                fontSize: 14,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {years.length > 1 && <option value="all">All Years</option>}
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: compact ? 700 : 0 }}>
              <svg viewBox="0 0 860 310" width="100%" height={dense ? 248 : compact ? 300 : 310} role="img" aria-label="Results overview chart">
                <defs>
                  <linearGradient id="dashboardArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(14,165,233,0.22)" />
                    <stop offset="100%" stopColor="rgba(14,165,233,0.02)" />
                  </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map((tick) => {
                  const y = 26 + (242 - (tick / 100) * 242);
                  return (
                    <g key={tick}>
                      <line x1="46" y1={y} x2="834" y2={y} stroke="rgba(148,163,184,0.22)" strokeDasharray="5 6" />
                      <text x="0" y={y + 4} fill="#64748b" fontSize="14" fontWeight="700">
                        {tick}%
                      </text>
                    </g>
                  );
                })}
                {area && <path d={area} fill="url(#dashboardArea)" />}
                {line && <path d={line} fill="none" stroke="#0f8b8d" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />}
                {coords.map((point) => (
                  <g key={point.label}>
                    <circle cx={point.x} cy={point.y} r="7" fill="#fff" stroke="#0f8b8d" strokeWidth="4" />
                    <text x={point.x} y={point.y - 18} textAnchor="middle" fill="#0f172a" fontSize="15" fontWeight="900">
                      {point.value}%
                    </text>
                    <text x={point.x} y="292" textAnchor="middle" fill="#334155" fontSize="16" fontWeight="700">
                      {point.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
            gap: dense ? 12 : 18,
          }}
        >
          <div
            style={{
              ...glassPanel,
              borderRadius: 30,
              padding: dense ? 14 : compact ? 18 : 22,
            }}
          >
            <div style={{ fontSize: compact ? 18 : 20, color: "#0f172a", fontWeight: 900, marginBottom: 16 }}>
              Quick Actions
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: dense ? "repeat(2, minmax(0, 1fr))" : isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                gap: dense ? 10 : 14,
              }}
            >
              {quickActions.map((action) => (
                <ActionTile key={action.label} {...action} dense={dense} />
              ))}
            </div>
          </div>

          <div
            style={{
              ...glassPanel,
              borderRadius: 30,
              padding: dense ? 14 : compact ? 18 : 22,
              display: "grid",
              gap: dense ? 14 : 18,
            }}
          >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: compact ? 18 : 20, color: "#0f172a", fontWeight: 900 }}>
                Operational Summary
                  </div>
                  <div style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>
                Real-time counts
                  </div>
                </div>

            {dense ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {operationalStats.map(([label, value, color]) => (
                  <div key={label} style={{ ...softCardStyle({ padding: 12, radius: 18 }), display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                    <div style={{ fontSize: 22, color, fontWeight: 950, lineHeight: 1 }}>{value}</div>
                  </div>
                ))}
                <div
                  style={{
                    ...softCardStyle({ padding: 12, radius: 18 }),
                    gridColumn: "1 / -1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Activity logs / announcements
                  </div>
                  <div style={{ fontSize: 18, color: "#0f8b8d", fontWeight: 950 }}>{loginEventsCount} / {homepageAnnouncementCount}</div>
                </div>
              </div>
            ) : (
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "160px 1fr", gap: 18, alignItems: "center" }}>
              <div style={{ display: "grid", placeItems: "center" }}>
                  <div
                    style={{
                      width: dense ? 132 : 148,
                      height: dense ? 132 : 148,
                      borderRadius: "50%",
                      background: `conic-gradient(#0f8b8d 0 ${classCoverage}%, rgba(226,232,240,0.95) ${classCoverage}% 100%)`,
                      display: "grid",
                      placeItems: "center",
                    }}
                >
                  <div
                    style={{
                      width: dense ? 82 : 104,
                      height: dense ? 82 : 104,
                      borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "inset 0 4px 18px rgba(15,23,42,0.06)",
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                    }}
                    >
                      <div>
                      <div style={{ fontSize: dense ? 30 : 40, lineHeight: 1, fontWeight: 950, color: "#0f172a" }}>{classCoverage}%</div>
                        <div style={{ marginTop: 6, fontSize: dense ? 11 : 13, color: "#64748b", fontWeight: 800 }}>Published Coverage</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {operationalStats.map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontSize: 15, color: "#334155", fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 15, color, fontWeight: 900 }}>{value}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid rgba(226,232,240,0.88)", display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>Activity logs / announcements</div>
                  <div style={{ fontSize: 20, color: "#0f8b8d", fontWeight: 950 }}>{loginEventsCount} / {homepageAnnouncementCount}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "minmax(0, 1.15fr) minmax(340px, 0.85fr)",
            gap: dense ? 12 : 18,
          }}
        >
          <div
            style={{
              ...glassPanel,
              borderRadius: 30,
              padding: dense ? 14 : compact ? 18 : 22,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: compact ? 18 : 20, color: "#0f172a", fontWeight: 900 }}>Recent Activities</div>
              <button
                onClick={onOpenAccount}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#2563eb",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                View All
              </button>
            </div>

            {activities.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {activities.map((item) => {
                  const tone = scoreActivityTone(item);
                  return (
                    <div
                      key={item.id}
                      style={{
                        ...softCardStyle({ padding: compact ? "12px 13px" : "14px 14px", radius: 18 }),
                        display: "grid",
                        gridTemplateColumns: dense ? "auto 1fr" : "auto 1fr auto",
                        gap: 12,
                        alignItems: "start",
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: tone.bg,
                          color: tone.color,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <ActivityIcon />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, color: "#0f172a", fontWeight: 800 }}>{item.title}</div>
                        <div style={{ marginTop: 4, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>{item.subtitle}</div>
                      </div>
                      {!dense && <div style={{ fontSize: 13, color: "#475569", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {formatDateTime(item.time)}
                      </div>}
                      {dense && (
                        <div style={{ gridColumn: "2", fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                          {formatDateTime(item.time)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: "#64748b", fontSize: 14 }}>No recent activities yet.</div>
            )}
          </div>

          <div
            style={{
              ...glassPanel,
              borderRadius: 30,
              padding: dense ? 14 : compact ? 18 : 22,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: compact ? 18 : 20, color: "#0f172a", fontWeight: 900 }}>Announcements</div>
              <button
                onClick={onOpenAccount}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#2563eb",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                View All
              </button>
            </div>

            {overviewError && (
              <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 700 }}>{overviewError}</div>
            )}

            {(overview.announcements || []).slice(0, 3).map((announcement) => {
              const tone = TONE_STYLES[announcement.tone] || TONE_STYLES.info;
              return (
                <div
                  key={announcement.id}
                  style={{
                    borderRadius: 22,
                    border: `1px solid ${tone.border}`,
                    background: tone.background,
                    padding: dense ? "14px 14px 12px" : "16px 16px 14px",
                  }}
                >
                  <div style={{ color: tone.chip, fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase" }}>
                    {announcement.tone || "info"}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 18, color: "#0f172a", fontWeight: 900, lineHeight: 1.25 }}>
                    {announcement.title}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
                    {announcement.description}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    <BellIcon />
                    {formatShortDate(announcement.date)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) minmax(320px, 0.9fr)",
            gap: dense ? 12 : 18,
            alignItems: "start",
          }}
        >
          <div
            style={{
              ...glassPanel,
              borderRadius: 30,
              padding: dense ? 14 : compact ? 18 : 22,
              display: "grid",
              gap: 16,
              alignSelf: "start",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: compact ? "flex-start" : "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 5 }}>
                <div style={{ fontSize: compact ? 18 : 20, color: "#0f172a", fontWeight: 900 }}>
                  Student Lookup
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55, maxWidth: 520 }}>
                  Search by student name or CNO, then jump straight into that learner&apos;s profile and report history.
                </div>
              </div>
              {!dense && <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.24)",
                  background: "rgba(255,255,255,0.52)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                  color: "#0f8b8d",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                }}
              >
                <SearchIcon />
                Quick Access
              </div>}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isXs ? "1fr" : dense ? "minmax(0, 1fr) repeat(2, minmax(88px, auto))" : "minmax(0, 1fr) auto auto",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  alignItems: "center",
                  gap: 10,
                  borderRadius: 18,
                  border: "1px solid rgba(191,219,254,0.55)",
                  padding: dense ? "9px 11px" : "12px 14px",
                  background: "rgba(255,255,255,0.72)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <div style={{ color: "#64748b" }}>
                  <SearchIcon />
                </div>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  placeholder="Search by student name or index number"
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: 14,
                    color: "#0f172a",
                    background: "transparent",
                    width: "100%",
                  }}
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={searching}
                style={{
                  ...primaryButtonStyle(),
                  padding: "0 18px",
                  cursor: searching ? "wait" : "pointer",
                  minHeight: dense ? 44 : 50,
                }}
              >
                {searching ? "Searching..." : "Search"}
              </button>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                  setSearchError("");
                }}
                style={{
                  ...secondaryButtonStyle(),
                  padding: "0 16px",
                  minHeight: dense ? 44 : 50,
                }}
              >
                Reset
              </button>
            </div>

            {searchError && <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 700 }}>{searchError}</div>}

            {searchResults ? (
              searchResults.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {searchResults.map((student) => (
                    <button
                      key={`${student.classId}-${student.studentId}`}
                      onClick={() => onViewProfile?.(student.indexNo)}
                      style={{
                        border: "1px solid rgba(191,219,254,0.5)",
                        background: "rgba(255,255,255,0.74)",
                        borderRadius: 20,
                        padding: "14px 16px",
                  display: "grid",
                  gridTemplateColumns: dense ? "1fr auto" : compact ? "1fr auto" : "minmax(0, 1fr) auto auto",
                  gap: 10,
                  alignItems: "center",
                        textAlign: "left",
                        cursor: "pointer",
                        boxShadow: "0 12px 30px rgba(15,23,42,0.04)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, color: "#0f172a", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {student.name}
                        </div>
                        <div style={{ marginTop: 5, fontSize: 13, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {student.indexNo} | {student.className} | {student.form} {student.year}
                        </div>
                      </div>
                      {!compact && (
                        <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800 }}>
                          {student.sex || "N/A"}
                        </div>
                      )}
                      <div style={{ color: "#0f8b8d" }}>
                        <ArrowRightIcon />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    borderRadius: 22,
                    border: "1px dashed rgba(148,163,184,0.42)",
                    padding: compact ? "18px 16px" : "22px 20px",
                    background: "rgba(255,255,255,0.56)",
                    color: "#64748b",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                    No matching student found
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    Check the spelling, try the student&apos;s CNO, or open the full class list to continue from student entry.
                  </div>
                </div>
              )
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {[
                  {
                    title: "Search by CNO",
                    text: "Use the student CNO for the fastest exact match when you need one learner quickly.",
                  },
                  {
                    title: "Open profile directly",
                    text: "Search results take you straight to the student profile and report card flow from the dashboard.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      ...softCardStyle({ padding: dense ? "13px 13px" : compact ? "16px 15px" : "18px 18px", radius: 22 }),
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#102a43" }}>{item.title}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.65, color: "#5b6b80" }}>{item.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              ...glassPanel,
              borderRadius: 30,
              padding: dense ? 14 : compact ? 18 : 22,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontSize: compact ? 18 : 20, color: "#0f172a", fontWeight: 900 }}>
              Portal Highlights
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isXs ? "1fr" : compact ? "repeat(2, minmax(0, 1fr))" : "1fr",
                gap: 12,
              }}
            >
              {(overview.highlights || []).slice(0, 4).map((highlight) => (
                <div
                  key={highlight.key}
                  style={{
                    ...softCardStyle({ padding: "14px 16px", radius: 20 }),
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, color: highlight.color || "#2563eb", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    {highlight.label}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 24, color: "#0f172a", fontWeight: 950 }}>
                    {highlight.value}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                    {highlight.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
