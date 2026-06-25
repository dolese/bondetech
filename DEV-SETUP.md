# Local development with the Firestore emulator

Run the whole portal locally against the **Firestore emulator** with realistic
seeded data — no production credentials, nothing touches the live database.

## Prerequisites (one time)

- Node.js 18+
- Java 11+ (the Firestore emulator needs a JVM)
- Firebase CLI: `npm i -g firebase-tools`

## Start it (three terminals)

```bash
# 1. Firestore emulator (Firestore on :8080, emulator UI on :4000)
npm run emulators

# 2. Seed the demo school (Form I–IV, streams, CNOs, marks, demo logins)
npm run seed:demo

# 3. Local API server (Express on :5000, auto-points at the emulator)
npm run dev:api
```

Then start the frontend (it proxies `/api` to `:5000`):

```bash
cd frontend && npm start    # http://localhost:3000
```

## Demo logins (created by the seed)

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `admin1234`| admin |
| `teacher`| `teacher123`| teacher |
| `demo`   | `demo`     | demo (read-only) |

The homepage **Demo** button signs in as `demo` automatically.

## What the seed proves

The seeded roster reproduces the reported scenarios, so the counts are a quick
regression check (open Marks Entry → *All Streams*):

| Form    | Total | Streams |
|---------|-------|---------|
| Form I  | 40    | A |
| Form II | 123   | A, B, C |
| Form III| 58    | A, B |
| Form IV | 107   | A, B |

CNOs **reset per stream** (Stream A and B both start `S6509/0001`) — the exact
shape that used to collapse the roster. If Form II shows 123 and Form IV shows
107, the dedup fix is working. Marks Entry renders the per-form sequential CNO
(`displayIndexNo`, 0001…N), matching the Result Sheet and Report Card.

To see the workspace diagnostics in the browser console:

```js
window.__BONDE_DEBUG_WORKSPACE = true;
```

## Notes

- `npm run seed:demo` **wipes and rebuilds** `classes`, `users`, and `auth_logs`
  in the emulator. It refuses to run unless `FIRESTORE_EMULATOR_HOST` is set
  (pass `--force` only if you deliberately target a real project).
- The emulator state is in-memory; it resets when you stop `npm run emulators`.
  Re-run `npm run seed:demo` after each restart.
