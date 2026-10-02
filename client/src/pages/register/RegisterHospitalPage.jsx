import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, LocateFixed, ShieldCheck } from 'lucide-react';
import { Field, PASSWORD_RULE, RegisterShell, serverFieldErrors } from '../../features/auth/RegisterShell';
import { useAuth } from '../../features/auth/useAuth';
import { MapPanel } from '../../features/dispatcher/MapPanel';
import { Button } from '../../components/Button';
import { HFR_ID_PATTERN, PHONE_PATTERN, REGISTRATION_NUMBER_PATTERN, normalisePhone } from '../../constants/ambulance';
import { SPECIALTY_LABELS, SPECIALTY_VALUES } from '../../constants/hospital';
import { ROUTES } from '../../constants/routes';
import { config } from '../../config';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';
import { useGoogleSignup } from '../../features/auth/useGoogleSignup';
import { GoogleSignupBlock } from '../../features/auth/GoogleSignupBlock';

const EMPTY = {
  name: '',
  registrationNumber: '',
  hfrId: '',
  phone: '',
  hospitalEmail: '',
  address: '',
  lat: '',
  lng: '',
  specialties: [],
  contactName: '',
  email: '',
  password: '',
  confirm: '',
  declaration: false,
};

const validEmail = (v) => /^\S+@\S+\.\S+$/.test(v.trim());

function validate(f, google) {
  const e = {};
  if (f.name.trim().length < 3) e.name = 'Enter the hospital name';
  if (!REGISTRATION_NUMBER_PATTERN.test(f.registrationNumber.trim().toUpperCase()))
    e.registrationNumber = 'As on your clinical establishment / municipal registration certificate';
  if (f.hfrId.trim() && !HFR_ID_PATTERN.test(f.hfrId.replace(/[\s-]/g, '').toUpperCase())) e.hfrId = 'Looks like IN2710000123';
  if (!PHONE_PATTERN.test(normalisePhone(f.phone))) e.phone = 'Enter a valid 10-digit number';
  if (!validEmail(f.hospitalEmail)) e.hospitalEmail = 'Enter the official hospital email';
  if (f.address.trim().length < 5) e.address = 'Enter the full address';
  if (!Number.isFinite(+f.lat) || !Number.isFinite(+f.lng) || f.lat === '' || f.lng === '') e.location = 'Pick the hospital on the map';
  if (f.contactName.trim().length < 2) e.contactName = 'Enter your name';
  if (!validEmail(f.email)) e.email = 'Enter a valid email';
  if (!google) {
    const pw = PASSWORD_RULE(f.password);
    if (pw) e.password = pw;
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match';
  }
  if (!f.declaration) e.declaration = 'Please confirm';
  return e;
}

/** Server error paths → form fields. */
const FIELD = {
  'hospital.name': 'name',
  'hospital.registrationNumber': 'registrationNumber',
  'hospital.hfrId': 'hfrId',
  'hospital.phone': 'phone',
  'hospital.email': 'hospitalEmail',
  'hospital.address': 'address',
  'hospital.coordinates': 'location',
  'hospital.coordinates.lat': 'location',
  'hospital.coordinates.lng': 'location',
  'contact.name': 'contactName',
  'contact.email': 'email',
  'contact.password': 'password',
};

function Section({ n, title, children }) {
  return (
    <fieldset className="space-y-4">
      <legend className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
        <span className="w-5 h-5 rounded bg-primary-soft text-primary flex items-center justify-center text-[10px]">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Hospital self-registration. The hospital is created PENDING: it can sign in and set up
 * beds, but ambulances can't see it until BedLink verifies the registration.
 */
export function RegisterHospitalPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { google, accept, clear } = useGoogleSignup((g) =>
    setForm((f) => ({ ...f, contactName: f.contactName || g.name, email: g.email }))
  );
  const [form, setForm] = useState(() => ({ ...EMPTY, contactName: google?.name ?? '', email: google?.email ?? '' }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setLocation = ({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }));
  const hasLocation = form.lat !== '' && form.lng !== '' && Number.isFinite(+form.lat) && Number.isFinite(+form.lng);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form, google);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      await register('hospital', {
        hospital: {
          name: form.name.trim(),
          address: form.address.trim(),
          coordinates: { lat: +form.lat, lng: +form.lng },
          specialties: form.specialties,
          registrationNumber: form.registrationNumber.trim().toUpperCase(),
          ...(form.hfrId.trim() ? { hfrId: form.hfrId.replace(/[\s-]/g, '').toUpperCase() } : {}),
          phone: normalisePhone(form.phone),
          email: form.hospitalEmail.trim(),
        },
        contact: { name: form.contactName.trim(), email: form.email.trim(), ...(google ? {} : { password: form.password }) },
        ...(google ? { googleCredential: google.credential } : {}),
      });
      navigate(ROUTES.HOSPITAL_BEDS, { replace: true });
    } catch (err) {
      const fields = serverFieldErrors(err, (p) => FIELD[p] ?? p);
      setErrors(fields);
      if (!Object.keys(fields).length) setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  const input = (k, props = {}) => (
    <input id={k} className={cn('input h-11', errors[k] && 'border-danger')} value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
  );

  return (
    <RegisterShell wide title="Register hospital" subtitle="Share live bed availability with ambulances in your area." back={ROUTES.REGISTER}>
      <div className="mb-6 flex gap-3 rounded-md border border-primary/20 bg-primary-soft/60 p-3.5 text-small text-text">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <p>
          <strong>Every hospital is verified.</strong> We check your registration number against the state Clinical Establishment
          register (and your ABDM Health Facility ID if you have one) and call your official number. Until then ambulances can't see
          your hospital — you can sign in and set up your beds meanwhile.
        </p>
      </div>

      <GoogleSignupBlock google={google} onCredential={accept} onClear={clear} />
      <form onSubmit={submit} className="space-y-8" noValidate>
        <Section n="1" title="Hospital">
          <Field id="name" label="Hospital name" error={errors.name}>
            {input('name', { placeholder: 'As on the registration certificate' })}
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="registrationNumber" label="Registration / licence number" error={errors.registrationNumber} hint="Clinical Establishment Act or municipal registration">
              {input('registrationNumber', { placeholder: 'e.g. MH/CE/2024/00123', autoCapitalize: 'characters' })}
            </Field>
            <Field id="hfrId" label="ABDM Health Facility ID" optional error={errors.hfrId} hint="Speeds up verification">
              {input('hfrId', { placeholder: 'IN2710000123', autoCapitalize: 'characters' })}
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="phone" label="Official phone" error={errors.phone} hint="We call this number to verify">
              {input('phone', { inputMode: 'tel', placeholder: '98765 43210' })}
            </Field>
            <Field id="hospitalEmail" label="Official email" error={errors.hospitalEmail}>
              {input('hospitalEmail', { type: 'email', placeholder: 'info@yourhospital.in' })}
            </Field>
          </div>
          <div>
            <span className="label">Departments</span>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_VALUES.map((v) => {
                const on = form.specialties.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setForm((f) => ({ ...f, specialties: on ? f.specialties.filter((s) => s !== v) : [...f.specialties, v] }))}
                    className={cn('chip', on && 'chip-active')}
                  >
                    {on && <Check className="w-3.5 h-3.5" aria-hidden />}
                    {SPECIALTY_LABELS[v]}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section n="2" title="Location">
          <Field id="address" label="Full address" error={errors.address}>
            {input('address', { placeholder: 'Street, area, city, PIN' })}
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="label mb-0">Pin on map</span>
              <button type="button" onClick={useMyLocation} disabled={locating} className="inline-flex items-center gap-1 text-small font-medium text-primary hover:underline disabled:opacity-50">
                <LocateFixed className="w-3.5 h-3.5" aria-hidden /> {locating ? 'Locating…' : 'Use my location'}
              </button>
            </div>
            <MapPanel
              className={cn('h-[280px]', errors.location && 'border-danger')}
              patientLocation={hasLocation ? { lat: +form.lat, lng: +form.lng } : config.defaultLocation}
              onPickLocation={setLocation}
              title="Hospital location"
              pinLabel="Hospital"
              showLegend={false}
            />
            <p className={cn('mt-1.5 text-[12px] tabular-nums', errors.location ? 'text-danger' : 'text-text-subtle')}>
              {errors.location ?? (hasLocation ? `Pinned at ${(+form.lat).toFixed(5)}, ${(+form.lng).toFixed(5)} — click the map to adjust` : 'Click the hospital entrance on the map')}
            </p>
          </div>
        </Section>

        <Section n="3" title="Your login">
          <Field id="contactName" label="Your name" error={errors.contactName} hint="Person responsible for bed updates">
            {input('contactName', { autoComplete: 'name' })}
          </Field>
          <Field id="email" label="Your email (login)" error={errors.email}>
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
        </Section>

        <label className={cn('flex items-start gap-3 text-small cursor-pointer', errors.declaration ? 'text-danger' : 'text-text')}>
          <input id="declaration" type="checkbox" className="w-5 h-5 mt-0.5 accent-primary shrink-0" checked={form.declaration} onChange={set('declaration')} />
          I am authorised to register this hospital, and the details above are correct. I understand false details lead to rejection.
        </label>

        {formError && (
          <p role="alert" className="text-small text-danger bg-danger-soft rounded-md px-3 py-2">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" icon={Building2} className="w-full" isLoading={busy}>
          Submit for verification
        </Button>
      </form>
    </RegisterShell>
  );
}
