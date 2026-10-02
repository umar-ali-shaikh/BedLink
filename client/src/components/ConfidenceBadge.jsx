import React, { useState } from 'react';
import { ShieldCheck, Shield, ShieldAlert, Info } from 'lucide-react';
import { cn } from '../utils/cn';

const config = {
  HIGH: {
    label: 'HIGH CONFIDENCE',
    variant: 'text-success bg-success-soft border-success/20',
    icon: ShieldCheck,
  },
  MEDIUM: {
    label: 'MEDIUM CONFIDENCE',
    variant: 'text-primary bg-primary-soft border-primary/20',
    icon: Shield,
  },
  LOW: {
    label: 'LOW CONFIDENCE',
    variant: 'text-warning bg-warning-soft border-warning/20',
    icon: ShieldAlert,
  },
};

export function ConfidenceBadge({ level = 'MEDIUM', reasons = [], className }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const item = config[level] || config.MEDIUM;
  const Icon = item.icon;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider border cursor-help transition-opacity hover:opacity-90',
          item.variant,
          className
        )}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{item.label}</span>
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 p-3 bg-surface border border-border rounded-md shadow-raised text-xs text-text animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-1.5 font-semibold text-text mb-1">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span>Confidence Assessment</span>
          </div>

          {reasons && reasons.length > 0 ? (
            <ul className="space-y-1 mb-2 text-text-muted">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted mb-2">Based on bed update freshness, current hospital load, and resource availability.</p>
          )}

          <p className="text-[10px] text-text-subtle pt-1.5 border-t border-border italic">
            Operational confidence in this availability — not a medical assessment.
          </p>
        </div>
      )}
    </div>
  );
}
