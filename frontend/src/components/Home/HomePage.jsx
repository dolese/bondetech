import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API } from "../../api";
import { DEFAULT_SCHOOL } from "../../utils/constants";
import { normalizeSchoolSettings } from "../../utils/schoolSettings";
import { useViewport } from "../../utils/useViewport";
import { StudentProfilePage } from "../StudentProfilePage";
import { useI18n } from "../../i18n";
import { LanguageToggle } from "../LanguageToggle";
import { HomeIcon } from "./HomeIcons";
import "./Home.css";

const DEFAULT_HERO_SLIDES = [
  {
    id: "hero-1",
    imageSrc: "/asset/nembobonde.jpg",
    badge: "School Motto",
    badgeSw: "Kauli Mbiu ya Shule",
    title: "Better Future Starts Here",
    titleSw: "Maisha Bora Huanza Hapa",
    description:
      "A campus and culture built to support discipline, academic performance, and a stronger future for every learner.",
    descriptionSw:
      "Mazingira na utamaduni uliojengwa kusaidia nidhamu, ufaulu wa kitaaluma, na mustakabali bora kwa kila mwanafunzi.",
    backgroundPosition: "center",
  },
  {
    id: "hero-2",
    imageSrc: "/asset/slider2.png",
    badge: "Academics",
    badgeSw: "Taaluma",
    title: "Excellence in the Classroom and Beyond",
    titleSw: "Ufaulu Darasani na Zaidi",
    description:
      "Dedicated teachers, organised examinations, and published results that keep families informed and confident.",
    descriptionSw:
      "Walimu waliojitoa, mitihani iliyopangwa, na matokeo yaliyochapishwa yanayoweka familia kwenye taarifa na uhakika.",
    backgroundPosition: "center",
  },
  {
    id: "hero-3",
    imageSrc: "/asset/slider3.png",
    badge: "Community",
    badgeSw: "Jamii",
    title: "Connected With Students, Parents, and Staff",
    titleSw: "Tumeunganishwa na Wanafunzi, Wazazi, na Watumishi",
    description:
      "One trusted portal for results, notices, and official school communication — clear and on time.",
    descriptionSw:
      "Tovuti moja ya kuaminika kwa matokeo, taarifa, na mawasiliano rasmi ya shule — wazi na kwa wakati.",
    backgroundPosition: "center",
  },
];

function resolveHeroText(slide, language, enKey, swKey) {
  if (!slide) return "";
  if (language === "sw") return slide[swKey] || slide[enKey] || "";
  return slide[enKey] || slide[swKey] || "";
}

function formatDateLabel(value, language) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(language === "sw" ? "sw-TZ" : "en-US", {
    month: "short",
    year: "numeric",
  });
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
      averageClassSize: 0,
    },
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

export function HomePage({ onOpenLogin, onOpenTerms, onOpenPrivacy, onOpenSchool }) {
  const { language, t } = useI18n();
  const sw = language === "sw";
  const fallbackOverview = useMemo(() => createFallbackOverview(t), [t]);
  const { isMobile } = useViewport();

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
  const [currentSlide, setCurrentSlide] = useState(0);

  const searchSectionRef = useRef(null);
  const newsSectionRef = useRef(null);
  const aboutSectionRef = useRef(null);

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
        if (active) setSchoolSettings(DEFAULT_SCHOOL);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (profileStudentRef) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
    return undefined;
  }, [profileStudentRef]);

  const slides = useMemo(() => {
    const source = Array.isArray(homepageData?.slides) && homepageData.slides.length
      ? homepageData.slides
      : DEFAULT_HERO_SLIDES;
    return source.slice(0, 4).map((slide, index) => ({
      ...DEFAULT_HERO_SLIDES[index % DEFAULT_HERO_SLIDES.length],
      ...slide,
    }));
  }, [homepageData?.slides]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [slides.length, currentSlide]);

  const goToSlide = useCallback(
    (index) => {
      const count = slides.length || 1;
      setCurrentSlide(((index % count) + count) % count);
    },
    [slides.length]
  );

  const stats = homepageData?.stats || fallbackOverview.stats;
  const announcements =
    Array.isArray(homepageData?.announcements) && homepageData.announcements.length > 0
      ? homepageData.announcements
      : fallbackOverview.announcements;

  const currentYear = new Date().getFullYear();
  const latestKnownYear = Math.max(currentYear, Number(stats.latestYear || 0) || 0);
  const searchYearOptions = Array.from({ length: 10 }, (_, i) => String(latestKnownYear - i));
  const latestExamLabel =
    stats.latestExamLabel ||
    (stats.latestYear
      ? (sw ? `Mwaka wa Masomo ${stats.latestYear}` : `Academic Year ${stats.latestYear}`)
      : sw ? "Tovuti ya Matokeo" : "Results Portal");

  const schoolName = schoolSettings.name || "Bonde Secondary School";
  const district = schoolSettings.district || "Muheza";
  const authority = schoolSettings.authority || "PMO-RALG";

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleSearch = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (!searchAdmission.trim()) {
        setSearchError(sw ? "Tafadhali weka namba ya usajili au jina la mwanafunzi." : "Please enter an admission number or student name.");
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
    },
    [searchAdmission, searchForm, searchYear, sw, t]
  );

  const heroStats = [
    { num: (stats.totalStudents || 0).toLocaleString(), label: sw ? "Wanafunzi" : "Students", dark: true },
    { num: (stats.totalClasses || 0).toLocaleString(), label: sw ? "Madarasa" : "Classes" },
    { num: (stats.publishedClasses || 0).toLocaleString(), label: sw ? "Yaliyochapishwa" : "Published" },
    { num: (stats.activeForms || 0).toLocaleString(), label: sw ? "Vidato" : "Active Forms" },
  ];

  const bandStats = [
    { num: (stats.totalStudents || 0).toLocaleString(), label: sw ? "Wanafunzi Waliosajiliwa" : "Students Enrolled" },
    { num: (stats.totalClasses || 0).toLocaleString(), label: sw ? "Madarasa Hai" : "Active Classes" },
    { num: (stats.publishedClasses || 0).toLocaleString(), label: sw ? "Madarasa Yaliyochapishwa" : "Published Classes" },
    { num: (stats.activeForms || 0).toLocaleString(), label: sw ? "Vidato Vinavyofanya Kazi" : "Active Forms" },
  ];

  const pillars = [
    {
      icon: "performance",
      title: sw ? "Ufuatiliaji wa Kitaaluma" : "Academic Monitoring",
      text: sw
        ? "Mitihani, alama, na ripoti huunganishwa ili shule, wazazi, na wanafunzi wawe na picha moja wazi ya maendeleo."
        : "Exams, marks, and reports connect so the school, parents, and students share one clear view of progress.",
    },
    {
      icon: "published",
      title: sw ? "Matokeo Yaliyochapishwa" : "Published Results",
      text: sw
        ? "Matokeo rasmi hutolewa kupitia dawati moja salama la umma, yanatafutika kwa namba ya usajili darasa likichapishwa."
        : "Official results are released through one secure public desk — searchable by admission number once a class is published.",
    },
    {
      icon: "announcements",
      title: sw ? "Taarifa na Habari" : "Notices & News",
      text: sw
        ? "Taarifa rasmi za shule, masasisho ya mitihani, na matangazo muhimu hufika kwa familia moja kwa moja na kwa wakati."
        : "Official school notices, examination updates, and important announcements reach families directly and on time.",
    },
    {
      icon: "students",
      title: sw ? "Nidhamu na Tabia" : "Discipline & Character",
      text: sw
        ? "Utamaduni uliojengwa juu ya uwajibikaji, heshima, na mienendo inayowaandaa wanafunzi kwa maisha zaidi ya darasani."
        : "A culture built on responsibility, respect, and habits that prepare learners for life well beyond the classroom.",
    },
    {
      icon: "exam",
      title: sw ? "Mitihani" : "Examinations",
      text: sw
        ? "Tathmini endelevu na mitihani ya mwisho hupangwa katika vidato vyote, kwa upimaji wa uwazi na uwajibikaji."
        : "Continuous assessment and terminal examinations organised across all forms, with transparent, accountable grading.",
    },
    {
      icon: "secure",
      title: sw ? "Ufikiaji Salama" : "Secure Access",
      text: sw
        ? "Taarifa za umma hubaki wazi, huku kumbukumbu nyeti za wanafunzi zikilindwa nyuma ya kuingia kwa watumishi."
        : "Public information stays open and clear, while sensitive student records remain protected behind staff sign-in.",
    },
  ];

  const navLinks = [
    { label: sw ? "Mwanzo" : "Home", onClick: scrollToTop },
    { label: sw ? "Shule Yetu" : "Our School", onClick: () => onOpenSchool?.() },
    { label: sw ? "Matokeo" : "Results", onClick: () => scrollTo(searchSectionRef) },
    { label: sw ? "Habari" : "News", onClick: () => scrollTo(newsSectionRef) },
    { label: sw ? "Programu" : "Programmes", onClick: () => scrollTo(aboutSectionRef) },
  ];

  const newsBars = ["b1", "b2", "b3"];

  return (
    <div className="wa-home">
      {/* NAV */}
      <nav>
        <button type="button" className="nav-brand" onClick={scrollToTop}>
          <img className="nav-logo" src="/asset/bonde.png" alt={schoolName} />
          <span className="nav-name">BONDE SS</span>
        </button>
        <div className="nav-links">
          {navLinks.map((link) => (
            <button type="button" key={link.label} onClick={link.onClick}>
              {link.label}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <LanguageToggle compact />
          <button type="button" className="nav-login" onClick={() => onOpenLogin?.()}>
            {t("loginButton")}
          </button>
          <button type="button" className="nav-cta" onClick={() => scrollTo(searchSectionRef)}>
            {sw ? "Angalia Matokeo" : "Check Results"}
          </button>
          <button
            type="button"
            className="nav-burger"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>
      {mobileMenuOpen && (
        <div className="nav-mobile">
          {navLinks.map((link) => (
            <button
              type="button"
              key={link.label}
              onClick={() => {
                setMobileMenuOpen(false);
                link.onClick();
              }}
            >
              {link.label}
            </button>
          ))}
          <button type="button" className="nav-mobile-login" onClick={() => onOpenLogin?.()}>
            {t("loginButton")}
          </button>
        </div>
      )}

      {/* HERO */}
      <div className="hero-wrap">
        <div className="hero">
          <div>
            <span className="hero-eyebrow">✦ {authority} · {district}</span>
            <h1 className="hero-title">
              {sw ? (
                <>Maisha bora<br /><em>huanza hapa</em></>
              ) : (
                <>A better future<br /><em>starts here</em></>
              )}
            </h1>
            <p className="hero-motto">"Better future starts here"</p>
            <p className="hero-body">
              {sw
                ? `${schoolName} ni taasisi ya umma inayoendeshwa chini ya ${authority} ${district}, ikiwa na msisitizo wa nidhamu, ufaulu wa kitaaluma, na maandalizi ya maisha bora ya baadaye.`
                : `${schoolName} is a public institution operating under ${authority} in ${district}, with a strong focus on discipline, academic performance, and preparing learners for a better future.`}
            </p>
            <div className="hero-actions">
              <button type="button" className="btn-navy" onClick={() => scrollTo(searchSectionRef)}>
                {sw ? "Angalia Matokeo" : "Check Results"}
              </button>
              <button type="button" className="btn-soft" onClick={() => onOpenSchool?.()}>
                {sw ? "Shule Yetu" : "Our School"}
              </button>
            </div>
          </div>
          <div className="hero-stats">
            {heroStats.map((s) => (
              <div key={s.label} className={`stat-card${s.dark ? " dark" : ""}`}>
                <span className="stat-num">{s.num}</span>
                <span className="stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CAROUSEL */}
      <div className="carousel-wrap">
        <div className="carousel" role="region" aria-label={sw ? "Vivutio vya shule" : "School highlights"}>
          <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {slides.map((slide, index) => (
              <div className={`carousel-slide${index === currentSlide ? " active" : ""}`} key={slide.id || index}>
                <div
                  className="slide-bg"
                  style={{
                    backgroundImage: `url(${slide.imageSrc})`,
                    backgroundPosition: slide.backgroundPosition || "center",
                  }}
                />
                <div className="slide-overlay" />
                <div className="slide-content">
                  <span className="slide-tag">{resolveHeroText(slide, language, "badge", "badgeSw")}</span>
                  <div className="slide-title">{resolveHeroText(slide, language, "title", "titleSw")}</div>
                  <p className="slide-desc">{resolveHeroText(slide, language, "description", "descriptionSw")}</p>
                </div>
              </div>
            ))}
          </div>
          {slides.length > 1 && (
            <>
              <button type="button" className="carousel-arrow prev" onClick={() => goToSlide(currentSlide - 1)} aria-label="Previous">‹</button>
              <button type="button" className="carousel-arrow next" onClick={() => goToSlide(currentSlide + 1)} aria-label="Next">›</button>
              <div className="carousel-dots">
                {slides.map((slide, index) => (
                  <button
                    type="button"
                    key={`dot-${slide.id || index}`}
                    className={`dot${index === currentSlide ? " active" : ""}`}
                    aria-label={`Slide ${index + 1}`}
                    onClick={() => goToSlide(index)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* RESULTS SEARCH */}
      <section className="results" ref={searchSectionRef}>
        <div className="results-inner">
          <div className="results-head">
            <span className="section-eyebrow">{t("resultsDesk")}</span>
            <h2 className="section-title">{sw ? "Tafuta Matokeo ya Mwanafunzi" : "Find a Student's Results"}</h2>
            <p className="section-body">
              {sw
                ? "Matokeo ya umma yanaonekana hapa baada ya kuchapishwa rasmi na shule. Tafuta kwa namba ya usajili au jina, kisha chuja kwa kidato au mwaka."
                : "Published results appear here once the school formally releases them. Search by admission number or name, then narrow by form or year."}
            </p>
            <div className="results-notes">
              <span className="results-note">
                {stats.publishedClasses > 0 ? t("publishedClassesLabel") : t("activeForms")}:{" "}
                {stats.publishedClasses > 0 ? stats.publishedClasses || 0 : stats.activeForms || 0}
              </span>
              <span className="results-note">{t("latestExam")}: {latestExamLabel}</span>
              {homepageStatus === "fallback" && (
                <span className="results-note subtle">{t("liveOverviewUnavailable")}</span>
              )}
            </div>
          </div>

          <div className="results-form-card">
            <form onSubmit={handleSearch}>
              <div className="results-grid">
                <input
                  type="search"
                  className="wa-field"
                  placeholder={t("admissionPlaceholder")}
                  value={searchAdmission}
                  onChange={(e) => setSearchAdmission(e.target.value)}
                />
                <select className="wa-field wa-select" value={searchForm} onChange={(e) => setSearchForm(e.target.value)}>
                  <option value="">{t("classFormAll")}</option>
                  {["Form I", "Form II", "Form III", "Form IV"].map((form) => (
                    <option key={form}>{form}</option>
                  ))}
                </select>
                <select className="wa-field wa-select" value={searchYear} onChange={(e) => setSearchYear(e.target.value)}>
                  <option value="">{t("yearAll")}</option>
                  {searchYearOptions.map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                </select>
              </div>
              {searchError && <div className="results-error">{searchError}</div>}
              <button type="submit" disabled={searching} className="btn-navy results-submit">
                {searching ? t("searching") : t("searchResultsButton")}
              </button>
            </form>

            {searchResults && searchResults.length > 1 && (
              <div className="results-list">
                <div className="results-list-head">
                  {sw
                    ? `${searchResults.length} ${t("studentsFoundSelect")}`
                    : `${searchResults.length} student${searchResults.length !== 1 ? "s" : ""} found — select to view results:`}
                </div>
                {searchResults.map((result) => (
                  <button
                    type="button"
                    key={`${result.classId}-${result.id}`}
                    className="results-row"
                    onClick={() =>
                      setProfileStudentRef({
                        admissionNo: String(result.admissionNo || "").trim().toUpperCase(),
                        indexNo: String(result.indexNo || "").trim(),
                        classId: String(result.classId || "").trim(),
                        studentId: String(result.studentId || "").trim(),
                      })
                    }
                  >
                    <div>
                      <div className="results-row-name">{result.name}</div>
                      <div className="results-row-meta">
                        {result.admissionNo || result.indexNo} · {result.form} · {result.year}
                      </div>
                    </div>
                    <span className="results-row-arrow">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="pillars" ref={aboutSectionRef}>
        <div className="pillars-inner">
          <div className="section-head">
            <span className="section-eyebrow">{sw ? "Tunachotoa" : "What We Offer"}</span>
            <h2 className="section-title">
              {sw ? (
                <>Kila kitu unachohitaji,<br /><em>bila ziada isiyo na maana</em></>
              ) : (
                <>Everything you need,<br /><em>nothing you don't</em></>
              )}
            </h2>
            <p className="section-body">
              {sw
                ? "Tunaunganisha taaluma, malezi, na mawasiliano katika mfumo mmoja unaoaminika — ili familia ifuatilie maendeleo kwa urahisi."
                : "We bring academics, character, and communication into one trusted system — so families can follow every learner's progress with ease."}
            </p>
          </div>
          <div className="pillar-grid">
            {pillars.map((p) => (
              <div className="pillar" key={p.title}>
                <div className="pillar-icon"><HomeIcon name={p.icon} label={p.title} size={22} /></div>
                <div className="pillar-title">{p.title}</div>
                <p className="pillar-text">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <div className="stats-band">
        <div className="stats-band-inner">
          {bandStats.map((s) => (
            <div className="band-stat" key={s.label}>
              <span className="band-num">{s.num}</span>
              <span className="band-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* NEWS */}
      <section className="news" ref={newsSectionRef}>
        <div className="news-inner">
          <div className="news-header">
            <div>
              <span className="section-eyebrow">{sw ? "Habari za Shule" : "School News"}</span>
              <h2 className="section-title news-title">{sw ? "Maisha Bonde" : "Life at Bonde"}</h2>
            </div>
          </div>
          <div className="news-grid">
            {announcements.slice(0, 3).map((item, index) => (
              <div className="news-card" key={item.id || index}>
                <div className={`nc-bar ${newsBars[index % newsBars.length]}`} />
                <div className="nc-body">
                  <div className="nc-meta">{formatDateLabel(item.date, language) || (sw ? "Taarifa" : "Notice")}</div>
                  <div className="nc-title">{item.title}</div>
                  <p className="nc-excerpt">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-box">
          <div>
            <div className="cta-title">{sw ? "Anza na Bonde" : "Begin With Bonde"}</div>
            <div className="cta-sub">
              {sw
                ? "Angalia matokeo yaliyochapishwa au ingia kwenye tovuti ya watumishi."
                : "Check published results, or sign in to the staff portal."}
            </div>
          </div>
          <div className="cta-btns">
            <button type="button" className="btn-navy" onClick={() => scrollTo(searchSectionRef)}>
              {sw ? "Angalia Matokeo" : "Check Results"}
            </button>
            <button type="button" className="btn-soft" onClick={() => onOpenLogin?.()}>
              {t("loginButton")}
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">
          <img className="footer-logo" src="/asset/bonde.png" alt="" />
          <span className="footer-copy">© {currentYear} {schoolName}. {sw ? "Haki zote zimehifadhiwa." : "All rights reserved."}</span>
        </div>
        <div className="footer-links">
          <button type="button" onClick={() => onOpenSchool?.()}>{sw ? "Shule Yetu" : "Our School"}</button>
          <button type="button" onClick={() => onOpenTerms?.()}>{sw ? "Masharti" : "Terms"}</button>
          <button type="button" onClick={() => onOpenPrivacy?.()}>{sw ? "Faragha" : "Privacy"}</button>
          <button type="button" onClick={() => onOpenLogin?.()}>{sw ? "Ingia" : "Staff Portal"}</button>
        </div>
      </footer>

      {/* STUDENT PROFILE MODAL */}
      {profileStudentRef && (
        <div className="wa-modal" onClick={() => setProfileStudentRef(null)}>
          <div className="wa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wa-modal-head">
              <div>{t("studentResults")}</div>
              <button type="button" onClick={() => setProfileStudentRef(null)} aria-label="Close">×</button>
            </div>
            <StudentProfilePage studentRef={profileStudentRef} onBack={() => setProfileStudentRef(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
