"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { updateClassRecord } = require("../lib/classes");
const { FakeFirestore } = require("./helpers/fakeFirestore");

test("updating class subjects remaps legacy and exam-specific scores without losing alignment", async () => {
  const db = new FakeFirestore({
    classes: {
      class_1: {
        name: "Form II 2026",
        year: "2026",
        form: "Form II",
        subjects: ["ENG", "MATH", "SCI"],
        student_count: 1,
        __collections: {
          students: {
            student_1: {
              index_no: "S6509/0001",
              name: "Amina",
              scores: [11, 22, 33],
              exam_scores: {
                "March Exam": [11, 22, 33],
                "April Exam": [44, 55, 66],
              },
            },
          },
        },
      },
    },
  });

  const updatedClass = await updateClassRecord(db, "class_1", {
    subjects: ["MATH", "SCI", "ENG", "CIV"],
  });

  assert.deepEqual(updatedClass.subjects, ["MATH", "SCI", "ENG", "CIV"]);

  const studentSnap = await db.collection("classes").doc("class_1").collection("students").doc("student_1").get();
  const student = studentSnap.data();

  assert.deepEqual(student.scores, [22, 33, 11, ""]);
  assert.deepEqual(student.exam_scores["March Exam"], [22, 33, 11, ""]);
  assert.deepEqual(student.exam_scores["April Exam"], [55, 66, 44, ""]);
});
