// User-facing settings model, defaults, style application and persistence.
import { getStyle, hasStyle, type StyleId } from './styles';
import type { MeterId, ScaleId } from './theory';

export interface LayerSettings {
  enabled: boolean;
  volume: number; // 0..1
  patch: string; // 'auto' or a patch id
  brightness: number; // 0..1 (0.5 neutral)
  attack: number; // 0..1 (0.5 neutral)
  release: number; // 0..1 (0.5 neutral)
  wave: string; // 'auto' | sine | triangle | sawtooth | square
}

export type PerfMode = 'eco' | 'balanced' | 'high';

export interface Settings {
  style: StyleId;
  bpm: number;
  keyRoot: number;
  scale: ScaleId;
  meter: MeterId;
  melodic: number;
  harmonic: number;
  rhythmic: number;
  randomness: number;
  evolution: number;
  energy: number;
  swing: number;
  autoKey: boolean;
  autoInstruments: boolean;
  tempoDrift: boolean;
  master: number;
  reverb: number;
  delay: number;
  chorus: number;
  perf: PerfMode;
  layers: LayerSettings[];
}

export const LAYER_DEFS = [
  { id: 'drums', name: 'Drums', desc: 'Kick, snare, hats, percussion', color: '#fbbf24' },
  { id: 'bass', name: 'Bass', desc: 'Basslines', color: '#fb7185' },
  { id: 'chords', name: 'Harmony', desc: 'Chords, pads, comping', color: '#a78bfa' },
  { id: 'arp', name: 'Arpeggio', desc: 'Broken-chord patterns', color: '#22d3ee' },
  { id: 'lead', name: 'Lead', desc: 'Motif-driven melody', color: '#34d399' },
  { id: 'texture', name: 'Texture', desc: 'Echoes and sparkle', color: '#7dd3fc' },
  { id: 'counter', name: 'Countermelody', desc: 'Responsive inner voice', color: '#f472b6' },
  { id: 'drone', name: 'Drone', desc: 'Sustained harmonic anchor', color: '#818cf8' },
  { id: 'mallet', name: 'Mallet', desc: 'Polyrhythmic pitched percussion', color: '#fb923c' },
] as const;

const DEFAULT_VOLUMES = [0.8, 0.85, 0.75, 0.55, 0.7, 0.5, 0.62, 0.52, 0.58];

function defaultLayers(): LayerSettings[] {
  return DEFAULT_VOLUMES.map((v) => ({
    enabled: true,
    volume: v,
    patch: 'auto',
    brightness: 0.5,
    attack: 0.5,
    release: 0.5,
    wave: 'auto',
  }));
}

/** Modest hardware (few cores / little memory, typical of low-end Chromebooks) starts in Eco mode. */
function detectPerf(): PerfMode {
  try {
    const n = navigator as Navigator & { deviceMemory?: number };
    if ((n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory <= 2)) return 'eco';
  } catch {
    /* non-browser */
  }
  return 'balanced';
}

export function defaultSettings(styleId: StyleId = 'synthwave'): Settings {
  const st = getStyle(styleId);
  return {
    style: st.id,
    bpm: st.bpm[2],
    keyRoot: 9, // A
    scale: st.scales[0],
    meter: st.meters[0],
    melodic: 0.5,
    harmonic: 0.5,
    rhythmic: 0.5,
    randomness: 0.4,
    evolution: 0.5,
    energy: 0.55,
    swing: st.swing,
    autoKey: true,
    autoInstruments: true,
    tempoDrift: false,
    master: 0.9,
    reverb: st.fx.reverb,
    delay: st.fx.delay,
    chorus: st.fx.chorus,
    perf: detectPerf(),
    layers: defaultLayers(),
  };
}

/** Apply a style preset: tempo, scale, meter, swing and fx follow the style; sound-design resets to "auto". */
export function applyStyle(s: Settings, id: StyleId): Settings {
  const st = getStyle(id);
  return {
    ...s,
    style: st.id,
    bpm: st.bpm[2],
    scale: st.scales[0],
    meter: st.meters.includes(s.meter) ? s.meter : st.meters[0],
    swing: st.swing,
    reverb: st.fx.reverb,
    delay: st.fx.delay,
    chorus: st.fx.chorus,
    layers: s.layers.map((l) => ({ ...l, patch: 'auto', wave: 'auto' })),
  };
}

const KEY = 'aeon-synth-settings-v1';

export function loadSettings(): Settings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<Settings>;
    const merged: Settings = { ...base, ...p } as Settings;
    if (!hasStyle(merged.style)) return base;
    merged.layers = base.layers.map((l, i) => ({ ...l, ...(p.layers?.[i] ?? {}) }));
    merged.bpm = Math.min(220, Math.max(40, Number(merged.bpm) || base.bpm));
    return merged;
  } catch {
    return base;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}
