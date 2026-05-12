import React from "react";
import "./Home.css";
import { HomeIcon } from "./HomeIcons";
import { useI18n } from "../../i18n";

export function QuickCard({ icon, bg, badge, title, desc, onClick, featured = false }) {
  const { t } = useI18n();
  return (
    <div
      role="button"
      tabIndex={0}
      className={`quick-card${featured ? " quick-card-login-glass" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick();
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${bg}, rgba(255,255,255,0.96))`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#173b74",
          }}
        >
          <HomeIcon name={icon} label={title} size={20} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {badge}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#1a2040", letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.7, flex: 1 }}>{desc}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {t("openAction")}
        </span>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            background: "rgba(37,99,235,0.10)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2563eb",
            fontWeight: 900,
          }}
        >
          {">"}
        </span>
      </div>
    </div>
  );
}
