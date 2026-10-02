import React, { useState } from 'react';
import { CheckCircle2, XCircle, Navigation, Siren, BedDouble, Wind, Stethoscope } from 'lucide-react';
import { CountdownTimer } from '../../components/CountdownTimer';
import { Button } from '../../components/Button';
import { RejectReasonModal } from './RejectReasonModal';
import { formatDistance, formatEta } from '../../utils/formatEta';
import { cn } from '../../utils/cn';

export function IncomingRequestCard({ request, onAccept, onReject, isResponding = false, className }) {
  const [showRejectModal, setShowRejectModal] = useState(false);

  if (!request) return null;

  const { emergency, expiresAt, _id } = request;
  const requirements = emergency?.requirements || {};

  return (
    <div
      className={cn(
        'bg-surface border-2 border-danger rounded-2xl shadow-raised p-6 md:p-8 animate-in slide-in-from-top-4 duration-200 overflow-hidden relative',
        className
      )}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-danger-soft text-danger">
            <Siren className="w-5 h-5 animate-pulse" />
          </span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-danger">
              INCOMING EMERGENCY BED REQUEST
            </h2>
            <p className="text-xs text-text-muted">
              Patient Ref: <span className="font-mono font-bold text-text">{emergency?.demoPatientId || 'DEMO-P-0000'}</span>
            </p>
          </div>
        </div>

        <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-danger text-text-inverse animate-pulse">
          ACTION REQUIRED
        </span>
      </div>

      {/* Hero Countdown Timer */}
      <div className="my-6 text-center">
        <p className="text-xs uppercase tracking-wider font-semibold text-text-subtle mb-1">
          Time Remaining to Accept
        </p>
        <CountdownTimer expiresAt={expiresAt} size="display" />
      </div>

      {/* Clinical Requirements summary */}
      <div className="p-4 rounded-xl bg-surface-muted border border-border mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-text-subtle mb-2.5">
          Patient Requirements
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {requirements.bedType && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface border border-border text-xs font-bold text-text">
              <BedDouble className="w-4 h-4 text-primary" />
              <span>{requirements.bedType} Bed</span>
            </span>
          )}

          {requirements.equipment?.map((eq) => (
            <span
              key={eq}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface border border-border text-xs font-bold text-text"
            >
              <Wind className="w-4 h-4 text-success" />
              <span>{eq}</span>
            </span>
          ))}

          {requirements.specialties?.map((spec) => (
            <span
              key={spec}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface border border-border text-xs font-bold text-text"
            >
              <Stethoscope className="w-4 h-4 text-primary" />
              <span>{spec}</span>
            </span>
          ))}
        </div>

        {/* ETA & Distance */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/80 text-xs font-medium text-text-muted">
          <Navigation className="w-4 h-4 text-primary" />
          <span>
            Ambulance approx. <strong className="text-text">{formatEta(request.estimatedEtaMinutes)}</strong> away ({formatDistance(request.distanceKm)})
          </span>
        </div>
      </div>

      {/* Accept & Reject Action Hierarchy per DESIGN.md §8.4 */}
      <div className="space-y-6">
        <Button
          variant="success"
          size="xl"
          icon={CheckCircle2}
          isLoading={isResponding}
          onClick={() => onAccept(_id)}
          className="w-full text-xl shadow-raised"
        >
          ✓ Accept Bed Request
        </Button>

        <div className="text-center">
          <Button
            variant="danger"
            size="lg"
            icon={XCircle}
            disabled={isResponding}
            onClick={() => setShowRejectModal(true)}
            className="w-full sm:w-auto px-8"
          >
            Decline Request…
          </Button>
        </div>
      </div>

      <RejectReasonModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={(payload) => {
          setShowRejectModal(false);
          onReject(_id, payload);
        }}
        isRejecting={isResponding}
      />
    </div>
  );
}
