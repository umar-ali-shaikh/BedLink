import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from './api';
import { socket } from '../../socket';

const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await authApi.getMe();
        if (response?.data?.user) {
          setUser(response.data.user);
          socket.connect();
          if (response.data.user.role === 'HOSPITAL' && response.data.user.hospitalId) {
            socket.emit('join:hospital', { hospitalId: response.data.user.hospitalId });
          } else if (response.data.user.role === 'DISPATCHER') {
            socket.emit('join:dispatcher', { userId: response.data.user._id });
          }
        }
      } catch (err) {
        setUser(null);
        socket.disconnect();
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    if (res?.data?.user) {
      setUser(res.data.user);
      socket.connect();
      if (res.data.user.role === 'HOSPITAL' && res.data.user.hospitalId) {
        socket.emit('join:hospital', { hospitalId: res.data.user.hospitalId });
      } else if (res.data.user.role === 'DISPATCHER') {
        socket.emit('join:dispatcher', { userId: res.data.user._id });
      }
      return res.data.user;
    }
    return null;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      socket.disconnect();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
