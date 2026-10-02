import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { StatusIndicator } from '../../components/StatusIndicator';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { HospitalsTable } from '../../features/hospitals/HospitalsTable';
import { useOpsRealtime } from '../../features/dispatcher/useOpsRealtime';
import { hospitalsApi } from '../../features/hospitals/api';
import { bedsApi } from '../../features/beds/api';
import { BED_TYPE_LABELS, BED_TYPE_VALUES, EQUIPMENT_LABELS, EQUIPMENT_VALUES, STAFF_BED_STATUSES } from '../../constants/bed';
import { DEFAULT_PATIENT_LOCATION, SPECIALTY_LABELS, SPECIALTY_VALUES } from '../../constants/hospital';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { equipmentText } from '../../utils/labels';
import { cn } from '../../utils/cn';

const EMPTY = { name: '', address: '', lat: DEFAULT_PATIENT_LOCATION.lat, lng: DEFAULT_PATIENT_LOCATION.lng, specialties: [], currentLoad: 50, status: 'ACTIVE' };

function Chips({ values, labels, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => {
        const on = selected.includes(v);
        return (
          <button key={v} type="button" aria-pressed={on} onClick={() => onToggle(v)} className={cn('chip', on && 'chip-active')}>
            {on && <Check className="w-3.5 h-3.5" aria-hidden />}
            {labels[v]}
          </button>
        );
      })}
    </div>
  );
}

function HospitalForm({ hospital, onDone }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setForm(
      hospital
        ? { name: hospital.name, address: hospital.address ?? '', lat: hospital.coordinates?.lat, lng: hospital.coordinates?.lng, specialties: hospital.specialties ?? [], currentLoad: hospital.currentLoad, status: hospital.status }
        : EMPTY
    );
  }, [hospital]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        address: form.address.trim(),
        coordinates: { lat: Number(form.lat), lng: Number(form.lng) },
        specialties: form.specialties,
        currentLoad: Number(form.currentLoad),
        status: form.status,
      };
      return hospital ? hospitalsApi.update(hospital.id, body) : hospitalsApi.create(body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: qk.hospitals });
      showToast({ type: 'success', title: hospital ? 'Hospital updated' : 'Hospital created' });
      onDone(saved);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const submit = (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Name must be at least 2 characters.');
    if (!Number.isFinite(Number(form.lat)) || !Number.isFinite(Number(form.lng)) || form.lat === '' || form.lng === '') return setError('Enter valid coordinates.');
    return save.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="h-name">
          Name
        </label>
        <input id="h-name" className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Fictional hospital name" />
      </div>
      <div>
        <label className="label" htmlFor="h-address">
          Address
        </label>
        <input id="h-address" className="input" value={form.address} onChange={(e) => set({ address: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="h-lat">
            Latitude
          </label>
          <input id="h-lat" inputMode="decimal" className="input tabular-nums" value={form.lat} onChange={(e) => set({ lat: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="h-lng">
            Longitude
          </label>
          <input id="h-lng" inputMode="decimal" className="input tabular-nums" value={form.lng} onChange={(e) => set({ lng: e.target.value })} />
        </div>
      </div>
      <div>
        <span className="label">Specialties</span>
        <Chips
          values={SPECIALTY_VALUES}
          labels={SPECIALTY_LABELS}
          selected={form.specialties}
          onToggle={(v) => set({ specialties: form.specialties.includes(v) ? form.specialties.filter((s) => s !== v) : [...form.specialties, v] })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="h-load">
            Load: <span className="tabular-nums">{form.currentLoad}%</span>
          </label>
          <input id="h-load" type="range" min="0" max="100" step="5" value={form.currentLoad} onChange={(e) => set({ currentLoad: e.target.value })} className="w-full accent-primary h-10" />
        </div>
        <div>
          <label className="label" htmlFor="h-status">
            Status
          </label>
          <select id="h-status" className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>
      {error && (
        <p className="text-small text-danger bg-danger-soft rounded-md px-3 py-2" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" isLoading={save.isPending} className="w-full">
        {hospital ? 'Save changes' : 'Create hospital'}
      </Button>
    </form>
  );
}

function BedInventory({ hospitalId }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const beds = useQuery({ queryKey: qk.beds(hospitalId), queryFn: () => bedsApi.list(hospitalId) });
  const [draft, setDraft] = useState({ label: '', type: 'ICU', equipment: [], status: 'AVAILABLE' });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.beds(hospitalId) });
    queryClient.invalidateQueries({ queryKey: qk.hospitals });
  };
  const add = useMutation({
    mutationFn: () => bedsApi.create(hospitalId, { ...draft, label: draft.label.trim() }),
    onSuccess: () => {
      refresh();
      showToast({ type: 'success', title: `Bed ${draft.label} added` });
      setDraft((d) => ({ ...d, label: '' }));
    },
    onError: (err) => showToast({ type: 'error', title: 'Bed not added', message: errorMessage(err) }),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }) => bedsApi.updateStatus(id, status),
    onSuccess: refresh,
    onError: (err) => showToast({ type: 'error', title: 'Status not saved', message: errorMessage(err) }),
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.label.trim()) add.mutate();
        }}
        className="rounded-md border border-border p-3 space-y-3 bg-surface-muted"
      >
        <p className="text-small font-semibold text-text">Add bed</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Label e.g. ICU-07" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} aria-label="Bed label" />
          <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} aria-label="Bed type">
            {BED_TYPE_VALUES.map((t) => (
              <option key={t} value={t}>
                {BED_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <Chips
          values={EQUIPMENT_VALUES}
          labels={EQUIPMENT_LABELS}
          selected={draft.equipment}
          onToggle={(v) => setDraft({ ...draft, equipment: draft.equipment.includes(v) ? draft.equipment.filter((x) => x !== v) : [...draft.equipment, v] })}
        />
        <Button type="submit" size="sm" icon={Plus} isLoading={add.isPending} disabled={!draft.label.trim()}>
          Add bed
        </Button>
      </form>

      {beds.isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <ul className="divide-y divide-border border border-border rounded-md">
          {(beds.data ?? []).map((b) => (
            <li key={b.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-small font-semibold text-text">
                  {b.label} <span className="font-normal text-text-subtle">· {BED_TYPE_LABELS[b.type]}</span>
                </p>
                <p className="text-[12px] text-text-subtle truncate">{equipmentText(b.equipment)}</p>
              </div>
              {b.status === 'RESERVED' ? (
                <StatusIndicator kind="bed" status="RESERVED" look="caps" />
              ) : (
                <select
                  className="input h-9 w-36"
                  value={b.status}
                  onChange={(e) => setStatus.mutate({ id: b.id, status: e.target.value })}
                  aria-label={`Status of ${b.label}`}
                >
                  {STAFF_BED_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
          {beds.data?.length === 0 && <li className="px-3 py-4 text-small text-text-subtle">No beds yet.</li>}
        </ul>
      )}
    </div>
  );
}

export function AdminHospitalsPage() {
  useOpsRealtime();
  const [params, setParams] = useSearchParams();
  const hospitals = useQuery({ queryKey: qk.hospitals, queryFn: () => hospitalsApi.list() });
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState('details');
  const editId = params.get('id');
  const editing = hospitals.data?.find((h) => h.id === editId) ?? null;
  const open = creating || !!editing;

  const close = () => {
    setCreating(false);
    setTab('details');
    if (editId) setParams({}, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Hospitals"
        subtitle="Inventory, load and availability"
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)}>
            Add hospital
          </Button>
        }
      />
      <HospitalsTable query={hospitals} title="All hospitals" onRowClick={(h) => setParams({ id: h.id })} />

      <Modal isOpen={open} onClose={close} variant="drawer" title={editing ? editing.name : 'New hospital'} description={editing ? 'Edit details or manage beds' : 'Simulated data only — use a fictional name.'}>
        {editing && (
          <div className="flex gap-1 mb-4 border-b border-border -mt-1" role="tablist">
            {['details', 'beds'].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn('h-10 px-3 text-small font-semibold capitalize border-b-2 -mb-px', tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text')}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {editing && tab === 'beds' ? (
          <BedInventory hospitalId={editing.id} />
        ) : (
          <HospitalForm
            hospital={editing}
            onDone={(saved) => {
              if (!editing && saved?.id) {
                setCreating(false);
                setParams({ id: saved.id });
                setTab('beds');
              }
            }}
          />
        )}
      </Modal>
    </>
  );
}
