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
      }}
    >
      <div style={{ width: 26, height: 26, borderRadius: 999, background: hovered ? color : "#e2e8f0" }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: hovered ? color : "#475569", textAlign: "center", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export function FeatureChip({ bg, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: bg }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textAlign: "center", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}
