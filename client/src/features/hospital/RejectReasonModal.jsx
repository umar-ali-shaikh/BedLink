import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { REJECT_REASONS } from '../../constants/emergency';

export function RejectReasonModal({ isOpen, onClose, onConfirm, isRejecting = false }) {
  const [selectedReason, setSelectedReason] = useState(REJECT_REASONS[0].id);
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirm({ reason: selectedReason, note });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Decline Bed Request"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-danger-soft/60 border border-danger/20 rounded-lg flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="text-xs text-text-muted leading-relaxed">
            Declining this request will immediately trigger automatic fallback to the next ranked hospital in the dispatch queue.
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text mb-2">
            Select Operational Reason
          </label>
          <div className="space-y-2">
            {REJECT_REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedReason === r.id
                    ? 'border-danger bg-danger-soft/30 text-text font-medium'
                    : 'border-border bg-surface hover:bg-surface-muted text-text-muted'
                }`}
              >
                <input
                  type="radio"
                  name="rejectReason"
                  value={r.id}
                  checked={selectedReason === r.id}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-4 h-4 text-danger focus:ring-danger border-border"
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text mb-1.5">
            Operational Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Surge in trauma admissions"
            className="w-full h-10 px-3 border border-border rounded-md text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-focus"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={isRejecting}>
            Cancel
          </Button>
          <Button
            variant="dangerSolid"
            onClick={handleConfirm}
            isLoading={isRejecting}
          >
            Confirm Rejection
          </Button>
        </div>
      </div>
    </Modal>
  );
}
