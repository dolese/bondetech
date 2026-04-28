import React, { useEffect, useMemo, useState } from "react";
import { TextInput, SelectInput } from "./FormInputs";
import { formatUserRole, USER_ROLE_OPTIONS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";

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
  };
}

export function AccountPage({
  user,
  users = [],
  canManageUsers = false,
  onLoadUsers,
  onSaveProfile,
  onChangePassword,
  onCreateUser,
  onUpdateUser,
  onLogout,
}) {
  const { isMobile } = useViewport();
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
    onLoadUsers?.().catch(() => {});
  }, [canManageUsers, onLoadUsers]);

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
      };
    });
    setEditingUsers(next);
  }, [users]);

  const managedUserCards = useMemo(() => users.slice().sort((a, b) => a.username.localeCompare(b.username)), [users]);

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
      setError("Display name is required");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
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
      setError(err.message || "Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMsg("Enter your current and new password");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg("New password confirmation does not match");
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg("");
    try {
      await onChangePassword?.(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMsg("Password updated successfully.");
    } catch (err) {
      setPasswordMsg(err.message || "Unable to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCreateUser = async () => {
    const username = adminForm.username.trim();
    const password = adminForm.password;
    if (!username) {
      setAdminError("Username is required");
      return;
    }
    if (!password) {
      setAdminError("Temporary password is required");
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
      });
      setAdminForm(blankManagedUser());
    } catch (err) {
      setAdminError(err.message || "Unable to create user");
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
      await onUpdateUser?.(username, payload);
      updateManagedField(username, "password", "");
    } catch (err) {
      setAdminError(err.message || `Unable to update ${username}`);
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
            gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr",
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
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

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
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

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
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
                Change Password
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                Update your password for future sign-ins.
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
              <div style={{ fontSize: 12, fontWeight: 700, color: passwordMsg.includes("success") ? "#1a6b2f" : "#b42318" }}>
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

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
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

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
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

                    <div>
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
