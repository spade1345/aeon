import { useEffect, useRef, useState } from 'react';
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
export type RollTab = 'live' | SettingsTab;

export function PianoRollStudio({
  s,
  st,
  player,
  rollTab,
  dockOpen,
  onTabClick,
  tabs,
  viewMode,
  onViewMode,
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
  rollTab: RollTab;
  dockOpen: boolean;
  onTabClick: (t: RollTab) => void;
  tabs: { id: SettingsTab; label: string }[];
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
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

  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState({ top: 68, bottom: 60 });

  useEffect(() => {
    const measure = () => {
      const rootEl = rootRef.current;
      if (!rootEl) return;
      const rootRect = rootEl.getBoundingClientRect();
      const topBottom = topRef.current ? topRef.current.getBoundingClientRect().bottom - rootRect.top + 8 : 68;
      const botTop = bottomRef.current ? rootRect.bottom - bottomRef.current.getBoundingClientRect().top + 8 : 60;
      setInsets((prev) =>
        Math.abs(prev.top - topBottom) < 1 && Math.abs(prev.bottom - botTop) < 1
          ? prev
          : { top: Math.round(topBottom), bottom: Math.round(botTop) },
      );
    };

    const ro = new ResizeObserver(measure);
    if (rootRef.current) ro.observe(rootRef.current);
    if (topRef.current) ro.observe(topRef.current);
    if (bottomRef.current) ro.observe(bottomRef.current);
    measure();
    const raf = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [dockOpen, rollTab, st.message]);

  const allTabs: { id: RollTab; label: string }[] = [{ id: 'live', label: 'Live & Mixer' }, ...tabs];

  return (
    <div ref={rootRef} className="fixed inset-0 overflow-hidden bg-[#070b14] text-slate-200">
      {/* Full-screen Piano Roll stage with safe vertical bounds between overlays */}
      <div className="absolute inset-0">
        <Visualizer
          player={player}
          status={st.status}
          perf={s.perf}
          bpm={st.bpm || s.bpm}
          className="block h-full w-full"
          showMeter={false}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      </div>

      {/* Floating HUD layer */}
      <div className="pointer-events-none relative z-10 flex h-full w-full flex-col justify-between p-2.5 sm:p-3">
        {/* Slim Single-Row Floating Top Transport */}
        <div ref={topRef} className="pointer-events-auto mx-auto w-full max-w-7xl shrink-0 space-y-2">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 px-2.5 py-1.5 shadow-2xl shadow-black/50 backdrop-blur-md">
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
              iconActions
              className="border-0 bg-transparent p-0"
              leading={
                <div className="mr-0.5 flex shrink-0 items-center gap-1.5">
                  <div className="h-7 w-7 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/90 shadow shadow-violet-900/40">
                    <img src="/assets/aistudio/logo_2f208861.png" alt="Aeon icon" referrerPolicy="no-referrer" className="h-full w-full scale-[1.28] object-contain" />
                  </div>
                  <span className="hidden text-sm font-bold tracking-tight text-white sm:inline">Aeon</span>
                </div>
              }
              trailing={
                <div className="ml-auto flex min-w-0 items-center gap-2 text-xs">
                  <span className="hidden truncate font-medium md:inline" style={{ color: style.accent }}>
                    {style.name}
                  </span>
                  <span className="hidden text-slate-600 xl:inline" aria-hidden="true">·</span>
                  <span className="hidden truncate text-slate-300 xl:inline">
                    {st.type ? keyLabel(st.key, st.scale) : 'Ready'}
                  </span>
                  <span className={cn('shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', badge.cls)}>
                    {badge.text}
                  </span>
                </div>
              }
            />
          </div>

          {st.message && (
            <div role="alert" className="rounded-xl border border-orange-500/40 bg-orange-950/90 px-4 py-2 text-xs text-orange-200 backdrop-blur-md">
              {st.message}
            </div>
          )}
        </div>

        {/* Unified Bottom Floating Tab Dock (panel expands above strip; clicking active tab collapses) */}
        <div ref={bottomRef} className="pointer-events-auto mx-auto w-full max-w-6xl shrink-0">
          <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/85 shadow-2xl shadow-black/60 backdrop-blur-md">
            {dockOpen && (
              <div role="tabpanel" className="max-h-[38vh] overflow-y-auto border-b border-slate-800/80 p-3.5 scroll-thin sm:p-4">
                {rollTab === 'live' && (
                  <div className="grid gap-4 lg:grid-cols-12">
                    <div className="space-y-3 lg:col-span-4">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold uppercase tracking-wider">Now playing</span>
                          <span className="tabular-nums">
                            Movement {idle ? '–' : st.movement + 1} · seed {st.seed}
                          </span>
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
                    </div>

                    <div className="space-y-2 border-t border-slate-800/80 pt-3 lg:col-span-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Layer mixer</div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                )}
                {rollTab === 'style' && <StylePanel s={s} onStyle={onStyle} />}
                {rollTab === 'composition' && <CompositionPanel s={s} update={update} />}
                {rollTab === 'instruments' && <InstrumentsPanel s={s} st={st} updateLayer={updateLayer} />}
                {rollTab === 'effects' && <EffectsPanel s={s} st={st} update={update} onSeed={onSeed} onReset={onReset} />}
                {rollTab === 'guide' && <GuidePanel />}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <div role="tablist" aria-label="Piano roll panels" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-thin">
                {allTabs.map((t) => {
                  const selected = dockOpen && rollTab === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={selected}
                      aria-expanded={selected}
                      title={selected ? `Collapse ${t.label}` : `Open ${t.label}`}
                      onClick={() => onTabClick(t.id)}
                      className={cn(
                        'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-400',
                        selected ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {!dockOpen && !idle && (
                <div className="hidden shrink-0 items-center gap-2 pr-1.5 text-[11px] text-slate-400 lg:flex">
                  <span className="font-semibold text-white tabular-nums">{chord}</span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="tabular-nums">Bar {st.bar + 1}/{st.bars}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
