export function AppTopBar({
  isMobile,
  page,
  topBarHeight,
  topBarLabel,
  accountLabel,
  showMenu = true,
  styles,
  onToggleSidebar,
  onOpenSidebar,
  onOpenAccount,
  onLogout,
}) {
  return (
    <div style={{ ...styles.topBar, height: topBarHeight, padding: isMobile ? "0 10px" : "0 16px" }}>
      {showMenu ? (
        <button style={styles.menuBtn} onClick={onToggleSidebar}>☰</button>
      ) : (
        <div style={{ width: 22 }} />
      )}
      {!isMobile && <span style={styles.topBrand}>🎓 BONDE SEC SCHOOL - RESULT SYSTEM</span>}
      {isMobile ? (
        <button
          style={{ ...styles.topCls, fontSize: 10, padding: "3px 8px", cursor: "pointer", background: "rgba(255,255,255,0.16)" }}
          onClick={showMenu ? onOpenSidebar : onOpenAccount}
          title="Switch class"
        >
          {topBarLabel || (showMenu ? "Select class" : "Account")}
        </button>
      ) : (
        <span style={styles.topCls}>{topBarLabel}</span>
      )}
      <button
        style={{
          ...styles.accountBtn,
          ...(page === "account" ? styles.accountBtnOn : {}),
          ...(isMobile ? { padding: "5px 8px", fontSize: 10 } : {}),
        }}
        onClick={onOpenAccount}
        title="Open account"
      >
        {accountLabel}
      </button>
      <button
        style={{ ...styles.logoutBtn, ...(isMobile ? { padding: "5px 8px", fontSize: 10 } : {}) }}
        onClick={onLogout}
      >
        Log out
      </button>
    </div>
  );
}
