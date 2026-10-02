# BedLink — Engineering Rules

> These rules are binding for every human and AI contributor. If a rule blocks you,
> raise it and record the decision in MEMORY.md — don't silently work around it.
>
> **Related docs:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [PHASES.md](./PHASES.md) · [DESIGN.md](./DESIGN.md) · [MEMORY.md](./MEMORY.md)

---

## 1. Priorities

When trade-offs appear, decide in this order:

```text
Working MVP > Reliable backend > Real-time workflow > Clear UX > Security > Polish > Optional AI
```

Never trade these for: complex AI, microservices, over-engineering, feature count.

**Scope gate:** if a feature is not in PRD.md §5–§6, don't build it. Future items in
PRD.md §7 stay future.

---

## 2. Code Rules

- Follow the layering in ARCHITECTURE.md §2: **routes → validators → controllers (thin) → services → repositories → models**.
- Controllers: ≤ ~20 lines per handler; read `req`, call one service, return `ok(res, data)`.
- Business rules (state transitions, matching, locking, timeouts) live **only** in `services/`.
- All DB queries live in `repositories/`. Services never call `Model.find` directly.
- Enums, event names, error codes, weights and defaults come from `constants/` — **no magic strings**.
- Meaningful names: `lockBed`, `expireOffer`, `rankHospitals` — not `doStuff`, `handle2`.
- Files stay small (soft limit ~250 lines). Split by responsibility when it grows.
- No duplicate logic: if both REST and socket need it, it's one service function.
- No hardcoded secrets, URLs or ports — use `config/env.js` / `import.meta.env`.
- ES modules (`import`/`export`) on both client and server. JavaScript, not TypeScript.
- Prettier + ESLint must pass before merging. Format on save.
- Pure functions for matching (`filter`, `score`, `freshness`, `confidence`) — inject `now`, no `Date.now()` inside.

---

## 3. Error Handling

### 3.1 Standard response shapes

```json
{ "success": true,  "data": { } }
```

```json
{ "success": false, "message": "Human readable message", "code": "RESOURCE_NOT_FOUND" }
```

Validation errors may add `"details": [{ "path": "requirements.bedType", "message": "Invalid enum value" }]`.

### 3.2 Error codes (`constants/errorCodes.js`)

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod failure |
| `UNAUTHORIZED` | 401 | No/invalid/expired token |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password (never say which) |
| `FORBIDDEN` | 403 | Wrong role or not owner |
| `RESOURCE_NOT_FOUND` | 404 | |
| `INVALID_STATE_TRANSITION` | 409 | e.g. staff editing a `RESERVED` bed, cancelling a completed emergency |
| `DUPLICATE_RESOURCE` | 409 | unique field already taken (user email, bed label within a hospital) |
| `OFFER_ALREADY_PENDING` | 409 | request-hospital while an offer is live |
| `OFFER_EXPIRED` | 409 | accept/reject after `expiresAt` |
| `OFFER_ALREADY_RESOLVED` | 409 | accept/reject on non-PENDING offer |
| `HOSPITAL_NO_LONGER_MATCHES` | 409 | manual pick no longer passes filters |
| `BED_NOT_AVAILABLE` | 409 | atomic lock found no bed |
| `DUPLICATE_RESERVATION` | 409 | unique index violation |
| `RESERVATION_EXPIRED` | 409 | acting on an expired reservation |
| `NO_MATCHING_HOSPITALS` | 200* | not an error: emergency returned with status `NO_MATCH` |
| `RATE_LIMITED` | 429 | |
| `INTERNAL_ERROR` | 500 | anything unexpected |

### 3.3 Never expose

Stack traces · Mongo/Mongoose error messages · secrets/env values · internal file paths ·
whether an email exists. The error handler logs the full error server-side and returns
`INTERNAL_ERROR` with a generic message.

### 3.4 How to throw

```js
throw new AppError('BED_NOT_AVAILABLE', 'No matching bed is available anymore', 409);
```

Wrap async controllers with `asyncHandler`. Never `res.status(500).send(err)`.

---

## 4. Validation

- Validate **body, params and query** on every route with Zod via `validate({ body, params, query })`.
- Shared validators in `validators/common.js`: `objectId`, `coordinates` (`lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`), pagination.
- Enum fields (`bedType`, `equipment`, `specialties`, `status`, `urgency`, `role`, `rejectReason`) validated against `constants/`.
- Strip unknown keys (`.strict()` or `.strip()`) — a client can't sneak in `status: 'RESERVED'` or `role: 'ADMIN'`.
- `PATCH /api/beds/:id` accepts only `status ∈ { AVAILABLE, OCCUPIED, CLEANING, UNAVAILABLE }`.
- Client forms use React Hook Form + Zod for UX, but **server validation is the authority**.

---

## 5. Authentication

- JWT signed with `JWT_SECRET`, stored only in the **HttpOnly** cookie `bl_token`.
- **Never** store tokens in `localStorage`/`sessionStorage` or expose them to JS.
- Axios instance uses `withCredentials: true`; Socket.IO client uses `withCredentials: true`.
- `authenticate` middleware re-loads the user from DB (checks `isActive`) — role and hospital come from the DB, not the token alone.
- Logout clears the cookie with the same options used to set it.
- Login responses are identical for unknown email and wrong password.

---

## 6. RBAC

| Role | Can |
|---|---|
| `ADMIN` | Everything: hospitals, beds inventory, users, all emergencies, manual reservations, analytics |
| `HOSPITAL` | Only **own hospital** (`user.hospitalId`): read hospital, update `currentLoad`, update/confirm own beds, see and answer own offers, release/arrive own reservations |
| `DISPATCHER` | Read hospitals/beds, create emergencies, manage **own** emergencies (request hospital, cancel, release), read analytics overview. Also: go on duty / share GPS, answer public ambulance-booking offers, cancel **own** bookings with a reason, edit own phone + organisation |
| *Public caller* (no login) | Create a booking; read, cancel and retry **only the booking whose unguessable tracking token they hold** (ARCHITECTURE.md §8.2 Bookings) |

Rules:

- Never trust a role, `hospitalId` or `dispatcherId` sent by the frontend.
- Route-level `authorize(...)` **and** service-level ownership checks — both are required.
- Hidden buttons are UX, not security. The API must reject anyway.
- A HOSPITAL user may read an emergency only if their hospital was contacted for it, and only the fields needed to respond (requirements, urgency, ETA) **plus who is coming**: the ambulance's vehicle number and type, organisation, driver name and crew phone (`ambulance`). This reverses the earlier "no dispatcher details" rule on purpose: staff must be able to call the crew. Nothing else about the dispatcher account is shared (no ids, email, licence number or account name), hospital staff never see `EM-0001`-style case references or raw ids on screen, and `ambulance` is added only to a hospital's own offers, requests and reservations (`hospital:request`, `GET /api/hospital-requests`, `GET /api/emergencies/:id`, `GET /api/reservations` for HOSPITAL users) — never to other roles' lists or to a hospital that was not offered the case.
- A booked patient's **caller name and phone** reach the offered ambulance (to call the caller), and a hospital only **after it accepted** that case (and only while the booking is live).

---

## 7. Socket Rules

- Authenticate every socket connection in the handshake middleware; reject unauthenticated sockets. A public caller connects with `auth.bookingToken` (the tracking token): it joins that one `booking:<id>` room only, gets no role rooms and has no client→server handlers.
- Rooms are derived from `socket.data.user` (ARCHITECTURE.md §9.1). Ignore room names sent by clients.
- Hospital users receive offers **only** for their hospital (`hospital:<id>` room).
- Emit only through `notificationService.emit(event, rooms, payload)` — services never call `io` directly.
- Payloads carry IDs + the minimum display data. No password hashes, no full user objects.
- Socket events are **notifications**; the client's source of truth is REST data in TanStack Query. On receiving an event, patch or invalidate the relevant query.
- On reconnect: re-emit `join:hospital` / `join:dispatcher`, then refetch active queries (missed events must not leave stale screens).
- Mutations go through REST. Optional socket mutations (`emergency:create`, `hospital:respond`) must reuse the same service + validation.

---

## 8. AI Rules

AI is **optional** and lowest priority. The MVP must be complete without it.

AI **may**:

- parse natural-language requirements into the structured form (`bedType`, `equipment`, `specialties`, `urgency`), shown to the dispatcher **for confirmation** before submit
- summarise an emergency's timeline in plain language
- rephrase the deterministic match reasons that already exist

AI **must not**:

- diagnose, prescribe or decide treatment
- override or edit hospital availability
- choose, rank, re-rank, filter or score hospitals
- auto-submit anything without a human click

AI output never overrides deterministic business/safety rules. If an AI feature is added,
it lives behind a feature flag, and failure must leave the normal form fully usable.

---

## 9. Data Rules

- No hospitals, beds or users are bundled with the app (test fixtures live in `server/tests/fixtures/`).
- **Never store** Aadhaar, photos, medical records or free-text clinical notes. Emergencies keep no patient name, phone or address.
- **Exception — public ambulance bookings (the only place personal data lives):** a `Booking` stores the caller's patient name, mobile number, pickup place (coordinates + the address label the caller chose), landmark/notes (≤ 300 chars), condition category and urgency — nothing else. The phone is never returned by a list endpoint to anyone but the one ambulance offered/assigned the booking, and to a hospital after it accepted. After `BOOKING_PII_RETENTION_DAYS` (default 30) a closed booking's name, phone, notes, pickup and tracking-token hash are blanked by the sweeper. The tracking token is stored only as a SHA-256 hash.
- **Fake-report counts** store the phone only as an HMAC (`FakeReport.phoneHash`) and expire with a TTL index after `FAKE_REPORT_WINDOW_DAYS`.
- Emergencies are referenced by a server-generated case ref (`EM-0001`) shown to the ambulance crew and admin only.
- Patient location is stored only as coordinates on the emergency.
- Seed data uses fictional hospital names (no real hospital brands).
- Never reuse real passwords in docs or fixtures.

---

## 10. Frontend Rules

- Every page/data region handles **loading, empty, error, success**, and **offline/reconnecting** where real time matters (dispatcher emergency view, hospital dashboard). No blank screens.
- Use components from `components/` (DESIGN.md §5). Don't hand-roll a new button style.
- Business logic stays out of components: derive in hooks/utils (`useEmergency`, `formatRelative`).
- Never compute match scores or eligibility on the client — render what the API returns.
- Countdown timers derive from `expiresAt` + server offset; never from "120" hardcoded.
- Relative times ("Updated 32 seconds ago") re-render every second via `useNow()`.
- Status is never communicated by colour alone — always text + icon (DESIGN.md §7).
- Destructive or irreversible actions (Reject, Cancel request, Release reservation) require a confirm step; **Accept does not** (speed matters) but is visually distinct.
- Optimistic updates are allowed only for bed status taps; roll back on error with a toast.

---

## 11. State & Reservation Rules

- Every state change is a **conditional update** on the expected current state (`{ _id, status: expected }`). No read-modify-write.
- A bed can be `RESERVED` by at most one ACTIVE reservation (atomic lock + unique partial index).
- Only `reservationService` sets or leaves `RESERVED`.
- Every reservation has `expiresAt`; every offer has `expiresAt`.
- The backend owns all timers. Frontend timers are visual.
- Every state change on an emergency appends an `EmergencyTimeline` entry with actor.
- Only one PENDING offer per emergency at a time.

---

## 12. Libraries

Use these; don't add others unless they solve a real problem (and record why in MEMORY.md).

| Frontend | Backend | Tooling |
|---|---|---|
| React, Vite | Node.js 20, Express | ESLint, Prettier |
| Tailwind CSS | Mongoose | Vitest |
| React Router | Socket.IO | Supertest |
| Axios | Zod | nodemon (dev) |
| TanStack Query | bcrypt | |
| React Hook Form, Zod | jsonwebtoken, cookie-parser | |
| Lucide React | helmet, cors | |
| socket.io-client | express-rate-limit | |
| Leaflet + react-leaflet (OSM tiles) | dotenv | |
| Recharts | | |

Not allowed in MVP: Redux, Next.js, GraphQL, Redis, message queues, cron services,
component libraries that fight Tailwind (MUI, AntD), moment.js.

---

## 13. Workflow Rules

- Work phase by phase (PHASES.md). Don't start a phase before the previous phase's acceptance criteria pass.
- Branches: `feat/<phase>-<short-name>`, `fix/<short-name>`. Small PRs, one feature each.
- Commit messages: imperative, e.g. `Add atomic bed lock to reservation service`.
- **Update MEMORY.md at the end of every work session** using its template. Only record what is actually done and verified.
- Any change to an enum, endpoint, event name, model field or matching weight must be updated in the docs in the same PR.
- Test what matters most: matching (unit), state transitions (unit), concurrency double-accept (integration), timeout → fallback (integration with a short `OFFER_TIMEOUT_SECONDS`).

---

## 14. Avoid

- Patient diagnosis, medical recommendations, clinical scoring
- Fake medical claims or "AI predicts survival"-style copy
- Real patient information
- Features outside the PRD (billing, appointments, pharmacy, EHR, ERP…)
- Microservices, extra infrastructure
- Storing auth tokens in browser storage
- Letting the client decide timeouts, scores, eligibility or reservations
