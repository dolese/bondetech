const { sendJson } = require("./_lib/http");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  return sendJson(res, 200, {
    status: "ok",
    time: new Date().toISOString(),
    app: "BONDE Result System",
  });
};
