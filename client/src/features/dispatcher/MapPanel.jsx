import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../../utils/cn';
import { config } from '../../config';

const CONFIDENCE_COLOR = {
  HIGH: 'var(--color-success)',
  MEDIUM: 'var(--color-primary)',
  LOW: 'var(--color-warning)',
};

const rankIcon = (rank, color, selected) => {
  const size = selected ? 38 : 30;
  return L.divIcon({
    className: 'bl-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font:700 ${selected ? 15 : 13}px Inter,sans-serif;border:2px solid #fff;box-shadow:0 0 0 ${selected ? 3 : 0}px var(--color-primary),0 4px 10px rgba(15,23,42,.25)">${rank}</div>`,
  });
};

const patientIcon = L.divIcon({
  className: 'bl-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: '<div class="animate-pulse-ring" style="width:22px;height:22px;border-radius:999px;background:var(--color-primary);border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.3)"></div>',
});

function FitBounds({ points, padding = 40 }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(points, { padding: [padding, padding], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function ClickToPick({ onPick }) {
  useMapEvents({
    click(e) {
      onPick?.({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) });
    },
  });
  return null;
}

const valid = (p) => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng);

/**
 * Leaflet + OSM map (DESIGN.md §5 Map panel): patient (blue pulse), candidates numbered by
 * rank and coloured by confidence, selected larger with a ring, excluded grey (toggle).
 * `others` = plain hospital markers before a search. The list always mirrors the map.
 */
export function MapPanel({ patientLocation, candidates = [], exclusions = [], others = [], selectedId, onSelect, onPickLocation, className, pinLabel = 'Patient location', title = 'Map', showLegend = true }) {
  const [showExcluded, setShowExcluded] = useState(true);
  const patient = valid(patientLocation) ? [+patientLocation.lat, +patientLocation.lng] : null;

  const points = useMemo(() => {
    const pts = [];
    if (patient) pts.push(patient);
    candidates.forEach((c) => valid(c.coordinates) && pts.push([c.coordinates.lat, c.coordinates.lng]));
    if (!candidates.length) others.forEach((h) => valid(h.coordinates) && pts.push([h.coordinates.lat, h.coordinates.lng]));
    return pts;
  }, [patient, candidates, others]);

  return (
    <div className={cn('relative bg-surface border border-border rounded-lg shadow-card overflow-hidden flex flex-col', className)}>
      <div className="flex items-center justify-between gap-2 px-4 h-11 border-b border-border text-small">
        <span className="font-semibold text-text">{title}</span>
        <div className={cn('flex items-center gap-3 text-[12px] text-text-muted', !showLegend && 'hidden')}>
          <span className="hidden sm:inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Patient
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-success" /> High
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" /> Low
          </span>
          {exclusions.length > 0 && (
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showExcluded} onChange={(e) => setShowExcluded(e.target.checked)} className="accent-primary" style={{ fontSize: 'inherit' }} />
              Excluded
            </label>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[280px]">
        <MapContainer center={patient ?? [config.defaultLocation.lat, config.defaultLocation.lng]} zoom={12} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution={config.mapAttribution} url={config.mapTileUrl} />
          <FitBounds points={points} />
          {onPickLocation && <ClickToPick onPick={onPickLocation} />}

          {!candidates.length &&
            others.filter((h) => valid(h.coordinates)).map((h) => (
              <CircleMarker key={h.id} center={[h.coordinates.lat, h.coordinates.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: h.status === 'ACTIVE' ? '#0B63CE' : '#94A3B8', fillOpacity: 0.9 }}>
                <Tooltip>{h.name}</Tooltip>
              </CircleMarker>
            ))}

          {showExcluded &&
            exclusions.filter((x) => valid(x.coordinates)).map((x) => (
              <CircleMarker key={x.hospitalId} center={[x.coordinates.lat, x.coordinates.lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#94A3B8', fillOpacity: 0.9 }}>
                <Popup>
                  <strong>{x.hospitalName}</strong>
                  <br />
                  {(x.messages ?? []).join(' · ')}
                </Popup>
              </CircleMarker>
            ))}

          {candidates.filter((c) => valid(c.coordinates)).map((c) => (
            <Marker
              key={c.hospitalId}
              position={[c.coordinates.lat, c.coordinates.lng]}
              icon={rankIcon(c.rank, CONFIDENCE_COLOR[c.confidence] ?? CONFIDENCE_COLOR.MEDIUM, c.hospitalId === selectedId)}
              zIndexOffset={c.hospitalId === selectedId ? 1000 : 100 - c.rank}
              eventHandlers={{ click: () => onSelect?.(c.hospitalId) }}
            >
              <Popup>
                <strong>
                  #{c.rank} {c.hospitalName}
                </strong>
                <br />
                Score {c.score} · {c.etaMinutes} min est. · {c.distanceKm} km
              </Popup>
            </Marker>
          ))}

          {patient && (
            <Marker position={patient} icon={patientIcon} zIndexOffset={2000}>
              <Tooltip direction="top" offset={[0, -10]}>
                {pinLabel}
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
