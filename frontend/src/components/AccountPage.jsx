import React, { useEffect, useMemo, useState } from "react";
import { TextInput, SelectInput, TextAreaInput } from "./FormInputs";
import { formatUserRole, USER_ROLE_OPTIONS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import { useI18n } from "../i18n";

function initialsFrom(user) {
  const source = String(user?.displayName || user?.username || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  return source.map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

const ROLE_BADGE_COLORS = {
  admin:   { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
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

function blankManagedUser() {
  return {
    username: "",
    displayName: "",
    role: "teacher",
    email: "",
    phone: "",
    linkedIndexNo: "",
    password: "",
    active: true,
    mustChangePassword: true,
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

export function AccountPage({
  user,
  users = [],
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
  const { isMobile, isTablet } = useViewport();
  const singleColumn = isMobile;
  const stackedColumns = isMobile || isTablet;
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    role: "",
    email: "",
    phone: "",
    linkedIndexNo: "",
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
  const [adminSaving, setAdminSaving] = useState(false);
  const [editingUsers, setEditingUsers] = useState({});
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [homepageForm, setHomepageForm] = useState({
    announcements: [],
    highlights: [],
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
      phone: user?.phone ?? "",
      linkedIndexNo: user?.linkedIndexNo ?? "",
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
        phone: managedUser.phone ?? "",
        linkedIndexNo: managedUser.linkedIndexNo ?? "",
        active: managedUser.active !== false,
        password: "",
        mustChangePassword: managedUser.mustChangePassword === true,
      };
    });
    setEditingUsers(next);
  }, [users]);

  const managedUserCards = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users
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
          managedUser.linkedIndexNo,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });
  }, [roleFilter, userSearch, users]);

  const sectionStyle = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e3ebf7",
    boxShadow: "0 8px 24px rgba(0,51,102,0.06)",
    padding: isMobile ? 18 : 24,
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      await onSaveProfile?.({
        displayName,
        email,
        phone: form.phone.trim(),
        linkedIndexNo: form.linkedIndexNo.trim(),
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
    const password = adminForm.password;
    if (!username) {
      setAdminError(t("usernameRequired"));
      return;
    }
    if (!password) {
      setAdminError(t("temporaryPasswordRequired"));
      return;
    }

    setAdminSaving(true);
    setAdminError("");
    try {
      await onCreateUser?.({
        ...adminForm,
        username,
        displayName: adminForm.displayName.trim() || username,
        email: adminForm.email.trim(),
        phone: adminForm.phone.trim(),
        linkedIndexNo: adminForm.linkedIndexNo.trim(),
        mustChangePassword: true,
      });
      setAdminForm(blankManagedUser());
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
        [key]: value,
      },
    }));
  };

  const handleSaveManagedUser = async (username) => {
    const payload = editingUsers[username];
    if (!payload) return;
    try {
      setAdminError("");
      await onUpdateUser?.(username, payload);
      updateManagedField(username, "password", "");
    } catch (err) {
      setAdminError(err.message || `Unable to update ${username}`);
    }
  };

  const handleResetManagedPassword = async (username) => {
    const payload = editingUsers[username];
    if (!payload?.password) {
      setAdminError(t("enterNewPasswordForUser", "", { username }));
      return;
    }
    updateManagedField(username, "mustChangePassword", true);
    await handleSaveManagedUser(username);
  };

  const handleToggleManagedStatus = async (managedUser) => {
    const payload = editingUsers[managedUser.username];
    if (!payload) return;
    try {
      setAdminError("");
      await onUpdateUser?.(managedUser.username, {
        ...payload,
        active: !payload.active,
        password: "",
      });
      updateManagedField(managedUser.username, "active", !payload.active);
    } catch (err) {
      setAdminError(err.message || t("unableToUpdateUser", "", { username: managedUser.username }));
    }
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
        collection === "announcements" ? blankHomepageAnnouncement() : blankHomepageHighlight(),
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
          : [collection === "announcements" ? blankHomepageAnnouncement() : blankHomepageHighlight()],
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
      });
      setHomepageForm((prev) => ({
        ...prev,
        announcements: Array.isArray(saved?.announcements)
          ? (saved.announcements.length ? saved.announcements : [blankHomepageAnnouncement()])
          : prev.announcements,
        highlights: Array.isArray(saved?.highlights)
          ? (saved.highlights.length ? saved.highlights : [blankHomepageHighlight()])
          : prev.highlights,
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
        padding: isMobile ? 14 : 24,
        background: "#f3f7fc",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 18 }}>

        {/* ── Header card ─────────────────────────────── */}
        <div
          style={{
            ...sectionStyle,
            background: "linear-gradient(135deg, #0f2d6e 0%, #1a4faa 55%, #2563eb 100%)",
            border: "none",
            padding: isMobile ? 18 : 24,
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: isMobile ? 56 : 72,
              height: isMobile ? 56 : 72,
              borderRadius: "50%",
              background: "linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
              border: "2px solid rgba(255,255,255,0.32)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? 20 : 26,
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
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: 6 }}>
              {user?.displayName || user?.username || "School Account"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <RoleBadge role={user?.role} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                @{user?.username || "—"}
              </span>
              {user?.lastLoginAt && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                  · Last sign in {new Date(user.lastLoginAt).toLocaleString()}
                </span>
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
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              flexShrink: 0,
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
            gap: 6,
            flexWrap: "wrap",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e3ebf7",
            padding: "6px 8px",
            boxShadow: "0 4px 12px rgba(0,51,102,0.05)",
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
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: active ? "linear-gradient(135deg, #0f2d6e, #2563eb)" : "transparent",
                  color: active ? "#fff" : "#52627a",
                  boxShadow: active ? "0 6px 16px rgba(37,99,235,0.22)" : "none",
                  transition: "background 0.18s, color 0.18s",
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
              gridTemplateColumns: stackedColumns ? "1fr" : "1.1fr 0.9fr",
              gap: 18,
            }}
          >
            <div style={{ ...sectionStyle, display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#102a43", marginBottom: 4 }}>
                  Profile Details
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  Update the account information stored on the server.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "1fr 1fr", gap: 14 }}>
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
                  placeholder="Optional"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "1fr 1fr", gap: 14 }}>
                <TextInput
                  label="Email"
                  value={form.email}
                  onChange={(value) => updateField("email", value)}
                  placeholder="Optional"
                />
                <TextInput
                  label="Linked Student Index No"
                  value={form.linkedIndexNo}
                  onChange={(value) => updateField("linkedIndexNo", value)}
                  placeholder="Student/parent accounts only"
                />
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
                }}
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: Users (admin-only)
        ══════════════════════════════════════════════ */}
        {activeTab === "users" && canManageUsers && (
          <div style={{ ...sectionStyle, display: "grid", gap: 18 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#102a43", marginBottom: 4 }}>
                Create New User
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                Add teachers, parents, students, and additional administrators with server-backed roles.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)", gap: 14 }}>
              <TextInput label="Username" value={adminForm.username} onChange={(value) => setAdminForm((prev) => ({ ...prev, username: value }))} required />
              <TextInput label="Display Name" value={adminForm.displayName} onChange={(value) => setAdminForm((prev) => ({ ...prev, displayName: value }))} />
              <SelectInput label="Role" value={adminForm.role} onChange={(value) => setAdminForm((prev) => ({ ...prev, role: value }))} options={USER_ROLE_OPTIONS} />
              <TextInput label="Email" value={adminForm.email} onChange={(value) => setAdminForm((prev) => ({ ...prev, email: value }))} />
              <TextInput label="Phone" value={adminForm.phone} onChange={(value) => setAdminForm((prev) => ({ ...prev, phone: value }))} />
              <TextInput label="Linked Student Index No" value={adminForm.linkedIndexNo} onChange={(value) => setAdminForm((prev) => ({ ...prev, linkedIndexNo: value }))} />
              <TextInput label="Temporary Password" type="password" value={adminForm.password} onChange={(value) => setAdminForm((prev) => ({ ...prev, password: value }))} required />
            </div>

            {adminError && (
              <div style={{ fontSize: 12, fontWeight: 700, color: "#b42318" }}>
                {adminError}
              </div>
            )}

            <div>
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
                }}
              >
                {adminSaving ? "Creating..." : "Create User"}
              </button>
            </div>

            <div
              style={{
                height: 1,
                background: "#e3ebf7",
                margin: "4px 0",
              }}
            />

            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#102a43", marginBottom: 12 }}>
                Manage Users
              </div>
              <div style={{ display: "grid", gridTemplateColumns: stackedColumns ? "1fr" : "1.2fr 0.8fr", gap: 12 }}>
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
                  options={[{ label: "All roles", value: "all" }, ...USER_ROLE_OPTIONS]}
                />
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
              Showing {managedUserCards.length} of {users.length} users
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {managedUserCards.map((managedUser) => {
                const edit = editingUsers[managedUser.username] || blankManagedUser();
                return (
                  <div
                    key={managedUser.username}
                    style={{
                      border: "1px solid #e2ebf7",
                      borderRadius: 14,
                      padding: isMobile ? 14 : 18,
                      background: "#f8fbff",
                      display: "grid",
                      gap: 14,
                    }}
                  >
                    {/* Card header with avatar + badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#102a43" }}>
                          {managedUser.displayName || managedUser.username}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>@{managedUser.username}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <RoleBadge role={managedUser.role} />
                        <StatusBadge active={managedUser.active !== false} />
                        {managedUser.mustChangePassword && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "3px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                              background: "#fff7d6",
                              color: "#9a6700",
                              border: "1px solid #f5d973",
                            }}
                          >
                            {t("passwordResetRequired")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12 }}>
                      <TextInput label="Display Name" value={edit.displayName} onChange={(value) => updateManagedField(managedUser.username, "displayName", value)} />
                      <SelectInput label="Role" value={edit.role} onChange={(value) => updateManagedField(managedUser.username, "role", value)} options={USER_ROLE_OPTIONS} />
                      <TextInput label="Email" value={edit.email} onChange={(value) => updateManagedField(managedUser.username, "email", value)} />
                      <TextInput label="Phone" value={edit.phone} onChange={(value) => updateManagedField(managedUser.username, "phone", value)} />
                      <TextInput label="Linked Student Index No" value={edit.linkedIndexNo} onChange={(value) => updateManagedField(managedUser.username, "linkedIndexNo", value)} />
                      <TextInput label="Reset Password" type="password" value={edit.password} onChange={(value) => updateManagedField(managedUser.username, "password", value)} placeholder="Leave blank to keep current" />
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#425466", fontWeight: 600, cursor: "pointer" }}>
                        <ToggleSwitch
                          checked={edit.active}
                          onChange={(val) => updateManagedField(managedUser.username, "active", val)}
                          accentColor="#2563eb"
                        />
                        User can sign in
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#425466", fontWeight: 600, cursor: "pointer" }}>
                        <ToggleSwitch
                          checked={edit.mustChangePassword}
                          onChange={(val) => updateManagedField(managedUser.username, "mustChangePassword", val)}
                          accentColor="#d97706"
                        />
                        {t("requirePasswordChangeNextSignIn")}
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleSaveManagedUser(managedUser.username)}
                        style={{
                          background: "#102a43",
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          padding: "10px 18px",
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Save User
                      </button>
                      <button
                        onClick={() => handleResetManagedPassword(managedUser.username)}
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          padding: "10px 18px",
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleToggleManagedStatus(managedUser)}
                        style={{
                          background: edit.active ? "#fff1f2" : "#ecfdf3",
                          color: edit.active ? "#b42318" : "#1a6b2f",
                          border: `1px solid ${edit.active ? "#fecdd3" : "#bbf7d0"}`,
                          borderRadius: 10,
                          padding: "10px 18px",
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {edit.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
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

            <div style={{ display: "grid", gap: 10 }}>
              {authLogs.length ? authLogs.map((log) => (
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
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43" }}>
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
                        }}
                      >
                        {log.status === "success" ? t("loginSuccess") : t("loginFailed")}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                      {(log.action || "login").toUpperCase()} • {log.role || "n/a"} • {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                    </div>
                    {log.reason && (
                      <div style={{ fontSize: 12, color: "#425466", marginTop: 2 }}>{log.reason}</div>
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: "#64748b", border: "1px dashed #d5dfef", borderRadius: 12, padding: 20, textAlign: "center" }}>
                  {t("noLoginActivity")}
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
                          border: "1px solid #e2ebf7",
                          borderRadius: 14,
                          padding: isMobile ? 14 : 18,
                          background: "#f8fbff",
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

                        <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "1fr 220px", gap: 12 }}>
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
                          border: "1px solid #e2ebf7",
                          borderRadius: 14,
                          padding: isMobile ? 14 : 18,
                          background: "#f8fbff",
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
