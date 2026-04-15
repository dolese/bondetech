const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "bonde_results.db");

let db = null;
let SQL = null;

// Initialize database
async function initDb() {
  SQL = await initSqlJs();
  
  let data = null;
  if (fs.existsSync(DB_PATH)) {
    data = fs.readFileSync(DB_PATH);
  }
  
  db = data ? new SQL.Database(data) : new SQL.Database();
  
  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON");
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS classes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL DEFAULT 'New Class',
      school_info TEXT  NOT NULL DEFAULT '{}',
      subjects  TEXT   NOT NULL DEFAULT '[]',
      year      TEXT   NOT NULL DEFAULT '2026',
      form      TEXT   NOT NULL DEFAULT 'Form I',
      created_at TEXT  NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      index_no   TEXT    NOT NULL DEFAULT '',
      name       TEXT    NOT NULL DEFAULT '',
      stream     TEXT    NOT NULL DEFAULT '',
      sex        TEXT    NOT NULL DEFAULT 'M',
      status     TEXT    NOT NULL DEFAULT 'present',
      scores     TEXT    NOT NULL DEFAULT '[]',
      created_at TEXT   NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
  `);

  const ensureColumn = (table, column, definition) => {
    const info = db.exec(`PRAGMA table_info(${table})`);
    const columns = info.length ? info[0].values.map(row => row[1]) : [];
    if (!columns.includes(column)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  ensureColumn("classes", "year", "TEXT NOT NULL DEFAULT '2026'");
  ensureColumn("classes", "form", "TEXT NOT NULL DEFAULT 'Form I'");
  ensureColumn("students", "stream", "TEXT NOT NULL DEFAULT ''");

  const classInfo = db.exec("SELECT id, school_info, year, form FROM classes");
  if (classInfo.length) {
    const rows = classInfo[0].values;
    rows.forEach((row) => {
      const [id, schoolInfoRaw, year, form] = row;
      let schoolInfo = {};
      try {
        schoolInfo = JSON.parse(schoolInfoRaw || "{}");
      } catch {
        schoolInfo = {};
      }
      const nextYear = year || schoolInfo.year || "2026";
      const nextForm = form || schoolInfo.form || "Form I";
      if (!schoolInfo.exam) {
        schoolInfo.exam = "Midterm";
      }
      db.run("UPDATE classes SET year = ?, form = ? WHERE id = ?", [nextYear, nextForm, id]);
      db.run("UPDATE classes SET school_info = ? WHERE id = ?", [JSON.stringify(schoolInfo), id]);
    });
    saveDb();
  }

  const DEFAULT_SUBJECTS = [
    "CIV", "HTZ", "HIST", "GEO", "KISW",
    "ENG", "BIOS", "B/MATH", "CHEM", "PHYS", "BS",
  ];

  const migrateSubjects = () => {
    const result = db.exec("SELECT id, subjects FROM classes");
    if (!result.length) return;
    const rows = result[0].values;
    let changed = false;

    rows.forEach(([classId, subjectsRaw]) => {
      let oldSubjects = [];
      try {
        oldSubjects = JSON.parse(subjectsRaw || "[]");
      } catch {
        oldSubjects = [];
      }

      const oldJson = JSON.stringify(oldSubjects);
      const newJson = JSON.stringify(DEFAULT_SUBJECTS);
      if (oldJson === newJson) return;

      const students = db.exec("SELECT id, scores FROM students WHERE class_id = ?", [classId]);
      if (students.length) {
        students[0].values.forEach(([studentId, scoresRaw]) => {
          let oldScores = [];
          try {
            oldScores = JSON.parse(scoresRaw || "[]");
          } catch {
            oldScores = [];
          }
          const newScores = DEFAULT_SUBJECTS.map((subj) => {
            const oldIdx = oldSubjects.indexOf(subj);
            return oldIdx >= 0 ? (oldScores[oldIdx] ?? "") : "";
          });
          db.run("UPDATE students SET scores = ? WHERE id = ?", [JSON.stringify(newScores), studentId]);
        });
      }

      db.run("UPDATE classes SET subjects = ? WHERE id = ?", [newJson, classId]);
      changed = true;
    });

    if (changed) {
      saveDb();
      console.log("✅ Subjects migrated to default order.");
    }
  };

  migrateSubjects();
  
  // Seed default class if empty
  const countResult = db.exec("SELECT COUNT(*) as c FROM classes");
  const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
  
  if (count === 0) {
    const defaultInfo = JSON.stringify({
      name: "BONDE SECONDARY SCHOOL",
      authority: "PRIME MINISTER'S OFFICE",
      region: "TANGA",
      district: "MUHEZA DC",
      form: "Form I",
      term: "I",
      exam: "Mid-Term Exam",
      year: "2026",
    });
    const defaultSubjects = JSON.stringify(DEFAULT_SUBJECTS);
    db.run(
      "INSERT INTO classes (name, school_info, subjects, year, form) VALUES (?, ?, ?, ?, ?)",
      ["Form I", defaultInfo, defaultSubjects, "2026", "Form I"]
    );
    saveDb();
    console.log("✅ Default class created.");
  }
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

module.exports = {
  initDb,
  getDb: () => db,
  saveDb,
};
