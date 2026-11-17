import type { ReactNode } from 'react';
import type { Status } from '@/engine/player';
import { getStyle } from '@/engine/styles';
import type { Settings } from '@/engine/settings';
import { cn } from '@/utils/cn';
import { IconButton, Slider } from './ui';

export type ViewMode = 'piano-roll' | 'legacy';

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
  iconActions,
  className,
  leading,
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
  iconActions?: boolean;
  className?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const playing = status === 'playing';
  const st = getStyle(s.style);
  const slim = Boolean(compact || iconActions);
  return (
    <div className={cn('rounded-2xl border border-slate-800 bg-slate-900/70', slim ? 'px-2.5 py-1.5' : 'p-3 sm:p-4', className)}>
      <div className={cn('flex flex-wrap items-center', iconActions ? 'gap-2' : 'gap-2.5 sm:gap-3')}>
        {leading}
        <button
          type="button"
          onClick={onPlayPause}
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-900/40 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300',
            iconActions ? 'h-9 w-9' : slim ? 'h-10 w-10' : 'h-14 w-14',
          )}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className={slim ? 'h-4 w-4' : 'h-6 w-6'} fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className={cn('ml-0.5', slim ? 'h-4 w-4' : 'h-6 w-6')} fill="currentColor" aria-hidden>
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>
        <IconButton
          onClick={onStop}
          label="Stop"
          title="Stop and rewind"
          disabled={status === 'stopped'}
          className={iconActions ? 'h-8 w-8 rounded-lg p-0' : slim ? 'px-2.5 py-1.5 text-xs' : undefined}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          {!iconActions && <span className="hidden sm:inline">Stop</span>}
        </IconButton>

        {/* Compact view switcher beside play controls */}
        <div
          role="group"
          aria-label="Viewing mode"
          className="inline-flex shrink-0 items-center rounded-xl border border-slate-700/80 bg-slate-950/90 p-0.5"
        >
          <button
            type="button"
            onClick={() => onViewMode('piano-roll')}
            aria-pressed={viewMode === 'piano-roll'}
            className={cn(
              'whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-400',
              iconActions ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
              viewMode === 'piano-roll' ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            Piano roll
          </button>
          <button
            type="button"
            onClick={() => onViewMode('legacy')}
            aria-pressed={viewMode === 'legacy'}
            className={cn(
              'whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-400',
              iconActions ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
              viewMode === 'legacy' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            Legacy
          </button>
        </div>

        <div className={cn('hidden bg-slate-800 sm:block', iconActions ? 'h-5 w-px' : 'mx-0.5 h-7 w-px')} />

        <div className={cn('flex flex-wrap', iconActions ? 'gap-1' : 'gap-1.5 sm:gap-2')}>
          <IconButton
            onClick={onRegenerate}
            label="New piece"
            title="New piece — compose from a new seed"
            className={iconActions ? 'h-8 w-8 rounded-lg p-0' : slim ? 'px-2.5 py-1.5 text-xs' : undefined}
          >
            <Icon d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
            {!iconActions && <span>New piece</span>}
          </IconButton>
          <IconButton
            onClick={onDirection}
            label="Change direction"
            title="Change direction — new chords, themes and feel from now"
            className={iconActions ? 'h-8 w-8 rounded-lg p-0' : slim ? 'px-2.5 py-1.5 text-xs' : undefined}
          >
            <Icon d="M5 12h14M13 6l6 6-6 6" />
            {!iconActions && <span className={slim ? 'hidden md:inline' : undefined}>Change direction</span>}
          </IconButton>
          <IconButton
            onClick={onNext}
            label="Next section"
            title="Next section — jump ahead"
            className={iconActions ? 'h-8 w-8 rounded-lg p-0' : slim ? 'px-2.5 py-1.5 text-xs' : undefined}
          >
            <Icon d="M5 5l9 7-9 7V5ZM19 5v14" />
            {!iconActions && <span className="hidden md:inline">Next section</span>}
          </IconButton>
          <IconButton
            onClick={onSurprise}
            label="Surprise me"
            title="Surprise me — random style, key, scale and tempo"
            className={iconActions ? 'h-8 w-8 rounded-lg p-0' : slim ? 'px-2.5 py-1.5 text-xs' : undefined}
          >
            <Icon d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
            {!iconActions && <span className="hidden md:inline">Surprise me</span>}
          </IconButton>
        </div>

        {iconActions ? (
          <div className="flex flex-wrap items-center gap-3 pl-1">
            <Slider
              label="Tempo"
              value={s.bpm}
              min={40}
              max={200}
              step={1}
              onChange={(v) => update({ bpm: v })}
              format={(v) => `${Math.round(v)}`}
              color={st.accent}
              inline
            />
            <Slider label="Vol" value={s.master} onChange={(v) => update({ master: v })} color="#34d399" inline />
          </div>
        ) : (
          <div className={cn('ml-auto grid w-full grid-cols-2 gap-3 sm:w-auto', slim ? 'sm:min-w-[18rem]' : 'sm:min-w-[22rem] sm:gap-4')}>
            <Slider
              label="Tempo"
              value={s.bpm}
              min={40}
              max={200}
              step={1}
              onChange={(v) => update({ bpm: v })}
              format={(v) => `${Math.round(v)} BPM`}
              color={st.accent}
              compact={slim}
              hint={undefined}
            />
            <Slider label="Master volume" value={s.master} onChange={(v) => update({ master: v })} color="#34d399" compact={slim} />
          </div>
        )}

        {trailing}
      </div>
    </div>
  );
}
