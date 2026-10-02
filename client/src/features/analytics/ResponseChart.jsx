import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { BarChart3 } from 'lucide-react';

const HOURS = 12;

/** Offer outcomes per hour over the last 12 h, stacked: accepted vs rejected/timed out. */
function bucket(requests, now = new Date()) {
  const end = new Date(now);
  end.setMinutes(0, 0, 0);
  const buckets = Array.from({ length: HOURS }, (_, i) => {
    const start = new Date(end.getTime() - (HOURS - 1 - i) * 3600_000);
    return { start, label: `${String(start.getHours()).padStart(2, '0')}:00`, accepted: 0, declined: 0 };
  });
  for (const r of requests) {
    if (!['ACCEPTED', 'REJECTED', 'TIMEOUT'].includes(r.status) || !r.respondedAt) continue;
    const t = new Date(r.respondedAt).getTime();
    const idx = Math.floor((t - buckets[0].start.getTime()) / 3600_000);
    if (idx < 0 || idx >= HOURS) continue;
    if (r.status === 'ACCEPTED') buckets[idx].accepted += 1;
    else buckets[idx].declined += 1;
  }
  return buckets;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-md shadow-raised px-3 py-2 text-small">
      <p className="font-semibold text-text mb-1">{label}</p>
      <p className="text-success">Accepted: {payload.find((p) => p.dataKey === 'accepted')?.value ?? 0}</p>
      <p className="text-text-muted">Rejected / timed out: {payload.find((p) => p.dataKey === 'declined')?.value ?? 0}</p>
    </div>
  );
}

export function ResponseChart({ requests, isLoading }) {
  const data = useMemo(() => bucket(requests ?? []), [requests]);
  const total = data.reduce((s, b) => s + b.accepted + b.declined, 0);

  return (
    <Card className="h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-[15px] font-semibold text-text">Offer outcomes by hour</h2>
        <div className="flex items-center gap-4 text-[12px] text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-success" /> Accepted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-border-strong" /> Rejected / Timed out
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-[220px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : total === 0 ? (
          <EmptyState icon={BarChart3} className="h-full border-0" title="No responses in the last 12 hours" description="Accepted, rejected and timed-out offers appear here as they happen." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="35%">
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-muted)' }} />
              <Bar dataKey="accepted" stackId="o" fill="var(--color-success)" />
              <Bar dataKey="declined" stackId="o" fill="var(--color-border-strong)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
