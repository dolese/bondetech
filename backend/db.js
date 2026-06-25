const admin = require("firebase-admin");

let app;

const getPrivateKey = () => {
  const raw = process.env.FIREBASE_PRIVATE_KEY || "";
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
};

const initDb = () => {
  if (app) return;

  // Local development against the Firestore emulator: the Admin SDK auto-routes
  // all traffic to FIRESTORE_EMULATOR_HOST, so no service-account credentials
  // are needed — only a project id to namespace the data.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    app = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "bonde-demo",
    });
    return;
  }

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error(
      "Missing Firebase environment variables. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY " +
        "(or set FIRESTORE_EMULATOR_HOST to use the local emulator)."
    );
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey(),
    }),
  });
};

const getDb = () => {
  if (!app) initDb();
  return admin.firestore();
};

module.exports = { initDb, getDb };

