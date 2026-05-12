import React, { useState } from "react";
import "./Home.css";
import { HomeIcon } from "./HomeIcons";

export function CategoryChip({ label, color, bg, icon, onClick }) {
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
          ? "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(238,244,253,0.96))"
          : undefined,
        borderColor: hovered ? "rgba(31, 61, 118, 0.22)" : undefined,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,244,251,0.96))",
          border: "1px solid rgba(214, 224, 237, 0.9)",
          boxShadow: hovered ? "0 10px 18px rgba(15, 35, 92, 0.10)" : "inset 0 1px 0 rgba(255,255,255,0.86)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: hovered ? "#173b74" : "#6a7f97",
        }}
      >
        <HomeIcon name={icon} label={label} size={18} color={hovered ? "#173b74" : "#6a7f97"} />
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: hovered ? "#173b74" : "#475569", textAlign: "center", lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}

export function FeatureChip({ bg, label, icon }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 12px" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,244,251,0.96))",
          border: "1px solid rgba(214, 224, 237, 0.9)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#173b74",
        }}
      >
        <HomeIcon name={icon} label={label} size={22} />
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textAlign: "center", lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}
