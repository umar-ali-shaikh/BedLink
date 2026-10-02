import React, { useState } from 'react';
import { Check, Crosshair, LocateFixed, MapPin, Search } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { Segmented } from '../../components/Segmented';
import { BED_TYPE_LABELS, BED_TYPE_VALUES, EQUIPMENT_LABELS, EQUIPMENT_VALUES } from '../../constants/bed';
import { DEFAULT_PATIENT_LOCATION, SPECIALTY_LABELS, SPECIALTY_VALUES } from '../../constants/hospital';
import { URGENCY_VALUES } from '../../constants/emergency';
import { cn } from '../../utils/cn';

const schema = z.object({
  bedType: z.enum(BED_TYPE_VALUES),
  equipment: z.array(z.enum(EQUIPMENT_VALUES)),
  specialties: z.array(z.enum(SPECIALTY_VALUES)),
  urgency: z.enum(URGENCY_VALUES),
  lat: z.coerce.number({ invalid_type_error: 'Latitude must be a number' }).min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  lng: z.coerce.number({ invalid_type_error: 'Longitude must be a number' }).min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
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
 * purpose (RULES.md §9). Location is controlled by the parent so a map click can set it.
 */
export function EmergencyForm({ value, onChange, location, onLocationChange, onSubmit, isSubmitting, disabled }) {
  const [errors, setErrors] = useState({});
  const [locating, setLocating] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });
  const toggle = (key, item) =>
    set({ [key]: value[key].includes(item) ? value[key].filter((v) => v !== item) : [...value[key], item] });

  const submit = (e) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...value, lat: location.lat, lng: location.lng });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    const { lat, lng, urgency, ...requirements } = parsed.data;
    onSubmit({ patientLocation: { lat, lng }, requirements, urgency });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="lat" className="sr-only">
              Latitude
            </label>
            <input
              id="lat"
              inputMode="decimal"
              className={cn('input tabular-nums', errors.lat && 'border-danger')}
              value={location.lat}
              onChange={(e) => onLocationChange({ ...location, lat: e.target.value })}
              placeholder="Latitude"
              aria-invalid={!!errors.lat}
            />
          </div>
          <div>
            <label htmlFor="lng" className="sr-only">
              Longitude
            </label>
            <input
              id="lng"
              inputMode="decimal"
              className={cn('input tabular-nums', errors.lng && 'border-danger')}
              value={location.lng}
              onChange={(e) => onLocationChange({ ...location, lng: e.target.value })}
              placeholder="Longitude"
              aria-invalid={!!errors.lng}
            />
          </div>
        </div>
        {(errors.lat || errors.lng) && <p className="text-small text-danger">{errors.lat || errors.lng}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-small">
          <button type="button" className="inline-flex items-center gap-1 text-primary font-medium hover:underline" onClick={() => onLocationChange({ ...DEFAULT_PATIENT_LOCATION })}>
            <MapPin className="w-3.5 h-3.5" aria-hidden /> Demo location
          </button>
          <button type="button" className="inline-flex items-center gap-1 text-primary font-medium hover:underline disabled:opacity-50" onClick={useMyLocation} disabled={locating}>
            <LocateFixed className="w-3.5 h-3.5" aria-hidden /> {locating ? 'Locating…' : 'My location'}
          </button>
          <span className="inline-flex items-center gap-1 text-text-subtle">
            <Crosshair className="w-3.5 h-3.5" aria-hidden /> or click the map
          </span>
        </div>
      </Section>

      <Button type="submit" size="lg" icon={Search} className="w-full" isLoading={isSubmitting} disabled={disabled}>
        Find beds
      </Button>
    </form>
  );
}
