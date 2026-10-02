import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { formatEta } from '../../utils/formatEta';
import { cn } from '../../utils/cn';

// Custom HTML Icons for Leaflet markers
function createHospitalIcon(rank, isSelected = false, isTop = false) {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background-color: ${isSelected ? '#0B63CE' : isTop ? '#15803D' : '#0F172A'};
        color: white;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        border-radius: 9999px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        font-family: Inter, sans-serif;
        transform: translate(-16px, -16px);
      ">
        #${rank}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const patientIcon = L.divIcon({
  className: 'custom-patient-icon',
  html: `
    <div style="
      background-color: #B91C1C;
      color: white;
      border: 3px solid white;
      box-shadow: 0 0 0 4px rgba(185, 28, 28, 0.4), 0 4px 12px rgba(0,0,0,0.3);
      border-radius: 9999px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transform: translate(-14px, -14px);
    ">
      🚑
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export function MapPanel({
  patientLocation = { lat: 28.6315, lng: 77.2167 },
  hospitals = [],
  selectedHospitalId,
  onSelectHospital,
  className,
}) {
  const center = [patientLocation.lat || 28.6315, patientLocation.lng || 77.2167];

  return (
    <div className={cn('bg-surface border border-border rounded-xl overflow-hidden shadow-card relative flex flex-col h-[500px] lg:h-full min-h-[400px]', className)}>
      <div className="p-3 bg-surface-muted border-b border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text">Real-time Location Map</span>
          <span className="text-text-subtle">· Leaflet + OSM</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> Patient
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Hospital
          </span>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative">
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter center={center} />

          {/* Patient Marker */}
          <Marker position={center} icon={patientIcon}>
            <Popup>
              <div className="text-xs p-1">
                <strong className="block text-danger font-bold">🚑 Patient / Ambulance Location</strong>
                <span className="text-text-muted">Dispatch coordinate source</span>
              </div>
            </Popup>
          </Marker>

          {/* Proximity Ring around Patient */}
          <Circle
            center={center}
            radius={5000}
            pathOptions={{ color: '#0B63CE', fillColor: '#0B63CE', fillOpacity: 0.05, weight: 1, dashArray: '4, 4' }}
          />

          {/* Hospital Candidate Markers */}
          {hospitals.map((h, idx) => {
            if (!h.location?.coordinates && (!h.lat || !h.lng)) return null;
            const lat = h.location?.coordinates ? h.location.coordinates[1] : h.lat;
            const lng = h.location?.coordinates ? h.location.coordinates[0] : h.lng;
            const rank = idx + 1;
            const isSelected = selectedHospitalId === (h._id || h.id);

            return (
              <Marker
                key={h._id || h.id || idx}
                position={[lat, lng]}
                icon={createHospitalIcon(rank, isSelected, rank === 1)}
                eventHandlers={{
                  click: () => onSelectHospital && onSelectHospital(h),
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="block text-text font-bold">#{rank} {h.name}</strong>
                    <div className="text-primary font-bold mt-0.5">
                      Match Score: {Math.round(h.totalScore || h.matchScore || 0)}/100
                    </div>
                    <div className="text-text-muted mt-0.5">
                      ETA: {formatEta(h.estimatedEtaMinutes || h.etaMinutes)} ({h.distanceKm ? `${h.distanceKm.toFixed(1)} km` : ''})
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
