const KEY = 'bedlink.booking';

/** The caller's last tracking link on this device, so a closed tab can find its booking again. */
export function rememberBooking(token) {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* storage blocked — the tracking link in the address bar still works */
  }
}

export function recallBooking() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function forgetBooking() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
