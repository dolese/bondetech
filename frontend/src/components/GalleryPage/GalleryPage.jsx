import React, { useMemo, useState } from "react";
import { useViewport } from "../../utils/useViewport";
import { useI18n } from "../../i18n";
import "./GalleryPage.css";

const EmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

export function GalleryPage({ images = [] }) {
  const { language, t } = useI18n();
  const sw = language === "sw";
  const { isMobile } = useViewport();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);

  const categories = useMemo(() => {
    const cats = new Set(images.map((item) => item.category || "general"));
    return ["all", ...Array.from(cats)];
  }, [images]);

  const filtered = useMemo(() => {
    return images.filter((item) => {
      const matchesQuery = !query || (
        (item.title || "").toLowerCase().includes(query.toLowerCase()) ||
        (item.description || "").toLowerCase().includes(query.toLowerCase())
      );
      const matchesCategory = selectedCategory === "all" || (item.category || "general") === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [images, query, selectedCategory]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [filtered]);

  const stats = useMemo(() => ({
    total: images.length,
    thisMonth: images.filter((item) => {
      const itemDate = new Date(item.date || 0);
      const now = new Date();
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }).length,
  }), [images]);

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleNextImage = () => {
    if (!selectedImage) return;
    const currentIndex = sorted.findIndex((img) => img.id === selectedImage.id);
    const nextIndex = (currentIndex + 1) % sorted.length;
    setSelectedImage(sorted[nextIndex]);
  };

  const handlePrevImage = () => {
    if (!selectedImage) return;
    const currentIndex = sorted.findIndex((img) => img.id === selectedImage.id);
    const prevIndex = (currentIndex - 1 + sorted.length) % sorted.length;
    setSelectedImage(sorted[prevIndex]);
  };

  return (
    <div className="gallery-page-container">
      <div className="gallery-header-card">
        <div>
          <div className="gallery-header-title">{sw ? "Picha za Shule" : "School Gallery"}</div>
          <div className="gallery-header-desc">
            {sw ? "Picha za shule, matukio, na shughuli mbalimbali" : "School photos, events, and activities"}
          </div>
        </div>
        <div className="gallery-stats-badge">
          {sorted.length} {sw ? "kwa" : "of"} {stats.total}
        </div>
      </div>

      <div className="gallery-controls">
        <input
          type="search"
          className="gallery-search-input"
          placeholder={sw ? "Tafuta picha..." : "Search photos..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="gallery-category-filter">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`gallery-cat-btn${selectedCategory === cat ? " active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? (sw ? "Zote" : "All") : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!sorted.length ? (
        <div className="gallery-empty-state">
          <EmptyIcon />
          <div className="gallery-empty-text">
            {query || selectedCategory !== "all"
              ? (sw ? "Hakuna picha zinazolingana na utafutaji wako." : "No photos match your search.")
              : (sw ? "Hakuna picha kwa sasa." : "No photos available at the moment.")}
          </div>
        </div>
      ) : (
        <div className="gallery-grid">
          {sorted.map((item) => (
            <div
              key={item.id}
              className="gallery-item"
              onClick={() => handleImageClick(item)}
            >
              <div className="gallery-item-image-wrapper">
                <img
                  src={item.src}
                  alt={item.title || ""}
                  className="gallery-item-image"
                  loading="lazy"
                />
                <div className="gallery-item-overlay">
                  <div className="gallery-item-icon">🔍</div>
                </div>
              </div>
              <div className="gallery-item-info">
                <h4 className="gallery-item-title">{item.title || ""}</h4>
                {item.description && (
                  <p className="gallery-item-desc">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="gallery-modal" onClick={handleCloseModal}>
          <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="gallery-modal-close"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              ×
            </button>
            <button
              type="button"
              className="gallery-modal-nav gallery-modal-prev"
              onClick={handlePrevImage}
              aria-label="Previous"
            >
              ‹
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.title || ""}
              className="gallery-modal-image"
            />
            <button
              type="button"
              className="gallery-modal-nav gallery-modal-next"
              onClick={handleNextImage}
              aria-label="Next"
            >
              ›
            </button>
            <div className="gallery-modal-caption">
              <h3>{selectedImage.title || ""}</h3>
              {selectedImage.description && (
                <p>{selectedImage.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
