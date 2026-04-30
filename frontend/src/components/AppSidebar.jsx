import { useI18n } from "../i18n";

export function AppSidebar({
  isMobile,
  sideOpen,
  topBarHeight,
  sidebarWidth,
  page,
  activeId,
  activeClass,
  isClassPage,
  classesByYear,
  expandedYears,
  forms,
  unorganizedClasses,
  accountLabel,
  navItems,
  styles,
  onClose,
  onToggleYear,
  onAddClass,
  onPickClass,
  onSetPage,
}) {
  const { t } = useI18n();

  return (
    <>
      {isMobile && sideOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 19 }}
          onClick={onClose}
        />
      )}

      <div
        style={{
          ...styles.sidebar,
          width: isMobile ? sidebarWidth : sideOpen ? sidebarWidth : 0,
          overflow: "hidden",
          transition: isMobile ? "transform 0.25s" : "width 0.25s",
          position: isMobile ? "fixed" : "relative",
          top: isMobile ? topBarHeight : 0,
          left: 0,
          height: isMobile ? `calc(100vh - ${topBarHeight}px)` : "auto",
          zIndex: isMobile ? 20 : "auto",
          transform: isMobile && !sideOpen ? `translateX(-${sidebarWidth}px)` : "translateX(0)",
        }}
      >
        <div style={styles.sideInner}>
          <div style={styles.sideLogo}>
            <span style={{ fontSize: 24 }}>🎓</span>
            <div>
              <div style={styles.sideTitle}>BONDE SEC</div>
              <div style={styles.sideSub}>{isMobile ? t("selectAClass") : t("resultSystem")}</div>
            </div>
          </div>

          <button
            onClick={() => {
              onSetPage("dashboard");
              onClose();
            }}
            style={{ ...styles.navBtn, ...(page === "dashboard" ? styles.navBtnOn : {}) }}
          >
            📊 {t("dashboard")}
          </button>

          <div style={styles.sideSection}>{t("studentsSection").toUpperCase()}</div>
          <div style={styles.classList}>
            {classesByYear.map(([year, yearClasses]) => (
              <div key={year}>
                <div style={styles.yearRow} onClick={() => onToggleYear(year)}>
                  <span style={styles.yearLabel}>
                    {expandedYears.has(year) ? "▾" : "▸"} {year}
                  </span>
                  {yearClasses.length < forms.length && (
                    <button
                      style={styles.addYearBtn}
                      title={`${t("selectClass")} ${year}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextForm = forms.find((form) => !yearClasses.some((cls) => cls.form === form));
                        if (nextForm) onAddClass({ year, form: nextForm });
                      }}
                    >
                      +
                    </button>
                  )}
                </div>

                {expandedYears.has(year) &&
                  forms.map((form) => {
                    const cls = yearClasses.find((item) => item.form === form);
                    const isActive = cls && cls.id === activeId && isClassPage;
                    return (
                      <div
                        key={form}
                        style={{
                          ...styles.formItem,
                          ...(isActive ? styles.formItemOn : {}),
                          ...(cls ? {} : styles.formItemEmpty),
                        }}
                        onClick={() => {
                          if (cls) {
                            onPickClass(cls);
                          } else {
                            onAddClass({ year, form });
                          }
                        }}
                        title={cls ? cls.name : `${t("selectClass")} ${form} ${year}`}
                      >
                        <span style={styles.formLabel}>{form}</span>
                        {cls ? (
                          <span style={styles.clBadge}>
                            {cls.studentCount ?? cls.students?.length ?? 0}
                          </span>
                        ) : (
                          <span style={styles.addSlotBtn}>+</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}

            {unorganizedClasses.length > 0 && (
              <div>
                <div style={{ ...styles.yearRow, cursor: "default" }}>
                  <span style={{ ...styles.yearLabel, color: "rgba(255,255,255,0.3)" }}>{t("unorganized")}</span>
                </div>
                {unorganizedClasses.map((cls) => (
                  <div
                    key={cls.id}
                    style={{
                      ...styles.formItem,
                      ...(cls.id === activeId && isClassPage ? styles.formItemOn : {}),
                    }}
                    onClick={() => onPickClass(cls)}
                    title={cls.name}
                  >
                    <span style={{ ...styles.formLabel, color: "#c8d8f0" }}>📋 {cls.name}</span>
                    <span style={styles.clBadge}>
                      {cls.studentCount ?? cls.students?.length ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.sideSection}>{t("classSection").toUpperCase()}</div>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                if (activeClass) {
                  onSetPage(item.key);
                  onClose();
                }
              }}
              disabled={!activeClass}
              style={{
                ...styles.navBtn,
                ...(page === item.key ? styles.navBtnOn : {}),
                ...(!activeClass ? styles.navBtnDisabled : {}),
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}

          <div style={styles.sideSection}>{t("accountSection").toUpperCase()}</div>
          <button
            onClick={() => {
              onSetPage("account");
              onClose();
            }}
            style={{ ...styles.navBtn, ...(page === "account" ? styles.navBtnOn : {}) }}
          >
            {accountLabel}
          </button>

          <div style={styles.sideFooter}>
            <span style={{ color: "#5dbb6b", fontSize: 10, fontWeight: 700 }}>🗄️ Firebase / Firestore</span>
            <br />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>{t("dataPersists")}</span>
          </div>
        </div>
      </div>
    </>
  );
}
