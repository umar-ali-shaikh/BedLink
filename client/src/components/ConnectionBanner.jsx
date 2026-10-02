import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../socket/SocketContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/** Thin top banner: amber while reconnecting, green "Back online" for 3 s (DESIGN.md §5). */
export function ConnectionBanner() {
  const { isConnected, hasConnected } = useSocket();
  const online = useOnlineStatus();
  const down = !online || (hasConnected && !isConnected);
  const wasDown = useRef(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (down) {
      wasDown.current = true;
      setRestored(false);
      return undefined;
    }
    if (!wasDown.current) return undefined;
    wasDown.current = false;
    setRestored(true);
    const t = setTimeout(() => setRestored(false), 3000);
    return () => clearTimeout(t);
  }, [down]);

  if (down) {
    return (
      <div className="bg-warning text-text-inverse px-4 py-1.5 text-small font-medium flex items-center justify-center gap-2" role="status">
        <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
        Reconnecting… live updates paused
      </div>
    );
  }
  if (restored) {
    return (
      <div className="bg-success text-text-inverse px-4 py-1.5 text-small font-medium flex items-center justify-center gap-2" role="status">
        <Wifi className="w-4 h-4 shrink-0" aria-hidden />
        Back online
      </div>
    );
  }
  return null;
}

/** "● TELEMETRY LIVE" style pill for headers. */
export function LiveIndicator({ className = '' }) {
  const { isConnected } = useSocket();
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${isConnected ? 'text-success' : 'text-warning'} ${className}`}
      role="status"
    >
      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-warning animate-pulse-gentle'}`} aria-hidden />
      {isConnected ? 'Live' : 'Reconnecting'}
    </span>
  );
}
