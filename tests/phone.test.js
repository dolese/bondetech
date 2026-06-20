"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeTzPhone } = require("../lib/phone");

test("normalizes common Tanzania mobile phone formats", () => {
  assert.equal(normalizeTzPhone("0712 345 678"), "255712345678");
  assert.equal(normalizeTzPhone("+255 712 345 678"), "255712345678");
  assert.equal(normalizeTzPhone("712345678"), "255712345678");
  assert.equal(normalizeTzPhone("0659 123 456"), "255659123456");
});

test("rejects empty, incomplete, and non-mobile phone numbers", () => {
  assert.equal(normalizeTzPhone(""), "");
  assert.equal(normalizeTzPhone("0712"), "");
  assert.equal(normalizeTzPhone("255221234567"), "");
});
