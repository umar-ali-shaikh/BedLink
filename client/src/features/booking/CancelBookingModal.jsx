import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { CANCEL_REASONS, MAX_CANCEL_NOTE_LENGTH } from '../../constants/booking';
import { cn } from '../../utils/cn';

/** Crew cancels an assigned booking before pickup: a reason is required (note too for "Other"). */
export function CancelBookingModal({ isOpen, onClose, onConfirm, isLoading, error }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const needsNote = reason === 'OTHER';
  const ready = reason && (!needsNote || note.trim().length >= 3);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel this booking?"
      description="The caller is told why. A held hospital bed is released and any pending hospital request is withdrawn."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Keep it
          </Button>
          <Button variant="dangerSolid" onClick={() => onConfirm({ reason, note: note.trim() })} isLoading={isLoading} disabled={!ready}>
            Cancel booking
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="label">Reason (required)</legend>
        <div role="radiogroup" aria-label="Cancellation reason" className="grid gap-2">
          {CANCEL_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={reason === r.value}
              data-testid={`cancel-reason-${r.value}`}
              onClick={() => setReason(r.value)}
              className={cn(
                'min-h-[44px] rounded-md border px-3 py-2 text-left transition-colors',
                reason === r.value ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text hover:border-border-strong'
              )}
            >
              <span className="block text-small font-semibold">{r.label}</span>
              {r.hint && <span className="block text-[11px] text-text-subtle">{r.hint}</span>}
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor="cancel-note" className="label mt-4">
        Note {needsNote ? '(required)' : '(optional)'}
      </label>
      <textarea
        id="cancel-note"
        rows={2}
        maxLength={MAX_CANCEL_NOTE_LENGTH}
        className="input h-auto py-2"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Phone switched off after 3 tries"
      />
      {error && (
        <p className="mt-2 text-small text-danger" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
