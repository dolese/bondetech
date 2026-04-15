import React from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// SPLASH SCREEN (Loading/Error)
// ═══════════════════════════════════════════════════════════════════════════════

export function Splash({ text, isError }) {
  const styles = {
    container: {
      display: "flex",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16,
      height: "100vh",
      background: "#f8fafc",
    },
    icon: {
      fontSize: 56,
      animation: isError ? "none" : "spin 1.2s linear infinite",
    },
    text: {
      fontSize: 16,
      color: isError ? "#8b2500" : "#555",
      maxWidth: 400,
      textAlign: "center",
      fontWeight: 600,
    },
    subtext: {
      fontSize: 12,
      color: "#888",
      marginTop: 8,
    },
    code: {
      background: "#eee",
      padding: "2px 6px",
      borderRadius: 3,
      fontFamily: "monospace",
      fontSize: 11,
    },
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.icon}>
          {isError ? "❌" : "⏳"}
        </div>
        <div style={styles.text}>{text}</div>
        {isError && (
          <div style={styles.subtext}>
            Check your API configuration and network connection
          </div>
        )}
      </div>
    </>
  );
}
