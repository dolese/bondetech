import React from "react";

export function MiniBarChart({ bars }) {
  const normalized = bars.length > 0
    ? bars
    : [
        { label: "F1", value: 0 },
        { label: "F2", value: 0 },
        { label: "F3", value: 0 },
        { label: "F4", value: 0 },
      ];
  const width = 22;
  const gap = 12;
  const maxHeight = 72;
  const maxValue = Math.max(...normalized.map((bar) => bar.value), 1);

  return (
    <svg width={normalized.length * (width + gap) - gap} height={maxHeight + 20} style={{ display: "block", overflow: "visible" }}>
      {normalized.map((bar, index) => {
        const height = bar.value > 0 ? Math.max(12, Math.round((bar.value / maxValue) * maxHeight)) : 8;
        return (
          <g key={bar.label}>
            <rect
              x={index * (width + gap)}
              y={maxHeight - height}
              width={width}
              height={height}
              rx={4}
              fill={bar.value > 0 ? "#2563eb" : "#cbd5e1"}
            />
            <text
              x={index * (width + gap) + width / 2}
              y={maxHeight + 13}
              textAnchor="middle"
              fontSize={9}
              fill="#64748b"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
