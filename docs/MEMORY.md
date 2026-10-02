# BedLink — Memory (Living Project State)

> This file is the single place that says **what is actually true right now**.
> Read it first when you (human or AI agent) pick the project up. Update it at the end of every work session.
>
> **Related docs:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [RULES.md](./RULES.md) · [PHASES.md](./PHASES.md) · [DESIGN.md](./DESIGN.md)

## Rules for This File

| # | Rule |
|---|---|
| 1 | Record only work that is **done and verified**. Never write planned work as completed. |
| 2 | Keep **Current State** short and current; move history into the **Session Log**. |
| 3 | Newest session log row goes on top. |
| 4 | Any decision that changes an enum, endpoint, event, model field or matching weight must also be updated in the relevant doc in the same change. |

---

## Current State

| Field | Value |
|---|---|
| **Current Phase** | Backend and frontend for Phases 0–8 done. |
| **Current Status** | `server/` is runnable: Express + Socket.IO + Mongoose API covering auth/RBAC, hospitals & beds, emergencies + matching, 2-minute handshake with server timeout + sweeper, automatic fallback, bed reservation (atomic lock + transaction/compensation), analytics, users, notifications, seed data. |
| **Completed** | All endpoints in ARCHITECTURE.md §8 + `GET /api/reservations`; all socket events in §9; matching engine §10; handshake/fallback/cancel §11; concurrency §13. Verified by `npm test` (83 tests: matching unit tests, API integration, double-accept concurrency with and without transactions, timeout → fallback, sweeper, sockets), `npm run lint`, `npm run format:check`, and a manual curl run of the full demo flow incl. server restart mid-offer. |
| **Currently Working On** | — |
| **Problems / Bugs** | Not yet verified against MongoDB Atlas or on Render (tested locally on MongoDB 8.3 single-node replica set). |
| **Next Task** | Deploy per docs/DEPLOYMENT.md (Render blueprint or Vercel + Render), seed Atlas, rehearse the PHASES.md demo script. |

### Files Changed

| File / Folder | Change | Notes |
|---|---|---|
| `server/package.json`, `server/package-lock.json` | Created | ES modules; scripts `dev`, `start`, `seed`, `test`, `lint`, `format` |
| `server/src/{app,server}.js` | Created | App factory (Supertest-friendly) + HTTP/Socket.IO boot, sweeper, timer restore, graceful shutdown |
| `server/src/config/*` | Created | `env.js` (Zod, refuses to start), `db.js` (`runInTransaction`), `cors.js`, `cookie.js` |
| `server/src/constants/*` | Created | All enums, socket events, error codes, matching weights/reason text, seed data |
| `server/src/models/*` | Created | 8 models + indexes (2dsphere, unique partial indexes) + shared toJSON plugin |
| `server/src/repositories/*` | Created | All queries incl. atomic conditional transitions |
| `server/src/services/*` | Created | auth, user, hospital, bed, matching (pure), emergency (create/offer/respond/fallback/cancel/timers/query), reservation, notification, analytics, sweeper |
| `server/src/{controllers,routes,validators,middleware,sockets,utils}/*` | Created | Thin controllers, Zod validators, RBAC, rate limits, error handler, socket auth + rooms + handlers |
| `server/tests/*`, `server/src/services/**/__tests__/*` | Created | Vitest + Supertest + mongodb-memory-server + socket.io-client |
| `server/{eslint.config.js,.prettierrc.json,.prettierignore,vitest.config.js}` | Created | Tooling |
| `docs/ARCHITECTURE.md`, `docs/RULES.md`, `.env.example`, `README.md` | Updated | See Decisions #14–#21 |

### Decisions Made

Recorded while writing the docs, so the code follows them from day one.

| # | Area | Decision | Reference |
|---|---|---|---|
| 1 | Resource modelling | The five product resources map to `Bed.type` (`ICU`, `CARDIAC`, `BURNS`, `GENERAL`), `Bed.equipment` (`VENTILATOR`, `OXYGEN`, `CARDIAC_MONITOR`) and `Hospital.specialties` (`CARDIOLOGY`, `BURNS`, `TRAUMA`, `NEUROLOGY`, `GENERAL_MEDICINE`). | PRD §4.1 |
| 2 | Data model | `HospitalRequest` model added (one offer per hospital contacted) — needed by `/api/hospital-requests/:id/*` and to carry the 2-minute window. | ARCH §6.5 |
| 3 | Socket events | Names use `noun:verb` with colons (`bed:updated`, `hospital:request`, …) everywhere; added `emergency:updated`, `hospital:request-cancelled`, `reservation:released`. | ARCH §9 |
| 4 | API style | All mutations go through REST; socket `emergency:create` / `hospital:respond` are optional thin wrappers over the same services. | ARCH §9.2 |
| 5 | Offers | Sequential offers: only one `PENDING` offer per emergency (unique partial index). | ARCH §6.5 |
| 6 | Fallback | Fallback re-runs matching with fresh data, excluding already-contacted hospitals. | ARCH §11.5 |
| 7 | Matching weights | Resource 50 · Travel 25 · Freshness 15 · Load 10. Freshness tiers: `FRESH` ≤ 120 s, `RECENT` ≤ 600 s. | ARCH §10 |
| 8 | ETA & maps | ETA is a deterministic estimate (haversine × 1.3 ÷ 30 km/h), labelled "est."; maps via Leaflet + OpenStreetMap. | ARCH §12 |
| 9 | Timeouts | Server-owned: in-process timer + 10 s sweeper (survives restarts). | ARCH §11.2 |
| 10 | Double booking | Atomic `findOneAndUpdate` on `status: AVAILABLE` + unique partial index on active reservations + transaction (compensation if no replica set). | ARCH §13 |
| 11 | Reservation hold | 30 min (`RESERVATION_HOLD_MINUTES`); expiry returns bed to `AVAILABLE`, dispatcher retries manually. | ARCH §13.4 |
| 12 | Language | JavaScript (ES modules) on client and server; no TypeScript. | RULES §2 |
| 13 | Reservations API | Admin-only `POST /api/reservations` kept for manual holds/testing; normal reservations are created by accept. | ARCH §8.2 |
| 14 | Reservations API | Added `GET /api/reservations?status=` (role-scoped) so the hospital "Active reservations" list can get reservation ids for Mark arrived / Release. Accepted offers in `GET /api/hospital-requests` also embed their reservation. | ARCH §8.2 |
| 15 | Error codes | Added `DUPLICATE_RESOURCE` (409) for duplicate user email / bed label. | RULES §3.2 |
| 16 | Config | Added `MATCH_MAX_RADIUS_KM=50` (referenced in ARCH §10.1 but missing from config) and `CONFIDENCE_TIMEOUT_WINDOW_MINUTES=30`. | ARCH §15, `.env.example` |
| 17 | Matching output | Exclusions carry server-generated `messages` next to `reasons` codes; candidates/exclusions carry `coordinates` for map markers; candidates carry `confidenceReasons`. `matchSnapshot` stores `distanceKm`. | ARCH §6.5, §10.6 |
| 18 | NO_MATCH retry | Retrying a `NO_MATCH` emergency starts a new round: `contactedHospitalIds` is cleared before re-matching. A manual pick of an already-contacted hospital in the same round is refused (`HOSPITAL_NO_LONGER_MATCHES`). | ARCH §7.2 |
| 19 | Socket payload | `bed:updated` for Confirm all sends `bedId: null` + `confirmed` count. | ARCH §9.3 |
| 20 | Accept failure | In transaction mode a failed bed lock rolls the whole accept back, then the offer goes `PENDING → REJECTED (NO_BED_AT_ACCEPT)` and fallback runs; without transactions it goes `ACCEPTED → REJECTED` and the lock is compensated. | ARCH §11.3, §13.3 |
| 21 | Rate limits | Disabled when `NODE_ENV=test` so the suite can log in repeatedly. | ARCH §14 |
| 26 | Panels & registration | No admin UI: two panels, Ambulance (API role `DISPATCHER`, routes `/ambulance/*`) and Hospital, both with public sign-up. Hospitals start PENDING/INACTIVE after automatic checks and are verified via the `npm run hospitals` CLI (or `HOSPITAL_AUTO_VERIFY`); unverified hospitals never appear to ambulances. Hospital staff can add their own beds and edit specialties/phone/contact. `CLIENT_ORIGIN` entries are normalised to bare origins. | README, ARCH §8.2 |
| 25 | Deployment | All deploy settings are env: server adds `HOST`, `TRUST_PROXY`, `COOKIE_*`, `SERVE_CLIENT_DIR`, `DNS_SERVERS` (the hardcoded 8.8.8.8 resolver in `server.js` is now opt-in), `SEED_ALLOW_PRODUCTION`; client reads every `VITE_*` in `src/config.js`. Recommended deploy is one service serving API + SPA (`render.yaml`) because cross-site cookies are blocked by Safari. | DEPLOYMENT.md, ARCH §15 |
| 23 | Client dev | Vite proxies `/api` and `/socket.io` to the server, so dev is same-origin; `VITE_API_URL` / `VITE_SOCKET_URL` only needed for production builds. | ARCH §15 |
| 24 | Client UI | Admin/dispatcher use a sidebar "Dispatch hub" shell and the hospital UI a mobile shell with bottom tabs, following the team's Stitch mockups on top of DESIGN.md tokens. Admin gets an extra `/admin/emergencies` list and reuses the emergency detail page at `/admin/emergency/:id`. | DESIGN §8 |
| 22 | Rate limits | Login limit configurable via `LOGIN_RATE_LIMIT_PER_MINUTE` (default 10) so the full Postman collection (≈14 logins in a few seconds) can run locally. | ARCH §14–§15 |

### Notes

| # | Note |
|---|---|
| 1 | Demo seed data must use fictional hospital names and no patient PII (RULES.md §9). |
| 2 | Render free tier sleeps — warm `/api/health` before demos. |

---

## Session Log

Add one row per work session, newest on top. Be factual. If a column has nothing, write "—".

| Date | Who / Agent | Phase | Completed (verified only) | Currently Working On | Files Changed | Decisions Made | Problems / Bugs | Next Task | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-02 | Claude Code | Frontend Phases 0–8 — done | Full `client/` wired to the real API + sockets; `vite build` clean; Playwright run against a local replica set: login (all roles), match → request → hospital accept (live) → reservation → mark arrived, reject → automatic fallback, admin CRUD drawers, no horizontal scroll at 390 px | — | `client/**` rewritten in place (same layout) + new `app/App.jsx`, `main.jsx`, shell/components | #23–#24 | Map tiles / Google Fonts not checked online (blocked in the test sandbox) | Deploy | Demo logins on the login page |
| 2026-10-02 | Claude Code | Backend Phases 0–8 — done (server only) | Full `server/` per ARCHITECTURE.md; 83 tests pass; lint + format clean; manual demo flow + restart-mid-offer recovery checked | — | `server/**` created; `docs/ARCHITECTURE.md`, `docs/RULES.md`, `.env.example`, `README.md` updated | #14–#21 | Not yet run against Atlas/Render | Client Phase 0–1 | Offline tests: `MONGOMS_SYSTEM_BINARY=/path/to/mongod npm test` |
| 2026-10-02 | Documentation setup | Phase 0 — not started | Six documentation files drafted (not yet reviewed by the team) | Documentation review | `docs/*.md`, folder skeleton, `.env.example`, `.gitignore`, `README.md` — created | See Decisions Made #1–13 | None | Phase 0 setup | No application code exists yet |

### Row Template

Copy this row to the top of the Session Log table:

```md
| YYYY-MM-DD | <who / which agent> | Phase N — <in progress / done> | <verified items> | <what is mid-way, with paths> | <path — change> | <decision — why — doc updated> | <issue — status> | <single next step> | <anything the next person must know> |
```
