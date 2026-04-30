import React, { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api";
import { EXAM_TYPES } from "../utils/constants";
import { useViewport } from "../utils/useViewport";
import { StudentProfilePage } from "./StudentProfilePage";
import { useI18n } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";

const ANNOUNCEMENT_TONES = {
  info: { bg: "#dbeafe", color: "#2563eb", label: "Live" },
  success: { bg: "#d1fae5", color: "#059669", label: "Published" },
  warning: { bg: "#fef3c7", color: "#d97706", label: "Schedule" },
  accent: { bg: "#ede9fe", color: "#7c3aed", label: "Portal" },
};

function createFallbackOverview(t) {
  return {
    stats: {
      totalStudents: 0,
      totalClasses: 0,
      activeForms: 0,
      publishedClasses: 0,
      publishedStudents: 0,
      latestYear: "",
      latestExamLabel: "",
      monthlyExamCount: 0,
      monthlyExamLabels: [],
      averageClassSize: 0,
    },
    formBreakdown: [],
    announcements: [
      {
        id: "portal-ready",
        tone: "info",
        title: t("portalReadyTitle"),
        description: t("portalReadyDescription"),
        date: new Date().toISOString(),
      },
    ],
  };
}

function formatDateLabel(value, language, t) {
  if (!value) return t("updatedJustNow");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return t("updatedJustNow");
  return parsed.toLocaleDateString(language === "sw" ? "sw-TZ" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCount(value, enLabel, swLabel, language) {
  const number = Number(value || 0);
  if (language === "sw") {
    return `${number.toLocaleString()} ${swLabel}`;
  }
  return `${number.toLocaleString()} ${enLabel}${number === 1 ? "" : "s"}`;
}

function buildQuickAccess(stats, announcementCount, latestExamLabel, onOpenLogin, scrollToSearch, scrollToAnnouncements, t, language) {
  const publishedLabel = formatCount(stats.publishedClasses, "published class", "madarasa yaliyochapishwa", language);
  const studentLabel = formatCount(stats.totalStudents, "student", "wanafunzi", language);
  const formLabel = formatCount(stats.activeForms, "active form", "vidato hai", language);
  const monthlyLabel = formatCount(stats.monthlyExamCount, "monthly exam", "mitihani ya kila mwezi", language);

  return [
    {
      id: "results",
      bg: "#dbeafe",
      badge: publishedLabel,
      title: t("checkResults"),
      desc: stats.publishedClasses > 0
        ? language === "sw"
          ? `${publishedLabel} yako tayari kwa utafutaji wa umma.`
          : `${publishedLabel} are ready for public result search.`
        : t("resultsWillAppear"),
      onClick: scrollToSearch,
    },
    {
      id: "performance",
      bg: "#d1fae5",
      badge: studentLabel,
      title: t("classPerformance"),
      desc: language === "sw"
        ? `${studentLabel} wanafuatiliwa kwenye ${formLabel}.`
        : `${studentLabel} are currently tracked across ${formLabel}.`,
      onClick: scrollToSearch,
    },
    {
      id: "timetable",
      bg: "#fef3c7",
      badge: monthlyLabel,
      title: t("examTimetable"),
      desc: stats.monthlyExamCount > 0
        ? language === "sw"
          ? `${monthlyLabel} zimewezeshwa kwenye madarasa hai.`
          : `${monthlyLabel} are enabled on active classes.`
        : latestExamLabel
        ? language === "sw"
          ? `Kipindi cha sasa cha mtihani: ${latestExamLabel}.`
          : `Current exam session: ${latestExamLabel}.`
        : t("addExamSettings"),
      onClick: scrollToAnnouncements,
    },
    {
      id: "announcements",
      bg: "#ede9fe",
      badge: formatCount(announcementCount, "live update", "taarifa hai", language),
      title: t("announcements"),
      desc: language === "sw"
        ? `${formatCount(announcementCount, "live update", "taarifa hai", language)} zinapatikana kwenye ukurasa wa mwanzo.`
        : `${formatCount(announcementCount, "live update", "taarifa hai", language)} are available on the portal homepage.`,
      onClick: scrollToAnnouncements,
    },
    {
      id: "reports",
      bg: "#fee2e2",
      badge: formatCount(stats.publishedStudents, "searchable student", "wanafunzi wanaotafutika", language),
      title: t("downloadReport"),
      desc: stats.publishedStudents > 0
        ? language === "sw"
          ? `${formatCount(stats.publishedStudents, "searchable student", "wanafunzi wanaotafutika", language)} wanaweza kufikiwa pindi walimu wanapofungua zana za ripoti.`
          : `${formatCount(stats.publishedStudents, "searchable student", "wanafunzi wanaotafutika", language)} can be reached once staff open report tools.`
        : t("reportsUnlock"),
      onClick: scrollToSearch,
    },
    {
      id: "login",
      bg: "#cffafe",
      badge: stats.latestYear ? (language === "sw" ? `Mwaka ${stats.latestYear}` : `Year ${stats.latestYear}`) : t("portalAccess"),
      title: t("studentParentLogin"),
      desc: stats.latestYear
        ? language === "sw"
          ? `Ufikiaji wa tovuti umeandaliwa kwa mzunguko wa ${stats.latestYear}.`
          : `Portal access is prepared for the ${stats.latestYear} academic cycle.`
        : language === "sw"
        ? "Fikia tovuti ya watumishi na zana za mwanafunzi kwa usalama."
        : "Access the staff portal and student tools securely.",
      onClick: onOpenLogin,
    },
  ];
}

function buildPerformanceStats(stats, latestExamLabel, t) {
  return [
    { key: "students", color: "#2563eb", value: Number(stats.totalStudents || 0).toLocaleString(), label: t("totalStudents") },
    { key: "classes", color: "#059669", value: String(stats.totalClasses || 0), label: t("activeClasses") },
    { key: "exam", color: "#7c3aed", value: latestExamLabel || t("noExamYet"), label: t("latestExam") },
    { key: "published", color: "#d97706", value: String(stats.publishedClasses || 0), label: t("publishedClasses") },
    { key: "forms", color: "#0891b2", value: String(stats.activeForms || 0), label: t("activeForms") },
    { key: "monthly", color: "#dc2626", value: String(stats.monthlyExamCount || 0), label: t("monthlyExams") },
  ];
}

function MiniBarChart({ bars }) {
  const normalized = bars.length > 0
    ? bars
    : [
        { label: "F1", value: 0 },
        { label: "F2", value: 0 },
        { label: "F3", value: 0 },
        { label: "F4", value: 0 },
      ];
  const width = 22;
  const gap = 12;
  const maxHeight = 72;
  const maxValue = Math.max(...normalized.map((bar) => bar.value), 1);

  return (
    <svg width={normalized.length * (width + gap) - gap} height={maxHeight + 20} style={{ display: "block", overflow: "visible" }}>
      {normalized.map((bar, index) => {
        const height = bar.value > 0 ? Math.max(12, Math.round((bar.value / maxValue) * maxHeight)) : 8;
        return (
          <g key={bar.label}>
            <rect
              x={index * (width + gap)}
              y={maxHeight - height}
              width={width}
              height={height}
              rx={4}
              fill={bar.value > 0 ? "#2563eb" : "#cbd5e1"}
            />
            <text
              x={index * (width + gap) + width / 2}
              y={maxHeight + 13}
              textAnchor="middle"
              fontSize={9}
              fill="#64748b"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

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

function QuickCard({ bg, badge, title, desc, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: hovered ? "#f0f4ff" : "#fff",
        border: "1px solid #e8edf5",
        borderRadius: 14,
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "pointer",
        transition: "all 0.18s ease",
        boxShadow: hovered ? "0 4px 16px rgba(0,51,102,0.10)" : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {badge}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040" }}>{title}</div>
      <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function AnnouncementRow({ title, desc, date, tone, compact = false }) {
  const [hovered, setHovered] = useState(false);
  const palette = ANNOUNCEMENT_TONES[tone] || ANNOUNCEMENT_TONES.info;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: compact ? "flex-start" : "center",
        flexWrap: compact ? "wrap" : "nowrap",
        gap: 14,
        padding: "14px 16px",
        borderBottom: "1px solid #f1f5f9",
        cursor: "pointer",
        background: hovered ? "#f8faff" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: palette.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: palette.color,
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {palette.label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#94a3b8",
          flexShrink: 0,
          marginLeft: compact ? 56 : 8,
          width: compact ? "calc(100% - 56px)" : "auto",
        }}
      >
        {date}
      </div>
      {!compact && <div style={{ fontSize: 16, color: "#94a3b8" }}>{">"}</div>}
    </div>
  );
}

function CategoryChip({ label, color, bg, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "14px 12px",
        background: hovered ? bg : "#fff",
        border: `1.5px solid ${hovered ? color : "#e8edf5"}`,
        borderRadius: 14,
        cursor: "pointer",
        transition: "all 0.18s ease",
        minWidth: 84,
      }}
    >
      <div style={{ width: 26, height: 26, borderRadius: 999, background: hovered ? color : "#e2e8f0" }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: hovered ? color : "#475569", textAlign: "center", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function FeatureChip({ bg, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: bg }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textAlign: "center", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export function HomePage({ onOpenLogin }) {
  const { language, t } = useI18n();
  const fallbackOverview = useMemo(() => createFallbackOverview(t), [t]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchAdmission, setSearchAdmission] = useState("");
  const [searchExam, setSearchExam] = useState("");
  const [searchForm, setSearchForm] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [profileIndexNo, setProfileIndexNo] = useState(null);
  const [homepageData, setHomepageData] = useState(fallbackOverview);
  const [homepageStatus, setHomepageStatus] = useState("loading");
  const { isXs, isMobile, isTablet, isDesktop } = useViewport();
  const searchSectionRef = useRef(null);
  const announcementsSectionRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadHomepage() {
      try {
        const overview = await API.getHomepageOverview();
        if (!active) return;
        setHomepageData(overview);
        setHomepageStatus("ready");
      } catch (err) {
        if (!active) return;
        try {
          const basicStats = await API.getStats();
          if (!active) return;
          setHomepageData({
            ...fallbackOverview,
            stats: {
              ...fallbackOverview.stats,
              totalStudents: Number(basicStats.totalStudents || 0),
              totalClasses: Number(basicStats.totalClasses || 0),
              latestYear: basicStats.latestYear || "",
              averageClassSize: basicStats.totalClasses
                ? Math.round(Number(basicStats.totalStudents || 0) / Number(basicStats.totalClasses))
                : 0,
            },
          });
        } catch {
          if (!active) return;
          setHomepageData(fallbackOverview);
        }
        setHomepageStatus("fallback");
      }
    }

    loadHomepage();
    return () => {
      active = false;
    };
  }, [fallbackOverview]);

  const scrollToSearch = () => {
    searchSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToAnnouncements = () => {
    announcementsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToFooter = () => {
    footerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchAdmission.trim()) {
      setSearchError(language === "sw" ? "Tafadhali weka namba ya kujiunga au jina la mwanafunzi." : "Please enter an admission number or student name.");
      return;
    }

    setSearchError("");
    setSearching(true);
    setSearchResults(null);
    setProfileIndexNo(null);

    try {
      const opts = {};
      if (searchForm) opts.form = searchForm;
      if (searchYear) opts.year = searchYear;
      const results = await API.searchStudents(searchAdmission.trim(), opts);
      if (results.length === 0) {
        setSearchError(t("noResultsFound"));
      } else if (results.length === 1) {
        setProfileIndexNo(results[0].indexNo);
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      setSearchError(err.message || t("searchFailed"));
    } finally {
      setSearching(false);
    }
  };

  const handleCategoryClick = (label) => {
    const normalized = label.replace(/\n/g, " ");
    const match = normalized.match(/Form\s+(I{1,3}V?|IV)/);
    if (match) {
      setSearchForm(`Form ${match[1]}`);
    }
    scrollToSearch();
  };

  const currentYear = new Date().getFullYear();
  const stats = homepageData?.stats || fallbackOverview.stats;
  const announcements = Array.isArray(homepageData?.announcements) && homepageData.announcements.length > 0
    ? homepageData.announcements
    : fallbackOverview.announcements;
  const latestExamLabel = stats.latestExamLabel || (stats.latestYear ? (language === "sw" ? `Mwaka wa Masomo ${stats.latestYear}` : `Academic Year ${stats.latestYear}`) : "Results Portal");
  const quickAccess = buildQuickAccess(stats, announcements.length, latestExamLabel, onOpenLogin, scrollToSearch, scrollToAnnouncements, t, language);
  const performanceStats = Array.isArray(homepageData?.highlights) && homepageData.highlights.length > 0
    ? homepageData.highlights
    : buildPerformanceStats(stats, latestExamLabel, t);
  const chartBars = Array.isArray(homepageData?.formBreakdown) && homepageData.formBreakdown.length > 0
    ? homepageData.formBreakdown.map((item) => ({
        label: item.label.replace("Form ", "F"),
        value: Number(item.students || 0),
      }))
    : [];
  const navBg = "#0f2d6e";
  const font = "'Poppins', 'Segoe UI', sans-serif";
  const containerStyle = { maxWidth: 1140, margin: "0 auto", padding: isMobile ? "0 16px" : "0 32px" };

  const categories = [
    { label: language === "sw" ? "Kidato I\nMatokeo" : "Form I\nResults", color: "#2563eb", bg: "#dbeafe" },
    { label: language === "sw" ? "Kidato II\nMatokeo" : "Form II\nResults", color: "#2563eb", bg: "#dbeafe" },
    { label: language === "sw" ? "Kidato III\nMatokeo" : "Form III\nResults", color: "#2563eb", bg: "#dbeafe" },
    { label: language === "sw" ? "Kidato IV\nMatokeo" : "Form IV\nResults", color: "#2563eb", bg: "#dbeafe" },
    { label: language === "sw" ? "Mtihani wa\nMuhula" : "Terminal\nExams", color: "#dc2626", bg: "#fee2e2" },
    { label: language === "sw" ? "Mitihani ya\nKati" : "Midterm\nExams", color: "#dc2626", bg: "#fee2e2" },
    { label: language === "sw" ? "Mitihani ya\nMwisho" : "Annual\nExams", color: "#7c3aed", bg: "#ede9fe" },
    { label: language === "sw" ? "Mitihani ya\nMock" : "Mock\nExams", color: "#0891b2", bg: "#cffafe" },
  ];

  const features = [
    { bg: "#dbeafe", label: language === "sw" ? "Ufikiaji\nSalama" : "Secure\nAccess" },
    { bg: "#d1fae5", label: language === "sw" ? "Ukaguzi wa\nMatokeo Haraka" : "Fast Results\nChecking" },
    { bg: "#ede9fe", label: language === "sw" ? "Inaendana na\nSimu" : "Mobile\nResponsive" },
    { bg: "#fef3c7", label: language === "sw" ? "Upakuaji Rahisi\nwa Ripoti" : "Easy Report\nDownload" },
    { bg: "#d1fae5", label: language === "sw" ? "Ufuatiliaji wa\nUtendaji" : "Performance\nTracking" },
    { bg: "#fee2e2", label: language === "sw" ? "Taarifa Mahali\nPamoja" : "Notices in\nOne Place" },
  ];

  return (
    <div style={{ fontFamily: font, background: "#f0f4fa", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .landing-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 2px solid rgba(255,255,255,0.85);
          border-radius: 10px;
          padding: 11px 20px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          background: transparent;
          cursor: pointer;
          letter-spacing: 0.2px;
          transition: all 0.18s ease;
          font-family: inherit;
        }
        .landing-btn-outline:hover {
          background: rgba(255,255,255,0.15);
        }
        .landing-search-input {
          border: 1.5px solid #dde3ef;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          background: #fff;
          flex: 1;
          min-width: 0;
          font-family: inherit;
          color: #1a2040;
          outline: none;
        }
        .landing-search-input:focus {
          border-color: #2563eb;
        }
      `}</style>

      <nav style={{ background: "#fff", borderBottom: "1.5px solid #e8edf5", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ ...containerStyle, display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? 60 : 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SchoolCrest size={isMobile ? 36 : 44} />
            <div>
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 800, color: navBg, letterSpacing: 0.3, lineHeight: 1.2 }}>BONDE SECONDARY SCHOOL</div>
              <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: "#2563eb", letterSpacing: 1, textTransform: "uppercase" }}>{t("resultSystem")}</div>
            </div>
          </div>

          {isDesktop && (
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {[
                { label: t("home"), action: scrollToTop },
                { label: t("results"), action: scrollToSearch },
                { label: t("notices"), action: scrollToAnnouncements },
                { label: t("aboutUs"), action: scrollToFooter },
                { label: t("contactUs"), action: scrollToFooter },
              ].map(({ label, action }) => (
                <span key={label} onClick={action} style={{ fontSize: 13, fontWeight: 600, color: label === t("home") ? "#2563eb" : "#475569", cursor: "pointer", transition: "color 0.15s" }}>
                  {label}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LanguageToggle compact={isMobile} />
            {isDesktop ? (
              <button
                onClick={onOpenLogin}
                style={{ background: navBg, color: "#fff", border: "none", borderRadius: 10, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(15,45,110,0.2)" }}
              >
                {t("loginButton")}
              </button>
            ) : (
              <button
                onClick={() => setMobileMenuOpen((value) => !value)}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 22, color: navBg, padding: 4 }}
                aria-label="Menu"
              >
                {mobileMenuOpen ? "X" : "="}
              </button>
            )}
          </div>
        </div>

        {!isDesktop && mobileMenuOpen && (
          <div style={{ background: "#fff", borderTop: "1px solid #f1f5f9", padding: "8px 0 12px" }}>
            {[
              { label: t("home"), action: scrollToTop },
              { label: t("results"), action: scrollToSearch },
              { label: t("notices"), action: scrollToAnnouncements },
              { label: t("aboutUs"), action: scrollToFooter },
              { label: t("contactUs"), action: scrollToFooter },
            ].map(({ label, action }) => (
              <div
                key={label}
                onClick={() => {
                  action();
                  setMobileMenuOpen(false);
                }}
                style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}
              >
                {label}
              </div>
            ))}
            <div style={{ padding: "8px 16px 0" }}>
              <button
                onClick={() => {
                  onOpenLogin?.();
                  setMobileMenuOpen(false);
                }}
                style={{ width: "100%", background: navBg, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                {t("loginButton")}
              </button>
            </div>
          </div>
        )}
      </nav>

      <section
        style={{
          background: "linear-gradient(135deg, #0c2461 0%, #1a3a8f 45%, #1e52b8 100%)",
          padding: isMobile ? "32px 0 36px" : "56px 0 64px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

        <div
          style={{
            ...containerStyle,
            display: isDesktop ? "grid" : "flex",
            gridTemplateColumns: isDesktop ? "1fr 340px" : undefined,
            flexDirection: isDesktop ? undefined : "column",
            gap: isMobile ? 28 : 40,
            alignItems: "center",
          }}
        >
          <div style={{ color: "#fff" }}>
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 999, padding: "5px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, marginBottom: 18 }}>
              {homepageStatus === "loading" ? (language === "sw" ? "Inapakia Data za Tovuti" : "Loading Portal Data") : homepageStatus === "fallback" ? (language === "sw" ? "Muhtasari wa Tovuti" : "Portal Snapshot") : (language === "sw" ? "Muhtasari Hai wa Tovuti" : "Live Portal Overview")}
            </div>
            <h1 style={{ fontSize: isMobile ? 28 : 42, fontWeight: 800, lineHeight: 1.2, margin: "0 0 16px", letterSpacing: -0.5 }}>
              {t("academicResults")}
              <br />
              {language === "sw" ? <>Yamefanywa <span style={{ color: "#f59e0b" }}>Rahisi</span></> : <>Made <span style={{ color: "#f59e0b" }}>Simple</span></>}
            </h1>
            <p style={{ fontSize: isMobile ? 13 : 15, color: "rgba(255,255,255,0.80)", lineHeight: 1.7, marginBottom: 28, maxWidth: 460 }}>
              {t("getInstantResults")}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
              <button className="landing-btn-outline" onClick={scrollToSearch}>{t("checkResults")}</button>
              <button className="landing-btn-outline" onClick={onOpenLogin}>{t("loginButton")}</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.70)", flexWrap: "wrap" }}>
              <span>{formatCount(stats.totalStudents, "student", "wanafunzi", language)}</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>{formatCount(stats.publishedClasses, "published class", "madarasa yaliyochapishwa", language)}</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>{formatCount(stats.activeForms, "active form", "vidato hai", language)}</span>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: isMobile ? "18px 16px" : "22px 20px", boxShadow: "0 16px 48px rgba(0,0,0,0.20)", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040" }}>{t("latestExam")}: {latestExamLabel}</div>
              <span style={{ fontSize: 11, color: "#64748b" }}>{stats.latestYear || t("currentYear")}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#f8faff", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{t("totalStudents")}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#0f2d6e" }}>{Number(stats.totalStudents || 0).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{t("activeClasses")}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{stats.totalClasses || 0}</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 10 }}>{t("studentsByForm")}</div>
              <MiniBarChart bars={chartBars} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#fffbeb", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#92400e", fontWeight: 600, marginBottom: 3 }}>Published Classes</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1a2040" }}>{stats.publishedClasses || 0}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{formatCount(stats.publishedStudents, "searchable student", "wanafunzi wanaotafutika", language)}</div>
              </div>
              <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#5b21b6", fontWeight: 600, marginBottom: 3 }}>Average Class Size</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1a2040" }}>{stats.averageClassSize || 0}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{formatCount(stats.monthlyExamCount, "monthly exam", "mitihani ya kila mwezi", language)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={searchSectionRef} style={{ padding: isMobile ? "24px 0" : "32px 0" }}>
        <div style={containerStyle}>
          <div style={{ background: "#fff", borderRadius: 20, padding: isMobile ? "20px 16px" : "28px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>{t("searchResultsHeading")}</span>
              </div>
              {homepageStatus === "fallback" && (
                <span style={{ fontSize: 11, color: "#64748b" }}>{t("liveOverviewUnavailable")}</span>
              )}
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>{t("searchInstructions")}</p>

            <form onSubmit={handleSearch}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDesktop
                    ? "repeat(4, 1fr)"
                    : isXs
                    ? "1fr"
                    : isMobile || isTablet
                    ? "1fr 1fr"
                    : "repeat(3, 1fr)",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <input className="landing-search-input" placeholder={t("admissionPlaceholder")} value={searchAdmission} onChange={(e) => setSearchAdmission(e.target.value)} />
                <select className="landing-search-input" value={searchExam} onChange={(e) => setSearchExam(e.target.value)}>
                  <option value="">{t("examTypeAll")}</option>
                  {EXAM_TYPES.map((examType) => (
                    <option key={examType.value} value={examType.value}>
                      {examType.label}
                    </option>
                  ))}
                </select>
                <select className="landing-search-input" value={searchForm} onChange={(e) => setSearchForm(e.target.value)}>
                  <option value="">{t("classFormAll")}</option>
                  <option>Form I</option>
                  <option>Form II</option>
                  <option>Form III</option>
                  <option>Form IV</option>
                </select>
                <select className="landing-search-input" value={searchYear} onChange={(e) => setSearchYear(e.target.value)}>
                  <option value="">{t("yearAll")}</option>
                  {Array.from({ length: 5 }, (_, index) => currentYear - index).map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                </select>
              </div>

              {searchError && (
                <div style={{ fontSize: 12, color: "#b42318", fontWeight: 600, marginBottom: 10 }}>{searchError}</div>
              )}

              <button
                type="submit"
                disabled={searching}
                style={{
                  width: "100%",
                  background: searching ? "#6b82b8" : "#1a3a8f",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: isMobile ? "13px 0" : "14px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: searching ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(26,58,143,0.25)",
                  transition: "background 0.2s",
                }}
              >
                {searching ? t("searching") : t("searchResultsButton")}
              </button>
            </form>

            {searchResults && searchResults.length > 1 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2d6e", marginBottom: 10 }}>
                  {language === "sw"
                    ? `${searchResults.length} ${t("studentsFoundSelect")}`
                    : `${searchResults.length} student${searchResults.length !== 1 ? "s" : ""} found - select to view results:`}
                </div>
                {searchResults.map((result) => (
                  <div
                    key={`${result.classId}-${result.id}`}
                    onClick={() => setProfileIndexNo(result.indexNo)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1.5px solid #e8edf5",
                      marginBottom: 8,
                      cursor: "pointer",
                      background: "#f8faff",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#eef2ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f8faff";
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040" }}>{result.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {result.indexNo} | {result.form} | {result.year}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, color: "#2563eb", fontWeight: 700 }}>{t("view")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "4px 0 24px" : "4px 0 32px" }}>
        <div style={containerStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>{t("quickAccess")}</span>
            <span onClick={scrollToSearch} style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", cursor: "pointer" }}>{t("viewAll")}</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isXs ? "1fr" : isMobile || isTablet ? "1fr 1fr" : "repeat(3, 1fr)",
              gap: isMobile ? 10 : 14,
            }}
          >
            {quickAccess.map((item) => (
              <QuickCard key={item.id} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "4px 0 24px" : "4px 0 32px" }}>
        <div style={containerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>{t("portalHighlights")}</span>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              border: "1.5px solid #f1f5f9",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              display: "grid",
              gridTemplateColumns: isXs ? "1fr 1fr" : isMobile ? "repeat(2, 1fr)" : isTablet ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
              gap: 0,
              overflow: "hidden",
            }}
          >
            {performanceStats.map((stat, index) => (
              <div
                key={stat.key || `${stat.label}-${index}`}
                style={{
                  padding: isMobile ? "16px 8px" : "20px 16px",
                  textAlign: "center",
                  borderRight: index < performanceStats.length - 1 ? "1px solid #f1f5f9" : "none",
                  borderBottom: (isMobile || isTablet) && index < (isXs ? 4 : isMobile ? 4 : 3) ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: 999, background: stat.color, margin: "0 auto 8px" }} />
                <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 800, color: "#0f2d6e" }}>{stat.value}</div>
                <div style={{ fontSize: isMobile ? 9 : 11, color: "#64748b", marginTop: 3 }}>{stat.label}</div>
                {stat.description && (
                  <div style={{ fontSize: isMobile ? 9 : 10, color: "#94a3b8", marginTop: 6, lineHeight: 1.45 }}>
                    {stat.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={announcementsSectionRef} style={{ padding: isMobile ? "4px 0 24px" : "4px 0 32px" }}>
        <div style={containerStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>{t("recentAnnouncements")}</span>
            </div>
            <span onClick={scrollToAnnouncements} style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", cursor: "pointer" }}>{t("viewAll")}</span>
          </div>
          <div style={{ background: "#fff", borderRadius: 18, border: "1.5px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            {announcements.map((announcement) => (
              <AnnouncementRow
                key={announcement.id}
                title={announcement.title}
                desc={announcement.description}
                date={formatDateLabel(announcement.date, language, t)}
                tone={announcement.tone}
                compact={isMobile}
              />
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "4px 0 24px" : "4px 0 32px" }}>
        <div style={containerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>{t("resultsCategories")}</span>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {categories.map((category) => (
              <CategoryChip key={category.label} {...category} onClick={() => handleCategoryClick(category.label)} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "4px 0 28px" : "4px 0 40px" }}>
        <div style={containerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>{t("whyUseSystem")}</span>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              border: "1.5px solid #f1f5f9",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              display: "grid",
              gridTemplateColumns: isXs ? "1fr 1fr" : isMobile ? "repeat(2, 1fr)" : isTablet ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
              gap: 0,
              overflow: "hidden",
            }}
          >
            {features.map((feature, index) => (
              <div
                key={feature.label}
                style={{
                  borderRight: index < features.length - 1 ? "1px solid #f1f5f9" : "none",
                  borderBottom: (isMobile || isTablet) && index < (isXs ? 4 : isMobile ? 4 : 3) ? "1px solid #f1f5f9" : "none",
                }}
              >
                <FeatureChip {...feature} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer ref={footerRef} style={{ background: "#0c2461", color: "#fff", padding: isMobile ? "32px 0 0" : "48px 0 0" }}>
        <div
          style={{
            ...containerStyle,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr 1fr",
            gap: isMobile ? 28 : 40,
            paddingBottom: isMobile ? 28 : 40,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <SchoolCrest size={44} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: 0.3 }}>BONDE SECONDARY SCHOOL</div>
                <div style={{ fontSize: 10, color: "#93c5fd" }}>{t("resultSystem")}</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, maxWidth: 260 }}>
              Muheza District Council,
              <br />
              P.O. Box 03 Muheza
            </p>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>{t("quickLinks")}</div>
            {[
              { label: t("home"), action: scrollToTop },
              { label: t("results"), action: scrollToSearch },
              { label: t("notices"), action: scrollToAnnouncements },
              { label: t("aboutUs"), action: scrollToFooter },
              { label: t("contactUs"), action: scrollToFooter },
            ].map(({ label, action }) => (
              <div key={label} onClick={action} style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, cursor: "pointer" }}>
                {label}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>{t("contactUs")}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Phone</span> +255 123 456 789
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Email</span> info@bondessecondary.sc.tz
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>Office</span> Muheza, Tanga, Tanzania
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", padding: "16px 0", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.50)" }}>
            Copyright {currentYear} Bonde Secondary School. All Rights Reserved.
          </span>
        </div>
      </footer>

      {profileIndexNo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,18,40,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: isMobile ? 0 : "24px 16px",
            overflowY: "auto",
          }}
          onClick={() => setProfileIndexNo(null)}
        >
          <div
            style={{
              background: "#f0f4fa",
              borderRadius: isMobile ? 0 : 20,
              width: "100%",
              maxWidth: 760,
              minHeight: isMobile ? "100vh" : undefined,
              maxHeight: isMobile ? "100vh" : "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#0f2d6e",
                color: "#fff",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: isMobile ? 0 : "20px 20px 0 0",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800 }}>{t("studentResults")}</div>
              <button
                onClick={() => setProfileIndexNo(null)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                x
              </button>
            </div>
            <StudentProfilePage indexNo={profileIndexNo} onBack={() => setProfileIndexNo(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
