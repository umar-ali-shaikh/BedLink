# BedLink

**Find the right bed. Right now.**

BedLink is a real-time emergency hospital bed coordination platform (hackathon MVP).
Dispatchers enter patient requirements, BedLink ranks hospitals with freshness-aware,
explainable matching, the chosen hospital has 2 minutes to accept, rejects and timeouts
fall back automatically, and an accepted bed is locked so it can't be double-booked.

> Simulated hospital and bed data only. No real patient information.

## Documentation

Start with `docs/MEMORY.md` (current state), then:

| Doc | What it covers |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements, features, scope |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Structure, models, API, sockets, matching, concurrency, security |
| [docs/RULES.md](docs/RULES.md) | Engineering rules every contributor follows |
| [docs/PHASES.md](docs/PHASES.md) | Build plan with acceptance criteria and demo script |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system and screens |
| [docs/MEMORY.md](docs/MEMORY.md) | Living project state |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploying (one-URL Render blueprint, Vercel + Render, reverse proxy) and every env variable |

## Repository layout

```text
client/   React + Vite frontend (feature-based)
server/   Node.js + Express + Socket.IO backend (modular monolith)
docs/     The six project documents
```

## Getting started

### Backend (`server/`) — ready

Requires Node.js 20+ and MongoDB (Atlas, or a local replica set for transactions).

```bash
cp .env.example .env          # server/.env.example has every variable
# set MONGO_URI and a JWT_SECRET of at least 32 characters
cd server
npm install
npm run seed                  # fictional demo hospitals, beds and users (< 10 s)
npm run dev                   # http://localhost:5000/api/health
```

| Script | What it does |
|---|---|
| `npm run dev` / `npm start` | API + Socket.IO server (nodemon in dev) |
| `npm run seed` | Wipe and load the demo dataset |
| `npm test` | Vitest: matching unit tests + API, concurrency, timeout/fallback and socket integration tests |
| `npm run lint` / `npm run format` | ESLint / Prettier |

Tests start an in-memory MongoDB replica set (`mongodb-memory-server`, downloaded on first
run). Offline, point it at a local binary: `MONGOMS_SYSTEM_BINARY=/path/to/mongod npm test`.

Using a standalone local `mongod` (no replica set)? Set `MONGO_TRANSACTIONS=false`; the bed
lock then relies on atomic updates + compensation (docs/ARCHITECTURE.md §13.3).

### Frontend (`client/`) — ready

React 18 + Vite + Tailwind, wired to the API (TanStack Query) and Socket.IO (live updates).
Start the server first, then:

```bash
cd client
npm install
npm run dev                   # http://localhost:5173 (proxies /api and /socket.io to :5000)
```

In dev the browser only talks to Vite, which proxies `/api` and `/socket.io` to
`VITE_PROXY_TARGET` (default `http://localhost:5000`), so cookies work with no CORS setup and
the hospital UI can be opened from a phone on the same network. All client settings are
`VITE_*` variables in `client/.env.example`. Deploying: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Two panels, each with public self-registration (`/register`):

| Panel | Screens |
|---|---|
| Ambulance (API role `DISPATCHER`) | `/register/ambulance`, `/ambulance/dashboard`, `/ambulance/emergency/new` (requirements · ranked hospitals · map), `/ambulance/emergency/:id` (countdown, reservation, timeline) |
| Hospital (mobile-first) | `/register/hospital`, `/hospital/dashboard` (incoming request with Accept/Reject, counters, Confirm all, load), `/hospital/beds` (add beds, one-tap status), `/hospital/requests`, `/hospital/profile` |

There is no admin panel. The login page has one-click demo account buttons (hide them with
`VITE_SHOW_DEMO_ACCOUNTS=false`).

### Hospital verification

Self-registered hospitals are checked automatically (registration-number and ABDM HFR ID
format, unique registration number / HFR ID / emails, no same-named hospital within 1 km) and
then start **PENDING**: they can sign in and add beds, but ambulances can't see them until verified:

```bash
cd server
npm run hospitals                                   # list pending registrations (with map link, phone)
npm run hospitals -- verify MH/CE/2024/00123 "Checked state register, called reception"
npm run hospitals -- reject <id> "Registration number not found in state register"
```

Check the registration number against the state Clinical Establishment register, the HFR ID at
facility.abdm.gov.in, and call the official phone before verifying. `HOSPITAL_AUTO_VERIFY=true`
skips this (demos only). Ambulances are active immediately; vehicle numbers are unique.

### Deploy

Everything is configured by env (`server/.env.example`, `client/.env.example`). Fastest path:
Render → New → Blueprint → this repo (`render.yaml`: one service serving API + app on one URL).
Details and the Vercel + Render option: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Demo accounts

Created by `npm run seed`. Demo-only passwords — never reuse them anywhere.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@bedlink.demo` | `Admin@123` |
| Dispatcher | `dispatcher1@bedlink.demo`, `dispatcher2@bedlink.demo` | `Dispatch@123` |
| Hospital staff | `<slug>@bedlink.demo` — `lakeside`, `citygeneral`, `eastwood`, `greenfield`, `sunrise`, `harbourview`, `staurora`, `riverside`, `westbay`, `hilltop`, `northgate`, `farcoast` | `Hospital@123` |

Demo scenario: from the default patient location (19.0760, 72.8777) request
**ICU + Ventilator + Cardiology** — Lakeside, City General, Greenfield (stale) and Eastwood
rank; every exclusion reason appears (Sunrise: no ventilator, St. Aurora: critical load,
Westbay: no ICU, Harbourview/Hilltop/Riverside: no cardiology, Northgate: inactive,
Far Coast: out of range). Eastwood has exactly one matching bed (good for the
double-booking demo).
