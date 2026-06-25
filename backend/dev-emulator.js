// Runs the local API server against the Firestore emulator.
// Sets safe local defaults so `npm run dev:api` works with no .env on Windows,
// macOS, or Linux. Override any of these by exporting them before running.
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "bonde-demo";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "local-emulator-dev-secret";

// eslint-disable-next-line no-console
console.log(`[dev] Using Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST} (project ${process.env.FIREBASE_PROJECT_ID})`);

require("./server.js");
