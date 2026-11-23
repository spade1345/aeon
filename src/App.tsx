import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { initialSettings, player } from '@/engine/instance';
import { applyStyle, defaultSettings, LAYER_DEFS, saveSettings, type LayerSettings, type Settings } from '@/engine/settings';
import { getAllStyles, getStyle, type StyleId } from '@/engine/styles';
import { lerp } from '@/engine/theory';
import { GuidePanel } from '@/components/GuidePanel';
import { CompositionPanel, EffectsPanel, InstrumentsPanel, StylePanel } from '@/components/Panels';
import { NowPlaying, keyLabel } from '@/components/NowPlaying';
import { PianoRollStudio, type RollTab, type SettingsTab } from '@/components/PianoRollStudio';
import { OfflineIndicator, PWAInstallButton } from '@/components/PWAControls';
import { TransportBar, type ViewMode } from '@/components/TransportBar';
import { Visualizer } from '@/components/Visualizer';
import { cn } from '@/utils/cn';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'style', label: 'Style' },
  { id: 'composition', label: 'Composition' },
  { id: 'instruments', label: 'Instruments' },
  { id: 'effects', label: 'Effects & performance' },
  { id: 'guide', label: 'How does this work?' },
];

const VALID_ROLL_TABS: RollTab[] = ['live', 'style', 'composition', 'instruments', 'effects', 'guide'];

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  playing: { text: 'Composing live', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  paused: { text: 'Paused', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  stopped: { text: 'Ready', cls: 'bg-slate-500/15 text-slate-300 border-slate-600' },
  blocked: { text: 'Audio blocked', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/40' },
  error: { text: 'Error', cls: 'bg-red-500/15 text-red-300 border-red-500/40' },
};

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

const VIEW_KEY = 'aeon-ui-view-v1';
interface ViewPrefs {
  viewMode: ViewMode;
  dockOpen: boolean;
  rollTab: RollTab;
}

function loadViewPrefs(): ViewPrefs {
  const defaults: ViewPrefs = { viewMode: 'piano-roll', dockOpen: false, rollTab: 'live' };
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<ViewPrefs & { bottomOpen?: boolean; viewMode?: string }>;
    return {
      viewMode: p.viewMode === 'legacy' ? 'legacy' : 'piano-roll',
      dockOpen: typeof p.dockOpen === 'boolean' ? p.dockOpen : typeof p.bottomOpen === 'boolean' ? p.bottomOpen : defaults.dockOpen,
      rollTab: p.rollTab && VALID_ROLL_TABS.includes(p.rollTab) ? p.rollTab : defaults.rollTab,
    };
  } catch {
    return defaults;
  }
}

export default function App() {
  const [s, setS] = useState<Settings>(initialSettings);
  const [initialPrefs] = useState<ViewPrefs>(loadViewPrefs);
  const [tab, setTab] = useState<SettingsTab>(() => (initialPrefs.rollTab === 'live' ? 'style' : initialPrefs.rollTab));
  const [viewMode, setViewMode] = useState<ViewMode>(initialPrefs.viewMode);
  const [dockOpen, setDockOpen] = useState<boolean>(initialPrefs.dockOpen);
  const [rollTab, setRollTab] = useState<RollTab>(initialPrefs.rollTab);
  const st = useSyncExternalStore(player.subscribe, player.getSnapshot);

  // push settings into the engine immediately; persist (debounced)
  useEffect(() => {
    player.setSettings(s);
    const id = window.setTimeout(() => saveSettings(s), 400);
    return () => window.clearTimeout(id);
  }, [s]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify({ viewMode, dockOpen, rollTab }));
    } catch {
      /* storage unavailable */
    }
  }, [viewMode, dockOpen, rollTab]);

  const onRollTabClick = useCallback(
    (next: RollTab) => {
      if (dockOpen && rollTab === next) {
        setDockOpen(false);
        return;
      }
      setRollTab(next);
      if (next !== 'live') setTab(next);
      setDockOpen(true);
    },
    [dockOpen, rollTab],
  );

  const update = useCallback((p: Partial<Settings>) => setS((prev) => ({ ...prev, ...p })), []);
  const updateLayer = useCallback(
    (i: number, p: Partial<LayerSettings>) =>
      setS((prev) => ({ ...prev, layers: prev.layers.map((l, k) => (k === i ? { ...l, ...p } : l)) })),
    [],
  );
  const onStyle = useCallback((id: StyleId) => setS((prev) => applyStyle(prev, id)), []);

  const onPlayPause = useCallback(() => {
    if (player.getSnapshot().status === 'playing') player.pause();
    else void player.play();
  }, []);

  const onSurprise = useCallback(() => {
    const all = getAllStyles();
    const candidates = all.filter((x) => x.id !== s.style);
    const def = pick(candidates.length ? candidates : all);
    setS((prev) => ({
      ...applyStyle(prev, def.id),
      keyRoot: Math.floor(Math.random() * 12),
      scale: pick(def.scales),
      meter: Math.random() < 0.7 ? def.meters[0] : pick(def.meters),
      bpm: Math.round(lerp(def.bpm[0], def.bpm[1], Math.random())),
    }));
    player.regenerate();
  }, [s.style]);

  const onReset = useCallback(() => {
    setS(defaultSettings());
    player.regenerate();
  }, []);

  // Space toggles play / pause unless a form control has focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.code !== 'Space' || !t) return;
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(t.tagName)) return;
      e.preventDefault();
      onPlayPause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPlayPause]);

  const style = getStyle(s.style);
  const badge = STATUS_LABEL[st.status];

  if (viewMode === 'piano-roll') {
    return (
      <PianoRollStudio
        s={s}
        st={st}
        player={player}
        rollTab={rollTab}
        dockOpen={dockOpen}
        onTabClick={onRollTabClick}
        tabs={TABS}
        viewMode={viewMode}
        onViewMode={setViewMode}
        badge={badge}
        update={update}
        updateLayer={updateLayer}
        onStyle={onStyle}
        onPlayPause={onPlayPause}
        onStop={() => player.stop()}
        onRegenerate={() => player.regenerate()}
        onDirection={() => player.changeDirection()}
        onNext={() => player.nextSection()}
        onSurprise={onSurprise}
        onSeed={(n) => player.setSeed(n)}
        onReset={onReset}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200">
      <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-5">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/90 shadow-lg shadow-violet-900/40">
              <img src="/assets/aistudio/logo_2f208861.png" alt="Aeon icon" referrerPolicy="no-referrer" className="h-full w-full scale-[1.28] object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-white">Aeon</h1>
              <p className="text-xs text-slate-400">Infinite algorithmic music synthesizer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PWAInstallButton />
            <span className="hidden rounded-lg border border-slate-800 px-2.5 py-1 font-mono text-[11px] text-slate-500 sm:inline">seed {st.seed}</span>
            <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', badge.cls)}>{badge.text}</span>
          </div>
        </header>

        {st.message && (
          <div role="alert" className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-2.5 text-sm text-orange-200">
            {st.message}
          </div>
        )}

        {/* Visualiser */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-1.5">
          <Visualizer player={player} status={st.status} perf={s.perf} bpm={st.bpm || s.bpm} />
          <div className="pointer-events-none absolute top-3.5 left-4 flex flex-wrap items-center gap-2 text-[11px] font-medium">
            <span className="rounded-md px-2 py-0.5 text-slate-900" style={{ background: style.accent }}>
              {style.name}
            </span>
            <span className="rounded-md bg-slate-900/80 px-2 py-0.5 text-slate-300">{st.type ? keyLabel(st.key, st.scale) : 'Not started'}</span>
          </div>
          <div className="pointer-events-none absolute bottom-3.5 left-4 hidden flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 sm:flex">
            {LAYER_DEFS.map((l) => (
              <span key={l.id} className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
                {l.name}
              </span>
            ))}
          </div>
        </div>

        <TransportBar
          s={s}
          status={st.status}
          viewMode={viewMode}
          onViewMode={setViewMode}
          update={update}
          onPlayPause={onPlayPause}
          onStop={() => player.stop()}
          onRegenerate={() => player.regenerate()}
          onDirection={() => player.changeDirection()}
          onNext={() => player.nextSection()}
          onSurprise={onSurprise}
        />

        <NowPlaying st={st} settings={s} />

        {/* Settings */}
        <div>
          <div role="tablist" aria-label="Settings" className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-slate-900/70 p-1 scroll-thin">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                  tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            {tab === 'style' && <StylePanel s={s} onStyle={onStyle} />}
            {tab === 'composition' && <CompositionPanel s={s} update={update} />}
            {tab === 'instruments' && <InstrumentsPanel s={s} st={st} updateLayer={updateLayer} />}
            {tab === 'effects' && <EffectsPanel s={s} st={st} update={update} onSeed={(n) => player.setSeed(n)} onReset={onReset} />}
            {tab === 'guide' && <GuidePanel />}
          </div>
        </div>

        <footer className="pb-4 text-center text-[11px] text-slate-600">
          Every note is generated live by a procedural composer (motifs, chord grammar, form model) and a Web Audio synth. Nothing is pre-recorded.
        </footer>
      </div>
      <OfflineIndicator />
    </div>
  );
}
