import React, { useState } from 'react';
import { IncomingRequestCard } from '../../features/hospital/IncomingRequestCard';
import { BedCounters } from '../../features/beds/BedCounters';
import { ConfirmAllButton } from '../../features/beds/ConfirmAllButton';
import { LoadControl } from '../../features/hospital/LoadControl';
import { FreshnessIndicator } from '../../components/FreshnessIndicator';
import { ReservationCard } from '../../features/reservations/ReservationCard';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';

export function HospitalDashboardPage() {
  const { showToast } = useToast();

  // Simulated live incoming request (can be toggled for testing)
  const [incomingRequest, setIncomingRequest] = useState({
    _id: 'req-live-01',
    expiresAt: new Date(Date.now() + 102000).toISOString(),
    distanceKm: 3.9,
    estimatedEtaMinutes: 8,
    emergency: {
      demoPatientId: 'DEMO-P-0042',
      requirements: {
        bedType: 'ICU',
        equipment: ['VENTILATOR', 'CARDIAC_MONITOR'],
        specialties: ['CARDIOLOGY'],
        urgency: 'CRITICAL',
      },
    },
  });

  const [activeReservation, setActiveReservation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date().toISOString());

  const handleAcceptRequest = () => {
    setActiveReservation({
      _id: 'res-live-101',
      bedNumber: 'ICU-02',
      hospital: { name: 'Apex City Hospital' },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    setIncomingRequest(null);
    showToast({
      title: 'Handshake Accepted',
      message: 'Bed ICU-02 has been locked exclusively for the incoming ambulance.',
      type: 'success',
    });
  };

  const handleRejectRequest = (id, reason) => {
    setIncomingRequest(null);
    showToast({
      title: 'Request Declined',
      message: `Decline reason: ${reason?.reason || 'Other'}. Fallback automatically routed.`,
      type: 'info',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Incoming Request Card (Pushes everything down per DESIGN.md §8.3) */}
      {incomingRequest ? (
        <IncomingRequestCard
          request={incomingRequest}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
        />
      ) : (
        <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            <span className="font-semibold text-text">Emergency intake standby</span>
            <span className="text-text-subtle">· Listening for requests</span>
          </div>

          <button
            type="button"
            onClick={() =>
              setIncomingRequest({
                _id: 'req-demo-' + Date.now(),
                expiresAt: new Date(Date.now() + 118000).toISOString(),
                distanceKm: 4.2,
                estimatedEtaMinutes: 9,
                emergency: {
                  demoPatientId: 'DEMO-P-0088',
                  requirements: {
                    bedType: 'ICU',
                    equipment: ['VENTILATOR', 'OXYGEN'],
                    specialties: ['TRAUMA'],
                    urgency: 'CRITICAL',
                  },
                },
              })
            }
            className="text-[11px] text-primary hover:underline font-semibold"
          >
            Demo: Simulate Incoming Request
          </button>
        </div>
      )}

      {/* Active Reservation Notice (if any) */}
      {activeReservation && (
        <ReservationCard
          reservation={activeReservation}
          role="HOSPITAL"
          onMarkArrived={() => {
            setActiveReservation(null);
            showToast({
              title: 'Patient Arrived',
              message: 'Bed occupancy registered. Hold completed.',
              type: 'success',
            });
          }}
          onRelease={() => {
            setActiveReservation(null);
            showToast({
              title: 'Reservation Released',
              message: 'Bed returned to available pool.',
              type: 'info',
            });
          }}
        />
      )}

      {/* 2. Bed Counters Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-subtle mb-2.5">
          Department Bed Availability
        </h2>
        <BedCounters counts={{ icu: 3, ventilator: 5, oxygen: 12, cardiac: 2, burns: 0 }} />
      </div>

      {/* 3. Freshness & Confirm All Action (Full width lg button per DESIGN.md §8.3) */}
      <div className="p-4 bg-surface border border-border rounded-xl shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text">Hospital Verification Status</span>
          <FreshnessIndicator timestamp={lastUpdate} />
        </div>
        <ConfirmAllButton
          hospitalId="hosp-1"
          onConfirmed={() => setLastUpdate(new Date().toISOString())}
          className="w-full"
        />
      </div>

      {/* 4. Operational Load Control */}
      <LoadControl hospitalId="hosp-1" currentLoad={50} />
    </div>
  );
}
