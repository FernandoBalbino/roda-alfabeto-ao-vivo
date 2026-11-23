// Sons sintetizados (Web Audio, sem arquivos), só na TV: o aluno fica sem som para a sala não virar barulho.
import { useSyncExternalStore } from 'react';

type Note = [freq: number, start: number, dur: number];
const NOTES = {
  tick: [[1250, 0, 0.03]],
  land: [[523, 0, 0.08], [659, 0.08, 0.08], [784, 0.16, 0.16]],
  count: [[880, 0, 0.07]],
  timeup: [[392, 0, 0.16], [330, 0.16, 0.16], [262, 0.32, 0.3]],
  type: [[1900, 0, 0.012]],
  ok: [[660, 0, 0.09], [880, 0.09, 0.18]],
  bad: [[247, 0, 0.12], [196, 0.12, 0.24]],
  fanfare: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.4]],
} satisfies Record<string, Note[]>;
export type SoundName = keyof typeof NOTES;

const KEY = 'roda-ao-vivo:mudo';
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();

export function play(name: SoundName, volume = 0.18) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.01;
    for (const [freq, start, dur] of NOTES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = name === 'tick' || name === 'type' ? 'square' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.02);
    }
  } catch {
    /* navegador sem Web Audio: segue sem som */
  }
}

export function toggleMuted() {
  muted = !muted;
  listeners.forEach((f) => f());
  try {
    localStorage.setItem(KEY, muted ? '1' : '0');
  } catch { /* sem storage */ }
}

export const useMuted = () => useSyncExternalStore((f) => (listeners.add(f), () => void listeners.delete(f)), () => muted);
