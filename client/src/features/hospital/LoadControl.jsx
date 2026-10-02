import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import { useToast } from '../../components/Toast';

const loadTiers = [
  { value: 25, label: 'Low', desc: 'Normal capacity', color: 'hover:border-success/50', activeColor: 'bg-success text-text-inverse border-success' },
  { value: 50, label: 'Moderate', desc: 'Steady intake', color: 'hover:border-primary/50', activeColor: 'bg-primary text-text-inverse border-primary' },
  { value: 75, label: 'High', desc: 'Heavy load', color: 'hover:border-warning/50', activeColor: 'bg-warning text-text-inverse border-warning' },
  { value: 95, label: 'Critical', desc: 'Nearing divert', color: 'hover:border-danger/50', activeColor: 'bg-danger text-text-inverse border-danger' },
];

export function LoadControl({ hospitalId, currentLoad = 50, onUpdated, className }) {
  const [selectedLoad, setSelectedLoad] = useState(currentLoad);
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast } = useToast();

  const handleSelect = async (val) => {
    if (val === selectedLoad || isUpdating) return;
    const oldVal = selectedLoad;
    setSelectedLoad(val);
    setIsUpdating(true);

    try {
      await api.patch(`/hospitals/${hospitalId}`, { currentLoad: val });
      showToast({
        title: 'Hospital Load Updated',
        message: `Hospital operational load set to ${val}%.`,
        type: 'info',
      });
      if (onUpdated) onUpdated(val);
    } catch (err) {
      setSelectedLoad(oldVal);
      showToast({
        title: 'Failed to update load',
        message: err.message || 'Could not update hospital load.',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn('bg-surface border border-border rounded-xl p-5 shadow-card', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Hospital Operational Load</h3>
        </div>
        <span className="text-xs font-bold text-text tabular-nums px-2 py-0.5 rounded bg-surface-muted border border-border">
          {selectedLoad}% Load
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {loadTiers.map((tier) => {
          const isActive = Math.abs(selectedLoad - tier.value) < 15;
          return (
            <button
              key={tier.value}
              type="button"
              disabled={isUpdating}
              onClick={() => handleSelect(tier.value)}
              className={cn(
                'min-h-[48px] p-2.5 rounded-lg border text-left flex flex-col justify-center transition-all duration-150',
                isActive
                  ? `${tier.activeColor} shadow-sm`
                  : `bg-surface border-border text-text hover:bg-surface-muted ${tier.color} active:scale-98`
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold">{tier.label}</span>
                <span className="text-[11px] font-mono opacity-80">{tier.value}%</span>
              </div>
              <span className={cn('text-[10px] mt-0.5', isActive ? 'opacity-90' : 'text-text-subtle')}>
                {tier.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
