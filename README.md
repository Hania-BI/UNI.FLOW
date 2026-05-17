# UniFlow — CampusCare

**A smart facility management system for university campuses.**

Community members report maintenance issues through a mobile app. Facility managers assign tasks to workers. Workers resolve them and upload completion photos. Admins manage user accounts. The whole flow is role-based and backed by a REST API.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Project Structure](#project-structure)
5. [Supabase Setup](#1-supabase-setup)
6. [Backend Setup](#2-backend-setup)
7. [Mobile Setup](#3-mobile-setup)
8. [Running the Project](#4-running-the-project)
9. [User Roles](#user-roles)
10. [Environment Variable Reference](#environment-variable-reference)
11. [Troubleshooting](#troubleshooting)

---

## Features

### Community Members
- Register and log in with email and password
- Submit facility issues with category, location (building / floor / room), description, and an optional photo
- Track the live status of their own submitted issues
- Reset forgotten password via a 6-digit email OTP

### Facility Managers
- View all reported issues across campus
- Filter issues by status and category
- Assign issues to active workers
- Reassign workers on existing issues
- Update issue status
- Close resolved issues
- Delete issues
- Add comments to issues
- View and manage the worker roster (activate / deactivate worker accounts)

### Workers
- View all issues assigned to them
- Update task status (Assigned → In Progress → Resolved)
- Upload a completion photo when the job is done
- Add comments to assigned issues

### Admins
- View all registered users across all roles
- Activate or deactivate any user account

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile app** | React Native 0.81.5, Expo SDK 54, React 19 |
| **Navigation** | React Navigation 7 (Native Stack + Bottom Tabs) |
| **Backend** | Node.js 18+ (ES modules), Express 4 |
| **Database** | PostgreSQL via Supabase |
| **Authentication** | Supabase Auth (JWT) |
| **Authorization** | Custom JWT middleware + RBAC |
| **File storage** | Supabase Storage |
| **Token storage** | `expo-secure-store` (on-device, encrypted) |

---

## Prerequisites

| Tool | Notes |
|------|-------|
| **Node.js 18 or higher** | Required for ES modules and the built-in `--watch` flag used by `npm run dev` |
| **npm** | Bundled with Node.js |
| **Expo Go app** | Install on your iOS or Android device from the App Store / Play Store |
| **Git** | Any version |
| **Supabase account** | Free tier is sufficient — [supabase.com](https://supabase.com) |

> **No global Expo CLI install needed.** All Expo commands use `npx expo ...`, which is automatically available after running `npm install` inside the `mobile/` folder.

> **No local PostgreSQL needed.** The database is hosted entirely on Supabase (cloud).

---

## Project Structure

```
UNI.FLOW/
├── README.md
├── package-lock.json
│
├── backend/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── 002_seed.sql
│   └── src/
│       ├── index.js
│       ├── config/
│       │   └── supabase.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── issueController.js
│       │   └── userController.js
│       ├── lib/
│       │   └── asyncHandler.js
│       ├── middleware/
│       │   ├── rbacMiddleware.js
│       │   └── requireAuth.js
│       └── routes/
│           ├── admin.js
│           ├── auth.js
│           ├── issues.js
│           └── manager.js
│
├── mobile/
│   ├── .env
│   ├── .gitignore
│   ├── App.js
│   ├── app.json
│   ├── babel.config.js
│   ├── package.json
│   ├── package-lock.json
│   ├── .expo/
│   │   ├── README.md
│   │   └── devices.json
│   └── src/
│       ├── theme.js
│       ├── api/
│       │   ├── client.js
│       │   └── issueApi.js
│       ├── auth/
│       │   └── AuthContext.js
│       ├── components/
│       │   └── IssueCard.js
│       └── screens/
│           ├── AdminDashboardScreen.js
│           ├── AssignedIssuesScreen.js
│           ├── CreateIssueScreen.js
│           ├── FMDashboardScreen.js
│           ├── ForgotPasswordScreen.js
│           ├── HomeScreen.js
│           ├── IssueDetailScreen.js
│           ├── LoginScreen.js
│           ├── OTPVerificationScreen.js
│           ├── ResetPasswordScreen.js
│           ├── SignupScreen.js
│           ├── SplashScreen.js
│           └── WorkersScreen.js
│
└── docs/
    ├── IMPLEMENTATION_PLAN.md
    ├── SRS.docx
    └── final-milestone_campusCare.pdf
```

---

## 1. Supabase Setup

The project uses **Supabase** for the PostgreSQL database, user authentication, and file storage. You need to configure it once before running anything locally.

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, enter a name (e.g. `uniflow`), set a strong database password, and choose the region closest to you.
3. Wait for the project to finish provisioning (~1 minute).

### 1.2 Run the Database Schema

1. In the Supabase dashboard, go to **SQL Editor**.
2. Open `backend/migrations/001_init.sql` from this repo.
3. Paste the entire file contents into the editor and click **Run**.
4. *(Optional)* Repeat with `backend/migrations/002_seed.sql` to load sample data.

The schema creates the following tables and enums:

**Tables**

| Table | Purpose |
|-------|---------|
| `users` | Profile data for every registered user (mirrors Supabase Auth) |
| `locations` | Campus locations — building, floor, room |
| `issues` | Facility issue tickets with full status lifecycle |
| `issue_comments` | Comments on issues by facility managers and workers |
| `issue_status_log` | Append-only audit log of every status change |

**Enums**

| Enum | Values |
|------|--------|
| `user_role` | `community_member`, `facility_manager`, `worker`, `admin` |
| `user_status` | `active`, `inactive` |
| `issue_category` | `electrical`, `plumbing`, `cleaning`, `furniture`, `other` |
| `issue_status` | `pending`, `assigned`, `in_progress`, `resolved`, `closed` |

### 1.3 Create the Storage Bucket

1. In the Supabase dashboard, go to **Storage**.
2. Click **New bucket**.
3. Name it **exactly**: `issue-photos`
4. Set visibility to **Private** (the backend uses the service role key to generate signed URLs).
5. Click **Save**.

### 1.4 Get Your API Keys

1. In the Supabase dashboard, go to **Project Settings → API**.
2. Copy the following values — you will need them in the backend `.env` file:

| Key | Where to find it |
|-----|-----------------|
| **Project URL** | "Project URL" field |
| **Anon / public key** | "Project API keys" → `anon public` |
| **Service role key** | "Project API keys" → `service_role` ⚠️ keep this secret |

### 1.5 Configure Authentication

1. In the Supabase dashboard, go to **Authentication → Settings → Email**.
2. Turn **Enable email confirmations** **OFF** — otherwise new registrations require email verification before they can log in.

> **Password reset:** The forgot-password flow sends a 6-digit OTP to the user's email address. Supabase handles email delivery automatically using its built-in email service — no extra SMTP configuration is needed for development.

---

## 2. Backend Setup

### 2.1 Install Dependencies

```bash
cd backend
npm install
```

### 2.2 Configure Environment Variables

Create a file named `.env` inside the `backend/` folder with the following content:

```env
# Supabase Project URL — from Project Settings → API
SUPABASE_URL=https://your-project-id.supabase.co

# Public anon key — used for auth calls
SUPABASE_ANON_KEY=your-anon-key-here

# Service role key — SECRET. Bypasses Row Level Security. Never commit this.
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Port the Express server listens on (default: 3000)
PORT=3000
```

Replace the placeholder values with the keys you copied in [Step 1.4](#14-get-your-api-keys).

### 2.3 Start the Backend

```bash
npm run dev
```

Expected output:

```
UNIFLOW API listening on http://localhost:3000
For mobile devices on the same Wi-Fi set EXPO_PUBLIC_API_URL=http://<your-ip>:3000/api
```

The second line shows the local IP address you need when configuring the mobile app.

> `npm run dev` uses Node's built-in `--watch` flag (available in Node.js 18+) and restarts automatically when source files change. Use `npm start` for a non-watching production start.

---

## 3. Mobile Setup

### 3.1 Install Dependencies

```bash
cd mobile
npm install
```

### 3.2 Configure Environment Variables

Create a file named `.env` inside the `mobile/` folder:

```env
# Full URL of the running backend, including the /api path.
# Use your machine's local IP address for a physical device.
# Use http://localhost:3000/api only for an emulator/simulator on the same machine.
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api
```

**How to find your machine's local IP address:**
- The backend prints it at startup: `...set EXPO_PUBLIC_API_URL=http://<your-ip>:3000/api`
- Or run `ipconfig` (Windows) / `ifconfig` (macOS & Linux) and look for your Wi-Fi adapter's IPv4 address.

> **Important:** Your phone and your development machine must be on the **same Wi-Fi network**.

---

## 4. Running the Project

You need **two terminals** open at the same time.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

Keep this terminal running. The mobile app cannot reach the API without it.

### Terminal 2 — Mobile App

```bash
cd mobile
npx expo start
```

This opens the Expo developer tools in your browser. To launch the app:

| Platform | Steps |
|----------|-------|
| **Physical device** | Open the **Expo Go** app, tap "Scan QR code", scan the QR code shown in the terminal |
| **Android emulator** | Press `a` in the terminal (Android Studio must be installed with a virtual device running) |
| **iOS simulator** (Mac only) | Press `i` in the terminal (Xcode must be installed) |

---

## User Roles

Every user logs in through the same screen. The app automatically shows the correct interface based on the user's role.

| Role | Interface | Key Capabilities |
|------|-----------|-----------------|
| `community_member` | My Issues + Report Issue tabs | Submit issues, track own reports, reset password via OTP |
| `facility_manager` | Dashboard + Workers tabs | View all issues, assign/close/delete, manage workers, comment |
| `worker` | My Tasks tab | View assigned tasks, update status, upload completion photos, comment |
| `admin` | Users tab | View all users, activate/deactivate accounts |

**Default role:** All new registrations are assigned `community_member` automatically.

**To promote a user to a different role:**
1. Register through the app (this creates the user record in the database).
2. In the Supabase dashboard, go to **Table Editor → users**.
3. Find the user's row and change the `role` column to the desired value (`facility_manager`, `worker`, or `admin`).
4. The user must **log out and log back in** for the new role to take effect.

---

## Environment Variable Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Public anon key — used for auth operations |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key — bypasses RLS; **never expose or commit this** |
| `PORT` | No | Port for the Express server (default: `3000`) |

### Mobile (`mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Full backend URL including `/api`, e.g. `http://192.168.1.5:3000/api` |

---

## Third-Party Services

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Supabase** | PostgreSQL database, JWT authentication, file storage | Yes — 500 MB DB, 1 GB storage, 50 k auth users |

No other external services are required. Image uploads are routed through the backend to Supabase Storage — no additional cloud storage credentials are needed beyond the keys already configured above.

---

## Troubleshooting

**"Network request failed" / app cannot connect to the backend**
- Confirm the backend is running (`npm run dev` in the `backend/` folder).
- Confirm your phone and computer are on the **same Wi-Fi network**.
- Confirm `EXPO_PUBLIC_API_URL` uses your computer's **local IP address** (e.g. `192.168.1.x`), not `localhost` — on a physical device, `localhost` refers to the phone itself, not your computer.
- After editing `mobile/.env`, stop the Expo server and restart it: `Ctrl+C` then `npx expo start`.

**Backend fails to start: "Cannot find module" or missing env variable errors**
- Confirm `backend/.env` exists and contains all three Supabase variables.
- Run `npm install` inside the `backend/` folder.
- Confirm your Node.js version is 18 or higher: `node --version`.

**"Invalid login credentials" after registering**
- Go to Supabase → **Authentication → Settings → Email** and confirm **Enable email confirmations** is turned **OFF**.

**Role does not change after editing the database**
- The role is read fresh at login. Log out of the app and log back in after updating the `role` column in Supabase.
