import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';
import { onUnauthorized } from '../../services/api';
import { socket } from '../../socket';

const AuthContext = createContext({ user: null, isLoading: true, login: async () => null, logout: async () => {} });

/** (Re)connect so the handshake carries the fresh cookie and the server joins our rooms. */
function connectSocket() {
  if (socket.connected) socket.disconnect();
  socket.connect();
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        connectSocket();
      })
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const clearSession = useCallback(() => {
    socket.disconnect();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  // Expired cookie (8 h) → back to login.
  useEffect(() => onUnauthorized(clearSession), [clearSession]);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setUser(data.user);
    connectSocket();
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
