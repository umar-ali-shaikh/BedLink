import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, Clock, LogOut, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useMyHospital } from '../../features/hospital/hooks';
import { hospitalsApi } from '../../features/hospitals/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { PHONE_PATTERN, normalisePhone } from '../../constants/ambulance';
import { SPECIALTY_LABELS, SPECIALTY_VALUES } from '../../constants/hospital';
import { ROUTES } from '../../constants/routes';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

const STATUS = {
  VERIFIED: { icon: BadgeCheck, text: 'Verified — visible to ambulances', cls: 'text-success bg-success-soft border-success/20' },
  PENDING: { icon: Clock, text: 'Verification pending', cls: 'text-warning bg-warning-soft border-warning/25' },
  REJECTED: { icon: XCircle, text: 'Not approved', cls: 'text-danger bg-danger-soft border-danger/20' },
};

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-border last:border-0 text-small">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text font-medium text-right break-words min-w-0">{value || '—'}</dd>
    </div>
  );
}

/** Hospital profile: verification status, registration details, editable departments/contact. */
export function HospitalProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const hospital = useMyHospital();
  const h = hospital.data;
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (h) setEdit({ specialties: h.specialties ?? [], phone: h.phone ?? '', contactName: h.contactName ?? '' });
  }, [h]);

  const save = useMutation({
    mutationFn: () => hospitalsApi.update(h.id, { specialties: edit.specialties, phone: normalisePhone(edit.phone), contactName: edit.contactName.trim() }),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.hospital(h.id), updated);
      showToast({ type: 'success', title: 'Hospital profile saved' });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (hospital.isLoading || !edit) return <Skeleton className="h-64" />;
  if (hospital.isError) return <ErrorState message={errorMessage(hospital.error)} onRetry={hospital.refetch} />;

  const status = STATUS[h.verificationStatus] ?? STATUS.VERIFIED;
  const StatusIcon = status.icon;
  const dirty =
    edit.phone !== (h.phone ?? '') || edit.contactName !== (h.contactName ?? '') || [...edit.specialties].sort().join() !== [...(h.specialties ?? [])].sort().join();

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (edit.phone && !PHONE_PATTERN.test(normalisePhone(edit.phone))) return setError('Enter a valid 10-digit phone number.');
    if (edit.contactName.trim().length < 2) return setError('Enter the contact name.');
    return save.mutate();
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-h2 text-text">{h.name}</h2>
        <p className="text-small text-text-muted mt-0.5">{h.address}</p>
        <p className={cn('mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold', status.cls)}>
          <StatusIcon className="w-4 h-4" aria-hidden /> {status.text}
        </p>
        <dl className="mt-3">
          <Row label="Registration no." value={h.registrationNumber} />
          <Row label="ABDM Facility ID" value={h.hfrId} />
          <Row label="Official email" value={h.email} />
          <Row label="Location" value={h.coordinates ? `${h.coordinates.lat.toFixed(5)}, ${h.coordinates.lng.toFixed(5)}` : null} />
        </dl>
        <p className="mt-2 text-[12px] text-text-subtle">Name, address, location and registration details can only be changed by the BedLink team, so they stay verified.</p>
      </Card>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <h3 className="text-[15px] font-semibold text-text">Departments & contact</h3>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_VALUES.map((v) => {
              const on = edit.specialties.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setEdit((d) => ({ ...d, specialties: on ? d.specialties.filter((s) => s !== v) : [...d.specialties, v] }))}
                  className={cn('chip', on && 'chip-active')}
                >
                  {on && <Check className="w-3.5 h-3.5" aria-hidden />}
                  {SPECIALTY_LABELS[v]}
                </button>
              );
            })}
          </div>
          <div>
            <label className="label" htmlFor="p-contact">
              Contact person
            </label>
            <input id="p-contact" className="input h-11" value={edit.contactName} onChange={(e) => setEdit({ ...edit, contactName: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="p-phone">
              Official phone
            </label>
            <input id="p-phone" inputMode="tel" className="input h-11" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
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
