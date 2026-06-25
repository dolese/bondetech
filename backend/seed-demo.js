/**
 * Seeds the local Firestore EMULATOR with a realistic demo school so the portal
 * can be explored and changes verified without touching production data.
 *
 * Safe by design: it refuses to run unless FIRESTORE_EMULATOR_HOST is set
 * (pass --force only if you really mean to seed a real project).
 *
 * Run:  npm run seed:demo      (after `npm run emulators` is up)
 *
 * It creates Form I–IV with streams whose CNOs reset per stream (Stream A and
 * Stream B both start at S6509/0001) — the exact shape that used to make whole
 * streams vanish from Marks Entry — so the form counts below double as a
 * regression check:
 *   Form I  : 40   (1 stream)
 *   Form II : 123  (3 streams)   <- the 123 vs 47 case
 *   Form III: 58   (2 streams)
 *   Form IV : 107  (2 streams)   <- the 107 case
 */

// Local emulator defaults so `node backend/seed-demo.js` just works.
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "bonde-demo";

const crypto = require("node:crypto");
const { initDb, getDb } = require("./db");

const FORCE = process.argv.includes("--force");
if (!process.env.FIRESTORE_EMULATOR_HOST && !FORCE) {
  console.error("Refusing to seed: FIRESTORE_EMULATOR_HOST is not set. Start the emulator first (npm run emulators).");
  process.exit(1);
}

const CNO_PREFIX = "S6509";
const YEAR = "2026";
const EXAM = "Terminal Exam";

const SUBJECTS = ["CIV", "HIST", "GEO", "KISW", "ENG", "BIOS", "B/MATH"];

const SCHOOL_INFO = {
  name: "BONDE SECONDARY SCHOOL",
  authority: "PRESIDENT'S OFFICE - TAMISEMI",
  region: "TANGA",
  district: "MUHEZA DC",
  email: "info@bondesecondary.sc.tz",
  address: "Muheza, Tanga, Tanzania",
  postal: "P.O. Box 03 Muheza",
  exam: EXAM,
  term: "II",
  year: YEAR,
};

const FEMALE_FIRST = ["Asha", "Zainabu", "Neema", "Rehema", "Halima", "Mwajuma", "Ragma", "Mwanaisha", "Salma", "Tatu", "Fatuma", "Hawa", "Amina", "Subira", "Zulfa", "Mwanahamisi", "Rukia", "Sauda", "Joyce", "Grace", "Upendo", "Devotha", "Anna", "Maria", "Lucia"];
const MALE_FIRST = ["Juma", "Hamisi", "Bakari", "Said", "John", "Emmanuel", "Daudi", "Yusuf", "Rajabu", "Omari", "Ally", "Hassan", "Frank", "Baraka", "Erasto", "Geofrey", "Iddi", "Musa", "Peter", "Joseph", "Abdallah", "Salum", "Shabani", "Nuru", "Elia"];
const LAST = ["Hamidu", "Mrisho", "Rajabu", "Tarimo", "Natai", "Mwakyusa", "Kimaro", "Mwamba", "Shayo", "Mlay", "Massawe", "Kessy", "Mushi", "Nyerere", "Mwakalinga", "Komba", "Sanga", "Mbwana", "Chacha", "Lyimo", "Mfinanga", "Mollel", "Kileo", "Ngowi", "Materu"];

function pick(arr, i) {
  return arr[i % arr.length];
}

function makeStudents(count, streamSeedOffset) {
  // Roughly 55% female so females (lowest CNOs) come first, per the school rule.
  const femaleCount = Math.round(count * 0.55);
  const students = [];
  for (let i = 0; i < count; i += 1) {
    const isFemale = i < femaleCount;
    const firstPool = isFemale ? FEMALE_FIRST : MALE_FIRST;
    const seed = streamSeedOffset + i;
    const name = `${pick(firstPool, seed)} ${pick(LAST, seed * 3 + 1)} ${pick(LAST, seed * 7 + 2)}`.toUpperCase();
    students.push({ name, sex: isFemale ? "F" : "M" });
  }
  // Females first (alphabetical), then males (alphabetical) — matches CNO rule.
  students.sort((a, b) => {
    if (a.sex !== b.sex) return a.sex === "F" ? -1 : 1;
    return a.name.localeCompare(b.name, "en");
  });
  return students;
}

function randomScores(seed) {
  const scores = [];
  let s = seed;
  for (let i = 0; i < SUBJECTS.length; i += 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const v = 8 + (s % 88); // 8..95
    scores.push(v);
  }
  return scores;
}

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return { hash, salt, iterations };
}

const FORMS = [
  { form: "Form I", streams: [{ stream: "A", count: 40 }] },
  { form: "Form II", streams: [{ stream: "A", count: 41 }, { stream: "B", count: 41 }, { stream: "C", count: 41 }] },
  { form: "Form III", streams: [{ stream: "A", count: 30 }, { stream: "B", count: 28 }] },
  { form: "Form IV", streams: [{ stream: "A", count: 54 }, { stream: "B", count: 53 }] },
];

const DEMO_USERS = [
  { username: "admin", password: "admin1234", role: "admin", displayName: "Demo Administrator" },
  { username: "teacher", password: "teacher123", role: "teacher", displayName: "Demo Teacher" },
  // Read-only public demo account used by the homepage "Demo" button.
  { username: "demo", password: "demo", role: "demo", displayName: "Demo Visitor" },
];

async function deleteCollection(db, name) {
  const snap = await db.collection(name).get();
  const batchSize = 400;
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + batchSize)) {
      // Best-effort subcollection cleanup for classes/students.
      const studentsSnap = await doc.ref.collection("students").get().catch(() => null);
      if (studentsSnap) studentsSnap.docs.forEach((s) => batch.delete(s.ref));
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

async function seed() {
  initDb();
  const db = getDb();

  console.log(`Seeding demo data into project "${process.env.FIREBASE_PROJECT_ID}" via emulator ${process.env.FIRESTORE_EMULATOR_HOST}...`);

  await deleteCollection(db, "classes");
  await deleteCollection(db, "users");
  await deleteCollection(db, "auth_logs");

  // Users
  const now = new Date().toISOString();
  for (const u of DEMO_USERS) {
    await db.collection("users").doc(u.username.toLowerCase()).set({
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      email: "",
      phone: "",
      linkedIndexNo: "",
      linkedStudents: [],
      active: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      createdBy: "seed",
      mustChangePassword: false,
      passwordChangedAt: now,
      password: passwordHash(u.password),
    });
  }

  const summary = [];
  for (const f of FORMS) {
    const formSummary = { form: f.form, total: 0, streams: [] };
    for (const s of f.streams) {
      const students = makeStudents(s.count, f.form.length * 100 + s.stream.charCodeAt(0));
      const classRef = await db.collection("classes").add({
        name: `${f.form} ${s.stream}`,
        form: f.form,
        stream: s.stream,
        year: YEAR,
        subjects: SUBJECTS,
        school_info: { ...SCHOOL_INFO, form: f.form },
        published: true,
        archived: false,
        student_count: students.length,
        cno_counter: students.length,
        created_at: now,
      });

      let n = 0;
      for (const st of students) {
        n += 1;
        const cno = `${CNO_PREFIX}/${String(n).padStart(4, "0")}`; // resets per stream
        const scores = randomScores(n + s.stream.charCodeAt(0) * 7);
        await classRef.collection("students").add({
          name: st.name,
          sex: st.sex,
          index_no: cno,
          admission_no: "",
          status: "present",
          exam_scores: { [EXAM]: scores },
          scores,
          parentName: `${st.name.split(" ")[1]} ${st.name.split(" ")[2] || ""}`.trim(),
          parentPhone: `2557${String(60000000 + (n * 37 + s.stream.charCodeAt(0) * 911) % 39999999)}`,
          created_at: now,
        });
      }
      formSummary.streams.push({ stream: s.stream, count: students.length });
      formSummary.total += students.length;
    }
    summary.push(formSummary);
  }

  console.log("\nDemo data seeded. Per-form roster (Marks Entry / All Streams should match these):");
  summary.forEach((f) => {
    const detail = f.streams.map((s) => `${s.stream}:${s.count}`).join("  ");
    console.log(`  ${f.form.padEnd(8)} total ${String(f.total).padStart(3)}   [${detail}]`);
  });
  console.log("\nLogin accounts:");
  DEMO_USERS.forEach((u) => console.log(`  ${u.username.padEnd(8)} / ${u.password.padEnd(10)} (${u.role})`));
  console.log("");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
