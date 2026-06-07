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
import { MiniBarChart } from "./MiniBarChart";
import { HomeIcon } from "./HomeIcons";
import "./Home.css";

const DEFAULT_HERO_SLIDES = [
  {
    id: "hero-1",
    imageSrc: "/asset/nembobonde.jpg",
    badge: "School Motto",
    badgeSw: "Kauli Mbiu ya Shule",
    title: "Better future starts Here",
    titleSw: "Future bora huanza hapa",
    description: "Bonde Secondary School",
    descriptionSw: "Shule ya Sekondari Bonde",
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

function formatContactPhones(primaryPhone, phoneList = []) {
  return Array.from(
    new Set(
      [primaryPhone, ...(Array.isArray(phoneList) ? phoneList : [])]
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    )
  ).join(" / ");
}

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
      bg: "#dcfce7",
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
      bg: "#d1fae5",
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
      bg: "#fef9c3",
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

export function HomePage({ onOpenLogin, onOpenTerms, onOpenPrivacy, onOpenSchool }) {
  const { language, t } = useI18n();
  const fallbackOverview = useMemo(() => createFallbackOverview(t), [t]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchAdmission, setSearchAdmission] = useState("");
  const [searchForm, setSearchForm] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [profileStudentRef, setProfileStudentRef] = useState(null);
  const [homepageData, setHomepageData] = useState(fallbackOverview);
  const [homepageStatus, setHomepageStatus] = useState("loading");
  const [schoolSettings, setSchoolSettings] = useState(DEFAULT_SCHOOL);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const { isXs, isMobile, isTablet, isDesktop, isShort } = useViewport();
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
    if (profileStudentRef) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [profileStudentRef]);

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
    setProfileStudentRef(null);

    try {
      const opts = {};
      if (searchForm) opts.form = searchForm;
      if (searchYear) opts.year = searchYear;
      const results = await API.searchStudents(searchAdmission.trim(), opts);
      if (results.length === 0) {
        setSearchError(t("noResultsFound"));
      } else if (results.length === 1) {
        setProfileStudentRef({
          admissionNo: String(results[0].admissionNo || "").trim().toUpperCase(),
          indexNo: String(results[0].indexNo || "").trim(),
          classId: String(results[0].classId || "").trim(),
          studentId: String(results[0].studentId || "").trim(),
        });
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      setSearchError(err.message || t("searchFailed"));
    } finally {
      setSearching(false);
    }
  }, [language, searchAdmission, searchForm, searchYear, t]);

  const currentYear = new Date().getFullYear();
  const stats = homepageData?.stats || fallbackOverview.stats;
  const latestKnownYear = Math.max(
    currentYear,
    Number(stats.latestYear || 0) || 0
  );
  const searchYearOptions = Array.from({ length: 10 }, (_, index) => String(latestKnownYear - index));
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
  const navBg = "#0a3d2b";
  const isCompactScreen = isMobile || isTablet;
  const shortExamLabel = stats.latestExamLabel
    ? String(stats.latestExamLabel).replace(/\s+20\d{2}$/, "").trim()
    : t("noExamYet");
  const compactHero = isMobile;
  const heroSignals = [
    {
      label: stats.publishedClasses > 0 ? t("publishedClassesLabel") : t("activeForms"),
      value: stats.publishedClasses > 0 ? String(stats.publishedClasses || 0) : String(stats.activeForms || 0),
      note:
        stats.publishedClasses > 0
          ? formatCount(stats.publishedStudents, "searchable student", "wanafunzi wanaotafutika", language)
          : formatCount(stats.totalStudents, "indexed student", "wanafunzi waliopo", language),
    },
    {
      label: t("latestExam"),
      value: shortExamLabel,
      note: latestExamLabel || t("noExamYet"),
    },
    {
      label: t("totalStudents"),
      value: Number(stats.totalStudents || 0).toLocaleString(),
      note: `${stats.totalClasses || 0} ${language === "sw" ? "madarasa hai" : "active classes"}`,
    },
  ];
  const summaryHighlights = performanceStats.slice(0, 4);
  const routeCards = [quickAccess[0], quickAccess[2], quickAccess[5], quickAccess[3]].filter(Boolean);
  
  const containerClass = `home-content-wrapper ${isMobile ? 'home-content-wrapper-mobile' : 'home-content-wrapper-desktop'}`;
  const headmasterPhonesDisplay = formatContactPhones(
    schoolSettings.headmasterPhone,
    schoolSettings.headmasterPhones
  );

  const schoolOverviewCards = [
    {
      key: "identity",
      icon: "secure",
      title: language === "sw" ? "Utambulisho wa Shule" : "School Identity",
      value: language === "sw" ? "Better future starts here" : "Better future starts here",
      description:
        language === "sw"
          ? "Kauli mbiu ya Bonde inaelekeza nidhamu, uongozi, na mafanikio ya kitaaluma."
          : "Bonde's motto anchors discipline, leadership, and academic growth.",
    },
    {
      key: "coverage",
      icon: "classes",
      title: language === "sw" ? "Uenezi wa Mfumo" : "Portal Coverage",
      value:
        language === "sw"
          ? `${stats.totalClasses || 0} madarasa`
          : `${stats.totalClasses || 0} active classes`,
      description:
        language === "sw"
          ? `${stats.activeForms || 0} vidato vinafuatiliwa kwa matokeo, taarifa, na ripoti.`
          : `${stats.activeForms || 0} forms are tracked for results, notices, and reports.`,
    },
    {
      key: "access",
      icon: "announcements",
      title: language === "sw" ? "Mawasiliano ya Umma" : "Public Access",
      value:
        stats.publishedClasses > 0
          ? language === "sw"
            ? `${stats.publishedStudents || 0} wanafunzi wanaotafutika`
            : `${stats.publishedStudents || 0} searchable students`
          : language === "sw"
          ? "Taarifa za shule"
          : "School notices live",
      description:
        stats.publishedClasses > 0
          ? language === "sw"
            ? `Matokeo ya madarasa ${stats.publishedClasses} yamefunguliwa kwa utafutaji wa umma.`
            : `Results for ${stats.publishedClasses} classes are open for public search.`
          : language === "sw"
          ? "Tovuti iko tayari kupokea matokeo pindi uchapishaji unapofanyika."
          : "The portal is ready to expose results once publishing is completed.",
    },
  ];
  const leadershipPillars = [
    {
      key: "discipline",
      title: language === "sw" ? "Nidhamu na Uongozi" : "Discipline and Leadership",
      description:
        language === "sw"
          ? "Mazingira ya shule yanajengwa juu ya uwajibikaji, heshima, na mwenendo unaoandaa wanafunzi kwa maisha ya baadaye."
          : "The school culture is built on accountability, respect, and habits that prepare learners for life beyond the classroom.",
    },
    {
      key: "tracking",
      title: language === "sw" ? "Ufuatiliaji wa Kielimu" : "Academic Monitoring",
      description:
        language === "sw"
          ? "Mitihani, taarifa, na maoni huunganishwa ili shule, wazazi, na wanafunzi wawe na picha wazi ya maendeleo."
          : "Exams, notices, and reporting are connected so the school, parents, and students share a clear picture of progress.",
    },
    {
      key: "communication",
      title: language === "sw" ? "Mawasiliano ya Familia" : "Family Communication",
      description:
        language === "sw"
          ? "Tovuti inasaidia mawasiliano rasmi kati ya shule na familia bila kuchanganya kazi za umma na za ndani."
          : "The website supports official communication between the school and families without mixing public and internal workflows.",
    },
  ];
  const academicPathways = [
    {
      key: "forms",
      eyebrow: language === "sw" ? "Muundo wa Kidato" : "Form Structure",
      title:
        language === "sw"
          ? `${stats.activeForms || 0} vidato vinafuatiliwa kwa taarifa na matokeo`
          : `${stats.activeForms || 0} forms are tracked for reporting and results`,
      description:
        language === "sw"
          ? "Muundo wa vidato na madarasa unaonekana wazi kwa ufuatiliaji wa kitaaluma na usimamizi wa shule."
          : "The form and stream structure is organized clearly for academic oversight and school management.",
    },
    {
      key: "exams",
      eyebrow: language === "sw" ? "Mzunguko wa Mitihani" : "Exam Cycle",
      title:
        latestExamLabel || (language === "sw" ? "Mitihani ya sasa" : "Current exam session"),
      description:
        language === "sw"
          ? "Matokeo yanachapishwa kwa utaratibu rasmi baada ya uhakiki, ili taarifa za umma ziwe sahihi na salama."
          : "Results are released through a formal review flow so public academic records stay accurate and controlled.",
    },
    {
      key: "portal",
      eyebrow: language === "sw" ? "Ufikiaji wa Matokeo" : "Results Access",
      title:
        stats.publishedClasses > 0
          ? language === "sw"
            ? `${stats.publishedStudents || 0} wanafunzi wanaweza kutafutwa`
            : `${stats.publishedStudents || 0} students are searchable`
          : language === "sw"
          ? "Matokeo yataonekana baada ya kuchapishwa"
          : "Results appear once classes are published",
      description:
        language === "sw"
          ? "Sehemu ya matokeo inabaki rahisi kwa wazazi na wanafunzi bila kubeba mzigo wa dashibodi nzima ya shule."
          : "The public results desk stays simple for families while the heavier school operations remain in the secure portal.",
    },
  ];
  const communitySignals = [
    {
      key: "care",
      title: language === "sw" ? "Malezi na Mwelekeo" : "Guidance and Care",
      copy:
        language === "sw"
          ? "Wanafunzi wanahitaji mazingira yanayowalea kiakili, kitabia, na kijamii pamoja na masomo."
          : "Students need an environment that develops them academically, socially, and in character.",
    },
    {
      key: "notice",
      title: language === "sw" ? "Taarifa Rasmi" : "Official Notices",
      copy:
        language === "sw"
          ? "Taarifa za shule, kalenda, na matangazo ya mitihani zinapaswa kupatikana kwa urahisi kutoka ukurasa wa mwanzo."
          : "School notices, calendars, and exam updates should be easy to reach directly from the homepage.",
    },
    {
      key: "trust",
      title: language === "sw" ? "Uaminifu wa Umma" : "Public Trust",
      copy:
        language === "sw"
          ? "Muundo wa tovuti unapaswa kuonyesha shule inayoaminika, si programu yenye vipengele vingi visivyopangwa."
          : "The website should project a trustworthy school institution, not a feature-heavy software surface.",
    },
  ];

  const supportActions = [
    {
      key: "results",
      title: t("checkResults"),
      description:
        language === "sw"
          ? "Tafuta kwa namba ya kujiunga au jina la mwanafunzi kuona matokeo rasmi."
          : "Search by admission number or student name to access official results.",
      action: scrollToSearch,
    },
    {
      key: "school",
      title: t("aboutUs"),
      description:
        language === "sw"
          ? "Soma zaidi kuhusu shule, maadili yake, na huduma za wanafunzi."
          : "Learn more about the school, its values, and student services.",
      action: onOpenSchool || scrollToFooter,
    },
    {
      key: "contact",
      title: t("contactUs"),
      description:
        language === "sw"
          ? "Pata namba za ofisi na mawasiliano rasmi ya shule."
          : "Get the school office numbers and official contact channels.",
      action: scrollToFooter,
    },
  ];

  return (
    <div className="home-container">
      <nav className="home-nav-shell" style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <div className={containerClass} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? 60 : 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SchoolCrest size={isMobile ? 36 : 44} />
            <div>
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 800, color: navBg, letterSpacing: "0.04em", lineHeight: 1.2 }}>BONDE SECONDARY SCHOOL</div>
              <div style={{ fontSize: isMobile ? 10 : 10, fontWeight: 700, color: "#d97706", letterSpacing: "0.10em", textTransform: "uppercase" }}>{t("resultSystem")}</div>
            </div>
          </div>

          {isDesktop && (
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {[
                { label: t("home"), action: scrollToTop },
                { label: t("results"), action: scrollToSearch },
                { label: t("notices"), action: scrollToAnnouncements },
                { label: t("aboutUs"), action: onOpenSchool || scrollToFooter },
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
                style={{ background: navBg, color: "#fff", border: "none", borderRadius: 10, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(10,61,43,0.22)" }}
              >
                {t("loginButton")}
              </button>
            ) : (
              <button
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="home-mobile-toggle"
                style={{ cursor: "pointer", padding: 0 }}
                aria-label={t("menu")}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
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
                background: "rgba(5, 46, 22, 0.22)",
                backdropFilter: "blur(3px)",
                zIndex: 101,
                animation: "fadeInOverlay 0.18s ease forwards",
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
              <div className="landing-mobile-menu landing-mobile-menu-enter">
                {[
                  { label: t("home"), meta: t("start"), action: scrollToTop },
                  { label: t("results"), meta: t("portal"), action: scrollToSearch },
                  { label: t("notices"), meta: t("updates"), action: scrollToAnnouncements },
                  { label: t("aboutUs"), meta: t("school"), action: onOpenSchool || scrollToFooter },
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
          padding: isMobile ? (isShort ? "18px 0 22px" : "22px 0 28px") : "58px 0 72px",
          position: "relative",
        }}
      >
        <HeroSlider slides={resolvedHeroSlides} currentIndex={currentHeroIndex} onSelect={setCurrentHeroIndex} />
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none", zIndex: 2 }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none", zIndex: 2 }} />

        <div
          className={containerClass}
          style={{
            display: "grid",
            gridTemplateColumns: isDesktop
              ? "minmax(0, 1.12fr) minmax(300px, 0.88fr)"
              : isMobile
              ? "1fr"
              : "1fr",
            gap: isMobile ? 16 : 42,
            alignItems: compactHero ? "start" : "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div style={{ color: "#fff", minWidth: 0 }}>
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 999, padding: compactHero ? "5px 12px" : "6px 14px", fontSize: isMobile ? 11 : 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: compactHero ? 12 : 18 }}>
              {heroBadge}
            </div>
            <h1 className="home-serif-title" style={{ fontSize: isMobile ? (isXs ? 26 : 32) : 56, fontWeight: 700, lineHeight: compactHero ? 1.02 : 1.04, margin: compactHero ? "0 0 12px" : "0 0 18px", letterSpacing: -1, maxWidth: compactHero ? 360 : 700 }}>
              {heroTitle}
            </h1>
            <p style={{ fontSize: isMobile ? 13 : 16, color: "rgba(255,255,255,0.82)", lineHeight: compactHero ? 1.65 : 1.75, marginBottom: compactHero ? 16 : 28, maxWidth: compactHero ? 340 : 560 }}>
              {heroDescription}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: compactHero ? 10 : 12, marginBottom: compactHero ? 16 : 28 }}>
              <button className="landing-btn-solid" onClick={() => runHeroAction(currentHeroSlide.primaryAction)} style={compactHero ? { padding: "11px 18px", fontSize: 12 } : undefined}>
                {getHeroActionLabel(currentHeroSlide.primaryAction)}
              </button>
              <button className="landing-btn-outline" onClick={() => runHeroAction(currentHeroSlide.secondaryAction)} style={compactHero ? { padding: "10px 16px", fontSize: 12 } : undefined}>
                {getHeroActionLabel(currentHeroSlide.secondaryAction)}
              </button>
            </div>

            <div className="home-hero-metrics institutional" style={{ maxWidth: compactHero ? "100%" : 700 }}>
              {heroSignals.map((metric) => (
                <div key={metric.label} className="home-hero-metric institutional">
                  <div style={{ fontSize: compactHero ? 9 : isMobile ? 11 : 10, fontWeight: 800, color: "rgba(255,255,255,0.74)", textTransform: "uppercase", letterSpacing: "0.10em" }}>
                    {metric.label}
                  </div>
                  <div style={{ fontSize: compactHero ? 18 : isMobile ? 24 : 30, fontWeight: 900, color: "#fff", marginTop: compactHero ? 5 : 6, lineHeight: 1.08 }}>
                    {metric.value}
                  </div>
                  <div style={{ fontSize: compactHero ? 9 : 11, color: "rgba(255,255,255,0.62)", lineHeight: 1.5, marginTop: 4 }}>
                    {metric.note}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="home-hero-panel institutional" style={{ borderRadius: compactHero ? 20 : 24, padding: compactHero ? "16px 14px" : "24px 22px", width: "100%", alignSelf: "start" }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "inline-flex", alignSelf: "start", background: "#edf7ef", color: "#14532d", borderRadius: 999, padding: "5px 10px", fontSize: compactHero ? 10 : 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {language === "sw" ? "Muhtasari wa Bonde" : "Bonde at a Glance"}
              </div>
              <div style={{ fontSize: compactHero ? 22 : 28, fontWeight: 900, color: "#0f1c12", lineHeight: 1.08 }}>
                {language === "sw" ? "Shule ya umma yenye nidhamu, mawasiliano wazi, na ufuatiliaji wa matokeo." : "A public school built on discipline, clarity, and accountable academic reporting."}
              </div>
              <div style={{ fontSize: compactHero ? 12 : 13, color: "#5b6f64", lineHeight: 1.7 }}>
                {language === "sw"
                  ? "Ukurasa huu unaleta pamoja maelezo ya shule, taarifa rasmi, na njia salama ya kufikia matokeo yaliyopitishwa."
                  : "This homepage brings together school identity, official notices, and a safe route to published academic results."}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
              <div className="home-data-chip">
                <div className="home-data-chip-label">{t("activeClasses")}</div>
                <div className="home-data-chip-value">{stats.totalClasses || 0}</div>
              </div>
              <div className="home-data-chip">
                <div className="home-data-chip-label">{t("averageClassSizeLabel")}</div>
                <div className="home-data-chip-value">{stats.averageClassSize || 0}</div>
              </div>
            </div>

            {!compactHero && chartBars.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#5b6f64", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t("studentsByForm")}
                </div>
                <MiniBarChart bars={chartBars} />
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "26px 0 12px" : "40px 0 18px" }}>
        <div className={containerClass}>
          <div className="home-school-story glass-panel" style={{ borderRadius: 30, padding: isMobile ? "22px 18px" : "30px 30px" }}>
            <div>
              <div className="home-section-kicker">{language === "sw" ? "Kuhusu Bonde" : "About Bonde"}</div>
              <div className="home-section-title">
                {language === "sw" ? "Ukurasa wa shule unapaswa kueleza taasisi, sio kuonekana kama dashibodi ya mfumo." : "The school homepage should explain the institution, not read like a software dashboard."}
              </div>
              <div className="home-section-copy" style={{ maxWidth: 620, marginTop: 12 }}>
                {language === "sw"
                  ? "Bonde Secondary School ni taasisi ya umma inayolenga nidhamu, utendaji wa kitaaluma, na mawasiliano ya wazi kati ya shule, wanafunzi, na wazazi. Hivyo tovuti ya mwanzo inapaswa kujenga uaminifu, kueleza shule, na kuelekeza wageni kwenye huduma muhimu."
                  : "Bonde Secondary School is a public institution focused on discipline, academic performance, and clear communication between the school, students, and guardians. The homepage should build trust first, explain the school clearly, and guide visitors to key services."}
              </div>
            </div>

            <div className="home-overview-grid institutional">
              {schoolOverviewCards.map((card) => (
                <div key={card.key} className="home-overview-card glass-card institutional">
                  <div className="home-overview-icon">
                    <HomeIcon name={card.icon} label={card.title} size={18} />
                  </div>
                  <div className="home-overview-title">{card.title}</div>
                  <div className="home-overview-value">{card.value}</div>
                  <div className="home-overview-copy">{card.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "8px 0 20px" : "10px 0 28px" }}>
        <div className={containerClass}>
          <div className="home-leadership-band">
            <div className="home-leadership-message glass-panel" style={{ borderRadius: 28, padding: isMobile ? "22px 18px" : "28px 28px" }}>
              <div className="home-section-kicker">{language === "sw" ? "Uongozi wa Shule" : "School Leadership"}</div>
              <div className="home-section-title">
                {language === "sw"
                  ? "Uongozi wa shule unapaswa kuonekana kama dira ya nidhamu, matokeo, na uwazi."
                  : "School leadership should appear as a guide for discipline, results, and accountability."}
              </div>
              <div className="home-section-copy" style={{ marginTop: 10, maxWidth: 620 }}>
                {language === "sw"
                  ? `Bonde inaongozwa chini ya ${schoolSettings.authority || "uongozi wa shule"} kwa msisitizo wa maendeleo ya mwanafunzi, utendaji wa kitaaluma, na mawasiliano rasmi na familia.`
                  : `Bonde operates under ${schoolSettings.authority || "school leadership"} with an emphasis on student development, academic performance, and formal communication with families.`}
              </div>
              <div className="home-leadership-signoff">
                <div className="home-leadership-signoff-name">
                  {language === "sw" ? "Ofisi ya Mkuu wa Shule" : "Headmaster's Office"}
                </div>
                <div className="home-leadership-signoff-meta">
                  {headmasterPhonesDisplay || schoolSettings.email}
                </div>
              </div>
            </div>

            <div className="home-leadership-grid">
              {leadershipPillars.map((item) => (
                <div key={item.key} className="home-editorial-card glass-card">
                  <div className="home-editorial-card-title">{item.title}</div>
                  <div className="home-editorial-card-copy">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "8px 0 20px" : "8px 0 28px" }}>
        <div className={containerClass}>
          <div className="home-section-header">
            <div>
              <div className="home-section-kicker">{language === "sw" ? "Mwelekeo wa Kielimu" : "Academic Pathways"}</div>
              <div className="home-section-title">
                {language === "sw"
                  ? "Muundo wa shule unahitaji kuonyesha njia za kufuatilia maendeleo ya mwanafunzi."
                  : "The school structure should show how academic progress is guided and reported."}
              </div>
              <div className="home-section-copy" style={{ marginTop: 8 }}>
                {language === "sw"
                  ? "Badala ya kujaza tovuti kwa takwimu zisizoeleweka, sehemu hii inaonyesha kwa namna tulivu jinsi Bonde inavyopanga darasa, mitihani, na utoaji wa matokeo."
                  : "Instead of crowding the homepage with disconnected metrics, this section explains how Bonde organizes classes, exams, and published academic records."}
              </div>
            </div>
          </div>
          <div className="home-pathway-grid">
            {academicPathways.map((item) => (
              <div key={item.key} className="home-pathway-card glass-card">
                <div className="home-pathway-eyebrow">{item.eyebrow}</div>
                <div className="home-pathway-title">{item.title}</div>
                <div className="home-pathway-copy">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={searchSectionRef} style={{ padding: isMobile ? "28px 0" : "38px 0" }}>
        <div className={containerClass}>
          <div className="home-results-desk glass-panel" style={{ borderRadius: 28, padding: isMobile ? "20px 16px" : "30px 30px" }}>
            <div>
              <div className="home-section-kicker">{t("resultsDesk")}</div>
              <div className="home-section-title">{t("searchResultsHeading")}</div>
              <div className="home-section-copy" style={{ marginTop: 10 }}>
                {language === "sw"
                  ? "Matokeo ya umma yanaonekana hapa baada ya kuchapishwa rasmi na shule. Tafuta kwa namba ya kujiunga au jina, kisha chuja kwa kidato au mwaka kama inahitajika."
                  : "Published student results appear here once the school has formally released them. Search by admission number or student name, then narrow by form or year when needed."}
              </div>
              <div className="home-results-notes">
                <span className="home-results-note">{stats.publishedClasses > 0 ? t("publishedClassesLabel") : t("activeForms")}: {stats.publishedClasses > 0 ? stats.publishedClasses || 0 : stats.activeForms || 0}</span>
                <span className="home-results-note">{t("latestExam")}: {latestExamLabel || t("noExamYet")}</span>
                {homepageStatus === "fallback" && (
                  <span className="home-results-note subtle">{t("liveOverviewUnavailable")}</span>
                )}
              </div>
            </div>

            <div className="home-results-form-shell">
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
                    {searchYearOptions.map((year) => (
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
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0a3d2b", marginBottom: 10 }}>
                  {language === "sw"
                    ? `${searchResults.length} ${t("studentsFoundSelect")}`
                    : `${searchResults.length} student${searchResults.length !== 1 ? "s" : ""} found - select to view results:`}
                </div>
                {searchResults.map((result) => (
                  <button
                    type="button"
                    key={`${result.classId}-${result.id}`}
                    onClick={() =>
                      setProfileStudentRef({
                        admissionNo: String(result.admissionNo || "").trim().toUpperCase(),
                        indexNo: String(result.indexNo || "").trim(),
                        classId: String(result.classId || "").trim(),
                        studentId: String(result.studentId || "").trim(),
                      })
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1.5px solid #c8e6d0",
                      marginBottom: 8,
                      cursor: "pointer",
                      background: "#f0fdf4",
                      transition: "background 0.15s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#dcfce7";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f0fdf4";
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040" }}>{result.name}</div>
                      <div style={{ fontSize: isMobile ? 12 : 11, color: "#64748b", marginTop: 2 }}>
                        {result.admissionNo || result.indexNo} | {result.form} | {result.year}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, color: "#166534", fontWeight: 700 }}>{t("view")}</span>
                  </button>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "8px 0 28px" : "12px 0 34px" }}>
        <div className={containerClass}>
          <div className="home-section-header">
            <div>
              <div className="home-section-kicker">{language === "sw" ? "Njia Muhimu" : "Useful Routes"}</div>
              <div className="home-section-title">{language === "sw" ? "Njia za haraka kwa familia, wanafunzi, na watumishi." : "Fast routes for families, students, and staff."}</div>
              <div className="home-section-copy" style={{ marginTop: 8 }}>
                {language === "sw"
                  ? "Elekeza wageni kwenye matokeo, taarifa za mitihani, na mlango salama wa kuingia bila kuunda fujo ya kadi nyingi zisizo muhimu."
                  : "Guide visitors to results, exam updates, and secure portal access without filling the homepage with low-priority cards."}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isXs ? "1fr" : isMobile || isTablet ? "1fr 1fr" : "repeat(4, 1fr)",
              gap: isMobile ? 10 : 14,
            }}
          >
            {routeCards.map((item) => (
              <QuickCard key={item.id} {...item} featured={item.id === "results"} compact={isMobile} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "8px 0 28px" : "8px 0 34px" }}>
        <div className={containerClass}>
          <div className="home-community-band glass-panel" style={{ borderRadius: 28, padding: isMobile ? "22px 18px" : "28px 28px" }}>
            <div>
              <div className="home-section-kicker">{language === "sw" ? "Maisha ya Shule" : "School Life"}</div>
              <div className="home-section-title">
                {language === "sw"
                  ? "Tovuti ya shule inapaswa kuonyesha jamii ya kujifunza, si ukurasa wa matokeo pekee."
                  : "A school website should show a learning community, not only a results page."}
              </div>
              <div className="home-section-copy" style={{ marginTop: 10, maxWidth: 620 }}>
                {language === "sw"
                  ? "Bonde inahitaji kuonekana kama mazingira ya taaluma, malezi, taarifa za wazazi, na maendeleo ya wanafunzi kwa pamoja."
                  : "Bonde should feel like a place of academics, guidance, parent communication, and student growth all at once."}
              </div>
            </div>
            <div className="home-community-grid">
              {communitySignals.map((item) => (
                <div key={item.key} className="home-community-card">
                  <div className="home-community-title">{item.title}</div>
                  <div className="home-community-copy">{item.copy}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section ref={announcementsSectionRef} style={{ padding: isMobile ? "8px 0 28px" : "8px 0 34px" }}>
        <div className={containerClass}>
          <div className="home-signal-grid">
            <div>
              <div className="home-section-header">
                <div>
                  <div className="home-section-kicker">{language === "sw" ? "Picha ya Kiutendaji" : "Academic Snapshot"}</div>
                  <div className="home-section-title">{language === "sw" ? "Muhtasari wa utendaji na taarifa za shule." : "A compact view of performance and school updates."}</div>
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
                  {summaryHighlights.map((stat, index) => (
                    <div
                      key={stat.key || `${stat.label}-${index}`}
                      className="home-highlight-cell"
                      style={{
                        borderBottom:
                          isCompactScreen && index < summaryHighlights.length - 2
                            ? "1px solid rgba(241, 245, 249, 0.9)"
                            : undefined,
                      }}
                    >
                      <div
                        style={{
                          width: isMobile ? 36 : 42,
                          height: isMobile ? 36 : 42,
                          borderRadius: isMobile ? 12 : 14,
                          margin: "0 auto 10px",
                          background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,244,251,0.96))",
                          border: "1px solid rgba(214, 224, 237, 0.9)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#14532d",
                        }}
                      >
                        <HomeIcon name={stat.icon} label={stat.label} size={isMobile ? 16 : 18} />
                      </div>
                      <div style={{ fontSize: isMobile ? 13 : 18, fontWeight: 800, color: "#0a3d2b" }}>{stat.value}</div>
                      <div style={{ fontSize: isMobile ? 10 : 11, color: "#64748b", marginTop: 3, lineHeight: isMobile ? 1.35 : 1.45 }}>{stat.label}</div>
                      {stat.description && (
                        <div style={{ fontSize: isMobile ? 9 : 10, color: "#94a3b8", marginTop: isMobile ? 4 : 6, lineHeight: 1.45 }}>
                          {stat.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="home-section-header">
                <div>
                  <div className="home-section-kicker">{t("updates")}</div>
                  <div className="home-section-title">{t("recentAnnouncements")}</div>
                  <div className="home-section-copy" style={{ marginTop: 8 }}>
                    {language === "sw"
                      ? "Tangazo rasmi linapaswa kuwa rahisi kusoma na kupatikana haraka kutoka ukurasa wa mwanzo."
                      : "Official updates should be readable at a glance and easy to reach from the homepage."}
                  </div>
                </div>
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
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "10px 0 32px" : "14px 0 44px" }}>
        <div className={containerClass}>
          <div className="home-support-band glass-panel">
            <div>
              <div className="home-section-kicker">{language === "sw" ? "Msaada wa Wageni" : "Visitor Support"}</div>
              <div className="home-section-title">
                {language === "sw" ? "Wageni wanahitaji matokeo, maelekezo, na mawasiliano wazi." : "Visitors need results, direction, and clear contact routes."}
              </div>
              <div className="home-section-copy" style={{ marginTop: 8 }}>
                {language === "sw"
                  ? "Sehemu hii ibebe hatua za msingi kwa familia: kutafuta matokeo, kuelewa shule, na kupata ofisi rasmi ya mawasiliano."
                  : "This section should carry the essential actions for families: finding results, understanding the school, and reaching the official office channels."}
              </div>
            </div>
            <div className="home-support-actions">
              {supportActions.map((item) => (
                <button key={item.key} type="button" className="home-support-action" onClick={item.action}>
                  <div className="home-support-action-title">{item.title}</div>
                  <div className="home-support-action-copy">{item.description}</div>
                </button>
              ))}
            </div>
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
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.04em" }}>BONDE SECONDARY SCHOOL</div>
                <div style={{ fontSize: isMobile ? 11 : 10, color: "#86efac" }}>{t("resultSystem")}</div>
              </div>
            </div>
            <p style={{ fontSize: isMobile ? 13 : 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, maxWidth: 260 }}>
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
                  fontSize: isMobile ? 13 : 12,
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
            <div style={{ fontSize: isMobile ? 13 : 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Phone</span> {headmasterPhonesDisplay}
            </div>
            <div style={{ fontSize: isMobile ? 13 : 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Email</span> {schoolSettings.email}
            </div>
            <div style={{ fontSize: isMobile ? 13 : 12, color: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>Office</span> {schoolSettings.address}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", padding: "16px 0", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
            <button
              type="button"
              onClick={onOpenTerms}
              style={{ background: "none", border: "none", padding: 0, fontSize: isMobile ? 12 : 11, color: "rgba(255,255,255,0.62)", cursor: "pointer" }}
            >
              {language === "sw" ? "Masharti ya Matumizi" : "Terms of Use"}
            </button>
            <span style={{ fontSize: isMobile ? 11 : 10, color: "rgba(255,255,255,0.30)" }}>|</span>
            <button
              type="button"
              onClick={onOpenPrivacy}
              style={{ background: "none", border: "none", padding: 0, fontSize: isMobile ? 12 : 11, color: "rgba(255,255,255,0.62)", cursor: "pointer" }}
            >
              {language === "sw" ? "Sera ya Faragha" : "Privacy Policy"}
            </button>
          </div>
          <span style={{ fontSize: isMobile ? 12 : 11, color: "rgba(255,255,255,0.50)" }}>
            Copyright {currentYear} Bonde Secondary School. All Rights Reserved.
          </span>
        </div>
      </footer>

      {profileStudentRef && (
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
          onClick={() => setProfileStudentRef(null)}
        >
          <div
            style={{
              background: "#f0f4fa",
              borderRadius: isMobile ? 0 : 20,
              width: "100%",
              maxWidth: 760,
              minHeight: isMobile ? "100dvh" : undefined,
              maxHeight: isMobile ? "100dvh" : "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
              paddingBottom: isMobile ? "max(12px, env(safe-area-inset-bottom))" : 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#0a3d2b",
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
                onClick={() => setProfileStudentRef(null)}
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
            <StudentProfilePage studentRef={profileStudentRef} onBack={() => setProfileStudentRef(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
