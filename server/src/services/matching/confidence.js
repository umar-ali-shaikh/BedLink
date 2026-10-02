import { CONFIDENCE_ORDER, FRESHNESS_TO_CONFIDENCE } from '../../constants/matching.js';

const downgrade = (level) =>
  CONFIDENCE_ORDER[Math.min(CONFIDENCE_ORDER.indexOf(level) + 1, CONFIDENCE_ORDER.length - 1)];

/**
 * Operational (not medical) confidence that the shown availability is real
 * (ARCHITECTURE.md §10.5). LOW is the floor.
 */
export function computeConfidence({ freshnessTier, matchingBedCount, lastTimeoutAt, now }, { timeoutWindowMinutes }) {
  let level = FRESHNESS_TO_CONFIDENCE[freshnessTier];
  const reasons = [];

  if (matchingBedCount === 1) {
    level = downgrade(level);
    reasons.push('Only 1 matching bed');
  }

  if (lastTimeoutAt) {
    const minutesAgo = Math.floor((now.getTime() - new Date(lastTimeoutAt).getTime()) / 60000);
    if (minutesAgo >= 0 && minutesAgo < timeoutWindowMinutes) {
      level = downgrade(level);
      reasons.push(
        minutesAgo < 1 ? 'Missed a request less than a minute ago' : `Missed a request ${minutesAgo} min ago`
      );
    }
  }

  return { level, reasons };
}
