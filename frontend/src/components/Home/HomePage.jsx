import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API } from "../../api";
import { DEFAULT_SCHOOL } from "../../utils/constants";
import { normalizeSchoolSettings } from "../../utils/schoolSettings";
import { useViewport } from "../../utils/useViewport";
import { StudentProfilePage } from "../StudentProfilePage";
import { useI18n } from "../../i18n";
import { LanguageToggle } from "../LanguageToggle";
import { HeroSlider } from "./HeroSlider";
import { QuickCard } from "./QuickCard";
import { AnnouncementRow } from "./AnnouncementRow";
import { CategoryChip, FeatureChip } from "./Chips";
import { MiniBarChart } from "./MiniBarChart";
import { HomeIcon } from "./HomeIcons";
import "./Home.css";

const DEFAULT_HERO_SLIDES = [
  {
    id: "hero-1",
    imageSrc: "/asset/slider1.png",
    badge: "Live Portal Overview",
    badgeSw: "Muhtasari Hai wa Tovuti",
    title: "Academic Results Made Simple",
    titleSw: "Matokeo ya Taaluma Yamefanywa Rahisi",
    description: "Get instant access to school results, announcements, and academic performance updates.",
    descriptionSw: "Pata matokeo ya shule, matangazo, na taarifa za maendeleo ya kitaaluma kwa haraka.",
    primaryAction: "results",
    secondaryAction: "login",
    backgroundPosition: "center",
  },
  {
    id: "hero-2",
    imageSrc: "/asset/slider2.png",
    badge: "Published Classes",
    badgeSw: "Madarasa Yaliyochapishwa",
    title: "Track School Performance With Confidence",
    titleSw: "Fuatilia Utendaji wa Shule Kwa Uhakika",
    description: "Monitor classes, published results, and active academic sessions from one secure portal.",
    descriptionSw: "Fuatilia madarasa, matokeo yaliyochapishwa, na vipindi vya masomo kutoka tovuti moja salama.",
    primaryAction: "announcements",
    secondaryAction: "results",
    backgroundPosition: "center",
  },
  {
    id: "hero-3",
    imageSrc: "/asset/slider3.png",
    badge: "School Support",
    badgeSw: "Msaada wa Shule",
    title: "Stay Connected With Students, Parents, and Staff",
    titleSw: "Baki Umeunganishwa na Wanafunzi, Wazazi, na Watumishi",
    description: "Use the portal to search results quickly and guide families through official school updates.",
    descriptionSw: "Tumia tovuti kutafuta matokeo kwa haraka na kuongoza familia kupitia taarifa rasmi za shule.",
    primaryAction: "login",
    secondaryAction: "contact",
    backgroundPosition: "center",
  },
];

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
    slides: DEFAULT_HERO_SLIDES,
  };
}

function resolveHeroText(slide, language, enKey, swKey) {
  if (!slide) return "";
  if (language === "sw") return slide[swKey] || slide[enKey] || "";
  return slide[enKey] || slide[swKey] || "";
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
      icon: "results",
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
      icon: "performance",
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
      icon: "timetable",
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
      icon: "announcements",
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
      icon: "reports",
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
      icon: "login",
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
    { key: "students", icon: "students", value: Number(stats.totalStudents || 0).toLocaleString(), label: t("totalStudents") },
    { key: "classes", icon: "classes", value: String(stats.totalClasses || 0), label: t("activeClasses") },
    { key: "exam", icon: "exam", value: latestExamLabel || t("noExamYet"), label: t("latestExam") },
    { key: "published", icon: "published", value: String(stats.publishedClasses || 0), label: t("publishedClasses") },
    { key: "forms", icon: "forms", value: String(stats.activeForms || 0), label: t("activeForms") },
    { key: "monthly", icon: "monthly", value: String(stats.monthlyExamCount || 0), label: t("monthlyExams") },
  ];
}

function SchoolCrest({ size = 40 }) {
  return (
    <img
      src="/asset/bonde.png"
      alt="BONDE Secondary School Logo"
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: 4 }}
    />
  );
}

export function HomePage({ onOpenLogin, onOpenTerms, onOpenPrivacy }) {
  const { language, t } = useI18n();
  const fallbackOverview = useMemo(() => createFallbackOverview(t), [t]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchAdmission, setSearchAdmission] = useState("");
  const [searchForm, setSearchForm] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [profileIndexNo, setProfileIndexNo] = useState(null);
  const [homepageData, setHomepageData] = useState(fallbackOverview);
  const [homepageStatus, setHomepageStatus] = useState("loading");
  const [schoolSettings, setSchoolSettings] = useState(DEFAULT_SCHOOL);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
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

  useEffect(() => {
    let active = true;
    API.getSchoolSettings()
      .then((settings) => {
        if (!active) return;
        setSchoolSettings(normalizeSchoolSettings(settings));
      })
      .catch(() => {
        if (!active) return;
        setSchoolSettings(DEFAULT_SCHOOL);
      });
    return () => {
      active = false;
    };
  }, []);

  // Body scroll lock when profile is open
  useEffect(() => {
    if (profileIndexNo) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [profileIndexNo]);

  const resolvedHeroSlides = useMemo(() => {
    const source = Array.isArray(homepageData?.slides) && homepageData.slides.length
      ? homepageData.slides
      : DEFAULT_HERO_SLIDES;
    return source.slice(0, 3).map((slide, index) => ({
      ...DEFAULT_HERO_SLIDES[index % DEFAULT_HERO_SLIDES.length],
      ...slide,
    }));
  }, [homepageData?.slides]);

  useEffect(() => {
    if (resolvedHeroSlides.length <= 1) return undefined;
    const interval = window.setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % resolvedHeroSlides.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [resolvedHeroSlides]);

  useEffect(() => {
    if (currentHeroIndex >= resolvedHeroSlides.length) {
      setCurrentHeroIndex(0);
    }
  }, [currentHeroIndex, resolvedHeroSlides.length]);

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

  const runHeroAction = useCallback((action) => {
    switch (action) {
      case "login":
        onOpenLogin?.();
        break;
      case "announcements":
        scrollToAnnouncements();
        break;
      case "contact":
        scrollToFooter();
        break;
      case "results":
      default:
        scrollToSearch();
        break;
    }
  }, [onOpenLogin, scrollToAnnouncements, scrollToFooter, scrollToSearch]);

  const getHeroActionLabel = useCallback((action) => {
    switch (action) {
      case "login":
        return t("loginButton");
      case "announcements":
        return t("announcements");
      case "contact":
        return t("contactUs");
      case "results":
      default:
        return t("checkResults");
    }
  }, [t]);

  const handleSearch = useCallback(async (e) => {
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
  }, [language, searchAdmission, searchForm, searchYear, t]);

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
  const currentHeroSlide = resolvedHeroSlides[currentHeroIndex] || DEFAULT_HERO_SLIDES[0];
  const heroBadge = resolveHeroText(currentHeroSlide, language, "badge", "badgeSw")
    || (homepageStatus === "loading"
      ? (language === "sw" ? "Inapakia Data za Tovuti" : "Loading Portal Data")
      : homepageStatus === "fallback"
      ? (language === "sw" ? "Muhtasari wa Tovuti" : "Portal Snapshot")
      : (language === "sw" ? "Muhtasari Hai wa Tovuti" : "Live Portal Overview"));
  const heroTitle = resolveHeroText(currentHeroSlide, language, "title", "titleSw")
    || (language === "sw" ? "Matokeo ya Taaluma Yamefanywa Rahisi" : "Academic Results Made Simple");
  const heroDescription = resolveHeroText(currentHeroSlide, language, "description", "descriptionSw")
    || t("getInstantResults");
  const navBg = "#0f2d6e";
  const isCompactScreen = isMobile || isTablet;
  
  const containerClass = `home-content-wrapper ${isMobile ? 'home-content-wrapper-mobile' : 'home-content-wrapper-desktop'}`;

  const categories = [
    { label: language === "sw" ? "Kidato I\nMatokeo" : "Form I\nResults", color: "#2563eb", bg: "#dbeafe", icon: "results" },
    { label: language === "sw" ? "Kidato II\nMatokeo" : "Form II\nResults", color: "#2563eb", bg: "#dbeafe", icon: "results" },
    { label: language === "sw" ? "Kidato III\nMatokeo" : "Form III\nResults", color: "#2563eb", bg: "#dbeafe", icon: "results" },
    { label: language === "sw" ? "Kidato IV\nMatokeo" : "Form IV\nResults", color: "#2563eb", bg: "#dbeafe", icon: "results" },
    { label: language === "sw" ? "Mtihani wa\nMuhula" : "Terminal\nExams", color: "#dc2626", bg: "#fee2e2", icon: "exam" },
    { label: language === "sw" ? "Mitihani ya\nKati" : "Midterm\nExams", color: "#dc2626", bg: "#fee2e2", icon: "monthly" },
    { label: language === "sw" ? "Mitihani ya\nMwisho" : "Annual\nExams", color: "#7c3aed", bg: "#ede9fe", icon: "reports" },
    { label: language === "sw" ? "Mitihani ya\nMock" : "Mock\nExams", color: "#0891b2", bg: "#cffafe", icon: "timetable" },
  ];

  const features = [
    { bg: "#dbeafe", label: language === "sw" ? "Ufikiaji\nSalama" : "Secure\nAccess", icon: "secure" },
    { bg: "#d1fae5", label: language === "sw" ? "Ukaguzi wa\nMatokeo Haraka" : "Fast Results\nChecking", icon: "search" },
    { bg: "#ede9fe", label: language === "sw" ? "Inaendana na\nSimu" : "Mobile\nResponsive", icon: "mobile" },
    { bg: "#fef3c7", label: language === "sw" ? "Upakuaji Rahisi\nwa Ripoti" : "Easy Report\nDownload", icon: "download" },
    { bg: "#d1fae5", label: language === "sw" ? "Ufuatiliaji wa\nUtendaji" : "Performance\nTracking", icon: "performance" },
    { bg: "#fee2e2", label: language === "sw" ? "Taarifa Mahali\nPamoja" : "Notices in\nOne Place", icon: "announcements" },
  ];

  return (
    <div className="home-container">
      <nav className="home-nav-shell" style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <div className={containerClass} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? 60 : 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SchoolCrest size={isMobile ? 36 : 44} />
            <div>
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 800, color: navBg, letterSpacing: 0.3, lineHeight: 1.2 }}>BONDE SECONDARY SCHOOL</div>
              <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: "#1ea4b8", letterSpacing: 1, textTransform: "uppercase" }}>{t("resultSystem")}</div>
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
                <span key={label} onClick={action} className={`home-nav-link ${label === t("home") ? "active" : ""}`}>
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
                className="home-mobile-toggle"
                style={{ cursor: "pointer", fontSize: 18, padding: 0 }}
                aria-label={t("menu")}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? "x" : "="}
              </button>
            )}
          </div>
        </div>

        {!isDesktop && mobileMenuOpen && (
          <>
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: "fixed",
                inset: `${isMobile ? 60 : 68}px 0 0`,
                background: "rgba(7, 18, 40, 0.18)",
                backdropFilter: "blur(2px)",
                zIndex: 101,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: isMobile ? 16 : 24,
                width: "min(320px, calc(100vw - 32px))",
                zIndex: 102,
              }}
            >
              <div className="landing-mobile-menu">
                {[
                  { label: t("home"), meta: t("start"), action: scrollToTop },
                  { label: t("results"), meta: t("portal"), action: scrollToSearch },
                  { label: t("notices"), meta: t("updates"), action: scrollToAnnouncements },
                  { label: t("aboutUs"), meta: t("school"), action: scrollToFooter },
                  { label: t("contactUs"), meta: t("support"), action: scrollToFooter },
                ].map(({ label, meta, action }) => (
                  <button
                    key={label}
                    className="landing-mobile-link"
                    onClick={() => {
                      action();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span className="landing-mobile-link-label">
                      <span className="landing-mobile-link-title">{label}</span>
                      <span className="landing-mobile-link-meta">{meta}</span>
                    </span>
                    <span className="landing-mobile-link-arrow">{">"}</span>
                  </button>
                ))}
                <button
                  className="landing-mobile-login"
                  onClick={() => {
                    onOpenLogin?.();
                    setMobileMenuOpen(false);
                  }}
                >
                  {t("loginButton")}
                </button>
              </div>
            </div>
          </>
        )}
      </nav>

      <section
        className="home-hero-shell"
        style={{
          padding: isMobile ? "32px 0 36px" : "56px 0 64px",
          position: "relative",
        }}
      >
        <HeroSlider slides={resolvedHeroSlides} currentIndex={currentHeroIndex} onSelect={setCurrentHeroIndex} />
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none", zIndex: 2 }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none", zIndex: 2 }} />

        <div
          className={containerClass}
          style={{
            display: isDesktop ? "grid" : "flex",
            gridTemplateColumns: isDesktop ? "1fr 340px" : undefined,
            flexDirection: isDesktop ? undefined : "column",
            gap: isMobile ? 28 : 40,
            alignItems: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div style={{ color: "#fff" }}>
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 999, padding: "5px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, marginBottom: 18 }}>
              {heroBadge}
            </div>
            <h1 className="home-serif-title" style={{ fontSize: isMobile ? 30 : 48, fontWeight: 700, lineHeight: 1.08, margin: "0 0 16px", letterSpacing: -0.8, maxWidth: 620 }}>
              {heroTitle}
            </h1>
            <p style={{ fontSize: isMobile ? 13 : 15, color: "rgba(255,255,255,0.82)", lineHeight: 1.8, marginBottom: 28, maxWidth: 500 }}>
              {heroDescription}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
              <button className="landing-btn-solid" onClick={() => runHeroAction(currentHeroSlide.primaryAction)}>
                {getHeroActionLabel(currentHeroSlide.primaryAction)}
              </button>
              <button className="landing-btn-outline" onClick={() => runHeroAction(currentHeroSlide.secondaryAction)}>
                {getHeroActionLabel(currentHeroSlide.secondaryAction)}
              </button>
            </div>

            <div className="home-hero-metrics" style={{ maxWidth: 620 }}>
              {[
                { label: t("totalStudents"), value: Number(stats.totalStudents || 0).toLocaleString() },
                { label: t("publishedClasses"), value: String(stats.publishedClasses || 0) },
                { label: t("activeForms"), value: String(stats.activeForms || 0) },
              ].map((metric) => (
                <div key={metric.label} className="home-hero-metric">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.10)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                      }}
                    >
                      <HomeIcon
                        name={
                          metric.label === t("totalStudents")
                            ? "students"
                            : metric.label === t("publishedClasses")
                              ? "published"
                              : "forms"
                        }
                        label={metric.label}
                        size={16}
                        color="#ffffff"
                      />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.74)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {metric.label}
                    </div>
                  </div>
                  <div style={{ fontSize: isMobile ? 23 : 28, fontWeight: 800, color: "#fff", marginTop: 6 }}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="home-hero-panel" style={{ borderRadius: 24, padding: isMobile ? "18px 16px" : "22px 20px", width: "100%" }}>
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
                <div style={{ fontSize: 10, color: "#92400e", fontWeight: 600, marginBottom: 3 }}>{t("publishedClassesLabel")}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1a2040" }}>{stats.publishedClasses || 0}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{formatCount(stats.publishedStudents, "searchable student", "wanafunzi wanaotafutika", language)}</div>
              </div>
              <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#5b21b6", fontWeight: 600, marginBottom: 3 }}>{t("averageClassSizeLabel")}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1a2040" }}>{stats.averageClassSize || 0}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{formatCount(stats.monthlyExamCount, "monthly exam", "mitihani ya kila mwezi", language)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={searchSectionRef} style={{ padding: isMobile ? "28px 0" : "38px 0" }}>
        <div className={containerClass}>
          <div className="glass-panel" style={{ borderRadius: 24, padding: isMobile ? "20px 16px" : "28px 28px" }}>
            <div className="home-section-header" style={{ marginBottom: 14 }}>
              <div>
                <div className="home-section-kicker">{t("resultsDesk")}</div>
                <div className="home-section-title">{t("searchResultsHeading")}</div>
                <div className="home-section-copy">{t("searchInstructions")}</div>
              </div>
              {homepageStatus === "fallback" && (
                <span style={{ fontSize: 11, color: "#64748b" }}>{t("liveOverviewUnavailable")}</span>
              )}
            </div>

            <form onSubmit={handleSearch}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDesktop
                    ? "repeat(3, 1fr)"
                    : isXs
                    ? "1fr"
                    : isMobile || isTablet
                    ? "1fr 1fr"
                    : "repeat(3, 1fr)",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <input
                  type="search"
                  className="landing-search-input"
                  placeholder={t("admissionPlaceholder")}
                  value={searchAdmission}
                  onChange={(e) => setSearchAdmission(e.target.value)}
                />
                <select className="landing-search-input landing-search-select" value={searchForm} onChange={(e) => setSearchForm(e.target.value)}>
                  <option value="">{t("classFormAll")}</option>
                  {["Form I", "Form II", "Form III", "Form IV"].map((form) => (
                    <option key={form}>{form}</option>
                  ))}
                </select>
                <select className="landing-search-input landing-search-select" value={searchYear} onChange={(e) => setSearchYear(e.target.value)}>
                  <option value="">{t("yearAll")}</option>
                  {Array.from({ length: 5 }, (_, index) => currentYear - index).map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                </select>
              </div>

              {searchError && (
                <div style={{ fontSize: 12, color: "#b42318", fontWeight: 600, marginBottom: 10 }}>{searchError}</div>
              )}

              <button type="submit" disabled={searching} className="landing-btn-solid" style={{ width: "100%", padding: isMobile ? "14px 0" : "15px 0" }}>
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
                  <button
                    type="button"
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
                      textAlign: "left",
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
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "8px 0 28px" : "8px 0 34px" }}>
        <div className={containerClass}>
          <div className="home-section-header">
            <div>
              <div className="home-section-kicker">{t("fastRoutes")}</div>
              <div className="home-section-title">{t("quickAccess")}</div>
            </div>
            <button
              type="button"
              onClick={scrollToSearch}
              className="home-link-inline"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {t("viewAll")}
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isXs ? "1fr" : isMobile || isTablet ? "1fr 1fr" : "repeat(3, 1fr)",
              gap: isMobile ? 10 : 14,
            }}
          >
            {quickAccess.map((item) => (
              <QuickCard key={item.id} {...item} featured={item.id === "results"} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "8px 0 28px" : "8px 0 34px" }}>
        <div className={containerClass}>
          <div className="home-section-header">
            <div>
              <div className="home-section-kicker">{t("performanceSnapshot")}</div>
              <div className="home-section-title">{t("portalHighlights")}</div>
            </div>
          </div>
          <div
            className="glass-panel"
            style={{
              borderRadius: 22,
              overflow: "hidden",
            }}
          >
            <div className="home-highlight-grid">
            {performanceStats.map((stat, index) => (
              <div
                key={stat.key || `${stat.label}-${index}`}
                className="home-highlight-cell"
                style={{
                  borderBottom:
                    isCompactScreen && index < performanceStats.length - 2
                      ? "1px solid rgba(241, 245, 249, 0.9)"
                      : undefined,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    margin: "0 auto 10px",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,244,251,0.96))",
                    border: "1px solid rgba(214, 224, 237, 0.9)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#173b74",
                  }}
                >
                  <HomeIcon name={stat.icon} label={stat.label} size={18} />
                </div>
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
        </div>
      </section>

      <section ref={announcementsSectionRef} style={{ padding: isMobile ? "8px 0 28px" : "8px 0 34px" }}>
        <div className={containerClass}>
          <div className="home-section-header">
            <div>
              <div className="home-section-kicker">{t("updates")}</div>
              <div className="home-section-title">{t("recentAnnouncements")}</div>
            </div>
            <button
              type="button"
              onClick={scrollToAnnouncements}
              className="home-link-inline"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {t("viewAll")}
            </button>
          </div>
          <div className="glass-panel" style={{ borderRadius: 22, overflow: "hidden" }}>
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

      <section style={{ padding: isMobile ? "8px 0 28px" : "8px 0 34px" }}>
        <div className={containerClass}>
          <div className="home-section-header">
            <div>
              <div className="home-section-kicker">{t("explore")}</div>
              <div className="home-section-title">{t("resultsCategories")}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isXs ? "repeat(2, minmax(0, 1fr))" : isCompactScreen ? "repeat(4, minmax(0, 1fr))" : "repeat(8, minmax(0, 1fr))", gap: 10 }}>
            {categories.map((category) => (
              <CategoryChip key={category.label} {...category} onClick={() => handleCategoryClick(category.label)} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "8px 0 32px" : "8px 0 42px" }}>
        <div className={containerClass}>
          <div className="home-section-header">
            <div>
              <div className="home-section-kicker">{t("whyBondePortal")}</div>
              <div className="home-section-title">{t("whyUseSystem")}</div>
            </div>
          </div>
          <div
            className="glass-panel"
            style={{
              borderRadius: 22,
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

      <footer ref={footerRef} className="home-footer-shell" style={{ color: "#fff", padding: isMobile ? "32px 0 0" : "52px 0 0" }}>
        <div
          className={containerClass}
          style={{
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
              {schoolSettings.district},
              <br />
              {schoolSettings.postal}
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
              { label: language === "sw" ? "Masharti" : "Terms", action: onOpenTerms },
              { label: language === "sw" ? "Faragha" : "Privacy", action: onOpenPrivacy },
            ].map(({ label, action }) => (
              <button
                type="button"
                key={label}
                onClick={action}
                style={{
                  display: "block",
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.65)",
                  marginBottom: 8,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>{t("contactUs")}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Phone</span> {schoolSettings.headmasterPhone}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Email</span> {schoolSettings.email}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>Office</span> {schoolSettings.address}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", padding: "16px 0", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
            <button
              type="button"
              onClick={onOpenTerms}
              style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: "rgba(255,255,255,0.62)", cursor: "pointer" }}
            >
              {language === "sw" ? "Masharti ya Matumizi" : "Terms of Use"}
            </button>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>|</span>
            <button
              type="button"
              onClick={onOpenPrivacy}
              style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: "rgba(255,255,255,0.62)", cursor: "pointer" }}
            >
              {language === "sw" ? "Sera ya Faragha" : "Privacy Policy"}
            </button>
          </div>
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
