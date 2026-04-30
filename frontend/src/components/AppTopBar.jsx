import { useI18n } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";

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
  const { t } = useI18n();

  return (
    <div style={{ ...styles.topBar, height: topBarHeight, padding: isMobile ? "0 10px" : "0 16px" }}>
      {showMenu ? (
        <button style={styles.menuBtn} onClick={onToggleSidebar}>☰</button>
      ) : (
        <div style={{ width: 22 }} />
      )}
      {!isMobile && <span style={styles.topBrand}>🎓 {t("topBrand")}</span>}
      {isMobile ? (
        <button
          style={{ ...styles.topCls, fontSize: 10, padding: "3px 8px", cursor: "pointer", background: "rgba(255,255,255,0.16)" }}
          onClick={showMenu ? onOpenSidebar : onOpenAccount}
          title={t("switchClass")}
        >
          {topBarLabel || (showMenu ? t("selectClass") : t("account"))}
        </button>
      ) : (
        <span style={styles.topCls}>{topBarLabel}</span>
      )}
      <LanguageToggle compact dark />
      <button
        style={{
          ...styles.accountBtn,
          ...(page === "account" ? styles.accountBtnOn : {}),
          ...(isMobile ? { padding: "5px 8px", fontSize: 10 } : {}),
        }}
        onClick={onOpenAccount}
        title={t("openAccount")}
      >
        {accountLabel}
      </button>
      <button
        style={{ ...styles.logoutBtn, ...(isMobile ? { padding: "5px 8px", fontSize: 10 } : {}) }}
        onClick={onLogout}
      >
        {t("logout")}
      </button>
    </div>
  );
}
