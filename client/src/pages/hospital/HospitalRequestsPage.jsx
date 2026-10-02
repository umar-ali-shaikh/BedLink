import React, { useState } from 'react';
import { Inbox, CheckCircle, XCircle, TimerOff, UserCheck, Clock } from 'lucide-react';
import { StatusIndicator } from '../../components/StatusIndicator';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';

const initialHistory = [
  {
    _id: 'req-h-1',
    demoPatientId: 'DEMO-P-0042',
    status: 'ACCEPTED',
    bedNumber: 'ICU-04',
    department: 'ICU',
    respondedAt: '10 mins ago',
    eta: '8 min est.',
  },
  {
    _id: 'req-h-2',
    demoPatientId: 'DEMO-P-0038',
    status: 'REJECTED',
    reason: 'Insufficient ICU nursing staff',
    department: 'ICU',
    respondedAt: '45 mins ago',
    eta: '12 min est.',
  },
  {
    _id: 'req-h-3',
    demoPatientId: 'DEMO-P-0029',
    status: 'TIMEOUT',
    reason: 'Handshake 2-min window expired',
    department: 'Cardiac',
    respondedAt: '2 hours ago',
    eta: '15 min est.',
  },
];

export function HospitalRequestsPage() {
  const [history] = useState(initialHistory);
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text">Handshake Requests & Hold Queue</h1>
        <p className="text-xs text-text-muted">History of incoming emergency allocations and hospital responses</p>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-text">Recent Handshake Requests</h3>
          </div>
          <span className="text-xs text-text-subtle font-medium">{history.length} resolved</span>
        </div>

        <div className="divide-y divide-border">
          {history.map((req) => (
            <div key={req._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-muted/50 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-text">{req.demoPatientId}</span>
                  <StatusIndicator status={req.status} />
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Department: <strong className="text-text">{req.department}</strong> · Ambulance ETA: {req.eta}
                </p>
                {req.reason && (
                  <p className="text-[11px] text-danger mt-0.5">Note: {req.reason}</p>
                )}
                {req.bedNumber && (
                  <p className="text-[11px] text-success font-medium mt-0.5">Held Bed: {req.bedNumber}</p>
                )}
              </div>

              <div className="text-left sm:text-right text-xs text-text-subtle">
                <span>{req.respondedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
