import { BED_TYPE_LABELS, EQUIPMENT_LABELS } from '../constants/bed';
import { SPECIALTY_LABELS } from '../constants/hospital';

const list = (values = [], labels) => values.map((v) => labels[v] ?? v);

/** "ICU · Ventilator · Cardiology" */
export function requirementsText(req, sep = ' · ') {
  if (!req) return '—';
  return [BED_TYPE_LABELS[req.bedType] ?? req.bedType, ...list(req.equipment, EQUIPMENT_LABELS), ...list(req.specialties, SPECIALTY_LABELS)].join(sep);
}

export const equipmentText = (equipment = []) =>
  equipment.length ? list(equipment, EQUIPMENT_LABELS).join(' · ') : 'No special equipment';

export const specialtiesText = (specialties = []) => list(specialties, SPECIALTY_LABELS).join(', ');
