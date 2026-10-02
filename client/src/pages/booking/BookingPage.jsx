import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ambulance } from 'lucide-react';
import { BookingForm } from '../../features/booking/BookingForm';
import { bookingApi } from '../../features/booking/api';
import { forgetBooking, recallBooking } from '../../features/booking/activeBooking';
import { Card } from '../../components/Card';
import { LIVE_BOOKING_STATUSES } from '../../constants/booking';
import { trackPath } from '../../constants/routes';

/** Public: book an ambulance without an account. */
export function BookingPage() {
  const remembered = recallBooking();
  // A previous booking on this device that is still live gets a way back to its tracking page.
  const previous = useQuery({
    queryKey: ['booking', 'remembered', remembered],
    queryFn: () => bookingApi.track(remembered),
    enabled: !!remembered,
    retry: false,
  });
  const live = previous.data && LIVE_BOOKING_STATUSES.includes(previous.data.status) ? remembered : null;
  const stale = previous.isError || (!!previous.data && !live);
  useEffect(() => {
    if (stale) forgetBooking();
  }, [stale]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-text flex items-center gap-2">
          <Ambulance className="w-7 h-7 text-danger" aria-hidden /> Book an ambulance
        </h1>
        <p className="text-small text-text-muted mt-1">No account needed. We find the nearest available ambulance and alert a hospital with the right bed.</p>
      </div>
      {live && (
        <Card className="border-primary/30 bg-primary-soft/50" role="status">
          <p className="text-small text-text">
            You have a booking in progress on this device.{' '}
            <Link to={trackPath(live)} className="font-semibold text-primary hover:underline">
              Track it
            </Link>
          </p>
        </Card>
      )}
      <Card>
        <BookingForm activeToken={live} />
      </Card>
    </div>
  );
}
