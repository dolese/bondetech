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
          max-width: 396px;
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
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,248,252,0.88));
          border: 1px solid rgba(83,120,154,0.16);
          border-radius: 16px;
          display: flex;
          align-items: center;
          padding: 14px 16px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            0 8px 16px rgba(15,85,121,0.06);
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
          padding: 18px 16px 15px;
          width: 100%;
          box-sizing: border-box;
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(247,251,255,0.68), rgba(230,239,247,0.34)),
            linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08));
          border: 1px solid rgba(255,255,255,0.46);
          box-shadow:
            0 28px 60px rgba(4,18,35,0.28),
            0 10px 20px rgba(8,36,63,0.12),
            inset 0 1px 0 rgba(255,255,255,0.56);
          backdrop-filter: blur(22px) saturate(150%);
          -webkit-backdrop-filter: blur(22px) saturate(150%);
          overflow: hidden;
        }
        .login-footer-section {
          width: 100%;
          box-sizing: border-box;
        }
        .login-card-glow {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          opacity: 0.9;
          filter: blur(4px);
        }
        .login-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(15,85,121,0.09);
          border: 1px solid rgba(15,85,121,0.12);
          color: #0f5579;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.45);
        }
        .login-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #20b26b;
          box-shadow: 0 0 0 4px rgba(32,178,107,0.12);
        }
        .login-support-strip {
          margin-top: 4px;
          padding: 9px 10px;
          border-radius: 14px;
          background: rgba(255,255,255,0.34);
          border: 1px solid rgba(255,255,255,0.24);
          color: #3e5468;
          font-size: 11px;
          line-height: 1.45;
          text-align: left;
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
            padding: 13px 11px 11px;
            border-radius: 16px;
          }
          .login-meta-chip {
            padding: 6px 9px;
            gap: 6px;
            font-size: 9px;
          }
          .login-field {
            padding: 10px 12px;
            border-radius: 13px;
          }
          .login-input {
            font-size: 13px;
          }
          .login-submit-btn {
            padding: 12px 0;
            border-radius: 14px;
            letter-spacing: 0.12em;
          }
          .login-support-strip {
            padding: 8px 9px;
            border-radius: 12px;
            font-size: 10px;
          }
          .login-footer-section {
            margin-top: 10px !important;
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
          className="login-card-glow"
          style={{
            top: -42,
            right: -18,
            width: isMobile ? 96 : 132,
            height: isMobile ? 96 : 132,
            background: "radial-gradient(circle, rgba(255,205,96,0.42) 0%, rgba(255,205,96,0) 72%)",
          }}
        />
        <div
          className="login-card-glow"
          style={{
            bottom: -54,
            left: -36,
            width: isMobile ? 112 : 158,
            height: isMobile ? 112 : 158,
            background: "radial-gradient(circle, rgba(31,142,157,0.24) 0%, rgba(31,142,157,0) 72%)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: isMobile ? 10 : 14,
            marginBottom: isMobile ? 10 : 14,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 9 : 12, minWidth: 0, textAlign: "left" }}>
            <div
              style={{
                width: isMobile ? 46 : 56,
                height: isMobile ? 46 : 56,
                minWidth: isMobile ? 46 : 56,
                borderRadius: isMobile ? 14 : 18,
                background: "linear-gradient(145deg, rgba(15,85,121,0.96), rgba(31,142,157,0.95))",
                border: "3px solid rgba(255,255,255,0.78)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 22px rgba(15,85,121,0.2)",
              }}
            >
              <SchoolCrest size={isMobile ? 25 : 31} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="login-meta-chip">
                <span className="login-status-dot" />
                <span>{t("academicPortal")}</span>
              </div>

              <div
                style={{
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  color: "#102a43",
                  textTransform: "uppercase",
                  lineHeight: 1.25,
                  marginTop: isMobile ? 8 : 10,
                }}
              >
                BONDE Secondary School
              </div>

              {isWide && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#587087",
                    marginTop: 4,
                  }}
                >
                  {t("systemOnline")}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -2 }}>
            <LanguageToggle />
          </div>
        </div>

        <div style={{ fontSize: isMobile ? 21 : 27, fontWeight: 800, color: "#102a43", marginBottom: isMobile ? 4 : 6, lineHeight: 1.08, textAlign: "left" }}>
          {t("signIn")}
        </div>
        {!isMobile && (
          <div style={{ fontSize: 12, color: "#52667a", lineHeight: 1.55, marginBottom: 12, textAlign: "left", maxWidth: 290 }}>
            {t("loginIntro")}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 16 }}>
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

          {!error && !infoMsg && (
            <div className="login-support-strip">
              {t("needAccessFirstTime")}{" "}
              <span
                style={{
                  fontWeight: 800,
                  color: "#0f5579",
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}
                onClick={handleRegister}
              >
                {t("contactAdministrator")}
              </span>
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
              gap: isMobile ? 8 : 12,
              marginTop: isMobile ? 0 : 2,
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
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.24)", marginBottom: isMobile ? 8 : 16 }} />
        <p style={{ fontSize: isMobile ? 11 : 13, color: "rgba(244,247,252,0.92)", lineHeight: isMobile ? 1.45 : 1.7, margin: 0, maxWidth: isMobile ? 300 : "none" }}>
          {t("contactAdminReset")}
        </p>
      </div>
    </div>
  );
}
