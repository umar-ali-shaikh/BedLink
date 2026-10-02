import React from 'react';
import { KpiRow } from '../../features/analytics/KpiRow';
import { ResponseChart } from '../../features/analytics/ResponseChart';
import { StatusIndicator } from '../../components/StatusIndicator';

const recentEmergencies = [
  { id: 'EM-901', patient: 'DEMO-P-0042', status: 'RESERVED', hospital: 'Apex City Hospital', bed: 'ICU-04', eta: '8m', time: '3m ago' },
  { id: 'EM-902', patient: 'DEMO-P-0041', status: 'COMPLETED', hospital: 'Metro Heart Institute', bed: 'CARD-01', eta: 'Arrived', time: '18m ago' },
  { id: 'EM-903', patient: 'DEMO-P-0040', status: 'COMPLETED', hospital: 'St. Jude Memorial Hospital', bed: 'ICU-01', eta: 'Arrived', time: '32m ago' },
  { id: 'EM-904', patient: 'DEMO-P-0039', status: 'NO_MATCH', hospital: '—', bed: '—', eta: '—', time: '1h ago' },
];

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text tracking-tight">System Performance & Operations</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Macro metrics, hospital response latency, and live coordination statistics
        </p>
      </div>

      {/* KPI Summary Row */}
      <KpiRow />

      {/* Charts & Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <ResponseChart />
        </div>

        <div className="lg:col-span-4 bg-surface border border-border rounded-xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text mb-1">Handshake SLA Compliance</h3>
            <p className="text-xs text-text-muted mb-4">Target: Handshake response &lt; 120s</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-text">Under 60 seconds (Immediate)</span>
                  <span className="font-bold text-success">74%</span>
                </div>
                <div className="w-full h-2 bg-neutral-soft rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: '74%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-text">60 - 120 seconds (Within SLA)</span>
                  <span className="font-bold text-primary">18%</span>
                </div>
                <div className="w-full h-2 bg-neutral-soft rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '18%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-text">Timed Out / Automatic Fallback</span>
                  <span className="font-bold text-warning">8%</span>
                </div>
                <div className="w-full h-2 bg-neutral-soft rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: '8%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-surface-muted rounded-lg border border-border mt-4 text-[11px] text-text-subtle">
            ⚡ Automatic fallback reroutes expired handshakes within 10 seconds of timeout.
          </div>
        </div>
      </div>

      {/* Live System Activity Table */}
      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-text">Recent Emergency Dispatches</h3>
          <span className="text-xs font-semibold text-text-subtle">City Control Network</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted text-text-subtle uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="p-3.5">Dispatch Ref</th>
                <th className="p-3.5">Patient</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Hospital</th>
                <th className="p-3.5">Assigned Bed</th>
                <th className="p-3.5">ETA</th>
                <th className="p-3.5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentEmergencies.map((em) => (
                <tr key={em.id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-text">{em.id}</td>
                  <td className="p-3.5 font-mono text-text-muted">{em.patient}</td>
                  <td className="p-3.5"><StatusIndicator status={em.status} /></td>
                  <td className="p-3.5 font-medium text-text">{em.hospital}</td>
                  <td className="p-3.5 font-mono text-text-muted">{em.bed}</td>
                  <td className="p-3.5 text-text-muted">{em.eta}</td>
                  <td className="p-3.5 text-right text-text-subtle">{em.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
