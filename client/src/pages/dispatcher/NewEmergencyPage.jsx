import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Lock, Pencil, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { isVerifiedAmbulance } from '../../features/verification/AmbulanceVerificationBanner';
import { EmergencyForm, DEFAULT_REQUIREMENTS } from '../../features/dispatcher/EmergencyForm';
import { HospitalCard } from '../../features/dispatcher/HospitalCard';
import { ExcludedList } from '../../features/dispatcher/ExcludedList';
import { MapPanel } from '../../features/dispatcher/MapPanel';
import { emergencyApi } from '../../features/dispatcher/api';
import { hospitalsApi } from '../../features/hospitals/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { CardSkeleton, Skeleton } from '../../components/Skeleton';
import { StatusIndicator } from '../../components/StatusIndicator';
import { useToast } from '../../components/Toast';
import { useSocket } from '../../socket/SocketContext';
import { useSocketEvent } from '../../socket/useSocketEvent';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import { emergencyPath } from '../../constants/routes';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { requirementsText } from '../../utils/labels';

const validLoc = (l) => Boolean(l) && Number.isFinite(+l.lat) && Number.isFinite(+l.lng);

/**
 * Core dispatcher screen (DESIGN.md §8.2): requirements | ranked hospitals | map at ≥ 1280 px.
 * Below that, requirements collapse into a summary bar after a search and the map sits
 * above the list.
 */
export function NewEmergencyPage() {
  const { user } = useAuth();
  if (!isVerifiedAmbulance(user)) {
    return (
      <EmptyState
        icon={Lock}
        title="Requesting beds unlocks after verification"
        description="An admin is checking your ambulance details. You'll be notified here as soon as you're verified."
        className="py-16"
      />
    );
  }
  return <NewEmergencyForm />;
}

function NewEmergencyForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isConnected } = useSocket();
  const [requirements, setRequirements] = useState(DEFAULT_REQUIREMENTS);
  const [location, setLocation] = useState(null);
  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [availabilityChanged, setAvailabilityChanged] = useState(false);

  const nearby = useQuery({
    queryKey: qk.nearby(location?.lat, location?.lng),
    queryFn: () => hospitalsApi.nearby({ lat: location.lat, lng: location.lng }),
    enabled: validLoc(location) && !result,
    placeholderData: (prev) => prev,
  });

  const create = useMutation({
    mutationFn: async (body) => {
      // A ranking that was never sent to a hospital is replaced, not left open.
      if (['SEARCHING', 'NO_MATCH'].includes(result?.status)) await emergencyApi.cancel(result.id).catch(() => {});
      return emergencyApi.create(body);
    },
    onSuccess: (emergency) => {
      setResult(emergency);
      setEditing(false);
      setAvailabilityChanged(false);
      setSelectedId(emergency.candidates?.[0]?.hospitalId ?? null);
      queryClient.invalidateQueries({ queryKey: qk.emergenciesAll });
    },
    onError: (err) => showToast({ type: 'error', title: 'Could not run matching', message: errorMessage(err) }),
  });

  const request = useMutation({
    mutationFn: ({ hospitalId }) => emergencyApi.requestHospital(result.id, hospitalId),
    onMutate: ({ hospitalId }) => setRequestingId(hospitalId ?? 'top'),
    onSuccess: (emergency) => {
      queryClient.invalidateQueries({ queryKey: qk.emergenciesAll });
      navigate(emergencyPath(emergency.id ?? result.id));
    },
    onError: (err) => {
      setRequestingId(null);
      showToast({
        type: 'error',
        title: err.code === 'HOSPITAL_NO_LONGER_MATCHES' ? 'This hospital no longer matches' : 'Request failed',
        message: errorMessage(err),
      });
    },
  });

  // Ranked data ages; tell the dispatcher (request-hospital re-validates on the server anyway).
  useSocketEvent(SOCKET_EVENTS.BED_UPDATED, (payload) => {
    if (result?.candidates?.some((c) => c.hospitalId === payload?.hospitalId)) setAvailabilityChanged(true);
  });

  useEffect(() => {
    if (result) setSelectedId((id) => id ?? result.candidates?.[0]?.hospitalId ?? null);
  }, [result]);

  const candidates = result?.candidates ?? [];
  const exclusions = result?.exclusions ?? [];
  const noMatch = result && candidates.length === 0;
  const busy = create.isPending || request.isPending;

  const summary = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
        <StatusIndicator kind="urgency" status={result?.urgency ?? requirements.urgency} look="caps" />
        <span className="font-semibold text-text">{requirementsText(result?.requirements ?? requirements)}</span>
        {location && <span className="text-text-subtle truncate max-w-[22rem]">{location.label}</span>}
        {result && <span className="text-text-subtle">· {result.demoPatientId}</span>}
      </div>
    ),
    [result, requirements, location]
  );

  const form = (
    <EmergencyForm
      value={requirements}
      onChange={setRequirements}
      location={location}
      onLocationChange={setLocation}
      onSubmit={(body) => create.mutate(body)}
      isSubmitting={create.isPending}
      disabled={request.isPending}
    />
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1.2fr)_minmax(0,0.8fr)] xl:items-start">
      {/* Zone 1 — requirements */}
      <section className="xl:sticky xl:top-20" aria-label="Requirements">
        <Card className="hidden xl:block">
          <h1 className="text-h3 text-text mb-5">New emergency</h1>
          {form}
        </Card>
        <div className="xl:hidden">
          {editing || !result ? (
            <Card>
              <h1 className="text-h3 text-text mb-5">New emergency</h1>
              {form}
            </Card>
          ) : (
            <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
              {summary}
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                Edit requirements
              </Button>
            </Card>
          )}
        </div>
      </section>

      {/* Zone 3 on wide screens, above the list on tablets */}
      <MapPanel
        className="h-[320px] md:h-[360px] xl:h-[calc(100vh-7.5rem)] xl:sticky xl:top-20 xl:order-3"
        patientLocation={validLoc(location) ? location : null}
        candidates={candidates}
        exclusions={exclusions}
        others={result ? [] : (nearby.data ?? [])}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Zone 2 — ranked hospitals */}
      <section className="space-y-3 xl:order-2 min-w-0" aria-label="Ranked hospitals" aria-busy={create.isPending}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-h2 text-text">Ranked hospitals</h2>
            {result && (
              <p className="text-small text-text-subtle">
                {candidates.length} suitable · {exclusions.length} excluded
                {result.matchingDurationMs != null && ` · matched in ${result.matchingDurationMs} ms`}
              </p>
            )}
          </div>
          {result && (
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => create.mutate({ patientLocation: { lat: location.lat, lng: location.lng }, requirements: { bedType: requirements.bedType, equipment: requirements.equipment, specialties: requirements.specialties }, urgency: requirements.urgency })} isLoading={create.isPending} disabled={!location}>
              Re-rank
            </Button>
          )}
        </div>

        {availabilityChanged && (
          <p className="flex items-center gap-2 text-small text-warning bg-warning-soft border border-warning/25 rounded-md px-3 py-2" role="status">
            <CircleAlert className="w-4 h-4 shrink-0" aria-hidden />
            Availability changed since this ranking. Requesting re-checks the hospital, or re-rank now.
          </p>
        )}

        {create.isPending ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <Skeleton className="h-12" />
          </>
        ) : !result ? (
          <EmptyState
            icon={Search}
            title="Enter requirements to find a bed"
            description="Pick bed type, equipment, specialties, search the patient’s location, then Find beds. Hospitals are ranked by resources, travel time, data freshness and load."
            className="py-12"
          />
        ) : noMatch ? (
          <Card className="text-center py-8">
            <CircleAlert className="w-8 h-8 text-danger mx-auto" aria-hidden />
            <p className="text-h3 text-text mt-3">No hospital currently matches all requirements.</p>
            <p className="text-small text-text-muted mt-1">Adjust requirements or retry. See why each hospital was excluded below.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)} className="xl:hidden">
                Adjust requirements
              </Button>
              <Button icon={RefreshCw} onClick={() => request.mutate({})} isLoading={request.isPending}>
                Retry matching
              </Button>
            </div>
          </Card>
        ) : (
          candidates.map((c, i) => (
            <HospitalCard
              key={c.hospitalId}
              candidate={c}
              matchedAt={result.updatedAt}
              isTop={i === 0}
              isSelected={c.hospitalId === selectedId}
              onSelect={() => setSelectedId(c.hospitalId)}
              onRequest={() => request.mutate({ hospitalId: c.hospitalId })}
              isRequesting={requestingId === c.hospitalId}
              requestDisabled={busy || !isConnected}
            />
          ))
        )}

        {result && <ExcludedList exclusions={exclusions} defaultOpen={noMatch} />}
        {result && !isConnected && <p className="text-small text-warning">Reconnecting — requesting a bed is paused until live updates resume.</p>}
      </section>
    </div>
  );
}
