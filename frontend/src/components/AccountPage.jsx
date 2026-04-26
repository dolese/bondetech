import React, { useEffect, useState } from "react";
import { TextInput } from "./FormInputs";
import { useViewport } from "../utils/useViewport";

export function AccountPage({ user, onSaveProfile, onLogout }) {
  const { isMobile } = useViewport();
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    role: "",
    email: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      username: user?.username ?? "",
      displayName: user?.displayName ?? user?.username ?? "",
      role: user?.role ?? "School Administrator",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    });
    setError("");
  }, [user]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const displayName = form.displayName.trim();
    const role = form.role.trim();
    const email = form.email.trim();

    if (!displayName) {
      setError("Display name is required");
      return;
    }
    if (!role) {
      setError("Role is required");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    setError("");
    setSaving(true);
    await onSaveProfile?.({
      displayName,
      role,
      email,
      phone: form.phone.trim(),
    });
    setSaving(false);
  };

  const sectionStyle = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e3ebf7",
    boxShadow: "0 8px 24px rgba(0,51,102,0.06)",
    padding: isMobile ? 18 : 24,
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
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
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
              Manage the signed-in operator profile used inside this result system. This section updates the local app profile only.
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
              Role: {user?.role || "School Administrator"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.86)" }}>
              Last sign in: {user?.loginAt ? new Date(user.loginAt).toLocaleString() : "Current session"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.6, marginTop: 4 }}>
              Authentication is currently session-based in the frontend. Backend identity management is not configured yet.
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
                Update the operator information shown inside the application.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <TextInput
                label="Username"
                value={form.username}
                onChange={() => {}}
                disabled
              />
              <TextInput
                label="Display Name"
                value={form.displayName}
                onChange={(value) => updateField("displayName", value)}
                required
              />
              <TextInput
                label="Role"
                value={form.role}
                onChange={(value) => updateField("role", value)}
                required
              />
              <TextInput
                label="Phone"
                value={form.phone}
                onChange={(value) => updateField("phone", value)}
                placeholder="Optional"
              />
            </div>

            <TextInput
              label="Email"
              value={form.email}
              onChange={(value) => updateField("email", value)}
              placeholder="Optional"
            />

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
                Account Notes
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                This section is ready for profile management, but it is not connected to a backend user database yet.
              </div>
            </div>

            {[
              "Login currently accepts any non-empty username and password.",
              "Profile changes are stored locally in the browser for this app session setup.",
              "A future auth backend can replace this without changing the page layout.",
            ].map((item) => (
              <div
                key={item}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#f8fbff",
                  border: "1px solid #e2ebf7",
                  fontSize: 13,
                  color: "#425466",
                  lineHeight: 1.6,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
