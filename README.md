# 🎓 BONDE SEC SCHOOL — Result System

A full-stack school result management system built with **Node.js + Express + Firebase Firestore** (backend) and **React** (frontend).
Includes a **serverless API** powered by **Firebase (Firestore)** for Vercel deployments.

---

## 📁 Project Structure

```
bonde-results/
├── api/              ← Vercel serverless API (Firebase)
│   ├── classes/      ← Serverless class + student routes
│   └── _lib/         ← Firebase helpers
├── backend/          ← Node.js API + Firebase Firestore database
│   ├── server.js     ← Main Express server
│   ├── db.js         ← Firebase Admin SDK setup
│   ├── routes/
│   │   └── classes.js  ← All API routes
│   └── package.json
│
├── frontend/         ← React app
│   ├── src/
│   │   ├── App.jsx   ← Full UI
│   │   ├── api.js    ← API helper functions
│   │   └── index.js  ← Entry point
│   ├── public/
│   │   └── index.html
│   └── package.json
│
└── README.md
```

---

## 🚀 Setup & Run (Step by Step)

### Prerequisites
- Install **Node.js** from https://nodejs.org (LTS version)
- A **Firebase project** with Firestore enabled (see [Firebase setup](#-firebase-setup) below)

---

### Step 1 — Configure Backend Environment

Copy the example env file and fill in your Firebase credentials:

```bash
cd bonde-results/backend
copy .env.example .env
```

Edit `.env` and set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

### Step 2 — Install Backend

```bash
npm install
```

### Step 3 — Start Backend

```bash
npm start
```

You should see:
```
🎓 BONDE Result System Backend
✅ Server running at http://localhost:5000
📦 API available at http://localhost:5000/api
🔥 Database: Firebase Firestore
```

---

### Step 4 — Install Frontend (in a new terminal window)

```bash
cd bonde-results/frontend
npm install
```

### Step 5 — Start Frontend

```bash
npm start
```

Your browser will open automatically at **http://localhost:3000**

---

## 🌐 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET    | /api/classes | List all classes |
| POST   | /api/classes | Create a new class |
| GET    | /api/classes/:id | Get class with students |
| PUT    | /api/classes/:id | Update class info/subjects |
| DELETE | /api/classes/:id | Delete class |
| POST   | /api/classes/:id/students | Add one student |
| POST   | /api/classes/:id/students/bulk | Bulk import students |
| PUT    | /api/classes/:id/students/:sid | Update student |
| DELETE | /api/classes/:id/students/:sid | Delete student |
| GET    | /api/health | Server health check |

---

## 🔥 Firebase Setup

### 1) Create Firebase Project
- Go to https://console.firebase.google.com
- Create a project and enable **Firestore Database** (Native mode).

### 2) Create Service Account
- Project settings → Service accounts → Generate new private key
- Keep the JSON file safe — you will use these values in your `.env`.

### 3) Set Environment Variables
Populate `backend/.env` (or your deployment environment) with:

- `FIREBASE_PROJECT_ID` — the `project_id` from your service account JSON
- `FIREBASE_CLIENT_EMAIL` — the `client_email` from your service account JSON
- `FIREBASE_PRIVATE_KEY` — the `private_key` from your service account JSON (replace literal newlines with `\n`)

---

## 📦 Deploy to Production (Render)

### Option A — Render.com (Full Stack, Free)
1. Push this project to GitHub
2. Go to https://render.com → New → Web Service
3. Set **Build Command**: `cd backend && npm install`
4. Set **Start Command**: `cd backend && npm start`
5. Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` as environment variables
6. Frontend: Build with `cd frontend && npm run build`, deploy `build/` folder

### Option B — Run Both on One Server
1. Build frontend: `cd frontend && npm run build`
2. The backend serves the React build automatically from `/frontend/build`
3. Run only: `cd backend && npm start`
4. Visit http://localhost:5000

---

## ☁️ Deploy on Vercel (Serverless + Firebase)

Use the serverless API in the `api/` folder with Firebase Firestore.

### 1) Add Vercel Environment Variables
Set these variables in Vercel → Project → Settings → Environment Variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (replace newlines with `\n`)

### 2) Deploy
- Push the repository to GitHub
- Import into Vercel and deploy the **frontend**
- Vercel will automatically serve `api/*` as serverless functions

### 3) Frontend API Base
The frontend already calls `/api`, which works on Vercel.

### 4) Optional: Frontend Firebase Client
If you want the React app to use Firebase directly (Auth, Firestore, Storage):

1. Copy the example env file:
	```bash
	cd frontend
	copy .env.example .env.local
	```
2. Install dependencies (already listed in package.json):
	```bash
	npm install
	```
3. Import the client initializer when needed:
	```js
	import app from "./firebaseClient";
	```

---

## 💾 Database

Data is stored in **Firebase Firestore** — a fully managed, serverless NoSQL cloud database.

- No local database file required
- Data persists automatically in the cloud
- Backups can be managed from the Firebase Console

---

## 🎯 Features

- ✅ Multiple classes management
- ✅ Student score entry with live grade calculation
- ✅ Auto division calculation (I / II / III / IV / 0)
- ✅ Subject management (add, remove, rename)
- ✅ School dashboard with statistics
- ✅ Subject performance analysis
- ✅ Gender comparison analysis
- ✅ Individual student report cards
- ✅ CSV bulk import
- ✅ JSON export/import
- ✅ Printable result sheets
- ✅ Firebase Firestore database (cloud-hosted, no local setup needed)
- ✅ REST API

---

## 👨‍💻 Development

Backend runs on port **5000**  
Frontend runs on port **3000** (proxies API to 5000 automatically)
