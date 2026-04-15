const express = require("express");
const cors = require("cors");
const path = require("path");
const { initDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }));
app.use(express.json({ limit: "5mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/classes", require("./routes/classes"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), app: "BONDE Result System" });
});

// ── Serve React frontend in production ───────────────────────────────────────
const frontendBuild = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendBuild));
app.get("*", (req, res) => {
  const index = path.join(frontendBuild, "index.html");
  res.sendFile(index, (err) => {
    if (err) res.status(200).send("Backend running. Start frontend separately in development.");
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🎓 BONDE Result System Backend`);
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📦 API available at http://localhost:${PORT}/api`);
    console.log(`💾 Database: bonde_results.db\n`);
  });
})();
