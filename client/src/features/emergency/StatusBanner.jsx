import React from 'react';
import { Siren, Clock, CheckCircle2, XCircle, Building2, Ban } from 'lucide-react';
import { StatusIndicator } from '../../components/StatusIndicator';
import { CountdownTimer } from '../../components/CountdownTimer';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';

export function StatusBanner({ emergency, activeOffer, onCancel, isCancelling = false, className }) {
  if (!emergency) return null;

  return (
    <div className={cn('bg-surface border border-border rounded-xl p-5 shadow-card space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center text-primary">
            <Siren className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text">
                Emergency {emergency.demoPatientId || 'DEMO-P-0000'}
              </h2>
              <StatusIndicator status={emergency.status} />
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Urgency: <span className="font-semibold text-text">{emergency.requirements?.urgency || 'CRITICAL'}</span> · Department: <span className="font-semibold text-text">{emergency.requirements?.bedType || 'ICU'}</span>
            </p>
          </div>
        </div>

        {onCancel && emergency.status !== 'COMPLETED' && emergency.status !== 'CANCELLED' && (
          <Button
            variant="danger"
            size="sm"
            icon={Ban}
            isLoading={isCancelling}
            onClick={onCancel}
          >
            Cancel Request
          </Button>
        )}
      </div>

      {/* Active Hospital Handshake Offer Banner */}
      {activeOffer && activeOffer.status === 'PENDING' && (
        <div className="p-4 rounded-xl bg-primary-soft/40 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Awaiting Hospital Handshake Response
              </p>
              <h4 className="text-sm font-bold text-text">
                {activeOffer.hospital?.name || 'Contacted Hospital'}
              </h4>
              <p className="text-xs text-text-muted">
                Contacted for bed allocation · 2-minute response window
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-text-subtle mb-0.5">
              Time Remaining
            </span>
            <CountdownTimer expiresAt={activeOffer.expiresAt} size="md" showIcon />
          </div>
        </div>
      )}
    </div>
  );
}
