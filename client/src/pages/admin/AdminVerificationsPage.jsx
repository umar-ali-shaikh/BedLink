import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ambulance, BadgeCheck, Building2, Check, ExternalLink, Mail, MapPin, Phone, ShieldCheck, X } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { KpiStrip } from '../../components/KpiStrip';
import { Segmented } from '../../components/Segmented';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { useNow } from '../../hooks/useNow';
import { verificationApi } from '../../features/verification/api';
import { verificationKeys } from '../../layouts/AdminLayout';
import { SPECIALTY_LABELS } from '../../constants/hospital';
import { errorMessage } from '../../services/api';
import { formatRelativeTime } from '../../utils/formatRelative';
import { cn } from '../../utils/cn';

const STATUS_STYLE = {
  PENDING: 'text-warning bg-warning-soft border-warning/25',
  VERIFIED: 'text-success bg-success-soft border-success/20',
  REJECTED: 'text-danger bg-danger-soft border-danger/20',
};

const AMBULANCE_TYPE = { ALS: 'Advanced Life Support', BLS: 'Basic Life Support', PTA: 'Patient transport' };

/** What the admin should check before approving (kept per card, not saved). */
const CHECKS = {
  hospital: [
    'Registration number found in the state Clinical Establishment / municipal register',
    'ABDM Facility ID (if given) matches name and address',
    'Called the official phone — they confirmed this registration',
    'Map pin is on the hospital',
  ],
  ambulance: [
    'Vehicle number found on Parivahan / VAHAN and registered as an ambulance',
    'Called the crew phone — they confirmed',
    'Organisation (if given) checked',
  ],
};

function StatusPill({ status }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', STATUS_STYLE[status])}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden /> {status}
    </span>
  );
}

function Detail({ icon: Icon, children }) {
  return (
    <p className="flex items-start gap-2 text-small text-text min-w-0">
      <Icon className="w-4 h-4 text-text-subtle shrink-0 mt-0.5" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

const A = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
    {children} <ExternalLink className="w-3 h-3" aria-hidden />
  </a>
);

function Checklist({ items }) {
  const [done, setDone] = useState([]);
  return (
    <fieldset className="mt-4 rounded-md bg-surface-muted border border-border p-3">
      <legend className="sr-only">Verification checklist</legend>
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
        Checklist · {done.length}/{items.length}
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const on = done.includes(item);
          return (
            <li key={item}>
              <label className="flex items-start gap-2 text-small text-text cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-primary shrink-0"
                  checked={on}
                  onChange={() => setDone((d) => (on ? d.filter((x) => x !== item) : [...d, item]))}
                />
                {item}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function Actions({ item, onDecide }) {
  if (item.verificationStatus === 'PENDING') {
    return (
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="danger" icon={X} onClick={() => onDecide(item, 'REJECT')}>
          Reject
        </Button>
        <Button variant="success" icon={Check} onClick={() => onDecide(item, 'VERIFY')}>
          Approve
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
      <p className="text-small text-text-muted min-w-0">
        {item.verificationNote ? `“${item.verificationNote}”` : 'No note'}
        {item.verifiedAt && <span className="text-text-subtle"> · {new Date(item.verifiedAt).toLocaleString()}</span>}
      </p>
      <Button size="sm" variant="secondary" onClick={() => onDecide(item, item.verificationStatus === 'VERIFIED' ? 'REJECT' : 'VERIFY')}>
        {item.verificationStatus === 'VERIFIED' ? 'Revoke' : 'Approve instead'}
      </Button>
    </div>
  );
}

function HospitalCard({ h, now, onDecide }) {
  const { lat, lng } = h.coordinates ?? {};
  return (
    <article className="bg-surface border border-border rounded-lg shadow-card p-5 animate-fade-in">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 text-text break-words">{h.name}</h3>
          <p className="text-[12px] text-text-subtle">Registered {formatRelativeTime(h.createdAt, now)}</p>
        </div>
        <StatusPill status={h.verificationStatus} />
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-border p-3">
        <div className="min-w-0">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">Registration no.</dt>
          <dd className="text-small font-semibold text-text tabular-nums break-all">{h.registrationNumber ?? '—'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">ABDM Facility ID</dt>
          <dd className="text-small font-semibold text-text tabular-nums">
            {h.hfrId ? <A href="https://facility.abdm.gov.in/">{h.hfrId}</A> : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-3 space-y-1.5">
        <Detail icon={MapPin}>
          {h.address}{' '}
          {lat != null && <A href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}>Open map</A>}
        </Detail>
        <Detail icon={Phone}>
          {h.phone ? (
            <a href={`tel:${h.phone}`} className="font-medium text-primary hover:underline">
              {h.phone}
            </a>
          ) : (
            '—'
          )}{' '}
          · official
        </Detail>
        <Detail icon={Mail}>
          {h.email || '—'} · contact {h.contactName || '—'}
          {h.staff?.length ? ` (login ${h.staff.map((s) => s.email).join(', ')})` : ''}
        </Detail>
        {h.specialties?.length > 0 && (
          <Detail icon={Building2}>{h.specialties.map((s) => SPECIALTY_LABELS[s] ?? s).join(' · ')}</Detail>
        )}
      </div>

      {h.verificationStatus === 'PENDING' && <Checklist items={CHECKS.hospital} />}
      <Actions item={h} onDecide={onDecide} />
    </article>
  );
}

function AmbulanceCard({ u, now, onDecide }) {
  const a = u.ambulance ?? {};
  return (
    <article className="bg-surface border border-border rounded-lg shadow-card p-5 animate-fade-in">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 text-text tabular-nums">{a.vehicleNumber ?? '—'}</h3>
          <p className="text-small text-text-muted">
            {a.ambulanceType} · {AMBULANCE_TYPE[a.ambulanceType] ?? ''}
          </p>
          <p className="text-[12px] text-text-subtle">Registered {formatRelativeTime(u.createdAt, now)}</p>
        </div>
        <StatusPill status={u.verificationStatus} />
      </header>
      <div className="mt-3 space-y-1.5">
        <Detail icon={Ambulance}>
          {u.name}
          {a.organization ? ` · ${a.organization}` : ''}
        </Detail>
        <Detail icon={Phone}>
          {u.phone ? (
            <a href={`tel:${u.phone}`} className="font-medium text-primary hover:underline">
              {u.phone}
            </a>
          ) : (
            '—'
          )}
        </Detail>
        <Detail icon={Mail}>{u.email}</Detail>
        <Detail icon={ShieldCheck}>
          <A href="https://vahan.parivahan.gov.in/nrservices/faces/user/citizen/citizenlogin.xhtml">Check vehicle on Parivahan</A>
        </Detail>
      </div>
      {u.verificationStatus === 'PENDING' && <Checklist items={CHECKS.ambulance} />}
      <Actions item={u} onDecide={onDecide} />
    </article>
  );
}

function DecisionModal({ target, onClose, onConfirm, isLoading, error }) {
  const [note, setNote] = useState('');
  if (!target) return null;
  const reject = target.decision === 'REJECT';
  const label = target.kind === 'hospital' ? target.item.name : target.item.ambulance?.vehicleNumber;
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${reject ? 'Reject' : 'Approve'} ${label}?`}
      description={
        reject
          ? 'The applicant sees your reason. They stay blocked from the network.'
          : target.kind === 'hospital'
            ? 'The hospital becomes visible to ambulances and can receive requests.'
            : 'The ambulance can request beds immediately.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={reject ? 'dangerSolid' : 'success'} onClick={() => onConfirm(note.trim())} isLoading={isLoading} disabled={reject && !note.trim()}>
            {reject ? 'Reject' : 'Approve'}
          </Button>
        </>
      }
    >
      <label htmlFor="decision-note" className="label">
        {reject ? 'Reason (required)' : 'Note (optional)'}
      </label>
      <textarea
        id="decision-note"
        rows={3}
        className="input h-auto py-2"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={reject ? 'e.g. Registration number not found in the state register' : 'e.g. Checked state register, called reception'}
        autoFocus
      />
      {error && (
        <p className="mt-2 text-small text-danger" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

export function AdminVerificationsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const now = useNow(30_000);
  const [kind, setKind] = useState('hospital');
  const [status, setStatus] = useState('PENDING');
  const [target, setTarget] = useState(null);
  const [error, setError] = useState('');

  const summary = useQuery({ queryKey: verificationKeys.summary, queryFn: verificationApi.summary });
  const list = useQuery({
    queryKey: [...verificationKeys.all, kind, status],
    queryFn: () => (kind === 'hospital' ? verificationApi.hospitals(status) : verificationApi.ambulances(status)),
  });

  const decide = useMutation({
    mutationFn: ({ note }) =>
      target.kind === 'hospital'
        ? verificationApi.decideHospital(target.item.id, target.decision, note)
        : verificationApi.decideAmbulance(target.item.id, target.decision, note),
    onSuccess: () => {
      const verb = target.decision === 'VERIFY' ? 'approved' : 'rejected';
      showToast({ type: target.decision === 'VERIFY' ? 'success' : 'info', title: `${target.kind === 'hospital' ? 'Hospital' : 'Ambulance'} ${verb}` });
      setTarget(null);
      queryClient.invalidateQueries({ queryKey: verificationKeys.all });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const s = summary.data;
  const kpis = [
    { label: 'Hospitals pending', value: s?.hospitals?.PENDING, tone: 'warning' },
    { label: 'Ambulances pending', value: s?.ambulances?.PENDING, tone: 'warning' },
    { label: 'Hospitals verified', value: s?.hospitals?.VERIFIED, tone: 'success' },
    { label: 'Ambulances verified', value: s?.ambulances?.VERIFIED, tone: 'success' },
  ];
  const items = list.data ?? [];

  return (
    <>
      <PageHeader title="Verifications" subtitle="Approve real hospitals and ambulances before they join the network" />
      <div className="space-y-5">
        <KpiStrip items={kpis} isLoading={summary.isLoading} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Segmented
            size="lg"
            label="Type"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'hospital', label: 'Hospitals', count: s?.hospitals?.PENDING },
              { value: 'ambulance', label: 'Ambulances', count: s?.ambulances?.PENDING },
            ]}
          />
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'VERIFIED', label: 'Verified' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'ALL', label: 'All' },
            ]}
          />
        </div>

        {list.isLoading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={list.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title={status === 'PENDING' ? 'All caught up' : `No ${status.toLowerCase()} ${kind}s`}
            description={status === 'PENDING' ? `New ${kind} registrations appear here instantly.` : 'Try another filter.'}
            className="py-14"
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) =>
              kind === 'hospital' ? (
                <HospitalCard key={item.id} h={item} now={now} onDecide={(it, decision) => { setError(''); setTarget({ kind, item: it, decision }); }} />
              ) : (
                <AmbulanceCard key={item.id} u={item} now={now} onDecide={(it, decision) => { setError(''); setTarget({ kind, item: it, decision }); }} />
              )
            )}
          </div>
        )}
      </div>

      <DecisionModal
        key={target ? `${target.item.id}-${target.decision}` : 'none'}
        target={target}
        onClose={() => setTarget(null)}
        onConfirm={(note) => decide.mutate({ note })}
        isLoading={decide.isPending}
        error={error}
      />
    </>
  );
}
