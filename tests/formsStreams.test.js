"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createClassRecord,
  deleteClassRecord,
  restoreClassRecord,
  updateClassRecord,
} = require("../lib/classes");
const {
  assignUnassignedStudentsToClass,
  bulkMoveStudentsToClass,
  listUnassignedStudents,
  unassignStudentsFromStreams,
} = require("../lib/classStudents");
const { FakeFirestore } = require("./helpers/fakeFirestore");

function createPlacementDb({ targetCapacity = 50 } = {}) {
  return new FakeFirestore({
    classes: {
      form1a: {
        name: "Form I A 2026",
        year: "2026",
        form: "Form I",
        stream: "A",
        stream_capacity: 50,
        stream_status: "active",
        subjects: ["ENG", "MATH"],
        student_count: 1,
        cno_counter: 1,
        __collections: {
          students: {
            student_1: {
              index_no: "S6509/0001",
              admission_no: "BSS-2026-0001",
              name: "Asha",
              sex: "F",
              status: "present",
              exam_scores: { "March Exam": [70, 80] },
              scores: [70, 80],
            },
          },
        },
      },
      form1b: {
        name: "Form I B 2026",
        year: "2026",
        form: "Form I",
        stream: "B",
        stream_capacity: targetCapacity,
        stream_status: "active",
        subjects: ["ENG", "MATH"],
        student_count: 0,
        cno_counter: 0,
      },
    },
  });
}

test("stream creation stores metadata and prevents duplicate letters within one form", async () => {
  const db = new FakeFirestore();
  const created = await createClassRecord(db, {
    year: "2026",
    form: "Form I",
    stream: "A",
    streamCapacity: 45,
    classTeacher: "Jane Teacher",
    streamStatus: "active",
  });

  assert.equal(created.streamCapacity, 45);
  assert.equal(created.classTeacher, "Jane Teacher");
  await assert.rejects(
    createClassRecord(db, { year: "2026", form: "Form I", stream: "A", streamCapacity: 50 }),
    /already exists/i,
  );
  const otherForm = await createClassRecord(db, { year: "2026", form: "Form II", stream: "A", streamCapacity: 50 });
  assert.equal(otherForm.stream, "A");
});

test("an archived stream letter can be reused in the same form and year", async () => {
  const db = new FakeFirestore();
  const archived = await createClassRecord(db, { year: "2026", form: "Form II", stream: "A", streamCapacity: 50 });
  await deleteClassRecord(db, archived.id);

  const replacement = await createClassRecord(db, { year: "2026", form: "Form II", stream: "A", streamCapacity: 50 });
  assert.equal(replacement.stream, "A");
  await assert.rejects(restoreClassRecord(db, archived.id), /already exists/i);
});

test("a permanently deleted stream letter can be recreated immediately", async () => {
  const db = new FakeFirestore();
  const created = await createClassRecord(db, { year: "2026", form: "Form II", stream: "A", streamCapacity: 50 });
  const deleted = await deleteClassRecord(db, created.id, { permanent: true });

  assert.equal(deleted.deleted, true);
  const replacement = await createClassRecord(db, { year: "2026", form: "Form II", stream: "A", streamCapacity: 40 });
  assert.equal(replacement.stream, "A");
  assert.equal(replacement.streamCapacity, 40);
});

test("streams with students cannot be disabled, undersized, or archived", async () => {
  const db = createPlacementDb();
  await assert.rejects(updateClassRecord(db, "form1a", { streamStatus: "inactive" }), /move all students/i);
  await assert.rejects(updateClassRecord(db, "form1a", { streamCapacity: 0 }), /capacity/i);
  await assert.rejects(deleteClassRecord(db, "form1a"), /move all students/i);
});

test("historical archived classes with students cannot be restored", async () => {
  const db = createPlacementDb();
  await db.collection("classes").doc("form1a").update({ archived: true });
  await assert.rejects(restoreClassRecord(db, "form1a"), /historical records/i);
});

test("bulk stream assignment moves the student and updates both counts", async () => {
  const db = createPlacementDb();
  const result = await bulkMoveStudentsToClass(
    db,
    [{ sourceClassId: "form1a", studentId: "student_1" }],
    "form1b",
  );

  assert.equal(result.moved, 1);
  const source = await db.collection("classes").doc("form1a").get();
  const target = await db.collection("classes").doc("form1b").get();
  assert.equal(source.data().student_count, 0);
  assert.equal(target.data().student_count, 1);
  const sourceStudent = await db.collection("classes").doc("form1a").collection("students").doc("student_1").get();
  assert.equal(sourceStudent.exists, false);
  const targetStudents = await db.collection("classes").doc("form1b").collection("students").get();
  assert.equal(targetStudents.docs.length, 1);
  assert.equal(targetStudents.docs[0].data().admission_no, "BSS-2026-0001");
});

test("unassigned students can be returned to an active stream", async () => {
  const db = createPlacementDb();
  await unassignStudentsFromStreams(db, [{ sourceClassId: "form1a", studentId: "student_1" }]);
  const queue = await listUnassignedStudents(db, { year: "2026", form: "Form I" });
  assert.equal(queue.length, 1);

  const result = await assignUnassignedStudentsToClass(db, [queue[0].id], "form1b");
  assert.equal(result.assigned, 1);
  const remaining = await listUnassignedStudents(db, { year: "2026", form: "Form I" });
  assert.equal(remaining.length, 0);
  const targetStudents = await db.collection("classes").doc("form1b").collection("students").get();
  assert.equal(targetStudents.docs.length, 1);
});
