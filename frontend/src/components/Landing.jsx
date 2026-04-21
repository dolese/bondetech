import React, { useState, useRef, useEffect } from "react";
import { useViewport } from "../utils/useViewport";
import { API } from "../api";
import { StudentProfilePage } from "./StudentProfilePage";

// ── Mini bar chart (SVG) ──────────────────────────────────────────────────────
function MiniBarChart() {
  const bars = [
    { label: "A", h: 52 },
    { label: "B", h: 70 },
    { label: "C", h: 42 },
    { label: "D", h: 28 },
    { label: "E", h: 14 },
  ];
  const W = 18, GAP = 8, MAX_H = 72;
  return (
    <svg
      width={bars.length * (W + GAP) - GAP}
      height={MAX_H + 16}
      style={{ display: "block", overflow: "visible" }}
    >
      {bars.map((b, i) => (
        <g key={b.label}>
          <rect x={i * (W + GAP)} y={MAX_H - b.h} width={W} height={b.h} rx={3} fill="#3b82f6" />
          <text x={i * (W + GAP) + W / 2} y={MAX_H + 13} textAnchor="middle" fontSize={9} fill="#94a3b8">{b.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── School crest icon ─────────────────────────────────────────────────────────
function SchoolCrest({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 3 L35 9 L35 22 C35 30 28 36 20 38 C12 36 5 30 5 22 L5 9 Z" fill="#1a3a7c" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="20" y="24" textAnchor="middle" fontSize="14" fill="#f59e0b" fontWeight="bold">B</text>
    </svg>
  );
}

// ── Quick-access card ─────────────────────────────────────────────────────────
function QuickCard({ emoji, bg, title, desc, onClick }) {
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
        alignItems: "flex-start",
        gap: 12,
        cursor: "pointer",
        transition: "all 0.18s ease",
        boxShadow: hovered ? "0 4px 16px rgba(0,51,102,0.10)" : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
        {emoji}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040", marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Announcement row ──────────────────────────────────────────────────────────
function AnnouncementRow({ emoji, bg, title, desc, date }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderBottom: "1px solid #f1f5f9",
        cursor: "pointer",
        background: hovered ? "#f8faff" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0, marginLeft: 8 }}>{date}</div>
      <div style={{ fontSize: 16, color: "#94a3b8" }}>›</div>
    </div>
  );
}

// ── Category chip ─────────────────────────────────────────────────────────────
function CategoryChip({ emoji, label, color, bg, onClick }) {
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
        minWidth: 72,
      }}
    >
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: hovered ? color : "#475569", textAlign: "center", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureChip({ emoji, bg, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textAlign: "center", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ── Login modal ───────────────────────────────────────────────────────────────
function LoginModal({ onClose, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter a username and password");
      return;
    }
    setError("");
    onLogin?.({ username });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,18,40,0.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "32px 28px",
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f2d6e" }}>Staff Login</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Sign in to manage results</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 }}>Username</label>
          <input
            style={{ width: "100%", border: "1.5px solid #dde3ef", borderRadius: 10, padding: "11px 12px", fontSize: 14, marginBottom: 14, background: "#f8faff", boxSizing: "border-box" }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoFocus
          />
          <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 }}>Password</label>
          <input
            style={{ width: "100%", border: "1.5px solid #dde3ef", borderRadius: 10, padding: "11px 12px", fontSize: 14, marginBottom: 6, background: "#f8faff", boxSizing: "border-box" }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          {error && <div style={{ fontSize: 12, color: "#b42318", fontWeight: 700, marginBottom: 10 }}>{error}</div>}
          <button
            type="submit"
            style={{ width: "100%", background: "#0f2d6e", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 10, letterSpacing: 0.3, boxShadow: "0 6px 18px rgba(15,45,110,0.25)" }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Landing component ────────────────────────────────────────────────────
export function Landing({ onLogin }) {
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile, width } = useViewport();
  const isDesktop = width >= 900;

  // Search state
  const [searchAdmission, setSearchAdmission] = useState("");
  const [searchExam, setSearchExam] = useState("");
  const [searchForm, setSearchForm] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [profileIndexNo, setProfileIndexNo] = useState(null);

  // Real stats from API
  const [statsData, setStatsData] = useState(null);

  // Section refs for smooth scroll
  const searchSectionRef = useRef(null);
  const announcementsSectionRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    API.getStats()
      .then(setStatsData)
      .catch((err) => {
        // Stats are best-effort; log the error but don't surface it to the user
        console.warn("Failed to load stats:", err);
      });
  }, []);

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
      setSearchError("Please enter an admission number or student name.");
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
        setSearchError("No results found. Check the admission number and try again.");
      } else if (results.length === 1) {
        setProfileIndexNo(results[0].indexNo);
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      setSearchError(err.message || "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleCategoryClick = (label) => {
    const normalized = label.replace(/\n/g, " ");
    const match = normalized.match(/Form\s+(I{1,3}V?|IV)/);
    if (match) {
      setSearchForm("Form " + match[1]);
    }
    scrollToSearch();
  };

  const currentYear = new Date().getFullYear();
  const LATEST_EXAM = `Term II ${currentYear}`;

  const NAV_BG = "#0f2d6e";
  const FONT = "'Poppins', 'Segoe UI', sans-serif";
  const CONTAINER_STYLE = { maxWidth: 1140, margin: "0 auto", padding: isMobile ? "0 16px" : "0 32px" };

  const QUICK_ACCESS = [
    { emoji: "📊", bg: "#dbeafe", title: "Check Results", desc: "View your exam results instantly", onClick: scrollToSearch },
    { emoji: "👥", bg: "#d1fae5", title: "Class Performance", desc: "See performance by class or subject", onClick: scrollToSearch },
    { emoji: "📅", bg: "#fef3c7", title: "Exam Timetable", desc: "View upcoming exams and dates", onClick: scrollToAnnouncements },
    { emoji: "🔔", bg: "#ede9fe", title: "Announcements", desc: "Latest school notices & updates", onClick: scrollToAnnouncements },
    { emoji: "📥", bg: "#fee2e2", title: "Download Report", desc: "Download result sheets & reports", onClick: scrollToSearch },
    { emoji: "👤", bg: "#cffafe", title: "Student / Parent Login", desc: "Access your account securely", onClick: () => setShowLogin(true) },
  ];

  const ANNOUNCEMENTS = [
    { emoji: "📢", bg: "#dbeafe", title: "Term II 2024 results have been released", desc: "Check your results now and download your reports.", date: "May 20, 2024" },
    { emoji: "📢", bg: "#d1fae5", title: "Form IV Mock Examination Timetable", desc: "The timetable is now available. Check the exam dates.", date: "May 18, 2024" },
    { emoji: "📢", bg: "#fee2e2", title: "Parents' Meeting – All Forms", desc: "Meeting scheduled for 25th May 2024 at 9:00 AM.", date: "May 15, 2024" },
    { emoji: "📢", bg: "#fef3c7", title: "System Maintenance Notice", desc: "System will be unavailable on 22nd May from 12:00 AM – 4:00 AM.", date: "May 14, 2024" },
  ];

  const CATEGORIES = [
    { emoji: "👥", label: "Form I\nResults", color: "#2563eb", bg: "#dbeafe" },
    { emoji: "📚", label: "Form II\nResults", color: "#2563eb", bg: "#dbeafe" },
    { emoji: "📖", label: "Form III\nResults", color: "#2563eb", bg: "#dbeafe" },
    { emoji: "🎓", label: "Form IV\nResults", color: "#2563eb", bg: "#dbeafe" },
    { emoji: "⭐", label: "Terminal\nExams", color: "#dc2626", bg: "#fee2e2" },
    { emoji: "📝", label: "Midterm\nExams", color: "#dc2626", bg: "#fee2e2" },
    { emoji: "🏆", label: "Annual\nExams", color: "#7c3aed", bg: "#ede9fe" },
    { emoji: "📋", label: "Mock\nExams", color: "#0891b2", bg: "#cffafe" },
  ];

  const FEATURES = [
    { emoji: "🔒", bg: "#dbeafe", label: "Secure\nAccess" },
    { emoji: "⚡", bg: "#d1fae5", label: "Fast Results\nChecking" },
    { emoji: "📱", bg: "#ede9fe", label: "Mobile\nResponsive" },
    { emoji: "📥", bg: "#fef3c7", label: "Easy Report\nDownload" },
    { emoji: "📈", bg: "#d1fae5", label: "Performance\nTracking" },
    { emoji: "🔔", bg: "#fee2e2", label: "Notices in\nOne Place" },
  ];

  const PERF_STATS = [
    { emoji: "👥", color: "#2563eb", value: statsData ? statsData.totalStudents.toLocaleString() : "—", label: "Total Students" },
    { emoji: "📚", color: "#059669", value: statsData ? String(statsData.totalClasses) : "—", label: "Classes" },
    { emoji: "📅", color: "#7c3aed", value: LATEST_EXAM, label: "Latest Exam" },
    { emoji: "✅", color: "#059669", value: "92.4%", label: "Pass Rate" },
    { emoji: "⭐", color: "#d97706", value: "Form IV A", label: "Top Class" },
    { emoji: "📈", color: "#2563eb", value: "76.8%", label: "Average Score" },
  ];

  return (
    <div style={{ fontFamily: FONT, background: "#f0f4fa", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .landing-btn-outline {
          display: inline-flex; align-items: center; gap: 7px;
          border: 2px solid rgba(255,255,255,0.85);
          border-radius: 10px; padding: 11px 20px;
          font-size: 13px; font-weight: 700; color: #fff;
          background: transparent; cursor: pointer; letter-spacing: 0.2px;
          transition: all 0.18s ease; font-family: inherit;
        }
        .landing-btn-outline:hover { background: rgba(255,255,255,0.15); }
        .landing-search-input {
          border: 1.5px solid #dde3ef; border-radius: 10px; padding: 10px 12px;
          font-size: 13px; background: #fff; flex: 1; min-width: 0;
          font-family: inherit; color: #1a2040; outline: none;
        }
        .landing-search-input:focus { border-color: #2563eb; }
      `}</style>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav style={{ background: "#fff", borderBottom: "1.5px solid #e8edf5", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ ...CONTAINER_STYLE, display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? 60 : 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SchoolCrest size={isMobile ? 36 : 44} />
            <div>
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 800, color: NAV_BG, letterSpacing: 0.3, lineHeight: 1.2 }}>BONDE SECONDARY SCHOOL</div>
              <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: "#2563eb", letterSpacing: 1, textTransform: "uppercase" }}>Results System</div>
            </div>
          </div>

          {/* Desktop nav links */}
          {isDesktop && (
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {[
                { label: "Home", action: scrollToTop },
                { label: "Results", action: scrollToSearch },
                { label: "Notices", action: scrollToAnnouncements },
                { label: "About Us", action: scrollToFooter },
                { label: "Contact Us", action: scrollToFooter },
              ].map(({ label, action }) => (
                <span key={label} onClick={action} style={{ fontSize: 13, fontWeight: 600, color: label === "Home" ? "#2563eb" : "#475569", cursor: "pointer", transition: "color 0.15s" }}>
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Login button (desktop) or hamburger (mobile) */}
          {isDesktop ? (
            <button
              onClick={() => setShowLogin(true)}
              style={{ background: NAV_BG, color: "#fff", border: "none", borderRadius: 10, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(15,45,110,0.2)" }}
            >
              👤 Login
            </button>
          ) : (
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 22, color: NAV_BG, padding: 4 }}
              aria-label="Menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {!isDesktop && mobileMenuOpen && (
          <div style={{ background: "#fff", borderTop: "1px solid #f1f5f9", padding: "8px 0 12px" }}>
            {[
              { label: "Home", action: scrollToTop },
              { label: "Results", action: scrollToSearch },
              { label: "Notices", action: scrollToAnnouncements },
              { label: "About Us", action: scrollToFooter },
              { label: "Contact Us", action: scrollToFooter },
            ].map(({ label, action }) => (
              <div key={label} onClick={() => { action(); setMobileMenuOpen(false); }} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>{label}</div>
            ))}
            <div style={{ padding: "8px 16px 0" }}>
              <button
                onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }}
                style={{ width: "100%", background: NAV_BG, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                👤 Login
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #0c2461 0%, #1a3a8f 45%, #1e52b8 100%)",
          padding: isMobile ? "32px 0 36px" : "56px 0 64px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

        <div
          style={{
            ...CONTAINER_STYLE,
            display: isDesktop ? "grid" : "flex",
            gridTemplateColumns: isDesktop ? "1fr 340px" : undefined,
            flexDirection: isDesktop ? undefined : "column",
            gap: isMobile ? 28 : 40,
            alignItems: "center",
          }}
        >
          {/* Left: headline + CTA */}
          <div style={{ color: "#fff" }}>
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 999, padding: "5px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, marginBottom: 18 }}>
              Welcome!
            </div>
            <h1 style={{ fontSize: isMobile ? 28 : 42, fontWeight: 800, lineHeight: 1.2, margin: "0 0 16px", letterSpacing: -0.5 }}>
              Academic Results<br />
              Made{" "}
              <span style={{ color: "#f59e0b" }}>Simple</span>
            </h1>
            <p style={{ fontSize: isMobile ? 13 : 15, color: "rgba(255,255,255,0.80)", lineHeight: 1.7, marginBottom: 28, maxWidth: 440 }}>
              Access results, track performance and stay updated with school notices anytime, anywhere.
            </p>

            {/* CTA buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
              <button className="landing-btn-outline" onClick={scrollToSearch}>
                📊 Check Results
              </button>
              <button className="landing-btn-outline" onClick={() => setShowLogin(true)}>
                👤 Login
              </button>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.70)", flexWrap: "wrap" }}>
              <span>🛡 Fast</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>🔒 Secure</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>📱 Mobile Friendly</span>
            </div>
          </div>

          {/* Right: stats card */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: isMobile ? "18px 16px" : "22px 20px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.20)",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040" }}>Latest Exam: {LATEST_EXAM}</div>
              <span style={{ fontSize: 18 }}>📅</span>
            </div>

             {/* Total students + classes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#f8faff", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Total Students</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#0f2d6e" }}>
                    {statsData ? statsData.totalStudents.toLocaleString() : "—"}
                  </span>
                  <span style={{ fontSize: 20 }}>👥</span>
                </div>
              </div>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Classes</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>
                    {statsData ? statsData.totalClasses : "—"}
                  </span>
                  <span style={{ fontSize: 20 }}>📚</span>
                </div>
              </div>
            </div>

            {/* Bar chart */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 10 }}>Performance Overview</div>
              <MiniBarChart />
            </div>

            {/* Top student + avg score */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#fffbeb", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#92400e", fontWeight: 600, marginBottom: 3 }}>Top Student</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1a2040" }}>Agnes M.</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>493/500</div>
                <div style={{ fontSize: 18, marginTop: 4 }}>🏆</div>
              </div>
              <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#5b21b6", fontWeight: 600, marginBottom: 3 }}>Average Score</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1a2040" }}>76.8%</div>
                <div style={{ fontSize: 18, marginTop: 4 }}>⏱</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEARCH RESULTS ─────────────────────────────────────────────────── */}
      <section ref={searchSectionRef} style={{ padding: isMobile ? "24px 0" : "32px 0" }}>
        <div style={CONTAINER_STYLE}>
          <div style={{ background: "#fff", borderRadius: 20, padding: isMobile ? "20px 16px" : "28px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>🔍</span>
              <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>Search Results</span>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>Enter student details to view results and academic progress.</p>

            <form onSubmit={handleSearch}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <input
                  className="landing-search-input"
                  placeholder="👤 Admission No. or Name"
                  value={searchAdmission}
                  onChange={(e) => setSearchAdmission(e.target.value)}
                />
                <select
                  className="landing-search-input"
                  value={searchExam}
                  onChange={(e) => setSearchExam(e.target.value)}
                >
                  <option value="">Exam Type (All)</option>
                  <option>March Exam</option>
                  <option>Mid-Term Exam</option>
                  <option>Terminal Exam</option>
                  <option>September Exam</option>
                  <option>Annual Exam</option>
                </select>
                <select
                  className="landing-search-input"
                  value={searchForm}
                  onChange={(e) => setSearchForm(e.target.value)}
                >
                  <option value="">🎓 Class / Form (All)</option>
                  <option>Form I</option>
                  <option>Form II</option>
                  <option>Form III</option>
                  <option>Form IV</option>
                </select>
                <select
                  className="landing-search-input"
                  value={searchYear}
                  onChange={(e) => setSearchYear(e.target.value)}
                >
                  <option value="">📅 Year (All)</option>
                  {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>

              {searchError && (
                <div style={{ fontSize: 12, color: "#b42318", fontWeight: 600, marginBottom: 10 }}>
                  ⚠ {searchError}
                </div>
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
                {searching ? "⏳ Searching…" : "🔍 Search Results"}
              </button>
            </form>

            {/* Multiple search results list */}
            {searchResults && searchResults.length > 1 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2d6e", marginBottom: 10 }}>
                  {searchResults.length} student{searchResults.length !== 1 ? "s" : ""} found — select to view results:
                </div>
                {searchResults.map((r) => (
                  <div
                    key={`${r.classId}-${r.id}`}
                    onClick={() => setProfileIndexNo(r.indexNo)}
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
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#eef2ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#f8faff")}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {r.indexNo} · {r.form} · {r.year}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, color: "#2563eb", fontWeight: 700 }}>View ›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── QUICK ACCESS ───────────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? "4px 0 24px" : "4px 0 32px" }}>
        <div style={CONTAINER_STYLE}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>Quick Access</span>
            <span onClick={scrollToSearch} style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", cursor: "pointer" }}>View All ›</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : isDesktop ? "repeat(3, 1fr)" : "repeat(3, 1fr)",
              gap: isMobile ? 10 : 14,
            }}
          >
            {QUICK_ACCESS.map((item) => (
              <QuickCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PERFORMANCE HIGHLIGHTS ─────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? "4px 0 24px" : "4px 0 32px" }}>
        <div style={CONTAINER_STYLE}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>Performance Highlights</span>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              border: "1.5px solid #f1f5f9",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
              gap: 0,
              overflow: "hidden",
            }}
          >
            {PERF_STATS.map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: isMobile ? "16px 8px" : "20px 16px",
                  textAlign: "center",
                  borderRight: i < PERF_STATS.length - 1 ? "1px solid #f1f5f9" : "none",
                  borderBottom: isMobile && i < 3 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ fontSize: isMobile ? 20 : 24, marginBottom: 6, color: stat.color }}>{stat.emoji}</div>
                <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 800, color: "#0f2d6e" }}>{stat.value}</div>
                <div style={{ fontSize: isMobile ? 9 : 11, color: "#64748b", marginTop: 3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENT ANNOUNCEMENTS ───────────────────────────────────────────── */}
      <section ref={announcementsSectionRef} style={{ padding: isMobile ? "4px 0 24px" : "4px 0 32px" }}>
        <div style={CONTAINER_STYLE}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>Recent Announcements</span>
            </div>
            <span onClick={scrollToAnnouncements} style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", cursor: "pointer" }}>View All ›</span>
          </div>
          <div style={{ background: "#fff", borderRadius: 18, border: "1.5px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            {ANNOUNCEMENTS.map((a, i) => (
              <AnnouncementRow key={i} {...a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── RESULTS CATEGORIES ─────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? "4px 0 24px" : "4px 0 32px" }}>
        <div style={CONTAINER_STYLE}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>Results Categories</span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 4,
              scrollbarWidth: "none",
            }}
          >
            {CATEGORIES.map((c) => (
              <CategoryChip key={c.label} {...c} onClick={() => handleCategoryClick(c.label)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY USE THIS SYSTEM ────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? "4px 0 28px" : "4px 0 40px" }}>
        <div style={CONTAINER_STYLE}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 18 }}>🛡</span>
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0f2d6e" }}>Why Use This System?</span>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              border: "1.5px solid #f1f5f9",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
              gap: 0,
              overflow: "hidden",
            }}
          >
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                style={{
                  borderRight: i < FEATURES.length - 1 ? "1px solid #f1f5f9" : "none",
                  borderBottom: isMobile && i < 3 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <FeatureChip {...f} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer ref={footerRef} style={{ background: "#0c2461", color: "#fff", padding: isMobile ? "32px 0 0" : "48px 0 0" }}>
        <div
          style={{
            ...CONTAINER_STYLE,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr 1fr",
            gap: isMobile ? 28 : 40,
            paddingBottom: isMobile ? 28 : 40,
          }}
        >
          {/* School info */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <SchoolCrest size={44} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: 0.3 }}>BONDE SECONDARY SCHOOL</div>
                <div style={{ fontSize: 10, color: "#93c5fd" }}>Results System</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, maxWidth: 260 }}>
              Muheza District Council,<br />P.O. Box 03 Muheza
            </p>
          </div>

          {/* Quick links */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Quick Links</div>
            {[
              { label: "Home", action: scrollToTop },
              { label: "Results", action: scrollToSearch },
              { label: "Notices", action: scrollToAnnouncements },
              { label: "About Us", action: scrollToFooter },
              { label: "Contact Us", action: scrollToFooter },
            ].map(({ label, action }) => (
              <div key={label} onClick={action} style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, cursor: "pointer" }}>{label}</div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Contact Us</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📞</span> +255 123 456 789
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>✉</span> info@bondessecondary.sc.tz
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📍</span> Muheza, Tanga, Tanzania
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", padding: "16px 0", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.50)" }}>
            © {currentYear} Bonde Secondary School. All Rights Reserved.
          </span>
        </div>
      </footer>

      {/* ── LOGIN MODAL ────────────────────────────────────────────────────── */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={(creds) => {
            setShowLogin(false);
            onLogin?.(creds);
          }}
        />
      )}

      {/* ── STUDENT PROFILE OVERLAY ─────────────────────────────────────────── */}
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
            {/* Overlay header */}
            <div style={{ background: "#0f2d6e", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: isMobile ? 0 : "20px 20px 0 0", flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>📋 Student Results</div>
              <button
                onClick={() => setProfileIndexNo(null)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ×
              </button>
            </div>
            <StudentProfilePage
              indexNo={profileIndexNo}
              onBack={() => setProfileIndexNo(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
