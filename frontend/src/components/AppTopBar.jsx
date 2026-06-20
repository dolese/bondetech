import { useMemo } from "react";
import { LanguageToggle } from "./LanguageToggle";
import { useI18n } from "../i18n";
import { premiumFontStack } from "../utils/designSystem";

function initialsFromUser(user) {
  const source = String(user?.displayName || user?.username || "Admin")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  return source.map((part) => part[0]?.toUpperCase() || "").join("") || "AD";
}

function SvgIcon({ children, width = 22, height = 22, strokeWidth = 2.1 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
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

function MenuIcon() {
  return (
    <SvgIcon>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </SvgIcon>
  );
}

function SearchIcon() {
  return (
    <SvgIcon width={20} height={20}>
      <circle cx="11" cy="11" r="6.6" />
      <path d="m16.2 16.2 3.8 3.8" />
    </SvgIcon>
  );
}

function BellIcon() {
  return (
    <SvgIcon width={20} height={20}>
      <path d="M6 17.1V11a6 6 0 1 1 12 0v6.1l1.6 1.4H4.4L6 17.1Z" />
      <path d="M10 19.3a2.4 2.4 0 0 0 4 0" />
    </SvgIcon>
  );
}

function ChevronDownIcon() {
  return (
    <SvgIcon width={16} height={16} strokeWidth={2.3}>
      <path d="m5 8 5 5 5-5" />
    </SvgIcon>
  );
}

function LogoutIcon() {
  return (
    <SvgIcon width={18} height={18} strokeWidth={2.2}>
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H4.5" />
      <path d="M13.5 4H19a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20h-5.5" />
    </SvgIcon>
  );
}

function HelpIcon() {
  return (
    <SvgIcon width={20} height={20}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </SvgIcon>
  );
}

// Flat shared surfaces (no glassmorphism).
const FLAT_CONTROL = {
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
};

export function AppTopBar({
  isMobile,
  currentUser,
  authLogs = [],
  topBarHeight,
  topBarLabel,
  showMenu = true,
  onToggleSidebar,
  onOpenSidebar,
  onOpenAccount,
  onOpenCommandPalette,
  onLogout,
  onOpenUserGuide,
}) {
  const { t } = useI18n();
  const failedCount = useMemo(
    () => authLogs.filter((log) => log.status === "failed").length,
    [authLogs]
  );
  const uiFont = premiumFontStack;

  const roleLabel =
    currentUser?.role === "admin"
      ? t("superAdmin")
      : currentUser?.role
      ? `${currentUser.role.slice(0, 1).toUpperCase()}${currentUser.role.slice(1)}`
      : t("staff");

  return (
    <div
      style={{
        height: topBarHeight,
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
        padding: isMobile ? "10px 12px" : "14px 20px 12px",
        boxSizing: "border-box",
        fontFamily: uiFont,
      }}
    >
      <div
        style={{
          maxWidth: 1480,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isMobile ? "auto 1fr auto" : "auto minmax(340px, 1fr) auto",
          gap: isMobile ? 10 : 18,
          alignItems: "center",
        }}
      >
        {showMenu ? (
          <button
            style={{
              ...FLAT_CONTROL,
              width: isMobile ? 42 : 48,
              height: isMobile ? 42 : 48,
              borderRadius: 12,
              color: "#0f172a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onToggleSidebar}
            title={t("toggleMenu")}
          >
            <MenuIcon />
          </button>
        ) : (
          <div style={{ width: isMobile ? 42 : 48 }} />
        )}

        {isMobile ? (
          <button
            onClick={showMenu ? onOpenSidebar : onOpenAccount}
            style={{
              ...FLAT_CONTROL,
              borderRadius: 12,
              padding: "12px 14px",
              textAlign: "left",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: uiFont,
            }}
          >
            {topBarLabel}
          </button>
        ) : (
          <button
            onClick={onOpenCommandPalette}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 12,
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              padding: "12px 16px",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              fontFamily: uiFont,
            }}
            title={t("openSearch")}
          >
            <div style={{ color: "#64748b", fontSize: 15 }}>
              {t("searchStudentsResultsUsers")}
            </div>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#eff5ff",
                border: "1px solid #dbe7fe",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              >
                <SearchIcon />
              </div>
          </button>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 14,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onOpenUserGuide}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
              fontFamily: uiFont,
            }}
            title={t("userGuide")}
          >
            <HelpIcon />
          </button>

          <LanguageToggle compact={!isMobile} />

          {!isMobile && (
            <button
              onClick={onOpenAccount}
              style={{
                ...FLAT_CONTROL,
                borderRadius: 12,
                cursor: "pointer",
                position: "relative",
                color: "#1d4ed8",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
              title={t("notifications")}
            >
              <BellIcon />
              {failedCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -5,
                    minWidth: 19,
                    height: 19,
                    borderRadius: 999,
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    boxShadow: "0 4px 10px rgba(239,68,68,0.22)",
                  }}
                >
                  {failedCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenAccount}
            style={{
              ...FLAT_CONTROL,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: isMobile ? "4px 6px 4px 4px" : "6px 10px 6px 6px",
              borderRadius: 12,
            }}
            title={t("openAccountLabel")}
          >
            <div
              style={{
                width: isMobile ? 38 : 48,
                height: isMobile ? 38 : 48,
                borderRadius: "50%",
                background: "linear-gradient(145deg, #0f2d6e, #1d4ed8)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: isMobile ? 13 : 16,
                boxShadow: "0 2px 8px rgba(15,45,110,0.18)",
              }}
            >
              {initialsFromUser(currentUser)}
            </div>

            {!isMobile && (
              <>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    {currentUser?.displayName || currentUser?.username || "Admin"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {roleLabel}
                  </div>
                </div>
                <div style={{ color: "#475569", display: "flex", alignItems: "center" }}>
                  <ChevronDownIcon />
                </div>
              </>
            )}
          </button>

          {isMobile && (
            <button
              style={{
                ...FLAT_CONTROL,
                color: "#0f172a",
                borderRadius: 12,
                padding: "10px 11px",
                cursor: "pointer",
                fontFamily: uiFont,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={onLogout}
              title={t("logout")}
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
