import React, { useState } from "react";
import "./Home.css";

export function CategoryChip({ label, color, bg, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      className="category-chip"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick();
        }
      }}
      style={{
        background: hovered
          ? `linear-gradient(135deg, rgba(255,255,255,0.94), ${bg})`
          : undefined,
        borderColor: hovered ? color : undefined,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background: hovered ? color : "#e2e8f0",
          boxShadow: hovered ? `0 10px 18px ${color}22` : "none",
        }}
      />
      <div style={{ fontSize: 10, fontWeight: 800, color: hovered ? color : "#475569", textAlign: "center", lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}

export function FeatureChip({ bg, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 12px" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          background: `linear-gradient(145deg, ${bg}, rgba(255,255,255,0.96))`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
        }}
      />
      <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textAlign: "center", lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}
