const express = require("express");
const cors = require("cors");
const path = require("path");
const dns = require("node:dns").promises;
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
  console.log("Default class created.");
}

app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }));
app.use(express.json({ limit: "5mb" }));

app.use("/api/classes", require("./routes/classes"));
app.use("/api/students", require("./routes/students"));
app.use("/api/homepage", require("./routes/homepage"));

app.get("/api/stats", async (req, res) => {
  try {
    const db = getDb();
    const classesSnap = await db.collection("classes").get();

    let totalStudents = 0;
    let latestYear = "";

    classesSnap.docs.forEach((doc) => {
      const data = doc.data();
      totalStudents += Number(data.student_count || 0);
      if (data.year && (!latestYear || data.year > latestYear)) {
        latestYear = data.year;
      }
    });

    res.json({
      totalStudents,
      totalClasses: classesSnap.size,
      latestYear,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PRIVATE_IP_RE = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];
const isPrivateIp = (ip) => PRIVATE_IP_RE.some((r) => r.test(ip));

async function hostnameResolvesToPrivate(hostname) {
  try {
    const addrs = await dns.resolve(hostname);
    return addrs.some(isPrivateIp);
  } catch {
    return false;
  }
}

app.post("/api/proxy-csv", async (req, res) => {
  try {
    let { url } = req.body || {};
    if (typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "url is required" });
    }
    url = url.trim();

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.status(400).json({ error: "Only http/https URLs are allowed" });
    }

    if (await hostnameResolvesToPrivate(parsed.hostname)) {
      return res.status(400).json({ error: "Access to private or internal addresses is not allowed" });
    }

    const gsMatch = url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([^/?#]+)/i);
    if (gsMatch) {
      const sheetId = gsMatch[1];
      const gidMatch = url.match(/[?&]gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "BondeTech-CSV-Proxy/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Remote URL returned HTTP ${response.status}` });
    }

    const text = await response.text();
    res.json({ csv: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), app: "BONDE Result System" });
});

const frontendBuild = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendBuild));
app.get("*", (req, res) => {
  const index = path.join(frontendBuild, "index.html");
  res.sendFile(index, (err) => {
    if (err) res.status(200).send("Backend running. Start frontend separately in development.");
  });
});

(async () => {
  initDb();
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log("\nBONDE Result System Backend");
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log("Database: Firebase Firestore\n");
  });
})();
