import React, { useState } from 'react';
import { BedTile } from '../../features/beds/BedTile';
import { ConfirmAllButton } from '../../features/beds/ConfirmAllButton';
import { BED_TYPES, BED_STATUS } from '../../constants/bed';
import { useToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

const initialBeds = [
  { _id: 'b-1', bedNumber: 'ICU-01', type: 'ICU', status: 'AVAILABLE', equipment: ['VENTILATOR', 'CARDIAC_MONITOR'], updatedAt: new Date(Date.now() - 40000).toISOString() },
  { _id: 'b-2', bedNumber: 'ICU-02', type: 'ICU', status: 'AVAILABLE', equipment: ['VENTILATOR'], updatedAt: new Date(Date.now() - 70000).toISOString() },
  { _id: 'b-3', bedNumber: 'ICU-03', type: 'ICU', status: 'OCCUPIED', equipment: ['VENTILATOR', 'OXYGEN'], updatedAt: new Date(Date.now() - 120000).toISOString() },
  { _id: 'b-4', bedNumber: 'ICU-04', type: 'ICU', status: 'RESERVED', equipment: ['VENTILATOR', 'CARDIAC_MONITOR'], reservationHoldUntil: new Date(Date.now() + 25 * 60 * 1000).toISOString(), updatedAt: new Date().toISOString() },
  { _id: 'b-5', bedNumber: 'CARD-01', type: 'CARDIAC', status: 'AVAILABLE', equipment: ['CARDIAC_MONITOR', 'OXYGEN'], updatedAt: new Date(Date.now() - 90000).toISOString() },
  { _id: 'b-6', bedNumber: 'CARD-02', type: 'CARDIAC', status: 'CLEANING', equipment: ['CARDIAC_MONITOR'], updatedAt: new Date(Date.now() - 300000).toISOString() },
  { _id: 'b-7', bedNumber: 'GEN-01', type: 'GENERAL', status: 'AVAILABLE', equipment: ['OXYGEN'], updatedAt: new Date(Date.now() - 25000).toISOString() },
  { _id: 'b-8', bedNumber: 'GEN-02', type: 'GENERAL', status: 'OCCUPIED', equipment: [], updatedAt: new Date(Date.now() - 400000).toISOString() },
];

export function HospitalBedsPage() {
  const [beds, setBeds] = useState(initialBeds);
  const [filterType, setFilterType] = useState('ALL');
  const { showToast } = useToast();

  const handleStatusChange = (bedId, newStatus) => {
    const prevBeds = [...beds];
    const targetBed = beds.find((b) => b._id === bedId);

    // Optimistic update per RULES.md §10
    setBeds((prev) =>
      prev.map((b) => (b._id === bedId ? { ...b, status: newStatus, updatedAt: new Date().toISOString() } : b))
    );

    showToast({
      title: `${targetBed?.bedNumber} Status Updated`,
      message: `Set to ${newStatus}. Synced with regional dispatch.`,
      type: 'success',
    });
  };

  const filteredBeds = filterType === 'ALL' ? beds : beds.filter((b) => b.type === filterType);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Bed Management & Status</h1>
          <p className="text-xs text-text-muted">Tap any status to update regional availability instantly</p>
        </div>

        <ConfirmAllButton
          hospitalId="hosp-1"
          onConfirmed={() => {
            setBeds((prev) => prev.map((b) => ({ ...b, updatedAt: new Date().toISOString() })));
          }}
        />
      </div>

      {/* Filter Chips by Department per DESIGN.md §8.3 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['ALL', ...Object.values(BED_TYPES)].map((type) => {
          const isSelected = filterType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border',
                isSelected
                  ? 'bg-text text-text-inverse border-text'
                  : 'bg-surface border-border text-text-muted hover:bg-surface-muted hover:text-text'
              )}
            >
              {type === 'ALL' ? 'All Beds' : `${type} Beds`}
            </button>
          );
        })}
      </div>

      {/* Stacked Bed Tiles per DESIGN.md §8.3 */}
      <div className="space-y-3">
        {filteredBeds.map((bed) => (
          <BedTile
            key={bed._id}
            bed={bed}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  );
}
