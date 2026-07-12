<div align="center">

# 🚛 TransitOps

### Smart Transport Operations Platform for Indian Logistics

**Fleet · Dispatch · Compliance · Analytics — in one live dashboard.**

[![Live App](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://transitops-pi.vercel.app)
[![API Health](https://img.shields.io/badge/API-online-blue?style=for-the-badge)](https://transitops-api-production-fbce.up.railway.app/health)
[![GitHub](https://img.shields.io/badge/GitHub-repo-181717?style=for-the-badge&logo=github)](https://github.com/Harsimran-Dalal/TransitOps-Smart-Transport-Operations-Platform)
[![License](https://img.shields.io/badge/license-Hackathon--Use-orange?style=for-the-badge)](#license)

![React](https://img.shields.io/badge/React_18-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_API-Fleet_Copilot-8E75B2?logo=googlegemini&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Frontend-black?logo=vercel)
![Railway](https://img.shields.io/badge/Railway-Backend-0B0D0E?logo=railway)

[**Live Demo**](https://transitops-pi.vercel.app) · [**Demo Video**](#-demo) · [**Quick Start**](#-local-development) · [**API Docs**](#-api-reference) · [**Architecture**](#-architecture)

</div>

---

> **Note on this README:** the badges, sections, and structure below follow common patterns from well-received open-source and hackathon READMEs (highlights-first, visuals, quick start, architecture diagrams, judge-facing summary). Whether *this specific project* wins anything depends on the judging criteria and live demo — a README improves presentation, it doesn't substitute for it. Screenshots below are from the live app; a demo video link is still a placeholder.

## 🎯 The problem

Indian logistics operators — from single-owner fleets to regional carriers — run dispatch over phone calls and WhatsApp, track compliance on paper, and reconcile fuel costs in spreadsheets. Vehicle downtime, license expiries, and cost overruns get caught late because there's no single live view of the fleet.

## 💡 The solution

TransitOps gives four fleet roles (Manager, Driver/Dispatcher, Safety Officer, Financial Analyst) one shared, live, role-permissioned system: register vehicles/drivers, dispatch trips with real-time GPS-link tracking, log maintenance and fuel automatically, and export analytics — built with India-specific defaults (₹, +91, MH-style plates, Indian city autocomplete) instead of a generic US template.

## 📸 Demo

| Command Center | Fleet Registry | Live Trip Operations |
|---|---|---|
| <img alt="command-center" src="https://github.com/user-attachments/assets/cbc5763e-209c-4f39-a3b7-423f11ce103c" width="300" /> | <img alt="fleet-registry" src="https://github.com/user-attachments/assets/4552abab-ef70-4eaf-b801-25b5f71af2ec" width="300" /> | <img alt="live-trips" src="https://github.com/user-attachments/assets/fd258ae0-dfd7-42af-ae7a-75ce6e5e8a9a" width="300" /> |

**Live app:** [transitops-pi.vercel.app](https://transitops-pi.vercel.app) · **3-minute walkthrough:** `[add YouTube/Loom link]`

> Screenshots are checked into `docs/screenshots/`. If they don't render on GitHub, confirm the folder was pushed (Step 4 of [Upload to GitHub](#upload-to-github)).

---

## 🏆 Why this stands out (judge-facing summary)

- **Not a CRUD toy** — real RBAC enforced on the backend (not just hidden UI), atomic state transitions (dispatch/complete/cancel), and a license-expiry cron with email reminders.
- **AI that's actually wired in** — Fleet Copilot (Gemini) answers natural-language questions over *live* fleet data via a real backend route (`/ai/ask`), not a static chatbot demo.
- **Deployed, not just running locally** — frontend on Vercel, API + Postgres (Neon) on Railway, with a working `/health` endpoint judges can hit directly.
- **Region-specific, not generic** — every default (currency, phone format, registration plates, city autocomplete) is built for the Indian logistics market this targets.
- **Zero paid API keys required for the demo** — Google Maps live tracking uses share links, not the billed Maps JavaScript SDK.

<sub>These are factual claims about what the codebase implements per the spec below — **[Unverified]** in the sense that I haven't run or tested this deployment myself; verify the live links above still resolve before presenting.</sub>

---

## Table of contents

1. [Demo](#-demo)
2. [Overview](#overview)
3. [Architecture](#architecture)
4. [Repository structure](#repository-structure)
5. [Features](#features)
6. [Extra features (beyond spec)](#extra-features-beyond-spec)
7. [Roles & permissions](#roles--permissions)
8. [Tech stack](#tech-stack)
9. [Local development](#local-development)
10. [Deployment](#deployment)
11. [Environment variables](#environment-variables)
12. [API reference](#api-reference)
13. [Business rules](#business-rules)
14. [KPI definitions](#kpi-definitions)
15. [Roadmap](#-roadmap)
16. [Team](#-team)
17. [Contributing](#-contributing)
18. [FAQ](#-faq)
19. [Upload to GitHub](#upload-to-github)
20. [License](#license)

---

## Overview

TransitOps is a full-stack fleet operations platform covering the complete transport lifecycle: register vehicles and drivers, create and dispatch trips, track maintenance and fuel costs, export analytics, and manage team access by role.

The app is tuned for **India** — Indian city autocomplete, ₹ revenue, +91 phone format, MH-style registration numbers, and Google Maps route + live location sharing for dispatches.

Four user roles interact with the same live data:

- **Fleet Manager** — full operational control
- **Driver / Dispatcher** — trip creation and dispatch
- **Safety Officer** — driver compliance and license monitoring
- **Financial Analyst** — fuel, expenses, and ROI reports

---

## Architecture

```mermaid
flowchart TB
  subgraph Client["Browser (React SPA)"]
    UI[Pages & Components]
    RQ[TanStack Query · 12s live sync]
    UI --> RQ
  end

  subgraph Vercel["Vercel CDN"]
    FE[Static frontend / dist]
  end

  subgraph Railway["Railway — Node.js API"]
    API[Express REST API]
    AUTH[JWT + HttpOnly cookies]
    RBAC[Role-based middleware]
    CRON[License reminder cron]
    AI[Gemini Fleet Copilot]
    API --> AUTH
    API --> RBAC
    API --> CRON
    API --> AI
  end

  subgraph Data["PostgreSQL (Neon)"]
    DB[(Users · Vehicles · Drivers\nTrips · Maintenance · Fuel)]
  end

  subgraph External["External services"]
    GM[Google Maps embed & links]
    GEM[Gemini API]
    SMTP[SMTP email optional]
  end

  RQ -->|HTTPS + credentials| FE
  FE --> API
  API --> DB
  UI --> GM
  AI --> GEM
  CRON --> SMTP
```

### Request flow (authenticated)

```mermaid
sequenceDiagram
  participant U as User
  participant F as React frontend
  participant A as Express API
  participant P as Prisma / Postgres

  U->>F: Login (email + password + role at signup)
  F->>A: POST /auth/login
  A->>P: Verify user + bcrypt hash
  A-->>F: Set HttpOnly session cookie
  F->>A: GET /dashboard (cookie)
  A->>A: requireAuth + requireSection(role)
  A->>P: Query fleet data
  A-->>F: JSON response
  F-->>U: Live dashboard (polls every 12s)
```

### Monorepo layout

```
TransitOps/
├── frontend/          React 18 + Vite SPA
├── backend/           Express API + Prisma
├── shared/            Zod schemas + RBAC matrix (used by both)
├── vercel.json        Vercel build config (repo root)
├── railway.toml       Railway build + deploy config
└── package.json       npm workspaces root
```

---

## Repository structure

```
TransitOps/
│
├── frontend/
│   ├── src/
│   │   ├── pages/           Dashboard, Vehicles, Drivers, Trips, Maintenance,
│   │   │                    Fuel & Expenses, Reports, Settings, Login
│   │   ├── components/      AppLayout, TripCard, GoogleMaps, FleetCopilot,
│   │   │                    NotificationPanel, DispatchTrackingBoard, ui
│   │   ├── lib/             api, types, permissions, live polling, india
│   │   └── hooks/           useAuth, useTheme
│   └── index.html
│
├── backend/
│   ├── src/
│   │   ├── routes/          auth, vehicles, drivers, trips, maintenance,
│   │   │                    fuel-expenses, dashboard, reports, documents,
│   │   │                    tracking, notifications
│   │   ├── services/        Business logic per domain
│   │   ├── middleware/      auth, RBAC, error handler
│   │   └── jobs/             License expiry cron
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/
│       └── seed.ts          India demo data (Mumbai fleet)
│
└── shared/
    └── src/
        ├── index.ts         Zod validation schemas
        └── permissions.ts   Role × section access matrix
```

---

## Features

### Core platform (9 modules)

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Authentication & RBAC** | Email/password signup with role picker, JWT session cookies, 4 roles |
| 2 | **Command Center** | 6 KPIs, utilization chart, cost breakdown, live dispatch board, Google Maps panel |
| 3 | **Vehicle Registry** | CRUD, search/filter/sort, document upload/download/delete, Indian regions |
| 4 | **Drivers & Safety** | CRUD, license expiry, safety score, suspend/unsuspend, email field for reminders |
| 5 | **Trip Dispatcher** | Draft → Dispatch → Complete → Cancel with full validation |
| 6 | **Maintenance** | Open/close logs, auto vehicle status (`IN_SHOP` ↔ `AVAILABLE`) |
| 7 | **Fuel & Expenses** | Fuel logs, expense entries, operational cost roll-up |
| 8 | **Reports & Analytics** | Per-vehicle utilization %, fuel efficiency, ROI, CSV + PDF export |
| 9 | **Settings** | Team accounts (Fleet Manager), self-service account deletion, license reminder trigger |

### Operational highlights

- **Live sync** — all list pages poll every 12 seconds
- **Dispatch board** — table of every vehicle on trip with elapsed time
- **Notifications bell** — actionable feed (draft trips, active dispatches, expiring licenses, open maintenance)
- **Search & filter** — debounced search on Vehicles, Drivers, Trips; status/type/region filters
- **Vehicle documents** — upload compliance PDFs/images per vehicle
- **Security** — helmet, rate-limited login (20 / 15 min), bcrypt cost 12, CORS allow-list, production error sanitization

---

## Extra features (beyond spec)

These were added on top of the hackathon PDF requirements:

| Feature | Description |
|---------|-------------|
| **Google Maps integration** | After dispatch, enter start/end locations (India). Embed route map. Paste driver's Google Maps **live location share link** (`maps.app.goo.gl`). Open route or live location in one click. |
| **Fleet Copilot (Gemini AI)** | Natural-language + voice search over live fleet data. Ask *"How many vehicles are on trip?"* or *"Any expiring licenses?"* Powered by Gemini API on the backend. |
| **Notification feed** | Real-time actionable alerts with badge count in the top bar. |
| **Self-service account deletion** | Every role can delete their own account from Settings (`DELETE /auth/me`). |
| **Dispatch timestamps** | `dispatchedAt` / `completedAt` on trips for tracking and elapsed-time display. |
| **India-first defaults** | Mumbai/Navi Mumbai routes, ₹ revenue, +91 phones, MH registration format, Indian city autocomplete, regional filters. |
| **Minimal black UI** | Pure black/white dark mode — no accent gradients or vibe-coded neon. |
| **Open registration** | Users pick their role at signup (not auto-assigned). |
| **Backend read RBAC** | All API routes enforce role permissions, not just the frontend. |
| **Neon Postgres** | Production database on Neon (via Railway env var) for reliable persistence. |

> **Note for judges:** Google Maps live tracking uses the driver's **Google Maps share link** (Share → Live location). No separate GPS hardware or paid Maps JavaScript SDK is required for the demo.

---

## Roles & permissions

| Section | Fleet Manager | Driver | Safety Officer | Financial Analyst |
|---------|:-------------:|:------:|:--------------:|:-----------------:|
| Dashboard | Read | Read | Read | Read |
| Vehicles | Write | Read | Read | Read |
| Drivers | Write | Read | Write | Read |
| Trips | Write | Write | Read | Read |
| Maintenance | Write | Read | Read | Read |
| Fuel & Costs | Write | Read | Read | Write |
| Reports | Read | — | Read | Read |
| Settings | Write | Read | Read | Read |

Write = create, edit, delete, dispatch. Read = view only.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query, Framer Motion, Recharts, Lucide icons |
| Backend | Node.js 20, Express, Prisma ORM, Zod validation, bcrypt, JWT, cookie-parser, helmet, pino |
| Database | PostgreSQL (local Docker / Neon in production) |
| Shared | `@transitops/shared` workspace — schemas + RBAC synced front-to-back |
| AI | Google Gemini API (Fleet Copilot) |
| Maps | Google Maps embed + share links (no Maps JS SDK key required) |
| Deploy | Vercel (frontend) · Railway (backend) |

---

## Local development

### Prerequisites

- Node.js 20+
- PostgreSQL (Docker recommended)
- npm 9+

### 1. Clone and install

```bash
git clone https://github.com/Harsimran-Dalal/TransitOps-Smart-Transport-Operations-Platform.git
cd TransitOps-Smart-Transport-Operations-Platform
npm install
```

### 2. Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:

- Set `DATABASE_URL` to your local Postgres
- Set `JWT_SECRET` to a long random string (32+ chars)

### 3. Database

```bash
docker run --name transitops-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=transitops -p 5432:5432 -d postgres:16

npm run build --workspace=@transitops/shared
npm run db:migrate -w backend
npm run db:seed -w backend
```

### 4. Run

```bash
npm run dev:all
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:4000 |
| Health | http://localhost:4000/health |

### Demo accounts (after seed)

| Email | Password | Role |
|-------|----------|------|
| manager@transitops.in | Password123! | Fleet Manager |
| driver@transitops.in | Password123! | Driver |
| safety@transitops.in | Password123! | Safety Officer |
| finance@transitops.in | Password123! | Financial Analyst |

Seed also creates: **MH-02-AB-1234** (Tata Ace), driver **Rajesh Kumar**, and a completed Mumbai → Nhava Sheva trip.

> **For judges in a hurry:** live app is already seeded — [transitops-pi.vercel.app](https://transitops-pi.vercel.app), login as `manager@transitops.in` / `Password123!`. No local setup needed.

---

## Deployment

### Production links (current)

| Service | URL |
|---------|-----|
| **Frontend** | https://transitops-pi.vercel.app |
| **API** | https://transitops-api-production-fbce.up.railway.app |
| **Health check** | https://transitops-api-production-fbce.up.railway.app/health |

### Backend — Railway

1. Create a Railway project and link this repo.
2. Add a **Node** service (uses `railway.toml` at repo root).
3. Set environment variables (see [Environment variables](#environment-variables)).
4. Use **Neon Postgres** or Railway Postgres for `DATABASE_URL`.
5. Deploy — start command runs `prisma db push` then boots the API.
6. Optional: run seed once from Railway shell: `npm run db:seed -w backend`.

### Frontend — Vercel

1. Import the repo in [Vercel](https://vercel.com).
2. Use **repo root** as the project directory (not `frontend/` — `vercel.json` is at root).
3. Set `VITE_API_URL` to your Railway API URL.
4. Deploy — build runs `vercel-build` script automatically.

### Docker (optional)

```bash
docker build -f backend/Dockerfile -t transitops-api .
docker run -p 4000:4000 \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  -e NODE_ENV=production \
  transitops-api
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Session signing secret (≥16 chars in production) |
| `PORT` | No | Default `4000` |
| `CORS_ORIGINS` | Prod | Comma-separated frontend URLs |
| `COOKIE_CROSS_SITE` | Prod | `true` when frontend and API are on different domains |
| `TRUST_PROXY` | Prod | `true` behind Railway/Vercel |
| `GEMINI_API_KEY` | Optional | Enables Fleet Copilot AI search |
| `GEMINI_MODEL` | Optional | Default `gemini-2.0-flash` |
| `ENABLE_LICENSE_CRON` | Optional | `true` to run daily license reminders |
| `LICENSE_REMINDER_DAYS` | Optional | Default `30` |
| `SMTP_*` | Optional | Email delivery for license reminders |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API base URL |

---

## API reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Open signup with role picker |
| POST | `/auth/login` | Email + password login |
| POST | `/auth/logout` | Clear session cookie |
| GET | `/auth/me` | Current user profile |
| DELETE | `/auth/me` | Delete own account |
| GET | `/auth/accounts` | List team accounts (Fleet Manager) |
| POST | `/auth/accounts` | Create team account (Fleet Manager) |
| DELETE | `/auth/accounts/:id` | Remove team account (Fleet Manager) |

### Fleet operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | KPIs, charts, filters |
| GET/POST/PUT/DELETE | `/vehicles` | Vehicle CRUD |
| GET | `/vehicles/dispatch-options` | Available vehicles + drivers for dispatch |
| GET/POST/PUT/DELETE | `/drivers` | Driver CRUD |
| POST | `/drivers/:id/suspend` | Suspend driver |
| POST | `/drivers/:id/unsuspend` | Reinstate driver |
| GET/POST | `/trips` | List / create draft trips |
| POST | `/trips/:id/dispatch` | Dispatch trip |
| PATCH | `/trips/:id/tracking` | Update locations + Google Maps live link |
| POST | `/trips/:id/complete` | Complete trip |
| POST | `/trips/:id/cancel` | Cancel trip |
| GET/POST | `/maintenance` | Maintenance logs |
| POST | `/maintenance/:id/close` | Close maintenance log |
| GET/POST | `/fuel-logs` | Fuel entries |
| GET/POST | `/expenses` | Expense entries |

### Reports & documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports` | Fleet analytics |
| GET | `/reports/export.csv` | CSV export |
| GET | `/reports/export.pdf` | PDF export |
| GET/POST | `/vehicles/:id/documents` | Vehicle document list / upload |
| GET | `/documents/:id/download` | Download document |
| DELETE | `/documents/:id` | Delete document |

### Intelligence & notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications/feed` | Actionable notification feed |
| POST | `/notifications/test-license-reminders` | Manual license reminder run |
| GET | `/tracking/live` | Live dispatch map data |
| GET | `/ai/status` | Check if Gemini Copilot is enabled |
| POST | `/ai/ask` | Ask Fleet Copilot a question |
| GET | `/health` | Service + database health check |

All endpoints except `/auth/login`, `/auth/register`, and `/health` require an authenticated session cookie.

---

## Business rules

- Vehicle registration numbers are unique (database constraint + validation).
- Retired or in-shop vehicles never appear in dispatch selection.
- Drivers with expired licenses or `SUSPENDED` status cannot be dispatched.
- A driver or vehicle already `ON_TRIP` cannot be double-assigned.
- Cargo weight must not exceed vehicle maximum load capacity.
- Dispatch atomically sets vehicle + driver to `ON_TRIP` and records `dispatchedAt`.
- Completing a trip restores both to `AVAILABLE` and records `completedAt`.
- Cancelling a dispatched trip restores both to `AVAILABLE`.
- Opening maintenance sets vehicle to `IN_SHOP`; closing restores to `AVAILABLE`.

---

## KPI definitions

| KPI | Formula |
|-----|---------|
| Active Fleet | Count of non-retired vehicles |
| Drivers On Duty | Drivers with status `AVAILABLE` or `ON_TRIP` |
| Fleet Utilization | `(vehicles ON_TRIP / non-retired vehicles) × 100` |
| Fuel Efficiency | Total planned distance (completed trips) ÷ total fuel consumed |
| Operational Cost | Maintenance + fuel + expenses |
| Vehicle ROI | `(revenue − maintenance − fuel) / acquisition cost` |

---

## 🗺 Roadmap

Post-hackathon direction — **[Speculation]**, not committed:

- [ ] Native GPS ingestion (replace share-link tracking) via a driver mobile app
- [ ] Route optimization (multi-stop, cost-aware)
- [ ] SMS/WhatsApp notifications alongside email
- [ ] Multi-tenant support for fleet operators managing sub-fleets
- [ ] Predictive maintenance from fuel/usage patterns

---

## 👥 Team

| Name | Role | GitHub |
|------|------|--------|
| `[Add name]` | `[e.g. Full-stack, Frontend]` | `[@handle]` |
| `[Add name]` | `[e.g. Backend, DB]` | `[@handle]` |

> **[Unverified]** — placeholder table; fill in actual team members before submission.

---

## 🤝 Contributing

Built during a hackathon; contributions welcome post-event.

```bash
git checkout -b feature/your-feature
# make changes
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

Open a PR against `main` with a short description and, if UI-facing, a before/after screenshot.

---

## ❓ FAQ

**Does live tracking need a paid Google Maps API key?**
No — it uses the driver's Google Maps *share link* (Share → Live location), not the billed Maps JavaScript SDK.

**Is Fleet Copilot required to run the app?**
No — `GEMINI_API_KEY` is optional. Without it, `/ai/status` reports the Copilot as disabled and the rest of the platform functions normally.

**What happens if the license reminder cron isn't enabled?**
`ENABLE_LICENSE_CRON` defaults to off; enable it in `backend/.env` to run daily expiry checks.

---

## Upload to GitHub

Follow these steps to publish your project. **Do not commit `.env` files or API keys.**

### Step 1 — Create a GitHub repository

> Already done for this project: [github.com/Harsimran-Dalal/TransitOps-Smart-Transport-Operations-Platform](https://github.com/Harsimran-Dalal/TransitOps-Smart-Transport-Operations-Platform). Skip to Step 2.

1. Go to [github.com/new](https://github.com/new).
2. Name it `TransitOps` (or your preferred name).
3. Choose **Public** or **Private**.
4. Do **not** initialize with README, `.gitignore`, or license (you already have these locally).
5. Click **Create repository**.

### Step 2 — Initialize git locally (if not already)

Open PowerShell in your project folder:

```powershell
cd C:\Users\Acer\projects\TransitOps

# Skip if git is already initialized
git init
git branch -M main
```

### Step 3 — Review what will be uploaded

```powershell
git status
```

**Make sure these are NOT listed:**

- `backend/.env`
- `frontend/.env`
- Any file containing API keys or passwords

If `.env.example` files don't appear (blocked by `.gitignore`), force-add them:

```powershell
git add -f backend/.env.example frontend/.env.example
```

### Step 4 — Stage and commit

```powershell
git add .
git status
```

Verify no secrets are staged, then commit:

```powershell
git commit -m "Initial commit: TransitOps fleet operations platform"
```

### Step 5 — Connect to GitHub and push

Repo already exists at [Harsimran-Dalal/TransitOps-Smart-Transport-Operations-Platform](https://github.com/Harsimran-Dalal/TransitOps-Smart-Transport-Operations-Platform) — skip Step 1 and just push:

```powershell
git remote add origin https://github.com/Harsimran-Dalal/TransitOps-Smart-Transport-Operations-Platform.git
git push -u origin main
```

If the remote already exists, use `git remote set-url origin <url>` instead. If prompted, sign in with GitHub (browser or personal access token).

### Step 6 — Verify on GitHub

1. Open your repo on GitHub.
2. Confirm `README.md` renders with the architecture diagram.
3. Confirm `.env` files are **not** visible in the file tree.
4. Optionally add repo topics: `fleet-management`, `logistics`, `react`, `express`, `prisma`, `hackathon`, `hackathon-project`.

### Step 7 — Connect deploy platforms (optional)

If Vercel/Railway aren't already linked to GitHub:

- **Vercel:** Project Settings → Git → Connect repository → auto-deploy on push to `main`.
- **Railway:** Project Settings → Connect repo → auto-deploy on push.

Keep secrets (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) **only** in Vercel/Railway environment variable panels — never in git.

---

## Security checklist (production)

- [ ] `JWT_SECRET` is a random 48+ character string
- [ ] `CORS_ORIGINS` lists only your Vercel domain
- [ ] `COOKIE_CROSS_SITE=true` and `TRUST_PROXY=true` on Railway
- [ ] `GEMINI_API_KEY` set only in Railway (not in code)
- [ ] `.env` files are in `.gitignore` and never pushed
- [ ] Login rate limiting active (20 attempts / 15 min)
- [ ] HTTPS enforced on both frontend and API

---

## License

Built for the Odoo Hackathon 2026. All rights reserved by the project author.

---

<p align="center">
  <strong>TransitOps</strong> — Fleet command for India<br/>
  <a href="https://transitops-pi.vercel.app">Live Demo</a> ·
  <a href="https://transitops-api-production-fbce.up.railway.app/health">API Health</a>
</p>
