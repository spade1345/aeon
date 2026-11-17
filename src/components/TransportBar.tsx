import type { ReactNode } from 'react';
import type { Status } from '@/engine/player';
import { getStyle } from '@/engine/styles';
import type { Settings } from '@/engine/settings';
import { cn } from '@/utils/cn';
import { IconButton, Slider } from './ui';

export type ViewMode = 'standard' | 'piano-roll';

const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

export function TransportBar({
  s,
  status,
  viewMode,
  onViewMode,
  update,
  onPlayPause,
  onStop,
  onRegenerate,
  onDirection,
  onNext,
  onSurprise,
  compact,
  className,
  trailing,
}: {
  s: Settings;
  status: Status;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  update: (p: Partial<Settings>) => void;
  onPlayPause: () => void;
  onStop: () => void;
  onRegenerate: () => void;
  onDirection: () => void;
  onNext: () => void;
  onSurprise: () => void;
  compact?: boolean;
  className?: string;
  trailing?: ReactNode;
}) {
  const playing = status === 'playing';
  const st = getStyle(s.style);
  return (
    <div className={cn('rounded-2xl border border-slate-800 bg-slate-900/70', compact ? 'px-3 py-2' : 'p-3 sm:p-4', className)}>
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onPlayPause}
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-900/40 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300',
            compact ? 'h-10 w-10' : 'h-14 w-14',
          )}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className={compact ? 'h-5 w-5' : 'h-6 w-6'} fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className={cn('ml-0.5', compact ? 'h-5 w-5' : 'h-6 w-6')} fill="currentColor" aria-hidden>
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>
        <IconButton onClick={onStop} label="Stop" title="Stop and rewind" disabled={status === 'stopped'} className={compact ? 'px-2.5 py-1.5 text-xs' : undefined}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          <span className="hidden sm:inline">Stop</span>
        </IconButton>

        {/* Compact view switcher beside play controls */}
        <div
          role="group"
          aria-label="Viewing mode"
          className="inline-flex shrink-0 items-center rounded-xl border border-slate-700/80 bg-slate-950/90 p-0.5"
        >
          <button
            type="button"
            onClick={() => onViewMode('standard')}
            aria-pressed={viewMode === 'standard'}
            className={cn(
              'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-400',
              viewMode === 'standard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => onViewMode('piano-roll')}
            aria-pressed={viewMode === 'piano-roll'}
            className={cn(
              'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-400',
              viewMode === 'piano-roll' ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            Piano roll
          </button>
        </div>

        <div className="mx-0.5 hidden h-7 w-px bg-slate-800 sm:block" />

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <IconButton onClick={onRegenerate} label="New piece" title="Compose a brand-new piece from a new seed" className={compact ? 'px-2.5 py-1.5 text-xs' : undefined}>
            <Icon d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
            <span>New piece</span>
          </IconButton>
          <IconButton onClick={onDirection} label="Change direction" title="New chords, themes and feel, continuing from now" className={compact ? 'px-2.5 py-1.5 text-xs' : undefined}>
            <Icon d="M5 12h14M13 6l6 6-6 6" />
            <span className={compact ? 'hidden md:inline' : undefined}>Change direction</span>
          </IconButton>
          <IconButton onClick={onNext} label="Next section" title="Jump to the next section" className={compact ? 'px-2.5 py-1.5 text-xs' : undefined}>
            <Icon d="M5 5l9 7-9 7V5ZM19 5v14" />
            <span className="hidden md:inline">Next section</span>
          </IconButton>
          <IconButton onClick={onSurprise} label="Surprise me" title="Random style, key, scale and tempo" className={compact ? 'px-2.5 py-1.5 text-xs' : undefined}>
            <Icon d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
            <span className="hidden md:inline">Surprise me</span>
          </IconButton>
        </div>

        <div className={cn('ml-auto grid w-full grid-cols-2 gap-3 sm:w-auto', compact ? 'sm:min-w-[18rem]' : 'sm:min-w-[22rem] sm:gap-4')}>
          <Slider
            label="Tempo"
            value={s.bpm}
            min={40}
            max={200}
            step={1}
            onChange={(v) => update({ bpm: v })}
            format={(v) => `${Math.round(v)} BPM`}
            color={st.accent}
            compact={compact}
            hint={undefined}
          />
          <Slider label="Master volume" value={s.master} onChange={(v) => update({ master: v })} color="#34d399" compact={compact} />
        </div>

        {trailing}
      </div>
    </div>
  );
}
