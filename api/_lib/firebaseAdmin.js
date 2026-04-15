const admin = require("firebase-admin");

let app;

const getPrivateKey = () => {
  const raw = process.env.FIREBASE_PRIVATE_KEY || "";
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
};

const initApp = () => {
  if (app) return app;

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Missing Firebase environment variables");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey(),
    }),
  });

  return app;
};

const getDb = () => {
  initApp();
  return admin.firestore();
};

module.exports = { getDb };
