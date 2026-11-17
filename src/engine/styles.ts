// Genre / style presets. Pure data that steers the procedural composer.
import type { KitId } from './patches';
import type { MeterId, ScaleId } from './theory';

export type StyleId =
  | 'synthwave'
  | 'ambient'
  | 'lofi'
  | 'house'
  | 'techno'
  | 'chiptune'
  | 'jazz'
  | 'cinematic'
  | 'dnb'
  | 'classical';

export type BassMode = 'sustain' | 'pulse' | 'offbeat' | 'groove' | 'walk';
export type CompMode = 'sustain' | 'offbeat' | 'stab' | 'alberti';
export type ArpPat = 'up' | 'down' | 'updown' | 'converge' | 'thirds';
export type FillKind = 'roll' | 'toms' | 'hats';

export interface StyleDef {
  id: StyleId;
  name: string;
  blurb: string;
  accent: string;
  bpm: [number, number, number]; // min, max, default
  scales: ScaleId[];
  meters: MeterId[];
  swing: number;
  swingGrid: 1 | 2;
  hr: [number, number][]; // harmonic rhythm in bars -> weight
  ext: number; // chord-extension tendency 0..1
  kit: KitId;
  duck: number; // sidechain-style ducking depth
  drums: {
    kick: 'four' | 'strong' | 'break' | 'sparse' | 'none';
    kickSync: number;
    snare: 'backbeat' | 'half' | 'none';
    backbeat: 'snare' | 'clap' | 'both';
    ghost: number;
    hat: 'eighth' | 'sixteenth' | 'offbeat' | 'ride' | 'sparse' | 'none';
    perc: number;
    fill: number;
    fillKinds: FillKind[];
  };
  bass: BassMode[];
  bassDensity: number;
  comp: CompMode[];
  compDensity: number;
  arp: { rate: 1 | 2; pats: ArpPat[]; octaves: 1 | 2; fast: boolean; gate: number };
  lead: { grid: 1 | 2; density: number; legato: number; center: number };
  texture: number;
  patches: { bass: string[]; chords: string[]; arp: string[]; lead: string[]; texture: string[] };
  fx: { reverb: number; delay: number; chorus: number };
  /** minimum section energy for each layer to be active: drums, bass, chords, arp, lead, texture */
  min: number[];
}

export const STYLES: Record<StyleId, StyleDef> = {
  synthwave: {
    id: 'synthwave',
    name: 'Synthwave',
    blurb: 'Neon arps, gated drums, pulsing bass',
    accent: '#f472b6',
    bpm: [88, 118, 100],
    scales: ['minor', 'dorian', 'major', 'harmonicMinor'],
    meters: ['4/4', '12/8', '6/8'],
    swing: 0,
    swingGrid: 1,
    hr: [[1, 0.7], [2, 0.15], [0.5, 0.15]],
    ext: 0.35,
    kit: 'electro',
    duck: 0.25,
    drums: { kick: 'strong', kickSync: 0.45, snare: 'backbeat', backbeat: 'both', ghost: 0, hat: 'eighth', perc: 0, fill: 0.6, fillKinds: ['roll', 'toms'] },
    bass: ['pulse', 'pulse', 'groove'],
    bassDensity: 0.6,
    comp: ['sustain', 'sustain', 'stab'],
    compDensity: 0.4,
    arp: { rate: 2, pats: ['up', 'updown', 'thirds'], octaves: 2, fast: true, gate: 0.8 },
    lead: { grid: 2, density: 0.55, legato: 0.85, center: 72 },
    texture: 0.5,
    patches: {
      bass: ['synthBass', 'pulseBass', 'subBass'],
      chords: ['warmPad', 'strings', 'organ'],
      arp: ['pluckSaw', 'chipPulse', 'marimba'],
      lead: ['sawLead', 'squareLead', 'fluteLead'],
      texture: ['bell', 'glassPad', 'musicBox'],
    },
    fx: { reverb: 0.6, delay: 0.5, chorus: 0.8 },
    min: [0.2, 0.1, 0, 0.35, 0.28, 0.45],
  },
  ambient: {
    id: 'ambient',
    name: 'Ambient Drift',
    blurb: 'Slow evolving pads, bells and space',
    accent: '#67e8f9',
    bpm: [58, 82, 68],
    scales: ['lydian', 'major', 'dorian', 'pentMajor', 'minor'],
    meters: ['4/4', '3/4', '6/8', '5/4'],
    swing: 0,
    swingGrid: 1,
    hr: [[2, 0.6], [1, 0.4]],
    ext: 0.6,
    kit: 'cinema',
    duck: 0,
    drums: { kick: 'sparse', kickSync: 0, snare: 'none', backbeat: 'snare', ghost: 0, hat: 'sparse', perc: 0.3, fill: 0.2, fillKinds: ['toms'] },
    bass: ['sustain'],
    bassDensity: 0.3,
    comp: ['sustain'],
    compDensity: 0.2,
    arp: { rate: 2, pats: ['up', 'updown', 'converge'], octaves: 2, fast: false, gate: 1.4 },
    lead: { grid: 2, density: 0.3, legato: 1, center: 74 },
    texture: 0.8,
    patches: {
      bass: ['subBass'],
      chords: ['glassPad', 'warmPad', 'strings'],
      arp: ['bell', 'marimba', 'musicBox'],
      lead: ['fluteLead', 'bell', 'softPluck'],
      texture: ['bell', 'musicBox', 'glassPad'],
    },
    fx: { reverb: 0.9, delay: 0.5, chorus: 0.5 },
    min: [0.85, 0.12, 0, 0.3, 0.2, 0],
  },
  lofi: {
    id: 'lofi',
    name: 'Lo-Fi Chill',
    blurb: 'Dusty keys, swung boom-bap beats',
    accent: '#fbbf24',
    bpm: [68, 92, 80],
    scales: ['dorian', 'minor', 'major', 'pentMinor'],
    meters: ['4/4', '3/4', '6/8'],
    swing: 0.5,
    swingGrid: 1,
    hr: [[1, 0.55], [0.5, 0.2], [2, 0.25]],
    ext: 0.75,
    kit: 'lofi',
    duck: 0.15,
    drums: { kick: 'break', kickSync: 0.6, snare: 'backbeat', backbeat: 'snare', ghost: 0.5, hat: 'eighth', perc: 0, fill: 0.25, fillKinds: ['roll', 'hats'] },
    bass: ['groove', 'groove', 'sustain'],
    bassDensity: 0.4,
    comp: ['stab', 'stab', 'sustain'],
    compDensity: 0.5,
    arp: { rate: 2, pats: ['up', 'converge', 'thirds'], octaves: 1, fast: false, gate: 0.9 },
    lead: { grid: 1, density: 0.4, legato: 0.8, center: 70 },
    texture: 0.6,
    patches: {
      bass: ['subBass', 'upright'],
      chords: ['epiano', 'organ', 'warmPad'],
      arp: ['marimba', 'musicBox', 'epiano'],
      lead: ['fluteLead', 'epiano', 'marimba', 'softPluck'],
      texture: ['musicBox', 'bell'],
    },
    fx: { reverb: 0.5, delay: 0.35, chorus: 0.6 },
    min: [0.12, 0.05, 0, 0.55, 0.25, 0.3],
  },
  house: {
    id: 'house',
    name: 'House',
    blurb: 'Four-on-the-floor, stabs, rolling bass',
    accent: '#a78bfa',
    bpm: [118, 128, 124],
    scales: ['minor', 'dorian', 'pentMinor', 'major'],
    meters: ['4/4'],
    swing: 0.15,
    swingGrid: 1,
    hr: [[1, 0.5], [2, 0.3], [0.5, 0.2]],
    ext: 0.6,
    kit: 'electro',
    duck: 0.55,
    drums: { kick: 'four', kickSync: 0, snare: 'backbeat', backbeat: 'clap', ghost: 0, hat: 'offbeat', perc: 0.5, fill: 0.5, fillKinds: ['roll', 'hats'] },
    bass: ['offbeat', 'groove'],
    bassDensity: 0.5,
    comp: ['offbeat', 'stab', 'sustain'],
    compDensity: 0.5,
    arp: { rate: 1, pats: ['up', 'thirds', 'updown'], octaves: 2, fast: false, gate: 0.7 },
    lead: { grid: 1, density: 0.45, legato: 0.7, center: 72 },
    texture: 0.5,
    patches: {
      bass: ['synthBass', 'subBass'],
      chords: ['organ', 'epiano', 'strings'],
      arp: ['pluckSaw', 'marimba'],
      lead: ['sawLead', 'squareLead', 'fluteLead'],
      texture: ['bell', 'glassPad'],
    },
    fx: { reverb: 0.45, delay: 0.45, chorus: 0.4 },
    min: [0.15, 0.1, 0, 0.5, 0.3, 0.5],
  },
  techno: {
    id: 'techno',
    name: 'Acid Techno',
    blurb: 'Hypnotic, driving, resonant acid lines',
    accent: '#34d399',
    bpm: [124, 140, 132],
    scales: ['phrygian', 'minor', 'pentMinor', 'harmonicMinor'],
    meters: ['4/4', '7/8'],
    swing: 0,
    swingGrid: 1,
    hr: [[2, 0.5], [1, 0.5]],
    ext: 0.1,
    kit: 'electro',
    duck: 0.5,
    drums: { kick: 'four', kickSync: 0, snare: 'backbeat', backbeat: 'clap', ghost: 0, hat: 'sixteenth', perc: 0.7, fill: 0.5, fillKinds: ['roll', 'hats'] },
    bass: ['groove', 'pulse'],
    bassDensity: 0.7,
    comp: ['stab', 'offbeat'],
    compDensity: 0.3,
    arp: { rate: 1, pats: ['up', 'converge', 'thirds'], octaves: 2, fast: false, gate: 0.6 },
    lead: { grid: 2, density: 0.3, legato: 0.6, center: 70 },
    texture: 0.4,
    patches: {
      bass: ['acidBass', 'synthBass'],
      chords: ['strings', 'organ', 'warmPad'],
      arp: ['pluckSaw', 'chipPulse'],
      lead: ['squareLead', 'sawLead'],
      texture: ['bell', 'glassPad'],
    },
    fx: { reverb: 0.4, delay: 0.55, chorus: 0.1 },
    min: [0.1, 0.1, 0.1, 0.25, 0.4, 0.55],
  },
  chiptune: {
    id: 'chiptune',
    name: 'Chiptune Arcade',
    blurb: 'Pulse waves, fast arps, 8-bit energy',
    accent: '#f87171',
    bpm: [120, 160, 138],
    scales: ['major', 'pentMajor', 'minor', 'mixolydian'],
    meters: ['4/4', '3/4', '6/8'],
    swing: 0,
    swingGrid: 1,
    hr: [[1, 0.6], [0.5, 0.3], [2, 0.1]],
    ext: 0,
    kit: 'chip',
    duck: 0,
    drums: { kick: 'strong', kickSync: 0.5, snare: 'backbeat', backbeat: 'snare', ghost: 0, hat: 'eighth', perc: 0.3, fill: 0.5, fillKinds: ['roll', 'hats'] },
    bass: ['pulse', 'pulse', 'groove'],
    bassDensity: 0.6,
    comp: ['stab', 'alberti'],
    compDensity: 0.5,
    arp: { rate: 1, pats: ['up', 'updown', 'converge'], octaves: 2, fast: true, gate: 0.7 },
    lead: { grid: 1, density: 0.7, legato: 0.75, center: 76 },
    texture: 0.3,
    patches: {
      bass: ['pulseBass'],
      chords: ['chipPulse', 'organ'],
      arp: ['chipPulse', 'chipSquare'],
      lead: ['chipSquare', 'squareLead'],
      texture: ['chipPulse', 'bell'],
    },
    fx: { reverb: 0.15, delay: 0.25, chorus: 0 },
    min: [0.15, 0.1, 0, 0.2, 0.2, 0.6],
  },
  jazz: {
    id: 'jazz',
    name: 'Jazz Lounge',
    blurb: 'Walking bass, swung ride, rich 7th/9th chords',
    accent: '#fb923c',
    bpm: [84, 140, 112],
    scales: ['dorian', 'mixolydian', 'major', 'minor', 'blues'],
    meters: ['4/4', '3/4', '12/8', '5/4'],
    swing: 0.85,
    swingGrid: 2,
    hr: [[0.5, 0.4], [1, 0.5], [2, 0.1]],
    ext: 1,
    kit: 'jazz',
    duck: 0,
    drums: { kick: 'sparse', kickSync: 0.3, snare: 'none', backbeat: 'snare', ghost: 0.6, hat: 'ride', perc: 0, fill: 0.3, fillKinds: ['roll'] },
    bass: ['walk'],
    bassDensity: 0.5,
    comp: ['stab', 'stab', 'sustain'],
    compDensity: 0.4,
    arp: { rate: 2, pats: ['updown', 'converge'], octaves: 1, fast: false, gate: 0.8 },
    lead: { grid: 1, density: 0.5, legato: 0.8, center: 71 },
    texture: 0.5,
    patches: {
      bass: ['upright'],
      chords: ['epiano', 'organ', 'softPluck'],
      arp: ['marimba', 'epiano'],
      lead: ['fluteLead', 'epiano', 'marimba'],
      texture: ['bell', 'musicBox'],
    },
    fx: { reverb: 0.4, delay: 0.2, chorus: 0.3 },
    min: [0.1, 0.05, 0, 0.9, 0.2, 0.5],
  },
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic',
    blurb: 'Epic swells, ostinatos and taiko hits',
    accent: '#94a3b8',
    bpm: [62, 96, 78],
    scales: ['minor', 'harmonicMinor', 'phrygian', 'dorian'],
    meters: ['4/4', '6/8', '3/4', '5/4'],
    swing: 0,
    swingGrid: 1,
    hr: [[2, 0.55], [1, 0.45]],
    ext: 0.4,
    kit: 'cinema',
    duck: 0.1,
    drums: { kick: 'sparse', kickSync: 0.2, snare: 'half', backbeat: 'snare', ghost: 0, hat: 'none', perc: 0.5, fill: 0.7, fillKinds: ['toms', 'roll'] },
    bass: ['sustain', 'sustain', 'pulse'],
    bassDensity: 0.4,
    comp: ['sustain'],
    compDensity: 0.3,
    arp: { rate: 2, pats: ['up', 'updown', 'thirds'], octaves: 2, fast: false, gate: 0.6 },
    lead: { grid: 2, density: 0.4, legato: 0.95, center: 69 },
    texture: 0.6,
    patches: {
      bass: ['subBass', 'reeseBass'],
      chords: ['strings', 'warmPad', 'glassPad'],
      arp: ['marimba', 'softPluck', 'pluckSaw'],
      lead: ['fluteLead', 'sawLead', 'softPluck'],
      texture: ['bell', 'glassPad'],
    },
    fx: { reverb: 0.9, delay: 0.35, chorus: 0.4 },
    min: [0.4, 0.1, 0, 0.3, 0.3, 0.2],
  },
  dnb: {
    id: 'dnb',
    name: 'Drum & Bass',
    blurb: 'Breakbeats at 172 BPM, deep reese bass',
    accent: '#38bdf8',
    bpm: [168, 178, 172],
    scales: ['minor', 'dorian', 'phrygian', 'pentMinor'],
    meters: ['4/4'],
    swing: 0.1,
    swingGrid: 1,
    hr: [[2, 0.5], [1, 0.5]],
    ext: 0.5,
    kit: 'electro',
    duck: 0.35,
    drums: { kick: 'break', kickSync: 0.5, snare: 'backbeat', backbeat: 'snare', ghost: 0.4, hat: 'eighth', perc: 0.3, fill: 0.5, fillKinds: ['roll', 'hats'] },
    bass: ['groove', 'sustain'],
    bassDensity: 0.35,
    comp: ['sustain', 'sustain', 'stab'],
    compDensity: 0.3,
    arp: { rate: 1, pats: ['up', 'thirds'], octaves: 2, fast: false, gate: 0.6 },
    lead: { grid: 2, density: 0.4, legato: 0.8, center: 72 },
    texture: 0.5,
    patches: {
      bass: ['reeseBass', 'subBass'],
      chords: ['warmPad', 'glassPad', 'strings'],
      arp: ['pluckSaw', 'marimba'], // short notes only: a 16th-note arp at 172 BPM cannot afford 3-second bell tails
      lead: ['sawLead', 'fluteLead'],
      texture: ['bell', 'glassPad'],
    },
    fx: { reverb: 0.5, delay: 0.4, chorus: 0.3 },
    min: [0.1, 0.1, 0, 0.5, 0.35, 0.5],
  },
  classical: {
    id: 'classical',
    name: 'Neo-Classical',
    blurb: 'Music-box melodies over Alberti figures',
    accent: '#e879f9',
    bpm: [72, 112, 92],
    scales: ['major', 'minor', 'harmonicMinor', 'lydian'],
    meters: ['3/4', '4/4', '6/8'],
    swing: 0,
    swingGrid: 1,
    hr: [[1, 0.7], [0.5, 0.15], [2, 0.15]],
    ext: 0.3,
    kit: 'cinema',
    duck: 0,
    drums: { kick: 'none', kickSync: 0, snare: 'none', backbeat: 'snare', ghost: 0, hat: 'none', perc: 0, fill: 0, fillKinds: [] },
    bass: ['sustain', 'walk'],
    bassDensity: 0.3,
    comp: ['alberti', 'alberti', 'sustain'],
    compDensity: 0.4,
    arp: { rate: 1, pats: ['updown', 'up', 'converge'], octaves: 2, fast: false, gate: 0.9 },
    lead: { grid: 1, density: 0.55, legato: 0.85, center: 74 },
    texture: 0.5,
    patches: {
      bass: ['upright', 'subBass'],
      chords: ['softPluck', 'epiano', 'musicBox'],
      arp: ['marimba', 'musicBox'],
      lead: ['softPluck', 'epiano', 'musicBox', 'fluteLead'],
      texture: ['bell', 'musicBox'],
    },
    fx: { reverb: 0.7, delay: 0.25, chorus: 0.2 },
    min: [1.5, 0.2, 0, 0.45, 0.15, 0.3],
  },
};

export const STYLE_LIST: StyleDef[] = Object.values(STYLES);
