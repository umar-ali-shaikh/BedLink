import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BadgeCheck, Clock, LogOut, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { ambulanceApi } from '../../features/booking/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { PHONE_PATTERN, normalisePhone } from '../../constants/ambulance';
import { ROUTES } from '../../constants/routes';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

const STATUS = {
  VERIFIED: { icon: BadgeCheck, text: 'Verified — you can request beds', cls: 'text-success bg-success-soft border-success/20' },
  PENDING: { icon: Clock, text: 'Verification pending', cls: 'text-warning bg-warning-soft border-warning/25' },
  REJECTED: { icon: XCircle, text: 'Not approved', cls: 'text-danger bg-danger-soft border-danger/20' },
};
const AMBULANCE_TYPE = { ALS: 'Advanced Life Support', BLS: 'Basic Life Support', PTA: 'Patient transport' };

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-border last:border-0 text-small">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text font-medium text-right break-words min-w-0">{value || '—'}</dd>
    </div>
  );
}

/** Ambulance profile: verification status, verified (read-only) vehicle/driver details, editable phone and organisation. */
export function AmbulanceProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const a = user?.ambulance ?? {};
  const [edit, setEdit] = useState({ phone: '', organization: '' });
  const [error, setError] = useState('');
  useEffect(() => setEdit({ phone: a.phone ?? '', organization: a.organization ?? '' }), [a.phone, a.organization]);

  const save = useMutation({
    mutationFn: () => ambulanceApi.updateProfile({ phone: normalisePhone(edit.phone), organization: edit.organization.trim() }),
    onSuccess: async () => {
      await refreshUser();
      showToast({ type: 'success', title: 'Profile saved' });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const status = STATUS[user?.verificationStatus] ?? STATUS.VERIFIED;
  const StatusIcon = status.icon;
  const dirty = edit.phone !== (a.phone ?? '') || edit.organization !== (a.organization ?? '');
  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!PHONE_PATTERN.test(normalisePhone(edit.phone))) return setError('Enter a valid 10-digit mobile number.');
    return save.mutate();
  };

  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <h2 className="text-h2 text-text tabular-nums">{a.vehicleNumber ?? 'Ambulance'}</h2>
        <p className="text-small text-text-muted mt-0.5">
          {a.ambulanceType} · {AMBULANCE_TYPE[a.ambulanceType] ?? ''}
        </p>
        <p className={cn('mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold', status.cls)} data-testid="verification-status">
          <StatusIcon className="w-4 h-4" aria-hidden /> {status.text}
        </p>
        {user?.verificationStatus === 'REJECTED' && a.verificationNote && <p className="mt-2 text-small text-danger">{a.verificationNote}</p>}
        <dl className="mt-3">
          <Row label="Vehicle number" value={a.vehicleNumber} />
          <Row label="Driving licence" value={a.licenceNumber} />
          <Row label="Driver" value={a.driverName} />
          <Row label="Account holder" value={user?.name} />
          <Row label="Login email" value={user?.email} />
        </dl>
        <p className="mt-2 text-[12px] text-text-subtle">Vehicle, licence and driver are what our team verified, so only the BedLink team can change them.</p>
      </Card>

      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <h3 className="text-[15px] font-semibold text-text">Contact</h3>
          <div>
            <label className="label" htmlFor="p-phone">
              Crew phone
            </label>
            <input id="p-phone" inputMode="tel" autoComplete="tel" className="input h-11" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} aria-describedby="p-phone-hint" />
            <p id="p-phone-hint" className="mt-1 text-[12px] text-text-subtle">
              Hospitals tap this to call you.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="p-org">
              Service / organisation <span className="normal-case tracking-normal text-text-subtle">(optional)</span>
            </label>
            <input id="p-org" className="input h-11" value={edit.organization} onChange={(e) => setEdit({ ...edit, organization: e.target.value })} />
          </div>
          {error && (
            <p className="text-small text-danger bg-danger-soft rounded-md px-3 py-2" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={!dirty} isLoading={save.isPending}>
            Save changes
          </Button>
        </form>
      </Card>

      <Card className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-small">
          <p className="font-semibold text-text truncate">{user?.name}</p>
          <p className="text-text-subtle truncate">{user?.email}</p>
        </div>
        <Button
          variant="danger"
          icon={LogOut}
          onClick={async () => {
            await logout();
            navigate(ROUTES.LOGIN, { replace: true });
          }}
        >
          Sign out
        </Button>
      </Card>
    </div>
  );
}
