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

## Repository layout

```text
client/   React + Vite frontend (feature-based)
server/   Node.js + Express + Socket.IO backend (modular monolith)
docs/     The six project documents
```

## Getting started

Not yet runnable — the application is scaffolded in Phase 0 (see `docs/PHASES.md`).
Once it is: copy `.env.example` to `.env`, then run `npm install` and `npm run dev`
in both `client/` and `server/`, and `npm run seed` in `server/` for demo data.

## Demo accounts

Added in Phase 1 with the seed script.
