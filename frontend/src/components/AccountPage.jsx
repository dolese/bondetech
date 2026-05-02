import React, { useEffect, useMemo, useState } from "react";
import { TextInput, SelectInput, TextAreaInput } from "./FormInputs";
import { formatUserRole, USER_ROLE_OPTIONS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import { useI18n } from "../i18n";

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
        <div
          style={{
            ...sectionStyle,
            display: "grid",
            gridTemplateColumns: stackedColumns ? "1fr" : "1.2fr 0.8fr",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 10 }}>
              Account
            </div>
            <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 900, color: "#0f2d6e", lineHeight: 1.1, marginBottom: 10 }}>
              {user?.displayName || user?.username || "School Account"}
            </div>
            <div style={{ fontSize: 14, color: "#52627a", lineHeight: 1.7, maxWidth: 520 }}>
              Manage your signed-in profile, password, and {canManageUsers ? "school users and role assignments." : "linked student access."}
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #0f2d6e, #2563eb)",
              borderRadius: 16,
              padding: 18,
              color: "#fff",
              display: "grid",
              gap: 10,
              alignContent: "start",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>
              Session Details
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Username: {user?.username || "Not set"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.86)" }}>
              Role: {formatUserRole(user?.role)}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.86)" }}>
              Last sign in: {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Current session"}
            </div>
            {user?.linkedIndexNo && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.86)" }}>
                Linked index no: {user.linkedIndexNo}
              </div>
            )}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.6, marginTop: 4 }}>
              Authentication is now backed by the server and role-based access control.
            </div>
          </div>
        </div>

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

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
              <button
                onClick={onLogout}
                style={{
                  background: "#eef2f7",
                  color: "#102a43",
                  border: "1px solid #d5dfef",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Log Out
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

        {canManageUsers && (
          <div style={{ ...sectionStyle, display: "grid", gap: 18 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#102a43", marginBottom: 4 }}>
                User Management
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                Create teachers, parents, students, and additional administrators with server-backed roles.
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
                }}
              >
                {adminSaving ? "Creating..." : "Create User"}
              </button>
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
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#102a43" }}>{managedUser.displayName || managedUser.username}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          @{managedUser.username} • {formatUserRole(managedUser.role)}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: managedUser.active ? "#1a6b2f" : "#b42318" }}>
                        {managedUser.active ? "Active" : "Inactive"}
                      </div>
                    </div>

                    {edit.mustChangePassword && (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#9a6700",
                          background: "#fff7d6",
                          border: "1px solid #f5d973",
                          borderRadius: 999,
                          padding: "6px 10px",
                          width: "fit-content",
                        }}
                      >
                        {t("passwordResetRequired")}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12 }}>
                      <TextInput label="Display Name" value={edit.displayName} onChange={(value) => updateManagedField(managedUser.username, "displayName", value)} />
                      <SelectInput label="Role" value={edit.role} onChange={(value) => updateManagedField(managedUser.username, "role", value)} options={USER_ROLE_OPTIONS} />
                      <TextInput label="Email" value={edit.email} onChange={(value) => updateManagedField(managedUser.username, "email", value)} />
                      <TextInput label="Phone" value={edit.phone} onChange={(value) => updateManagedField(managedUser.username, "phone", value)} />
                      <TextInput label="Linked Student Index No" value={edit.linkedIndexNo} onChange={(value) => updateManagedField(managedUser.username, "linkedIndexNo", value)} />
                      <TextInput label="Reset Password" type="password" value={edit.password} onChange={(value) => updateManagedField(managedUser.username, "password", value)} placeholder="Leave blank to keep current" />
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#425466", fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={edit.active}
                        onChange={(e) => updateManagedField(managedUser.username, "active", e.target.checked)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      User can sign in
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#425466", fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={edit.mustChangePassword}
                        onChange={(e) => updateManagedField(managedUser.username, "mustChangePassword", e.target.checked)}
                        style={{ accentColor: "#d97706" }}
                      />
                      {t("requirePasswordChangeNextSignIn")}
                    </label>

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
                <div style={{ fontSize: 13, color: "#64748b", border: "1px dashed #d5dfef", borderRadius: 12, padding: 16 }}>
                  No users match the current search and filter.
                </div>
              )}
            </div>
          </div>
        )}

        {canManageUsers && (
          <div style={{ ...sectionStyle, display: "grid", gap: 18 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#102a43", marginBottom: 4 }}>
                {t("loginActivity")}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                {t("loginActivityIntro")}
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {authLogs.length ? authLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    border: "1px solid #e2ebf7",
                    borderRadius: 14,
                    padding: isMobile ? 14 : 16,
                    background: "#f8fbff",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#102a43" }}>
                      {log.username || "Unknown user"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: log.status === "success" ? "#1a6b2f" : "#b42318",
                      }}
                    >
                      {log.status === "success" ? t("loginSuccess") : t("loginFailed")}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                    {(log.action || "login").toUpperCase()} • {log.role || "n/a"} • {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#425466", lineHeight: 1.6 }}>
                    {log.reason || t("activityReasonUnavailable")}
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: "#64748b", border: "1px dashed #d5dfef", borderRadius: 12, padding: 16 }}>
                  {t("noLoginActivity")}
                </div>
              )}
            </div>
          </div>
        )}

        {canManageUsers && (
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
