# BedLink — Memory (Living Project State)

> This file is the single place that says **what is actually true right now**.
> Read it first when you (human or AI agent) pick the project up. Update it at the end of
> every work session.
>
> **Rules for this file**
> - Record only work that is **done and verified**. Never write planned work as completed.
> - Keep the "Current State" section short and current; move history into the Session Log.
> - Newest session log entry goes on top.
> - Any decision that changes an enum, endpoint, event, model field or matching weight
>   must also be updated in the relevant doc in the same change.
>
> **Related docs:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [RULES.md](./RULES.md) · [PHASES.md](./PHASES.md) · [DESIGN.md](./DESIGN.md)

---

## Current State

### Current Phase
Phase 0 — Project Initialization (not started)

### Current Status
Project initialization. No application code has been written.

### Completed
Nothing (no application code yet).

### Currently Working On
Documentation and architecture — the six docs in `docs/` are drafted and awaiting team review.

### Files Changed
- `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RULES.md`, `docs/PHASES.md`, `docs/DESIGN.md`, `docs/MEMORY.md` — created.
- Empty folder skeleton for `client/src/` and `server/src/` (folders only, `.gitkeep` placeholders, no code).
- Root `.env.example`, `.gitignore`, `README.md` — created.

### Decisions Made
Recorded while writing the docs, so the code follows them from day one:

1. **Resource modelling:** the five product resources map to `Bed.type` (`ICU`, `CARDIAC`, `BURNS`, `GENERAL`), `Bed.equipment` (`VENTILATOR`, `OXYGEN`, `CARDIAC_MONITOR`) and `Hospital.specialties` (`CARDIOLOGY`, `BURNS`, `TRAUMA`, `NEUROLOGY`, `GENERAL_MEDICINE`). See PRD §4.1.
2. **`HospitalRequest` model added** (one offer per hospital contacted) — needed by `/api/hospital-requests/:id/*` and to carry the 2-minute window.
3. **Socket event names use `noun:verb` with colons** (`bed:updated`, `hospital:request`, …) everywhere; added `emergency:updated`, `hospital:request-cancelled`, `reservation:released`.
4. **All mutations go through REST**; socket `emergency:create` / `hospital:respond` are optional thin wrappers over the same services.
5. **Sequential offers:** only one PENDING offer per emergency (unique partial index).
6. **Fallback re-runs matching** with fresh data, excluding already-contacted hospitals.
7. **Matching weights (MVP):** Resource 50 · Travel 25 · Freshness 15 · Load 10. Freshness tiers FRESH ≤ 120 s, RECENT ≤ 600 s.
8. **ETA = deterministic estimate** (haversine × 1.3 ÷ 30 km/h), labelled "est."; maps via Leaflet + OpenStreetMap.
9. **Timeouts are server-owned:** in-process timer + 10 s sweeper (survives restarts).
10. **Double-booking prevention:** atomic `findOneAndUpdate` on `status: AVAILABLE` + unique partial index on active reservations + transaction (compensation if no replica set).
11. **Reservation hold:** 30 min (`RESERVATION_HOLD_MINUTES`); expiry returns bed to `AVAILABLE`, dispatcher retries manually.
12. **Language:** JavaScript (ES modules) on client and server; no TypeScript.
13. **Admin-only `POST /api/reservations`** kept for manual holds/testing; normal reservations are created by accept.

### Problems / Bugs
None yet.

### Next Task
Team reviews the six docs → then Phase 0: initialize the Vite React client and Express server inside the existing skeleton, connect MongoDB Atlas, add `/api/health` and the Socket.IO connection (see PHASES.md → Phase 0).

### Notes
- Demo seed data must use fictional hospital names and no patient PII (RULES.md §9).
- Render free tier sleeps — warm `/api/health` before demos.

---

## Session Log

> Copy this template for every session. Newest on top. Be factual.

```md
### YYYY-MM-DD — <who / which agent>

#### Current Phase
Phase N — <name> (<in progress | done>)

#### Completed
- <only verified, working items; reference acceptance criteria met>

#### Currently Working On
- <what is mid-way, with file paths>

#### Files Changed
- <path> — <what changed>

#### Decisions Made
- <decision> — <why> (and which doc was updated)

#### Problems / Bugs
- <issue> — <status / workaround>

#### Next Task
- <single most important next step>

#### Notes
- <anything the next person must know>
```

### 2026-10-02 — Documentation setup

#### Current Phase
Phase 0 — Project Initialization (not started)

#### Completed
- Six documentation files drafted (not yet reviewed by the team).

#### Currently Working On
- Documentation review.

#### Files Changed
- `docs/*.md`, folder skeleton, `.env.example`, `.gitignore`, `README.md` — created.

#### Decisions Made
- See "Decisions Made" in Current State (items 1–13).

#### Problems / Bugs
- None.

#### Next Task
- Phase 0 setup.

#### Notes
- No application code exists yet.
