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
| **Current Phase** | Phase 0 — Project Initialization (not started) |
| **Current Status** | Project initialization. No application code has been written. |
| **Completed** | Nothing (no application code yet). |
| **Currently Working On** | Documentation and architecture — the six docs in `docs/` are drafted and awaiting team review. |
| **Problems / Bugs** | None yet. |
| **Next Task** | Team reviews the six docs → then Phase 0: initialize the Vite React client and Express server inside the existing skeleton, connect MongoDB Atlas, add `/api/health` and the Socket.IO connection (see PHASES.md → Phase 0). |

### Files Changed

| File / Folder | Change | Notes |
|---|---|---|
| `docs/PRD.md` | Created | Product requirements |
| `docs/ARCHITECTURE.md` | Created | Structure, models, API, sockets, matching |
| `docs/RULES.md` | Created | Engineering rules |
| `docs/PHASES.md` | Created | Build plan + demo script |
| `docs/DESIGN.md` | Created | Design system + screens |
| `docs/MEMORY.md` | Created | This file |
| `client/src/`, `server/src/` | Created | Empty folder skeleton only (`.gitkeep` placeholders, no code) |
| `.env.example`, `.gitignore`, `README.md` | Created | Root project files |

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
| 2026-10-02 | Documentation setup | Phase 0 — not started | Six documentation files drafted (not yet reviewed by the team) | Documentation review | `docs/*.md`, folder skeleton, `.env.example`, `.gitignore`, `README.md` — created | See Decisions Made #1–13 | None | Phase 0 setup | No application code exists yet |

### Row Template

Copy this row to the top of the Session Log table:

```md
| YYYY-MM-DD | <who / which agent> | Phase N — <in progress / done> | <verified items> | <what is mid-way, with paths> | <path — change> | <decision — why — doc updated> | <issue — status> | <single next step> | <anything the next person must know> |
```
