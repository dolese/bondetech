import React from "react";
import "./Home.css";

export function QuickCard({ bg, badge, title, desc, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="quick-card"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick();
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {badge}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2040" }}>{title}</div>
      <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}
