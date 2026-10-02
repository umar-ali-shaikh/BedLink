# BedLink — Design System

> **Related docs:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [RULES.md](./RULES.md) · [PHASES.md](./PHASES.md) · [MEMORY.md](./MEMORY.md)

---

## 1. Brand

- **Name:** BedLink
- **Tagline:** *Find the right bed. Right now.*
- **Logo (MVP):** wordmark "BedLink" in Inter 700 with a small Lucide `BedDouble` icon in primary blue. No custom illustration.
- **Voice:** calm, short, factual. Operational language, never clinical claims.
  - ✓ "ICU available — updated 38 seconds ago"
  - ✓ "Lakeside Medical accepted. Bed ICU-04 is held until 10:33."
  - ✗ "Best hospital for your patient's survival"

---

## 2. Design Direction

A professional **emergency operations dashboard**: information-dense where the
dispatcher needs it, big and simple where the nurse needs it.

Principles:

1. **The next action is always obvious.** One primary button per view.
2. **Numbers are the interface.** Bed counts, ETA, countdowns and scores are the largest text on screen.
3. **Trust is shown, not claimed.** Every availability carries its age; every score carries its reasons.
4. **Calm by default, loud only for real urgency.** Red is reserved for critical/rejected/unavailable and the last 30 s of a countdown.
5. **Status is never colour-only.** Text + icon + colour, always.

Inspired by modern healthcare SaaS, clear Stripe-like information hierarchy and
emergency operations consoles — **original** styling, no copied layouts or assets.

---

## 3. Colors

Defined as CSS variables in `client/src/index.css` and mapped into `tailwind.config.js`
(`colors: { primary: 'var(--color-primary)', … }`). Components use tokens, never raw hex.

```css
:root {
  /* Brand */
  --color-primary:        #0B63CE;  /* Healthcare Blue — primary actions, RESERVED, links */
  --color-primary-hover:  #0952AB;
  --color-primary-soft:   #E7F0FC;

  /* Semantic */
  --color-success:        #15803D;  /* AVAILABLE, ACCEPTED, FRESH, HIGH confidence */
  --color-success-soft:   #E8F6EE;
  --color-warning:        #B45309;  /* STALE, LOW confidence, countdown 30–60 s */
  --color-warning-soft:   #FEF3E2;
  --color-danger:         #B91C1C;  /* UNAVAILABLE, REJECTED, CRITICAL, countdown < 30 s */
  --color-danger-soft:    #FDECEC;
  --color-neutral-state:  #64748B;  /* OCCUPIED, CLEANING, TIMEOUT, CANCELLED */
  --color-neutral-soft:   #F1F5F9;

  /* Surfaces & text */
  --color-bg:             #F5F7FA;  /* Neutral Light page background */
  --color-surface:        #FFFFFF;  /* cards, panels */
  --color-surface-muted:  #F8FAFC;
  --color-border:         #E2E8F0;
  --color-border-strong:  #CBD5E1;
  --color-text:           #0F172A;  /* Dark Slate */
  --color-text-muted:     #475569;
  --color-text-subtle:    #64748B;
  --color-text-inverse:   #FFFFFF;
  --color-focus:          #2563EB;

  /* Shape & depth */
  --radius-sm: 6px;  --radius-md: 10px;  --radius-lg: 14px;  --radius-full: 999px;
  --shadow-card:  0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08);
  --shadow-raised: 0 8px 24px rgba(15, 23, 42, 0.12);

  /* Spacing scale (4 px base) */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
}
```

All text/background pairs meet **WCAG AA** (≥ 4.5:1 for body text). Soft backgrounds
are only used behind their matching strong text colour.

Dark mode is out of scope for the MVP.

---

## 4. Typography

Font: **Inter** (Google Fonts, weights 400/500/600/700), fallback `system-ui, sans-serif`.
All numbers use `font-variant-numeric: tabular-nums` so timers and counts don't jitter.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 48 / 52 px | 700 | Countdown timer, hero number on hospital request |
| `h1` | 28 / 34 px | 700 | Page titles |
| `h2` | 22 / 28 px | 600 | Section titles, hospital name on top card |
| `h3` | 18 / 24 px | 600 | Card titles |
| `body` | 15 / 22 px | 400 | Default text |
| `small` | 13 / 18 px | 400–500 | Reasons, secondary info, table cells |
| `caption` | 12 / 16 px | 500, letter-spacing 0.02em, uppercase optional | Labels, badges, freshness |
| `number-lg` | 32 / 36 px | 700 tabular | Bed counters, match score, ETA |
| `number-md` | 20 / 24 px | 600 tabular | Inline KPIs |

On mobile (hospital UI) `body` is 16 px to avoid iOS zoom on inputs.

---

## 5. UI Components

All in `client/src/components/` (primitives) or the relevant `features/*` folder.

### Button
- Variants: `primary` (blue fill), `secondary` (white, border), `success` (green fill — **Accept** only), `danger` (red outline; red fill only inside confirm dialogs), `ghost`.
- Sizes: `sm` 32 px, `md` 40 px, `lg` 48 px, `xl` 56 px (hospital Accept/Reject).
- States: hover, active, focus ring (`2px var(--color-focus)` offset 2), disabled (50% opacity, no pointer), loading (spinner replaces icon, label stays, button disabled).

### Card
White surface, `--radius-lg`, `--shadow-card`, 16–24 px padding. Optional header (title + action) and footer.

### Badge
Pill, `caption` text, soft background + strong text of the same semantic colour, optional leading icon.

### Status indicator
Dot/icon + label for bed, offer, emergency and reservation statuses (mapping in §7).

### Confidence badge
`HIGH CONFIDENCE` (success), `MEDIUM CONFIDENCE` (primary-soft/primary), `LOW CONFIDENCE` (warning). Tooltip/expand lists the confidence reasons. Caption: "Operational confidence — not a medical assessment" in the tooltip.

### Freshness indicator
Icon + relative time, ticking every second: `● Updated 32 seconds ago`.
FRESH = green dot · RECENT = slate dot · STALE = amber `AlertTriangle` + amber text "Updated 25 minutes ago".

### Hospital card (dispatcher)
```text
┌───────────────────────────────────────────────────────────┐
│ #1  Lakeside Medical                 [HIGH CONFIDENCE]    │
│     92 match        8 min est.      3.9 km                │
│     ✓ ICU available (3 beds)    ✓ Ventilator available    │
│     ✓ Cardiology department     ✓ Moderate load (55%)     │
│     ● Updated 45 seconds ago                              │
│     [Show score breakdown ▾]              [Request bed →] │
└───────────────────────────────────────────────────────────┘
```
Top candidate: primary-blue left border + "Best match" badge. Breakdown: four horizontal bars (Resource 50, Travel 25, Freshness 15, Load 10) with each component's contribution.

### Excluded hospital row ("Why not this hospital?")
Collapsed section under candidates: "4 hospitals excluded ▸". Each row: muted hospital name + `✗` reasons in small text.

### Bed counter
Big number + label + icon: `3 ICU`, `5 Ventilator`, `2 Oxygen`, `1 Cardiac`, `0 Burns`. Zero shows in neutral with "None available".

### Bed tile (hospital bed grid)
Bed label (`ICU-04`), type, equipment icons, current status, and a row of one-tap status chips (`Available`, `Occupied`, `Cleaning`, `Unavailable`). Tap target ≥ 48 px. `RESERVED` tile: blue, `Lock` icon, chips disabled, text "Held for incoming patient · until 10:33".

### ETA card
`number-lg` minutes + "est." caption + distance. Lucide `Navigation` icon.

### Countdown timer
`display` size `mm:ss`, circular or bar progress. Colour: > 60 s primary · 30–60 s warning · < 30 s danger (and gentle pulse). At 0 shows "Waiting for server…" until `hospital:timeout` arrives — never decides by itself.

### Emergency timeline
Vertical list, newest at bottom, auto-scroll. Each item: time (`HH:mm:ss`, tabular), icon by event, text, actor caption ("System", "Dispatcher", "Lakeside Medical"). New entries fade in.

### Request modal / incoming request card (hospital)
Full-width card at top of hospital dashboard (and a bottom-sheet modal if on another page):
```text
REQUEST PENDING · CRITICAL
      01:42
ICU · Ventilator · Cardiology
Ambulance est. 8 min away (3.9 km)
Patient ref DEMO-P-0042

[  ✓ Accept  ]          (green, xl, full width)
          — 24 px gap —
[  Reject…   ]          (outline, lg)
```
Reject opens a reason sheet (`No bed`, `No staff`, `Equipment issue`, `Other`) + confirm.

### Reservation card
Bed label, hospital, "Held until 10:33" with hold countdown, actions by role (Release / Mark arrived).

### Map panel
Leaflet map, OSM attribution visible. Markers: patient (blue pulse), candidate hospitals (coloured by confidence, number = rank), selected hospital (larger, primary ring), excluded (grey, toggle). Popup: name, score, ETA. Map never the only place info lives — list mirrors it.

### Toast
Bottom-right desktop, top on mobile. Types: success, info, warning, error. Auto-dismiss 5 s (errors 8 s). Used for live events: "Automatic fallback → Hospital B contacted".

### Table
Admin lists. Sticky header, zebra-free, row hover, `small` text, right-aligned numbers.

### Empty state
Icon + one-line title + one-line hint + optional action. E.g. "No active emergencies — Create one to find a bed."

### Error state
Icon + "Something went wrong" + human message from API + **Retry** button. Never raw error text.

### Loading skeleton
Grey shimmer blocks matching the final layout (cards, rows, map placeholder). Avoid full-page spinners.

### Connection banner
Thin top banner: amber "Reconnecting… live updates paused" / green "Back online" (auto-hide 3 s).

---

## 6. Page States

Every data region implements all of these (RULES.md §10):

| State | Pattern |
|---|---|
| Loading | Skeleton of the real layout |
| Empty | Empty state with next action |
| Error | Error state with Retry |
| Success | Content |
| Offline / reconnecting | Connection banner; actions that need the server are disabled with a tooltip |
| Stale data | Freshness indicator in warning style |

---

## 7. Status Mapping

| Domain value | Label | Colour token | Icon (Lucide) |
|---|---|---|---|
| Bed `AVAILABLE` | Available | success | `CircleCheck` |
| Bed `OCCUPIED` | Occupied | neutral-state | `User` |
| Bed `RESERVED` | Reserved | primary | `Lock` |
| Bed `CLEANING` | Cleaning | neutral-state | `Sparkles` |
| Bed `UNAVAILABLE` | Unavailable | danger | `CircleSlash` |
| Freshness `FRESH` / `RECENT` / `STALE` | Updated … ago | success / neutral / warning | `Circle` / `Circle` / `AlertTriangle` |
| Confidence `HIGH` / `MEDIUM` / `LOW` | … confidence | success / primary / warning | `ShieldCheck` / `Shield` / `ShieldAlert` |
| Offer `PENDING` | Waiting for response | primary | `Clock` |
| Offer `ACCEPTED` | Accepted | success | `CircleCheck` |
| Offer `REJECTED` | Rejected | danger | `CircleX` |
| Offer `TIMEOUT` | No response | neutral-state | `TimerOff` |
| Offer `CANCELLED` | Withdrawn | neutral-state | `Ban` |
| Emergency `SEARCHING` | Finding hospital | primary | `Search` |
| Emergency `AWAITING_HOSPITAL` | Awaiting hospital | primary | `Clock` |
| Emergency `RESERVED` | Bed reserved | success | `Lock` |
| Emergency `COMPLETED` | Patient arrived | success | `CircleCheckBig` |
| Emergency `NO_MATCH` | No hospital available | danger | `CircleAlert` |
| Emergency `CANCELLED` | Cancelled | neutral-state | `Ban` |
| Urgency `CRITICAL` / `HIGH` / `MODERATE` | Critical / High / Moderate | danger / warning / neutral | `Siren` / `TriangleAlert` / `Info` |

---

## 8. Screens

### 8.1 Login (`/login`)
Centered card on `--color-bg`: wordmark, tagline, email, password, primary "Sign in". In dev builds, three "Demo: Admin / Dispatcher / Hospital" quick-fill buttons.

### 8.2 Dispatcher — desktop/tablet first

**`/dispatcher/emergency/new`** (the core screen), 3-zone layout at ≥ 1280 px:
```text
┌──────────── header: BedLink · Dispatcher · connection · user ────────────┐
├──────────────┬─────────────────────────────────┬─────────────────────────┤
│ REQUIREMENTS │  RANKED HOSPITALS               │  MAP                    │
│ (360 px)     │  #1 card (Best match)  [Request]│  patient + hospitals    │
│ bed type     │  #2 card                        │  ETA labels             │
│ equipment    │  #3 card                        │                         │
│ specialties  │  ▸ 4 hospitals excluded (why)   │                         │
│ urgency      │                                 │                         │
│ location     │                                 │                         │
│ [Find beds]  │                                 │                         │
└──────────────┴─────────────────────────────────┴─────────────────────────┘
```
Priority order (top-to-bottom, left-to-right): 1 requirements · 2 best hospital · 3 ETA · 4 bed match · 5 freshness · 6 request action.
At 768–1279 px: requirements collapse to a summary bar after submit; map moves above the list at reduced height.

**`/dispatcher/emergency/:id`**: status banner (status + hospital + countdown), reservation card when held, timeline (right column), candidates (read-only, current one highlighted), Cancel (secondary, confirm).

**`/dispatcher/dashboard`**: active emergencies table (status, hospital, time waiting), live bed summary counters across the city, compact KPIs, "New emergency" primary button.

### 8.3 Hospital — mobile first (375 px baseline)

**`/hospital/dashboard`**:
1. Incoming request card (only when pending; pushes everything else down; sound + vibration on arrival).
2. Bed counters (2-column grid of big numbers).
3. Freshness of hospital data + **Confirm all** (`lg`, full width).
4. Load control: segmented control `Low 25 · Moderate 50 · High 75 · Critical 95` (maps to `currentLoad`).
5. Active reservations list.

Bottom tab bar: Dashboard · Beds · Requests.

**`/hospital/beds`**: filter chips by type, bed tiles stacked; a status change is one tap; optimistic update with undo toast.

**`/hospital/requests`**: pending (top) then recent outcomes; active reservations with **Mark arrived** / Release.

### 8.4 Emergency handshake UI
Strong hierarchy: status line → giant countdown → requirements → ETA → actions. Accept and Reject are separated by ≥ 24 px, different sizes and styles, Accept on top. Reject needs a reason + confirm. After answering, the card shows the outcome for 3 s then collapses.

### 8.5 Admin — desktop
- **`/admin/dashboard`**: KPI row (total requests, accepted, rejected, timed out, avg response time, avg matching time, ICU available, ventilators available), Recharts bar chart of offer outcomes, live emergencies table.
- **`/admin/hospitals`**: table (name, status, load, specialties, available ICU, freshness) + side panel to create/edit hospital and manage beds.
- **`/admin/users`**: table + create/edit drawer (role select; hospital select shown only for HOSPITAL).

---

## 9. Responsive Design

| Breakpoint | Width | Primary audience |
|---|---|---|
| `sm` | ≥ 375 px | Hospital staff (baseline) |
| `md` | ≥ 768 px | Dispatcher on tablet |
| `lg` | ≥ 1024 px | Admin |
| `xl` | ≥ 1280 px | Dispatcher control room (3-zone layout) |

- Hospital UI is designed at 375 px first and simply centres (max-width 560 px) on bigger screens.
- Dispatcher UI is designed at 1280 px first and degrades to 768 px (stacked map + list). Phone works but is not optimised.
- No horizontal scrolling at any breakpoint; tables become stacked cards below 768 px.

---

## 10. Accessibility

- WCAG 2.1 AA contrast for all text.
- Touch targets ≥ 48 × 48 px on hospital screens, ≥ 40 px elsewhere.
- Visible focus ring on every interactive element; full keyboard operation on dispatcher/admin.
- Live regions: countdown announces at 60 s, 30 s, 10 s (`aria-live="polite"`); new incoming request uses `aria-live="assertive"`.
- Icons have labels; colour never carries meaning alone.
- Respect `prefers-reduced-motion` (no pulse/fade).

---

## 11. Motion & Sound

- Transitions 150–200 ms ease-out; no decorative animation.
- New timeline entry / new card: 200 ms fade + 4 px slide.
- Countdown < 30 s: subtle pulse (disabled with reduced motion).
- Incoming hospital request: short alert tone + `navigator.vibrate([200, 100, 200])` when supported; a "Sound on/off" toggle in hospital header (browser requires one user gesture to enable audio — prompt once after login).

---

## 12. Copy Patterns

| Situation | Copy |
|---|---|
| Freshness | "Updated 32 seconds ago" / "Updated 14 minutes ago" |
| Stale warning | "Data may be outdated — updated 25 minutes ago" |
| Fallback | "Lakeside Medical didn't respond in 2:00. Contacting City General…" |
| Accept success (hospital) | "Accepted. Bed ICU-04 is held until 10:33." |
| No match | "No hospital currently matches all requirements. Adjust requirements or retry." |
| Double-book loser | "That bed was just taken. Finding the next hospital…" |
| Confidence tooltip | "Operational confidence in this availability — not a medical assessment." |
