import { useNow } from './useNow';
import { formatRelativeTime } from '../utils/formatRelative';

export function useRelativeTime(timestamp) {
  const now = useNow(1000);
  return formatRelativeTime(timestamp, now);
}
