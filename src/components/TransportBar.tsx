import type { Status } from '@/engine/player';
import { getStyle } from '@/engine/styles';
import type { Settings } from '@/engine/settings';
import { cn } from '@/utils/cn';
import { IconButton, Slider } from './ui';

const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

export function TransportBar({
  s,
  status,
  update,
  onPlayPause,
  onStop,
  onRegenerate,
  onDirection,
  onNext,
  onSurprise,
}: {
  s: Settings;
  status: Status;
  update: (p: Partial<Settings>) => void;
  onPlayPause: () => void;
  onStop: () => void;
  onRegenerate: () => void;
  onDirection: () => void;
  onNext: () => void;
  onSurprise: () => void;
}) {
  const playing = status === 'playing';
  const st = getStyle(s.style);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPlayPause}
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-900/40 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>
        <IconButton onClick={onStop} label="Stop" title="Stop and rewind" disabled={status === 'stopped'}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          <span className="hidden sm:inline">Stop</span>
        </IconButton>

        <div className="mx-1 hidden h-8 w-px bg-slate-800 sm:block" />

        <div className="flex flex-wrap gap-2">
          <IconButton onClick={onRegenerate} label="New piece" title="Compose a brand-new piece from a new seed">
            <Icon d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
            <span>New piece</span>
          </IconButton>
          <IconButton onClick={onDirection} label="Change direction" title="New chords, themes and feel, continuing from now">
            <Icon d="M5 12h14M13 6l6 6-6 6" />
            <span>Change direction</span>
          </IconButton>
          <IconButton onClick={onNext} label="Next section" title="Jump to the next section">
            <Icon d="M5 5l9 7-9 7V5ZM19 5v14" />
            <span className="hidden md:inline">Next section</span>
          </IconButton>
          <IconButton onClick={onSurprise} label="Surprise me" title="Random style, key, scale and tempo">
            <Icon d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
            <span className="hidden md:inline">Surprise me</span>
          </IconButton>
        </div>

        <div className="ml-auto grid w-full grid-cols-2 gap-4 sm:w-auto sm:min-w-[22rem]">
          <Slider
            label="Tempo"
            value={s.bpm}
            min={40}
            max={200}
            step={1}
            onChange={(v) => update({ bpm: v })}
            format={(v) => `${Math.round(v)} BPM`}
            color={st.accent}
            hint={undefined}
          />
          <Slider label="Master volume" value={s.master} onChange={(v) => update({ master: v })} color="#34d399" />
        </div>
      </div>
    </div>
  );
}
