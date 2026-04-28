const FORM_ORDER = ["Form I", "Form II", "Form III", "Form IV"];

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

function buildAnnouncements({
  classes,
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

  return items.slice(0, 4);
}

async function getHomepageOverview(db) {
  const snapshot = await db.collection("classes").get();
  const classes = snapshot.docs
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

  return {
    stats: {
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
    },
    formBreakdown,
    announcements: buildAnnouncements({
      classes,
      totalClasses,
      totalStudents,
      activeForms,
      publishedClasses,
      publishedStudents,
      latestYear,
      latestPublishedClass,
      latestClass,
      monthlyExamLabels,
    }),
  };
}

module.exports = {
  getHomepageOverview,
};
