---
name: testing-timetable-login
description: End-to-end UI test for the Bonde results app — login card styling and the Master Timetable grid. Use when verifying timetable/master-view styling or login page changes.
---

# Testing the Timetable + Login UI

End-to-end browser test for `frontend/` (Create React App) covering the Login page and the
Master Timetable ("Master View") styling.

## Why a local harness is needed

- The Vercel preview is behind Vercel SSO and returns `401`, so it cannot be driven by the
  test browser. Test against the local dev server instead.
- The real backend (`db.js`) throws unless `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` /
  `FIREBASE_PRIVATE_KEY` are set. These are not available in Devin sessions.
- Workaround: a temporary local API (`.devin-test-api.js`) backed by the repo's
  `tests/helpers/fakeFirestore.js` + the real `lib/auth.js`. It bootstraps an admin and seeds
  8 classes (Form I–IV, streams A/B) with timetable entries that exercise every visual state
  (subjects, break, lunch, activities, empty cells). This file is test-only — do NOT commit it.

## Setup

1. Start the test API on port 5000 (it is ephemeral; rebuild it if missing from
   `FakeFirestore` + `lib/auth`):
   ```bash
   cd /home/ubuntu/bondetech && node .devin-test-api.js   # background shell
   ```
2. The CRA dev server proxies `/api` to `http://localhost:5000` via `frontend/package.json`
   `"proxy"`. Start it:
   ```bash
   cd frontend && BROWSER=none PORT=3000 npm start
   ```
3. Verify the API before driving the UI:
   ```bash
   curl -s -X POST localhost:5000/api/auth/login -H 'content-type: application/json' \
     -d '{"username":"admin@bonde.test","password":"BondeTest2026!","rememberMe":true}'
   ```
   Bootstrap creds: `admin@bonde.test` / `BondeTest2026!`.

## Test flow (record this in the browser)

1. Open `http://localhost:3000/login`. Note: `curl localhost:3000/login` may 404 (SPA routing);
   the route works in-browser. Use `/login`, not `/#login`.
2. Login card checks: navy→gold top accent stripe, blue gradient LOGIN button, frosted-glass
   rounded Back pill. Zoom in (`computer` zoom) to read the stripe/gradient.
3. Type creds, click LOGIN. A "Welcome to Bonde Results" onboarding popup appears — click
   "Skip" before navigating.
4. Sidebar → "Timetable" (Academics section). URL becomes `localhost:3000/#timetable`.
5. Click the "Master View" tab (default tab is "Class Timetable").
6. Verify the Master grid styling.

## Verifying styling rigorously

Visual zoom is good for the user-facing recording, but confirm exact colors via the console
(`browser_console`) — read computed styles and assert hex/rgb. Wrap output in `console.log`
(the tool only surfaces logged output, the eval result shows `undefined`). Expected values:

| Selector | Property | Expected |
|---|---|---|
| `.mt-head-cell` | background / color | `rgb(46,84,150)` (#2e5496) / white |
| `.mt-shared--break` | background | `rgb(254,243,199)` (#fef3c7) amber |
| `.mt-shared--activity` | background | `rgb(220,252,231)` (#dcfce7) green |
| `.mt-day-label` | writing-mode / transform | `vertical-rl` / 180° rotate |
| `.mt-row--even` / `--odd` body cell | background | `#fff` / `rgb(248,250,252)` |
| `.mt-subject` | font-weight | `700` |

Master timetable styling lives in `frontend/src/components/Timetable/Timetable.css`
(`.mt-*` classes); markup in `frontend/src/components/Timetable/MasterTimetable.jsx`.
Login styling in `frontend/src/components/LoginPage.jsx`.

## Reporting

- One consolidated PR comment with `<details>`/`<summary>`, pre-expanding the Master Timetable
  section. Include the computed-CSS table as evidence and the Devin session link.
- Attach the recording and a `test-report.md` with inline screenshots.

## Devin Secrets Needed

- None. The local harness avoids Firebase entirely. (If you ever need to hit the real backend,
  it requires `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.)
