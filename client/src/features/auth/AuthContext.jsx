import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';
import { onUnauthorized } from '../../services/api';
import { socket } from '../../socket';
import { PANEL_ROLES } from '../../constants/routes';

const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: async () => null,
  register: async () => null,
  refreshUser: async () => null,
  logout: async () => {},
});

/** Only ambulance (DISPATCHER) and hospital accounts have a panel in this app. */
export const UNSUPPORTED_ROLE = 'UNSUPPORTED_ROLE';

/**
 * (Re)connect so the handshake carries the fresh cookie and the server joins our rooms.
 * Accounts with an unconfirmed email are refused by the socket server, so wait for that.
 */
function connectSocket(user) {
  if (socket.connected) socket.disconnect();
  if (user?.emailVerified === false) return;
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
        if (!PANEL_ROLES.includes(data.user.role)) return authApi.logout().catch(() => {});
        setUser(data.user);
        connectSocket(data.user);
        return undefined;
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

  const startSession = useCallback(async (data) => {
    if (!PANEL_ROLES.includes(data.user.role)) {
      await authApi.logout().catch(() => {});
      throw { code: UNSUPPORTED_ROLE, message: 'This account has no panel here. Sign in with an ambulance or hospital account.' };
    }
    setUser(data.user);
    connectSocket(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (credentials) => startSession(await authApi.login(credentials)), [startSession]);

  /** kind: 'ambulance' | 'hospital'. The server signs the new account in. */
  const register = useCallback(
    async (kind, body) =>
      startSession(await (kind === 'hospital' ? authApi.registerHospital(body) : authApi.registerAmbulance(body))),
    [startSession]
  );

  /** Google Identity Services credential → sign in (throws GOOGLE_ACCOUNT_NOT_FOUND for new emails). */
  const loginWithGoogle = useCallback(async (credential) => startSession(await authApi.google(credential)), [startSession]);

  /** Re-read /auth/me (e.g. to pick up a verification result). Connects the socket once the email is confirmed. */
  const refreshUser = useCallback(async () => {
    const data = await authApi.me();
    setUser((prev) => {
      if (prev?.emailVerified === false && data.user.emailVerified) connectSocket(data.user);
      return data.user;
    });
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, isLoading, login, loginWithGoogle, register, refreshUser, logout }),
    [user, isLoading, login, loginWithGoogle, register, refreshUser, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
