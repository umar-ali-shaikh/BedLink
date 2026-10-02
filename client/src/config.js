/**
 * Every deploy-time setting of the client, read once from Vite env (`VITE_*`, baked in at
 * build time). Nothing else in the app reads `import.meta.env`. See client/.env.example.
 */
const env = import.meta.env;

const str = (v, fallback) => (v === undefined || v === '' ? fallback : v);
const num = (v, fallback) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));
const stripSlash = (v) => v?.replace(/\/+$/, '');

export const config = Object.freeze({
  /** REST base URL. Unset → `/api` on the same origin (Vite dev proxy or a reverse proxy). */
  apiUrl: stripSlash(str(env.VITE_API_URL, '/api')),
  /** Socket.IO server origin. Unset → the page origin. */
  socketUrl: stripSlash(str(env.VITE_SOCKET_URL, undefined)),

  /** Router basename — Vite's BASE_URL from VITE_BASE_PATH (default `/`). */
  basePath: stripSlash(env.BASE_URL) || '/',

  appVersion: str(env.VITE_APP_VERSION, '0.1.0'),
  /** Optional label on dashboards, e.g. "Today · Pune". Empty = just "Today". */
  regionName: str(env.VITE_REGION_NAME, ''),
  /** Where maps open before any location is known (default: all of India). */
  mapCenter: Object.freeze({ lat: num(env.VITE_MAP_CENTER_LAT, 22.5), lng: num(env.VITE_MAP_CENTER_LNG, 79), zoom: num(env.VITE_MAP_ZOOM, 5) }),

  // Mirrors of server matching settings — keep equal to the server env.
  freshSeconds: num(env.VITE_FRESHNESS_FRESH_SECONDS, 120),
  recentSeconds: num(env.VITE_FRESHNESS_RECENT_SECONDS, 600),
  criticalLoad: num(env.VITE_MATCH_CRITICAL_LOAD, 95),

  mapTileUrl: str(env.VITE_MAP_TILE_URL, 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
  mapAttribution: str(env.VITE_MAP_ATTRIBUTION, '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'),
});
