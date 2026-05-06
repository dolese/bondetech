"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_EXAM_TYPE,
  createStudentRecord,
  updateStudentRecord,
  bulkImportStudents,
  reorderStudentsBySexAndRegenerateCnos,
} = require("../lib/classStudents");
const { FakeFirestore } = require("./helpers/fakeFirestore");

function createSeedDb() {
  return new FakeFirestore({
    classes: {
      class_1: {
        name: "Form II 2026",
        year: "2026",
        form: "Form II",
        subjects: ["ENG", "MATH"],
        student_count: 1,
        cno_counter: 1,
        __collections: {
          students: {
            student_1: {
              index_no: "S6509/0001",
              name: "Baraka",
              sex: "M",
              status: "present",
              scores: [81, 72],
              exam_scores: {
                [DEFAULT_EXAM_TYPE]: [81, 72],
              },
              remarks: "",
              created_at: "2026-01-01T00:00:00.000Z",
            },
          },
        },
      },
    },
  });
}

test("creating a student for the default exam also stores the legacy top-level scores", async () => {
  const db = createSeedDb();

  const created = await createStudentRecord(db, "class_1", {
    name: "Neema",
    scores: [66, 77],
  });

  assert.equal(created.name, "Neema");
  assert.deepEqual(created.scores, [66, 77]);

  const stored = await db.collection("classes").doc("class_1").collection("students").doc(created.id).get();
  assert.deepEqual(stored.data().scores, [66, 77]);
  assert.deepEqual(stored.data().exam_scores[DEFAULT_EXAM_TYPE], [66, 77]);
});

test("updating a non-default exam keeps the default exam in top-level scores", async () => {
  const db = createSeedDb();

  await updateStudentRecord(db, "class_1", "student_1", {
    examType: "April Exam",
    scores: [33, 44],
    _updatedBy: "admin@bonde.go.tz",
  });

  const updated = await db.collection("classes").doc("class_1").collection("students").doc("student_1").get();
  assert.deepEqual(updated.data().scores, [81, 72]);
  assert.deepEqual(updated.data().exam_scores[DEFAULT_EXAM_TYPE], [81, 72]);
  assert.deepEqual(updated.data().exam_scores["April Exam"], [33, 44]);

  const auditLogs = await db.collection("audit_logs").get();
  assert.equal(auditLogs.empty, false);
});

test("bulk import updates an alternate exam without bleeding marks into the default exam", async () => {
  const db = createSeedDb();

  const result = await bulkImportStudents(
    db,
    "class_1",
    [
      {
        indexNo: "S6509/0001",
        name: "Baraka",
        sex: "M",
        status: "present",
        scores: [15, 25],
      },
    ],
    "April Exam"
  );

  assert.equal(result.updated, 1);

  const updated = await db.collection("classes").doc("class_1").collection("students").doc("student_1").get();
  assert.deepEqual(updated.data().scores, [81, 72]);
  assert.deepEqual(updated.data().exam_scores[DEFAULT_EXAM_TYPE], [81, 72]);
  assert.deepEqual(updated.data().exam_scores["April Exam"], [15, 25]);
});

test("bulk import updates existing students by CNO and creates only new rows", async () => {
  const db = createSeedDb();

  const result = await bulkImportStudents(
    db,
    "class_1",
    [
      {
        indexNo: "S6509/0001",
        name: "Baraka Updated",
        sex: "M",
        status: "present",
        scores: [91, 82],
      },
      {
        indexNo: "",
        name: "Asha",
        sex: "F",
        status: "present",
        scores: [55, 65],
      },
      {
        indexNo: "",
        name: "Juma",
        sex: "M",
        status: "present",
        scores: [45, 35],
      },
    ],
    DEFAULT_EXAM_TYPE
  );

  assert.equal(result.updated, 1);
  assert.equal(result.created, 2);

  const students = await db.collection("classes").doc("class_1").collection("students").get();
  assert.equal(students.docs.length, 3);

  const byName = Object.fromEntries(students.docs.map((doc) => [doc.data().name, doc.data()]));
  assert.equal(byName["Baraka Updated"].index_no, "S6509/0001");
  assert.equal(byName["Asha"].index_no, "S6509/0002");
  assert.equal(byName["Juma"].index_no, "S6509/0003");
});

test("reorder action sorts female students first and regenerates sequential CNO values", async () => {
  const db = createSeedDb();

  await createStudentRecord(db, "class_1", {
    name: "Zainabu",
    sex: "F",
    scores: [74, 84],
  });
  await createStudentRecord(db, "class_1", {
    name: "Amina",
    sex: "F",
    scores: [64, 54],
  });

  const result = await reorderStudentsBySexAndRegenerateCnos(db, "class_1");

  assert.equal(result.total, 3);
  assert.equal(result.femaleCount, 2);
  assert.equal(result.maleCount, 1);

  const students = await db.collection("classes").doc("class_1").collection("students").get();
  const ordered = students.docs
    .map((doc) => doc.data())
    .sort((left, right) => left.index_no.localeCompare(right.index_no, "en"));

  assert.deepEqual(
    ordered.map((student) => [student.index_no, student.name, student.sex]),
    [
      ["S6509/0001", "Zainabu", "F"],
      ["S6509/0002", "Amina", "F"],
      ["S6509/0003", "Baraka", "M"],
    ]
  );
});
