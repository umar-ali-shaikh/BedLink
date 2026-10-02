import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Ban } from 'lucide-react';
import { StatusBanner } from '../../features/emergency/StatusBanner';
import { EmergencyTimeline } from '../../features/emergency/EmergencyTimeline';
import { ReservationCard } from '../../features/reservations/ReservationCard';
import { HospitalCard } from '../../features/dispatcher/HospitalCard';
import { Button } from '../../components/Button';
import { ROUTES } from '../../constants/routes';
import { useToast } from '../../components/Toast';

export function EmergencyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const contactedHospital = location.state?.hospital || {
    _id: 'hosp-1',
    name: 'Apex City Hospital & Trauma Center',
    totalScore: 94,
    distanceKm: 3.2,
    estimatedEtaMinutes: 8,
    confidenceLevel: 'HIGH',
    availableBedCount: 4,
    currentLoad: 52,
    lastAvailabilityUpdate: new Date().toISOString(),
  };

  const [emergency, setEmergency] = useState({
    _id: id || 'DEMO-EMERGENCY',
    demoPatientId: 'DEMO-P-0042',
    status: 'AWAITING_HOSPITAL',
    requirements: {
      bedType: 'ICU',
      urgency: 'CRITICAL',
      equipment: ['VENTILATOR', 'OXYGEN'],
    },
  });

  const [activeOffer, setActiveOffer] = useState({
    _id: 'off-1',
    status: 'PENDING',
    hospital: contactedHospital,
    expiresAt: new Date(Date.now() + 112000).toISOString(),
  });

  const [reservation, setReservation] = useState(null);

  const [timeline, setTimeline] = useState([
    {
      _id: 'tl-1',
      eventType: 'CREATED',
      title: 'Emergency Request Initiated',
      description: 'Patient coordinates locked. Critical ICU and Ventilator requirement submitted.',
      actor: 'Dispatcher (Control Room)',
      createdAt: new Date(Date.now() - 15000).toISOString(),
    },
    {
      _id: 'tl-2',
      eventType: 'HOSPITAL_CONTACTED',
      title: 'Handshake Dispatched to Rank #1 Hospital',
      description: `${contactedHospital.name} notified via WebSocket. 2-minute response window active.`,
      actor: 'BedLink Matching Engine',
      createdAt: new Date().toISOString(),
    },
  ]);

  const handleSimulateAccept = () => {
    setActiveOffer((prev) => ({ ...prev, status: 'ACCEPTED' }));
    setEmergency((prev) => ({ ...prev, status: 'RESERVED' }));
    setReservation({
      _id: 'res-99',
      bedNumber: 'ICU-04',
      hospital: contactedHospital,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    setTimeline((prev) => [
      ...prev,
      {
        _id: 'tl-3',
        eventType: 'ACCEPTED',
        title: 'Handshake Accepted by Hospital',
        description: `${contactedHospital.name} accepted request. Bed ICU-04 is held.`,
        actor: contactedHospital.name,
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'tl-4',
        eventType: 'RESERVED',
        title: 'Bed Locked Exclusively',
        description: 'Bed ICU-04 reserved for 30 minutes. Double-booking prevented.',
        actor: 'Reservation Engine',
        createdAt: new Date().toISOString(),
      },
    ]);
    showToast({
      title: 'Hospital Accepted!',
      message: `${contactedHospital.name} accepted. Bed ICU-04 is locked exclusively.`,
      type: 'success',
    });
  };

  const handleSimulateTimeout = () => {
    setTimeline((prev) => [
      ...prev,
      {
        _id: 'tl-timeout',
        eventType: 'TIMEOUT',
        title: 'Handshake Window Expired',
        description: `${contactedHospital.name} did not respond within 120 seconds.`,
        actor: 'Timeout Sweeper Service',
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'tl-fallback',
        eventType: 'FALLBACK_TRIGGERED',
        title: 'Automatic Fallback Dispatched',
        description: 'Re-running matching excluding previous hospital. Contacting Rank #2: Metro Heart Institute.',
        actor: 'Fallback Engine',
        createdAt: new Date().toISOString(),
      },
    ]);
    showToast({
      title: 'Automatic Fallback Triggered',
      message: 'Initial hospital timed out. Next ranked hospital contacted automatically.',
      type: 'warning',
    });
  };

  const handleCancel = () => {
    setEmergency((prev) => ({ ...prev, status: 'CANCELLED' }));
    setActiveOffer(null);
    setTimeline((prev) => [
      ...prev,
      {
        _id: 'tl-cancel',
        eventType: 'CANCELLED',
        title: 'Emergency Request Cancelled',
        description: 'Dispatcher manually withdrew request.',
        actor: 'Dispatcher',
        createdAt: new Date().toISOString(),
      },
    ]);
    showToast({
      title: 'Emergency Cancelled',
      message: 'The active request has been withdrawn.',
      type: 'info',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(ROUTES.DISPATCHER_DASHBOARD)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to active emergencies</span>
        </button>

        {/* Demo Simulation Controls */}
        <div className="flex items-center gap-2">
          {emergency.status === 'AWAITING_HOSPITAL' && (
            <>
              <Button size="sm" variant="success" onClick={handleSimulateAccept}>
                Demo: Simulate Hospital Accept
              </Button>
              <Button size="sm" variant="secondary" onClick={handleSimulateTimeout}>
                Demo: Simulate Timeout Fallback
              </Button>
            </>
          )}
        </div>
      </div>

      <StatusBanner
        emergency={emergency}
        activeOffer={activeOffer}
        onCancel={emergency.status !== 'CANCELLED' && emergency.status !== 'COMPLETED' ? handleCancel : null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hospital & Reservation Info */}
        <div className="lg:col-span-7 space-y-5">
          {reservation ? (
            <ReservationCard
              reservation={reservation}
              onRelease={() => {
                setReservation(null);
                setEmergency((prev) => ({ ...prev, status: 'SEARCHING' }));
                showToast({
                  title: 'Bed Released',
                  message: 'Reservation released back to general pool.',
                  type: 'info',
                });
              }}
            />
          ) : (
            <div>
              <h3 className="text-sm font-bold text-text mb-3">Currently Contacted Hospital</h3>
              <HospitalCard
                hospital={contactedHospital}
                rank={1}
                isRequested
              />
            </div>
          )}
        </div>

        {/* Right Column: Live Coordination Timeline */}
        <div className="lg:col-span-5">
          <EmergencyTimeline events={timeline} />
        </div>
      </div>
    </div>
  );
}
