import React, { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { Button } from '../../components/Button';
import { bedApi } from './api';
import { useToast } from '../../components/Toast';

export function ConfirmAllButton({ hospitalId, onConfirmed, className }) {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleConfirm = async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    try {
      await bedApi.confirmAllBeds(hospitalId);
      showToast({
        title: 'Bed Data Refreshed',
        message: 'All bed availabilities confirmed. Freshness timestamp updated.',
        type: 'success',
      });
      if (onConfirmed) onConfirmed();
    } catch (err) {
      showToast({
        title: 'Update failed',
        message: err.message || 'Could not confirm bed availability.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="lg"
      icon={CheckCheck}
      isLoading={isLoading}
      onClick={handleConfirm}
      className={className}
    >
      Confirm All Availability
    </Button>
  );
}
