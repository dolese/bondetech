const { getDb } = require("../../lib/firebaseAdmin");
const { readJsonBody, sendJson } = require("../../lib/http");
const { resolveSessionUser, canManageClasses } = require("../../lib/auth");
const { getHomepageContentEditor, saveHomepageContent } = require("../../lib/homepageOverview");

function normalizeText(value, fallback = "", maxLength = 240) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text.slice(0, maxLength);
}

function createStableId(prefix, index) {
  return `${prefix}-${Date.now()}-${index}`;
}

function sanitizeNewsItem(item, index) {
  return {
    id: normalizeText(item?.id, createStableId("news", index), 60),
    title: normalizeText(item?.title, "", 90),
    description: normalizeText(item?.description, "", 180),
    date: normalizeText(item?.date, new Date().toISOString()),
    category: normalizeText(item?.category, "general", 30),
    tone: normalizeText(item?.tone, "info", 20),
  };
}

function sanitizeGalleryItem(item, index) {
  return {
    id: normalizeText(item?.id, createStableId("gallery", index), 60),
    src: normalizeText(item?.src, "", 500),
    title: normalizeText(item?.title, "", 90),
    description: normalizeText(item?.description, "", 180),
    category: normalizeText(item?.category, "general", 30),
    date: normalizeText(item?.date, new Date().toISOString()),
  };
}

module.exports = async (req, res) => {
  const db = getDb();
  let user;
  try {
    user = await resolveSessionUser(db, req);
  } catch (err) {
    return sendJson(res, 401, { error: err.message });
  }
  if (!user) return sendJson(res, 401, { error: "Authentication required" });

  const action = String(req.query?.action || "").trim();

  try {
    if (req.method === "GET") {
      if (action === "news") {
        const content = await getHomepageContentEditor(db);
        return sendJson(res, 200, { news: content.announcements || [] });
      }
      if (action === "gallery") {
        const content = await getHomepageContentEditor(db);
        return sendJson(res, 200, { gallery: content.images || [] });
      }
      if (action === "all") {
        const content = await getHomepageContentEditor(db);
        return sendJson(res, 200, {
          news: content.announcements || [],
          gallery: content.images || [],
        });
      }
      return sendJson(res, 400, { error: "Invalid action for GET request" });
    }

    if (req.method === "POST") {
      if (!canManageClasses(user.role)) {
        return sendJson(res, 403, { error: "Only administrators can manage content" });
      }

      const body = await readJsonBody(req);
      const content = await getHomepageContentEditor(db);

      if (action === "news-create") {
        const newsItem = sanitizeNewsItem(body);
        const announcements = [...(content.announcements || []), newsItem];
        await saveHomepageContent(db, { announcements }, user);
        return sendJson(res, 201, { news: newsItem });
      }

      if (action === "gallery-create") {
        const galleryItem = sanitizeGalleryItem(body);
        const images = [...(content.images || []), galleryItem];
        await saveHomepageContent(db, { images }, user);
        return sendJson(res, 201, { gallery: galleryItem });
      }

      return sendJson(res, 400, { error: "Invalid action for POST request" });
    }

    if (req.method === "PUT") {
      if (!canManageClasses(user.role)) {
        return sendJson(res, 403, { error: "Only administrators can manage content" });
      }

      const body = await readJsonBody(req);
      const content = await getHomepageContentEditor(db);

      if (action === "news-update") {
        const itemId = String(body?.id || "").trim();
        if (!itemId) return sendJson(res, 400, { error: "Item ID is required" });
        
        const announcements = (content.announcements || []).map((item) =>
          item.id === itemId ? sanitizeNewsItem({ ...item, ...body }) : item
        );
        await saveHomepageContent(db, { announcements }, user);
        const updated = announcements.find((item) => item.id === itemId);
        return sendJson(res, 200, { news: updated });
      }

      if (action === "gallery-update") {
        const itemId = String(body?.id || "").trim();
        if (!itemId) return sendJson(res, 400, { error: "Item ID is required" });
        
        const images = (content.images || []).map((item) =>
          item.id === itemId ? sanitizeGalleryItem({ ...item, ...body }) : item
        );
        await saveHomepageContent(db, { images }, user);
        const updated = images.find((item) => item.id === itemId);
        return sendJson(res, 200, { gallery: updated });
      }

      return sendJson(res, 400, { error: "Invalid action for PUT request" });
    }

    if (req.method === "DELETE") {
      if (!canManageClasses(user.role)) {
        return sendJson(res, 403, { error: "Only administrators can manage content" });
      }

      const itemId = String(req.query?.id || "").trim();
      if (!itemId) return sendJson(res, 400, { error: "Item ID is required" });

      const content = await getHomepageContentEditor(db);

      if (action === "news-delete") {
        const announcements = (content.announcements || []).filter((item) => item.id !== itemId);
        await saveHomepageContent(db, { announcements }, user);
        return sendJson(res, 200, { deleted: itemId });
      }

      if (action === "gallery-delete") {
        const images = (content.images || []).filter((item) => item.id !== itemId);
        await saveHomepageContent(db, { images }, user);
        return sendJson(res, 200, { deleted: itemId });
      }

      return sendJson(res, 400, { error: "Invalid action for DELETE request" });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || "Internal server error" });
  }
};
