const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km between two `{ lat, lng }` points. */
export function haversineKm(from, to) {
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** `{ lat, lng }` → GeoJSON Point. */
export const toPoint = ({ lat, lng }) => ({ type: 'Point', coordinates: [lng, lat] });

/** GeoJSON Point → `{ lat, lng }`. */
export const fromPoint = (point) =>
  point?.coordinates ? { lat: point.coordinates[1], lng: point.coordinates[0] } : null;
