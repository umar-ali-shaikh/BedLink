import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hospitalsApi } from '../hospitals/api';
import { useToast } from '../../components/Toast';
import { LOAD_PRESETS } from '../../constants/hospital';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

const nearest = (load) => LOAD_PRESETS.reduce((best, p) => (Math.abs(p.value - load) < Math.abs(best.value - load) ? p : best), LOAD_PRESETS[0]).value;

/** Segmented Low 25 · Moderate 50 · High 75 · Critical 95 → currentLoad (DESIGN.md §8.3). */
export function LoadControl({ hospital }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: (currentLoad) => hospitalsApi.update(hospital.id, { currentLoad }),
    onMutate: async (currentLoad) => {
      const key = qk.hospital(hospital.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (h) => (h ? { ...h, currentLoad } : h));
      return { previous };
    },
    onError: (err, _v, ctx) => {
      queryClient.setQueryData(qk.hospital(hospital.id), ctx?.previous);
      showToast({ type: 'error', title: 'Load not updated', message: errorMessage(err) });
    },
    onSuccess: (_d, value) => showToast({ type: 'success', title: `Load set to ${value}%`, message: value >= 95 ? 'Critical load — you will not receive new requests.' : undefined }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.hospital(hospital.id) }),
  });
  const current = nearest(hospital.currentLoad ?? 50);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-[15px] font-semibold text-text">Current load</h2>
        <span className="text-small text-text-muted tabular-nums">{hospital.currentLoad}%</span>
      </div>
      <div role="radiogroup" aria-label="Current load" className="grid grid-cols-4 gap-1.5">
        {LOAD_PRESETS.map((p) => {
          const active = p.value === current;
          return (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={mutation.isPending}
              onClick={() => !active && mutation.mutate(p.value)}
              className={cn(
                'h-14 rounded-md border flex flex-col items-center justify-center transition-colors disabled:opacity-60',
                active ? (p.value >= 95 ? 'bg-danger border-danger text-text-inverse' : 'bg-text border-text text-text-inverse') : 'bg-surface border-border text-text hover:border-border-strong'
              )}
            >
              <span className="text-small font-semibold">{p.label}</span>
              <span className={cn('text-[12px] tabular-nums', active ? 'opacity-80' : 'text-text-subtle')}>{p.value}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
