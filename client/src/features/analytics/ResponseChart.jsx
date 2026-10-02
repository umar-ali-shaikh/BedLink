import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '../../utils/cn';

const defaultData = [
  { name: 'Accepted', count: 118, color: '#15803D' },
  { name: 'Declined', count: 16, color: '#B91C1C' },
  { name: 'Timed Out', count: 8, color: '#B45309' },
  { name: 'Cancelled', count: 4, color: '#64748B' },
];

export function ResponseChart({ data = defaultData, className }) {
  return (
    <div className={cn('bg-surface border border-border rounded-xl p-5 shadow-card', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-text">Emergency Request Outcome Distribution</h3>
          <p className="text-xs text-text-muted mt-0.5">Real-time breakdown of hospital response resolutions</p>
        </div>
        <span className="text-xs font-semibold text-success bg-success-soft px-2.5 py-0.5 rounded-full border border-success/20">
          83.1% Resolution Rate
        </span>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} axisLine={{ stroke: '#CBD5E1' }} />
            <YAxis tick={{ fontSize: 12, fill: '#475569' }} axisLine={{ stroke: '#CBD5E1' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                fontSize: '12px',
              }}
              formatter={(val) => [`${val} requests`, 'Count']}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
