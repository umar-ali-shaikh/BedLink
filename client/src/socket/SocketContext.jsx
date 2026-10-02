import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from './index';

const SocketContext = createContext({ socket, isConnected: false, hasConnected: false });

/**
 * Tracks the connection and, after a reconnect, refetches everything so a client that
 * missed events while offline catches up (DESIGN.md §6 "Offline / reconnecting").
 */
export function SocketProvider({ children }) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [hasConnected, setHasConnected] = useState(socket.connected);

  useEffect(() => {
    let connectedBefore = socket.connected;
    const onConnect = () => {
      setIsConnected(true);
      setHasConnected(true);
      if (connectedBefore) queryClient.invalidateQueries();
      connectedBefore = true;
    };
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
    };
  }, [queryClient]);

  return <SocketContext.Provider value={{ socket, isConnected, hasConnected }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
