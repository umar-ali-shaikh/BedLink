const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/** "32 seconds ago" / "14 minutes ago" (DESIGN.md §12). */
export function formatRelativeTime(dateInput, now = Date.now()) {
  if (!dateInput) return 'never';
  const diffSec = Math.max(0, Math.floor((now - new Date(dateInput).getTime()) / 1000));
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${plural(diffSec, 'second')} ago`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${plural(min, 'minute')} ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${plural(hours, 'hour')} ago`;
  return `${plural(Math.floor(hours / 24), 'day')} ago`;
}

/** Compact form for dense tables: "38s ago", "14m ago". */
export function formatRelativeShort(dateInput, now = Date.now()) {
  if (!dateInput) return '—';
  const s = Math.max(0, Math.floor((now - new Date(dateInput).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const formatClock = (d, withSeconds = false) =>
  d
    ? new Date(d).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        ...(withSeconds ? { second: '2-digit' } : {}),
        hour12: false,
      })
    : '—';

export const formatDuration = (totalSeconds) => {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Freshness tier from age, mirroring server defaults (120 s / 600 s). */
export function freshnessOf(dateInput, now = Date.now()) {
  if (!dateInput) return 'STALE';
  const age = (now - new Date(dateInput).getTime()) / 1000;
  if (age <= 120) return 'FRESH';
  if (age <= 600) return 'RECENT';
  return 'STALE';
}
