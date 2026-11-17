import { useState } from 'react';
import { KIT_LIST, LAYER_PATCHES, PATCHES, type KitId } from '@/engine/patches';
import {
  createCustomStyleId,
  getAllStyles,
  getStyle,
  normalizeStyleDef,
  type ArpPat,
  type BassMode,
  type CompMode,
  type StyleDef,
} from '@/engine/styles';
import { METER_LIST, SCALES, clamp, type MeterId, type ScaleId } from '@/engine/theory';
import { cn } from '@/utils/cn';
import { Select, Slider } from './ui';

const ACCENT_SWATCHES = [
  '#f472b6',
  '#a78bfa',
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#fb923c',
  '#f87171',
  '#84cc16',
  '#818cf8',
  '#67e8f9',
];

const KICK_MODES: { value: StyleDef['drums']['kick']; label: string }[] = [
  { value: 'four', label: 'Four-on-the-floor' },
  { value: 'strong', label: 'Strong beats' },
  { value: 'break', label: 'Breakbeat' },
  { value: 'sparse', label: 'Sparse' },
  { value: 'none', label: 'None (no kick)' },
];

const SNARE_MODES: { value: StyleDef['drums']['snare']; label: string }[] = [
  { value: 'backbeat', label: 'Backbeat' },
  { value: 'half', label: 'Half-time' },
  { value: 'none', label: 'None' },
];

const BACKBEAT_MODES: { value: StyleDef['drums']['backbeat']; label: string }[] = [
  { value: 'snare', label: 'Snare' },
  { value: 'clap', label: 'Clap' },
  { value: 'both', label: 'Snare + clap' },
];

const HAT_MODES: { value: StyleDef['drums']['hat']; label: string }[] = [
  { value: 'eighth', label: '8th notes' },
  { value: 'sixteenth', label: '16th notes' },
  { value: 'offbeat', label: 'Off-beat open' },
  { value: 'ride', label: 'Swung ride' },
  { value: 'sparse', label: 'Sparse' },
  { value: 'none', label: 'None' },
];

const BASS_MODES: { value: BassMode; label: string }[] = [
  { value: 'groove', label: 'Syncopated groove' },
  { value: 'pulse', label: 'Pulsing 8ths' },
  { value: 'offbeat', label: 'Off-beat bounce' },
  { value: 'sustain', label: 'Sustained roots' },
  { value: 'walk', label: 'Walking bass' },
];

const COMP_MODES: { value: CompMode; label: string }[] = [
  { value: 'sustain', label: 'Sustained pads/chords' },
  { value: 'stab', label: 'Rhythmic stabs' },
  { value: 'offbeat', label: 'Off-beat skank' },
  { value: 'alberti', label: 'Alberti figure' },
];

const ARP_PATS: { value: ArpPat; label: string }[] = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'updown', label: 'Up / down' },
  { value: 'converge', label: 'Converge' },
  { value: 'thirds', label: 'Thirds' },
];

const PATCH_SLOTS: { key: keyof StyleDef['patches']; layerIdx: number; label: string }[] = [
  { key: 'bass', layerIdx: 1, label: 'Bass' },
  { key: 'chords', layerIdx: 2, label: 'Harmony' },
  { key: 'arp', layerIdx: 3, label: 'Arpeggio' },
  { key: 'lead', layerIdx: 4, label: 'Lead' },
  { key: 'texture', layerIdx: 5, label: 'Texture' },
  { key: 'counter', layerIdx: 6, label: 'Countermelody' },
  { key: 'drone', layerIdx: 7, label: 'Drone' },
  { key: 'mallet', layerIdx: 8, label: 'Mallet' },
];

const PRESENCE_OPTIONS = [
  { value: 0.05, label: 'Always active' },
  { value: 0.3, label: 'Normal' },
  { value: 0.55, label: 'High energy' },
  { value: 1.5, label: 'Disabled' },
];

function nearestPresence(v: number): number {
  let best = PRESENCE_OPTIONS[0].value;
  let dist = Infinity;
  for (const o of PRESENCE_OPTIONS) {
    const d = Math.abs(o.value - v);
    if (d < dist) {
      dist = d;
      best = o.value;
    }
  }
  return best;
}

function cloneFromTemplate(templateId: string, existing?: StyleDef): StyleDef {
  if (existing) return normalizeStyleDef(JSON.parse(JSON.stringify(existing)) as StyleDef);
  const src = normalizeStyleDef(JSON.parse(JSON.stringify(getStyle(templateId))) as StyleDef);
  return {
    ...src,
    id: '',
    name: `${src.name} Remix`,
    blurb: src.blurb,
    custom: true,
  };
}

export function StyleCreator({
  initialStyleId,
  editingStyle,
  onSave,
  onCancel,
}: {
  initialStyleId: string;
  editingStyle?: StyleDef | null;
  onSave: (def: StyleDef) => void;
  onCancel: () => void;
}) {
  const [templateId, setTemplateId] = useState(editingStyle?.id ?? initialStyleId);
  const [draft, setDraft] = useState<StyleDef>(() => cloneFromTemplate(initialStyleId, editingStyle ?? undefined));
  const [error, setError] = useState('');

  const allStyles = getAllStyles();
  const isEditing = Boolean(editingStyle);

  const setField = <K extends keyof StyleDef>(k: K, v: StyleDef[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const toggleScale = (id: ScaleId) => {
    setDraft((d) => {
      const has = d.scales.includes(id);
      if (has && d.scales.length <= 1) return d;
      return { ...d, scales: has ? d.scales.filter((x) => x !== id) : [...d.scales, id] };
    });
  };

  const toggleMeter = (id: MeterId) => {
    setDraft((d) => {
      const has = d.meters.includes(id);
      if (has && d.meters.length <= 1) return d;
      return { ...d, meters: has ? d.meters.filter((x) => x !== id) : [...d.meters, id] };
    });
  };

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tpl = cloneFromTemplate(id);
    setDraft((d) => ({
      ...tpl,
      id: d.id,
      name: isEditing ? d.name : tpl.name,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError('Give your style a name.');
      return;
    }
    const minBpm = clamp(Math.round(draft.bpm[0]), 40, 200);
    const maxBpm = clamp(Math.round(draft.bpm[1]), minBpm, 220);
    const defBpm = clamp(Math.round(draft.bpm[2]), minBpm, maxBpm);
    const id = isEditing && editingStyle ? editingStyle.id : createCustomStyleId(name);
    onSave(
      normalizeStyleDef({
        ...draft,
        id,
        name,
        blurb: draft.blurb.trim() || 'Custom procedural style',
        bpm: [minBpm, maxBpm, defBpm],
        custom: true,
      }),
    );
  };

  return (
    <form onSubmit={handleSave} className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white">{isEditing ? `Edit style · ${editingStyle?.name}` : 'Create custom style'}</h3>
          <p className="text-xs text-slate-400">
            Configure rhythm, harmony, instruments, and effects. Saved locally in your browser.
          </p>
        </div>
        {!isEditing && (
          <div className="w-full sm:w-56">
            <Select
              label="Base template"
              value={templateId}
              options={allStyles.map((st) => ({ value: st.id, label: st.name }))}
              onChange={handleTemplateChange}
            />
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        {/* Column 1: Identity + Tempo & Feel */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Identity & Tempo</div>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-slate-300">Style name</div>
              <input
                type="text"
                maxLength={36}
                value={draft.name}
                onChange={(e) => {
                  setError('');
                  setField('name', e.target.value);
                }}
                placeholder="e.g. Midnight Trip-Hop"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-400"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-slate-300">Short description</div>
              <input
                type="text"
                maxLength={72}
                value={draft.blurb}
                onChange={(e) => setField('blurb', e.target.value)}
                placeholder="Deep sub-bass, swung breakbeats, moody brass"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-400"
              />
            </label>
            <div>
              <div className="mb-1.5 text-xs font-medium text-slate-300">Accent colour</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {ACCENT_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setField('accent', c)}
                    aria-label={`Select accent colour ${c}`}
                    className={cn(
                      'h-6 w-6 rounded-full border transition-transform',
                      draft.accent === c ? 'scale-110 border-white ring-2 ring-white/40' : 'border-slate-700 hover:scale-105',
                    )}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={draft.accent}
                  onChange={(e) => setField('accent', e.target.value)}
                  aria-label="Custom accent colour"
                  className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-slate-950 p-0.5"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <div className="mb-1 text-[11px] font-medium text-slate-400">Min BPM</div>
                <input
                  type="number"
                  min={40}
                  max={200}
                  value={draft.bpm[0]}
                  onChange={(e) => {
                    const mn = clamp(Number(e.target.value) || 60, 40, 200);
                    setField('bpm', [mn, Math.max(mn, draft.bpm[1]), clamp(draft.bpm[2], mn, Math.max(mn, draft.bpm[1]))]);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100 outline-none focus:border-violet-400"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[11px] font-medium text-slate-400">Default BPM</div>
                <input
                  type="number"
                  min={40}
                  max={220}
                  value={draft.bpm[2]}
                  onChange={(e) => {
                    const def = clamp(Number(e.target.value) || 100, 40, 220);
                    setField('bpm', [Math.min(draft.bpm[0], def), Math.max(draft.bpm[1], def), def]);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100 outline-none focus:border-violet-400"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[11px] font-medium text-slate-400">Max BPM</div>
                <input
                  type="number"
                  min={40}
                  max={220}
                  value={draft.bpm[1]}
                  onChange={(e) => {
                    const mx = clamp(Number(e.target.value) || 140, draft.bpm[0], 220);
                    setField('bpm', [draft.bpm[0], mx, clamp(draft.bpm[2], draft.bpm[0], mx)]);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100 outline-none focus:border-violet-400"
                />
              </label>
            </div>
            <Slider label="Default swing" value={draft.swing} onChange={(v) => setField('swing', v)} color={draft.accent} compact />
            <Slider label="Sidechain ducking" value={draft.duck} max={0.8} onChange={(v) => setField('duck', v)} color={draft.accent} compact />
            <Slider label="Chord extensions (7th / 9th)" value={draft.ext} onChange={(v) => setField('ext', v)} color={draft.accent} compact />
          </div>
        </div>

        {/* Column 2: Groove, Rhythm & Scales */}
        <div className="space-y-4">
          <div className="space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Drums & Groove</div>
            <div className="grid grid-cols-2 gap-2.5">
              <Select
                label="Drum kit"
                value={draft.kit}
                options={KIT_LIST.map((k) => ({ value: k.id, label: k.label }))}
                onChange={(v: KitId) => setField('kit', v)}
              />
              <Select
                label="Kick pattern"
                value={draft.drums.kick}
                options={KICK_MODES}
                onChange={(v) => setField('drums', { ...draft.drums, kick: v })}
              />
              <Select
                label="Snare placement"
                value={draft.drums.snare}
                options={SNARE_MODES}
                onChange={(v) => setField('drums', { ...draft.drums, snare: v })}
              />
              <Select
                label="Backbeat voice"
                value={draft.drums.backbeat}
                options={BACKBEAT_MODES}
                onChange={(v) => setField('drums', { ...draft.drums, backbeat: v })}
              />
              <Select
                label="Hi-hat / ride"
                value={draft.drums.hat}
                options={HAT_MODES}
                onChange={(v) => setField('drums', { ...draft.drums, hat: v })}
              />
              <Select
                label="Swing grid"
                value={draft.swingGrid}
                options={[
                  { value: 1, label: '16th shuffle' },
                  { value: 2, label: '8th jazz swing' },
                ]}
                onChange={(v: 1 | 2) => setField('swingGrid', v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Select
                label="Bass style"
                value={draft.bass[0]}
                options={BASS_MODES}
                onChange={(v: BassMode) => setField('bass', [v])}
              />
              <Select
                label="Harmony comping"
                value={draft.comp[0]}
                options={COMP_MODES}
                onChange={(v: CompMode) => setField('comp', [v])}
              />
              <Select
                label="Arp pattern"
                value={draft.arp.pats[0]}
                options={ARP_PATS}
                onChange={(v: ArpPat) => setField('arp', { ...draft.arp, pats: [v] })}
              />
              <Select
                label="Arp rate"
                value={draft.arp.rate}
                options={[
                  { value: 1, label: '16th notes' },
                  { value: 2, label: '8th notes' },
                ]}
                onChange={(v: 1 | 2) => setField('arp', { ...draft.arp, rate: v })}
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="text-xs font-medium text-slate-300">Preferred scales</div>
            <div className="flex flex-wrap gap-1.5">
              {SCALES.map((sc) => {
                const on = draft.scales.includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => toggleScale(sc.id)}
                    className={cn(
                      'rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap',
                      on ? 'border-violet-400 bg-violet-500/20 text-violet-200' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600',
                    )}
                  >
                    {sc.name}
                  </button>
                );
              })}
            </div>
            <div className="pt-1 text-xs font-medium text-slate-300">Preferred time signatures</div>
            <div className="flex flex-wrap gap-1.5">
              {METER_LIST.map((m) => {
                const on = draft.meters.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMeter(m)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-[11px] font-medium tabular-nums transition-colors',
                      on ? 'border-violet-400 bg-violet-500/20 text-violet-200' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600',
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Instruments & Default FX */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Instruments & Activity</div>
            <div className="space-y-2">
              <div className="grid grid-cols-[90px_1fr_110px] items-center gap-2 text-[11px] text-slate-500">
                <span>Layer</span>
                <span>Primary patch</span>
                <span>Activity</span>
              </div>
              <div className="grid grid-cols-[90px_1fr_110px] items-center gap-2">
                <span className="text-xs font-medium text-slate-300">Drums</span>
                <span className="truncate text-xs text-slate-500 capitalize">{draft.kit} kit</span>
                <select
                  aria-label="Drums activity"
                  value={nearestPresence(draft.min[0])}
                  onChange={(e) => {
                    const next = draft.min.slice();
                    next[0] = parseFloat(e.target.value);
                    setField('min', next);
                  }}
                  className="field rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-violet-400"
                >
                  {PRESENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {PATCH_SLOTS.map((slot) => {
                const pool = LAYER_PATCHES[slot.layerIdx];
                const curPatch = draft.patches[slot.key][0] ?? pool[0];
                return (
                  <div key={slot.key} className="grid grid-cols-[90px_1fr_110px] items-center gap-2">
                    <span className="truncate text-xs font-medium text-slate-300">{slot.label}</span>
                    <select
                      aria-label={`${slot.label} primary patch`}
                      value={curPatch}
                      onChange={(e) => {
                        const chosen = e.target.value;
                        const rest = pool.filter((id) => id !== chosen).slice(0, 2);
                        setField('patches', { ...draft.patches, [slot.key]: [chosen, ...rest] });
                      }}
                      className="field min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-violet-400"
                    >
                      {pool.map((id) => (
                        <option key={id} value={id}>
                          {PATCHES[id]?.name ?? id}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={`${slot.label} activity`}
                      value={nearestPresence(draft.min[slot.layerIdx] ?? 0.4)}
                      onChange={(e) => {
                        const next = draft.min.slice();
                        next[slot.layerIdx] = parseFloat(e.target.value);
                        setField('min', next);
                      }}
                      className="field rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-violet-400"
                    >
                      {PRESENCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Default Effects</div>
            <Slider label="Reverb" value={draft.fx.reverb} onChange={(v) => setField('fx', { ...draft.fx, reverb: v })} color="#7dd3fc" compact />
            <Slider label="Delay" value={draft.fx.delay} onChange={(v) => setField('fx', { ...draft.fx, delay: v })} color="#22d3ee" compact />
            <Slider label="Chorus" value={draft.fx.chorus} onChange={(v) => setField('fx', { ...draft.fx, chorus: v })} color="#a78bfa" compact />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 focus-visible:outline-2 focus-visible:outline-violet-300"
        >
          {isEditing ? 'Save & apply style' : 'Create & apply style'}
        </button>
      </div>
    </form>
  );
}
