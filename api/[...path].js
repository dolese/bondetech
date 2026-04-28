const { app, ensureAppReady } = require("../backend/app");

module.exports = async (req, res) => {
  await ensureAppReady();
  return app(req, res);
};
