import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ambulance } from 'lucide-react';
import { Field, PASSWORD_RULE, RegisterShell, serverFieldErrors } from '../../features/auth/RegisterShell';
import { useAuth } from '../../features/auth/useAuth';
import { Button } from '../../components/Button';
import {
  AMBULANCE_TYPES,
  LICENCE_NUMBER_PATTERN,
  PHONE_PATTERN,
  VEHICLE_NUMBER_PATTERN,
  normaliseLicence,
  normalisePhone,
  normaliseVehicle,
} from '../../constants/ambulance';
import { ROUTES } from '../../constants/routes';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';
import { useGoogleSignup } from '../../features/auth/useGoogleSignup';
import { GoogleSignupBlock } from '../../features/auth/GoogleSignupBlock';

const EMPTY = { name: '', phone: '', email: '', password: '', confirm: '', vehicleNumber: '', ambulanceType: 'ALS', driverName: '', licenceNumber: '', organization: '' };

function validate(f, google) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter your full name';
  if (!PHONE_PATTERN.test(normalisePhone(f.phone))) e.phone = 'Enter a valid 10-digit mobile number';
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email';
  if (!VEHICLE_NUMBER_PATTERN.test(normaliseVehicle(f.vehicleNumber))) e.vehicleNumber = 'e.g. MH01AB1234';
  if (f.driverName.trim().length < 2) e.driverName = 'Enter the driver full name';
  if (!LICENCE_NUMBER_PATTERN.test(normaliseLicence(f.licenceNumber))) e.licenceNumber = '15 characters, e.g. MH14 2011 0062821';
  if (!google) {
    const pw = PASSWORD_RULE(f.password);
    if (pw) e.password = pw;
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match';
  }
  return e;
}

export function RegisterAmbulancePage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { google, accept, clear } = useGoogleSignup((g) => setForm((f) => ({ ...f, name: f.name || g.name, email: g.email })));
  const [form, setForm] = useState(() => ({ ...EMPTY, name: google?.name ?? '', email: google?.email ?? '' }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form, google);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await register('ambulance', {
        name: form.name.trim(),
        email: form.email.trim(),
        ...(google ? { googleCredential: google.credential } : { password: form.password }),
        phone: normalisePhone(form.phone),
        vehicleNumber: normaliseVehicle(form.vehicleNumber),
        ambulanceType: form.ambulanceType,
        driverName: form.driverName.trim(),
        licenceNumber: normaliseLicence(form.licenceNumber),
        ...(form.organization.trim() ? { organization: form.organization.trim() } : {}),
      });
      navigate(ROUTES.DISPATCHER_DASHBOARD, { replace: true });
    } catch (err) {
      const fields = serverFieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  const input = (k, props = {}) => (
    <input id={k} className={cn('input h-11', errors[k] && 'border-danger')} value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
  );

  return (
    <RegisterShell title="Register ambulance" subtitle="For ambulance crews and drivers. Our team verifies your vehicle, then you can request beds." back={ROUTES.REGISTER}>
      <GoogleSignupBlock google={google} onCredential={accept} onClear={clear} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="name" label="Full name" error={errors.name}>
          {input('name', { autoComplete: 'name' })}
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="phone" label="Mobile number" error={errors.phone}>
            {input('phone', { inputMode: 'tel', autoComplete: 'tel', placeholder: '98765 43210' })}
          </Field>
          <Field id="vehicleNumber" label="Vehicle number" error={errors.vehicleNumber} hint="As on the RC, e.g. MH01AB1234">
            {input('vehicleNumber', { placeholder: 'MH01AB1234', autoCapitalize: 'characters' })}
          </Field>
        </div>
        <div>
          <span className="label">Ambulance type</span>
          <div role="radiogroup" aria-label="Ambulance type" className="grid grid-cols-3 gap-2">
            {AMBULANCE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={form.ambulanceType === t.value}
                onClick={() => setForm((f) => ({ ...f, ambulanceType: t.value }))}
                className={cn(
                  'rounded-md border px-2 py-2 text-left transition-colors',
                  form.ambulanceType === t.value ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text hover:border-border-strong'
                )}
              >
                <span className="block text-small font-bold">{t.label}</span>
                <span className="block text-[11px] text-text-subtle leading-tight">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="driverName" label="Driver full name" error={errors.driverName} hint="The person driving; may differ from you">
            {input('driverName', { autoComplete: 'off', placeholder: 'As on the driving licence' })}
          </Field>
          <Field id="licenceNumber" label="Driving licence number" error={errors.licenceNumber} hint="Checked by our team on Parivahan Sarathi">
            {input('licenceNumber', { placeholder: 'MH14 2011 0062821', autoCapitalize: 'characters', autoComplete: 'off' })}
          </Field>
        </div>
        <Field id="organization" label="Service / organisation" optional error={errors.organization}>
          {input('organization', { placeholder: 'e.g. 108 Emergency Service' })}
        </Field>
        <Field id="email" label="Email (your login)" error={errors.email}>
          {input('email', { type: 'email', autoComplete: 'email', readOnly: !!google, className: cn('input h-11', google && 'bg-surface-muted text-text-muted') })}
        </Field>
        {!google && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="password" label="Password" error={errors.password} hint="8+ characters with a number">
            {input('password', { type: 'password', autoComplete: 'new-password' })}
          </Field>
          <Field id="confirm" label="Confirm password" error={errors.confirm}>
            {input('confirm', { type: 'password', autoComplete: 'new-password' })}
          </Field>
        </div>
        )}
        {formError && (
          <p role="alert" className="text-small text-danger bg-danger-soft rounded-md px-3 py-2">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" icon={Ambulance} className="w-full" isLoading={busy}>
          Create ambulance account
        </Button>
      </form>
    </RegisterShell>
  );
}
