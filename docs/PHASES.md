# BedLink — Development Phases

> Build in order. A phase is done only when its **Acceptance Criteria** pass and its
> **Demo Check** can be shown live. Then update MEMORY.md.
>
> **Related docs:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [RULES.md](./RULES.md) · [DESIGN.md](./DESIGN.md) · [MEMORY.md](./MEMORY.md)

## Overview

| Phase | Name | Delivers PRD features |
|---|---|---|
| 0 | Project Initialization | — |
| 1 | Authentication | Auth, RBAC |
| 2 | Hospital Management | F1 Bed availability, F2 Freshness (display) |
| 3 | Dispatcher Dashboard | F3 Emergency request, F10 Map, ETA |
| 4 | Matching Engine | F4, F5, F2 (scoring), Unique 1, 2, 7, 8 |
| 5 | Real-Time Request | F6 Handshake, F9 Real-time, Unique 3 |
| 6 | Fallback | F7, Unique 4, Unique 6 Timeline |
| 7 | Reservation | F8, Unique 5 |
| 8 | Analytics + Polish | F11, all UI states, seed data |
| 9 | Hackathon Final | End-to-end verification + pitch |

Suggested team split (4 people): **A** backend core (auth, models, services) ·
**B** matching + reservation + timers · **C** dispatcher UI + map · **D** hospital/admin UI + design system.

---

## Phase 0 — Project Initialization

**Goal:** Both apps run locally, talk to each other and to MongoDB.

**Tasks**
- Create repo with the folder structure in ARCHITECTURE.md §3–§4 (`client/`, `server/`, `docs/`).
- `client`: Vite React app, Tailwind, React Router, TanStack Query, Axios instance, ESLint + Prettier.
- `server`: Express app (`app.js`) + HTTP server (`server.js`), helmet, cors, cookie-parser, JSON body, central `errorHandler`, `AppError`, `asyncHandler`, `response` helpers.
- `config/env.js` validates env with Zod; `config/db.js` connects to Mongo (Atlas free cluster).
- `GET /api/health`.
- Attach Socket.IO to the HTTP server (no events yet); client socket singleton connects.
- Root `.env.example`, `.gitignore`, `README.md` with run instructions.
- `constants/` files for all enums from PRD §4 (server + client mirror).

**Files**
`server/src/{app.js,server.js}`, `server/src/config/*`, `server/src/middleware/errorHandler.js`,
`server/src/utils/{AppError,asyncHandler,response,logger}.js`, `server/src/constants/*`,
`server/src/sockets/index.js`, `client/src/main.jsx`, `client/src/app/*`,
`client/src/services/api.js`, `client/src/socket/*`, `client/src/constants/*`,
`.env.example`, `.gitignore`, `README.md`.

**Acceptance Criteria**
- `npm run dev` in `client` and `server` both start without errors.
- `GET /api/health` returns `{ success: true, data: { status: 'ok' } }`.
- Server refuses to start with a clear message if `MONGO_URI` or `JWT_SECRET` is missing.
- Browser console shows a successful socket connection.
- Lint + format scripts pass.

**Demo Check:** Open the client; a placeholder page shows "API: ok · Socket: connected".

---

## Phase 1 — Authentication

**Goal:** Three roles log in and only reach their own area.

**Tasks**
- `User` model (ARCH §6.1), bcrypt hashing.
- Seed script (`npm run seed`) with demo users: 1 admin, 2 dispatchers, 1 hospital user per seeded hospital (hospitals created minimally here; full seed in Phase 8).
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `authenticate`, `authorize(...roles)`, `validate` middleware; login rate limit.
- Socket handshake auth + auto room joins (ARCH §9.1).
- Client: `/login` page, `AuthProvider` (`useAuth` via `/auth/me`), `ProtectedRoute` with role check, role-based redirect, three layouts with placeholder dashboards, logout.

**Files**
`server/src/models/User.js`, `server/src/services/auth/*`, `server/src/controllers/authController.js`,
`server/src/routes/authRoutes.js`, `server/src/validators/auth.js`,
`server/src/middleware/{authenticate,authorize,validate,rateLimit}.js`,
`server/src/utils/seed.js`, `server/src/constants/seedData.js`, `server/src/sockets/{index,rooms}.js`,
`client/src/features/auth/*`, `client/src/pages/LoginPage.jsx`, `client/src/layouts/*`, `client/src/app/{router,ProtectedRoute}.jsx`.

**Acceptance Criteria**
- Each role logs in and lands on its dashboard; refresh keeps the session (cookie).
- Token is not readable from JS (`document.cookie` doesn't show it).
- A DISPATCHER calling an ADMIN endpoint gets `403 FORBIDDEN`; no cookie → `401 UNAUTHORIZED`.
- Wrong password and unknown email return the same `INVALID_CREDENTIALS` response.
- Unauthenticated socket connection is rejected.

**Demo Check:** Log in as each of the three roles in three browser windows; try a URL from another role and get redirected.

---

## Phase 2 — Hospital Management

**Goal:** A hospital keeps its bed availability current from a phone in seconds.

**Tasks**
- `Hospital` and `Bed` models with indexes (ARCH §6.2–6.3).
- Hospital endpoints: `GET /api/hospitals`, `GET /api/hospitals/:id`, `POST /api/hospitals` (admin), `PATCH /api/hospitals/:id` (admin; hospital → `currentLoad` only).
- Bed endpoints: `GET /api/hospitals/:id/beds`, `POST /api/hospitals/:id/beds` (admin), `PATCH /api/beds/:id`, `POST /api/hospitals/:id/beds/confirm`.
- Bed state-machine guard (ARCH §7.1): staff can't set or leave `RESERVED`.
- Maintain `Hospital.lastAvailabilityUpdate`; set `Bed.lastUpdatedBy`.
- Emit `bed:updated` with hospital summary.
- Client: `/hospital/dashboard` (counters for ICU/Ventilator/Oxygen/Cardiac/Burns, load slider), `/hospital/beds` (bed grid with one-tap status chips, Confirm all), `FreshnessIndicator` component.
- Admin: `/admin/hospitals` list + create/edit form + bed inventory.

**Files**
`server/src/models/{Hospital,Bed}.js`, `server/src/repositories/{hospitalRepo,bedRepo}.js`,
`server/src/services/{hospital,bed}/*`, `server/src/services/notification/*`,
`server/src/controllers/{hospitalController,bedController}.js`, `server/src/routes/{hospitalRoutes,bedRoutes}.js`,
`server/src/validators/{hospital,bed}.js`, `client/src/features/beds/*`, `client/src/features/hospital/LoadControl.jsx`,
`client/src/components/{StatusIndicator,FreshnessIndicator,Badge,Card,Button}.jsx`,
`client/src/pages/hospital/*`, `client/src/pages/admin/HospitalsPage.jsx`.

**Acceptance Criteria**
- Hospital user changes a bed status in one tap; change persists and `updatedAt` refreshes.
- "Confirm all" refreshes freshness of all non-reserved beds without changing statuses.
- A hospital user cannot read or update another hospital's beds (403).
- `PATCH` of a `RESERVED` bed (set manually in DB for the test) → `409 INVALID_STATE_TRANSITION`.
- Freshness label reads e.g. "Updated 32 seconds ago" and ticks live; `STALE` shows the warning style.
- Hospital screens usable at 375 px width.

**Demo Check:** On a phone, mark an ICU bed `OCCUPIED`; the admin hospitals page (open on a laptop) updates within a second with no refresh.

---

## Phase 3 — Dispatcher Dashboard

**Goal:** A dispatcher creates an emergency request and sees nearby hospitals on a map with ETA.

**Tasks**
- `EmergencyRequest` and `EmergencyTimeline` models (ARCH §6.4, §6.7).
- `eta.js` (haversine × road factor ÷ speed) and `GET /api/hospitals/nearby`.
- `POST /api/emergencies` (creates request, `demoPatientId`, timeline `REQUEST_CREATED`; in this phase candidates = nearby hospitals that have the bed type, unscored), `GET /api/emergencies`, `GET /api/emergencies/:id`.
- Client: `/dispatcher/dashboard` (active requests list, live bed summary), `/dispatcher/emergency/new` (EmergencyForm: location by map click or lat/lng input, bed type, equipment, specialties, urgency), `MapPanel` with Leaflet/OSM, ETA labels.
- Emit `emergency:created`.

**Files**
`server/src/models/{EmergencyRequest,EmergencyTimeline}.js`, `server/src/repositories/{emergencyRepo,timelineRepo}.js`,
`server/src/services/emergency/*`, `server/src/services/matching/eta.js`, `server/src/utils/geo.js`,
`server/src/controllers/emergencyController.js`, `server/src/routes/emergencyRoutes.js`, `server/src/validators/emergency.js`,
`client/src/features/dispatcher/{EmergencyForm,MapPanel,CandidateList}.jsx`, `client/src/features/emergency/*`,
`client/src/pages/dispatcher/*`.

**Acceptance Criteria**
- Dispatcher can submit ICU + Ventilator + Cardiology with a map-picked location; request is saved with a `demoPatientId` and no PII fields exist on the model.
- Invalid coordinates or unknown enum values → `400 VALIDATION_ERROR` with field details.
- Map shows patient marker + hospital markers with estimated ETA.
- Dispatcher can only list/view their own emergencies.

**Demo Check:** Create an emergency; it appears on the dispatcher dashboard and the map shows hospitals with "est. 8 min".

---

## Phase 4 — Matching Engine

**Goal:** Deterministic, explainable, freshness-aware ranking.

**Tasks**
- `services/matching/`: `filter.js` (hard filters + exclusion codes), `freshness.js`, `score.js` (weights 50/25/15/10), `confidence.js`, `index.js` (`rank()`), reason-string builder (ARCH §10).
- `constants/matching.js`: weights, tiers, exclusion codes, reason templates.
- `POST /api/emergencies` now stores ranked `candidates`, `exclusions`, `matchingDurationMs`; timeline `MATCHING_COMPLETED`.
- Unit tests with fixed `now`: filtering per exclusion code, score math, tie-break order, freshness tiers, confidence downgrades, determinism (same input → same output).
- Client: `HospitalCard` (score, confidence badge, ✓ reasons, ETA, freshness, expandable breakdown), `ExcludedList` ("Why not this hospital?"), map markers coloured by confidence, top candidate highlighted.

**Files**
`server/src/services/matching/*`, `server/src/constants/matching.js`, `server/src/services/matching/__tests__/*`,
`client/src/features/dispatcher/{HospitalCard,ExcludedList,ScoreBreakdown}.jsx`, `client/src/components/ConfidenceBadge.jsx`.

**Acceptance Criteria**
- For the seeded scenario, ranking matches a hand-calculated expected order.
- A hospital with a ventilator-less ICU appears under exclusions with `MISSING_EQUIPMENT`.
- Changing a hospital's bed `updatedAt` from fresh to stale lowers its score and confidence.
- No randomness or `Date.now()` inside scoring functions; all unit tests pass.
- Matching for the seed set completes < 1 s (`matchingDurationMs` recorded).

**Demo Check:** Show the ranked list with reasons; expand one card's breakdown; open "Why not" and show an excluded hospital with its reason.

---

## Phase 5 — Real-Time Request (2-Minute Handshake)

**Goal:** Hospital sees and answers a request live, within a server-enforced 2-minute window.

**Tasks**
- `HospitalRequest` model + indexes (ARCH §6.5), `Notification` model (ARCH §6.8).
- `POST /api/emergencies/:id/request-hospital`, `GET /api/hospital-requests`, `POST /api/hospital-requests/:id/accept`, `POST /api/hospital-requests/:id/reject` (accept in this phase only transitions status; bed lock arrives in Phase 7).
- Conditional `PENDING → X` transitions; `OFFER_EXPIRED` / `OFFER_ALREADY_RESOLVED`.
- Server timeout: in-process timer + 10 s sweeper (ARCH §11.2) → `TIMEOUT`.
- Emit `hospital:request`, `hospital:accepted`, `hospital:rejected`, `hospital:timeout`, `emergency:updated`; persist notifications.
- Client hospital: `IncomingRequestCard` (requirements, urgency, ETA, big `CountdownTimer`, Accept / Reject with reason sheet), sound + vibration on arrival, `/hospital/requests` queue.
- Client dispatcher: `/dispatcher/emergency/:id` status banner + countdown; `useSocketEvent` patches query cache.
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`; reconnect refetch.

**Files**
`server/src/models/{HospitalRequest,Notification}.js`, `server/src/repositories/{hospitalRequestRepo,notificationRepo}.js`,
`server/src/services/emergency/{offer,respond,timers}.js`, `server/src/controllers/hospitalRequestController.js`,
`server/src/routes/hospitalRequestRoutes.js`, `server/src/sockets/handlers.js`,
`client/src/features/hospital/{IncomingRequestCard,RequestQueue}.jsx`, `client/src/components/CountdownTimer.jsx`,
`client/src/features/emergency/StatusBanner.jsx`, `client/src/socket/useSocketEvent.js`.

**Acceptance Criteria**
- Hospital sees a new request within ~1 s without refreshing.
- Countdown on both screens is derived from `expiresAt` and agrees within 1 s.
- With no response, the server marks the offer `TIMEOUT` at 120 s even if every browser is closed.
- Restarting the server mid-offer still produces the timeout (sweeper).
- Accept after expiry → `409 OFFER_EXPIRED`. A second `request-hospital` while pending → `409 OFFER_ALREADY_PENDING`.
- Another hospital's user can't accept the offer (403).

**Demo Check:** Dispatcher requests Hospital A; the phone buzzes with a 2:00 countdown; Accept updates the dispatcher screen instantly.

---

## Phase 6 — Automatic Fallback + Timeline

**Goal:** Reject or timeout automatically moves the request to the next best hospital; every step is in the timeline.

**Tasks**
- `emergencyService.fallback()` (ARCH §11.5): re-rank excluding contacted hospitals → next offer, or `NO_MATCH`.
- Hook fallback into reject, timeout and accept-without-bed paths.
- `POST /api/emergencies/:id/cancel` (ARCH §11.6) + `hospital:request-cancelled`.
- Retry from `NO_MATCH` via `request-hospital` (re-runs matching).
- Timeline entries with actor (`SYSTEM` for timeout/fallback) for every transition.
- Client: `EmergencyTimeline` component (live-appending), "Automatic fallback → Hospital B" toast, `NO_MATCH` state with clear next steps, Cancel with confirm.

**Files**
`server/src/services/emergency/{fallback,cancel}.js`, `client/src/features/emergency/EmergencyTimeline.jsx`,
`client/src/features/emergency/NoMatchState.jsx`.

**Acceptance Criteria**
- Reject at Hospital A → Hospital B receives the offer within ~1 s; A never receives it again.
- Timeout at A → same behaviour, timeline shows `SYSTEM` actor.
- When all candidates are exhausted → status `NO_MATCH`, dispatcher sees it live.
- Cancel while pending → hospital's card disappears (`hospital:request-cancelled`), status `CANCELLED`.
- Only one PENDING offer per emergency at any time (unique partial index holds).
- Timeline matches the PRD §6 example format.

**Demo Check:** Let Hospital A time out (or reject); watch the timeline append "Timeout → Hospital B contacted" automatically.

---

## Phase 7 — Reservation (Bed Lock)

**Goal:** Acceptance locks one specific bed; double booking is impossible.

**Tasks**
- `Reservation` model with unique partial indexes (ARCH §6.6).
- `reservationService.lockBed()` with atomic `findOneAndUpdate` + transaction / compensation (ARCH §13).
- Wire into accept (ARCH §11.3); `NO_BED_AT_ACCEPT` → fallback.
- `POST /api/reservations` (admin manual hold), `POST /api/reservations/:id/release`, `POST /api/reservations/:id/arrive`.
- Expiry in the sweeper (ARCH §13.4); emit `reservation:created|expired|released`, `bed:updated`.
- Cancel releases an active reservation.
- Integration test: concurrent double-accept on the last bed (ARCH §13.5).
- Client: `ReservationCard` (bed label, hospital, hold countdown) on dispatcher emergency page; hospital "Active reservations" list with **Mark arrived** / Release; bed tile shows `RESERVED` with lock icon (not tappable).

**Files**
`server/src/models/Reservation.js`, `server/src/repositories/reservationRepo.js`, `server/src/services/reservation/*`,
`server/src/controllers/reservationController.js`, `server/src/routes/reservationRoutes.js`,
`server/src/validators/reservation.js`, `server/src/services/reservation/__tests__/concurrency.test.js`,
`client/src/features/reservations/*`.

**Acceptance Criteria**
- Accept → one bed becomes `RESERVED`; reservation `ACTIVE` with `expiresAt`.
- Concurrency test: exactly one success, one `409 BED_NOT_AVAILABLE`, one ACTIVE reservation in DB.
- Hold expiry returns the bed to `AVAILABLE` and emits events; emergency returns to `SEARCHING`.
- Mark arrived → bed `OCCUPIED`, reservation `FULFILLED`, emergency `COMPLETED`.
- Staff cannot change a `RESERVED` bed from the bed grid.

**Demo Check:** Two dispatchers race for the last ICU bed at one hospital; show only one gets it, the other is automatically moved on.

---

## Phase 8 — Analytics + Polish

**Goal:** Demo-ready product: analytics, every UI state, realistic seed data, responsive layouts.

**Tasks**
- `GET /api/analytics/overview` (PRD F11) via aggregations.
- Admin dashboard (KPI row + Recharts response chart + live emergencies); compact KPIs on dispatcher dashboard.
- `/admin/users` page (list/create/edit, hospital assignment).
- Full seed: 10–15 fictional hospitals around one city, ~8–20 beds each, varied specialties, loads and freshness (some deliberately stale, one with ICU but no ventilator, one with critical load), demo accounts.
- Every page: loading skeletons, empty states, error states, offline/reconnecting banner (DESIGN.md §6).
- Responsive pass: hospital at 375 px, dispatcher at 1280 px and 768 px.
- Accessibility pass: focus states, contrast, text + icon status.

**Files**
`server/src/services/analytics/*`, `server/src/controllers/analyticsController.js`, `server/src/routes/analyticsRoutes.js`,
`server/src/constants/seedData.js`, `client/src/features/analytics/*`, `client/src/pages/admin/*`,
`client/src/components/{EmptyState,ErrorState,Skeleton,Toast,Table}.jsx`.

**Acceptance Criteria**
- Analytics numbers match a manual count after a scripted run.
- No page shows a blank screen in loading, empty, error or offline conditions.
- `npm run seed` resets to a known demo state in < 10 s.
- Complete end-to-end flow works on deployed URLs (Vercel + Render + Atlas).

**Demo Check:** Run the full flow on the deployed app; admin dashboard counters move live.

---

## Phase 9 — Hackathon Final

**Goal:** A rehearsed, reliable demo and pitch.

**Test checklist**
- [ ] Authentication (3 roles, wrong-role access blocked)
- [ ] Bed update + Confirm all → live on dispatcher screen
- [ ] Matching ranks correctly, reasons and exclusions shown
- [ ] Request reaches hospital live with countdown
- [ ] Timeout at 120 s (server-side)
- [ ] Reject → automatic fallback
- [ ] Accept → bed reserved, timeline complete
- [ ] Double-booking test passes
- [ ] Reconnect after network drop refreshes state
- [ ] Deployed instances warmed (`/api/health`)

**Prepare**
- Demo script (below), architecture diagram (from ARCHITECTURE.md §1), 3-minute pitch, screenshots, test accounts in README.
- Run `npm run seed` right before presenting.

### Demo script (≈ 4 minutes)

Screens: laptop = dispatcher, phone A = Hospital A (top-ranked), phone B = Hospital B.

1. **Hospital updates bed** — Phone B marks an ICU bed `AVAILABLE` and taps Confirm all; dispatcher map updates live.
2. **Dispatcher creates emergency** — ICU + Ventilator + Cardiology, CRITICAL, location on map.
3. **BedLink finds hospitals** — ranked cards with score, confidence, reasons; open "Why not" for an excluded one; point at a STALE hospital ranked lower.
4. **Dispatcher requests hospital** — top candidate (Hospital A).
5. **Hospital receives real-time request** — phone A buzzes, 2:00 countdown.
6. **Hospital rejects / times out** — reject with "No staff" (or let it time out if time allows).
7. **Next hospital automatically contacted** — timeline appends, phone B buzzes.
8. **Hospital accepts** — phone B taps Accept.
9. **Bed becomes reserved** — dispatcher sees bed ICU-04 reserved with hold timer; admin analytics tick.

Backup: a screen recording of the full flow in case of network failure.
