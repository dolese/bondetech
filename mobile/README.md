# Bonde OS Mobile

This folder contains a separate Expo app for the Bonde Results System mobile experience.

It is intentionally isolated from the current Vercel deployment:

- the live web app still builds from `frontend/`
- Vercel still uses the existing root `vercel.json`
- nothing in this folder changes the current web deployment target

## Intended scope

The mobile app currently targets:

- teacher mobile access
- parent mobile access
- timetable viewing
- results and history viewing
- school announcements
- secure session restore on device

## First-time setup

From the repo root:

```powershell
cd mobile
npm install
```

Then run Expo Go:

```powershell
npm run start
```

## Optional API base override

Create a local env file inside `mobile/`:

```text
EXPO_PUBLIC_API_BASE_URL=https://your-domain.example/api
```

If you do not set this, the app defaults to:

```text
https://dolese.tech/api
```

## Current mobile slice

This app now includes:

- login screen with secure session restore using `expo-secure-store`
- teacher, academic, and admin mobile staff home
- teacher schedule tab built from the saved timetable entries
- teacher class detail with class metrics and student filtering
- parent learner dashboard from the linked learner profile
- parent results-detail tab across saved exams
- parent report-style snapshot cards for latest class results
- school announcements tab from the shared Bonde homepage overview
- account tab with refresh and sign-out actions

## Recommended test flow

1. Run `npm install` inside `mobile/`.
2. Start Expo with `npm run start`.
3. Open the project in Expo Go.
4. Sign in with:
   - a teacher account to verify class scope and timetable
   - a parent account to verify linked learner results history
5. Confirm the mobile app does not affect the live web deployment.

## Next build ideas

- native navigation with screen-level stacks
- teacher marks-entry shortcuts
- parent report-card PDF access
- richer notifications and SMS-linked communication views
