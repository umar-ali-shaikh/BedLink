import React, { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { Segmented } from '../../components/Segmented';
import { BED_TYPE_LABELS, BED_TYPE_VALUES, EQUIPMENT_LABELS, EQUIPMENT_VALUES } from '../../constants/bed';
import { SPECIALTY_LABELS, SPECIALTY_VALUES } from '../../constants/hospital';
import { LocationSearch } from '../location/LocationSearch';
import { URGENCY_VALUES } from '../../constants/emergency';
import { cn } from '../../utils/cn';

const schema = z.object({
  bedType: z.enum(BED_TYPE_VALUES),
  equipment: z.array(z.enum(EQUIPMENT_VALUES)),
  specialties: z.array(z.enum(SPECIALTY_VALUES)),
  urgency: z.enum(URGENCY_VALUES),
});

export const DEFAULT_REQUIREMENTS = {
  bedType: 'ICU',
  equipment: ['VENTILATOR'],
  specialties: ['CARDIOLOGY'],
  urgency: 'CRITICAL',
};

const URGENCY_STYLE = {
  CRITICAL: 'bg-danger border-danger text-text-inverse',
  HIGH: 'bg-warning border-warning text-text-inverse',
  MODERATE: 'bg-neutral-state border-neutral-state text-text-inverse',
};

function ToggleChip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn('chip', active && 'chip-active')}>
      {active && <Check className="w-3.5 h-3.5" aria-hidden />}
      {children}
    </button>
  );
}

function Section({ step, title, children }) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5">
        <span className="w-5 h-5 rounded bg-neutral-soft text-text-muted flex items-center justify-center text-[10px]">{step}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Requirement form (DESIGN.md §8.2 zone 1). No patient name/phone/notes fields exist on
 * purpose (RULES.md §9). Location (`{ lat, lng, label }` or null) comes from address search or GPS.
 */
export function EmergencyForm({ value, onChange, location, onLocationChange, onSubmit, isSubmitting, disabled }) {
  const [errors, setErrors] = useState({});
  const set = (patch) => onChange({ ...value, ...patch });
  const toggle = (key, item) =>
    set({ [key]: value[key].includes(item) ? value[key].filter((v) => v !== item) : [...value[key], item] });

  const submit = (e) => {
    e.preventDefault();
    const parsed = schema.safeParse(value);
    const found = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]));
    if (!location) found.location = 'Search for the patient’s location and pick it from the list';
    setErrors(found);
    if (Object.keys(found).length) return;
    const { urgency, ...requirements } = parsed.data;
    onSubmit({ patientLocation: { lat: location.lat, lng: location.lng }, requirements, urgency });
  };


  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Section step="1" title="Bed type">
        <Segmented
          label="Bed type"
          value={value.bedType}
          onChange={(bedType) => set({ bedType })}
          options={BED_TYPE_VALUES.map((v) => ({ value: v, label: BED_TYPE_LABELS[v] }))}
          disabled={disabled}
        />
      </Section>

      <Section step="2" title="Equipment">
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_VALUES.map((v) => (
            <ToggleChip key={v} active={value.equipment.includes(v)} onClick={() => toggle('equipment', v)}>
              {EQUIPMENT_LABELS[v]}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section step="3" title="Specialties">
        <div className="flex flex-wrap gap-2">
          {SPECIALTY_VALUES.map((v) => (
            <ToggleChip key={v} active={value.specialties.includes(v)} onClick={() => toggle('specialties', v)}>
              {SPECIALTY_LABELS[v]}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section step="4" title="Urgency">
        <div role="radiogroup" aria-label="Urgency" className="grid grid-cols-3 gap-1.5">
          {URGENCY_VALUES.map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={value.urgency === u}
              onClick={() => set({ urgency: u })}
              className={cn(
                'h-10 rounded-md border text-small font-semibold capitalize transition-colors',
                value.urgency === u ? URGENCY_STYLE[u] : 'bg-surface border-border text-text-muted hover:text-text'
              )}
            >
              {u.toLowerCase()}
            </button>
          ))}
        </div>
      </Section>

      <Section step="5" title="Patient location">
        <LocationSearch id="patient-location" value={location} onChange={onLocationChange} error={errors.location} placeholder="Search address, area or landmark" />
      </Section>

      <Button type="submit" size="lg" icon={Search} className="w-full" isLoading={isSubmitting} disabled={disabled}>
        Find beds
      </Button>
    </form>
  );
}
