const FORM_ORDER = ["Form I", "Form II", "Form III", "Form IV"];
const ANNOUNCEMENT_TONES = new Set(["info", "success", "warning", "accent"]);
const HOMEPAGE_CONTENT_COLLECTION = "site_content";
const HOMEPAGE_CONTENT_DOC = "homepage";

function toMillis(value) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function sortForms(a, b) {
  const aIndex = FORM_ORDER.indexOf(a);
  const bIndex = FORM_ORDER.indexOf(b);
  const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
  const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
  if (aRank !== bRank) return aRank - bRank;
  return String(a).localeCompare(String(b));
}

function buildExamLabel(cls) {
  if (!cls) return "";
  const exam = cls.school_info?.exam || "";
  const year = cls.year || cls.school_info?.year || "";
  return [exam, year].filter(Boolean).join(" ").trim();
}

function normalizeText(value, fallback = "", maxLength = 240) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text.slice(0, maxLength);
}

function normalizeTone(value) {
  const tone = String(value || "").trim().toLowerCase();
  return ANNOUNCEMENT_TONES.has(tone) ? tone : "info";
}

function normalizeColor(value, fallback = "#2563eb") {
  const color = String(value || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : fallback;
}

function createStableId(prefix, index) {
  return `${prefix}-${index + 1}`;
}

function sanitizeAnnouncements(items, fallbackItems = []) {
  const source = Array.isArray(items) && items.length > 0 ? items : fallbackItems;
  return source
    .map((item, index) => {
      const title = normalizeText(item?.title, "", 90);
      const description = normalizeText(item?.description, "", 180);
      if (!title || !description) return null;
      const date = normalizeText(item?.date, "");
      return {
        id: normalizeText(item?.id, createStableId("announcement", index), 60),
        tone: normalizeTone(item?.tone),
        title,
        description,
        date: date || new Date().toISOString(),
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function sanitizeHighlights(items, fallbackItems = []) {
  const source = Array.isArray(items) && items.length > 0 ? items : fallbackItems;
  return source
    .map((item, index) => {
      const label = normalizeText(item?.label, "", 40);
      const value = normalizeText(item?.value, "", 40);
      if (!label || !value) return null;
      return {
        key: normalizeText(item?.key, createStableId("highlight", index), 60),
        label,
        value,
        description: normalizeText(item?.description, "", 120),
        color: normalizeColor(item?.color, "#2563eb"),
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function buildExamLabelPreview(label) {
  return label || "No exam yet";
}

function buildAnnouncements({
  totalClasses,
  totalStudents,
  activeForms,
  publishedClasses,
  publishedStudents,
  latestYear,
  latestPublishedClass,
  latestClass,
  monthlyExamLabels,
}) {
  const items = [];

  if (latestPublishedClass) {
    items.push({
      id: "latest-publication",
      tone: "info",
      title: `${latestPublishedClass.form || latestPublishedClass.name} results are live`,
      description: `${buildExamLabel(latestPublishedClass) || "Latest exam"} is published and ready for public result search.`,
      date: latestPublishedClass.published_at || latestPublishedClass.created_at || null,
    });
  }

  if (publishedClasses > 0) {
    items.push({
      id: "published-coverage",
      tone: "success",
      title: `${publishedClasses} class${publishedClasses === 1 ? "" : "es"} currently have published results`,
      description: `${publishedStudents} student${publishedStudents === 1 ? "" : "s"} can already be searched across ${activeForms} active form${activeForms === 1 ? "" : "s"}.`,
      date: latestPublishedClass?.published_at || latestClass?.created_at || null,
    });
  }

  if (monthlyExamLabels.length > 0) {
    const preview = monthlyExamLabels.slice(0, 3).join(", ");
    const extra = monthlyExamLabels.length > 3 ? ` and ${monthlyExamLabels.length - 3} more` : "";
    items.push({
      id: "monthly-exams",
      tone: "warning",
      title: `${monthlyExamLabels.length} monthly exam option${monthlyExamLabels.length === 1 ? "" : "s"} enabled`,
      description: `Classes are configured for ${preview}${extra}.`,
      date: latestClass?.created_at || null,
    });
  }

  if (totalClasses > 0) {
    items.push({
      id: "portal-coverage",
      tone: "accent",
      title: `${totalClasses} active class${totalClasses === 1 ? "" : "es"} are on the portal`,
      description: `${totalStudents} student${totalStudents === 1 ? "" : "s"} are indexed for ${latestYear || "the current academic year"}.`,
      date: latestClass?.created_at || null,
    });
  }

  if (items.length === 0) {
    items.push({
      id: "portal-ready",
      tone: "info",
      title: "The results portal is ready",
      description: "Create classes and publish results to populate live homepage updates.",
      date: new Date().toISOString(),
    });
  }

  return sanitizeAnnouncements(items.slice(0, 4));
}

function buildDefaultHighlights(stats, latestExamLabel) {
  return sanitizeHighlights([
    {
      key: "students",
      color: "#2563eb",
      value: Number(stats.totalStudents || 0).toLocaleString(),
      label: "Total Students",
      description: "Students currently indexed on the portal.",
    },
    {
      key: "classes",
      color: "#059669",
      value: String(stats.totalClasses || 0),
      label: "Active Classes",
      description: "Classes available for current academic sessions.",
    },
    {
      key: "exam",
      color: "#7c3aed",
      value: buildExamLabelPreview(latestExamLabel),
      label: "Latest Exam",
      description: "Most recent exam session configured for results.",
    },
    {
      key: "published",
      color: "#d97706",
      value: String(stats.publishedClasses || 0),
      label: "Published Classes",
      description: "Classes already opened for public result search.",
    },
    {
      key: "forms",
      color: "#0891b2",
      value: String(stats.activeForms || 0),
      label: "Active Forms",
      description: "Forms with active class records on the system.",
    },
    {
      key: "monthly",
      color: "#dc2626",
      value: String(stats.monthlyExamCount || 0),
      label: "Monthly Exams",
      description: "Monthly exam options enabled across classes.",
    },
  ]);
}

function buildHomepageContent(input, defaults = {}) {
  return {
    announcements: sanitizeAnnouncements(input?.announcements, defaults.announcements || []),
    highlights: sanitizeHighlights(input?.highlights, defaults.highlights || []),
    updatedAt: normalizeText(input?.updatedAt, ""),
    updatedBy: normalizeText(input?.updatedBy, "", 120),
  };
}

function getHomepageContentRef(db) {
  return db.collection(HOMEPAGE_CONTENT_COLLECTION).doc(HOMEPAGE_CONTENT_DOC);
}

async function loadStoredHomepageContent(db) {
  const snapshot = await getHomepageContentRef(db).get();
  if (!snapshot.exists) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

async function buildOverviewData(db) {
  const [classesSnapshot, storedContent] = await Promise.all([
    db.collection("classes").get(),
    loadStoredHomepageContent(db),
  ]);

  const classes = classesSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((cls) => !cls.archived);

  const totalStudents = classes.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0);
  const totalClasses = classes.length;
  const published = classes.filter((cls) => cls.published || cls.published_at);
  const publishedClasses = published.length;
  const publishedStudents = published.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0);
  const forms = Array.from(new Set(classes.map((cls) => cls.form).filter(Boolean))).sort(sortForms);
  const activeForms = forms.length;
  const years = classes
    .map((cls) => cls.year || cls.school_info?.year || "")
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a));
  const latestYear = years[0] || "";
  const latestPublishedClass = [...published].sort(
    (a, b) => toMillis(b.published_at || b.created_at) - toMillis(a.published_at || a.created_at)
  )[0] || null;
  const latestClass = [...classes].sort(
    (a, b) => toMillis(b.created_at || b.published_at) - toMillis(a.created_at || a.published_at)
  )[0] || null;
  const latestExamLabel = buildExamLabel(latestPublishedClass) || buildExamLabel(latestClass);
  const monthlyExamLabels = Array.from(
    new Set(
      classes.flatMap((cls) => (Array.isArray(cls.monthly_exams) ? cls.monthly_exams : [])).filter(Boolean)
    )
  );
  const monthlyExamCount = monthlyExamLabels.length;
  const averageClassSize = totalClasses ? Math.round(totalStudents / totalClasses) : 0;

  const formBreakdown = forms.map((form) => {
    const formClasses = classes.filter((cls) => cls.form === form);
    return {
      label: form,
      classes: formClasses.length,
      students: formClasses.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0),
    };
  });

  const stats = {
    totalStudents,
    totalClasses,
    activeForms,
    publishedClasses,
    publishedStudents,
    latestYear,
    latestExamLabel,
    monthlyExamCount,
    monthlyExamLabels,
    averageClassSize,
  };

  const defaultAnnouncements = buildAnnouncements({
    totalClasses,
    totalStudents,
    activeForms,
    publishedClasses,
    publishedStudents,
    latestYear,
    latestPublishedClass,
    latestClass,
    monthlyExamLabels,
  });
  const defaultHighlights = buildDefaultHighlights(stats, latestExamLabel);
  const homepageContent = buildHomepageContent(storedContent, {
    announcements: defaultAnnouncements,
    highlights: defaultHighlights,
  });

  return {
    stats,
    formBreakdown,
    homepageContent,
  };
}

async function getHomepageOverview(db) {
  const { stats, formBreakdown, homepageContent } = await buildOverviewData(db);
  return {
    stats,
    formBreakdown,
    announcements: homepageContent.announcements,
    highlights: homepageContent.highlights,
  };
}

async function getHomepageContentEditor(db) {
  const { homepageContent } = await buildOverviewData(db);
  return homepageContent;
}

async function saveHomepageContent(db, input, actor) {
  const now = new Date().toISOString();
  const homepageContent = buildHomepageContent(input, {
    announcements: [],
    highlights: [],
  });

  const payload = {
    announcements: homepageContent.announcements,
    highlights: homepageContent.highlights,
    updatedAt: now,
    updatedBy: normalizeText(actor?.username, "", 120),
  };

  await getHomepageContentRef(db).set(payload, { merge: true });
  return payload;
}

module.exports = {
  getHomepageOverview,
  getHomepageContentEditor,
  saveHomepageContent,
};
