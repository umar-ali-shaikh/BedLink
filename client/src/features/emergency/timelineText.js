import { REJECT_REASON_LABELS } from '../../constants/emergency';
import { formatClock, formatDuration } from '../../utils/formatRelative';
import { requirementsText } from '../../utils/labels';

/** Human text for a timeline entry (ARCHITECTURE.md §6.7 TIMELINE_EVENTS + metadata). */
export function describeTimeline(entry, hospitalName) {
  const m = entry.metadata ?? {};
  const name = m.hospitalName ?? hospitalName ?? 'Hospital';
  switch (entry.event) {
    case 'REQUEST_CREATED':
      return { text: `Emergency created — ${requirementsText(m.requirements)}`, tone: 'neutral' };
    case 'MATCHING_COMPLETED':
      return {
        text: `Matching done: ${m.suitable ?? 0} suitable, ${m.excluded ?? 0} excluded${m.durationMs != null ? ` (${m.durationMs} ms)` : ''}`,
        tone: 'neutral',
      };
    case 'HOSPITAL_CONTACTED':
      return {
        text: m.automatic
          ? `Automatic fallback → ${name} contacted (attempt ${m.attempt})`
          : `${name} contacted — score ${m.score}, ${m.etaMinutes} min est.`,
        tone: 'primary',
      };
    case 'HOSPITAL_ACCEPTED':
      return { text: `${name} accepted${m.responseSeconds != null ? ` in ${m.responseSeconds} s` : ''}`, tone: 'success' };
    case 'HOSPITAL_REJECTED':
      return { text: `${name} rejected — ${REJECT_REASON_LABELS[m.reason] ?? m.reason}`, tone: 'danger' };
    case 'HOSPITAL_TIMEOUT':
      return { text: `${name} didn't respond in ${formatDuration(m.windowSeconds ?? 120)}`, tone: 'warning' };
    case 'ACCEPT_FAILED_NO_BED':
      return { text: `${name} accepted, but that bed was just taken. Finding the next hospital…`, tone: 'warning' };
    case 'BED_RESERVED':
      return { text: `Bed ${m.bedLabel} held at ${name} until ${formatClock(m.expiresAt)}`, tone: 'success' };
    case 'NO_HOSPITALS_REMAINING':
      return { text: 'No hospital currently matches all requirements', tone: 'danger' };
    case 'REQUEST_CANCELLED':
      return { text: 'Emergency cancelled', tone: 'neutral' };
    case 'RESERVATION_EXPIRED':
      return { text: `Hold on bed ${m.bedLabel ?? ''} expired — bed released`, tone: 'warning' };
    case 'RESERVATION_RELEASED':
      return { text: `Reservation on bed ${m.bedLabel ?? ''} released`, tone: 'neutral' };
    case 'PATIENT_ARRIVED':
      return { text: `Patient arrived${m.bedLabel ? ` — bed ${m.bedLabel}` : ''}`, tone: 'success' };
    default:
      return { text: entry.event, tone: 'neutral' };
  }
}

export function actorLabel(entry, hospitalName) {
  if (entry.actor?.type === 'SYSTEM') return 'System';
  if (entry.actor?.role === 'HOSPITAL') return entry.metadata?.hospitalName ?? hospitalName ?? 'Hospital';
  if (entry.actor?.role === 'ADMIN') return 'Admin';
  return 'Ambulance';
}
