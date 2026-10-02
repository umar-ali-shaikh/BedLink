import React, { useState } from 'react';
import { Users, Plus, Shield, Building2, PhoneCall } from 'lucide-react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ROLES } from '../../constants/roles';
import { useToast } from '../../components/Toast';

const initialUsers = [
  { _id: 'u-1', name: 'Dr. Sarah Jenkins', email: 'admin@bedlink.demo', role: 'ADMIN', hospital: 'Regional Command Center' },
  { _id: 'u-2', name: 'Officer Rajesh Kumar', email: 'dispatcher@bedlink.demo', role: 'DISPATCHER', hospital: 'Central EMS Dispatch' },
  { _id: 'u-3', name: 'Nurse Priya Sharma', email: 'hospital@bedlink.demo', role: 'HOSPITAL', hospital: 'Apex City Hospital' },
  { _id: 'u-4', name: 'Dr. Amit Patel', email: 'cardiac.staff@bedlink.demo', role: 'HOSPITAL', hospital: 'Metro Heart Institute' },
];

export function AdminUsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES.DISPATCHER);
  const [hospital, setHospital] = useState('Apex City Hospital');
  const { showToast } = useToast();

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!name || !email) return;

    const newUser = {
      _id: 'u-' + Date.now(),
      name,
      email,
      role,
      hospital: role === ROLES.HOSPITAL ? hospital : 'Central Operations',
    };

    setUsers((prev) => [...prev, newUser]);
    setShowAddModal(false);
    setName('');
    setEmail('');
    showToast({
      title: 'User Enrolled',
      message: `${name} has been added with role ${role}.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Staff & Access Control</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Role-based authorization and departmental access management
          </p>
        </div>

        <Button icon={Plus} onClick={() => setShowAddModal(true)}>
          Enroll Staff User
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-text">Authorized System Operators</h3>
          </div>
          <span className="text-xs text-text-subtle font-semibold">{users.length} Active Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted text-text-subtle uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Assigned Facility / Center</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="p-3.5 font-bold text-text">{u.name}</td>
                  <td className="p-3.5 text-text-muted font-mono">{u.email}</td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      u.role === 'ADMIN'
                        ? 'bg-warning-soft text-warning border border-warning/20'
                        : u.role === 'DISPATCHER'
                        ? 'bg-primary-soft text-primary border border-primary/20'
                        : 'bg-success-soft text-success border border-success/20'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3.5 text-text-muted">{u.hospital}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Enroll System Operator">
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">
              Operator Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Jane Doe"
              className="w-full h-10 px-3 border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-focus"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">
              Operational Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@bedlink.demo"
              className="w-full h-10 px-3 border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-focus"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">
              Assigned Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <option value={ROLES.DISPATCHER}>DISPATCHER (Control Room)</option>
              <option value={ROLES.HOSPITAL}>HOSPITAL (Bed Management & Intake)</option>
              <option value={ROLES.ADMIN}>ADMIN (Full Operations)</option>
            </select>
          </div>

          {role === ROLES.HOSPITAL && (
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">
                Hospital Assignment
              </label>
              <select
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-focus"
              >
                <option value="Apex City Hospital">Apex City Hospital & Trauma Center</option>
                <option value="Metro Heart Institute">Metro Heart & Super Specialty</option>
                <option value="St. Jude Memorial Hospital">St. Jude Memorial Hospital</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
