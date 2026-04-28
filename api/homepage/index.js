const { getDb } = require("../../lib/firebaseAdmin");
const { sendJson } = require("../../lib/http");
const { getHomepageOverview } = require("../../lib/homepageOverview");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const overview = await getHomepageOverview(getDb());
    return sendJson(res, 200, overview);
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
};
