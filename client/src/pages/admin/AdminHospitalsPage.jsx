import React, { useState } from 'react';
import { Building2, Plus, Check, FreshnessIndicator, AlertCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { FreshnessIndicator as Freshness } from '../../components/FreshnessIndicator';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';

const initialHospitals = [
  { _id: 'hosp-1', name: 'Apex City Hospital & Trauma Center', currentLoad: 52, specialties: ['CARDIOLOGY', 'TRAUMA'], availableIcu: 4, availableVents: 6, updatedAt: new Date(Date.now() - 40000).toISOString(), status: 'ACTIVE' },
  { _id: 'hosp-2', name: 'Metro Heart & Super Specialty Institute', currentLoad: 65, specialties: ['CARDIOLOGY'], availableIcu: 2, availableVents: 4, updatedAt: new Date(Date.now() - 80000).toISOString(), status: 'ACTIVE' },
  { _id: 'hosp-3', name: 'St. Jude Memorial Hospital', currentLoad: 78, specialties: ['TRAUMA', 'GENERAL_MEDICINE'], availableIcu: 1, availableVents: 2, updatedAt: new Date(Date.now() - 360000).toISOString(), status: 'ACTIVE' },
  { _id: 'hosp-4', name: 'North General Infirmary', currentLoad: 96, specialties: ['NEUROLOGY', 'GENERAL_MEDICINE'], availableIcu: 0, availableVents: 1, updatedAt: new Date(Date.now() - 700000).toISOString(), status: 'ACTIVE' },
];

export function AdminHospitalsPage() {
  const [hospitals, setHospitals] = useState(initialHospitals);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [load, setLoad] = useState(50);
  const { showToast } = useToast();

  const handleAddHospital = (e) => {
    e.preventDefault();
    if (!name) return;

    const newHosp = {
      _id: 'hosp-' + Date.now(),
      name,
      currentLoad: Number(load),
      specialties: ['GENERAL_MEDICINE'],
      availableIcu: 2,
      availableVents: 2,
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    setHospitals((prev) => [...prev, newHosp]);
    setShowAddModal(false);
    setName('');
    showToast({
      title: 'Hospital Registered',
      message: `${name} has been enrolled in the BedLink regional registry.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Hospital Network Registry</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage regional healthcare facilities, ward quotas, and verification freshness
          </p>
        </div>

        <Button icon={Plus} onClick={() => setShowAddModal(true)}>
          Register Hospital
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-text">Participating Facilities</h3>
          </div>
          <span className="text-xs text-text-subtle font-semibold">{hospitals.length} Active Centers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted text-text-subtle uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="p-3.5">Hospital Name</th>
                <th className="p-3.5">Load Level</th>
                <th className="p-3.5">Specialties</th>
                <th className="p-3.5">Available ICU</th>
                <th className="p-3.5">Ventilators</th>
                <th className="p-3.5">Freshness</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hospitals.map((h) => (
                <tr key={h._id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="p-3.5 font-bold text-text">{h.name}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded font-bold ${h.currentLoad >= 90 ? 'bg-danger-soft text-danger' : h.currentLoad >= 70 ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}>
                      {h.currentLoad}% Load
                    </span>
                  </td>
                  <td className="p-3.5 text-text-muted">{h.specialties.join(', ')}</td>
                  <td className="p-3.5 font-bold text-text tabular-nums">{h.availableIcu} open</td>
                  <td className="p-3.5 font-bold text-text tabular-nums">{h.availableVents} open</td>
                  <td className="p-3.5"><Freshness timestamp={h.updatedAt} /></td>
                  <td className="p-3.5 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success border border-success/20">
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register Hospital Facility">
        <form onSubmit={handleAddHospital} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">
              Hospital Legal Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. City Central Medical Institute"
              className="w-full h-10 px-3 border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-focus"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">
              Initial Operational Load (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={load}
              onChange={(e) => setLoad(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Enroll Facility</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
