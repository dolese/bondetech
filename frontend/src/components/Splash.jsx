import React from "react";

export function Splash({ text, isError }) {
  const styles = {
    container: {
      display: "flex",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 18,
      minHeight: "100vh",
      background:
        "radial-gradient(circle at top, rgba(219,234,254,0.72), transparent 36%), linear-gradient(180deg, #f8fafc 0%, #eef4fb 100%)",
      padding: "24px",
      boxSizing: "border-box",
    },
    markShell: {
      position: "relative",
      width: 132,
      height: 132,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    ring: {
      position: "absolute",
      inset: 0,
      borderRadius: "50%",
      border: "6px solid rgba(37,99,235,0.12)",
      borderTopColor: "#2563eb",
      borderRightColor: "#14b8a6",
      animation: isError ? "none" : "splash-spin 1.1s linear infinite",
      boxShadow: "0 16px 40px rgba(37,99,235,0.14)",
    },
    halo: {
      position: "absolute",
      inset: 12,
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(239,246,255,0.94) 60%, rgba(219,234,254,0.84) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 12px 28px rgba(15,23,42,0.08)",
    },
    logo: {
      position: "relative",
      width: 78,
      height: 78,
      objectFit: "contain",
      borderRadius: 16,
      zIndex: 1,
    },
    errorBadge: {
      position: "relative",
      zIndex: 1,
      width: 78,
      height: 78,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #fee2e2, #fecaca)",
      color: "#b91c1c",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 30,
      fontWeight: 900,
      boxShadow: "0 12px 24px rgba(185,28,28,0.14)",
    },
    text: {
      fontSize: 17,
      color: isError ? "#8b2500" : "#334155",
      maxWidth: 420,
      textAlign: "center",
      fontWeight: 700,
      lineHeight: 1.5,
    },
    subtext: {
      fontSize: 12,
      color: "#64748b",
      textAlign: "center",
      maxWidth: 420,
      marginTop: -6,
    },
  };

  return (
    <>
      <style>{`
        @keyframes splash-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.markShell}>
          <div style={styles.ring} />
          <div style={styles.halo} />
          {isError ? (
            <div style={styles.errorBadge}>!</div>
          ) : (
            <img
              src="/asset/bonde.png"
              alt="Bonde Secondary School Logo"
              style={styles.logo}
            />
          )}
        </div>
        <div style={styles.text}>{text}</div>
        {isError ? (
          <div style={styles.subtext}>
            Check your API configuration and network connection.
          </div>
        ) : (
          <div style={styles.subtext}>Preparing Bonde Results for you...</div>
        )}
      </div>
    </>
  );
}
