import React, { useMemo, useState } from "react";

function formatDateTime(value) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function matchesSearch(entry, query) {
  if (!query) return true;
  const haystack = [
    entry.name,
    entry.phone,
    entry.email,
    entry.username,
    ...(entry.students || []).flatMap((student) => [
      student.name,
      student.indexNo,
      student.classLabel,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function PeopleDirectoryPage({
  title,
  description,
  entries = [],
  tone = "teal",
}) {
  const [query, setQuery] = useState("");

  const palette =
    tone === "amber"
      ? {
          accent: "#b45309",
          soft: "rgba(245,158,11,0.12)",
          border: "rgba(245,158,11,0.22)",
        }
      : {
          accent: "#0f8b8d",
          soft: "rgba(15,139,141,0.12)",
          border: "rgba(15,139,141,0.18)",
        };

  const filtered = useMemo(
    () => entries.filter((entry) => matchesSearch(entry, query)),
    [entries, query]
  );

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 18,
        display: "grid",
        gap: 16,
        background: "linear-gradient(180deg, #eef4fb 0%, #f8fbff 100%)",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.94)",
          borderRadius: 24,
          border: "1px solid rgba(226,232,240,0.92)",
          boxShadow: "0 18px 48px rgba(15,23,42,0.06)",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>{title}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>
            {description}
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "9px 14px",
            background: palette.soft,
            border: `1px solid ${palette.border}`,
            color: palette.accent,
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.94)",
          borderRadius: 20,
          border: "1px solid rgba(226,232,240,0.92)",
          boxShadow: "0 14px 36px rgba(15,23,42,0.05)",
          padding: 14,
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(203,213,225,0.95)",
            background: "#fff",
            outline: "none",
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />
      </div>

      {filtered.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((entry) => (
            <div
              key={entry.key}
              style={{
                background: "rgba(255,255,255,0.97)",
                borderRadius: 24,
                border: "1px solid rgba(226,232,240,0.92)",
                boxShadow: "0 18px 46px rgba(15,23,42,0.05)",
                padding: "18px 18px 16px",
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
                    {entry.name || "Unnamed"}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                    {entry.subtitle || "Real system record"}
                  </div>
                </div>
                {entry.badge && (
                  <div
                    style={{
                      borderRadius: 999,
                      padding: "5px 10px",
                      background: palette.soft,
                      border: `1px solid ${palette.border}`,
                      color: palette.accent,
                      fontWeight: 900,
                      fontSize: 11,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.badge}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {entry.phone ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.7 }}>
                      Phone
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14, color: "#0f172a", fontWeight: 700 }}>{entry.phone}</div>
                  </div>
                ) : null}
                {entry.email ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.7 }}>
                      Email
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14, color: "#0f172a", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.email}
                    </div>
                  </div>
                ) : null}
                {entry.username ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.7 }}>
                      Username
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14, color: "#0f172a", fontWeight: 700 }}>{entry.username}</div>
                  </div>
                ) : null}
                {entry.lastSeen ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.7 }}>
                      Last Activity
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14, color: "#0f172a", fontWeight: 700 }}>
                      {formatDateTime(entry.lastSeen)}
                    </div>
                  </div>
                ) : null}
              </div>

              {entry.address ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.7 }}>
                    Address
                  </div>
                  <div style={{ marginTop: 4, fontSize: 14, color: "#334155", lineHeight: 1.5 }}>
                    {entry.address}
                  </div>
                </div>
              ) : null}

              {entry.students?.length ? (
                <div
                  style={{
                    paddingTop: 12,
                    borderTop: "1px solid rgba(226,232,240,0.9)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Linked Students
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {entry.students.map((student) => (
                      <div
                        key={student.key}
                        style={{
                          borderRadius: 14,
                          background: "#f8fbff",
                          border: "1px solid rgba(226,232,240,0.85)",
                          padding: "10px 12px",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{student.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                          {student.indexNo ? `${student.indexNo} | ` : ""}
                          {student.classLabel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,255,255,0.94)",
            borderRadius: 22,
            border: "1px solid rgba(226,232,240,0.92)",
            boxShadow: "0 18px 46px rgba(15,23,42,0.05)",
            padding: "28px 20px",
            textAlign: "center",
            color: "#64748b",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          No matching records found.
        </div>
      )}
    </div>
  );
}
