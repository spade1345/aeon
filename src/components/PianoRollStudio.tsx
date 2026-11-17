import type { Player, PlayerState } from '@/engine/player';
import { PATCHES } from '@/engine/patches';
import { LAYER_DEFS, type LayerSettings, type Settings } from '@/engine/settings';
import { getStyle, type StyleId } from '@/engine/styles';
import { cn } from '@/utils/cn';
import { GuidePanel } from './GuidePanel';
import { keyLabel, TYPE_STYLE } from './NowPlaying';
import { CompositionPanel, EffectsPanel, InstrumentsPanel, StylePanel } from './Panels';
import { TransportBar, type ViewMode } from './TransportBar';
import { Visualizer } from './Visualizer';
import { Slider, Toggle } from './ui';

export type SettingsTab = 'style' | 'composition' | 'instruments' | 'effects' | 'guide';

export function PianoRollStudio({
  s,
  st,
  player,
  tab,
  setTab,
  tabs,
  viewMode,
  onViewMode,
  sideOpen,
  setSideOpen,
  bottomOpen,
  setBottomOpen,
  badge,
  update,
  updateLayer,
  onStyle,
  onPlayPause,
  onStop,
  onRegenerate,
  onDirection,
  onNext,
  onSurprise,
  onSeed,
  onReset,
}: {
  s: Settings;
  st: PlayerState;
  player: Player;
  tab: SettingsTab;
  setTab: (t: SettingsTab) => void;
  tabs: { id: SettingsTab; label: string }[];
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  sideOpen: boolean;
  setSideOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  bottomOpen: boolean;
  setBottomOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  badge: { text: string; cls: string };
  update: (p: Partial<Settings>) => void;
  updateLayer: (i: number, p: Partial<LayerSettings>) => void;
  onStyle: (id: StyleId) => void;
  onPlayPause: () => void;
  onStop: () => void;
  onRegenerate: () => void;
  onDirection: () => void;
  onNext: () => void;
  onSurprise: () => void;
  onSeed: (n: number) => void;
  onReset: () => void;
}) {
  const style = getStyle(st.styleId || s.style);
  const idle = st.type === null;
  const ts = st.type ? TYPE_STYLE[st.type] : null;
  const chord = st.chords[st.chordIdx] ?? '·';
  const progress = st.bars > 0 ? ((st.bar + 1) / st.bars) * 100 : 0;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#070b14] text-slate-200">
      {/* Full-screen Piano Roll stage */}
      <div className="absolute inset-0">
        <Visualizer
          player={player}
          status={st.status}
          perf={s.perf}
          bpm={st.bpm || s.bpm}
          className="block h-full w-full"
          showMeter={false}
        />
      </div>

      {/* Floating HUD layer */}
      <div className="pointer-events-none relative z-10 flex h-full w-full flex-col justify-between gap-2.5 p-2.5 sm:p-3.5">
        {/* Top Floating Transport & Status */}
        <div className="pointer-events-auto mx-auto w-full max-w-7xl shrink-0 space-y-2">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-md">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 12c2.5 0 2.5-6 5-6s2.5 12 5 12 2.5-6 5-6 1.5 0 3 0" />
                  </svg>
                </div>
                <span className="font-bold tracking-tight text-white">Aeon</span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="truncate font-medium text-slate-200" style={{ color: style.accent }}>
                  {style.name}
                </span>
                <span className="hidden text-slate-600 sm:inline" aria-hidden="true">·</span>
                <span className="hidden truncate text-slate-300 sm:inline">
                  {st.type ? keyLabel(st.key, st.scale) : 'Ready to compose'}
                </span>
                <span className="hidden text-slate-600 md:inline" aria-hidden="true">·</span>
                <span className="hidden font-mono text-[11px] text-slate-500 md:inline">seed {st.seed}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSideOpen((v) => !v)}
                  aria-pressed={sideOpen}
                  className={cn(
                    'whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-400',
                    sideOpen
                      ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                      : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-500',
                  )}
                >
                  {sideOpen ? 'Hide mixer' : 'Live & mixer'}
                </button>
                <button
                  type="button"
                  onClick={() => setBottomOpen((v) => !v)}
                  aria-pressed={bottomOpen}
                  className={cn(
                    'whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-400',
                    bottomOpen
                      ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                      : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-500',
                  )}
                >
                  {bottomOpen ? 'Hide settings' : 'Settings'}
                </button>
                <span className={cn('whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', badge.cls)}>
                  {badge.text}
                </span>
              </div>
            </div>

            <TransportBar
              s={s}
              status={st.status}
              viewMode={viewMode}
              onViewMode={onViewMode}
              update={update}
              onPlayPause={onPlayPause}
              onStop={onStop}
              onRegenerate={onRegenerate}
              onDirection={onDirection}
              onNext={onNext}
              onSurprise={onSurprise}
              compact
              className="border-0 bg-transparent p-0"
            />
          </div>

          {st.message && (
            <div role="alert" className="rounded-xl border border-orange-500/40 bg-orange-950/90 px-4 py-2 text-xs text-orange-200 backdrop-blur-md">
              {st.message}
            </div>
          )}
        </div>

        {/* Middle Floating Workspace: Collapsible Left Live & Mixer HUD over open canvas */}
        <div className="pointer-events-none flex min-h-0 flex-1 items-start justify-between gap-3">
          {sideOpen ? (
            <aside
              aria-label="Live composition and mixer"
              className="pointer-events-auto flex max-h-full w-72 flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/80 shadow-2xl shadow-black/50 backdrop-blur-md sm:w-80"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Live & mixer</span>
                <button
                  type="button"
                  onClick={() => setSideOpen(false)}
                  aria-label="Collapse live and mixer panel"
                  className="rounded-lg px-2 py-0.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
                >
                  ◂ Hide
                </button>
              </div>

              <div className="flex-1 space-y-3.5 overflow-y-auto p-3.5 scroll-thin">
                {/* Now Playing + Form */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wider">Now playing</span>
                    <span className="tabular-nums">Movement {idle ? '–' : st.movement + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-lg border px-2 py-0.5 text-xs font-semibold', ts?.cls ?? 'border-slate-700 text-slate-500')}>
                      {ts?.label ?? 'Ready'}
                    </span>
                    <span className="text-xs tabular-nums text-slate-300">
                      {idle ? 'Waiting to compose…' : `Bar ${st.bar + 1} of ${st.bars}`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  {st.history.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1" aria-label="Recent sections">
                      {st.history.slice(-7).map((h, k) => (
                        <span
                          key={`${h.idx}-${k}`}
                          className={cn(
                            'rounded border px-1.5 py-0.5 text-[10px] font-medium',
                            TYPE_STYLE[h.type].cls,
                            h.idx === st.secIndex ? 'ring-1 ring-white/40' : 'opacity-60',
                          )}
                        >
                          {TYPE_STYLE[h.type].label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Harmony & Intensity */}
                <div className="border-t border-slate-800/80 pt-3">
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold tracking-tight text-white tabular-nums">{idle ? '–' : chord}</div>
                    <div className="text-[11px] tabular-nums text-slate-400">
                      {idle ? '–' : `${Math.round(st.bpm)} BPM`} · {s.meter}
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {st.chords.slice(0, 8).map((c, i) => (
                      <span
                        key={i}
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                          i === st.chordIdx ? 'bg-violet-500 text-white' : 'bg-slate-800/90 text-slate-400',
                        )}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
                    <span>Energy</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-pink-500 transition-[width] duration-700"
                        style={{ width: `${Math.round(st.energy * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 9-Layer Mixer */}
                <div className="space-y-2 border-t border-slate-800/80 pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Instruments</div>
                  <div className="space-y-2">
                    {LAYER_DEFS.map((def, i) => {
                      const L = s.layers[i];
                      const active = st.active[i] && L.enabled && !idle;
                      const patchId = i === 0 ? style.kit : L.patch === 'auto' ? st.patches[i] : L.patch;
                      const patchLabel = i === 0 ? `${patchId} kit` : (PATCHES[patchId]?.name ?? 'Auto');
                      return (
                        <div key={def.id} className={cn('space-y-1 rounded-xl border border-slate-800/80 bg-slate-950/60 px-2.5 py-2', !L.enabled && 'opacity-55')}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: def.color, opacity: active ? 1 : 0.35 }} />
                              <span className="truncate text-xs font-semibold text-slate-100">{def.name}</span>
                              <span className="truncate text-[10px] text-slate-500">· {patchLabel}</span>
                            </div>
                            <Toggle small checked={L.enabled} onChange={(v) => updateLayer(i, { enabled: v })} label={undefined} />
                          </div>
                          <Slider label="Volume" value={L.volume} onChange={(v) => updateLayer(i, { volume: v })} color={def.color} compact />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          ) : (
            <button
              type="button"
              onClick={() => setSideOpen(true)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-md transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              <span>▸ Live & mixer</span>
              {!idle && (
                <>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="font-bold text-white tabular-nums">{chord}</span>
                </>
              )}
            </button>
          )}

          {/* Compact floating layer legend on top-right of open canvas */}
          <div className="hidden flex-wrap justify-end gap-x-3 gap-y-1 rounded-xl border border-slate-800/70 bg-slate-950/65 px-3 py-1.5 text-[10px] text-slate-400 backdrop-blur-sm lg:flex">
            {LAYER_DEFS.map((l) => (
              <span key={l.id} className="flex items-center gap-1 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
                {l.name}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Floating Collapsible Settings Dock */}
        <div className="pointer-events-auto mx-auto w-full max-w-6xl shrink-0">
          <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/85 shadow-2xl shadow-black/60 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <div role="tablist" aria-label="Settings" className="flex min-w-0 flex-1 gap-1 overflow-x-auto scroll-thin">
                {tabs.map((t) => {
                  const selected = bottomOpen && tab === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={selected}
                      onClick={() => {
                        setTab(t.id);
                        setBottomOpen(true);
                      }}
                      className={cn(
                        'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
                        selected ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setBottomOpen((v) => !v)}
                aria-expanded={bottomOpen}
                aria-label={bottomOpen ? 'Collapse settings dock' : 'Expand settings dock'}
                className="shrink-0 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
              >
                {bottomOpen ? '▾ Collapse' : '▴ Expand'}
              </button>
            </div>

            {bottomOpen && (
              <div role="tabpanel" className="max-h-[42vh] overflow-y-auto border-t border-slate-800/80 p-3.5 scroll-thin sm:p-4">
                {tab === 'style' && <StylePanel s={s} onStyle={onStyle} />}
                {tab === 'composition' && <CompositionPanel s={s} update={update} />}
                {tab === 'instruments' && <InstrumentsPanel s={s} st={st} updateLayer={updateLayer} />}
                {tab === 'effects' && <EffectsPanel s={s} st={st} update={update} onSeed={onSeed} onReset={onReset} />}
                {tab === 'guide' && <GuidePanel />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
