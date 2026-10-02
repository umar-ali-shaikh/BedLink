# BedLink — Architecture

> Modular monolith: one React SPA + one Node.js/Express server (REST + Socket.IO) + MongoDB.
> No microservices, no message broker, no separate worker process.
>
> **Related docs:** [PRD.md](./PRD.md) · [RULES.md](./RULES.md) · [PHASES.md](./PHASES.md) · [DESIGN.md](./DESIGN.md) · [MEMORY.md](./MEMORY.md)

---

## 1. High-Level Architecture

```text
┌──────────────────────────── React SPA (Vite) ────────────────────────────┐
│  Dispatcher UI        Hospital UI (mobile-first)        Admin UI         │
│        │                       │                           │             │
│   TanStack Query + Axios (REST)          socket.io-client (real-time)    │
└────────┬───────────────────────────────────────────┬─────────────────────┘
         │ HTTPS (cookie: bl_token)                   │ WSS (same cookie)
         ▼                                            ▼
┌────────────────────────── Node.js + Express ──────────────────────────────┐
│ middleware: helmet · cors · rateLimit · cookieParser · auth · rbac · zod  │
│ routes → controllers (thin) → services (business logic) → repositories    │
│                                                                           │
│ services: auth · hospital · bed · emergency · matching · reservation ·    │
│           notification · analytics                                        │
│                                                                           │
│ sockets/ (Socket.IO server, auth, rooms)  ◄── notification service emits  │
│ jobs inside services: offer-timeout timers + 10 s sweeper                 │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ▼
                         MongoDB (Atlas, replica set)
```

Key data flows:

```text
Bed update:      Hospital UI → PATCH /api/beds/:id → bedService → Mongo
                 → notificationService.emit('bed:updated') → dispatchers, admin, own hospital

Emergency:       Dispatcher UI → POST /api/emergencies → emergencyService
                 → matchingService.rank() → save candidates/exclusions → emergency:created
                 → POST /api/emergencies/:id/request-hospital → HospitalRequest(PENDING, +120 s)
                 → hospital:request → Hospital UI
                 → accept → reservationService.lockBed() → reservation:created
                 → reject/timeout → emergencyService.fallback() → next hospital:request
```

---

## 2. Architecture Style

**Layered modular monolith.**

| Layer | Does | Must not |
|---|---|---|
| `routes/` | Map URL + method → middleware chain → controller | Contain logic |
| `validators/` | Zod schemas for body/params/query | Touch the DB |
| `controllers/` | Read validated input, call **one** service method, shape HTTP response | Contain business rules, call models directly |
| `services/` | All business logic, state transitions, emits events via notification service | Know about `req`/`res` |
| `repositories/` | All Mongoose queries, including atomic conditional updates | Contain business decisions |
| `models/` | Mongoose schemas, indexes | Contain business logic (no fat hooks) |
| `sockets/` | Socket.IO server, handshake auth, room joins | Mutate data directly (they call services) |

Why: the hackathon team will have 3–5 people editing in parallel. Thin controllers +
services keep the critical logic (matching, timeout, locking) in a few testable files.

---

## 3. Backend Structure

```text
server/
├── package.json
└── src/
    ├── app.js               # builds the Express app: middleware, routes, error handler
    ├── server.js            # creates HTTP server, attaches Socket.IO, connects Mongo, starts sweeper
    ├── config/              # env loading + validation (zod), db connection, socket config, cookie options
    │   ├── env.js
    │   ├── db.js            # connectDB, ensureIndexes, runInTransaction (§13.3)
    │   ├── cors.js
    │   └── cookie.js        # bl_token name + options (shared by login/logout)
    ├── constants/           # enums & defaults shared by the server (single source of truth)
    │   ├── roles.js         # ADMIN, HOSPITAL, DISPATCHER
    │   ├── bed.js           # BED_TYPES, EQUIPMENT, BED_STATUS
    │   ├── hospital.js      # SPECIALTIES, HOSPITAL_STATUS
    │   ├── emergency.js     # EMERGENCY_STATUS, URGENCY, OFFER_STATUS, TIMELINE_EVENTS
    │   ├── reservation.js   # RESERVATION_STATUS
    │   ├── matching.js      # WEIGHTS, FRESHNESS tiers, EXCLUSION_REASONS
    │   ├── socketEvents.js  # every event name (never hardcode strings elsewhere)
    │   ├── errorCodes.js
    │   └── seedData.js      # demo hospitals, beds, users
    ├── controllers/         # one file per resource: auth, hospital, bed, emergency,
    │                        # hospitalRequest, reservation, analytics, user, notification
    ├── middleware/
    │   ├── authenticate.js  # reads bl_token cookie, verifies JWT, loads user → req.user
    │   ├── authorize.js     # authorize(...roles)
    │   ├── validate.js      # validate({ body, params, query }) with zod
    │   ├── rateLimit.js
    │   ├── requestLogger.js # one JSON line per request (no bodies)
    │   └── errorHandler.js  # maps AppError → standard error response; hides internals
    ├── models/              # User, Hospital, Bed, EmergencyRequest, HospitalRequest,
    │                        # Reservation, EmergencyTimeline, Notification
    │                        # plugins/toJSON.js: _id → id, GeoJSON → { lat, lng }, no passwordHash
    ├── repositories/        # userRepo, hospitalRepo, bedRepo, emergencyRepo,
    │                        # hospitalRequestRepo, reservationRepo, timelineRepo, notificationRepo
    ├── routes/              # index.js mounts /api/*; one router per resource
    ├── services/
    │   ├── auth/            # login, logout, me, password hashing, token signing
    │   ├── hospital/        # CRUD, load updates, nearby lookup
    │   ├── bed/             # status changes (incl. state-machine guard), confirm-all, summaries
    │   ├── emergency/       # create, request-hospital, accept/reject, fallback, cancel, timers, timeline
    │   ├── matching/        # filter.js, score.js, freshness.js, confidence.js, eta.js, index.js (rank)
    │   ├── reservation/     # lockBed (atomic), release, fulfil, expiry sweep
    │   ├── notification/    # emit(event, rooms, payload) + persist Notification
    │   ├── analytics/       # overview aggregation
    │   ├── user/            # admin user management (hospitalId iff HOSPITAL)
    │   ├── access.js        # shared ownership helpers (own-hospital scope)
    │   └── sweeper.js       # 10 s loop: expireOverdueOffers + expireOverdueReservations
    ├── sockets/
    │   ├── index.js         # io setup, CORS, handshake auth middleware
    │   ├── rooms.js         # room name helpers: hospitalRoom(id), dispatcherRoom(userId), ...
    │   └── handlers.js      # join:hospital, join:dispatcher, (optional) emergency:create, hospital:respond
    ├── utils/
    │   ├── AppError.js      # new AppError(code, message, httpStatus)
    │   ├── asyncHandler.js
    │   ├── geo.js           # haversine
    │   ├── logger.js        # tiny JSON logger (no secrets)
    │   ├── response.js      # ok(res, data), fail(...)
    │   ├── cookies.js       # Cookie header parser for the socket handshake
    │   ├── ids.js           # idOf / sameId helpers
    │   └── seed.js          # `npm run seed` — wipes & loads constants/seedData.js
    └── validators/          # auth, hospital, bed, emergency, reservation, user, common (objectId, coords)
```

---

## 4. Frontend Structure

**Feature-based architecture.** Code for one domain (e.g. emergency) lives together —
API calls, hooks, components, schemas — so a teammate can own a feature without touching
five shared folders. Shared, domain-free pieces live in `components/`, `hooks/`, `utils/`.

```text
client/
├── package.json
└── src/
    ├── main.jsx                 # entry: renders <App/>
    ├── app/                     # App.jsx, router.jsx, providers.jsx (QueryClient, Auth, Socket), ProtectedRoute.jsx
    ├── components/              # design-system primitives: Button, Card, Badge, StatusIndicator,
    │                            # FreshnessIndicator, CountdownTimer, Toast, Table, EmptyState,
    │                            # ErrorState, Skeleton, Modal (spec in DESIGN.md)
    ├── features/
    │   ├── auth/                # useAuth, LoginForm, auth api
    │   ├── dispatcher/          # EmergencyForm, CandidateList, HospitalCard, ExcludedList, MapPanel
    │   ├── hospital/            # IncomingRequestCard, RequestQueue, LoadControl
    │   ├── emergency/           # useEmergency(id), EmergencyTimeline, StatusBanner, emergency api
    │   ├── beds/                # BedGrid, BedTile, BedCounters, ConfirmAllButton, beds api
    │   ├── reservations/        # ReservationCard, reservations api
    │   └── analytics/           # KpiRow, ResponseChart (Recharts), analytics api
    ├── layouts/                 # AuthLayout, DispatcherLayout (desktop), HospitalLayout (mobile), AdminLayout
    ├── pages/                   # thin route components that compose features
    ├── services/                # axios instance (withCredentials, base URL, error normalising)
    ├── hooks/                   # useNow (1 s tick), useRelativeTime, useOnlineStatus, useDebounce
    ├── socket/                  # socket singleton, SocketProvider, useSocketEvent(event, handler)
    ├── utils/                   # formatEta, formatRelative, cn()
    └── constants/               # mirrors server enums + socketEvents + routes
```

State strategy: **server state in TanStack Query**; socket events **invalidate or patch**
query caches (`queryClient.setQueryData` / `invalidateQueries`). No Redux.

---

## 5. Pages & Routes

| Route | Role | Purpose |
|---|---|---|
| `/login` | public | Email + password; demo account quick-fill buttons in dev |
| `/dispatcher/dashboard` | DISPATCHER | Active requests, live bed summary, mini analytics |
| `/dispatcher/emergency/new` | DISPATCHER | Requirement form + map + ranked candidates + exclusions |
| `/dispatcher/emergency/:id` | DISPATCHER (owner) / ADMIN | Live status, countdown, timeline, reservation |
| `/hospital/dashboard` | HOSPITAL | Incoming request (top, prominent), bed counters, load control |
| `/hospital/beds` | HOSPITAL | Bed grid with one-tap status chips, Confirm all |
| `/hospital/requests` | HOSPITAL | Pending + recent requests, active reservations, "Mark arrived" |
| `/admin/dashboard` | ADMIN | Analytics + live emergencies |
| `/admin/hospitals` | ADMIN | Hospital list/create/edit, bed inventory |
| `/admin/users` | ADMIN | User list/create, role + hospital assignment |

After login, users are redirected to their role's dashboard. Wrong-role access → redirect
to own dashboard (client) **and** 403 from API (server is the real guard).

---

## 6. Database Models

All models have `timestamps: true` (`createdAt`, `updatedAt`). IDs are Mongo `ObjectId`s.

### Relationships

```text
Hospital 1 ── * Bed
Hospital 1 ── * User (role HOSPITAL)
User(DISPATCHER) 1 ── * EmergencyRequest
EmergencyRequest 1 ── * HospitalRequest   (one per hospital contacted, sequential)
EmergencyRequest 1 ── * EmergencyTimeline
EmergencyRequest 1 ── 0..1 Reservation (ACTIVE)
HospitalRequest(ACCEPTED) 1 ── 1 Reservation
Bed 1 ── 0..1 Reservation (ACTIVE)        ← enforced by unique partial index
User 1 ── * Notification
```

> `HospitalRequest` is required by the `/api/hospital-requests/:id/*` endpoints: it is
> the per-hospital offer that carries the 2-minute window. It is the one model added
> beyond the original list.

### 6.1 User

| Field | Type | Notes |
|---|---|---|
| `name` | String, required | |
| `email` | String, required, unique, lowercase | |
| `passwordHash` | String, required, `select: false` | bcrypt, cost 10 |
| `role` | enum `ADMIN \| HOSPITAL \| DISPATCHER` | |
| `hospitalId` | ObjectId → Hospital | **required iff** role = HOSPITAL, else null |
| `isActive` | Boolean, default true | |
| `createdAt`, `updatedAt` | Date | |

### 6.2 Hospital

| Field | Type | Notes |
|---|---|---|
| `name` | String, required | |
| `address` | String | |
| `location` | GeoJSON Point `{ type: 'Point', coordinates: [lng, lat] }` | `2dsphere` index. API exposes it as `coordinates: { lat, lng }` |
| `specialties` | [enum SPECIALTIES] | |
| `currentLoad` | Number 0–100, default 50 | Set by hospital staff (slider) |
| `status` | enum `ACTIVE \| INACTIVE` | |
| `lastAvailabilityUpdate` | Date | Denormalised max(bed.updatedAt); updated by bed service |
| `createdAt`, `updatedAt` | Date | |

### 6.3 Bed

| Field | Type | Notes |
|---|---|---|
| `hospitalId` | ObjectId → Hospital, indexed | |
| `label` | String | Human label, e.g. `ICU-04` (unique per hospital) |
| `type` | enum BED_TYPES | |
| `equipment` | [enum EQUIPMENT] | |
| `status` | enum BED_STATUS | |
| `lastUpdatedBy` | ObjectId → User | Audit |
| `updatedAt` | Date | **Freshness source.** Bumped on status change and on Confirm all |

Indexes: `{ hospitalId: 1, type: 1, status: 1 }`, `{ hospitalId: 1, label: 1 }` unique.

### 6.4 EmergencyRequest

| Field | Type | Notes |
|---|---|---|
| `dispatcherId` | ObjectId → User | Owner |
| `demoPatientId` | String | e.g. `DEMO-P-0042`; never real identity |
| `patientLocation` | GeoJSON Point | |
| `requirements` | `{ bedType, equipment: [], specialties: [] }` | |
| `urgency` | enum `CRITICAL \| HIGH \| MODERATE` | default `HIGH` |
| `status` | enum EMERGENCY_STATUS | see §7 |
| `currentHospital` | ObjectId → Hospital \| null | Hospital currently offered / holding |
| `currentHospitalRequestId` | ObjectId \| null | The live offer |
| `contactedHospitalIds` | [ObjectId] | Excluded from re-matching |
| `candidates` | [CandidateSnapshot] | Last ranking result (see §10.6) |
| `exclusions` | [{ hospitalId, hospitalName, reasons: [code] }] | "Why not" |
| `matchingDurationMs` | Number | Analytics |
| `reservationId` | ObjectId \| null | |
| `createdAt`, `updatedAt` | Date | |

### 6.5 HospitalRequest (offer)

| Field | Type | Notes |
|---|---|---|
| `emergencyId` | ObjectId → EmergencyRequest, indexed | |
| `hospitalId` | ObjectId → Hospital, indexed | |
| `attempt` | Number | 1, 2, 3 … |
| `status` | enum `PENDING \| ACCEPTED \| REJECTED \| TIMEOUT \| CANCELLED` | |
| `offeredAt` | Date | |
| `expiresAt` | Date | `offeredAt + OFFER_TIMEOUT_SECONDS` |
| `respondedAt` | Date \| null | |
| `respondedBy` | ObjectId → User \| null | |
| `rejectReason` | enum `NO_BED`, `NO_STAFF`, `EQUIPMENT_ISSUE`, `OTHER`, `NO_BED_AT_ACCEPT` | |
| `matchSnapshot` | `{ score, etaMinutes, distanceKm, confidence }` | What the hospital/dispatcher saw |

Index: `{ status: 1, expiresAt: 1 }` (sweeper), unique partial index
`{ emergencyId: 1 }` where `status = 'PENDING'` (**at most one live offer per emergency**).

### 6.6 Reservation

| Field | Type | Notes |
|---|---|---|
| `requestId` | ObjectId → EmergencyRequest | |
| `hospitalRequestId` | ObjectId → HospitalRequest \| null | null for admin manual holds |
| `hospitalId` | ObjectId → Hospital | |
| `bedId` | ObjectId → Bed | |
| `status` | enum `ACTIVE \| FULFILLED \| EXPIRED \| RELEASED` | |
| `expiresAt` | Date | `now + RESERVATION_HOLD_MINUTES` |
| `createdBy` | ObjectId → User | |
| `createdAt`, `updatedAt` | Date | |

Indexes: **unique partial** `{ bedId: 1 }` where `status = 'ACTIVE'`;
unique partial `{ requestId: 1 }` where `status = 'ACTIVE'`; `{ status: 1, expiresAt: 1 }`.

### 6.7 EmergencyTimeline

| Field | Type | Notes |
|---|---|---|
| `emergencyId` | ObjectId, indexed | |
| `event` | enum TIMELINE_EVENTS | see below |
| `actor` | `{ type: 'USER' \| 'SYSTEM', userId?, role? }` | `SYSTEM` for timeouts/fallback |
| `hospitalId` | ObjectId \| null | |
| `timestamp` | Date | |
| `metadata` | Object | small, e.g. `{ score, reason, bedLabel, durationMs }` |

`TIMELINE_EVENTS`: `REQUEST_CREATED`, `MATCHING_COMPLETED`, `HOSPITAL_CONTACTED`,
`HOSPITAL_ACCEPTED`, `HOSPITAL_REJECTED`, `HOSPITAL_TIMEOUT`, `ACCEPT_FAILED_NO_BED`,
`BED_RESERVED`, `NO_HOSPITALS_REMAINING`, `REQUEST_CANCELLED`, `RESERVATION_EXPIRED`,
`RESERVATION_RELEASED`, `PATIENT_ARRIVED`.

The timeline is append-only and doubles as the emergency **audit log**.

### 6.8 Notification

Persisted copy of user-facing alerts so a reconnecting client can catch up.

| Field | Type |
|---|---|
| `userId` *or* `hospitalId` | ObjectId (one of them) |
| `type` | socket event name (e.g. `hospital:request`) |
| `title`, `body` | String |
| `refId` | ObjectId (emergency / hospitalRequest) |
| `readAt` | Date \| null |
| `createdAt` | Date (TTL index: 7 days) |

---

## 7. State Machines

### 7.1 Bed

```text
            staff                    staff
AVAILABLE ◄──────► OCCUPIED ◄──────► CLEANING
    ▲  ▲               ▲                 │
    │  └───────────────┼─────── staff ───┘
    │ staff            │
UNAVAILABLE            │ fulfil (patient arrived)
                       │
AVAILABLE ──lockBed──► RESERVED ──expire / release──► AVAILABLE
```

- Staff may move between `AVAILABLE`, `OCCUPIED`, `CLEANING`, `UNAVAILABLE` freely.
- Only `reservationService` may set or leave `RESERVED`:
  `AVAILABLE → RESERVED` (lock), `RESERVED → OCCUPIED` (fulfil),
  `RESERVED → AVAILABLE` (expire/release).
- `PATCH /api/beds/:id` on a `RESERVED` bed → `409 INVALID_STATE_TRANSITION`.

### 7.2 EmergencyRequest

```text
SEARCHING ──offer sent──► AWAITING_HOSPITAL ──accepted──► RESERVED ──arrived──► COMPLETED
    ▲                         │      │                       │
    └──── reject/timeout ─────┘      │                       └─ reservation expired/released ─► SEARCHING*
          (fallback re-match)        │
SEARCHING/AWAITING ── no candidates ──► NO_MATCH
any non-terminal ── dispatcher cancel ──► CANCELLED
```

`*` After a reservation expires the dispatcher must explicitly retry
(`POST /api/emergencies/:id/request-hospital`); no automatic re-offer.
Terminal: `COMPLETED`, `NO_MATCH`, `CANCELLED`. (`NO_MATCH` can be retried by the
dispatcher, which re-runs matching and returns it to `SEARCHING`; a retry starts a new
round, so `contactedHospitalIds` is cleared.) `NO_MATCH` can also be cancelled.

### 7.3 HospitalRequest

`PENDING → ACCEPTED | REJECTED | TIMEOUT | CANCELLED` — exactly one transition, made with
a conditional update `{ _id, status: 'PENDING' }`. Whoever writes first wins.

### 7.4 Reservation

`ACTIVE → FULFILLED | EXPIRED | RELEASED`.

---

## 8. API Design

### 8.1 Conventions

- Base path `/api`. JSON only. Auth via HttpOnly cookie `bl_token`.
- Success: `{ "success": true, "data": … }`
- Error: `{ "success": false, "message": "Human readable", "code": "ERROR_CODE" }` (+ optional `details` for validation field errors)
- Times are ISO-8601 UTC strings. Coordinates in API are `{ "lat": n, "lng": n }`.
- Every route: `authenticate` → `authorize(roles)` → `validate(schema)` → controller.
- Ownership checks (own hospital / own emergency) happen in the **service**.

### 8.2 Endpoints

**Auth**

| Method & path | Roles | Notes |
|---|---|---|
| `POST /api/auth/login` | public (rate-limited 10/min/IP) | Sets `bl_token`; returns user |
| `POST /api/auth/register/ambulance` | public (rate-limited) | Creates an active DISPATCHER (ambulance) account with `{ vehicleNumber, ambulanceType, organization }`; signs in |
| `POST /api/auth/register/hospital` | public (rate-limited) | `{ hospital, contact }` → Hospital (`verificationStatus: PENDING`, `status: INACTIVE`) + HOSPITAL user; signs in. Unverified hospitals are excluded from matching, `/hospitals` and `/hospitals/nearby` for non-admins. Verified with `npm run hospitals -- verify` |
| `GET /api/auth/config` | public | `{ googleClientId, registrationEnabled }` for the login/register screens |
| `POST /api/auth/google` | public (rate-limited) | `{ credential }` (Google ID token) → signs in an existing account (links by email); unknown email → `404 GOOGLE_ACCOUNT_NOT_FOUND` with `details` email/name. Registration bodies accept `googleCredential` instead of a password |
| `POST /api/auth/logout` | any authenticated | Clears cookie |
| `GET /api/auth/me` | any authenticated | Current user (+ hospital summary for HOSPITAL) |

**Hospitals**

| Method & path | Roles | Notes |
|---|---|---|
| `GET /api/hospitals` | ADMIN, DISPATCHER | List with bed summary + freshness |
| `GET /api/hospitals/nearby?lat=&lng=&radiusKm=` | ADMIN, DISPATCHER | Map markers, sorted by distance |
| `GET /api/hospitals/:id` | ADMIN, DISPATCHER, HOSPITAL (own only) | |
| `POST /api/hospitals` | ADMIN | Create |
| `PATCH /api/hospitals/:id` | ADMIN (all fields); HOSPITAL own (`currentLoad`, `specialties`, `phone`, `contactName`) | |

**Beds**

| Method & path | Roles | Notes |
|---|---|---|
| `GET /api/hospitals/:id/beds` | ADMIN, DISPATCHER, HOSPITAL (own) | |
| `POST /api/hospitals/:id/beds` | ADMIN, HOSPITAL (own) | Add bed to inventory |
| `PATCH /api/beds/:id` | HOSPITAL (own), ADMIN | Body `{ status }`; cannot set/leave `RESERVED` |
| `POST /api/hospitals/:id/beds/confirm` | HOSPITAL (own), ADMIN | "Confirm all": bumps `updatedAt` of non-reserved beds |

**Emergencies**

| Method & path | Roles | Notes |
|---|---|---|
| `POST /api/emergencies` | DISPATCHER | Creates + runs matching; returns emergency with `candidates`, `exclusions` |
| `GET /api/emergencies?status=` | DISPATCHER (own), ADMIN (all) | Dashboard list |
| `GET /api/emergencies/:id` | DISPATCHER (owner), ADMIN; HOSPITAL if it was contacted | Includes timeline, current offer, reservation |
| `POST /api/emergencies/:id/request-hospital` | DISPATCHER (owner) | Body `{ hospitalId? }` — omitted = top candidate. Re-validates the hospital still matches. 409 if an offer is already pending |
| `POST /api/emergencies/:id/cancel` | DISPATCHER (owner), ADMIN | Cancels pending offer and releases active reservation |

**Hospital requests (offers)**

| Method & path | Roles | Notes |
|---|---|---|
| `GET /api/hospital-requests?status=` | HOSPITAL (own hospital), ADMIN | Incoming queue, sorted urgency → expiresAt |
| `POST /api/hospital-requests/:id/accept` | HOSPITAL (own) | Locks bed; 409 `OFFER_EXPIRED`, `OFFER_ALREADY_RESOLVED`, `BED_NOT_AVAILABLE` |
| `POST /api/hospital-requests/:id/reject` | HOSPITAL (own) | Body `{ reason }`; triggers fallback |

**Reservations**

| Method & path | Roles | Notes |
|---|---|---|
| `GET /api/reservations?status=` | HOSPITAL (own hospital), DISPATCHER (own emergencies), ADMIN | Active/recent holds with bed label — feeds the hospital "Active reservations" list (Mark arrived / Release) |
| `POST /api/reservations` | ADMIN | Manual hold `{ requestId, bedId }` — same atomic lock path; used for ops/demo testing of double booking. Emergency must be `SEARCHING` or `NO_MATCH` |
| `POST /api/reservations/:id/release` | HOSPITAL (own), DISPATCHER (owner of request), ADMIN | Bed → `AVAILABLE` |
| `POST /api/reservations/:id/arrive` | HOSPITAL (own) | Bed → `OCCUPIED`, reservation `FULFILLED`, emergency `COMPLETED` |

**Analytics**

| Method & path | Roles | Notes |
|---|---|---|
| `GET /api/analytics/overview` | ADMIN, DISPATCHER | KPIs from PRD F11 (aggregations, no caching needed at MVP scale) |

**Users & notifications**

| Method & path | Roles | Notes |
|---|---|---|
| `GET /api/users` | ADMIN | |
| `POST /api/users` | ADMIN | `hospitalId` required when role = HOSPITAL |
| `PATCH /api/users/:id` | ADMIN | Role, hospital, `isActive` |
| `GET /api/notifications?unread=true` | any authenticated | Own (or own hospital's) notifications |
| `PATCH /api/notifications/:id/read` | any authenticated (owner) | |

**Admin verification** (ADMIN)

| Method & path | Notes |
|---|---|
| `GET /api/admin/verifications/summary` | Counts by status for hospitals and ambulances |
| `GET /api/admin/verifications/hospitals?status=PENDING\|VERIFIED\|REJECTED\|ALL` | With staff logins |
| `GET /api/admin/verifications/ambulances?status=` | DISPATCHER accounts |
| `POST /api/admin/verifications/hospitals/:id` | `{ decision: VERIFY\|REJECT, note? }` (note required to reject) → emits `verification:updated` to admins and the hospital room |
| `POST /api/admin/verifications/ambulances/:id` | Same; unverified ambulances get `403 ACCOUNT_NOT_VERIFIED` on create emergency / request-hospital |

**Health:** `GET /api/health` → `{ success: true, data: { status: 'ok' } }` (public, for Render).

---

## 9. Socket Events

### 9.1 Connection & auth

- Client connects with `withCredentials: true`; the `bl_token` cookie is sent on the handshake.
- `io.use()` middleware verifies the JWT and attaches `socket.data.user`. Invalid → connection refused.
- On connect the server **auto-joins** rooms from the token (client payloads are never trusted):

| Room | Who joins |
|---|---|
| `hospital:<hospitalId>` | HOSPITAL users of that hospital |
| `dispatcher:<userId>` | That dispatcher |
| `role:DISPATCHER` | All dispatchers (bed availability broadcasts) |
| `role:ADMIN` | All admins |
| `emergency:<emergencyId>` | Owner dispatcher / admin viewing that emergency (joined via `join:dispatcher` with `{ emergencyId }`, authorised in handler) |

### 9.2 Client → Server

| Event | Payload | Behaviour |
|---|---|---|
| `join:hospital` | `{}` | Re-joins own hospital room (after reconnect). Hospital ID taken from token |
| `join:dispatcher` | `{ emergencyId? }` | Re-joins own rooms; with `emergencyId`, joins `emergency:<id>` if owner/admin |
| `emergency:create` | same as `POST /api/emergencies` | **Optional** thin wrapper → `emergencyService.create()`; ack `{ success, data \| code }` |
| `hospital:respond` | `{ hospitalRequestId, action: 'ACCEPT' \| 'REJECT', reason? }` | **Optional** thin wrapper → same service as REST |

MVP frontend uses **REST for all mutations**. The two optional socket mutations, if
implemented, must call the exact same service functions with the same validation and
authorisation.

### 9.3 Server → Client

| Event | Rooms | Payload (minimum) |
|---|---|---|
| `bed:updated` | `role:DISPATCHER`, `role:ADMIN`, `hospital:<id>` | `{ bedId, hospitalId, label, type, equipment, status, updatedAt, summary }` — for **Confirm all**: `bedId: null` and `confirmed: <count>` |
| `emergency:created` | `dispatcher:<owner>`, `role:ADMIN` | `{ emergency }` |
| `emergency:updated` | `emergency:<id>`, `dispatcher:<owner>`, `role:ADMIN` | `{ emergencyId, status, currentHospital, timelineEntry }` |
| `hospital:request` | `hospital:<id>` | `{ hospitalRequestId, emergencyId, requirements, urgency, etaMinutes, distanceKm, expiresAt, serverNow }` |
| `hospital:request-cancelled` | `hospital:<id>` | `{ hospitalRequestId }` |
| `hospital:accepted` | `emergency:<id>`, `dispatcher:<owner>`, `hospital:<id>`, `role:ADMIN` | `{ hospitalRequestId, emergencyId, hospitalId, respondedAt }` |
| `hospital:rejected` | same as above | `{ …, reason }` |
| `hospital:timeout` | same as above | `{ hospitalRequestId, emergencyId, hospitalId }` |
| `reservation:created` | `emergency:<id>`, `dispatcher:<owner>`, `hospital:<id>`, `role:ADMIN` | `{ reservationId, bedId, bedLabel, hospitalId, expiresAt }` |
| `reservation:expired` | same | `{ reservationId, bedId, emergencyId }` |
| `reservation:released` | same | `{ reservationId, bedId, emergencyId, by }` |

`serverNow` lets the client correct clock skew for the countdown.
Event names live only in `constants/socketEvents.js` (both apps).

---

## 10. Matching Algorithm

Located in `server/src/services/matching/`. Pure functions where possible
(`filter`, `score`, `freshness`, `confidence`) so they are unit-testable without a DB.

### 10.1 Input

```js
rank({
  patientLocation: { lat, lng },
  requirements: { bedType, equipment: [], specialties: [] },
  excludeHospitalIds: [],          // already contacted
  now: Date
})
```

Data loaded once per call: hospitals within `MATCH_MAX_RADIUS_KM` (default 50, Mongo
`$geoNear`) — inactive ones too, so they can be listed with `HOSPITAL_INACTIVE` — plus their
beds of `requirements.bedType`.

### 10.2 Hard filters (exclusions)

A hospital is excluded — with **every** applicable reason recorded — if:

| Code | Rule |
|---|---|
| `HOSPITAL_INACTIVE` | `status !== 'ACTIVE'` |
| `ALREADY_CONTACTED` | in `excludeHospitalIds` |
| `NO_MATCHING_BED` | no bed with `type = bedType` **and** `status = AVAILABLE` |
| `MISSING_EQUIPMENT` | AVAILABLE beds of that type exist, but none has all required equipment |
| `MISSING_SPECIALTY` | `requirements.specialties ⊄ hospital.specialties` |
| `CRITICAL_LOAD` | `currentLoad ≥ MATCH_CRITICAL_LOAD` (default 95) |
| `OUT_OF_RANGE` | ETA > `MATCH_MAX_ETA_MINUTES` (default 60) |

"Matching bed" = `type === bedType && status === 'AVAILABLE' && requiredEquipment ⊆ bed.equipment`.

### 10.3 Component scores (each 0–1)

| Component | Weight | Formula |
|---|---|---|
| **Resource** | 50% | `min(matchingBeds, 3) / 3` → 1 bed = 0.33, 2 = 0.67, ≥3 = 1.0 (depth of availability = less chance it is gone on arrival) |
| **Travel** | 25% | `max(0, 1 − etaMinutes / MATCH_MAX_ETA_MINUTES)` |
| **Freshness** | 15% | `FRESH = 1.0`, `RECENT = 0.6`, `STALE = 0.2` |
| **Load** | 10% | `1 − currentLoad / 100` |

```text
score = round(100 × (0.50·resource + 0.25·travel + 0.15·freshness + 0.10·load))
```

Hard filters already guarantee bed type, equipment and specialty fit, so the resource
component measures **how much** matching capacity exists.

> **These are MVP weights**, stored in `constants/matching.js`, and can be tuned.
> Changes must be recorded in MEMORY.md → Decisions Made.

### 10.4 Freshness

```text
freshnessAge = now − max(updatedAt of the hospital's matching AVAILABLE beds)
FRESH  if age ≤ FRESHNESS_FRESH_SECONDS (120)
RECENT if age ≤ FRESHNESS_RECENT_SECONDS (600)
STALE  otherwise
```

### 10.5 Confidence indicator (operational, not medical)

```text
level = FRESH → HIGH, RECENT → MEDIUM, STALE → LOW
if matchingBeds == 1                                      → downgrade one level
if hospital had a TIMEOUT offer in last CONFIDENCE_TIMEOUT_WINDOW_MIN (30) → downgrade one level
(LOW is the floor)
```

Each downgrade adds a reason, e.g. "Only 1 matching bed", "Missed a request 12 min ago".

### 10.6 Output (CandidateSnapshot)

```json
{
  "hospitalId": "…", "hospitalName": "Lakeside Medical",
  "rank": 1, "score": 92, "confidence": "HIGH",
  "etaMinutes": 8, "distanceKm": 3.9,
  "matchingBeds": 3, "freshness": "FRESH", "freshnessAgeSeconds": 45,
  "currentLoad": 55,
  "breakdown": { "resource": 1.0, "travel": 0.87, "freshness": 1.0, "load": 0.45 },
  "reasons": [
    "ICU available (3 beds)", "Ventilator available", "Cardiology department",
    "8-minute ETA (3.9 km)", "Availability updated 45 seconds ago", "Moderate hospital load (55%)"
  ]
}
```

Plus `exclusions: [{ hospitalId, hospitalName, coordinates, reasons: ['MISSING_EQUIPMENT'], messages: ['No available ICU bed with Ventilator'] }]`.
Candidates also carry `coordinates` (map markers) and `confidenceReasons` (e.g. "Only 1 matching bed").
Reason strings are generated server-side from codes (`constants/matching.js`); the client
only renders them.

### 10.7 Determinism

- Sort: `score` desc → `etaMinutes` asc → `freshnessAgeSeconds` asc → `hospitalId` asc.
- Same inputs + same `now` ⇒ identical output. `now` is injected (tests pass a fixed date).
- **No LLM, no randomness** in `rank()`.

---

## 11. Handshake, Timeout & Fallback

### 11.1 Sending an offer — `emergencyService.offerTo(emergency, hospitalId)`

1. Re-run `rank()` for that single hospital to confirm it still matches (else 409 `HOSPITAL_NO_LONGER_MATCHES` for manual picks; skip to next for automatic).
2. Insert `HospitalRequest { status: PENDING, offeredAt: now, expiresAt: now + OFFER_TIMEOUT_SECONDS }`
   (unique partial index guarantees one live offer per emergency).
3. Emergency → `AWAITING_HOSPITAL`, set `currentHospital`, push to `contactedHospitalIds`.
4. Timeline `HOSPITAL_CONTACTED`; emit `hospital:request`, `emergency:updated`; persist Notification.
5. `scheduleTimeout(hospitalRequestId, expiresAt)`.

### 11.2 Server-side timeout (authoritative)

Two mechanisms, both idempotent:

- **In-process timer**: `setTimeout(() => expireOffer(id), expiresAt − now)` stored in a `Map`; cleared on accept/reject/cancel.
- **Sweeper**: every `SWEEPER_INTERVAL_SECONDS` (10) finds `HospitalRequest { status: PENDING, expiresAt < now }` and calls `expireOffer`. This recovers offers after a server restart (Render free tier restarts!).

`expireOffer(id)`:
```js
const offer = await hospitalRequestRepo.transition(id, 'PENDING', 'TIMEOUT', { respondedAt: now });
if (!offer) return;          // someone else already resolved it — do nothing
timeline('HOSPITAL_TIMEOUT'); emit('hospital:timeout'); await fallback(offer.emergencyId);
```

The **frontend countdown is visual only** (computed from `expiresAt` and `serverNow`).
Accept after expiry → `409 OFFER_EXPIRED`, even if the UI still shows 0:01.

### 11.3 Accept — `emergencyService.accept(hospitalRequestId, user)`

1. Authorise: `user.hospitalId === offer.hospitalId`.
2. Atomic transition `PENDING → ACCEPTED` **with** `expiresAt > now` in the filter. No match → load offer, return `OFFER_EXPIRED` or `OFFER_ALREADY_RESOLVED`.
3. `reservationService.lockBed(...)` (§13). If no bed: mark offer `REJECTED` with `NO_BED_AT_ACCEPT`, timeline `ACCEPT_FAILED_NO_BED`, run fallback, respond `409 BED_NOT_AVAILABLE`.
4. Emergency → `RESERVED`; timeline `HOSPITAL_ACCEPTED`, `BED_RESERVED`; emit `hospital:accepted`, `reservation:created`, `emergency:updated`, `bed:updated`.

### 11.4 Reject

Atomic `PENDING → REJECTED` (+ reason) → timeline → emit `hospital:rejected` → `fallback()`.

### 11.5 Fallback — `emergencyService.fallback(emergencyId)`

```text
emergency = load; if status in (CANCELLED, COMPLETED, RESERVED) → return
emergency.status = SEARCHING
result = rank({ …requirements, excludeHospitalIds: contactedHospitalIds })
save candidates/exclusions
if result.candidates.length == 0 → status NO_MATCH, timeline NO_HOSPITALS_REMAINING, emit
else offerTo(emergency, result.candidates[0].hospitalId)
```

Re-ranking at each step (instead of reusing the original list) means the fallback
always uses current availability.

### 11.6 Cancel

Conditional `PENDING → CANCELLED` on the live offer (emit `hospital:request-cancelled`),
release ACTIVE reservation if any (bed → `AVAILABLE`), emergency → `CANCELLED`, timeline.

---

## 12. ETA & Maps

- **Map rendering:** Leaflet + `react-leaflet` with OpenStreetMap tiles (free, no key). Attribution shown.
- **ETA (MVP):** deterministic estimate in `services/matching/eta.js`:
  ```text
  distanceKm = haversine(patient, hospital) × ROAD_FACTOR (1.3)
  etaMinutes = ceil(distanceKm / AVG_AMBULANCE_SPEED_KMPH (30) × 60)
  ```
- `eta.js` exposes `estimate(from, to)`; a real routing provider can replace it later
  (Future: advanced routing) **without** touching scoring.
- The UI labels ETA as "est." to be honest that it is an estimate.

---

## 13. Reservation Concurrency

Goal: one bed can never be held by two reservations, even under simultaneous accepts.

### 13.1 Primary guard — atomic conditional update

```js
// reservationRepo / bedRepo
const bed = await Bed.findOneAndUpdate(
  {
    hospitalId,
    type: requirements.bedType,
    status: 'AVAILABLE',
    equipment: { $all: requirements.equipment },
  },
  { $set: { status: 'RESERVED', lastUpdatedBy: userId }, $currentDate: { updatedAt: true } },
  { new: true, sort: { updatedAt: -1 }, session }
);
if (!bed) throw new AppError('BED_NOT_AVAILABLE', 'No matching bed is available anymore', 409);
```

MongoDB applies a single-document `findOneAndUpdate` atomically: if two requests race
for the same last bed, only one sees `status: 'AVAILABLE'`; the other gets `null`.

### 13.2 Secondary guard — unique partial index

`Reservation { bedId }` unique where `status: 'ACTIVE'`. Even a buggy code path cannot
create two active reservations for one bed (`E11000` → `DUPLICATE_RESERVATION`).

### 13.3 Transaction where required

Accept touches four documents (HospitalRequest, Bed, Reservation, EmergencyRequest).
Wrap steps 2–4 of §11.3 in `session.withTransaction()` (Atlas is a replica set, so
transactions are available). For a local standalone Mongo without replica set, the code
falls back to compensation: if inserting the Reservation fails after locking the bed,
revert the bed `RESERVED → AVAILABLE` conditionally. Set `MONGO_TRANSACTIONS=true|false`.

### 13.4 Expiry & release

Sweeper (same 10 s loop) finds `Reservation { status: ACTIVE, expiresAt < now }`:
conditional `ACTIVE → EXPIRED`, then bed `RESERVED → AVAILABLE` **only if**
`{ _id: bedId, status: 'RESERVED' }`, emergency → `SEARCHING` (dispatcher may retry),
timeline `RESERVATION_EXPIRED`, emit `reservation:expired`, `bed:updated`.

### 13.5 Required test

Fire two accepts for offers at the same hospital whose only matching bed is one bed
(`Promise.all`). Exactly one `200`, one `409 BED_NOT_AVAILABLE`, exactly one ACTIVE
reservation in the DB.

---

## 14. Security

| Control | Implementation |
|---|---|
| Password hashing | `bcrypt`, cost 10; `passwordHash` has `select: false` |
| JWT | `jsonwebtoken`, HS256, payload `{ sub, role, hospitalId }`, expiry `JWT_EXPIRES_IN=8h` |
| HttpOnly cookie | `bl_token`; `httpOnly`, `secure` in prod, `sameSite: 'none'` in prod (Vercel ↔ Render are cross-site), `'lax'` in dev |
| RBAC | `authorize(...roles)` on every route + ownership checks in services. Role is read from the DB user loaded in `authenticate`, never from the request body |
| Input validation | Zod schemas for body, params, query; ObjectId and coordinate validators; enums from constants |
| Rate limiting | `express-rate-limit`: login 10/min/IP (`LOGIN_RATE_LIMIT_PER_MINUTE`); global 300/min/IP; accept/reject/request-hospital 30/min/user |
| CORS | Exact origin `CLIENT_ORIGIN`, `credentials: true`; same for Socket.IO |
| Helmet | Default headers |
| Env variables | Validated at boot by `config/env.js`; server refuses to start if missing |
| Socket auth | Handshake JWT check; rooms derived from token only |
| Audit | `EmergencyTimeline` (all emergency actions with actor), `Bed.lastUpdatedBy`, JSON request logs without bodies/secrets |
| Errors | Central `errorHandler`; never return stack traces, Mongo errors or paths |
| CSRF | `sameSite` cookie + JSON-only API + strict CORS origin (sufficient for MVP) |

---

## 15. Configuration

`.env.example` at repo root documents every variable.

| Variable | Default | Used by |
|---|---|---|
| `NODE_ENV` | `development` | server |
| `PORT` | `5000` | server |
| `MONGO_URI` | — | server |
| `MONGO_TRANSACTIONS` | `true` | reservation service |
| `JWT_SECRET` | — (≥ 32 chars) | auth |
| `JWT_EXPIRES_IN` | `8h` | auth |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS, sockets |
| `OFFER_TIMEOUT_SECONDS` | `120` | handshake |
| `RESERVATION_HOLD_MINUTES` | `30` | reservation |
| `SWEEPER_INTERVAL_SECONDS` | `10` | timeout/expiry sweeper |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | `10` | login rate limit per IP (§14) |
| `FRESHNESS_FRESH_SECONDS` | `120` | matching |
| `FRESHNESS_RECENT_SECONDS` | `600` | matching |
| `MATCH_MAX_ETA_MINUTES` | `60` | matching |
| `MATCH_CRITICAL_LOAD` | `95` | matching |
| `MATCH_MAX_RADIUS_KM` | `50` | matching (hospitals loaded via `$geoNear`) |
| `CONFIDENCE_TIMEOUT_WINDOW_MINUTES` | `30` | confidence downgrade window (§10.5) |
| `AVG_AMBULANCE_SPEED_KMPH` | `30` | eta |
| `ROAD_FACTOR` | `1.3` | eta |
| `HOST` | `0.0.0.0` | server listen address |
| `LOG_LEVEL` | `info` | logger |
| `TRUST_PROXY` | `1` in production, else `0` | Express `trust proxy` hops |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` / `COOKIE_DOMAIN` | `none`+secure in production, `lax` otherwise / — | auth cookie (§14) |
| `SERVE_CLIENT_DIR` | — | optional: server also serves the built SPA (one-origin deploy) |
| `DNS_SERVERS` | — | optional DNS override for Atlas SRV lookups |
| `SEED_ALLOW_PRODUCTION` | `false` | `npm run seed` refuses in production unless true |
| `VITE_API_URL` | `/api` (Vite dev proxy) | client — set to the deployed API for production builds |
| `VITE_SOCKET_URL` | page origin (Vite dev proxy) | client — set to the deployed server for production builds |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | client dev server proxy target |
| other `VITE_*` | see `client/.env.example` | region name, default location, demo accounts, freshness/critical-load mirrors, map tiles, base path |

---

## 16. Tech Stack & Deployment

| Area | Choice |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, TanStack Query, Axios, React Hook Form, Zod, Lucide React, socket.io-client, react-leaflet + Leaflet, Recharts |
| Backend | Node.js 20 LTS, Express, Mongoose, Socket.IO, Zod, bcrypt, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit |
| Database | MongoDB Atlas (free tier, replica set) |
| Language | JavaScript (ES modules) on both sides |
| Tests | Vitest (client + matching unit tests), Supertest (API smoke + concurrency test) |
| Deploy | Client → Vercel · Server → Render (web service, WebSockets supported) · DB → Atlas |

Render free instances sleep: before the demo, hit `/api/health` to warm up. The sweeper
guarantees pending timeouts still resolve after a restart.
