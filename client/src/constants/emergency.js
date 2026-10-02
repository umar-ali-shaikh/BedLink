export const EMERGENCY_STATUS = {
  SEARCHING: 'SEARCHING',
  AWAITING_HOSPITAL: 'AWAITING_HOSPITAL',
  RESERVED: 'RESERVED',
  COMPLETED: 'COMPLETED',
  NO_MATCH: 'NO_MATCH',
  CANCELLED: 'CANCELLED',
};

export const URGENCY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
};

export const OFFER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  TIMEOUT: 'TIMEOUT',
  CANCELLED: 'CANCELLED',
};

export const CONFIDENCE_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

export const FRESHNESS_TIERS = {
  FRESH: 'FRESH',
  RECENT: 'RECENT',
  STALE: 'STALE',
};

export const REJECT_REASONS = [
  { id: 'NO_BED', label: 'No bed available' },
  { id: 'NO_STAFF', label: 'Insufficient staff' },
  { id: 'EQUIPMENT_ISSUE', label: 'Required equipment unavailable' },
  { id: 'OTHER', label: 'Other operational constraint' },
];
