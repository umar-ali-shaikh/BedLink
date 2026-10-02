import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { REJECT_REASONS } from '../../constants/emergency';
import { cn } from '../../utils/cn';

/** Reason sheet + confirm (DESIGN.md §5 "Reject opens a reason sheet"). */
export function RejectReasonModal({ isOpen, onClose, onConfirm, isLoading }) {
  const [reason, setReason] = useState(null);
  useEffect(() => {
    if (isOpen) setReason(null);
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject this request?"
      description="The next hospital is contacted automatically."
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose} disabled={isLoading}>
            Back
          </Button>
          <Button variant="dangerSolid" size="lg" onClick={() => onConfirm(reason)} disabled={!reason} isLoading={isLoading}>
            Confirm reject
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Reason" className="grid gap-2">
        {REJECT_REASONS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={reason === r.id}
            onClick={() => setReason(r.id)}
            className={cn(
              'h-12 px-4 rounded-md border text-left text-[16px] font-medium transition-colors',
              reason === r.id ? 'border-danger bg-danger-soft text-danger' : 'border-border text-text hover:border-border-strong'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
