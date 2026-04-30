import { useI18n } from "../i18n";

function HomeNavIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function StudentsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function ResultsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
    </svg>
  );
}

function ReportsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}

function SettingsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

export function MobileBottomNav({ page, activeClass, styles, onSetPage }) {
  const { t } = useI18n();
  const items = [
    { key: "dashboard", Icon: HomeNavIcon, label: t("home") },
    { key: "students", Icon: StudentsNavIcon, label: t("students") },
    { key: "results", Icon: ResultsNavIcon, label: t("results") },
    { key: "reports", Icon: ReportsNavIcon, label: t("reports") },
    { key: "settings", Icon: SettingsNavIcon, label: t("settings") },
  ];
  return (
    <nav style={styles.bottomNav}>
      {items.map((item, idx) => {
        const isActive = page === item.key;
        const disabled = item.key !== "dashboard" && !activeClass;
        return (
          <div key={item.key} style={{ display: "contents" }}>
            {idx > 0 && <div style={styles.navTabDivider} />}
            <button
              style={{
                ...styles.tabBtn,
                ...(disabled ? styles.tabBtnDisabled : {}),
              }}
              disabled={disabled}
              onClick={() => onSetPage(item.key)}
              aria-label={item.label}
            >
              {isActive && <div style={styles.tabActiveBar} />}
              <div
                style={{
                  ...styles.tabIconCircle,
                  ...(isActive ? styles.tabIconCircleActive : {}),
                }}
              >
                <item.Icon />
              </div>
              <span
                style={{
                  ...styles.tabLabel,
                  ...(isActive ? styles.tabLabelActive : {}),
                }}
              >
                {item.label}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
