import type { PlayerState } from '@/engine/player';
import { LAYER_DEFS, type Settings } from '@/engine/settings';
import { PATCHES } from '@/engine/patches';
import { SCALE_BY_ID, NOTE_NAMES, NOTE_SHARP, NOTE_FLAT, usesFlats } from '@/engine/theory';
import { getStyle } from '@/engine/styles';
import { cn } from '@/utils/cn';

const TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  intro: { label: 'Intro', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  verse: { label: 'Verse', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  build: { label: 'Build-up', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  chorus: { label: 'Chorus', cls: 'bg-pink-500/15 text-pink-300 border-pink-500/40' },
  bridge: { label: 'Bridge', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/40' },
  breakdown: { label: 'Breakdown', cls: 'bg-teal-500/15 text-teal-300 border-teal-500/40' },
};

export function keyLabel(key: number, scaleId: string | null): string {
  const sc = scaleId ? SCALE_BY_ID[scaleId as keyof typeof SCALE_BY_ID] : null;
  const flats = sc ? usesFlats(key, sc.steps[2] === 3) : false;
  const name = (flats ? NOTE_FLAT : NOTE_SHARP)[key] ?? NOTE_NAMES[key];
  return sc ? `${name} ${sc.name}` : name;
}

export function NowPlaying({ st, settings }: { st: PlayerState; settings: Settings }) {
  const idle = st.type === null;
  const ts = st.type ? TYPE_STYLE[st.type] : null;
  const style = getStyle(st.styleId || settings.style);
  const chord = st.chords[st.chordIdx] ?? '·';
  const progress = st.bars > 0 ? ((st.bar + 1) / st.bars) * 100 : 0;

  return (
    <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_1fr]">
      {/* Section + form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Now playing</span>
          <span className="text-xs text-slate-500">Movement {idle ? '–' : st.movement + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-lg border px-2.5 py-1 text-sm font-semibold', ts?.cls ?? 'border-slate-700 text-slate-500')}>
            {ts?.label ?? 'Ready'}
          </span>
          <span className="text-sm text-slate-400">{idle ? 'Waiting to compose…' : `Bar ${st.bar + 1} of ${st.bars}`}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1" aria-label="Recent sections">
          {st.history.slice(-9).map((h, k) => (
            <span key={`${h.idx}-${k}`} className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-medium', TYPE_STYLE[h.type].cls, h.idx === st.secIndex ? 'ring-1 ring-white/40' : 'opacity-60')}>
              {TYPE_STYLE[h.type].label}
            </span>
          ))}
          {st.history.length === 0 && <span className="text-[11px] text-slate-600">Form history appears here</span>}
        </div>
      </div>

      {/* Harmony */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Harmony</span>
          <span className="text-xs text-slate-500">
            {idle ? '–' : keyLabel(st.key, st.scale)} · {settings.meter}
          </span>
        </div>
        <div className="text-4xl font-bold tracking-tight text-white tabular-nums" aria-live="off">
          {idle ? '–' : chord}
        </div>
        <div className="mt-2 flex max-h-14 flex-wrap gap-1 overflow-hidden">
          {st.chords.map((c, i) => (
            <span key={i} className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums', i === st.chordIdx ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400')}>
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Energy + layers */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Intensity</span>
          <span className="text-xs text-slate-500">{idle ? '–' : `${Math.round(st.bpm)} BPM`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-pink-500 transition-[width] duration-700" style={{ width: `${Math.round(st.energy * 100)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {LAYER_DEFS.map((l, i) => {
            const on = st.active[i] && settings.layers[i].enabled && !idle;
            const patch = i === 0 ? style.kit : st.patches[i] ? (settings.layers[i].patch === 'auto' ? st.patches[i] : settings.layers[i].patch) : '';
            return (
              <div key={l.id} className={cn('rounded-lg border px-2 py-1 transition-opacity', on ? 'border-slate-700 opacity-100' : 'border-slate-800 opacity-40')}>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? l.color : '#475569' }} />
                  {l.name}
                </div>
                <div className="truncate text-[10px] text-slate-500">{i === 0 ? `${patch} kit` : (PATCHES[patch]?.name ?? '–')}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
