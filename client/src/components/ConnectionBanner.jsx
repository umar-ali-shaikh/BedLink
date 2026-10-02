import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useSocket } from '../socket/SocketContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { cn } from '../utils/cn';

export function ConnectionBanner() {
  const { isConnected } = useSocket();
  const isOnline = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  const isDisconnected = !isOnline || !isConnected;

  useEffect(() => {
    if (isDisconnected) {
      setWasOffline(true);
      setShowRestored(false);
    } else if (wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDisconnected, wasOffline]);

  if (isDisconnected) {
    return (
      <div className="bg-warning text-text-inverse px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm animate-in slide-in-from-top-2">
        <WifiOff className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
        <span>Reconnecting to real-time coordination service… live updates paused.</span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="bg-success text-text-inverse px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm animate-in slide-in-from-top-2 fade-out duration-300">
        <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Connected. Live emergency updates active.</span>
      </div>
    );
  }

  return null;
}
