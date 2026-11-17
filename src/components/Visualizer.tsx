import { useEffect, useRef } from 'react';
import type { Player, Status } from '@/engine/player';
import { ROLL_N, MARK_N } from '@/engine/roll';
import { LAYER_DEFS, type PerfMode } from '@/engine/settings';

const COLORS = LAYER_DEFS.map((l) => l.color);
const DRUM_ROW = [0, 1, 1, 2, 2, 3, 3, 3]; // kick, snare, clap, hat, open, perc, tom, crash
const DRUM_COLORS = ['#fbbf24', '#fb923c', '#fde68a', '#fcd34d'];

/**
 * Scrolling piano roll. Reads the engine's ring buffers directly (no React state, no allocation),
 * redraws at a capped frame rate and only when the audio clock actually advanced.
 */
export function Visualizer({
  player,
  status,
  perf,
  bpm,
}: {
  player: Player;
  status: Status;
  perf: PerfMode;
  bpm: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ status, perf, bpm });
  live.current = { status, perf, bpm };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let lastNow = -1;
    let dirty = true;
    let rlo = 48;
    let rhi = 84;
    let level = 0;
    let bg: CanvasGradient | null = null;
    let fadeL: CanvasGradient | null = null;
    const roll = player.roll;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(10, r.width);
      h = Math.max(10, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0b1222');
      bg.addColorStop(1, '#070b14');
      fadeL = ctx.createLinearGradient(0, 0, w * 0.3, 0);
      fadeL.addColorStop(0, 'rgba(7,11,20,0.95)');
      fadeL.addColorStop(1, 'rgba(7,11,20,0)');
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const draw = (now: number, playing: boolean) => {
      const { bpm: tempo } = live.current;
      ctx.fillStyle = bg ?? '#070b14';
      ctx.fillRect(0, 0, w, h);
      const drumH = 40;
      const top = 10;
      const rollH = h - drumH - top - 8;
      const barDur = (4 * 60) / Math.max(40, tempo || 100);
      const win = Math.min(14, Math.max(6, barDur * 3));
      const px = w / win;
      const headX = w * 0.62;
      const tMin = now - headX / px - 0.5;
      const tMax = now + (w - headX) / px + 0.5;

      // adaptive pitch range
      let mn = 200;
      let mx = -1;
      for (let i = 0; i < ROLL_N; i++) {
        const t = roll.t[i];
        if (t < tMin || t > tMax) continue;
        const m = roll.m[i];
        if (m < 0) continue;
        if (m < mn) mn = m;
        if (m > mx) mx = m;
      }
      if (mx >= 0) {
        const tlo = Math.max(24, mn - 3);
        const thi = Math.min(108, Math.max(mx + 3, tlo + 24));
        rlo += (tlo - rlo) * 0.06;
        rhi += (thi - rhi) * 0.06;
      }
      const span = Math.max(12, rhi - rlo);
      const noteH = Math.max(3, Math.min(10, (rollH / span) * 0.85));

      // faint octave guides
      ctx.fillStyle = 'rgba(148,163,184,0.06)';
      for (let m = Math.ceil(rlo / 12) * 12; m < rhi; m += 12) {
        const y = top + ((rhi - m) / span) * rollH;
        ctx.fillRect(0, y, w, 1);
      }

      // beat / bar / section markers
      for (let i = 0; i < MARK_N; i++) {
        const t = roll.mt[i];
        const k = roll.mk[i];
        if (!k || t < tMin || t > tMax) continue;
        const x = headX + (t - now) * px;
        ctx.fillStyle = k === 3 ? 'rgba(244,114,182,0.55)' : k === 2 ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.09)';
        ctx.fillRect(x, top, k === 3 ? 2 : 1, h - top - 6);
      }

      // notes
      for (let i = 0; i < ROLL_N; i++) {
        const t = roll.t[i];
        if (t < tMin - 4 || t > tMax) continue;
        const m = roll.m[i];
        const l = roll.l[i];
        const vel = roll.v[i];
        if (m >= 0) {
          const x = headX + (t - now) * px;
          const wd = Math.max(2.5, roll.d[i] * px);
          if (x + wd < 0 || x > w) continue;
          const y = top + ((rhi - m) / span) * rollH - noteH / 2;
          const sounding = playing && t <= now && now < t + roll.d[i];
          ctx.globalAlpha = sounding ? 1 : 0.42 + 0.4 * vel;
          ctx.fillStyle = COLORS[l] ?? '#fff';
          ctx.fillRect(x, y, wd, noteH);
          if (sounding) {
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillRect(x, y, wd, 1.5);
          }
        } else {
          const row = DRUM_ROW[-1 - m] ?? 3;
          const x = headX + (t - now) * px;
          if (x < -6 || x > w) continue;
          const near = playing && Math.abs(t - now) < 0.07;
          ctx.globalAlpha = near ? 1 : 0.35 + 0.45 * vel;
          ctx.fillStyle = DRUM_COLORS[row];
          const rh = near ? 7 : 5;
          ctx.fillRect(x - 1.5, h - drumH + 4 + row * 9 - (rh - 5) / 2, 3.5, rh);
        }
      }
      ctx.globalAlpha = 1;

      if (fadeL) {
        ctx.fillStyle = fadeL;
        ctx.fillRect(0, 0, w * 0.3, h);
      }

      // drum lane label + divider
      ctx.fillStyle = 'rgba(148,163,184,0.15)';
      ctx.fillRect(0, h - drumH, w, 1);

      // playhead
      ctx.fillStyle = 'rgba(248,250,252,0.7)';
      ctx.fillRect(headX, top - 4, 1.5, h - top);

      // level meter
      const lv = Math.min(1, player.getLevel() * 3.2);
      level += (lv - level) * 0.4;
      ctx.fillStyle = 'rgba(30,41,59,0.9)';
      ctx.fillRect(w - 86, 10, 74, 5);
      ctx.fillStyle = level > 0.85 ? '#f87171' : '#34d399';
      ctx.fillRect(w - 86, 10, 74 * level, 5);

      if (!playing && now <= 0) {
        ctx.fillStyle = 'rgba(148,163,184,0.75)';
        ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press play, the music is composed live and never repeats', w / 2, h / 2 - 8);
        ctx.textAlign = 'start';
      }
    };

    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const { status: st, perf: pf } = live.current;
      const interval = pf === 'eco' ? 50 : 33;
      if (ts - last < interval - 3) return;
      last = ts;
      const playing = st === 'playing';
      const now = player.heardTime();
      if (!playing && !dirty && now === lastNow) return;
      lastNow = now;
      dirty = false;
      draw(now, playing);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [player]);

  return <canvas ref={ref} className="block h-60 w-full rounded-xl" aria-label="Live piano roll of the generated music" />;
}
