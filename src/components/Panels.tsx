import { useState } from 'react';
import { LAYER_DEFS, type LayerSettings, type PerfMode, type Settings } from '@/engine/settings';
import { LAYER_PATCHES, PATCHES } from '@/engine/patches';
import {
  deleteCustomStyle,
  getAllStyles,
  getStyle,
  isCustomStyle,
  saveCustomStyle,
  type StyleDef,
  type StyleId,
} from '@/engine/styles';
import { METER_LIST, SCALES, type MeterId, type ScaleId } from '@/engine/theory';
import type { PlayerState } from '@/engine/player';
import { cn } from '@/utils/cn';
import { StyleCreator } from './StyleCreator';
import { Card, Segmented, Select, Slider, Toggle } from './ui';

const KEY_OPTIONS = ['C', 'C♯ / D♭', 'D', 'D♯ / E♭', 'E', 'F', 'F♯ / G♭', 'G', 'G♯ / A♭', 'A', 'A♯ / B♭', 'B'].map((label, value) => ({
  value,
  label,
}));
const WAVES = [
  { value: 'auto', label: 'Patch default' },
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sawtooth', label: 'Sawtooth' },
  { value: 'square', label: 'Square' },
];

type Update = (p: Partial<Settings>) => void;
type UpdateLayer = (i: number, p: Partial<LayerSettings>) => void;

export function StylePanel({ s, onStyle }: { s: Settings; onStyle: (id: StyleId) => void }) {
  const [styles, setStyles] = useState<StyleDef[]>(() => getAllStyles());
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editing, setEditing] = useState<StyleDef | null>(null);
  const [templateId, setTemplateId] = useState<string>(s.style);

  const refreshStyles = () => setStyles(getAllStyles());

  const openCreate = (fromId: string = s.style) => {
    setEditing(null);
    setTemplateId(fromId);
    setCreatorOpen(true);
  };

  const openEdit = (st: StyleDef) => {
    setEditing(st);
    setTemplateId(st.id);
    setCreatorOpen(true);
  };

  const handleSave = (def: StyleDef) => {
    const saved = saveCustomStyle(def);
    refreshStyles();
    setCreatorOpen(false);
    setEditing(null);
    onStyle(saved.id);
  };

  const handleDelete = (st: StyleDef) => {
    deleteCustomStyle(st.id);
    refreshStyles();
    if (editing?.id === st.id) {
      setCreatorOpen(false);
      setEditing(null);
    }
    if (s.style === st.id) onStyle('synthwave');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-400">
          <span>{styles.length} styles</span>
          <span aria-hidden="true"> · </span>
          <span>Pick a genre or create your own</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openCreate(s.style)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-colors hover:border-violet-400 hover:bg-slate-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-violet-400"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create style
          </button>
        </div>
      </div>

      {creatorOpen && (
        <StyleCreator
          key={editing ? editing.id : `new-${templateId}`}
          initialStyleId={templateId}
          editingStyle={editing}
          onSave={handleSave}
          onCancel={() => {
            setCreatorOpen(false);
            setEditing(null);
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {styles.map((st) => {
          const active = st.id === s.style;
          const custom = isCustomStyle(st.id);
          return (
            <div
              key={st.id}
              className={cn(
                'group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-colors',
                active ? 'border-transparent bg-slate-800' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900',
              )}
              style={active ? { boxShadow: `inset 0 0 0 2px ${st.accent}` } : undefined}
            >
              <button
                type="button"
                onClick={() => onStyle(st.id)}
                aria-pressed={active}
                className="w-full text-left focus-visible:outline-2 focus-visible:outline-violet-400 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: st.accent }} />
                  <span className="truncate text-sm font-semibold text-slate-100">{st.name}</span>
                </div>
                <div className="mt-1 text-[11px] leading-snug text-slate-400">{st.blurb}</div>
              </button>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] tabular-nums text-slate-500">
                <span>
                  {st.bpm[0]}–{st.bpm[1]} BPM{custom ? ' · Custom' : ''}
                </span>
                {custom && (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(st)}
                      className="font-medium text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(st)}
                      className="font-medium text-slate-500 hover:text-red-300 underline-offset-2 hover:underline"
                    >
                      Delete
                    </button>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompositionPanel({ s, update }: { s: Settings; update: Update }) {
  const st = getStyle(s.style);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Key, scale & meter">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Key" value={s.keyRoot} options={KEY_OPTIONS} onChange={(v) => update({ keyRoot: v })} />
          <Select
            label="Time signature"
            value={s.meter}
            options={METER_LIST.map((m) => ({ value: m, label: m }))}
            onChange={(v: MeterId) => update({ meter: v })}
          />
        </div>
        <div className="mt-3">
          <Select
            label="Scale / mode"
            value={s.scale}
            options={SCALES.map((sc) => ({ value: sc.id, label: sc.name }))}
            onChange={(v: ScaleId) => update({ scale: v })}
          />
        </div>
        <div className="mt-3 text-[11px] leading-snug text-slate-500">
          {st.name} favours {st.scales.slice(0, 3).map((id) => SCALES.find((x) => x.id === id)?.name).join(', ')}. Any combination works.
        </div>
        <div className="mt-4 space-y-3 border-t border-slate-800 pt-3">
          <Toggle label="Evolve key" hint="Modulate to related keys between movements" checked={s.autoKey} onChange={(v) => update({ autoKey: v })} />
          <Toggle label="Evolve instruments" hint="Swap patches as the music develops" checked={s.autoInstruments} onChange={(v) => update({ autoInstruments: v })} />
          <Toggle label="Tempo drift" hint="Slow, subtle tempo variation per section" checked={s.tempoDrift} onChange={(v) => update({ tempoDrift: v })} />
        </div>
      </Card>

      <Card title="Complexity">
        <div className="space-y-3">
          <Slider label="Melodic complexity" value={s.melodic} onChange={(v) => update({ melodic: v })} color="#34d399" hint="Leaps, ornaments and wandering contours" />
          <Slider label="Harmonic complexity" value={s.harmonic} onChange={(v) => update({ harmonic: v })} color="#a78bfa" hint="7th/9th chords, secondary dominants, borrowed chords" />
          <Slider label="Rhythmic complexity" value={s.rhythmic} onChange={(v) => update({ rhythmic: v })} color="#fbbf24" hint="Syncopation, density, polyrhythmic arps" />
        </div>
      </Card>

      <Card title="Variation & evolution">
        <div className="space-y-3">
          <Slider label="Randomness / variation" value={s.randomness} onChange={(v) => update({ randomness: v })} color="#f472b6" hint="How far each repeat departs from the theme" />
          <Slider label="Evolution speed" value={s.evolution} onChange={(v) => update({ evolution: v })} color="#22d3ee" hint="Section length, how often the piece changes" />
          <Slider label="Intensity" value={s.energy} onChange={(v) => update({ energy: v })} color="#fb7185" hint="Centre of the energy arc; more layers join as it rises" />
          <Slider label="Swing" value={s.swing} onChange={(v) => update({ swing: v })} color="#fb923c" hint="Shuffle feel (grid depends on style)" />
        </div>
      </Card>
    </div>
  );
}

function LayerCard({ i, s, st, updateLayer }: { i: number; s: Settings; st: PlayerState; updateLayer: UpdateLayer }) {
  const [open, setOpen] = useState(false);
  const def = LAYER_DEFS[i];
  const L = s.layers[i];
  const style = getStyle(s.style);
  const playing = st.active[i] && L.enabled && st.type !== null;
  const pool = LAYER_PATCHES[i];
  return (
    <div className={cn('rounded-2xl border bg-slate-900/70 p-3 transition-colors', L.enabled ? 'border-slate-800' : 'border-slate-800/60 opacity-70')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: def.color, opacity: playing ? 1 : 0.35 }} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100">{def.name}</div>
            <div className="truncate text-[11px] text-slate-500">{def.desc}</div>
          </div>
        </div>
        <Toggle small checked={L.enabled} onChange={(v) => updateLayer(i, { enabled: v })} label={undefined} />
      </div>
      <div className="mt-2">
        <Slider label="Volume" value={L.volume} onChange={(v) => updateLayer(i, { volume: v })} color={def.color} compact />
      </div>
      {i === 0 ? (
        <div className="mt-2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs text-slate-400">
          Kit: <span className="font-medium capitalize text-slate-200">{style.kit}</span> (follows style)
        </div>
      ) : (
        <>
          <div className="mt-2">
            <Select
              value={L.patch}
              options={[
                { value: 'auto', label: `Auto${L.patch === 'auto' && st.patches[i] ? `: ${PATCHES[st.patches[i]]?.name ?? ''}` : ''}` },
                ...pool.map((id) => ({ value: id, label: PATCHES[id]?.name ?? id })),
              ]}
              onChange={(v) => updateLayer(i, { patch: v })}
            />
          </div>
          <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-[11px] font-medium text-slate-400 hover:text-slate-200" aria-expanded={open}>
            {open ? '▾' : '▸'} Sound design
          </button>
          {open && (
            <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
              <Select label="Oscillator" value={L.wave} options={WAVES} onChange={(v) => updateLayer(i, { wave: v })} />
              <Slider label="Filter brightness" value={L.brightness} onChange={(v) => updateLayer(i, { brightness: v })} color={def.color} compact />
              <Slider label="Attack" value={L.attack} onChange={(v) => updateLayer(i, { attack: v })} color={def.color} compact />
              <Slider label="Release" value={L.release} onChange={(v) => updateLayer(i, { release: v })} color={def.color} compact />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function InstrumentsPanel({ s, st, updateLayer }: { s: Settings; st: PlayerState; updateLayer: UpdateLayer }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {LAYER_DEFS.map((_, i) => (
        <LayerCard key={i} i={i} s={s} st={st} updateLayer={updateLayer} />
      ))}
    </div>
  );
}

const PERF: { value: PerfMode; label: string; desc: string }[] = [
  { value: 'eco', label: 'Eco', desc: 'One oscillator per note (FM patches keep their modulator), no chorus, short reverb, 20 fps visuals. Lowest CPU; meant for older Chromebooks.' },
  { value: 'balanced', label: 'Balanced', desc: 'Detuned oscillators and full effects with a polyphony budget.' },
  { value: 'high', label: 'High', desc: 'Longer reverb and a larger polyphony budget.' },
];

export function EffectsPanel({
  s,
  st,
  update,
  onSeed,
  onReset,
}: {
  s: Settings;
  st: PlayerState;
  update: Update;
  onSeed: (seed: number) => void;
  onReset: () => void;
}) {
  const [seedText, setSeedText] = useState('');
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Effects">
        <div className="space-y-3">
          <Slider label="Reverb" value={s.reverb} onChange={(v) => update({ reverb: v })} color="#7dd3fc" hint="Shared convolution reverb" />
          <Slider label="Delay" value={s.delay} onChange={(v) => update({ delay: v })} color="#22d3ee" hint="Tempo-synced ping-pong (dotted eighth)" />
          <Slider label="Chorus" value={s.chorus} onChange={(v) => update({ chorus: v })} color="#a78bfa" hint={s.perf === 'eco' ? 'Disabled in Eco mode' : 'Stereo widening for pads and leads'} />
        </div>
      </Card>

      <Card title="Performance">
        <Segmented value={s.perf} options={PERF.map((p) => ({ value: p.value, label: p.label }))} onChange={(v) => update({ perf: v })} />
        <p className="mt-2 text-[11px] leading-snug text-slate-500">{PERF.find((p) => p.value === s.perf)?.desc}</p>
        {st.autoEco && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">
            Scheduling stalls were detected, so polyphony was reduced automatically to keep playback smooth.
          </p>
        )}
        <p className="mt-3 text-[11px] leading-snug text-slate-500">
          Audio is scheduled ahead on a background timer, voices are budgeted and released as soon as they finish, and the visualiser stops drawing when paused or hidden.
        </p>
      </Card>

      <Card title="Seed & preferences">
        <div className="text-xs text-slate-400">
          Current seed: <span className="font-mono text-slate-200">{st.seed}</span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">The same seed and settings always compose the same piece.</p>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(seedText.trim());
            if (Number.isFinite(n) && n >= 0) {
              onSeed(Math.floor(n));
              setSeedText('');
            }
          }}
        >
          <input
            value={seedText}
            onChange={(e) => setSeedText(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="Enter a seed number"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-400"
            aria-label="Seed"
          />
          <button type="submit" className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-600">
            Compose
          </button>
        </form>
        <button type="button" onClick={onReset} className="mt-4 text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline">
          Reset all settings to defaults
        </button>
      </Card>
    </div>
  );
}
