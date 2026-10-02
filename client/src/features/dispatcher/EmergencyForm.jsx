import React, { useState } from 'react';
import {
  BedDouble,
  Wind,
  Activity,
  HeartPulse,
  Flame,
  Search,
  MapPin,
  Siren,
  TriangleAlert,
  Info,
} from 'lucide-react';
import { BED_TYPES, EQUIPMENT } from '../../constants/bed';
import { SPECIALTIES } from '../../constants/hospital';
import { URGENCY } from '../../constants/emergency';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';

const locationPresets = [
  { name: 'City Center (Connaught Place)', lat: 28.6315, lng: 77.2167 },
  { name: 'South District (Hauz Khas)', lat: 28.5494, lng: 77.2001 },
  { name: 'East District (Preet Vihar)', lat: 28.6415, lng: 77.2954 },
  { name: 'West District (Rajouri Garden)', lat: 28.6468, lng: 77.1213 },
  { name: 'North District (Civil Lines)', lat: 28.6750, lng: 77.2250 },
];

export function EmergencyForm({ onSubmit, isLoading = false, className }) {
  const [bedType, setBedType] = useState(BED_TYPES.ICU);
  const [equipment, setEquipment] = useState([EQUIPMENT.VENTILATOR]);
  const [specialties, setSpecialties] = useState([SPECIALTIES.CARDIOLOGY]);
  const [urgency, setUrgency] = useState(URGENCY.CRITICAL);
  const [selectedLocation, setSelectedLocation] = useState(locationPresets[0]);
  const [notes, setNotes] = useState('');

  const toggleEquipment = (item) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleSpecialty = (item) => {
    setSpecialties((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      requirements: {
        bedType,
        equipment,
        specialties,
        urgency,
      },
      patientLocation: {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      },
      notes,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('bg-surface border border-border rounded-xl p-5 shadow-card space-y-6', className)}
    >
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-bold text-text">Patient Emergency Requirements</h2>
        <p className="text-xs text-text-muted mt-0.5">Specify clinical criteria to compute verified hospital matches</p>
      </div>

      {/* Bed Type Selection */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text mb-2">
          Required Bed Department
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(BED_TYPES).map((type) => {
            const isSelected = bedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setBedType(type)}
                className={cn(
                  'h-11 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all',
                  isSelected
                    ? 'bg-primary text-text-inverse border-primary shadow-sm'
                    : 'bg-surface border-border text-text hover:bg-surface-muted hover:border-border-strong'
                )}
              >
                <BedDouble className="w-4 h-4 flex-shrink-0" />
                <span>{type} Bed</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clinical Urgency */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text mb-2">
          Urgency Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: URGENCY.CRITICAL, label: 'Critical', icon: Siren, color: 'text-danger', selectedBg: 'bg-danger text-text-inverse border-danger' },
            { value: URGENCY.HIGH, label: 'High', icon: TriangleAlert, color: 'text-warning', selectedBg: 'bg-warning text-text-inverse border-warning' },
            { value: URGENCY.MODERATE, label: 'Moderate', icon: Info, color: 'text-text-muted', selectedBg: 'bg-neutral-state text-text-inverse border-neutral-state' },
          ].map((u) => {
            const isSelected = urgency === u.value;
            const Icon = u.icon;
            return (
              <button
                key={u.value}
                type="button"
                onClick={() => setUrgency(u.value)}
                className={cn(
                  'h-10 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                  isSelected
                    ? `${u.selectedBg} shadow-sm`
                    : 'bg-surface border-border text-text hover:bg-surface-muted'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isSelected ? 'text-text-inverse' : u.color)} />
                <span>{u.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Life Support Equipment */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text mb-2">
          Required Equipment
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { id: EQUIPMENT.VENTILATOR, label: 'Ventilator', icon: Wind },
            { id: EQUIPMENT.OXYGEN, label: 'Oxygen Supply', icon: Activity },
            { id: EQUIPMENT.CARDIAC_MONITOR, label: 'Cardiac Monitor', icon: HeartPulse },
          ].map((eq) => {
            const isChecked = equipment.includes(eq.id);
            const Icon = eq.icon;
            return (
              <button
                key={eq.id}
                type="button"
                onClick={() => toggleEquipment(eq.id)}
                className={cn(
                  'h-10 px-3 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all text-left',
                  isChecked
                    ? 'bg-primary-soft text-primary border-primary font-bold'
                    : 'bg-surface border-border text-text-muted hover:bg-surface-muted'
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{eq.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Medical Specialties */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text mb-2">
          Required Hospital Specialties
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(SPECIALTIES).map((spec) => {
            const isChecked = specialties.includes(spec);
            return (
              <button
                key={spec}
                type="button"
                onClick={() => toggleSpecialty(spec)}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  isChecked
                    ? 'bg-text text-text-inverse border-text font-bold'
                    : 'bg-surface border-border text-text-muted hover:bg-surface-muted'
                )}
              >
                {spec.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Location Presets */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text mb-2">
          Ambulance / Patient Location
        </label>
        <div className="space-y-2">
          <select
            value={selectedLocation.name}
            onChange={(e) => {
              const found = locationPresets.find((p) => p.name === e.target.value);
              if (found) setSelectedLocation(found);
            }}
            className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-xs font-medium text-text focus:outline-none focus:ring-2 focus:ring-focus"
          >
            {locationPresets.map((loc) => (
              <option key={loc.name} value={loc.name}>
                📍 {loc.name} ({loc.lat.toFixed(3)}, {loc.lng.toFixed(3)})
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        icon={Search}
        isLoading={isLoading}
        className="w-full mt-4"
      >
        Rank & Find Hospital Beds →
      </Button>
    </form>
  );
}
