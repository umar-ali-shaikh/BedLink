export function formatEta(minutes) {
  if (minutes == null || Number.isNaN(Number(minutes))) return '—';
  return `${Math.max(1, Math.round(minutes))} min`;
}

export function formatDistance(km) {
  if (km == null || Number.isNaN(Number(km))) return '—';
  return `${Number(km).toFixed(1)} km`;
}
