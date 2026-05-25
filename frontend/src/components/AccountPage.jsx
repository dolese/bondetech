import React, { useEffect, useMemo, useState } from "react";
import { TextInput, SelectInput, TextAreaInput } from "./FormInputs";
import { formatUserRole, USER_ROLE_OPTIONS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import { useI18n } from "../i18n";
import { normalizeTzPhoneDraft } from "../utils/phone";

const MANAGEABLE_USER_ROLE_OPTIONS = USER_ROLE_OPTIONS.filter((option) => option.value !== "student");

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#*!";
  const cryptoApi =
    typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function"
      ? globalThis.crypto
      : null;
  if (!cryptoApi) {
    return `Tmp#${Date.now().toString(36)}${String(Math.floor(Date.now() % 1e6)).padStart(6, "0")}`.slice(0, 12);
  }
  const randomBytes = new Uint32Array(12);
  cryptoApi.getRandomValues(randomBytes);
  let value = "";
  for (let i = 0; i < randomBytes.length; i += 1) {
    value += alphabet[randomBytes[i] % alphabet.length];
  }
  return value;
}

function downloadCsv(filename, rows = []) {
  if (typeof window === "undefined") return;
  const content = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

function initialsFrom(user) {
  const source = String(user?.displayName || user?.username || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  return source.map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

const ROLE_BADGE_COLORS = {
  admin:   { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
  academic:{ bg: "#dcfce7", color: "#166534", border: "#86efac" },
  teacher: { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  student: { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  parent:  { bg: "#fef9c3", color: "#a16207", border: "#fde047" },
  default: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
};

function RoleBadge({ role }) {
  const c = ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.default;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.04em",
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
      }}
    >
      {formatUserRole(role)}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        background: active ? "#dcfce7" : "#fee2e2",
        color: active ? "#15803d" : "#b91c1c",
        border: `1px solid ${active ? "#86efac" : "#fca5a5"}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: active ? "#16a34a" : "#dc2626",
          display: "inline-block",
        }}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function TeacherDutyBadge({ active, label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        background: active ? "#e0f2fe" : "#f8fafc",
        color: active ? "#0369a1" : "#94a3b8",
        border: `1px solid ${active ? "#bae6fd" : "#e2e8f0"}`,
      }}
    >
      {label}
    </span>
  );
}

function ToggleSwitch({ checked, onChange, accentColor = "#2563eb" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        width: 40,
        height: 22,
        borderRadius: 999,
        border: "none",
        background: checked ? accentColor : "#cbd5e1",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function blankSubjectTeacherAssignment() {
  return {
    classId: "",
    subject: "",
  };
}

function normalizeTeacherAssignmentsState(value) {
  const source = value && typeof value === "object" ? value : {};
  const classTeacherClassId = String(source.classTeacherClassId || "").trim();
  const subjectAssignments = Array.isArray(source.subjectAssignments)
    ? source.subjectAssignments
        .map((entry) => ({
          classId: String(entry?.classId || "").trim(),
          subject: String(entry?.subject || "").trim().toUpperCase(),
        }))
        .filter((entry, index, collection) =>
          collection.findIndex(
            (candidate) =>
              candidate.classId === entry.classId && candidate.subject === entry.subject
          ) === index
        )
    : [];

  return {
    classTeacherClassId,
    subjectAssignments: subjectAssignments.length
      ? subjectAssignments
      : [blankSubjectTeacherAssignment()],
  };
}

function formatClassOptionLabel(cls = {}) {
  return [cls.form, cls.stream, cls.year].filter(Boolean).join(" ").trim() || cls.name || "Unnamed Class";
}

function normalizeLinkedStudentsText(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean)
    .join("\n");
}

function linkedStudentsToText(linkedStudents = [], linkedIndexNo = "") {
  const fromArray = Array.isArray(linkedStudents)
    ? linkedStudents
        .map((entry) => String(entry?.admissionNo || entry?.admission_no || entry?.indexNo || entry?.index_no || "").trim().toUpperCase())
        .filter(Boolean)
    : [];
  if (fromArray.length) {
    return fromArray.join("\n");
  }
  return String(linkedIndexNo || "").trim().toUpperCase();
}

function blankManagedUser() {
  return {
    username: "",
    displayName: "",
    role: "teacher",
    email: "",
    phone: "",
    linkedStudentsText: "",
    password: "",
    active: true,
    mustChangePassword: true,
    teacherRoles: {
      classTeacher: false,
      subjectTeacher: false,
    },
    teacherAssignments: normalizeTeacherAssignmentsState({}),
  };
}

function blankHomepageAnnouncement() {
  return {
    id: "",
    title: "",
    description: "",
    tone: "info",
    date: new Date().toISOString().slice(0, 10),
  };
}

function blankHomepageHighlight() {
  return {
    key: "",
    label: "",
    value: "",
    description: "",
    color: "#2563eb",
  };
}

function blankHomepageSlide(index = 0) {
  return {
    id: "",
    imageSrc: index === 0 ? "/asset/nembobonde.jpg" : `/asset/slider${Math.min(index + 1, 3)}.png`,
    badge: "",
    badgeSw: "",
    title: "",
    titleSw: "",
    description: "",
    descriptionSw: "",
    primaryAction: "results",
    secondaryAction: "login",
    backgroundPosition: "center",
  };
}

export function AccountPage({
  user,
  users = [],
  classes = [],
  authLogs = [],
  canManageUsers = false,
  onLoadUsers,
  onLoadAuthLogs,
  onLoadHomepageContent,
  onSaveProfile,
  onChangePassword,
  onCreateUser,
  onUpdateUser,
  onSaveHomepageContent,
  onLogout,
}) {
  const { t } = useI18n();
  const homepageToneOptions = [
    { label: t("info"), value: "info" },
    { label: t("success"), value: "success" },
    { label: t("warning"), value: "warning" },
    { label: t("accent"), value: "accent" },
  ];
  const homepageColorOptions = [
    { label: t("blue"), value: "#2563eb" },
    { label: t("green"), value: "#059669" },
    { label: t("purple"), value: "#7c3aed" },
    { label: t("orange"), value: "#d97706" },
    { label: t("cyan"), value: "#0891b2" },
    { label: t("red"), value: "#dc2626" },
  ];
  const slideActionOptions = [
    { label: "Check Results", value: "results" },
    { label: "Login", value: "login" },
    { label: "Announcements", value: "announcements" },
    { label: "Contact", value: "contact" },
  ];
  const { isXs, isMobile, isTablet } = useViewport();
  const singleColumn = isMobile;
  const stackedColumns = isMobile || isTablet;
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    role: "",
    email: "",
    phone: "",
    linkedStudentsText: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [adminForm, setAdminForm] = useState(blankManagedUser());
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);
  const [editingUsers, setEditingUsers] = useState({});
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [actionMenuUser, setActionMenuUser] = useState("");
  const [editingUsername, setEditingUsername] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [activityStatusFilter, setActivityStatusFilter] = useState("all");
  const [activityUserFilter, setActivityUserFilter] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [homepageForm, setHomepageForm] = useState({
    announcements: [],
    highlights: [],
    slides: [],
    updatedAt: "",
    updatedBy: "",
  });
  const [homepageLoading, setHomepageLoading] = useState(false);
  const [homepageSaving, setHomepageSaving] = useState(false);
  const [homepageError, setHomepageError] = useState("");
  const [homepageMessage, setHomepageMessage] = useState("");

  useEffect(() => {
    setForm({
      username: user?.username ?? "",
      displayName: user?.displayName ?? user?.username ?? "",
      role: user?.role ?? "admin",
      email: user?.email ?? "",
      phone: normalizeTzPhoneDraft(user?.phone ?? ""),
      linkedStudentsText: linkedStudentsToText(user?.linkedStudents, user?.linkedIndexNo),
    });
    setError("");
  }, [user]);

  useEffect(() => {
    if (!canManageUsers) return;
    Promise.resolve(onLoadUsers?.()).catch(() => {});
  }, [canManageUsers, onLoadUsers]);

  useEffect(() => {
    if (!canManageUsers) return;
    Promise.resolve(onLoadAuthLogs?.(60)).catch(() => {});
  }, [canManageUsers, onLoadAuthLogs]);

  useEffect(() => {
    if (!canManageUsers || !onLoadHomepageContent) return;
    setHomepageLoading(true);
    setHomepageError("");
    Promise.resolve(onLoadHomepageContent())
      .then((content) => {
        setHomepageForm({
          announcements: Array.isArray(content?.announcements) && content.announcements.length
            ? content.announcements
            : [blankHomepageAnnouncement()],
          highlights: Array.isArray(content?.highlights) && content.highlights.length
            ? content.highlights
            : [blankHomepageHighlight()],
          slides: Array.isArray(content?.slides) && content.slides.length
            ? content.slides
            : [blankHomepageSlide(0), blankHomepageSlide(1), blankHomepageSlide(2)],
          updatedAt: content?.updatedAt || "",
          updatedBy: content?.updatedBy || "",
        });
      })
      .catch((err) => {
        setHomepageError(err.message || t("unableToLoadHomepageContent"));
      })
      .finally(() => {
        setHomepageLoading(false);
      });
  }, [canManageUsers, onLoadHomepageContent]);

  useEffect(() => {
    const next = {};
    users.forEach((managedUser) => {
      next[managedUser.username] = {
        displayName: managedUser.displayName ?? managedUser.username,
        role: managedUser.role ?? "teacher",
        email: managedUser.email ?? "",
        phone: normalizeTzPhoneDraft(managedUser.phone ?? ""),
        linkedStudentsText: linkedStudentsToText(managedUser.linkedStudents, managedUser.linkedIndexNo),
        active: managedUser.active !== false,
        password: "",
        mustChangePassword: managedUser.mustChangePassword === true,
        teacherRoles: {
          classTeacher: managedUser.teacherRoles?.classTeacher === true,
          subjectTeacher: managedUser.teacherRoles?.subjectTeacher === true,
        },
        teacherAssignments: normalizeTeacherAssignmentsState(managedUser.teacherAssignments),
      };
    });
    setEditingUsers(next);
  }, [users]);

  const manageableUsers = useMemo(
    () => users.filter((managedUser) => managedUser.role !== "student"),
    [users]
  );

  const managedUserCards = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return manageableUsers
      .slice()
      .sort((a, b) => a.username.localeCompare(b.username))
      .filter((managedUser) => {
        if (roleFilter !== "all" && managedUser.role !== roleFilter) return false;
        if (!query) return true;
        return [
          managedUser.username,
          managedUser.displayName,
          managedUser.email,
          managedUser.phone,
          linkedStudentsToText(managedUser.linkedStudents, managedUser.linkedIndexNo),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });
  }, [manageableUsers, roleFilter, userSearch]);

  useEffect(() => {
    setSelectedUsers((prev) => prev.filter((username) => managedUserCards.some((userCard) => userCard.username === username)));
  }, [managedUserCards]);

  const roleSummaryRows = useMemo(() => {
    const rows = {};
    manageableUsers.forEach((managedUser) => {
      const role = managedUser.role || "unknown";
      if (!rows[role]) {
        rows[role] = { role, total: 0, active: 0, inactive: 0, resetRequired: 0 };
      }
      rows[role].total += 1;
      if (managedUser.active !== false) rows[role].active += 1;
      if (managedUser.active === false) rows[role].inactive += 1;
      if (managedUser.mustChangePassword === true) rows[role].resetRequired += 1;
    });
    return Object.values(rows).sort((a, b) => a.role.localeCompare(b.role));
  }, [manageableUsers]);

  const profileMissingFields = useMemo(() => {
    const missing = [];
    if (!String(form.phone || "").trim()) missing.push("Phone");
    if (!String(form.email || "").trim()) missing.push("Email");
    if ((form.role === "parent" || form.role === "student") && !String(form.linkedIndexNo || "").trim()) {
      missing.push("Linked Student Index No");
    }
    return missing;
  }, [form.email, form.linkedIndexNo, form.phone, form.role]);

  const profileCompletionPercent = useMemo(() => {
    const checks = [
      Boolean(String(form.displayName || "").trim()),
      Boolean(String(form.phone || "").trim()),
      Boolean(String(form.email || "").trim()),
      form.role === "parent" || form.role === "student"
        ? Boolean(String(form.linkedIndexNo || "").trim())
        : true,
    ];
    const complete = checks.filter(Boolean).length;
    return Math.round((complete / checks.length) * 100);
  }, [form.displayName, form.email, form.linkedIndexNo, form.phone, form.role]);

  const recentSecurityLogs = useMemo(
    () =>
      authLogs
        .filter((log) => log.username === user?.username)
        .slice(0, 5),
    [authLogs, user?.username]
  );

  const filteredActivityLogs = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();
    return authLogs.filter((log) => {
      if (activityStatusFilter !== "all" && log.status !== activityStatusFilter) return false;
      if (activityUserFilter.trim() && log.username !== activityUserFilter.trim()) return false;
      if (!query) return true;
      return [
        log.username,
        log.action,
        log.role,
        log.reason,
        log.ip,
        log.userAgent,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activitySearch, activityStatusFilter, activityUserFilter, authLogs]);

  const classPickerOptions = useMemo(
    () =>
      (classes || [])
        .slice()
        .sort((left, right) => formatClassOptionLabel(left).localeCompare(formatClassOptionLabel(right), "en"))
        .map((cls) => ({
          label: formatClassOptionLabel(cls),
          value: cls.id,
        })),
    [classes]
  );

  const classNameById = useMemo(
    () =>
      new Map(
        (classes || []).map((cls) => [cls.id, formatClassOptionLabel(cls)])
      ),
    [classes]
  );

  const subjectOptionsByClassId = useMemo(
    () =>
      new Map(
        (classes || []).map((cls) => [
          cls.id,
          (cls.subjects || []).map((subject) => ({
            label: subject,
            value: subject,
          })),
        ])
      ),
    [classes]
  );

  const sectionStyle = {
    background: "linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.62))",
    borderRadius: 20,
    border: "1px solid rgba(191,219,254,0.45)",
    boxShadow: "0 18px 38px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.78)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    padding: isMobile ? 18 : 24,
  };
  const softGlassStyle = {
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(191,219,254,0.42)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  };
  const adaptiveFieldGrid = singleColumn
    ? "1fr"
    : "repeat(auto-fit, minmax(min(100%, 220px), 1fr))";
  const adaptiveWideFieldGrid = singleColumn
    ? "1fr"
    : "repeat(auto-fit, minmax(min(100%, 280px), 1fr))";

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: key === "phone" ? normalizeTzPhoneDraft(value) : value,
    }));
  };

  const normalizeTeacherAccessPayload = (payload) => {
    const role = payload?.role || "teacher";
    if (role !== "teacher") {
      return {
        teacherRoles: { classTeacher: false, subjectTeacher: false },
        teacherAssignments: { classTeacherClassId: "", subjectAssignments: [] },
      };
    }

    const teacherRoles = {
      classTeacher: payload?.teacherRoles?.classTeacher === true,
      subjectTeacher: payload?.teacherRoles?.subjectTeacher === true,
    };
    const rawAssignments = normalizeTeacherAssignmentsState(payload?.teacherAssignments);

    return {
      teacherRoles,
      teacherAssignments: {
        classTeacherClassId: teacherRoles.classTeacher
          ? String(rawAssignments.classTeacherClassId || "").trim()
          : "",
        subjectAssignments: teacherRoles.subjectTeacher
          ? rawAssignments.subjectAssignments
              .map((entry) => ({
                classId: String(entry.classId || "").trim(),
                subject: String(entry.subject || "").trim().toUpperCase(),
              }))
              .filter((entry) => entry.classId && entry.subject)
          : [],
      },
    };
  };

  const validateTeacherAccessPayload = (payload) => {
    const normalized = normalizeTeacherAccessPayload(payload);
    if (payload?.role !== "teacher") return normalized;
    if (
      normalized.teacherRoles.classTeacher &&
      !normalized.teacherAssignments.classTeacherClassId
    ) {
      throw new Error("Select the class for the Class Teacher role.");
    }
    if (
      normalized.teacherRoles.subjectTeacher &&
      normalized.teacherAssignments.subjectAssignments.length === 0
    ) {
      throw new Error("Add at least one class and subject for the Subject Teacher role.");
    }
    return normalized;
  };

  const handleSave = async () => {
    const displayName = form.displayName.trim();
    const email = form.email.trim();
    if (!displayName) {
      setError(t("displayNameRequired"));
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("validEmailRequired"));
      return;
    }

    setError("");
    setSaving(true);
    try {
      const linkedStudentsText =
        ["parent", "student"].includes(form.role)
          ? normalizeLinkedStudentsText(form.linkedStudentsText)
          : "";
      await onSaveProfile?.({
        displayName,
        email,
        phone: normalizeTzPhoneDraft(form.phone),
        linkedStudents: linkedStudentsText ? linkedStudentsText.split("\n") : [],
      });
    } catch (err) {
      setError(err.message || t("unableToSaveProfile"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMsg(t("enterCurrentAndNewPassword"));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg(t("passwordConfirmationMismatch"));
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg("");
    try {
      await onChangePassword?.(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMsg(t("passwordUpdatedSuccessfully"));
    } catch (err) {
      setPasswordMsg(err.message || t("unableToUpdatePassword"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCreateUser = async () => {
    const username = adminForm.username.trim();
    const password = adminForm.password || generateTemporaryPassword();
    if (!username) {
      setAdminError(t("usernameRequired"));
      return;
    }

    setAdminSaving(true);
    setAdminError("");
    setAdminMessage("");
    try {
      const teacherAccess = validateTeacherAccessPayload(adminForm);
      const linkedStudentsText =
        adminForm.role === "parent" ? normalizeLinkedStudentsText(adminForm.linkedStudentsText) : "";
      await onCreateUser?.({
        ...adminForm,
        username,
        displayName: adminForm.displayName.trim() || username,
        email: adminForm.email.trim(),
        phone: normalizeTzPhoneDraft(adminForm.phone),
        linkedStudents: linkedStudentsText ? linkedStudentsText.split("\n") : [],
        teacherRoles: teacherAccess.teacherRoles,
        teacherAssignments: teacherAccess.teacherAssignments,
        password,
        mustChangePassword: true,
      });
      setAdminForm(blankManagedUser());
      setUserFormOpen(false);
      setAdminMessage(`User created. Temporary password: ${password}`);
    } catch (err) {
      setAdminError(err.message || t("unableToCreateUser"));
    } finally {
      setAdminSaving(false);
    }
  };

  const updateManagedField = (username, key, value) => {
    setEditingUsers((prev) => ({
      ...prev,
      [username]: {
        ...prev[username],
        [key]: key === "phone" ? normalizeTzPhoneDraft(value) : value,
      },
    }));
  };

  const handleSaveManagedUser = async (username) => {
    const payload = editingUsers[username];
    if (!payload) return;
    try {
      setAdminError("");
      setAdminMessage("");
      const teacherAccess = validateTeacherAccessPayload(payload);
      const linkedStudentsText =
        payload.role === "parent" ? normalizeLinkedStudentsText(payload.linkedStudentsText) : "";
      await onUpdateUser?.(username, {
        ...payload,
        phone: normalizeTzPhoneDraft(payload.phone),
        linkedStudents: linkedStudentsText ? linkedStudentsText.split("\n") : [],
        teacherRoles: teacherAccess.teacherRoles,
        teacherAssignments: teacherAccess.teacherAssignments,
      });
      updateManagedField(username, "password", "");
      setEditingUsername("");
      setActionMenuUser("");
      setAdminMessage(`Updated ${username}`);
    } catch (err) {
      setAdminError(err.message || `Unable to update ${username}`);
    }
  };

  const handleResetManagedPassword = async (username) => {
    const payload = editingUsers[username];
    if (!payload) return;
    const temporaryPassword = generateTemporaryPassword();
    const teacherAccess = normalizeTeacherAccessPayload(payload);
    const normalizedPayload = {
      ...payload,
      password: temporaryPassword,
      mustChangePassword: true,
      teacherRoles: teacherAccess.teacherRoles,
      teacherAssignments: teacherAccess.teacherAssignments,
    };
    setAdminError("");
    setAdminMessage("");
    try {
      await onUpdateUser?.(username, normalizedPayload);
      setEditingUsers((prev) => ({
        ...prev,
        [username]: {
          ...prev[username],
          password: "",
          mustChangePassword: true,
        },
      }));
      setEditingUsername("");
      setActionMenuUser("");
      setAdminMessage(`Password reset for ${username}. Temporary password: ${temporaryPassword}`);
    } catch (err) {
      setAdminError(err.message || `Unable to reset password for ${username}`);
    }
  };

  const handleToggleManagedStatus = async (managedUser) => {
    const payload = editingUsers[managedUser.username];
    if (!payload) return;
    try {
      setAdminError("");
      setAdminMessage("");
      const teacherAccess = normalizeTeacherAccessPayload(payload);
      await onUpdateUser?.(managedUser.username, {
        ...payload,
        teacherRoles: teacherAccess.teacherRoles,
        teacherAssignments: teacherAccess.teacherAssignments,
        active: !payload.active,
        password: "",
      });
      updateManagedField(managedUser.username, "active", !payload.active);
      setActionMenuUser("");
      setAdminMessage(`${managedUser.username} ${payload.active ? "deactivated" : "activated"}.`);
    } catch (err) {
      setAdminError(err.message || t("unableToUpdateUser", "", { username: managedUser.username }));
    }
  };

  const toggleTeacherDuty = (username, key, value) => {
    setEditingUsers((prev) => ({
      ...prev,
      [username]: {
        ...prev[username],
        teacherRoles: {
          classTeacher: prev[username]?.teacherRoles?.classTeacher === true,
          subjectTeacher: prev[username]?.teacherRoles?.subjectTeacher === true,
          [key]: value,
        },
        teacherAssignments:
          key === "classTeacher" && !value
            ? {
                ...normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments),
                classTeacherClassId: "",
              }
            : key === "subjectTeacher" && !value
            ? {
                ...normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments),
                subjectAssignments: [blankSubjectTeacherAssignment()],
              }
            : normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments),
      },
    }));
  };

  const updateAdminTeacherAssignment = (key, value) => {
    setAdminForm((prev) => ({
      ...prev,
      teacherAssignments: {
        ...normalizeTeacherAssignmentsState(prev.teacherAssignments),
        [key]: value,
      },
    }));
  };

  const updateAdminSubjectAssignment = (index, key, value) => {
    setAdminForm((prev) => {
      const nextAssignments = [...normalizeTeacherAssignmentsState(prev.teacherAssignments).subjectAssignments];
      nextAssignments[index] = {
        ...nextAssignments[index],
        [key]: key === "subject" ? String(value || "").toUpperCase() : value,
      };
      if (key === "classId") {
        nextAssignments[index].subject = "";
      }
      return {
        ...prev,
        teacherAssignments: {
          ...normalizeTeacherAssignmentsState(prev.teacherAssignments),
          subjectAssignments: nextAssignments,
        },
      };
    });
  };

  const addAdminSubjectAssignment = () => {
    setAdminForm((prev) => ({
      ...prev,
      teacherAssignments: {
        ...normalizeTeacherAssignmentsState(prev.teacherAssignments),
        subjectAssignments: [
          ...normalizeTeacherAssignmentsState(prev.teacherAssignments).subjectAssignments,
          blankSubjectTeacherAssignment(),
        ],
      },
    }));
  };

  const removeAdminSubjectAssignment = (index) => {
    setAdminForm((prev) => {
      const currentAssignments = normalizeTeacherAssignmentsState(prev.teacherAssignments).subjectAssignments;
      const nextAssignments = currentAssignments.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        teacherAssignments: {
          ...normalizeTeacherAssignmentsState(prev.teacherAssignments),
          subjectAssignments: nextAssignments.length ? nextAssignments : [blankSubjectTeacherAssignment()],
        },
      };
    });
  };

  const updateManagedTeacherAssignment = (username, key, value) => {
    setEditingUsers((prev) => ({
      ...prev,
      [username]: {
        ...prev[username],
        teacherAssignments: {
          ...normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments),
          [key]: value,
        },
      },
    }));
  };

  const updateManagedSubjectAssignment = (username, index, key, value) => {
    setEditingUsers((prev) => {
      const currentAssignments = normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments).subjectAssignments;
      const nextAssignments = [...currentAssignments];
      nextAssignments[index] = {
        ...nextAssignments[index],
        [key]: key === "subject" ? String(value || "").toUpperCase() : value,
      };
      if (key === "classId") {
        nextAssignments[index].subject = "";
      }
      return {
        ...prev,
        [username]: {
          ...prev[username],
          teacherAssignments: {
            ...normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments),
            subjectAssignments: nextAssignments,
          },
        },
      };
    });
  };

  const addManagedSubjectAssignment = (username) => {
    setEditingUsers((prev) => ({
      ...prev,
      [username]: {
        ...prev[username],
        teacherAssignments: {
          ...normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments),
          subjectAssignments: [
            ...normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments).subjectAssignments,
            blankSubjectTeacherAssignment(),
          ],
        },
      },
    }));
  };

  const removeManagedSubjectAssignment = (username, index) => {
    setEditingUsers((prev) => {
      const currentAssignments = normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments).subjectAssignments;
      const nextAssignments = currentAssignments.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        [username]: {
          ...prev[username],
          teacherAssignments: {
            ...normalizeTeacherAssignmentsState(prev[username]?.teacherAssignments),
            subjectAssignments: nextAssignments.length ? nextAssignments : [blankSubjectTeacherAssignment()],
          },
        },
      };
    });
  };

  const updateHomepageCollectionItem = (collection, index, key, value) => {
    setHomepageForm((prev) => ({
      ...prev,
      [collection]: prev[collection].map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }));
  };

  const addHomepageCollectionItem = (collection) => {
    setHomepageForm((prev) => ({
      ...prev,
        [collection]: [
          ...prev[collection],
          collection === "announcements"
            ? blankHomepageAnnouncement()
            : collection === "highlights"
            ? blankHomepageHighlight()
            : blankHomepageSlide(prev[collection].length),
        ],
      }));
  };

  const removeHomepageCollectionItem = (collection, index) => {
    setHomepageForm((prev) => {
      const nextItems = prev[collection].filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        [collection]: nextItems.length
          ? nextItems
          : [
              collection === "announcements"
                ? blankHomepageAnnouncement()
                : collection === "highlights"
                ? blankHomepageHighlight()
                : blankHomepageSlide(0),
            ],
      };
    });
  };

  const handleSaveHomepage = async () => {
    setHomepageSaving(true);
    setHomepageError("");
    setHomepageMessage("");
    try {
      const saved = await onSaveHomepageContent?.({
        announcements: homepageForm.announcements,
        highlights: homepageForm.highlights,
        slides: homepageForm.slides,
      });
      setHomepageForm((prev) => ({
        ...prev,
        announcements: Array.isArray(saved?.announcements)
          ? (saved.announcements.length ? saved.announcements : [blankHomepageAnnouncement()])
          : prev.announcements,
        highlights: Array.isArray(saved?.highlights)
          ? (saved.highlights.length ? saved.highlights : [blankHomepageHighlight()])
          : prev.highlights,
        slides: Array.isArray(saved?.slides)
          ? (saved.slides.length ? saved.slides : [blankHomepageSlide(0), blankHomepageSlide(1), blankHomepageSlide(2)])
          : prev.slides,
        updatedAt: saved?.updatedAt || prev.updatedAt,
        updatedBy: saved?.updatedBy || prev.updatedBy,
      }));
      setHomepageMessage(t("homepageContentSaved"));
    } catch (err) {
      setHomepageError(err.message || t("unableToSaveHomepageContent"));
    } finally {
      setHomepageSaving(false);
    }
  };

  const failedLogsCount = authLogs.filter((l) => l.status === "failed").length;

  const handleToggleAllVisibleUsers = (checked) => {
    if (!checked) {
      setSelectedUsers([]);
      return;
    }
    setSelectedUsers(managedUserCards.map((managedUser) => managedUser.username));
  };

  const handleToggleSelectedUser = (username, checked) => {
    setSelectedUsers((prev) => (
      checked ? [...new Set([...prev, username])] : prev.filter((value) => value !== username)
    ));
  };

  const applyBulkAction = async (action) => {
    if (!selectedUsers.length) {
      setAdminError("Select at least one user first.");
      return;
    }
    try {
      setAdminError("");
      setAdminMessage("");
      if (action === "export") {
        const rows = [
          ["Username", "Display Name", "Role", "Status", "Email", "Phone", "Must Change Password"],
          ...manageableUsers
            .filter((managedUser) => selectedUsers.includes(managedUser.username))
            .map((managedUser) => [
              managedUser.username,
              managedUser.displayName || "",
              managedUser.role || "",
              managedUser.active !== false ? "active" : "inactive",
              managedUser.email || "",
              managedUser.phone || "",
              managedUser.mustChangePassword === true ? "yes" : "no",
            ]),
        ];
        downloadCsv(`user-export-${new Date().toISOString().slice(0, 10)}.csv`, rows);
        setAdminMessage(`Exported ${selectedUsers.length} users.`);
        return;
      }

      for (const username of selectedUsers) {
        const payload = editingUsers[username];
        if (!payload) continue;
        const teacherAccess = normalizeTeacherAccessPayload(payload);
        if (action === "activate" || action === "deactivate") {
          await onUpdateUser?.(username, {
            ...payload,
            teacherRoles: teacherAccess.teacherRoles,
            teacherAssignments: teacherAccess.teacherAssignments,
            active: action === "activate",
            password: "",
          });
          updateManagedField(username, "active", action === "activate");
        }
        if (action === "reset") {
          const temporaryPassword = generateTemporaryPassword();
          await onUpdateUser?.(username, {
            ...payload,
            teacherRoles: teacherAccess.teacherRoles,
            teacherAssignments: teacherAccess.teacherAssignments,
            password: temporaryPassword,
            mustChangePassword: true,
          });
          updateManagedField(username, "mustChangePassword", true);
        }
      }
      setAdminMessage(`Bulk action "${action}" applied to ${selectedUsers.length} users.`);
    } catch (err) {
      setAdminError(err.message || "Unable to run bulk action.");
    }
  };

  const exportActivityLogs = () => {
    const rows = [
      ["Timestamp", "Username", "Role", "Action", "Status", "IP", "User Agent", "Reason"],
      ...filteredActivityLogs.map((log) => [
        log.createdAt ? new Date(log.createdAt).toISOString() : "",
        log.username || "",
        log.role || "",
        log.action || "",
        log.status || "",
        log.ip || "",
        log.userAgent || "",
        log.reason || "",
      ]),
    ];
    downloadCsv(`auth-activity-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const tabs = [
    { key: "profile", label: "Profile" },
    ...(canManageUsers
      ? [
          { key: "users",    label: "Users",    badge: users.length || null },
          { key: "activity", label: "Activity", badge: failedLogsCount || null, badgeDanger: true },
          { key: "homepage", label: "Homepage" },
        ]
      : []),
  ];

  return (
    <div
      style={{
        flex: 1,
        padding: isXs
          ? "max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom))"
          : isMobile
          ? "max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom))"
          : 24,
        background: "radial-gradient(circle at top left, rgba(191,219,254,0.32), transparent 24%), radial-gradient(circle at top right, rgba(167,243,208,0.24), transparent 22%), linear-gradient(180deg, #f6f9fd 0%, #edf4fb 100%)",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gap: 18 }}>

        {/* ── Header card ─────────────────────────────── */}
        <div
          style={{
            ...sectionStyle,
            background: "linear-gradient(135deg, #0f2d6e 0%, #1a4faa 55%, #2563eb 100%)",
            border: "none",
            padding: isXs ? 14 : isMobile ? 18 : 24,
            display: "flex",
            flexDirection: isXs ? "column" : "row",
            alignItems: isXs ? "stretch" : "center",
            gap: isXs ? 12 : 18,
            flexWrap: isXs ? "nowrap" : "wrap",
          }}
        >
          {/* Avatar + info row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: isXs ? 48 : isMobile ? 56 : 72,
                height: isXs ? 48 : isMobile ? 56 : 72,
                borderRadius: "50%",
                background: "linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
                border: "2px solid rgba(255,255,255,0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isXs ? 17 : isMobile ? 20 : 26,
                fontWeight: 900,
                color: "#fff",
                flexShrink: 0,
                boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                letterSpacing: 1,
              }}
            >
              {initialsFrom(user)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.62)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
                Account
              </div>
              <div style={{ fontSize: isXs ? 18 : isMobile ? 22 : 28, fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.displayName || user?.username || "School Account"}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <RoleBadge role={user?.role} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                  @{user?.username || "—"}
                </span>
                {!isXs && user?.lastLoginAt && (
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    · Last sign in {new Date(user.lastLoginAt).toLocaleString()}
                  </span>
                )}
              </div>
              {isXs && user?.lastLoginAt && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                  Last sign in {new Date(user.lastLoginAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 12,
              padding: isXs ? "10px 14px" : "10px 18px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              flexShrink: 0,
              width: isXs ? "100%" : "auto",
              textAlign: "center",
            }}
          >
            Log Out
          </button>
        </div>

        {/* ── Password reset warning ───────────────────── */}
        {user?.mustChangePassword && (
          <div
            style={{
              ...sectionStyle,
              border: "1px solid #facc15",
              background: "linear-gradient(135deg, #fff8db, #fffef5)",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: "#9a6700", letterSpacing: 1.1, textTransform: "uppercase" }}>
              {t("passwordResetRequired")}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#6b4f00" }}>
              {t("mustChangePasswordTitle")}
            </div>
            <div style={{ fontSize: 14, color: "#7a5d00", lineHeight: 1.7, maxWidth: 720 }}>
              {t("mustChangePasswordMessage")}
            </div>
          </div>
        )}

        {/* ── Tab bar ──────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            flexWrap: "nowrap",
            overflowX: "auto",
            background: "rgba(255,255,255,0.56)",
            borderRadius: 18,
            border: "1px solid rgba(191,219,254,0.4)",
            padding: "6px 8px",
            boxShadow: "0 10px 26px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.82)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            WebkitOverflowScrolling: isMobile ? "touch" : "auto",
            scrollSnapType: isMobile ? "x proximity" : "none",
            overscrollBehaviorX: isMobile ? "contain" : "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#d0dcf8 transparent",
          }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "none",
                  borderRadius: 12,
                  padding: isXs ? "8px 12px" : "9px 16px",
                  fontSize: isXs ? 12 : 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: active ? "linear-gradient(135deg, #0f2d6e, #2563eb)" : "transparent",
                  color: active ? "#fff" : "#52627a",
                  boxShadow: active ? "0 6px 16px rgba(37,99,235,0.22)" : "none",
                   transition: "background 0.18s, color 0.18s",
                   whiteSpace: "nowrap",
                   flexShrink: 0,
                   minHeight: isMobile ? 44 : "auto",
                   scrollSnapAlign: isMobile ? "start" : "none",
                 }}
               >
                {tab.label}
                {tab.badge != null && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      background: active
                        ? "rgba(255,255,255,0.22)"
                        : tab.badgeDanger
                        ? "#ef4444"
                        : "#e0e9f7",
                      color: active ? "#fff" : tab.badgeDanger ? "#fff" : "#2563eb",
                      fontSize: 10,
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            TAB: Profile
        ══════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: stackedColumns ? "1fr" : "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
              gap: 18,
            }}
          >
            <div
              style={{
                ...sectionStyle,
                gridColumn: "1 / -1",
                display: "grid",
                gap: 8,
                border: `1px solid ${profileCompletionPercent >= 100 ? "#86efac" : "#fcd34d"}`,
                background: profileCompletionPercent >= 100 ? "linear-gradient(135deg, #ecfdf3, #f7fee7)" : "linear-gradient(135deg, #fffbeb, #fef9c3)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#92400e" }}>
                Profile completion
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#102a43" }}>
                {profileCompletionPercent}% complete
              </div>
              {profileMissingFields.length ? (
                <div style={{ fontSize: 13, color: "#7c2d12", lineHeight: 1.6 }}>
                  Missing fields: {profileMissingFields.join(", ")}.
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
                  Great — your profile details are complete.
                </div>
              )}
            </div>

            <div style={{ ...sectionStyle, display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#102a43", marginBottom: 4 }}>
                  Profile Details
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  Update the account information stored on the server.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: adaptiveFieldGrid, gap: 14 }}>
                <TextInput label="Username" value={form.username} onChange={() => {}} disabled />
                <TextInput
                  label="Display Name"
                  value={form.displayName}
                  onChange={(value) => updateField("displayName", value)}
                  required
                />
                <TextInput label="Role" value={formatUserRole(form.role)} onChange={() => {}} disabled />
                <TextInput
                  label="Phone"
                  value={form.phone}
                  onChange={(value) => updateField("phone", value)}
                  placeholder="255712345678"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: adaptiveFieldGrid, gap: 14 }}>
                <TextInput
                  label="Email"
                  value={form.email}
                  onChange={(value) => updateField("email", value)}
                  placeholder="Optional"
                />
                {["parent", "student"].includes(form.role) ? (
                  <TextAreaInput
                    label="Linked Students"
                    value={form.linkedStudentsText}
                    onChange={(value) => updateField("linkedStudentsText", normalizeLinkedStudentsText(value))}
                    placeholder={"One admission no or CNO per line\nExample:\nBSS-2026-0001\nS6509/0004"}
                  />
                ) : null}
              </div>

              {error && (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#b42318" }}>
                  {error}
                </div>
              )}

              <div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: saving ? "#7aa3db" : "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 18px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 10px 22px rgba(37,99,235,0.22)",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>

            <div style={{ ...sectionStyle, display: "grid", gap: 14, alignContent: "start" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#102a43", marginBottom: 4 }}>
                  {t("changePassword")}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  {user?.mustChangePassword ? t("mustChangePasswordMessage") : t("updatePasswordIntro")}
                </div>
              </div>

              <TextInput
                label="Current Password"
                value={passwordForm.currentPassword}
                onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
                type="password"
              />
              <TextInput
                label="New Password"
                value={passwordForm.newPassword}
                onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
                type="password"
              />
              <TextInput
                label="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
                type="password"
              />

              {passwordMsg && (
                <div style={{ fontSize: 12, fontWeight: 700, color: passwordMsg === t("passwordUpdatedSuccessfully") ? "#1a6b2f" : "#b42318" }}>
                  {passwordMsg}
                </div>
              )}

              <button
                onClick={handlePasswordChange}
                disabled={passwordSaving}
                style={{
                  background: passwordSaving ? "#9ca3af" : "#102a43",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: passwordSaving ? "not-allowed" : "pointer",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>

              <div style={{ marginTop: 4, borderTop: "1px solid rgba(148,163,184,0.25)", paddingTop: 12, display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#102a43" }}>Security Snapshot</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                    Recent sign-in attempts for your account.
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {recentSecurityLogs.length ? recentSecurityLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        borderRadius: 10,
                        border: `1px solid ${log.status === "success" ? "#bbf7d0" : "#fecdd3"}`,
                        background: log.status === "success" ? "#f0fdf4" : "#fff5f5",
                        padding: "8px 10px",
                        display: "grid",
                        gap: 3,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#102a43" }}>
                        {(log.action || "login").toUpperCase()} · {log.status || "info"}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown time"} · {log.ip || "Unknown IP"}
                      </div>
                      {log.userAgent && (
                        <div style={{ fontSize: 11, color: "#64748b" }}>{log.userAgent}</div>
                      )}
                    </div>
                  )) : (
                    <div style={{ fontSize: 12, color: "#64748b" }}>No recent security events found.</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    border: "1px solid #fecaca",
                    background: "#fff1f2",
                    color: "#b42318",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  Force Sign Out (Current Session)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: Users (admin-only)
        ══════════════════════════════════════════════ */}
        {activeTab === "users" && canManageUsers && (
          <div style={{ ...sectionStyle, display: "grid", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#102a43", marginBottom: 4 }}>
                  Manage Users
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, maxWidth: 680 }}>
                  Create and manage administrators, academic staff, teachers, and parents. Students are created from Student Management, not from this user list.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserFormOpen((prev) => !prev);
                  setAdminError("");
                  setAdminMessage("");
                  if (!userFormOpen) {
                    setAdminForm({
                      ...blankManagedUser(),
                      password: generateTemporaryPassword(),
                    });
                  }
                }}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "11px 18px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 12px 24px rgba(37,99,235,0.2)",
                  minWidth: isMobile ? "100%" : undefined,
                }}
              >
                {userFormOpen ? "Close Form" : "Add User"}
              </button>
            </div>

            {userFormOpen && (
              <div style={{ ...softGlassStyle, borderRadius: 16, padding: isMobile ? 14 : 18, display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: adaptiveFieldGrid, gap: 14 }}>
                  <TextInput label="Username" value={adminForm.username} onChange={(value) => setAdminForm((prev) => ({ ...prev, username: value }))} required />
                  <TextInput label="Display Name" value={adminForm.displayName} onChange={(value) => setAdminForm((prev) => ({ ...prev, displayName: value }))} />
                  <SelectInput label="Role" value={adminForm.role} onChange={(value) => setAdminForm((prev) => ({ ...prev, role: value }))} options={MANAGEABLE_USER_ROLE_OPTIONS} />
                  <TextInput label="Email" value={adminForm.email} onChange={(value) => setAdminForm((prev) => ({ ...prev, email: value }))} />
                  <TextInput
                    label="Phone"
                    value={adminForm.phone}
                    onChange={(value) => setAdminForm((prev) => ({ ...prev, phone: normalizeTzPhoneDraft(value) }))}
                    placeholder="255712345678"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  {adminForm.role === "parent" ? (
                    <TextAreaInput
                      label="Linked Students"
                      value={adminForm.linkedStudentsText}
                      onChange={(value) => setAdminForm((prev) => ({ ...prev, linkedStudentsText: normalizeLinkedStudentsText(value) }))}
                      placeholder={"One admission no or CNO per line."}
                    />
                  ) : null}
                  <TextInput label="Temporary Password" value={adminForm.password || DEFAULT_RESET_PASSWORD} onChange={(value) => setAdminForm((prev) => ({ ...prev, password: value }))} />
                </div>

                {adminForm.role === "teacher" && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#425466", fontWeight: 600 }}>
                        <ToggleSwitch
                          checked={adminForm.teacherRoles.classTeacher}
                          onChange={(val) =>
                            setAdminForm((prev) => ({
                              ...prev,
                              teacherRoles: { ...prev.teacherRoles, classTeacher: val },
                              teacherAssignments: {
                                ...normalizeTeacherAssignmentsState(prev.teacherAssignments),
                                classTeacherClassId: val
                                  ? normalizeTeacherAssignmentsState(prev.teacherAssignments).classTeacherClassId
                                  : "",
                              },
                            }))
                          }
                          accentColor="#2563eb"
                        />
                        Class Teacher
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#425466", fontWeight: 600 }}>
                        <ToggleSwitch
                          checked={adminForm.teacherRoles.subjectTeacher}
                          onChange={(val) =>
                            setAdminForm((prev) => ({
                              ...prev,
                              teacherRoles: { ...prev.teacherRoles, subjectTeacher: val },
                              teacherAssignments: {
                                ...normalizeTeacherAssignmentsState(prev.teacherAssignments),
                                subjectAssignments: val
                                  ? normalizeTeacherAssignmentsState(prev.teacherAssignments).subjectAssignments
                                  : [blankSubjectTeacherAssignment()],
                              },
                            }))
                          }
                          accentColor="#0f766e"
                        />
                        Subject Teacher
                      </label>
                    </div>

                    {adminForm.teacherRoles.classTeacher && (
                      <SelectInput
                        label="Class Teacher Class"
                        value={normalizeTeacherAssignmentsState(adminForm.teacherAssignments).classTeacherClassId}
                        onChange={(value) => updateAdminTeacherAssignment("classTeacherClassId", value)}
                        options={[{ label: "Select class", value: "" }, ...classPickerOptions]}
                      />
                    )}

                    {adminForm.teacherRoles.subjectTeacher && (
                      <div style={{ display: "grid", gap: 10 }}>
                        {normalizeTeacherAssignmentsState(adminForm.teacherAssignments).subjectAssignments.map((assignment, index) => {
                          const subjectOptions = subjectOptionsByClassId.get(assignment.classId) || [];
                          return (
                            <div key={`admin-subject-assignment-${index}`} style={{ ...softGlassStyle, borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
                              <div style={{ display: "grid", gridTemplateColumns: adaptiveFieldGrid, gap: 12 }}>
                                <SelectInput
                                  label={`Subject Teacher Class ${index + 1}`}
                                  value={assignment.classId}
                                  onChange={(value) => updateAdminSubjectAssignment(index, "classId", value)}
                                  options={[{ label: "Select class", value: "" }, ...classPickerOptions]}
                                />
                                <SelectInput
                                  label={`Subject ${index + 1}`}
                                  value={assignment.subject}
                                  onChange={(value) => updateAdminSubjectAssignment(index, "subject", value)}
                                  options={[{ label: "Select subject", value: "" }, ...subjectOptions]}
                                />
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 11, color: "#64748b" }}>
                                  Choose the class and subject this teacher should handle.
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAdminSubjectAssignment(index)}
                                  style={{ background: "none", border: "none", color: "#b42318", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={addAdminSubjectAssignment}
                          style={{ background: "none", border: "1px dashed #93c5fd", borderRadius: 10, padding: "10px 12px", color: "#2563eb", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                        >
                          Add Subject Assignment
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                  New and reset accounts now use generated temporary passwords and must change them on next sign-in.
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={handleCreateUser}
                    disabled={adminSaving}
                    style={{
                      background: adminSaving ? "#7aa3db" : "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 18px",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: adminSaving ? "not-allowed" : "pointer",
                      boxShadow: "0 8px 18px rgba(37,99,235,0.2)",
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    {adminSaving ? "Creating..." : "Create User"}
                  </button>
                </div>
              </div>
            )}

            {(adminError || adminMessage) && (
              <div style={{ fontSize: 12, fontWeight: 700, color: adminError ? "#b42318" : "#1a6b2f" }}>
                {adminError || adminMessage}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: adaptiveWideFieldGrid, gap: 12 }}>
              <TextInput
                label="Search Users"
                value={userSearch}
                onChange={setUserSearch}
                placeholder="Search username, name, email, phone, or index no"
              />
              <SelectInput
                label="Filter by Role"
                value={roleFilter}
                onChange={setRoleFilter}
                options={[{ label: "All roles", value: "all" }, ...MANAGEABLE_USER_ROLE_OPTIONS]}
              />
            </div>

            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
              Showing {managedUserCards.length} of {manageableUsers.length} users
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: singleColumn ? "1fr" : "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
                gap: 10,
              }}
            >
              {roleSummaryRows.map((row) => (
                <div key={row.role} style={{ ...softGlassStyle, borderRadius: 12, padding: "10px 12px", display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#102a43", textTransform: "capitalize" }}>{formatUserRole(row.role)}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {row.active} active · {row.inactive} inactive · {row.resetRequired} reset required
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#0f172a" }}>{row.total}</div>
                </div>
              ))}
            </div>

            <div style={{ ...softGlassStyle, borderRadius: 14, padding: isMobile ? 12 : 14, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(managedUserCards.length) && selectedUsers.length === managedUserCards.length}
                    onChange={(event) => handleToggleAllVisibleUsers(event.target.checked)}
                  />
                  Select all visible
                </label>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                  {selectedUsers.length} selected
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { key: "activate", label: "Activate" },
                  { key: "deactivate", label: "Deactivate" },
                  { key: "reset", label: "Reset Passwords" },
                  { key: "export", label: "Export CSV" },
                ].map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => applyBulkAction(action.key)}
                    style={{
                      border: "1px solid #bfdbfe",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {editingUsername ? (() => {
              const edit = editingUsers[editingUsername] || blankManagedUser();
              return (
                <div style={{ ...softGlassStyle, borderRadius: 16, padding: isMobile ? 14 : 18, display: "grid", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#102a43" }}>
                        Edit @{editingUsername}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Update identity, access role, and teaching responsibilities.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingUsername("")}
                      style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#475569" }}
                    >
                      Close
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: adaptiveFieldGrid, gap: 12 }}>
                    <TextInput label="Display Name" value={edit.displayName} onChange={(value) => updateManagedField(editingUsername, "displayName", value)} />
                    <SelectInput label="Role" value={edit.role} onChange={(value) => updateManagedField(editingUsername, "role", value)} options={MANAGEABLE_USER_ROLE_OPTIONS} />
                    <TextInput label="Email" value={edit.email} onChange={(value) => updateManagedField(editingUsername, "email", value)} />
                    <TextInput
                      label="Phone"
                      value={edit.phone}
                      onChange={(value) => updateManagedField(editingUsername, "phone", value)}
                      placeholder="255712345678"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                    {edit.role === "parent" ? (
                      <TextAreaInput
                        label="Linked Students"
                        value={edit.linkedStudentsText}
                        onChange={(value) => updateManagedField(editingUsername, "linkedStudentsText", normalizeLinkedStudentsText(value))}
                        placeholder={"One admission no or CNO per line."}
                      />
                    ) : null}
                  </div>

                  {edit.role === "teacher" && (
                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#425466", fontWeight: 600 }}>
                          <ToggleSwitch
                            checked={edit.teacherRoles?.classTeacher === true}
                            onChange={(val) => toggleTeacherDuty(editingUsername, "classTeacher", val)}
                            accentColor="#2563eb"
                          />
                          Class Teacher
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#425466", fontWeight: 600 }}>
                          <ToggleSwitch
                            checked={edit.teacherRoles?.subjectTeacher === true}
                            onChange={(val) => toggleTeacherDuty(editingUsername, "subjectTeacher", val)}
                            accentColor="#0f766e"
                          />
                          Subject Teacher
                        </label>
                      </div>

                      {edit.teacherRoles?.classTeacher === true && (
                        <SelectInput
                          label="Class Teacher Class"
                          value={normalizeTeacherAssignmentsState(edit.teacherAssignments).classTeacherClassId}
                          onChange={(value) => updateManagedTeacherAssignment(editingUsername, "classTeacherClassId", value)}
                          options={[{ label: "Select class", value: "" }, ...classPickerOptions]}
                        />
                      )}

                      {edit.teacherRoles?.subjectTeacher === true && (
                        <div style={{ display: "grid", gap: 10 }}>
                          {normalizeTeacherAssignmentsState(edit.teacherAssignments).subjectAssignments.map((assignment, index) => {
                            const subjectOptions = subjectOptionsByClassId.get(assignment.classId) || [];
                            return (
                              <div key={`${editingUsername}-subject-assignment-${index}`} style={{ ...softGlassStyle, borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
                                <div style={{ display: "grid", gridTemplateColumns: adaptiveFieldGrid, gap: 12 }}>
                                  <SelectInput
                                    label={`Subject Teacher Class ${index + 1}`}
                                    value={assignment.classId}
                                    onChange={(value) => updateManagedSubjectAssignment(editingUsername, index, "classId", value)}
                                    options={[{ label: "Select class", value: "" }, ...classPickerOptions]}
                                  />
                                  <SelectInput
                                    label={`Subject ${index + 1}`}
                                    value={assignment.subject}
                                    onChange={(value) => updateManagedSubjectAssignment(editingUsername, index, "subject", value)}
                                    options={[{ label: "Select subject", value: "" }, ...subjectOptions]}
                                  />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>
                                    Choose the class and subject this teacher should handle.
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeManagedSubjectAssignment(editingUsername, index)}
                                    style={{ background: "none", border: "none", color: "#b42318", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => addManagedSubjectAssignment(editingUsername)}
                            style={{ background: "none", border: "1px dashed #93c5fd", borderRadius: 10, padding: "10px 12px", color: "#2563eb", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                          >
                            Add Subject Assignment
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#425466", fontWeight: 600 }}>
                      <ToggleSwitch
                        checked={edit.active}
                        onChange={(val) => updateManagedField(editingUsername, "active", val)}
                        accentColor="#2563eb"
                      />
                      User can sign in
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#425466", fontWeight: 600 }}>
                      <ToggleSwitch
                        checked={edit.mustChangePassword}
                        onChange={(val) => updateManagedField(editingUsername, "mustChangePassword", val)}
                        accentColor="#d97706"
                      />
                      Require password change on next sign-in
                    </label>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleSaveManagedUser(editingUsername)}
                      style={{
                        background: "#102a43",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 18px",
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: "pointer",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              );
            })() : null}

            <div style={{ display: "grid", gap: 10 }}>
              {!isMobile && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px minmax(220px, 1.5fr) minmax(120px, 0.9fr) minmax(180px, 1fr) minmax(130px, 0.8fr) 60px",
                    gap: 12,
                    padding: "0 16px",
                    color: "#64748b",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  <span />
                  <span>User</span>
                  <span>Role</span>
                  <span>Teacher Duties</span>
                  <span>Status</span>
                  <span style={{ textAlign: "right" }}>More</span>
                </div>
              )}

              {managedUserCards.map((managedUser) => {
                const edit = editingUsers[managedUser.username] || blankManagedUser();
                const isTeacher = managedUser.role === "teacher";
                return (
                  <div
                    key={managedUser.username}
                    style={{
                      ...softGlassStyle,
                      borderRadius: 16,
                      padding: isMobile ? 14 : 16,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr auto" : "32px minmax(220px, 1.5fr) minmax(120px, 0.9fr) minmax(180px, 1fr) minmax(130px, 0.8fr) 60px",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      {!isMobile ? (
                        <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(managedUser.username)}
                            onChange={(event) => handleToggleSelectedUser(managedUser.username, event.target.checked)}
                          />
                        </label>
                      ) : null}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "linear-gradient(145deg, #1f3c88, #16a3a3)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                        >
                          {initialsFrom(managedUser)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {managedUser.displayName || managedUser.username}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            @{managedUser.username}{managedUser.email ? ` • ${managedUser.email}` : ""}
                          </div>
                        </div>
                      </div>

                      {!isMobile ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <RoleBadge role={managedUser.role} />
                        </div>
                      ) : null}

                      {!isMobile ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {isTeacher ? (
                            <>
                              <TeacherDutyBadge active={managedUser.teacherRoles?.classTeacher === true} label="Class Teacher" />
                              <TeacherDutyBadge active={managedUser.teacherRoles?.subjectTeacher === true} label="Subject Teacher" />
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>Not applicable</span>
                          )}
                        </div>
                      ) : null}

                      {!isMobile ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <StatusBadge active={managedUser.active !== false} />
                          {managedUser.mustChangePassword && (
                            <span style={{ fontSize: 11, color: "#9a6700", fontWeight: 800 }}>Reset required</span>
                          )}
                        </div>
                      ) : null}

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setActionMenuUser((prev) => (prev === managedUser.username ? "" : managedUser.username))}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            border: "1px solid #dbe4f2",
                            background: "#fff",
                            color: "#475569",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MoreIcon />
                        </button>
                      </div>
                    </div>

                    {isMobile && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", fontWeight: 700 }}>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(managedUser.username)}
                            onChange={(event) => handleToggleSelectedUser(managedUser.username, event.target.checked)}
                          />
                          Select
                        </label>
                        <RoleBadge role={managedUser.role} />
                        <StatusBadge active={managedUser.active !== false} />
                        {isTeacher ? (
                          <>
                            <TeacherDutyBadge active={managedUser.teacherRoles?.classTeacher === true} label="Class Teacher" />
                            <TeacherDutyBadge active={managedUser.teacherRoles?.subjectTeacher === true} label="Subject Teacher" />
                          </>
                        ) : null}
                      </div>
                    )}

                    {actionMenuUser === managedUser.username && (
                      <div
                        style={{
                          position: "absolute",
                          top: isMobile ? 54 : 56,
                          right: 14,
                          width: isMobile ? "calc(100% - 28px)" : 290,
                          borderRadius: 14,
                          background: "#fff",
                          border: "1px solid #dbe4f2",
                          boxShadow: "0 20px 42px rgba(15,23,42,0.14)",
                          padding: 12,
                          display: "grid",
                          gap: 10,
                          zIndex: 5,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Role</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <RoleBadge role={managedUser.role} />
                          {managedUser.role === "teacher" ? (
                            <>
                              <TeacherDutyBadge active={edit.teacherRoles?.classTeacher === true} label="Class Teacher" />
                              <TeacherDutyBadge active={edit.teacherRoles?.subjectTeacher === true} label="Subject Teacher" />
                            </>
                          ) : null}
                        </div>
                        {managedUser.role === "teacher" ? (
                          <div style={{ display: "grid", gap: 6, fontSize: 12, color: "#475569" }}>
                            {normalizeTeacherAssignmentsState(edit.teacherAssignments).classTeacherClassId ? (
                              <div>
                                <strong>Class Teacher:</strong>{" "}
                                {classNameById.get(normalizeTeacherAssignmentsState(edit.teacherAssignments).classTeacherClassId) ||
                                  "Assigned class"}
                              </div>
                            ) : null}
                            {normalizeTeacherAssignmentsState(edit.teacherAssignments).subjectAssignments
                              .filter((entry) => entry.classId && entry.subject)
                              .map((entry, index) => (
                                <div key={`${managedUser.username}-assignment-menu-${index}`}>
                                  <strong>Subject:</strong> {entry.subject} ·{" "}
                                  {classNameById.get(entry.classId) || "Assigned class"}
                                </div>
                              ))}
                          </div>
                        ) : null}
                        <div style={{ height: 1, background: "#e2e8f0" }} />
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUsername(managedUser.username);
                            setActionMenuUser("");
                          }}
                          style={{ background: "none", border: "none", padding: "6px 0", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#102a43", cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetManagedPassword(managedUser.username)}
                          style={{ background: "none", border: "none", padding: "6px 0", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#2563eb", cursor: "pointer" }}
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleManagedStatus(managedUser)}
                          style={{ background: "none", border: "none", padding: "6px 0", textAlign: "left", fontSize: 13, fontWeight: 700, color: managedUser.active !== false ? "#b42318" : "#1a6b2f", cursor: "pointer" }}
                        >
                          {managedUser.active !== false ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {!managedUserCards.length && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "32px 16px",
                    border: "1px dashed #d5dfef",
                    borderRadius: 14,
                    color: "#64748b",
                  }}
                >
                  <svg viewBox="0 0 24 24" width={36} height={36} fill="none" stroke="#cbd5e1" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3.5 18c1.2-3.1 9.8-3.1 11 0" />
                    <path d="M18 7v6" />
                    <path d="M15 10h6" />
                  </svg>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>No users match your search</div>
                  <div style={{ fontSize: 12 }}>Try adjusting the search or role filter</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: Activity (admin-only)
        ══════════════════════════════════════════════ */}
        {activeTab === "activity" && canManageUsers && (
          <div style={{ ...sectionStyle, display: "grid", gap: 18 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#102a43", marginBottom: 4 }}>
                {t("loginActivity")}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                {t("loginActivityIntro")}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: adaptiveWideFieldGrid, gap: 12 }}>
              <SelectInput
                label="Status"
                value={activityStatusFilter}
                onChange={setActivityStatusFilter}
                options={[
                  { label: "All statuses", value: "all" },
                  { label: "Success", value: "success" },
                  { label: "Failed", value: "failed" },
                ]}
              />
              <TextInput
                label="Username"
                value={activityUserFilter}
                onChange={setActivityUserFilter}
                placeholder="Filter by exact username"
              />
              <TextInput
                label="Search"
                value={activitySearch}
                onChange={setActivitySearch}
                placeholder="Search reason, role, IP, action, or device"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                Showing {filteredActivityLogs.length} of {authLogs.length} activity records
              </div>
              <button
                type="button"
                onClick={exportActivityLogs}
                style={{
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Export CSV
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {filteredActivityLogs.length ? filteredActivityLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    border: `1px solid ${log.status === "success" ? "#bbf7d0" : "#fecdd3"}`,
                    borderLeft: `4px solid ${log.status === "success" ? "#16a34a" : "#dc2626"}`,
                    borderRadius: 12,
                    padding: isMobile ? 12 : 14,
                    background: log.status === "success" ? "#f0fdf4" : "#fff5f5",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: log.status === "success" ? "#dcfce7" : "#fee2e2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {log.status === "success" ? (
                      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isXs ? "45vw" : "none" }}>
                        {log.username || "Unknown user"}
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: log.status === "success" ? "#dcfce7" : "#fee2e2",
                          color: log.status === "success" ? "#16a34a" : "#dc2626",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.status === "success" ? t("loginSuccess") : t("loginFailed")}
                      </span>
                    </div>
                    <div style={{ fontSize: isXs ? 11 : 12, color: "#64748b", marginTop: 3 }}>
                      {(log.action || "login").toUpperCase()} • {log.role || "n/a"} • {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {(log.ip || "Unknown IP")} {log.userAgent ? `• ${log.userAgent}` : ""}
                    </div>
                    {log.reason && (
                      <div style={{ fontSize: 12, color: "#425466", marginTop: 2 }}>{log.reason}</div>
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: "#64748b", border: "1px dashed #d5dfef", borderRadius: 12, padding: 20, textAlign: "center" }}>
                  No records match the current filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: Homepage (admin-only)
        ══════════════════════════════════════════════ */}
        {activeTab === "homepage" && canManageUsers && (
          <div style={{ ...sectionStyle, display: "grid", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#102a43", marginBottom: 4 }}>
                  Homepage Content
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, maxWidth: 640 }}>
                  Edit the public homepage announcements and highlights from inside the admin account area.
                </div>
              </div>
              {(homepageForm.updatedAt || homepageForm.updatedBy) && (
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, textAlign: stackedColumns ? "left" : "right" }}>
                  <div>Last updated: {homepageForm.updatedAt ? new Date(homepageForm.updatedAt).toLocaleString() : "Not yet saved"}</div>
                  <div>Updated by: {homepageForm.updatedBy || "System"}</div>
                </div>
              )}
            </div>

            {homepageLoading ? (
              <div style={{ fontSize: 13, color: "#64748b" }}>Loading homepage content...</div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#102a43" }}>Hero Slides</div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                        Control the three homepage background slides, titles, and call-to-action buttons.
                      </div>
                    </div>
                    <button
                      onClick={() => homepageForm.slides.length < 3 && addHomepageCollectionItem("slides")}
                      disabled={homepageForm.slides.length >= 3}
                      style={{
                        background: homepageForm.slides.length >= 3 ? "#e2e8f0" : "#eff6ff",
                        color: homepageForm.slides.length >= 3 ? "#94a3b8" : "#1d4ed8",
                        border: `1px solid ${homepageForm.slides.length >= 3 ? "#cbd5e1" : "#bfdbfe"}`,
                        borderRadius: 10,
                        padding: "10px 16px",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: homepageForm.slides.length >= 3 ? "not-allowed" : "pointer",
                      }}
                    >
                      Add Slide
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    {homepageForm.slides.map((slide, index) => (
                      <div
                        key={`slide-${index}`}
                        style={{
                          ...softGlassStyle,
                          borderRadius: 14,
                          padding: isMobile ? 14 : 18,
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43" }}>
                            Slide {index + 1}
                          </div>
                          <button
                            onClick={() => removeHomepageCollectionItem("slides", index)}
                            style={{
                              background: "#fff1f2",
                              color: "#b42318",
                              border: "1px solid #fecdd3",
                              borderRadius: 10,
                              padding: "8px 14px",
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "1.15fr 0.85fr", gap: 12 }}>
                          <TextInput
                            label="Image URL"
                            value={slide.imageSrc}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "imageSrc", value)}
                            placeholder="/asset/slider1.png"
                          />
                          <TextInput
                            label="Background Position"
                            value={slide.backgroundPosition || "center"}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "backgroundPosition", value)}
                            placeholder="center"
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "1fr 1fr", gap: 12 }}>
                          <TextInput
                            label="Badge (EN)"
                            value={slide.badge || ""}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "badge", value)}
                            placeholder="Live Portal Overview"
                          />
                          <TextInput
                            label="Badge (SW)"
                            value={slide.badgeSw || ""}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "badgeSw", value)}
                            placeholder="Muhtasari Hai wa Tovuti"
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "1fr 1fr", gap: 12 }}>
                          <TextInput
                            label="Title (EN)"
                            value={slide.title || ""}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "title", value)}
                            placeholder="Academic Results Made Simple"
                          />
                          <TextInput
                            label="Title (SW)"
                            value={slide.titleSw || ""}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "titleSw", value)}
                            placeholder="Matokeo ya Taaluma Yamefanywa Rahisi"
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "1fr 1fr", gap: 12 }}>
                          <TextAreaInput
                            label="Description (EN)"
                            value={slide.description || ""}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "description", value)}
                            placeholder="Short supporting description for the hero slide."
                            rows={3}
                          />
                          <TextAreaInput
                            label="Description (SW)"
                            value={slide.descriptionSw || ""}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "descriptionSw", value)}
                            placeholder="Maelezo mafupi ya slaidi ya juu."
                            rows={3}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "1fr 1fr", gap: 12 }}>
                          <SelectInput
                            label="Primary Button Action"
                            value={slide.primaryAction || "results"}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "primaryAction", value)}
                            options={slideActionOptions}
                          />
                          <SelectInput
                            label="Secondary Button Action"
                            value={slide.secondaryAction || "login"}
                            onChange={(value) => updateHomepageCollectionItem("slides", index, "secondaryAction", value)}
                            options={slideActionOptions}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#102a43" }}>Announcements</div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                        These appear in the public Recent Announcements section.
                      </div>
                    </div>
                    <button
                      onClick={() => addHomepageCollectionItem("announcements")}
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: 10,
                        padding: "10px 16px",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Add Announcement
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    {homepageForm.announcements.map((announcement, index) => (
                      <div
                        key={`announcement-${index}`}
                        style={{
                          ...softGlassStyle,
                          borderRadius: 14,
                          padding: isMobile ? 14 : 18,
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43" }}>
                            Announcement {index + 1}
                          </div>
                          <button
                            onClick={() => removeHomepageCollectionItem("announcements", index)}
                            style={{
                              background: "#fff1f2",
                              color: "#b42318",
                              border: "1px solid #fecdd3",
                              borderRadius: 10,
                              padding: "8px 14px",
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : isTablet ? "1fr 1fr" : "1.25fr 0.75fr", gap: 12 }}>
                          <TextInput
                            label="Title"
                            value={announcement.title}
                            onChange={(value) => updateHomepageCollectionItem("announcements", index, "title", value)}
                            placeholder="Results for Form IV are now published"
                          />
                          <SelectInput
                            label="Tone"
                            value={announcement.tone}
                            onChange={(value) => updateHomepageCollectionItem("announcements", index, "tone", value)}
                            options={homepageToneOptions}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "1fr 200px", gap: 12 }}>
                          <TextAreaInput
                            label="Description"
                            value={announcement.description}
                            onChange={(value) => updateHomepageCollectionItem("announcements", index, "description", value)}
                            placeholder="Share what parents and students need to know."
                            rows={3}
                          />
                          <TextInput
                            label="Date"
                            type="date"
                            value={announcement.date ? String(announcement.date).slice(0, 10) : ""}
                            onChange={(value) => updateHomepageCollectionItem("announcements", index, "date", value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#102a43" }}>Portal Highlights</div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                        Customize the highlight cards shown on the public homepage.
                      </div>
                    </div>
                    <button
                      onClick={() => addHomepageCollectionItem("highlights")}
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: 10,
                        padding: "10px 16px",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Add Highlight
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    {homepageForm.highlights.map((highlight, index) => (
                      <div
                        key={`highlight-${index}`}
                        style={{
                          ...softGlassStyle,
                          borderRadius: 14,
                          padding: isMobile ? 14 : 18,
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43" }}>
                            Highlight {index + 1}
                          </div>
                          <button
                            onClick={() => removeHomepageCollectionItem("highlights", index)}
                            style={{
                              background: "#fff1f2",
                              color: "#b42318",
                              border: "1px solid #fecdd3",
                              borderRadius: 10,
                              padding: "8px 14px",
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12 }}>
                          <TextInput
                            label="Label"
                            value={highlight.label}
                            onChange={(value) => updateHomepageCollectionItem("highlights", index, "label", value)}
                            placeholder="Published Classes"
                          />
                          <TextInput
                            label="Value"
                            value={highlight.value}
                            onChange={(value) => updateHomepageCollectionItem("highlights", index, "value", value)}
                            placeholder="12"
                          />
                          <SelectInput
                            label="Accent Color"
                            value={highlight.color}
                            onChange={(value) => updateHomepageCollectionItem("highlights", index, "color", value)}
                            options={homepageColorOptions}
                          />
                        </div>

                        <TextAreaInput
                          label="Description"
                          value={highlight.description}
                          onChange={(value) => updateHomepageCollectionItem("highlights", index, "description", value)}
                          placeholder="Short context under the highlight card."
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {homepageError && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#b42318" }}>
                    {homepageError}
                  </div>
                )}

                {homepageMessage && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1a6b2f" }}>
                    {homepageMessage}
                  </div>
                )}

                <div>
                  <button
                    onClick={handleSaveHomepage}
                    disabled={homepageSaving}
                    style={{
                      background: homepageSaving ? "#7aa3db" : "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 18px",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: homepageSaving ? "not-allowed" : "pointer",
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    {homepageSaving ? "Saving..." : "Save Homepage Content"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
