import React, { useEffect, useState } from "react";
import { useViewport } from "../utils/useViewport";

export function Landing({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [slideIndex, setSlideIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const { isMobile } = useViewport();

  const slides = ["/asset/Tz.jpg", "/asset/bonde.jpg"];

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter a username and password");
      return;
    }
    setError("");
    onLogin?.({ username });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setSlideIndex((prev) => (prev + 1) % slides.length);
        setFadeIn(true);
      }, 350);
    }, 3500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const styles = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "stretch",
      justifyContent: "stretch",
      background: "linear-gradient(135deg, #cfd5df 0%, #e9edf4 35%, #cfd8ee 100%)",
      padding: 0,
      fontFamily: "'Poppins', 'Trebuchet MS', sans-serif",
    },
    card: {
      width: "100%",
      maxWidth: "none",
      minHeight: "100vh",
      borderRadius: 0,
      background: "transparent",
      boxShadow: "none",
      display: isMobile ? "flex" : "grid",
      flexDirection: isMobile ? "column" : undefined,
      gridTemplateColumns: isMobile ? undefined : "1fr",
      overflow: "hidden",
      position: "relative",
    },
    left: {
      background: "linear-gradient(160deg, #2a2f4a 0%, #202437 60%, #171a28 100%)",
      backgroundImage: `linear-gradient(160deg, rgba(42,47,74,0.95) 0%, rgba(32,36,55,0.92) 60%, rgba(23,26,40,0.9) 100%), url(${slides[slideIndex]})`,
      backgroundRepeat: "no-repeat, no-repeat",
      backgroundPosition: "center, center",
      backgroundSize: "cover, 45%",
      color: "#fff",
      padding: isMobile ? "28px 20px 20px" : "72px 64px",
      display: "flex",
      flexDirection: "column",
      gap: isMobile ? 12 : 22,
      position: "relative",
      minHeight: isMobile ? 0 : "100vh",
      flex: isMobile ? "none" : undefined,
      transition: "background-image 0.6s ease",
    },
    leftOverlay: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(160deg, rgba(10,12,20,0.55) 0%, rgba(10,12,20,0.45) 50%, rgba(10,12,20,0.55) 100%)",
      opacity: fadeIn ? 1 : 0.2,
      transition: "opacity 0.4s ease",
    },
    leftContent: {
      position: "relative",
      zIndex: 2,
      maxWidth: isMobile ? "none" : 520,
      paddingRight: isMobile ? 0 : 120,
    },
    badge: {
      alignSelf: isMobile ? "flex-start" : "center",
      background: "rgba(255,255,255,0.12)",
      padding: "6px 12px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    headline: {
      fontSize: isMobile ? 18 : 24,
      fontWeight: 800,
      margin: 0,
      letterSpacing: 0.2,
    },
    subline: {
      fontSize: isMobile ? 12 : 13,
      color: "rgba(255,255,255,0.78)",
      lineHeight: 1.6,
      maxWidth: isMobile ? "none" : 320,
    },
    featureRow: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: isMobile ? 8 : 12,
      marginTop: isMobile ? 8 : 12,
      maxWidth: isMobile ? "none" : 520,
    },
    featureCard: {
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 12,
      padding: isMobile ? "10px 8px" : "14px 12px",
      textAlign: "center",
    },
    featureIcon: {
      fontSize: isMobile ? 18 : 22,
      marginBottom: isMobile ? 4 : 8,
    },
    featureTitle: {
      fontSize: isMobile ? 9 : 11,
      fontWeight: 700,
      letterSpacing: 0.3,
    },
    right: {
      ...(isMobile
        ? {
            position: "relative",
            width: "100%",
            padding: "20px 16px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: "rgba(247, 247, 251, 0.97)",
            flex: 1,
          }
        : {
            position: "absolute",
            right: 64,
            top: "50%",
            transform: "translateY(-50%)",
            width: "min(360px, 90vw)",
            padding: "28px 26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
            background: "rgba(247, 247, 251, 0.8)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.5)",
            borderRadius: 18,
            boxShadow: "0 20px 50px rgba(16, 24, 40, 0.28)",
            zIndex: 3,
          }),
    },
    formTitle: {
      margin: 0,
      fontSize: isMobile ? 16 : 18,
      fontWeight: 800,
      color: isMobile ? "#1a2040" : "#222",
    },
    input: {
      width: "100%",
      border: "1px solid rgba(215, 220, 235, 0.9)",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 13,
      outline: "none",
      background: "rgba(255,255,255,0.8)",
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: "#666",
      marginBottom: 6,
    },
    button: {
      border: "none",
      borderRadius: 10,
      padding: "12px 14px",
      fontSize: 13,
      fontWeight: 800,
      background: "#2a2f4a",
      color: "#fff",
      cursor: "pointer",
      letterSpacing: 0.3,
      boxShadow: "0 8px 18px rgba(42,47,74,0.25)",
      width: "100%",
    },
    error: {
      fontSize: 11,
      color: "#b42318",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
      `}</style>
      <div style={styles.card}>
        <div style={styles.left}>
          <div style={styles.leftOverlay} />
          <div style={styles.leftContent}>
            <div style={styles.badge}>Results Platform</div>
            <h1 style={styles.headline}>School Results Management System</h1>
            <div style={styles.subline}>
              Track grades, analyze performance, and generate report cards in minutes.
            </div>
            <div style={styles.featureRow}>
              {[
                { icon: "💻", label: "Simple & Flexible" },
                { icon: "⚙️", label: "Easily Manageable" },
                { icon: "👤", label: "User Friendly" },
              ].map((item) => (
                <div key={item.label} style={styles.featureCard}>
                  <div style={styles.featureIcon}>{item.icon}</div>
                  <div style={styles.featureTitle}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.right}>
          <div>
            <h2 style={styles.formTitle}>Welcome Back</h2>
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              Sign in to continue to the results system.
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <div style={styles.label}>Username</div>
              <input
                style={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={styles.label}>Password</div>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.button}>
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
