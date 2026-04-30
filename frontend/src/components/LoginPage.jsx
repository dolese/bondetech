import React, { useState } from "react";
import { useViewport } from "../utils/useViewport";
import { useI18n } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";

function SchoolCrest({ size = 40 }) {
  return (
    <img
      src="/asset/bonde.jpg"
      alt="BONDE Secondary School Logo"
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: 4 }}
    />
  );
}

function PersonIcon({ size = 22, color = "#555" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon({ size = 22, color = "#555" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function LoginPage({ onBack, onLogin }) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { isMobile, width } = useViewport();
  const isWide = width >= 980;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t("enterUsernamePassword"));
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await onLogin?.({ username, password, rememberMe });
      if (result?.bootstrap) {
        setInfoMsg(t("firstAdminCreated"));
      }
    } catch (err) {
      setError(err.message || t("loginFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    setInfoMsg(t("contactAdminReset"));
    setTimeout(() => setInfoMsg(""), 4000);
  };

  const handleRegister = () => {
    setInfoMsg(t("registrationManaged"));
    setTimeout(() => setInfoMsg(""), 4000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "74px 12px 18px" : "112px 20px 40px",
        fontFamily: "'Poppins', 'Segoe UI', sans-serif",
        position: "relative",
        backgroundImage: "url('/asset/loginback.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        .login-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(125deg, rgba(4,18,35,0.88) 0%, rgba(7,35,61,0.72) 42%, rgba(11,61,92,0.56) 100%),
            radial-gradient(circle at top right, rgba(255, 205, 96, 0.18), transparent 30%);
        }
        .login-panel {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 392px;
        }
        .login-field-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .login-field-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #587087;
        }
        .login-field {
          width: 100%;
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(83,120,154,0.18);
          border-radius: 16px;
          display: flex;
          align-items: center;
          padding: 14px 16px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
          transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
        }
        .login-field:focus-within {
          border-color: rgba(15,85,121,0.55);
          box-shadow: 0 0 0 4px rgba(15,85,121,0.12), inset 0 1px 0 rgba(255,255,255,0.72);
          transform: translateY(-1px);
        }
        .login-field-divider {
          width: 1px;
          height: 24px;
          background: rgba(83,120,154,0.18);
          margin: 0 14px;
        }
        .login-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15px;
          color: #17324d;
          background: transparent;
          font-family: inherit;
          padding: 0;
        }
        .login-input::placeholder {
          color: #7890a7;
        }
        .login-back-btn {
          position: absolute;
          top: 18px;
          left: 18px;
          z-index: 2;
          background: rgba(4,18,35,0.42);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          padding: 10px 16px;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          backdrop-filter: blur(10px);
          transition: background 0.18s, transform 0.18s;
        }
        .login-back-btn:hover {
          background: rgba(4,18,35,0.58);
          transform: translateY(-1px);
        }
        .login-submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #0f5579, #1f8e9d);
          color: #fff;
          border: none;
          border-radius: 16px;
          padding: 16px 0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.18em;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 16px 28px rgba(19,104,133,0.30);
          transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
        }
        .login-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 34px rgba(19,104,133,0.36);
          filter: brightness(1.03);
        }
        .login-card-inner {
          padding: 24px 22px 20px;
          width: 100%;
          box-sizing: border-box;
          border-radius: 26px;
          background: linear-gradient(180deg, rgba(244,248,252,0.58), rgba(228,238,247,0.34));
          border: 1px solid rgba(255,255,255,0.42);
          box-shadow:
            0 24px 52px rgba(4,18,35,0.24),
            inset 0 1px 0 rgba(255,255,255,0.48);
          backdrop-filter: blur(18px) saturate(145%);
          -webkit-backdrop-filter: blur(18px) saturate(145%);
        }
        .login-footer-section {
          width: 100%;
          box-sizing: border-box;
        }
        .login-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(15,85,121,0.09);
          border: 1px solid rgba(15,85,121,0.12);
          color: #0f5579;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        @media (max-width: 480px) {
          .login-back-btn {
            top: 14px;
            left: 14px;
          }
          .login-panel {
            max-width: 308px;
          }
          .login-card-inner {
            padding: 16px 12px 14px;
            border-radius: 18px;
          }
          .login-meta-chip {
            margin-bottom: 14px;
            padding: 7px 10px;
          }
          .login-field {
            padding: 12px 14px;
            border-radius: 14px;
          }
          .login-input {
            font-size: 14px;
          }
          .login-submit-btn {
            padding: 14px 0;
          }
        }
        @media (min-width: 1024px) {
          .login-panel {
            max-width: 408px;
          }
          .login-card-inner {
            padding: 26px 24px 22px;
          }
        }
      `}</style>

      <div className="login-overlay" />

      <button className="login-back-btn" onClick={onBack}>
        {"<-"} {t("back")}
      </button>

      <div
        className="login-panel login-card-inner"
        style={{
          position: "relative",
          textAlign: "center",
          zIndex: 1,
          maxWidth: isMobile ? 308 : 392,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: "linear-gradient(145deg, #0f5579, #1f8e9d)",
            border: "4px solid rgba(255,255,255,0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 16px 28px rgba(15,85,121,0.24)",
          }}
        >
          <SchoolCrest size={38} />
        </div>

        <div className="login-meta-chip">
          <span>{t("academicPortal")}</span>
          {isWide && <span>{t("systemOnline")}</span>}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#688198",
            marginBottom: 8,
          }}
        >
          BONDE Secondary School
        </div>
        <div style={{ fontSize: isMobile ? 24 : 27, fontWeight: 800, color: "#102a43", marginBottom: 8, lineHeight: 1.08 }}>
          {t("signIn")}
        </div>
        <div style={{ fontSize: 12, color: "#52667a", lineHeight: 1.65, marginBottom: 18 }}>
          {t("loginIntro")}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <LanguageToggle />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label className="login-field-wrap">
            <span className="login-field-label">{t("username")}</span>
            <div className="login-field">
              <PersonIcon size={22} color="#4d6a85" />
              <div className="login-field-divider" />
              <input
                className="login-input"
                placeholder={t("enterUsername")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                disabled={submitting}
              />
            </div>
          </label>

          <label className="login-field-wrap">
            <span className="login-field-label">{t("password")}</span>
            <div className="login-field">
              <LockIcon size={22} color="#4d6a85" />
              <div className="login-field-divider" />
              <input
                className="login-input"
                type="password"
                placeholder={t("enterPassword")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          </label>

          {error && (
            <div style={{ fontSize: 12, color: "#b42318", fontWeight: 700, textAlign: "left", marginTop: -4 }}>
              {error}
            </div>
          )}
          {infoMsg && (
            <div
              style={{
                fontSize: 12,
                color: "#17324d",
                background: "rgba(20,85,124,0.08)",
                borderRadius: 12,
                padding: "10px 12px",
                textAlign: "left",
                marginTop: -4,
                lineHeight: 1.6,
              }}
            >
              {infoMsg}
            </div>
          )}

          <button type="submit" className="login-submit-btn" style={{ marginTop: 2 }} disabled={submitting}>
            {submitting ? t("signingIn").toUpperCase() : t("loginButton").toUpperCase()}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: isMobile ? "flex-start" : "center",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 2,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#425466",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={submitting}
                style={{ width: 15, height: 15, accentColor: "#0f5579", cursor: "pointer" }}
              />
              {t("keepSignedIn")}
            </label>
            <span
              style={{ fontSize: 13, color: "#0f5579", cursor: "pointer", fontWeight: 700 }}
              onClick={handleForgotPassword}
            >
              {t("forgotPassword")}
            </span>
          </div>
        </form>
      </div>

      <div className="login-footer-section" style={{ marginTop: 18, textAlign: "center", zIndex: 1 }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.24)", marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: "rgba(244,247,252,0.92)", lineHeight: 1.7, margin: 0 }}>
          {t("needAccessFirstTime")}{" "}
          <span
            style={{ fontWeight: 800, color: "#fff", cursor: "pointer", letterSpacing: "0.04em" }}
            onClick={handleRegister}
          >
            {t("contactAdministrator")}
          </span>
        </p>
      </div>
    </div>
  );
}
