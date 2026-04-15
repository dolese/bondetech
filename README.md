# 🎓 BONDE SEC SCHOOL — Result System

A full-stack school result management system built with **Node.js + Express + SQLite** (backend) and **React** (frontend).
Includes an optional **serverless API** powered by **Firebase (Firestore)** for Vercel deployments.

---

## 📁 Project Structure

```
bonde-results/
├── api/              ← Vercel serverless API (Firebase)
│   ├── classes/      ← Serverless class + student routes
│   └── _lib/         ← Firebase helpers
├── backend/          ← Node.js API + SQLite database
│   ├── server.js     ← Main Express server
│   ├── db.js         ← SQLite database setup
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

---

### Step 1 — Install Backend

Open **Command Prompt** or **Terminal** and run:

```bash
cd bonde-results/backend
npm install
```

### Step 2 — Start Backend

```bash
npm start
```

You should see:
```
🎓 BONDE Result System Backend
✅ Server running at http://localhost:5000
📦 API available at http://localhost:5000/api
💾 Database: bonde_results.db
```

> ✅ The database file `bonde_results.db` is created automatically.

---

### Step 3 — Install Frontend (in a new terminal window)

```bash
cd bonde-results/frontend
npm install
```

### Step 4 — Start Frontend

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

## 📦 Deploy to Production (Netlify / Render)

### Option A — Render.com (Full Stack, Free)
1. Push this project to GitHub
2. Go to https://render.com → New → Web Service
3. Set **Build Command**: `cd backend && npm install`
4. Set **Start Command**: `cd backend && npm start`
5. Frontend: Build with `cd frontend && npm run build`, deploy `build/` folder

### Option B — Run Both on One Server
1. Build frontend: `cd frontend && npm run build`
2. The backend serves the React build automatically from `/frontend/build`
3. Run only: `cd backend && npm start`
4. Visit http://localhost:5000

---

## ☁️ Deploy on Vercel (Serverless + Firebase)

Use the serverless API in the `api/` folder with Firebase Firestore.

### 1) Create Firebase Project
- Go to https://console.firebase.google.com
- Create a project and enable **Firestore Database**.

### 2) Create Service Account
- Project settings → Service accounts → Generate new private key
- Keep the JSON file safe

### 3) Add Vercel Environment Variables
Set these variables in Vercel → Project → Settings → Environment Variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (replace newlines with `\n`)

### 4) Deploy
- Push the repository to GitHub
- Import into Vercel and deploy the **frontend**
- Vercel will automatically serve `api/*` as serverless functions

### 5) Frontend API Base
The frontend already calls `/api`, which works on Vercel.

### 6) Optional: Frontend Firebase Client
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

Data is stored in `backend/bonde_results.db` (SQLite file).

- To backup: just copy this file
- To restore: replace the file and restart the server
- The database is created automatically on first run

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
- ✅ SQLite database (persistent, no setup needed)
- ✅ REST API

---

## 👨‍💻 Development

Backend runs on port **5000**  
Frontend runs on port **3000** (proxies API to 5000 automatically)
