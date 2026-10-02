# BedLink — Deployment

> **Related docs:** [ARCHITECTURE.md](./ARCHITECTURE.md) §15 (config) · [MEMORY.md](./MEMORY.md)

Everything deploy-specific comes from environment variables. Templates with every variable,
its default and what it does:

| App | Template | Read at |
|---|---|---|
| Server | `server/.env.example` → `server/.env` or host dashboard | process start (validated; refuses to boot on bad values) |
| Client | `client/.env.example` → `client/.env` or host dashboard | **build time** (`VITE_*` are baked into the bundle — change one, rebuild) |

Never commit a real `.env` (`.gitignore` already excludes them). Client variables are public;
put no secrets in `VITE_*`.

## Prerequisites (any option)

1. **MongoDB Atlas** cluster (free tier is a replica set → `MONGO_TRANSACTIONS=true`).
   Network access: allow your host's egress IPs (or `0.0.0.0/0` for a hackathon).
2. A `JWT_SECRET` of 32+ random characters (`openssl rand -hex 32`).
3. No demo data in production. Sample data from older versions is removed automatically at
   startup (`PURGE_DEMO_DATA`, default on); the admin account and real registrations stay.
4. Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` (10+ characters) so you can open `/admin/verifications`.

## Option A — one service, one URL (recommended)

The server also serves the built client (`SERVE_CLIENT_DIR`). App, API and Socket.IO share an
origin: first-party cookies (work on iPhone Safari), no CORS, WebSockets just work.

`render.yaml` does this on Render (New → Blueprint). Any Node host works the same way:

```bash
cd client && npm ci --include=dev && npm run build      # leave VITE_API_URL / VITE_SOCKET_URL unset
cd ../server && npm ci --omit=dev && npm start
```

Server env: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `SERVE_CLIENT_DIR=../client/dist`,
`CLIENT_ORIGIN=https://<your-app-url>`, `COOKIE_SAMESITE=lax`. Health check: `GET /api/health`.

## Option B — client on Vercel/Netlify, API on Render/Railway

**Server** (root dir `server`, build `npm ci --omit=dev`, start `npm start`):
`NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`,
`CLIENT_ORIGIN=https://<client-domain>` (comma-separate preview domains too).
Defaults then give `SameSite=None; Secure` cookies and `trust proxy 1`.

**Client** (root dir `client`; `client/vercel.json` and `client/public/_redirects` handle SPA routes):
`VITE_API_URL=https://<api-domain>/api`, `VITE_SOCKET_URL=https://<api-domain>`.

> Cross-site cookies are third-party cookies: Safari (all iPhones) blocks them by default, so
> login fails there. Fix by using Option A, or giving both apps one parent domain
> (`app.example.com` + `api.example.com`, `COOKIE_SAMESITE=lax`, optional `COOKIE_DOMAIN=.example.com`).

## Option C — behind your own reverse proxy (Nginx/Caddy)

Serve `client/dist` and proxy `/api` and `/socket.io` (with WebSocket upgrade headers) to the
server. Leave `VITE_API_URL`/`VITE_SOCKET_URL` unset; set `TRUST_PROXY=1`, `COOKIE_SAMESITE=lax`.

## Public ambulance booking (`/book`)

Patients and families book without an account at `/book` and follow progress at `/track/<token>`
(the link is the caller's only credential; only its hash is stored). It needs nothing extra to
deploy — the routes are in the same SPA and API — but check these settings:

| Variable (server) | Default | Meaning |
|---|---|---|
| `BOOKING_OFFER_TIMEOUT_SECONDS` | `60` | accept window per ambulance before the next nearest is tried |
| `AMBULANCE_LOCATION_MAX_AGE_SECONDS` | `120` | on-duty ambulances with an older GPS fix get no bookings |
| `AMBULANCE_LOCATION_MIN_INTERVAL_SECONDS` | `10` | server-side floor between stored positions |
| `BOOKING_RATE_LIMIT_PER_IP_PER_HOUR` | `10` | new bookings per IP per hour (needs a correct `TRUST_PROXY`) |
| `BOOKING_RATE_LIMIT_PER_PHONE_PER_HOUR` | `5` | new bookings per phone number per hour |
| `BOOKING_PII_RETENTION_DAYS` | `30` | closed bookings lose name, phone, notes and pickup after this long |
| `BOOKING_PICKUP_RADIUS_METERS` | `100` | distance at which the ambulance "has reached" the caller |

| `FAKE_REPORT_BLOCK_THRESHOLD` | `3` | `FAKE_OR_PRANK` reports on one number that trigger a block… |
| `FAKE_REPORT_WINDOW_DAYS` | `30` | …counted over this many days; reports are TTL-deleted after it (index `fake_report_ttl`; to change the window on an existing database drop that index and restart) |
| `FAKE_REPORT_BLOCK_HOURS` | `72` | …and the number is refused for this long after the latest report |

Registration now also needs, from users: ambulance driver name + 15-character driving licence (unique) and hospital ownership. Existing accounts/hospitals without them keep working (hospitals show "Not specified"); nothing is migrated.

Client (`VITE_*`, build time): `VITE_AMBULANCE_LOCATION_INTERVAL_SECONDS` (default `10`, keep it at
or above the server minimum). Ambulances share GPS only while **On duty** and need the browser's
location permission over **HTTPS** (browsers refuse GPS on plain http except `localhost`).
The retention purge runs inside the existing sweeper (hourly); there is no separate job.

## Checklist

- [ ] `GET /api/health` → `{"success":true,"data":{"status":"ok"}}`
- [ ] `CLIENT_ORIGIN` exactly matches the browser origin (scheme + host, no trailing slash)
- [ ] Login works and the header shows **LIVE** (socket connected)
- [ ] `VITE_FRESHNESS_*` / `VITE_MATCH_CRITICAL_LOAD` equal the server's values if you changed them
- [ ] Free tiers sleep: hit `/api/health` a minute before a demo
- [ ] `DNS_SERVERS=8.8.8.8,8.8.4.4` only if the host can't resolve Atlas SRV records
- [ ] Hospitals that register start PENDING — verify them with `npm run hospitals` (run it
      anywhere with the production `MONGO_URI`), or set `HOSPITAL_AUTO_VERIFY=true` for a demo
- [ ] `REGISTRATION_ENABLED=false` closes sign-up if you need to
- [ ] `/book` opens without logging in, and a booking with no on-duty ambulance shows "No ambulance available" + **Try again**
- [ ] `TRUST_PROXY` is right (per-IP booking limit uses the client IP); the app is served over HTTPS (GPS needs it)
