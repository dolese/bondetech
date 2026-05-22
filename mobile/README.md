# Bonde OS Mobile

This folder contains the Android mobile app for the Bonde Results System.

It is intentionally isolated from the current Vercel deployment:

- the live web app still builds from `frontend/`
- Vercel still uses the existing root `vercel.json`
- nothing in this folder changes the current web deployment target

## Platform target

- Android only
- Android Studio workflow
- direct Android device / emulator testing
- Android APK/AAB release preparation

The iOS and web targets have been removed from this mobile app configuration.

## Intended scope

The Android app currently targets:

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

## Android Studio workflow

Generate the native Android project:

```powershell
npm run prebuild:android
```

Then open this folder in Android Studio:

- `C:\Users\dolese enterprises\Desktop\asset\SCHOOL\bondetech-main\mobile\android`

From there you can:

- run on emulator or connected device
- build debug APK
- generate signed APK/AAB

You can also run directly from Expo's native Android command:

```powershell
npm run run:android
```

If you only need Metro running:

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

## Recommended Android test flow

1. Run `npm install` inside `mobile/`.
2. Run `npm run prebuild:android`.
3. Open `mobile/android` in Android Studio.
4. Run the app on an Android emulator or real Android device.
5. Sign in with:
   - a teacher account to verify class scope and timetable
   - a parent account to verify linked learner results history
6. Confirm the Android app does not affect the live web deployment.

## Next build ideas

- signed APK/AAB generation profiles
- push notifications for Android
- native navigation with screen-level stacks
- teacher marks-entry shortcuts
- parent report-card PDF access
- richer notifications and SMS-linked communication views
