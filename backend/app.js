const express = require("express");
const cors = require("cors");
const dns = require("node:dns").promises;
const { initDb, getDb } = require("./db");

const app = express();

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

let readyPromise = null;

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
}

async function ensureAppReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      initDb();
      await seedIfEmpty();
    })().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }

  return readyPromise;
}

app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }));
app.use(express.json({ limit: "5mb" }));

app.use(async (req, res, next) => {
  try {
    await ensureAppReady();
    next();
  } catch (err) {
    next(err);
  }
});

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

app.get("/api/backup", async (req, res) => {
  try {
    const db = getDb();
    const classesSnap = await db.collection("classes").orderBy("created_at", "asc").get();

    const classes = await Promise.all(
      classesSnap.docs.map(async (classDoc) => {
        const cls = { id: classDoc.id, ...classDoc.data() };
        const studentsSnap = await classDoc.ref.collection("students").orderBy("index_no", "asc").get();
        cls.students = studentsSnap.docs.map((studentDoc) => ({
          id: studentDoc.id,
          ...studentDoc.data(),
        }));
        return cls;
      })
    );

    res.json({
      exportedAt: new Date().toISOString(),
      version: 1,
      classes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/restore", async (req, res) => {
  try {
    if (!Array.isArray(req.body?.classes)) {
      return res.status(400).json({ error: "classes must be an array" });
    }

    const db = getDb();
    let created = 0;
    let skipped = 0;

    for (const cls of req.body.classes) {
      if (!cls.id) {
        skipped += 1;
        continue;
      }

      const classRef = db.collection("classes").doc(cls.id);
      const existingSnap = await classRef.get();

      if (existingSnap.exists) {
        skipped += 1;
      } else {
        const { students: _students, id: _id, ...classData } = cls;
        await classRef.set(classData);
        created += 1;
      }

      const students = Array.isArray(cls.students) ? cls.students : [];
      for (let i = 0; i < students.length; i += 400) {
        const batch = db.batch();
        students.slice(i, i + 400).forEach((student) => {
          if (!student.id) return;
          const { id: _sid, ...studentData } = student;
          const ref = classRef.collection("students").doc(student.id);
          batch.set(ref, studentData, { merge: true });
        });
        await batch.commit();
      }
    }

    res.json({ created, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), app: "BONDE Result System" });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || "Server error" });
});

module.exports = { app, ensureAppReady };
