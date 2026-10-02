import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { config } from '../../config';
import { CLIENT_EVENTS } from '../../constants/socketEvents';
import { useSocket } from '../../socket/SocketContext';

export const GPS_STATE = Object.freeze({
  OFF: 'OFF',
  WAITING: 'WAITING',
  SHARING: 'SHARING',
  DENIED: 'DENIED',
  UNSUPPORTED: 'UNSUPPORTED',
});

/**
 * While the ambulance is on duty, watch the device GPS and send positions over the socket at
 * most once per VITE_AMBULANCE_LOCATION_INTERVAL_SECONDS (default 10 s). The newest fix is
 * always the one sent: fixes arriving inside the window replace the pending one.
 * Mount it once in the ambulance layout so sharing continues across pages.
 */
export function useDutyLocationSharing() {
  const { user, refreshUser } = useAuth();
  const { socket, isConnected } = useSocket();
  const onDuty = !!user?.ambulance?.onDuty && user?.verificationStatus === 'VERIFIED';
  const [state, setState] = useState(GPS_STATE.OFF);
  const [lastSentAt, setLastSentAt] = useState(null);
  const latest = useRef(null);
  const lastSent = useRef(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!onDuty) {
      setState(GPS_STATE.OFF);
      return undefined;
    }
    if (!navigator.geolocation) {
      setState(GPS_STATE.UNSUPPORTED);
      return undefined;
    }
    setState(GPS_STATE.WAITING);
    const intervalMs = config.locationIntervalSeconds * 1000;

    const send = () => {
      clearTimeout(timer.current);
      timer.current = null;
      if (!latest.current || !socket.connected) return;
      const { lat, lng } = latest.current;
      lastSent.current = Date.now();
      socket.emit(CLIENT_EVENTS.AMBULANCE_LOCATION, { lat, lng }, (ack) => {
        if (ack?.success && ack.data?.stored) setLastSentAt(Date.now());
        // Duty was switched off elsewhere (another tab/device): pick up the real state.
        if (ack?.code === 'AMBULANCE_NOT_ON_DUTY') refreshUser().catch(() => {});
      });
    };

    const schedule = () => {
      const wait = lastSent.current + intervalMs - Date.now();
      if (wait <= 0) send();
      else if (!timer.current) timer.current = setTimeout(send, wait);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        latest.current = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
        setState(GPS_STATE.SHARING);
        schedule();
      },
      (err) => setState(err.code === 1 ? GPS_STATE.DENIED : GPS_STATE.WAITING),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    // After a reconnect, push the newest fix straight away (still within the throttle).
    const onConnect = () => schedule();
    socket.on('connect', onConnect);
    // A parked ambulance gets no new fixes, but the server only dispatches to positions younger than
    // AMBULANCE_LOCATION_MAX_AGE_SECONDS: re-send the last fix each interval while the watch is alive.
    const heartbeat = setInterval(schedule, intervalMs);
    return () => {
      clearInterval(heartbeat);
      navigator.geolocation.clearWatch(watchId);
      socket.off('connect', onConnect);
      clearTimeout(timer.current);
      timer.current = null;
      latest.current = null;
    };
  }, [onDuty, socket, refreshUser]);

  return { onDuty, state, lastSentAt, isConnected };
}
