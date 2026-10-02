import { CRITICAL_LOAD } from '../../constants/hospital';
import { freshnessOf } from '../../utils/formatRelative';

/** Table status pill: Online / Stale sync / Diverted / Inactive (Stitch hospitals table). */
export function hospitalHealth(h, now = Date.now()) {
  if (h.status !== 'ACTIVE') return 'OFFLINE';
  if ((h.currentLoad ?? 0) >= CRITICAL_LOAD) return 'DIVERTED';
  if (freshnessOf(h.bedSummary?.lastUpdatedAt ?? h.lastAvailabilityUpdate, now) === 'STALE') return 'STALE';
  return 'ONLINE';
}
