import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { AppShell } from './AppShell';
import { ROUTES } from '../constants/routes';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { useSocketEvent } from '../socket/useSocketEvent';
import { useToast } from '../components/Toast';
import { verificationApi } from '../features/verification/api';

export const verificationKeys = { all: ['verifications'], summary: ['verifications', 'summary'] };

/** Admin = verification desk for self-registered hospitals and ambulances. */
export function AdminLayout() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const summary = useQuery({ queryKey: verificationKeys.summary, queryFn: verificationApi.summary, refetchInterval: 60_000 });
  const pending = (summary.data?.hospitals?.PENDING ?? 0) + (summary.data?.ambulances?.PENDING ?? 0);

  useSocketEvent(SOCKET_EVENTS.VERIFICATION_UPDATED, (payload) => {
    queryClient.invalidateQueries({ queryKey: verificationKeys.all });
    if (payload?.status === 'PENDING') {
      showToast({ type: 'info', title: `New ${payload.kind} registration`, message: 'Waiting for verification.' });
    }
  });

  const nav = [{ to: ROUTES.ADMIN_VERIFICATIONS, label: pending ? `Verifications (${pending})` : 'Verifications', icon: ShieldCheck }];
  return <AppShell nav={nav} hub="Admin" section="Verification desk" roleLabel="Administrator" />;
}
