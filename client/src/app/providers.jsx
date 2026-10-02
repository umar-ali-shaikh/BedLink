import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../features/auth/AuthContext';
import { SocketProvider } from '../socket/SocketContext';
import { ToastProvider } from '../components/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sockets keep data live; refetch on focus as a safety net.
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => count < 2 && !(err?.status >= 400 && err?.status < 500),
    },
    mutations: { retry: false },
  },
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
