/**
 * Every deploy-time setting of the client, read once from Vite env (`VITE_*`, baked in at
 * build time). Nothing else in the app reads `import.meta.env`. See client/.env.example.
 */
const env = import.meta.env;

const str = (v, fallback) => (v === undefined || v === '' ? fallback : v);
const num = (v, fallback) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));
const bool = (v, fallback) => (v === undefined || v === '' ? fallback : v === 'true' || v === '1');
const stripSlash = (v) => v?.replace(/\/+$/, '');

function demoAccounts() {
  const fallback = [
    { label: 'Dispatcher', email: 'dispatcher1@bedlink.demo', password: 'Dispatch@123' },
    { label: 'Hospital', email: 'lakeside@bedlink.demo', password: 'Hospital@123' },
    { label: 'Admin', email: 'admin@bedlink.demo', password: 'Admin@123' },
  ];
  if (!env.VITE_DEMO_ACCOUNTS) return fallback;
  try {
    const parsed = JSON.parse(env.VITE_DEMO_ACCOUNTS);
    return Array.isArray(parsed) ? parsed.filter((a) => a?.label && a?.email && a?.password) : fallback;
  } catch {
    console.warn('[BedLink] VITE_DEMO_ACCOUNTS is not valid JSON — using the seeded demo accounts.');
    return fallback;
  }
}

export const config = Object.freeze({
  /** REST base URL. Unset → `/api` on the same origin (Vite dev proxy or a reverse proxy). */
  apiUrl: stripSlash(str(env.VITE_API_URL, '/api')),
  /** Socket.IO server origin. Unset → the page origin. */
  socketUrl: stripSlash(str(env.VITE_SOCKET_URL, undefined)),

  /** Router basename — Vite's BASE_URL from VITE_BASE_PATH (default `/`). */
  basePath: stripSlash(env.BASE_URL) || '/',

  appVersion: str(env.VITE_APP_VERSION, '0.1.0'),
  /** Shown on dashboards, e.g. "Today · Mumbai region". */
  regionName: str(env.VITE_REGION_NAME, 'Mumbai region'),
  /** Default patient location on the new-emergency form (server seed location). */
  defaultLocation: Object.freeze({ lat: num(env.VITE_DEFAULT_LAT, 19.076), lng: num(env.VITE_DEFAULT_LNG, 72.8777) }),

  showDemoAccounts: bool(env.VITE_SHOW_DEMO_ACCOUNTS, true),
  demoAccounts: demoAccounts(),

  // Mirrors of server matching settings — keep equal to the server env.
  freshSeconds: num(env.VITE_FRESHNESS_FRESH_SECONDS, 120),
  recentSeconds: num(env.VITE_FRESHNESS_RECENT_SECONDS, 600),
  criticalLoad: num(env.VITE_MATCH_CRITICAL_LOAD, 95),

  mapTileUrl: str(env.VITE_MAP_TILE_URL, 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
  mapAttribution: str(env.VITE_MAP_ATTRIBUTION, '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'),
});
