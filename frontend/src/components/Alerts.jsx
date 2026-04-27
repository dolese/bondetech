import React from "react";
import { useTheme } from "../utils/ThemeContext";
import { themeColors } from "../utils/themeColors";

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR ALERT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ErrorAlert({ message, details, onDismiss }) {
  const { dark } = useTheme();
  const styles = {
    container: {
      background: dark ? "#3a1010" : "#ffd0d0",
      border: `2px solid ${dark ? "#7a2020" : "#cc2222"}`,
      borderRadius: 8,
      padding: "12px 16px",
      marginBottom: 12,
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
    },
    icon: {
      fontSize: 20,
      flexShrink: 0,
      marginTop: 2,
    },
    content: {
      flex: 1,
    },
    message: {
      fontWeight: 700,
      color: dark ? "#ff8080" : "#8b2500",
      fontSize: 13,
      marginBottom: details ? 4 : 0,
    },
    details: {
      fontSize: 12,
      color: dark ? "#cc6060" : "#6b2000",
      lineHeight: 1.5,
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: dark ? "#ff8080" : "#8b2500",
      fontSize: 18,
      cursor: "pointer",
      padding: 0,
      marginLeft: 8,
      flexShrink: 0,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.icon}>❌</div>
      <div style={styles.content}>
        <div style={styles.message}>{message}</div>
        {details && <div style={styles.details}>{details}</div>}
      </div>
      {onDismiss && (
        <button style={styles.closeBtn} onClick={onDismiss}>
          ✕
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS ALERT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SuccessAlert({ message, onDismiss }) {
  const { dark } = useTheme();
  const styles = {
    container: {
      background: dark ? "#0a2a1a" : "#d4f7e0",
      border: `2px solid ${dark ? "#1a6b3a" : "#0b6b3a"}`,
      borderRadius: 8,
      padding: "12px 16px",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    icon: {
      fontSize: 20,
      flexShrink: 0,
    },
    message: {
      fontWeight: 700,
      color: dark ? "#5dbb6b" : "#0b4f3a",
      fontSize: 13,
      flex: 1,
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: dark ? "#5dbb6b" : "#0b6b3a",
      fontSize: 18,
      cursor: "pointer",
      padding: 0,
      flexShrink: 0,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.icon}>✅</div>
      <div style={styles.message}>{message}</div>
      {onDismiss && (
        <button style={styles.closeBtn} onClick={onDismiss}>
          ✕
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATION (temporary floating message)
// ═══════════════════════════════════════════════════════════════════════════════

export function Toast({ message, type = "success" }) {
  const isError = type === "error";
  
  const styles = {
    container: {
      position: "fixed",
      top: 16,
      right: 16,
      zIndex: 9999,
      color: "#fff",
      padding: "10px 20px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 700,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      background: isError ? "#8b2500" : "#0b6b3a",
      animation: "slideIn 0.3s ease-out",
    },
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={styles.container}>
        {isError ? "❌" : "✅"} {message}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WARNING ALERT
// ═══════════════════════════════════════════════════════════════════════════════

export function WarningAlert({ message, onDismiss }) {
  const { dark } = useTheme();
  const styles = {
    container: {
      background: dark ? "#2a2000" : "#fff3cc",
      border: `2px solid ${dark ? "#806020" : "#f0c040"}`,
      borderRadius: 8,
      padding: "12px 16px",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    icon: {
      fontSize: 20,
      flexShrink: 0,
    },
    message: {
      fontWeight: 700,
      color: dark ? "#e0c060" : "#7a5800",
      fontSize: 13,
      flex: 1,
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: dark ? "#e0c060" : "#7a5800",
      fontSize: 18,
      cursor: "pointer",
      padding: 0,
      flexShrink: 0,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.icon}>⚠️</div>
      <div style={styles.message}>{message}</div>
      {onDismiss && (
        <button style={styles.closeBtn} onClick={onDismiss}>
          ✕
        </button>
      )}
    </div>
  );
}
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS ALERT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SuccessAlert({ message, onDismiss }) {
  const styles = {
    container: {
      background: "#d4f7e0",
      border: "2px solid #0b6b3a",
      borderRadius: 8,
      padding: "12px 16px",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    icon: {
      fontSize: 20,
      flexShrink: 0,
    },
    message: {
      fontWeight: 700,
      color: "#0b4f3a",
      fontSize: 13,
      flex: 1,
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: "#0b6b3a",
      fontSize: 18,
      cursor: "pointer",
      padding: 0,
      flexShrink: 0,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.icon}>✅</div>
      <div style={styles.message}>{message}</div>
      {onDismiss && (
        <button style={styles.closeBtn} onClick={onDismiss}>
          ✕
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATION (temporary floating message)
// ═══════════════════════════════════════════════════════════════════════════════

export function Toast({ message, type = "success" }) {
  const isError = type === "error";
  
  const styles = {
    container: {
      position: "fixed",
      top: 16,
      right: 16,
      zIndex: 9999,
      color: "#fff",
      padding: "10px 20px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 700,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      background: isError ? "#8b2500" : "#0b6b3a",
      animation: "slideIn 0.3s ease-out",
    },
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={styles.container}>
        {isError ? "❌" : "✅"} {message}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WARNING ALERT
// ═══════════════════════════════════════════════════════════════════════════════

export function WarningAlert({ message, onDismiss }) {
  const styles = {
    container: {
      background: "#fff3cc",
      border: "2px solid #f0c040",
      borderRadius: 8,
      padding: "12px 16px",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    icon: {
      fontSize: 20,
      flexShrink: 0,
    },
    message: {
      fontWeight: 700,
      color: "#7a5800",
      fontSize: 13,
      flex: 1,
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: "#7a5800",
      fontSize: 18,
      cursor: "pointer",
      padding: 0,
      flexShrink: 0,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.icon}>⚠️</div>
      <div style={styles.message}>{message}</div>
      {onDismiss && (
        <button style={styles.closeBtn} onClick={onDismiss}>
          ✕
        </button>
      )}
    </div>
  );
}
