import { useMemo } from "react";
import { LanguageToggle } from "./LanguageToggle";

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
  onLogout,
}) {
  const failedCount = useMemo(
    () => authLogs.filter((log) => log.status === "failed").length,
    [authLogs]
  );

  const roleLabel =
    currentUser?.role === "admin"
      ? "Super Admin"
      : currentUser?.role
      ? `${currentUser.role.slice(0, 1).toUpperCase()}${currentUser.role.slice(1)}`
      : "Staff";

  return (
    <div
      style={{
        height: topBarHeight,
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(247,250,253,0.88)",
        backdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(148,163,184,0.12)",
        padding: isMobile ? "10px 12px" : "14px 20px 12px",
        boxSizing: "border-box",
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
              border: "none",
              background: "#fff",
              width: isMobile ? 42 : 48,
              height: isMobile ? 42 : 48,
              borderRadius: 16,
              boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
              color: "#0f172a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onToggleSidebar}
            title="Toggle menu"
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
              border: "1px solid rgba(148,163,184,0.16)",
              background: "#fff",
              borderRadius: 16,
              padding: "12px 14px",
              textAlign: "left",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
            }}
          >
            {topBarLabel}
          </button>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 12,
              background: "#fff",
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.14)",
              boxShadow: "0 12px 36px rgba(15,23,42,0.06)",
              padding: "13px 18px",
            }}
          >
            <div style={{ color: "#64748b", fontSize: 15 }}>
              Search students, results, users...
            </div>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(145deg, rgba(37,99,235,0.10), rgba(15,139,141,0.10))",
                color: "#475569",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SearchIcon />
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 14,
            justifyContent: "flex-end",
          }}
        >
          <LanguageToggle compact={!isMobile} />

          {!isMobile && (
            <button
              onClick={onOpenAccount}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                position: "relative",
                color: "#0f8b8d",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
              title="Notifications"
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
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    boxShadow: "0 10px 18px rgba(239,68,68,0.22)",
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
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 0,
            }}
            title="Open account"
          >
            <div
              style={{
                width: isMobile ? 38 : 48,
                height: isMobile ? 38 : 48,
                borderRadius: "50%",
                background: "linear-gradient(145deg, #1f3c88, #16a3a3)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: isMobile ? 13 : 16,
                boxShadow: "0 10px 24px rgba(31,60,136,0.18)",
              }}
            >
              {initialsFromUser(currentUser)}
            </div>

            {!isMobile && (
              <>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
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
                border: "1px solid rgba(148,163,184,0.16)",
                background: "#fff",
                color: "#0f172a",
                borderRadius: 14,
                padding: "10px 11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={onLogout}
              title="Log out"
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
