import { useEffect, useRef } from 'react';
import { socket } from './index';

/** Subscribe to a server event; the latest handler is always used (no resubscribe churn). */
export function useSocketEvent(event, handler) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!event) return undefined;
    const listener = (payload) => ref.current?.(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [event]);
}

/** Subscribe several events to one handler: handler(eventName, payload). */
export function useSocketEvents(events, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  const key = events.join('|');

  useEffect(() => {
    const listeners = events.map((event) => {
      const listener = (payload) => ref.current?.(event, payload);
      socket.on(event, listener);
      return [event, listener];
    });
    return () => listeners.forEach(([event, listener]) => socket.off(event, listener));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
