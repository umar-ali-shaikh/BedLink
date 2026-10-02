# BedLink — Product Requirements Document

> **Tagline:** Find the right bed. Right now.
>
> **Status:** Hackathon MVP · simulated hospital and bed data only
>
> **Related docs:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [RULES.md](./RULES.md) · [PHASES.md](./PHASES.md) · [DESIGN.md](./DESIGN.md) · [MEMORY.md](./MEMORY.md)

---

## 1. Product Overview

### What BedLink is

BedLink is a real-time emergency hospital bed coordination platform. It connects
ambulance/dispatch teams with hospitals that currently have the bed, equipment and
specialty a critical patient needs — and gets a hospital to **commit** to that bed
before the ambulance arrives.

### What problem it solves

Today, when an ambulance carries a critical patient, someone has to phone hospitals
one by one to find out who has a free ICU bed, a ventilator, or a cardiac team.
Availability information is verbal, often outdated, and nobody holds the bed while the
ambulance is on its way. Patients get turned away at the door and redirected.

### Why it matters

In critical care, minutes matter. Every call that ends in "sorry, no bed" and every
arrival at a hospital that is actually full adds delay at the worst possible moment.

### Who uses it

| Role | Where | Main job |
|---|---|---|
| Hospital Staff (`HOSPITAL`) | Phone at the ward/nursing station | Keep bed availability current; accept or reject incoming requests |
| Dispatcher / Ambulance Team (`DISPATCHER`) | Desktop/tablet in control room or ambulance | Create emergency requests, choose a hospital, track status |
| Admin (`ADMIN`) | Desktop | Manage hospitals and users, monitor the system |

### What the MVP must accomplish

One complete, live, end-to-end loop:

1. A hospital updates bed availability from a phone.
2. A dispatcher enters patient requirements and location.
3. BedLink ranks suitable hospitals and explains every ranking.
4. The dispatcher requests a hospital; the hospital sees the request instantly.
5. The hospital has **2 minutes** to accept or reject.
6. On reject or timeout, BedLink **automatically** offers the request to the next suitable hospital.
7. On accept, a specific bed is **locked** (`RESERVED`) so nobody else can take it.
8. Every step is visible in real time and recorded in a timeline.

**The core differentiator:**

> Real-time + freshness-aware + explainable matching
> \+ 2-minute confirmation + automatic fallback + bed reservation.

BedLink is **not** a hospital directory and **not** a hospital management system.

---

## 2. Problem Statement

An ambulance is carrying a critical patient who needs, for example:

- an **ICU** bed
- a **ventilator**
- **oxygen** support
- **cardiac** support
- a **burns** specialty unit

Without BedLink the crew or dispatcher must:

1. Guess which hospitals might have capacity.
2. Call each hospital and wait for someone to check.
3. Trust a verbal "yes" that may be wrong by arrival time.
4. Repeat when the answer is "no".

With BedLink the dispatcher enters the requirement once (e.g. **ICU + Ventilator +
Cardiology**) and immediately sees ranked hospitals that have it, how fresh that
information is, how long it takes to get there, and why each hospital was ranked where
it is. One click sends a request; the hospital confirms; the bed is held.

---

## 3. Target Users

### 3.1 Hospital Staff (`HOSPITAL`)

Each hospital user belongs to exactly one hospital (`User.hospitalId`).

Responsibilities:

- Update bed availability (status of each bed) in seconds.
- Confirm that availability is still accurate (one-tap "Confirm all", refreshes freshness).
- Update hospital load (`currentLoad`).
- Respond to emergency requests within 2 minutes — **Accept** or **Reject** (with reason).
- Mark a reserved bed as arrived/occupied when the patient arrives.

### 3.2 Dispatcher / Ambulance Team (`DISPATCHER`)

Responsibilities:

- Create emergency requests.
- Enter patient location and requirements (bed type, equipment, specialty, urgency).
- Review ranked, explained hospital options and select one.
- Track the request status, countdown and timeline in real time.
- Cancel a request if no longer needed.

### 3.3 Admin (`ADMIN`)

Responsibilities:

- Create and edit hospitals.
- Create users and assign roles (and a hospital for `HOSPITAL` users).
- Monitor live requests and system activity.
- View operational analytics.

---

## 4. Domain Vocabulary (canonical values)

These values are used **identically** across all docs, the database, the API and the UI.
They live in `server/src/constants/` and `client/src/constants/`.

### 4.1 The five resources and how they are modelled

The product talks about five resources: **ICU, Ventilator, Oxygen, Cardiac, Burns**.
In the data model they map to three orthogonal fields so that matching is precise:

| Product resource | Modelled as | Value |
|---|---|---|
| ICU | Bed type | `ICU` |
| Cardiac (bed) | Bed type | `CARDIAC` (cardiac care / CCU bed) |
| Burns (bed) | Bed type | `BURNS` |
| Ventilator | Bed equipment | `VENTILATOR` |
| Oxygen | Bed equipment | `OXYGEN` |
| Cardiac (team) | Hospital specialty | `CARDIOLOGY` |
| Burns (team) | Hospital specialty | `BURNS` |

**Enums**

- `BED_TYPES`: `ICU`, `CARDIAC`, `BURNS`, `GENERAL`
- `EQUIPMENT`: `VENTILATOR`, `OXYGEN`, `CARDIAC_MONITOR`
- `SPECIALTIES`: `CARDIOLOGY`, `BURNS`, `TRAUMA`, `NEUROLOGY`, `GENERAL_MEDICINE`
- `URGENCY`: `CRITICAL`, `HIGH`, `MODERATE`

A **Bed** document is one physical, reservable unit: it has one `type` and a list of
`equipment` attached to it. Example: an ICU bed with a ventilator and oxygen is
`{ type: "ICU", equipment: ["VENTILATOR", "OXYGEN"] }`.

The hospital dashboard shows **summary counters** for the five product resources:
ICU = available `ICU` beds; Ventilator = available beds with `VENTILATOR`;
Oxygen = available beds with `OXYGEN`; Cardiac = available `CARDIAC` beds;
Burns = available `BURNS` beds.

### 4.2 Status values

| Entity | Statuses |
|---|---|
| Bed | `AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `UNAVAILABLE` |
| Hospital | `ACTIVE`, `INACTIVE` |
| EmergencyRequest | `SEARCHING`, `AWAITING_HOSPITAL`, `RESERVED`, `COMPLETED`, `NO_MATCH`, `CANCELLED` |
| HospitalRequest (an offer to one hospital) | `PENDING`, `ACCEPTED`, `REJECTED`, `TIMEOUT`, `CANCELLED` |
| Reservation | `ACTIVE`, `FULFILLED`, `EXPIRED`, `RELEASED` |
| Freshness | `FRESH`, `RECENT`, `STALE` |
| Confidence | `HIGH`, `MEDIUM`, `LOW` |

The 2-minute handshake states from the brief — `PENDING / ACCEPTED / REJECTED / TIMEOUT` —
are the `HospitalRequest` statuses. `CANCELLED` covers a pending offer withdrawn because
the dispatcher cancelled the emergency.

---

## 5. Core Features (MVP)

### F1. Hospital Bed Availability

Hospital staff manage the hospital's beds. Each bed record contains at least:
`hospitalId`, `type`, `equipment`, `status`, `updatedAt`, `lastUpdatedBy`.

Requirements:

- Change a bed's status with **one tap** (status chips, not a form).
- Staff can set `AVAILABLE`, `OCCUPIED`, `CLEANING`, `UNAVAILABLE`.
- Staff **cannot** set `RESERVED` manually and cannot change a `RESERVED` bed's status
  directly — `RESERVED` is owned by the reservation system (see F8).
- **Confirm all** button: marks all non-reserved beds as re-confirmed (refreshes
  `updatedAt` without changing status). This is how a busy nurse keeps data fresh.
- Every change broadcasts `bed:updated` in real time.

### F2. Data Freshness

Every availability shown anywhere carries an age: *"Updated 32 seconds ago"*,
*"Updated 14 minutes ago"*.

| Category | Default age | Env var |
|---|---|---|
| `FRESH` | 0 – 2 min | `FRESHNESS_FRESH_SECONDS=120` |
| `RECENT` | 2 – 10 min | `FRESHNESS_RECENT_SECONDS=600` |
| `STALE` | > 10 min | (everything above `RECENT`) |

- The freshness of a hospital **for a given request** is the most recent `updatedAt`
  among its available beds that satisfy the request.
- Freshness **affects the match score** (15% weight) and the confidence indicator.
- Stale data is never presented as equally reliable; stale results are visibly marked.

### F3. Emergency Request

Dispatcher enters:

| Field | Required | Example |
|---|---|---|
| Patient location (lat/lng, picked on map or typed) | Yes | 19.0760, 72.8777 |
| Required bed type | Yes | `ICU` |
| Required equipment | No (0..n) | `VENTILATOR` |
| Required specialties | No (0..n) | `CARDIOLOGY` |
| Urgency | No (default `HIGH`) | `CRITICAL` |
| Demo patient ID | Auto-generated | `DEMO-P-0042` |

No patient name, phone number, Aadhaar or medical record is ever collected (see RULES.md §9).
Urgency is displayed to hospitals and sorts their queue; it does **not** change the
match score (BedLink makes no clinical judgements).

### F4. Hospital Matching Engine

Deterministic, rule-based, server-side. Steps:

1. **Filter** out incompatible hospitals (hard rules): inactive, no available bed of the
   required type with all required equipment, missing a required specialty, beyond
   search radius, critical load (≥ 95%), already contacted for this emergency.
2. **Check resources**: count matching available beds.
3. **Check specialties.**
4. **Calculate travel time** (ETA).
5. **Evaluate freshness.**
6. **Consider hospital load.**
7. **Generate a match score** (0–100) using fixed weights (Resource 50%, Travel 25%,
   Freshness 15%, Load 10% — see ARCHITECTURE.md §10).
8. **Explain** the result — reasons for each included hospital, exclusion reasons for
   each filtered hospital.

> An LLM must **never** make or change the hospital selection. See RULES.md §8.

### F5. Explainable Matching

Every hospital card shows a score **and** the reasons:

```
Match: 92%                          HIGH CONFIDENCE
✓ ICU available (3 beds)
✓ Ventilator available
✓ Cardiology department
✓ 8-minute ETA (3.9 km)
✓ Availability updated 45 seconds ago
✓ Moderate hospital load (55%)
```

Plus a score breakdown (resource / travel / freshness / load) on expand.

### F6. Confirm & Hold — the 2-Minute Emergency Handshake

1. Dispatcher selects a hospital from the ranked list (usually the top one) and clicks **Request bed**.
2. Server creates a `HospitalRequest` (`PENDING`, `expiresAt = now + 120s`) and emits
   `hospital:request` to that hospital's room.
3. Hospital staff see the request instantly with a countdown and **Accept / Reject**.
4. Outcomes: `ACCEPTED`, `REJECTED` (reason required), `TIMEOUT` (server-decided at 120 s).

The response window is `OFFER_TIMEOUT_SECONDS=120` (configurable). The **server** owns
the timeout; the client countdown is purely visual.

### F7. Automatic Fallback

If the current hospital rejects or times out, BedLink:

1. Records the outcome in the timeline.
2. **Re-runs matching** with fresh data, excluding all hospitals already contacted.
3. Automatically sends the request to the new top-ranked hospital.

It continues until one of:

- a hospital accepts → emergency `RESERVED`
- no suitable hospitals remain → emergency `NO_MATCH`, dispatcher alerted
- the dispatcher cancels → emergency `CANCELLED`

Only **one** hospital holds a pending offer for a given emergency at a time
(sequential offers — no "spray and pray" that could block beds at many hospitals).

### F8. Temporary Bed Reservation (Bed Lock)

When a hospital accepts, the server atomically picks one matching bed and moves it
`AVAILABLE → RESERVED`. A `Reservation` is created:

| Field | Meaning |
|---|---|
| `_id` (reservationId) | Reservation identity |
| `hospitalId` | Hospital holding the bed |
| `bedId` | The exact bed locked |
| `requestId` | EmergencyRequest it belongs to |
| `hospitalRequestId` | The accepted offer |
| `expiresAt` | Hold expiry (`RESERVATION_HOLD_MINUTES=30`) |
| `status` | `ACTIVE` → `FULFILLED` / `EXPIRED` / `RELEASED` |

Rules:

- A bed can be held by **at most one** active reservation. Two concurrent accepts for
  the same last bed: exactly one succeeds; the other gets `BED_NOT_AVAILABLE`.
- If acceptance fails because no matching bed is left, the offer is treated as a
  rejection with reason `NO_BED_AT_ACCEPT` and fallback continues.
- On patient arrival, hospital marks it arrived → bed `OCCUPIED`, reservation `FULFILLED`,
  emergency `COMPLETED`.
- On expiry or release → bed returns to `AVAILABLE`.

### F9. Real-Time Communication

Socket.IO. Canonical event names (also in ARCHITECTURE.md §9):

| Event | When |
|---|---|
| `bed:updated` | Any bed status/confirmation change |
| `emergency:created` | New emergency created |
| `emergency:updated` | Any emergency status/candidate change |
| `hospital:request` | Hospital receives a new offer |
| `hospital:request-cancelled` | A pending offer was withdrawn (dispatcher cancelled) |
| `hospital:accepted` | Hospital accepted |
| `hospital:rejected` | Hospital rejected |
| `hospital:timeout` | Offer timed out |
| `reservation:created` | Bed locked |
| `reservation:expired` | Hold expired, bed released |
| `reservation:released` | Hold released manually / on cancel |

No screen ever requires a manual refresh.

### F10. Dispatcher Map

Shows the ambulance/patient location, all suitable hospitals (colour by confidence),
excluded hospitals (dimmed, optional toggle), the selected hospital, and ETA labels.
Map stack: Leaflet + OpenStreetMap tiles (ARCHITECTURE.md §12).

### F11. Basic Analytics

Admin dashboard (and a compact version for dispatchers):

- Total emergency requests
- Accepted / Rejected / Timed-out offer counts
- Average hospital response time (offer → accept/reject)
- Average matching time (ms)
- Current available ICU beds
- Current available ventilator beds

No forecasting, no historical BI, no exports.

---

## 6. Unique Features (what makes BedLink more than a directory)

| # | Feature | What the user sees | Where specified |
|---|---|---|---|
| 1 | **Freshness-Aware Matching** | "ICU available — updated 38 seconds ago"; stale data lowers score and confidence | F2, ARCH §10 |
| 2 | **Explainable Match Score** | Score + ✓ reasons + breakdown, not a bare number | F5, ARCH §10 |
| 3 | **2-Minute Emergency Handshake** | Strict, server-enforced response window with live countdown | F6, ARCH §11 |
| 4 | **Automatic Fallback** | Reject/timeout instantly moves to the next best hospital | F7, ARCH §11 |
| 5 | **Temporary Bed Lock** | Accepted bed becomes `RESERVED`; double booking impossible | F8, ARCH §13 |
| 6 | **Emergency Request Timeline** | Timestamped log of every step | F6–F8, ARCH §6 |
| 7 | **Confidence Indicator** | `HIGH / MEDIUM / LOW` operational confidence | ARCH §10.5 |
| 8 | **"Why not this hospital?"** | Excluded hospitals listed with reasons | ARCH §10.2 |

### Example timeline (Feature 6)

```
10:01:05  Request created (ICU + Ventilator + Cardiology, CRITICAL)
10:01:05  Matching completed — 4 suitable, 3 excluded (212 ms)
10:01:12  City General Hospital contacted
10:03:12  City General Hospital — timeout (no response in 2:00)
10:03:12  Lakeside Medical contacted (automatic fallback)
10:03:58  Lakeside Medical accepted (46 s)
10:03:58  Bed ICU-04 reserved until 10:33:58
```

### Confidence Indicator (Feature 7)

An **operational** confidence that the shown availability is real and usable — **not**
a medical prediction. Derived deterministically from freshness, match depth and recent
response behaviour (rules in ARCHITECTURE.md §10.5).

### "Why not this hospital?" (Feature 8)

```
Sunrise Hospital — excluded
✗ No available ICU bed with VENTILATOR
Harbor Clinic — excluded
✗ No CARDIOLOGY department
```

---

## 7. MVP vs Future

### MVP (build now)

Authentication · Hospital dashboard · Bed updates · Dispatcher dashboard · Matching
engine · Map · ETA · Freshness · Emergency request · 2-minute response · Accept/reject ·
Automatic fallback · Reservation · Real-time updates · Basic analytics · Timeline ·
Confidence indicator · "Why not" exclusions

### Future (do NOT build in MVP)

- Hospital API / HIS integration and real hospital systems
- Advanced routing (live traffic, road closures)
- Historical demand prediction and bed demand forecasting
- Multi-ambulance optimization
- Government / health-network integration
- Native mobile apps, SMS/voice fallback for hospitals

---

## 8. Out of Scope (never in this project)

Patient EHR · Medical diagnosis · Doctor appointments · Billing · Pharmacy ·
Laboratory management · Insurance · Full hospital ERP · Medical decision-making AI ·
Real patient data.

---

## 9. Success Criteria for the Hackathon

- The 9-step demo in PHASES.md (Phase 9) runs live with no manual refresh.
- Timeout → automatic fallback works with the real 120 s server timer.
- A concurrent double-accept on the last bed provably results in exactly one reservation.
- Every ranked hospital shows its reasons; every excluded hospital shows why.
- Matching completes in < 1 s for the seeded dataset (≈ 10–15 hospitals).
