import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Siren } from 'lucide-react';
import { bookingApi } from './api';
import { rememberBooking } from './activeBooking';
import { Field, serverFieldErrors } from '../auth/RegisterShell';
import { LocationSearch } from '../location/LocationSearch';
import { Button } from '../../components/Button';
import { CONDITIONS, MAX_NAME_LENGTH, MAX_NOTES_LENGTH, URGENCY_OPTIONS } from '../../constants/booking';
import { PHONE_PATTERN, normalisePhone } from '../../constants/ambulance';
import { trackPath } from '../../constants/routes';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

const EMPTY = { patientName: '', phone: '', pickup: null, notes: '', condition: '', urgency: '' };

function validate(f) {
  const e = {};
  if (f.patientName.trim().length < 2) e.patientName = 'Enter the patient name';
  if (!PHONE_PATTERN.test(normalisePhone(f.phone))) e.phone = 'Enter a valid 10-digit mobile number';
  if (!f.pickup) e.pickup = 'Search for the pickup address, or use your location';
  if (f.notes.length > MAX_NOTES_LENGTH) e.notes = `At most ${MAX_NOTES_LENGTH} characters`;
  if (!f.condition) e.condition = 'Choose what best describes the problem';
  if (!f.urgency) e.urgency = 'Choose how urgent it is';
  return e;
}

/** Radio-card group: icon + text, never colour alone. */
function Choice({ legend, name, options, value, onChange, error, columns }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className={cn('grid gap-2', columns)}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`${name}-${opt.value}`}
              onClick={() => onChange(opt.value)}
              className={cn(
                'rounded-md border px-3 py-2.5 text-left transition-colors flex items-start gap-2',
                active ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text hover:border-border-strong'
              )}
            >
              {Icon && <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />}
              <span>
                <span className="block text-small font-semibold">{opt.label}</span>
                {opt.hint && <span className="block text-[11px] text-text-subtle leading-tight">{opt.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </fieldset>
  );
}

/** The public booking form: name, mobile, pickup (address search or GPS), notes, condition, urgency. */
export function BookingForm({ activeToken }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const pick = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const { token } = await bookingApi.create({
        patientName: form.patientName.trim(),
        phone: normalisePhone(form.phone),
        pickup: { lat: form.pickup.lat, lng: form.pickup.lng, label: form.pickup.label },
        notes: form.notes.trim(),
        condition: form.condition,
        urgency: form.urgency,
      });
      rememberBooking(token);
      navigate(trackPath(token), { replace: true });
    } catch (err) {
      const fields = serverFieldErrors(err, (p) => (p.startsWith('pickup') ? 'pickup' : p));
      setErrors(fields);
      setFormError(
        Object.keys(fields).length
          ? ''
          : err.code === 'BOOKING_ALREADY_ACTIVE'
            ? 'This number already has an ambulance booking in progress.'
            : errorMessage(err)
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field id="patientName" label="Patient name" error={errors.patientName}>
        <input id="patientName" className={cn('input h-11', errors.patientName && 'border-danger')} value={form.patientName} onChange={set('patientName')} maxLength={MAX_NAME_LENGTH} autoComplete="name" aria-invalid={!!errors.patientName} />
      </Field>
      <Field id="phone" label="Your mobile number" error={errors.phone} hint="The ambulance crew may call this number">
        <input id="phone" className={cn('input h-11', errors.phone && 'border-danger')} value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!errors.phone} />
      </Field>
      <div>
        <label htmlFor="pickup" className="label">
          Pickup location
        </label>
        <LocationSearch id="pickup" value={form.pickup} onChange={pick('pickup')} error={errors.pickup} placeholder="Search area, street or landmark" />
      </div>
      <Field id="notes" label="Landmark / notes" optional error={errors.notes} hint={`${form.notes.length}/${MAX_NOTES_LENGTH}`}>
        <textarea id="notes" className={cn('input min-h-[72px] py-2', errors.notes && 'border-danger')} value={form.notes} onChange={set('notes')} maxLength={MAX_NOTES_LENGTH} rows={2} placeholder="Gate colour, floor, nearby landmark" />
      </Field>
      <Choice legend="What is the problem?" name="condition" options={CONDITIONS} value={form.condition} onChange={pick('condition')} error={errors.condition} columns="grid-cols-1 sm:grid-cols-2" />
      <Choice legend="How urgent is it?" name="urgency" options={URGENCY_OPTIONS} value={form.urgency} onChange={pick('urgency')} error={errors.urgency} columns="grid-cols-1 sm:grid-cols-3" />
      {formError && (
        <div role="alert" className="text-small text-danger bg-danger-soft rounded-md px-3 py-2">
          {formError}
          {activeToken && (
            <>
              {' '}
              <Link to={trackPath(activeToken)} className="font-semibold underline">
                Track your booking
              </Link>
            </>
          )}
        </div>
      )}
      <Button type="submit" size="xl" icon={Siren} variant="dangerSolid" className="w-full" isLoading={busy}>
        Book ambulance
      </Button>
      <p className="text-[12px] text-text-subtle text-center">
        We share your name, number and location only with the ambulance crew and hospital handling your case, and delete them after a retention period.
      </p>
    </form>
  );
}
