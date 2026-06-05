import React from 'react';
import './PeopleDirectory.css';

export function StatsCard({ label, value, note }) {
  return (
    <div className="dir-stats-card">
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 800, color: "#0f172a" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}
