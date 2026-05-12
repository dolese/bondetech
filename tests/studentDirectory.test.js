"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { getStudentProfileByAdmissionNo } = require("../lib/studentDirectory");
const { FakeFirestore } = require("./helpers/fakeFirestore");

test("student profile preserves the stored sex from matching student records", async () => {
  const db = new FakeFirestore({
    classes: {
      class_1: {
        name: "Form I 2026",
        year: "2026",
        form: "Form I",
        subjects: ["ENG", "MATH"],
        __collections: {
          students: {
            student_1: {
              admission_no: "ADM-0007",
              index_no: "S6509/0007",
              name: "Neema",
              sex: "F",
              status: "present",
              exam_scores: {
                "March Exam": [71, 68],
              },
            },
          },
        },
      },
      class_2: {
        name: "Form II 2027",
        year: "2027",
        form: "Form II",
        subjects: ["ENG", "MATH"],
        __collections: {
          students: {
            student_2: {
              admission_no: "ADM-0007",
              index_no: "S6509/0007",
              name: "Neema",
              sex: "F",
              status: "present",
              exam_scores: {
                "March Exam": [73, 75],
              },
            },
          },
        },
      },
    },
  });

  const profile = await getStudentProfileByAdmissionNo(db, "ADM-0007");

  assert.equal(profile.name, "Neema");
  assert.equal(profile.admissionNo, "ADM-0007");
  assert.equal(profile.sex, "F");
  assert.equal(profile.entries.length, 2);
  assert.deepEqual(
    profile.entries.map((entry) => entry.form),
    ["Form I", "Form II"]
  );
});
