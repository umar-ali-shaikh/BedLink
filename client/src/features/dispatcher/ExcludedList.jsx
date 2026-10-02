import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export function ExcludedList({ excluded = [], className }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!excluded || excluded.length === 0) return null;

  return (
    <div className={cn('bg-surface border border-border rounded-xl overflow-hidden shadow-sm', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-surface hover:bg-surface-muted transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-text-subtle" />
          <span className="text-xs font-semibold text-text">
            {excluded.length} hospital{excluded.length === 1 ? '' : 's'} excluded from recommendations
          </span>
          <span className="text-[11px] text-text-subtle">(Why not these?)</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-text-subtle" /> : <ChevronRight className="w-4 h-4 text-text-subtle" />}
      </button>

      {isOpen && (
        <div className="divide-y divide-border border-t border-border bg-surface-muted/30 animate-in fade-in duration-100">
          {excluded.map((item, idx) => (
            <div key={item.hospital?._id || idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-text-muted">
                  {item.hospital?.name || item.name}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {item.reasons?.map((reason, rIdx) => (
                    <span
                      key={rIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-danger-soft text-danger border border-danger/20"
                    >
                      <X className="w-3 h-3 flex-shrink-0" />
                      <span>{reason}</span>
                    </span>
                  ))}
                </div>
              </div>

              {item.distanceKm != null && (
                <span className="text-xs text-text-subtle tabular-nums">
                  {item.distanceKm.toFixed(1)} km away
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
