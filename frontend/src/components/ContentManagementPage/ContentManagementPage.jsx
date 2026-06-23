import React, { useState, useEffect, useCallback } from "react";
import { useViewport } from "../../utils/useViewport";
import { useI18n } from "../../i18n";
import { API } from "../../api";
import "./ContentManagementPage.css";

const EmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="18" x2="12" y2="12"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);

export function ContentManagementPage({ showToast }) {
  const { language, t } = useI18n();
  const sw = language === "sw";
  const { isMobile } = useViewport();
  const [activeTab, setActiveTab] = useState("news");
  const [news, setNews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.getContent();
      setNews(response.news || []);
      setGallery(response.gallery || []);
    } catch (err) {
      console.error("Failed to load content:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleSave = async (item) => {
    try {
      setSaving(true);
      if (activeTab === "news") {
        if (item.id) {
          await API.updateNews(item.id, item);
        } else {
          await API.createNews(item);
        }
      } else {
        if (item.id) {
          await API.updateGallery(item.id, item);
        } else {
          await API.createGallery(item);
        }
      }
      await loadContent();
      setModalOpen(false);
      setEditingItem(null);
      showToast(item.id ? "Item updated successfully" : "Item created successfully");
    } catch (err) {
      console.error("Failed to save item:", err);
      showToast("Failed to save item", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      if (activeTab === "news") {
        await API.deleteNews(id);
      } else {
        await API.deleteGallery(id);
      }
      await loadContent();
      showToast("Item deleted successfully");
    } catch (err) {
      console.error("Failed to delete item:", err);
      showToast("Failed to delete item", "error");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const items = activeTab === "news" ? news : gallery;

  return (
    <div className="content-management-page">
      <div className="content-header">
        <h1>Content Management</h1>
        <p>Manage news announcements and gallery images displayed on the public homepage</p>
      </div>

      <div className="content-tabs">
        <button
          type="button"
          className={`content-tab${activeTab === "news" ? " active" : ""}`}
          onClick={() => setActiveTab("news")}
        >
          News ({news.length})
        </button>
        <button
          type="button"
          className={`content-tab${activeTab === "gallery" ? " active" : ""}`}
          onClick={() => setActiveTab("gallery")}
        >
          Gallery ({gallery.length})
        </button>
      </div>

      <div className="content-actions">
        <button type="button" className="btn-primary" onClick={handleCreate}>
          + Add {activeTab === "news" ? "News Item" : "Image"}
        </button>
      </div>

      {loading ? (
        <div className="content-loading">Loading...</div>
      ) : !items.length ? (
        <div className="content-empty">
          <EmptyIcon />
          <p>No {activeTab === "news" ? "news items" : "images"} yet</p>
        </div>
      ) : (
        <div className="content-list">
          {items.map((item) => (
            <div key={item.id} className="content-item">
              {activeTab === "gallery" && item.src && (
                <div className="content-item-preview">
                  <img src={item.src} alt={item.title || ""} />
                </div>
              )}
              <div className="content-item-info">
                <h3>{item.title || "Untitled"}</h3>
                <p>{item.description || ""}</p>
                <div className="content-item-meta">
                  <span className="content-item-category">{item.category || "general"}</span>
                  <span className="content-item-date">
                    {item.date ? new Date(item.date).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
              <div className="content-item-actions">
                <button type="button" onClick={() => handleEdit(item)}>
                  Edit
                </button>
                <button type="button" className="btn-delete" onClick={() => handleDelete(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ContentModal
          item={editingItem}
          type={activeTab}
          onSave={handleSave}
          onCancel={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

function ContentModal({ item, type, onSave, onCancel, saving }) {
  const [formData, setFormData] = useState(
    item || {
      title: "",
      description: "",
      category: "general",
      tone: "info",
      src: "",
      date: new Date().toISOString(),
    }
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="content-modal-overlay" onClick={onCancel}>
      <div className="content-modal" onClick={(e) => e.stopPropagation()}>
        <div className="content-modal-header">
          <h2>{item ? "Edit" : "Add"} {type === "news" ? "News Item" : "Image"}</h2>
          <button type="button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="content-modal-body">
            {type === "gallery" && (
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={formData.src || ""}
                  onChange={(e) => handleChange("src", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={formData.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter title"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter description"
                rows={3}
                required
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category || "general"}
                onChange={(e) => handleChange("category", e.target.value)}
              >
                <option value="general">General</option>
                <option value="events">Events</option>
                <option value="sports">Sports</option>
                <option value="academics">Academics</option>
                <option value="achievements">Achievements</option>
              </select>
            </div>
            {type === "news" && (
              <div className="form-group">
                <label>Tone</label>
                <select
                  value={formData.tone || "info"}
                  onChange={(e) => handleChange("tone", e.target.value)}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="accent">Accent</option>
                </select>
              </div>
            )}
          </div>
          <div className="content-modal-footer">
            <button type="button" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : item ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
