import React from "react";
import "./Home.css";

const ANNOUNCEMENT_TONES = {
  info: { bg: "#dbeafe", color: "#2563eb", label: "Live" },
  success: { bg: "#d1fae5", color: "#059669", label: "Published" },
  warning: { bg: "#fef3c7", color: "#d97706", label: "Schedule" },
  accent: { bg: "#ede9fe", color: "#7c3aed", label: "Portal" },
};

export function AnnouncementRow({ title, desc, date, tone, compact = false }) {
  const palette = ANNOUNCEMENT_TONES[tone] || ANNOUNCEMENT_TONES.info;

  return (
    <div
      className="announcement-row"
      style={{
        alignItems: compact ? "flex-start" : "center",
        flexWrap: compact ? "wrap" : "nowrap",
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
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
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1a2040", letterSpacing: "-0.01em" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, lineHeight: 1.6 }}>{desc}</div>
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
      {!compact && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "rgba(37,99,235,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#2563eb",
            flexShrink: 0,
          }}
        >
          {">"}
        </div>
      )}
    </div>
  );
}
