const classesIndex = require("../serverless/classes/index.js");
const classById = require("../serverless/classes/[id]/index.js");
const classAudit = require("../serverless/classes/[id]/audit/index.js");
const classPublish = require("../serverless/classes/[id]/publish/index.js");
const classStudentsBulk = require("../serverless/classes/[id]/students/bulk.js");
const classStudentsIndex = require("../serverless/classes/[id]/students/index.js");
const classStudentById = require("../serverless/classes/[id]/students/[sid].js");
const proxyCsv = require("../serverless/proxy-csv/index.js");
const statsIndex = require("../serverless/stats/index.js");
const studentSearch = require("../serverless/students/search.js");
const studentProfile = require("../serverless/students/[indexNo].js");
const authIndex = require("../serverless/auth/index.js");
const { sendJson } = require("../lib/http");

function withQuery(req, extraQuery = {}) {
  req.query = { ...(req.query || {}), ...extraQuery };
}

function toStatsUrl(query = {}) {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const queryString = search.toString();
  return `/api/stats${queryString ? `?${queryString}` : ""}`;
}

module.exports = async (req, res) => {
  const action = String(req.query?.dispatch || "").trim();

  try {
    switch (action) {
      case "classes":
        return classesIndex(req, res);
      case "class":
        return classById(req, res);
      case "class-audit":
        return classAudit(req, res);
      case "class-publish":
        return classPublish(req, res);
      case "class-students":
        return classStudentsIndex(req, res);
      case "class-students-bulk":
        return classStudentsBulk(req, res);
      case "class-student":
        return classStudentById(req, res);
      case "students-search":
        return studentSearch(req, res);
      case "student-profile":
        return studentProfile(req, res);
      case "proxy-csv":
        return proxyCsv(req, res);
      case "sms":
        req.url = toStatsUrl({ sms: 1 });
        return statsIndex(req, res);
      case "auth-login":
        withQuery(req, { action: "login" });
        return authIndex(req, res);
      case "auth-me":
        withQuery(req, { action: "me" });
        return authIndex(req, res);
      case "auth-change-password":
        withQuery(req, { action: "change-password" });
        return authIndex(req, res);
      case "auth-users":
        withQuery(req, { action: "users" });
        return authIndex(req, res);
      case "auth-user":
        withQuery(req, { action: "user" });
        return authIndex(req, res);
      case "backup":
        req.url = "/api/backup";
        return statsIndex(req, res);
      case "restore":
        req.url = "/api/restore";
        return statsIndex(req, res);
      case "health":
        req.url = "/api/health";
        return statsIndex(req, res);
      case "homepage":
        req.url = toStatsUrl({ overview: 1 });
        return statsIndex(req, res);
      case "stats":
        req.url = toStatsUrl({
          overview: req.query?.overview,
          homepageContent: req.query?.homepageContent,
          schoolSettings: req.query?.schoolSettings,
          sms: req.query?.sms,
        });
        return statsIndex(req, res);
      default:
        return sendJson(res, 404, { error: "API route not found" });
    }
  } catch (err) {
    return sendJson(res, 500, { error: err.message || "Internal server error" });
  }
};
