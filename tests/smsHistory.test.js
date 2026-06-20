"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildSmsLogEntry,
  refreshPendingSmsHistory,
} = require("../lib/smsHistory");
const { normalizeRecipients } = require("../lib/beemSms");
const { FakeFirestore } = require("./helpers/fakeFirestore");

test("SMS history keeps one delivery record per student", () => {
  const entry = buildSmsLogEntry({
    body: {
      recipients: [
        { admissionNo: "BSS-2026-0001", studentName: "Asha", phone: "255712345678" },
        { admissionNo: "BSS-2026-0001", studentName: "Asha", phone: "255713333333" },
      ],
    },
    result: {
      successful: true,
      totalRequested: 1,
      valid: 1,
      results: [{ requestId: "req-1", recipientPhones: ["255712345678"] }],
    },
  });

  assert.equal(entry.deliveries.length, 1);
  assert.equal(entry.deliveries[0].phone, "255712345678");
  assert.equal(entry.deliveries[0].request_id, "req-1");
  assert.equal(entry.pending, 1);
});

test("Beem recipient normalization keeps one phone number per student", () => {
  const recipients = normalizeRecipients([
    { admissionNo: "BSS-2026-0001", phone: "0712345678" },
    { admissionNo: "BSS-2026-0001", phone: "0755555555" },
    { admissionNo: "BSS-2026-0002", phone: "0766666666" },
  ]);

  assert.deepEqual(
    recipients.map((entry) => entry.dest_addr),
    ["255712345678", "255766666666"],
  );
});

test("pending SMS history is updated from a delivery report", async () => {
  const db = new FakeFirestore({
    sms_logs: {
      log_1: {
        created_at: "2026-01-01T00:00:00.000Z",
        gateway_status: "pending",
        deliveries: [
          {
            key: "admission:BSS-2026-0001",
            phone: "255712345678",
            request_id: "req-1",
            status: "pending",
            provider_status: "PENDING",
          },
        ],
      },
    },
  });

  const result = await refreshPendingSmsHistory(db, {
    minAgeMs: 0,
    getDeliveryReport: async () => ({ status: "delivered", providerStatus: "DELIVERED" }),
  });

  assert.equal(result.checked, 1);
  assert.equal(result.updated, 1);
  const updated = await db.collection("sms_logs").doc("log_1").get();
  assert.equal(updated.data().gateway_status, "delivered");
  assert.equal(updated.data().delivered, 1);
  assert.equal(updated.data().pending, 0);
});
