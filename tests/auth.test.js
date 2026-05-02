"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  loginUser,
  createManagedUser,
  changeOwnPassword,
  listAuthLogs,
  canManageUsers,
  canManageStudents,
  canReadClassData,
} = require("../lib/auth");
const { FakeFirestore } = require("./helpers/fakeFirestore");

function withBootstrapEnv(env, fn) {
  const previous = {
    BOOTSTRAP_ADMIN_USERNAME: process.env.BOOTSTRAP_ADMIN_USERNAME,
    BOOTSTRAP_ADMIN_PASSWORD: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    BOOTSTRAP_ADMIN_DISPLAY_NAME: process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME,
  };

  if (Object.prototype.hasOwnProperty.call(env, "BOOTSTRAP_ADMIN_USERNAME")) {
    process.env.BOOTSTRAP_ADMIN_USERNAME = env.BOOTSTRAP_ADMIN_USERNAME;
  } else {
    delete process.env.BOOTSTRAP_ADMIN_USERNAME;
  }
  if (Object.prototype.hasOwnProperty.call(env, "BOOTSTRAP_ADMIN_PASSWORD")) {
    process.env.BOOTSTRAP_ADMIN_PASSWORD = env.BOOTSTRAP_ADMIN_PASSWORD;
  } else {
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
  }
  if (Object.prototype.hasOwnProperty.call(env, "BOOTSTRAP_ADMIN_DISPLAY_NAME")) {
    process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME = env.BOOTSTRAP_ADMIN_DISPLAY_NAME;
  } else {
    delete process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME;
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
}

test("first admin bootstrap requires explicit environment credentials", async () => {
  const db = new FakeFirestore();

  await withBootstrapEnv({}, async () => {
    await assert.rejects(
      () => loginUser(db, { username: "admin@bonde.go.tz", password: "Bonde@2026" }),
      /Bootstrap administrator credentials are not configured/
    );
  });
});

test("first admin bootstrap only accepts configured credentials and records failures", async () => {
  const db = new FakeFirestore();

  await withBootstrapEnv({
    BOOTSTRAP_ADMIN_USERNAME: "admin@bonde.go.tz",
    BOOTSTRAP_ADMIN_PASSWORD: "Bonde@2026",
    BOOTSTRAP_ADMIN_DISPLAY_NAME: "System Administrator",
  }, async () => {
    await assert.rejects(
      () => loginUser(db, { username: "wrong@bonde.go.tz", password: "WrongPass123" }, { ip: "127.0.0.1" }),
      /Invalid bootstrap administrator credentials/
    );

    const bootstrapped = await loginUser(
      db,
      { username: "admin@bonde.go.tz", password: "Bonde@2026", rememberMe: true },
      { ip: "127.0.0.1", userAgent: "node:test" }
    );

    assert.equal(bootstrapped.bootstrap, true);
    assert.equal(bootstrapped.user.role, "admin");
    assert.equal(bootstrapped.user.username, "admin@bonde.go.tz");
    assert.ok(bootstrapped.token);

    const logs = await db.collection("auth_logs").orderBy("createdAt", "asc").get();
    assert.equal(logs.docs.length, 2);
    assert.equal(logs.docs[0].data().status, "failed");
    assert.equal(logs.docs[0].data().action, "bootstrap");
    assert.equal(logs.docs[1].data().status, "success");
    assert.equal(logs.docs[1].data().action, "bootstrap");
  });
});

test("admin-created users must change password, and changing it clears the flag", async () => {
  const db = new FakeFirestore();
  const adminSession = await withBootstrapEnv({
    BOOTSTRAP_ADMIN_USERNAME: "admin@bonde.go.tz",
    BOOTSTRAP_ADMIN_PASSWORD: "Bonde@2026",
  }, async () => loginUser(db, {
    username: "admin@bonde.go.tz",
    password: "Bonde@2026",
  }));

  const created = await createManagedUser(db, adminSession.user, {
    username: "teacher@bonde.go.tz",
    password: "TempPass123",
    role: "teacher",
    displayName: "Teacher One",
  });

  assert.equal(created.role, "teacher");
  assert.equal(created.mustChangePassword, true);

  const teacherSession = await loginUser(db, {
    username: "teacher@bonde.go.tz",
    password: "TempPass123",
  });
  assert.equal(teacherSession.user.mustChangePassword, true);

  const changed = await changeOwnPassword(
    db,
    teacherSession.user,
    "TempPass123",
    "NewPass123"
  );

  assert.equal(changed.mustChangePassword, false);
  assert.ok(changed.passwordChangedAt);

  const authLogs = await listAuthLogs(db, adminSession.user, 20);
  assert.ok(authLogs.some((entry) => entry.username === "teacher@bonde.go.tz" && entry.status === "success"));
});

test("role capability helpers enforce admin-only user management", async () => {
  assert.equal(canManageUsers("admin"), true);
  assert.equal(canManageUsers("teacher"), false);
  assert.equal(canManageStudents("teacher"), true);
  assert.equal(canManageStudents("parent"), false);
  assert.equal(canReadClassData("teacher"), true);
  assert.equal(canReadClassData("student"), false);
});
