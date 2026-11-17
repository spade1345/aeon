// Instrument patch definitions (pure data) and drum kits.

export type Wave = OscillatorType | 'pulse25' | 'pulse12';

export interface OscSpec {
  type: Wave;
  mult: number; // frequency multiplier
  detune: number; // cents
  gain: number;
}

export interface Patch {
  id: string;
  name: string;
  oscs: OscSpec[];
  /** Simple 2-operator FM: modulator is applied to oscs[0] */
  fm?: { ratio: number; index: number; sus: number; decay: number };
  /** Lowpass with key-tracking and an envelope (env in octaves, + closes down, - opens up) */
  filter?: { cutoff: number; kt: number; q: number; env: number; decay: number };
  env: { a: number; d: number; s: number; r: number };
  gain: number;
  /** vibrato depth in cents (shared LFO) */
  vib?: number;
  /** minimum gate time (seconds) so percussive patches ring naturally */
  hold?: number;
}

const o = (type: Wave, detune = 0, gain = 1, mult = 1): OscSpec => ({ type, mult, detune, gain });

export const PATCHES: Record<string, Patch> = {
  // ---- pads / sustained
  warmPad: {
    id: 'warmPad',
    name: 'Warm Pad',
    oscs: [o('sawtooth', -9), o('sawtooth', 9)],
    filter: { cutoff: 1300, kt: 0.55, q: 0.6, env: -1.2, decay: 1.2 },
    env: { a: 0.55, d: 1.0, s: 0.85, r: 1.6 },
    gain: 0.26,
  },
  glassPad: {
    id: 'glassPad',
    name: 'Glass Pad',
    oscs: [o('triangle', -5), o('sine', 5, 0.6, 2)],
    filter: { cutoff: 5200, kt: 0.5, q: 0.5, env: -0.5, decay: 1.5 },
    env: { a: 0.9, d: 1.0, s: 0.8, r: 2.2 },
    gain: 0.4,
  },
  strings: {
    id: 'strings',
    name: 'Strings',
    oscs: [o('sawtooth', -12), o('sawtooth', 11)],
    filter: { cutoff: 2600, kt: 0.6, q: 0.5, env: -0.6, decay: 0.6 },
    env: { a: 0.35, d: 0.6, s: 0.85, r: 0.9 },
    gain: 0.22,
    vib: 6,
  },
  organ: {
    id: 'organ',
    name: 'Drawbar Organ',
    oscs: [o('sine'), o('sine', 0, 0.55, 2), o('sine', 0, 0.3, 3)],
    env: { a: 0.012, d: 0.1, s: 0.9, r: 0.09 },
    gain: 0.3,
  },
  // ---- keys / plucks
  epiano: {
    id: 'epiano',
    name: 'FM E-Piano',
    oscs: [o('sine')],
    fm: { ratio: 1, index: 1.5, sus: 0.12, decay: 0.55 },
    filter: { cutoff: 5500, kt: 0.5, q: 0.4, env: 0, decay: 0.1 },
    env: { a: 0.004, d: 1.4, s: 0.18, r: 0.4 },
    gain: 0.55,
  },
  softPluck: {
    id: 'softPluck',
    name: 'Soft Pluck',
    oscs: [o('triangle', -4), o('sawtooth', 4, 0.35)],
    filter: { cutoff: 1500, kt: 0.8, q: 0.8, env: 2.2, decay: 0.22 },
    env: { a: 0.003, d: 0.7, s: 0.02, r: 0.2 },
    gain: 0.6,
    hold: 0.25,
  },
  pluckSaw: {
    id: 'pluckSaw',
    name: 'Saw Pluck',
    oscs: [o('sawtooth', -7), o('sawtooth', 7)],
    filter: { cutoff: 900, kt: 0.9, q: 6, env: 3.2, decay: 0.17 },
    env: { a: 0.002, d: 0.3, s: 0.05, r: 0.12 },
    gain: 0.4,
    hold: 0.2,
  },
  chipPulse: {
    id: 'chipPulse',
    name: 'Pulse 25%',
    oscs: [o('pulse25')],
    filter: { cutoff: 6500, kt: 0.3, q: 0.3, env: 0, decay: 0.1 },
    env: { a: 0.002, d: 0.14, s: 0.35, r: 0.06 },
    gain: 0.55,
  },
  marimba: {
    id: 'marimba',
    name: 'Marimba',
    oscs: [o('sine')],
    fm: { ratio: 4, index: 0.9, sus: 0.02, decay: 0.09 },
    env: { a: 0.002, d: 0.5, s: 0, r: 0.1 },
    gain: 0.9,
    hold: 0.35,
  },
  bell: {
    id: 'bell',
    name: 'FM Bell',
    oscs: [o('sine')],
    fm: { ratio: 3.5, index: 2.2, sus: 0.15, decay: 1.3 },
    env: { a: 0.002, d: 2.4, s: 0, r: 1.0 },
    gain: 0.45,
    hold: 1.6,
  },
  musicBox: {
    id: 'musicBox',
    name: 'Music Box',
    oscs: [o('sine')],
    fm: { ratio: 6, index: 0.8, sus: 0.05, decay: 0.15 },
    env: { a: 0.002, d: 1.1, s: 0, r: 0.5 },
    gain: 0.6,
    hold: 0.8,
  },
  // ---- leads
  sawLead: {
    id: 'sawLead',
    name: 'Saw Lead',
    oscs: [o('sawtooth', -8), o('sawtooth', 8)],
    filter: { cutoff: 2800, kt: 0.75, q: 2, env: 1.5, decay: 0.3 },
    env: { a: 0.012, d: 0.2, s: 0.7, r: 0.28 },
    gain: 0.3,
    vib: 9,
  },
  squareLead: {
    id: 'squareLead',
    name: 'Square Lead',
    oscs: [o('square', -4), o('square', 4)],
    filter: { cutoff: 2200, kt: 0.75, q: 1.2, env: 1.2, decay: 0.25 },
    env: { a: 0.01, d: 0.15, s: 0.65, r: 0.2 },
    gain: 0.22,
    vib: 8,
  },
  fluteLead: {
    id: 'fluteLead',
    name: 'Soft Flute',
    oscs: [o('sine'), o('triangle', 0, 0.4, 2)],
    filter: { cutoff: 3500, kt: 0.6, q: 0.3, env: 0.6, decay: 0.2 },
    env: { a: 0.07, d: 0.12, s: 0.8, r: 0.18 },
    gain: 0.5,
    vib: 14,
  },
  chipSquare: {
    id: 'chipSquare',
    name: 'Chip Square',
    oscs: [o('square')],
    filter: { cutoff: 5000, kt: 0.3, q: 0.3, env: 0, decay: 0.1 },
    env: { a: 0.004, d: 0.08, s: 0.7, r: 0.05 },
    gain: 0.22,
    vib: 10,
  },
  // ---- basses
  subBass: {
    id: 'subBass',
    name: 'Sub Bass',
    oscs: [o('sine'), o('triangle', 0, 0.35)],
    filter: { cutoff: 500, kt: 0.3, q: 0.5, env: 1, decay: 0.15 },
    env: { a: 0.008, d: 0.3, s: 0.8, r: 0.12 },
    gain: 0.62,
  },
  synthBass: {
    id: 'synthBass',
    name: 'Analog Bass',
    oscs: [o('sawtooth'), o('square', 0, 0.6, 0.5)],
    filter: { cutoff: 650, kt: 0.4, q: 6, env: 2.3, decay: 0.2 },
    env: { a: 0.004, d: 0.25, s: 0.5, r: 0.08 },
    gain: 0.45,
  },
  acidBass: {
    id: 'acidBass',
    name: 'Acid Bass',
    oscs: [o('sawtooth')],
    filter: { cutoff: 380, kt: 0.4, q: 14, env: 3.2, decay: 0.14 },
    env: { a: 0.002, d: 0.2, s: 0.35, r: 0.06 },
    gain: 0.5,
  },
  pulseBass: {
    id: 'pulseBass',
    name: 'Pulse Bass',
    oscs: [o('square')],
    filter: { cutoff: 1000, kt: 0.3, q: 0.5, env: 1.2, decay: 0.1 },
    env: { a: 0.003, d: 0.12, s: 0.7, r: 0.04 },
    gain: 0.4,
  },
  reeseBass: {
    id: 'reeseBass',
    name: 'Reese Bass',
    oscs: [o('sawtooth', -16), o('sawtooth', 16), o('sine', 0, 0.7, 0.5)],
    filter: { cutoff: 700, kt: 0.3, q: 1.2, env: 0.5, decay: 0.4 },
    env: { a: 0.01, d: 0.3, s: 0.9, r: 0.15 },
    gain: 0.4,
  },
  upright: {
    id: 'upright',
    name: 'Upright Bass',
    oscs: [o('triangle'), o('sine', 0, 0.6, 2)],
    filter: { cutoff: 650, kt: 0.5, q: 0.6, env: 1.6, decay: 0.3 },
    env: { a: 0.006, d: 0.5, s: 0.12, r: 0.15 },
    gain: 1.0,
    hold: 0.3,
  },
};

// Layer ids: 0 drums, 1 bass, 2 chords, 3 arp, 4 lead, 5 texture
export const LAYER_PATCHES: string[][] = [
  [],
  ['subBass', 'synthBass', 'acidBass', 'pulseBass', 'reeseBass', 'upright'],
  ['warmPad', 'glassPad', 'strings', 'organ', 'epiano', 'softPluck', 'chipPulse'],
  ['pluckSaw', 'chipPulse', 'marimba', 'bell', 'epiano', 'musicBox', 'softPluck'],
  ['sawLead', 'squareLead', 'fluteLead', 'chipSquare', 'epiano', 'marimba', 'bell', 'softPluck'],
  ['bell', 'musicBox', 'glassPad', 'marimba', 'fluteLead'],
];

// ---------------------------------------------------------------------------
// Drum kits (synthesised): parameters only.
// ---------------------------------------------------------------------------
export type KitId = 'electro' | 'lofi' | 'jazz' | 'chip' | 'cinema';

export interface Kit {
  kick: { f0: number; f1: number; pd: number; ad: number; gain: number; type: OscillatorType };
  snare: { tone: number; td: number; nd: number; bp: number; q: number; tg: number; ng: number };
  hat: { hp: number; d: number; g: number };
  open: { d: number; g: number };
  clap: { bp: number; d: number; g: number };
  perc: { kind: 'rim' | 'shaker'; f: number; g: number };
  tom: { f: number; d: number; g: number; type: OscillatorType };
  crash: { d: number; g: number };
}

export const KITS: Record<KitId, Kit> = {
  electro: {
    kick: { f0: 150, f1: 48, pd: 0.09, ad: 0.38, gain: 0.95, type: 'sine' },
    snare: { tone: 190, td: 0.09, nd: 0.2, bp: 1900, q: 0.8, tg: 0.35, ng: 0.6 },
    hat: { hp: 7500, d: 0.045, g: 0.28 },
    open: { d: 0.3, g: 0.22 },
    clap: { bp: 1300, d: 0.16, g: 0.6 },
    perc: { kind: 'rim', f: 1700, g: 0.3 },
    tom: { f: 120, d: 0.35, g: 0.7, type: 'sine' },
    crash: { d: 1.6, g: 0.3 },
  },
  lofi: {
    kick: { f0: 110, f1: 42, pd: 0.07, ad: 0.3, gain: 0.95, type: 'sine' },
    snare: { tone: 170, td: 0.08, nd: 0.17, bp: 1300, q: 0.6, tg: 0.4, ng: 0.5 },
    hat: { hp: 5200, d: 0.05, g: 0.2 },
    open: { d: 0.2, g: 0.15 },
    clap: { bp: 1100, d: 0.14, g: 0.5 },
    perc: { kind: 'shaker', f: 0, g: 0.35 },
    tom: { f: 100, d: 0.3, g: 0.6, type: 'sine' },
    crash: { d: 1.1, g: 0.2 },
  },
  jazz: {
    kick: { f0: 90, f1: 50, pd: 0.05, ad: 0.22, gain: 0.6, type: 'sine' },
    snare: { tone: 200, td: 0.05, nd: 0.12, bp: 2500, q: 0.5, tg: 0.15, ng: 0.35 },
    hat: { hp: 6000, d: 0.04, g: 0.18 },
    open: { d: 0.55, g: 0.14 },
    clap: { bp: 1500, d: 0.12, g: 0.4 },
    perc: { kind: 'rim', f: 1200, g: 0.3 },
    tom: { f: 90, d: 0.3, g: 0.6, type: 'sine' },
    crash: { d: 1.8, g: 0.2 },
  },
  chip: {
    kick: { f0: 200, f1: 45, pd: 0.06, ad: 0.15, gain: 0.8, type: 'square' },
    snare: { tone: 0, td: 0.05, nd: 0.12, bp: 3500, q: 0.3, tg: 0, ng: 0.55 },
    hat: { hp: 9000, d: 0.025, g: 0.2 },
    open: { d: 0.12, g: 0.18 },
    clap: { bp: 2500, d: 0.08, g: 0.45 },
    perc: { kind: 'rim', f: 2200, g: 0.25 },
    tom: { f: 150, d: 0.2, g: 0.45, type: 'square' },
    crash: { d: 0.5, g: 0.25 },
  },
  cinema: {
    kick: { f0: 100, f1: 38, pd: 0.12, ad: 0.7, gain: 1.0, type: 'sine' },
    snare: { tone: 140, td: 0.15, nd: 0.35, bp: 1200, q: 0.5, tg: 0.4, ng: 0.5 },
    hat: { hp: 6500, d: 0.08, g: 0.15 },
    open: { d: 0.4, g: 0.15 },
    clap: { bp: 1000, d: 0.3, g: 0.5 },
    perc: { kind: 'shaker', f: 0, g: 0.3 },
    tom: { f: 70, d: 0.7, g: 0.9, type: 'sine' },
    crash: { d: 2.5, g: 0.4 },
  },
};
