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
  choirPad: {
    id: 'choirPad',
    name: 'Choir Pad',
    oscs: [o('triangle', -7), o('triangle', 7, 0.9), o('sine', 0, 0.45, 2)],
    filter: { cutoff: 1900, kt: 0.5, q: 1.4, env: -0.7, decay: 1.1 },
    env: { a: 0.65, d: 0.9, s: 0.85, r: 1.8 },
    gain: 0.34,
    vib: 5,
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
  cello: {
    id: 'cello',
    name: 'Solo Cello',
    oscs: [o('sawtooth', -6), o('triangle', 5, 0.7)],
    filter: { cutoff: 1450, kt: 0.65, q: 0.9, env: -0.8, decay: 0.45 },
    env: { a: 0.16, d: 0.4, s: 0.82, r: 0.55 },
    gain: 0.34,
    vib: 8,
  },
  warmBrass: {
    id: 'warmBrass',
    name: 'Warm Brass',
    oscs: [o('sawtooth', -7), o('sawtooth', 7, 0.85)],
    filter: { cutoff: 950, kt: 0.6, q: 2.0, env: -1.6, decay: 0.35 },
    env: { a: 0.08, d: 0.3, s: 0.78, r: 0.35 },
    gain: 0.28,
    vib: 5,
  },
  organ: {
    id: 'organ',
    name: 'Drawbar Organ',
    oscs: [o('sine'), o('sine', 0, 0.55, 2), o('sine', 0, 0.3, 3)],
    env: { a: 0.012, d: 0.1, s: 0.9, r: 0.09 },
    gain: 0.3,
  },

  // ---- drones
  deepDrone: {
    id: 'deepDrone',
    name: 'Deep Drone',
    oscs: [o('sine', 0, 1, 1), o('sawtooth', -6, 0.4, 1), o('sawtooth', 6, 0.4, 1)],
    filter: { cutoff: 480, kt: 0.25, q: 0.8, env: -0.5, decay: 2.0 },
    env: { a: 1.0, d: 1.2, s: 0.9, r: 2.4 },
    gain: 0.34,
  },
  organDrone: {
    id: 'organDrone',
    name: 'Cathedral Drone',
    oscs: [o('sine', 0, 0.9, 1), o('sine', 0, 0.45, 1.5), o('triangle', 4, 0.35, 2)],
    filter: { cutoff: 1100, kt: 0.4, q: 0.5, env: -0.4, decay: 1.6 },
    env: { a: 0.55, d: 0.8, s: 0.9, r: 1.7 },
    gain: 0.3,
  },
  shimmerDrone: {
    id: 'shimmerDrone',
    name: 'Shimmer Drone',
    oscs: [o('triangle', -4, 0.8, 1), o('sine', 5, 0.55, 2), o('sine', -3, 0.3, 3)],
    filter: { cutoff: 2600, kt: 0.45, q: 0.5, env: -0.6, decay: 1.8 },
    env: { a: 1.1, d: 1.0, s: 0.85, r: 2.5 },
    gain: 0.32,
  },

  // ---- keys / plucks / mallets
  epiano: {
    id: 'epiano',
    name: 'FM E-Piano',
    oscs: [o('sine')],
    fm: { ratio: 1, index: 1.5, sus: 0.12, decay: 0.55 },
    filter: { cutoff: 5500, kt: 0.5, q: 0.4, env: 0, decay: 0.1 },
    env: { a: 0.004, d: 1.4, s: 0.18, r: 0.4 },
    gain: 0.55,
  },
  clavinet: {
    id: 'clavinet',
    name: 'Funk Clavinet',
    oscs: [o('pulse12'), o('sawtooth', 3, 0.35)],
    filter: { cutoff: 1400, kt: 0.8, q: 3.4, env: 2.4, decay: 0.16 },
    env: { a: 0.002, d: 0.38, s: 0.1, r: 0.12 },
    gain: 0.42,
    hold: 0.18,
  },
  harp: {
    id: 'harp',
    name: 'Concert Harp',
    oscs: [o('triangle'), o('sine', 0, 0.4, 2)],
    filter: { cutoff: 2200, kt: 0.75, q: 0.7, env: 1.8, decay: 0.28 },
    env: { a: 0.003, d: 1.3, s: 0.04, r: 0.55 },
    gain: 0.55,
    hold: 0.75,
  },
  pizzicato: {
    id: 'pizzicato',
    name: 'Pizzicato',
    oscs: [o('sawtooth', -3, 0.7), o('triangle', 3, 0.7)],
    filter: { cutoff: 1200, kt: 0.85, q: 1.1, env: 2.1, decay: 0.14 },
    env: { a: 0.002, d: 0.36, s: 0.02, r: 0.16 },
    gain: 0.52,
    hold: 0.24,
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
  vibraphone: {
    id: 'vibraphone',
    name: 'Vibraphone',
    oscs: [o('sine')],
    fm: { ratio: 3.98, index: 0.75, sus: 0.04, decay: 0.22 },
    env: { a: 0.003, d: 1.5, s: 0.05, r: 0.65 },
    gain: 0.65,
    vib: 6,
    hold: 1.0,
  },
  kalimba: {
    id: 'kalimba',
    name: 'Kalimba',
    oscs: [o('sine')],
    fm: { ratio: 2.8, index: 1.1, sus: 0.01, decay: 0.08 },
    env: { a: 0.002, d: 0.65, s: 0, r: 0.2 },
    gain: 0.85,
    hold: 0.45,
  },
  steelDrum: {
    id: 'steelDrum',
    name: 'Steel Drum',
    oscs: [o('triangle'), o('sine', 2, 0.55, 2)],
    fm: { ratio: 2, index: 0.95, sus: 0.06, decay: 0.14 },
    env: { a: 0.003, d: 0.75, s: 0.03, r: 0.28 },
    gain: 0.55,
    hold: 0.5,
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

  // ---- leads & winds
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
  oboe: {
    id: 'oboe',
    name: 'Oboe Reed',
    oscs: [o('pulse25'), o('triangle', 0, 0.35, 2)],
    filter: { cutoff: 2000, kt: 0.7, q: 2.2, env: 0.8, decay: 0.2 },
    env: { a: 0.045, d: 0.16, s: 0.78, r: 0.18 },
    gain: 0.36,
    vib: 11,
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
  fmBass: {
    id: 'fmBass',
    name: 'FM Bass',
    oscs: [o('sine')],
    fm: { ratio: 1, index: 2.6, sus: 0.08, decay: 0.2 },
    filter: { cutoff: 2400, kt: 0.4, q: 0.8, env: 1.2, decay: 0.15 },
    env: { a: 0.003, d: 0.32, s: 0.35, r: 0.09 },
    gain: 0.62,
  },
  slapBass: {
    id: 'slapBass',
    name: 'Slap Bass',
    oscs: [o('sawtooth'), o('pulse25', 0, 0.65)],
    filter: { cutoff: 820, kt: 0.5, q: 3.5, env: 2.9, decay: 0.14 },
    env: { a: 0.002, d: 0.28, s: 0.28, r: 0.09 },
    gain: 0.48,
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

// Layer ids:
// 0 drums, 1 bass, 2 chords, 3 arp, 4 lead, 5 texture, 6 countermelody, 7 drone, 8 mallet
export const LAYER_PATCHES: string[][] = [
  [],
  ['subBass', 'synthBass', 'fmBass', 'slapBass', 'acidBass', 'pulseBass', 'reeseBass', 'upright'],
  ['warmPad', 'glassPad', 'choirPad', 'strings', 'organ', 'epiano', 'clavinet', 'softPluck', 'harp', 'chipPulse'],
  ['pluckSaw', 'chipPulse', 'marimba', 'kalimba', 'harp', 'pizzicato', 'bell', 'epiano', 'musicBox', 'softPluck'],
  ['sawLead', 'squareLead', 'fluteLead', 'oboe', 'warmBrass', 'cello', 'chipSquare', 'epiano', 'marimba', 'bell', 'softPluck'],
  ['bell', 'musicBox', 'glassPad', 'choirPad', 'vibraphone', 'harp', 'marimba', 'fluteLead'],
  ['cello', 'oboe', 'warmBrass', 'fluteLead', 'strings', 'vibraphone', 'epiano', 'harp', 'softPluck', 'chipSquare'],
  ['deepDrone', 'organDrone', 'shimmerDrone', 'warmPad', 'glassPad', 'choirPad', 'strings'],
  ['vibraphone', 'kalimba', 'marimba', 'steelDrum', 'pizzicato', 'clavinet', 'harp', 'bell', 'musicBox'],
];

// ---------------------------------------------------------------------------
// Drum kits (synthesised): parameters only.
// ---------------------------------------------------------------------------
export type KitId = 'electro' | 'lofi' | 'jazz' | 'chip' | 'cinema' | 'latin' | 'industrial';

export const KIT_LIST: { id: KitId; label: string }[] = [
  { id: 'electro', label: 'Electro' },
  { id: 'lofi', label: 'Lo-Fi' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'chip', label: 'Chiptune' },
  { id: 'cinema', label: 'Cinema' },
  { id: 'latin', label: 'Latin / Acoustic' },
  { id: 'industrial', label: 'Industrial' },
];

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
  latin: {
    kick: { f0: 95, f1: 48, pd: 0.06, ad: 0.24, gain: 0.72, type: 'sine' },
    snare: { tone: 210, td: 0.06, nd: 0.13, bp: 2200, q: 0.7, tg: 0.22, ng: 0.32 },
    hat: { hp: 6800, d: 0.04, g: 0.19 },
    open: { d: 0.32, g: 0.14 },
    clap: { bp: 1600, d: 0.1, g: 0.35 },
    perc: { kind: 'shaker', f: 0, g: 0.42 },
    tom: { f: 145, d: 0.26, g: 0.62, type: 'triangle' },
    crash: { d: 1.4, g: 0.2 },
  },
  industrial: {
    kick: { f0: 175, f1: 42, pd: 0.1, ad: 0.42, gain: 1.0, type: 'triangle' },
    snare: { tone: 165, td: 0.11, nd: 0.24, bp: 1550, q: 1.1, tg: 0.45, ng: 0.7 },
    hat: { hp: 8200, d: 0.04, g: 0.3 },
    open: { d: 0.28, g: 0.24 },
    clap: { bp: 1200, d: 0.22, g: 0.68 },
    perc: { kind: 'rim', f: 1400, g: 0.38 },
    tom: { f: 95, d: 0.42, g: 0.75, type: 'triangle' },
    crash: { d: 2.0, g: 0.34 },
  },
};
