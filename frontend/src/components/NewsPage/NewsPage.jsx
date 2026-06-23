import React, { useMemo, useState } from "react";
import { useViewport } from "../../utils/useViewport";
import { useI18n } from "../../i18n";
import "./NewsPage.css";

const EmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

function formatDateLabel(value, language) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(language === "sw" ? "sw-TZ" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function NewsPage({ announcements = [] }) {
  const { language, t } = useI18n();
  const sw = language === "sw";
  const { isMobile } = useViewport();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    const cats = new Set(announcements.map((item) => item.category || "general"));
    return ["all", ...Array.from(cats)];
  }, [announcements]);

  const filtered = useMemo(() => {
    return announcements.filter((item) => {
      const matchesQuery = !query || (
        (item.title || "").toLowerCase().includes(query.toLowerCase()) ||
        (item.description || "").toLowerCase().includes(query.toLowerCase())
      );
      const matchesCategory = selectedCategory === "all" || (item.category || "general") === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [announcements, query, selectedCategory]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [filtered]);

  const stats = useMemo(() => ({
    total: announcements.length,
    thisMonth: announcements.filter((item) => {
      const itemDate = new Date(item.date || 0);
      const now = new Date();
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }).length,
  }), [announcements]);

  return (
    <div className="news-page-container">
      <div className="news-header-card">
        <div>
          <div className="news-header-title">{sw ? "Habari na Taarifa" : "News & Announcements"}</div>
          <div className="news-header-desc">
            {sw ? "Matangazo rasmi, masasisho, na habari za shule" : "Official announcements, updates, and school news"}
          </div>
        </div>
        <div className="news-stats-badge">
          {sorted.length} {sw ? "kwa" : "of"} {stats.total}
        </div>
      </div>

      <div className="news-controls">
        <input
          type="search"
          className="news-search-input"
          placeholder={sw ? "Tafuta habari..." : "Search news..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="news-category-filter">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`news-cat-btn${selectedCategory === cat ? " active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? (sw ? "Zote" : "All") : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!sorted.length ? (
        <div className="news-empty-state">
          <EmptyIcon />
          <div className="news-empty-text">
            {query || selectedCategory !== "all"
              ? (sw ? "Hakuna habari zinazolingana na utafutaji wako." : "No news matches your search.")
              : (sw ? "Hakuna habari kwa sasa." : "No news available at the moment.")}
          </div>
        </div>
      ) : (
        <div className="news-grid">
          {sorted.map((item, index) => {
            const tone = ["navy", "gold", "teal"][index % 3];
            return (
              <article key={item.id || index} className={`news-card news-card-${tone}`}>
                <div className={`news-card-bar news-card-bar-${tone}`} />
                <div className="news-card-body">
                  <div className="news-card-meta">
                    <span className="news-card-category">
                      {(item.category || "general").charAt(0).toUpperCase() + (item.category || "general").slice(1)}
                    </span>
                    <span className="news-card-date">{formatDateLabel(item.date, language)}</span>
                  </div>
                  <h3 className="news-card-title">{item.title}</h3>
                  <p className="news-card-excerpt">{item.description}</p>
                  {item.tone && (
                    <span className={`news-card-badge news-card-badge-${item.tone}`}>
                      {item.tone === "info" ? (sw ? "Taarifa" : "Info") :
                       item.tone === "success" ? (sw ? "Mafanikio" : "Success") :
                       item.tone === "warning" ? (sw ? "Onyo" : "Warning") :
                       item.tone}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
