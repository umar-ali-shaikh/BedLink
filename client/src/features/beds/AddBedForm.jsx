import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { bedsApi } from './api';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { BED_TYPE_LABELS, BED_TYPE_VALUES, EQUIPMENT_LABELS, EQUIPMENT_VALUES } from '../../constants/bed';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

const PREFIX = { ICU: 'ICU', CARDIAC: 'CCU', BURNS: 'BRN', GENERAL: 'GEN' };

/** Hospital staff add beds to their own inventory (label, type, equipment). */
export function AddBedForm({ hospitalId, existingLabels = [], defaultType = 'ICU', onDone }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const added = useRef(new Set());
  const suggest = (type) => {
    const used = new Set([...existingLabels, ...added.current]);
    for (let i = 1; i < 1000; i += 1) {
      const label = `${PREFIX[type]}-${String(i).padStart(2, '0')}`;
      if (!used.has(label)) return label;
    }
    return '';
  };
  const [draft, setDraft] = useState(() => ({ type: defaultType, label: suggest(defaultType), equipment: defaultType === 'ICU' ? ['OXYGEN'] : [] }));

  const add = useMutation({
    mutationFn: () => bedsApi.create(hospitalId, { label: draft.label.trim(), type: draft.type, equipment: draft.equipment, status: 'AVAILABLE' }),
    onSuccess: (bed) => {
      queryClient.invalidateQueries({ queryKey: qk.beds(hospitalId) });
      queryClient.invalidateQueries({ queryKey: qk.hospital(hospitalId) });
      showToast({ type: 'success', title: `Bed ${bed.label} added` });
      added.current.add(bed.label);
      setDraft((d) => ({ ...d, label: suggest(d.type) }));
      onDone?.(bed);
    },
    onError: (err) => showToast({ type: 'error', title: 'Bed not added', message: errorMessage(err) }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.label.trim()) add.mutate();
      }}
      className="bg-surface border border-border rounded-lg p-4 space-y-3"
    >
      <p className="text-[15px] font-semibold text-text">Add a bed</p>
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Bed type">
        {BED_TYPE_VALUES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={draft.type === t}
            onClick={() => setDraft((d) => ({ ...d, type: t, label: suggest(t) }))}
            className={cn('h-11 rounded-md border text-small font-semibold', draft.type === t ? 'bg-primary border-primary text-text-inverse' : 'bg-surface border-border text-text')}
          >
            {BED_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="bed-label" className="label">
          Bed label
        </label>
        <input id="bed-label" className="input h-11" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. ICU-07" />
      </div>
      <div>
        <span className="label">Equipment at this bed</span>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_VALUES.map((v) => {
            const on = draft.equipment.includes(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                onClick={() => setDraft((d) => ({ ...d, equipment: on ? d.equipment.filter((x) => x !== v) : [...d.equipment, v] }))}
                className={cn('chip', on && 'chip-active')}
              >
                {on && <Check className="w-3.5 h-3.5" aria-hidden />}
                {EQUIPMENT_LABELS[v]}
              </button>
            );
          })}
        </div>
      </div>
      <Button type="submit" size="lg" icon={Plus} className="w-full" isLoading={add.isPending} disabled={!draft.label.trim()}>
        Add bed
      </Button>
    </form>
  );
}
