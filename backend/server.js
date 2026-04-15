const express = require("express");
const cors = require("cors");
const path = require("path");
const { initDb, getDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

const DEFAULT_SUBJECTS = [
  "CIV", "HTZ", "HIST", "GEO", "KISW",
  "ENG", "BIOS", "B/MATH", "CHEM", "PHYS", "BS",
];

const DEFAULT_SCHOOL = {
  name: "BONDE SECONDARY SCHOOL",
  authority: "PRIME MINISTER'S OFFICE",
  region: "TANGA",
  district: "MUHEZA DC",
  form: "Form I",
  term: "I",
  exam: "Mid-Term Exam",
  year: "2026",
};

// Seed a default class when Firestore is empty.
async function seedIfEmpty() {
  const db = getDb();
  const snapshot = await db.collection("classes").limit(1).get();
  if (!snapshot.empty) return;

  await db.collection("classes").add({
    name: "Form I",
    school_info: DEFAULT_SCHOOL,
    subjects: DEFAULT_SUBJECTS,
    year: "2026",
    form: "Form I",
    created_at: new Date().toISOString(),
    student_count: 0,
    cno_counter: 0,
  });
  console.log("✅ Default class created.");
}

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
  initDb();
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`\n🎓 BONDE Result System Backend`);
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📦 API available at http://localhost:${PORT}/api`);
    console.log(`🔥 Database: Firebase Firestore\n`);
  });
})();
