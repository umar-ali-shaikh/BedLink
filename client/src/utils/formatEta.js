export function formatEta(minutes) {
  if (minutes == null || isNaN(minutes)) return '—';
  const rounded = Math.round(minutes);
  if (rounded <= 1) return '< 1 min est.';
  return `${rounded} min est.`;
}

export function formatDistance(km) {
  if (km == null || isNaN(km)) return '—';
  return `${km.toFixed(1)} km`;
}
