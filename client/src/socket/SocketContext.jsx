import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from './index';

const SocketContext = createContext({
  socket,
  isConnected: false,
  connectionError: null,
});

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setConnectionError(null);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onConnectError(err) {
      setIsConnected(false);
      setConnectionError(err.message || 'Socket connection failed');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // If already connected
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
