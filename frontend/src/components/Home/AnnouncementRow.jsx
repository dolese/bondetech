import React from "react";
import "./Home.css";
import { HomeIcon } from "./HomeIcons";

const ANNOUNCEMENT_TONES = {
  info: { icon: "notice", label: "Live" },
  success: { icon: "published", label: "Published" },
  warning: { icon: "timetable", label: "Schedule" },
  accent: { icon: "announcements", label: "Portal" },
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
          width: compact ? 40 : 46,
          height: compact ? 40 : 46,
          borderRadius: compact ? 12 : 14,
          background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(239,244,251,0.94))",
          border: "1px solid rgba(214, 224, 237, 0.9)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#14532d",
          flexShrink: 0,
        }}
      >
        <HomeIcon name={palette.icon} label={title} size={compact ? 16 : 18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? 9 : 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a8da5", marginBottom: 2 }}>
          {palette.label}
        </div>
        <div style={{ fontSize: compact ? 13 : 14, fontWeight: 800, color: "#1a2040", letterSpacing: "-0.01em" }}>{title}</div>
        <div style={{ fontSize: compact ? 10 : 11, color: "#64748b", marginTop: 3, lineHeight: compact ? 1.5 : 1.6 }}>{desc}</div>
      </div>
      <div
        style={{
          fontSize: compact ? 10 : 11,
          color: "#94a3b8",
          flexShrink: 0,
          marginLeft: compact ? 48 : 8,
          width: compact ? "calc(100% - 48px)" : "auto",
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
            background: "rgba(20,83,45,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#14532d",
            flexShrink: 0,
          }}
        >
          {">"}
        </div>
      )}
    </div>
  );
}
