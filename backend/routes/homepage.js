const express = require("express");
const { getDb } = require("../db");
const { getHomepageOverview } = require("../../lib/homepageOverview");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const overview = await getHomepageOverview(getDb());
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
