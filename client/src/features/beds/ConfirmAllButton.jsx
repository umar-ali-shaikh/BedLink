import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck } from 'lucide-react';
import { bedsApi } from './api';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useSocket } from '../../socket/SocketContext';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';

/** "Confirm all": refreshes freshness of every non-reserved bed without changing status. */
export function ConfirmAllButton({ hospitalId, className, size = 'lg' }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isConnected } = useSocket();
  const mutation = useMutation({
    mutationFn: () => bedsApi.confirmAll(hospitalId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.beds(hospitalId) });
      queryClient.invalidateQueries({ queryKey: qk.hospital(hospitalId) });
      showToast({ type: 'success', title: 'Availability confirmed', message: `${data.confirmed} beds marked as up to date.` });
    },
    onError: (err) => showToast({ type: 'error', title: 'Could not confirm', message: errorMessage(err) }),
  });
  return (
    <Button size={size} icon={CheckCheck} className={className} onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!isConnected} title={isConnected ? undefined : 'Reconnecting…'}>
      Confirm all beds are current
    </Button>
  );
}
