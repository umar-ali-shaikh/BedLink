/**
 * Short alert tone + vibration for incoming requests (DESIGN.md §11). Browsers need one
 * user gesture before audio plays, so the sound toggle doubles as that gesture.
 */
const KEY = 'bedlink.sound';
let ctx = null;

export const isSoundEnabled = () => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage blocked — keep in-memory default */
  }
  if (on) unlockAudio();
}

export function unlockAudio() {
  try {
    ctx = ctx ?? new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

export function playAlert() {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if (!isSoundEnabled() || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  [0, 0.22].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 0 ? 880 : 1175;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.2);
  });
}
