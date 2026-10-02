import { useAuth } from '../auth/useAuth';
import { useSocketEvent } from '../../socket/useSocketEvent';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import { useToast } from '../../components/Toast';

/** The account's own verification changed (admin decided) → refresh /auth/me and tell the user. */
export function useAccountVerification() {
  const { refreshUser } = useAuth();
  const { showToast } = useToast();
  useSocketEvent(SOCKET_EVENTS.VERIFICATION_UPDATED, async (payload) => {
    const user = await refreshUser().catch(() => null);
    if (!user) return;
    if (payload?.status === 'VERIFIED') showToast({ type: 'success', title: 'You are verified', message: 'Your account is now fully active.' });
    if (payload?.status === 'REJECTED') showToast({ type: 'error', title: 'Registration not approved', message: 'See the reason at the top of the page.' });
  });
}
