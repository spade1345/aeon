// Genre / style presets and user-created custom styles. Pure data that steers the procedural composer.
import type { KitId } from './patches';
import type { MeterId, ScaleId } from './theory';

export type BuiltinStyleId =
  | 'synthwave'
  | 'ambient'
  | 'lofi'
  | 'house'
  | 'techno'
  | 'chiptune'
  | 'jazz'
  | 'cinematic'
  | 'dnb'
  | 'classical'
  | 'bossa'
  | 'dub'
  | 'cyberpunk'
  | 'funk'
  | 'folk'
  | 'minimal';

export type StyleId = BuiltinStyleId | (string & {});

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
  patches: {
    bass: string[];
    chords: string[];
    arp: string[];
    lead: string[];
    texture: string[];
    counter: string[];
    drone: string[];
    mallet: string[];
  };
  fx: { reverb: number; delay: number; chorus: number };
  /** minimum section energy for each layer: drums, bass, chords, arp, lead, texture, counter, drone, mallet */
  min: number[];
  custom?: boolean;
}

export const BUILTIN_STYLES: Record<BuiltinStyleId, StyleDef> = {
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
      bass: ['synthBass', 'pulseBass', 'fmBass', 'subBass'],
      chords: ['warmPad', 'strings', 'organ'],
      arp: ['pluckSaw', 'chipPulse', 'marimba'],
      lead: ['sawLead', 'squareLead', 'fluteLead'],
      texture: ['bell', 'glassPad', 'musicBox'],
      counter: ['warmBrass', 'cello', 'fluteLead'],
      drone: ['deepDrone', 'warmPad'],
      mallet: ['vibraphone', 'bell', 'marimba'],
    },
    fx: { reverb: 0.6, delay: 0.5, chorus: 0.8 },
    min: [0.2, 0.1, 0, 0.35, 0.28, 0.45, 0.52, 0.32, 0.58],
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
      chords: ['glassPad', 'choirPad', 'warmPad', 'strings'],
      arp: ['bell', 'marimba', 'harp', 'musicBox'],
      lead: ['fluteLead', 'bell', 'softPluck'],
      texture: ['bell', 'musicBox', 'glassPad', 'choirPad'],
      counter: ['cello', 'fluteLead', 'vibraphone'],
      drone: ['shimmerDrone', 'deepDrone', 'organDrone'],
      mallet: ['vibraphone', 'kalimba', 'bell'],
    },
    fx: { reverb: 0.9, delay: 0.5, chorus: 0.5 },
    min: [0.85, 0.12, 0, 0.3, 0.2, 0, 0.38, 0, 0.45],
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
      arp: ['marimba', 'musicBox', 'epiano', 'kalimba'],
      lead: ['fluteLead', 'epiano', 'marimba', 'softPluck'],
      texture: ['musicBox', 'bell', 'vibraphone'],
      counter: ['vibraphone', 'cello', 'fluteLead'],
      drone: ['deepDrone', 'warmPad'],
      mallet: ['kalimba', 'vibraphone', 'marimba'],
    },
    fx: { reverb: 0.5, delay: 0.35, chorus: 0.6 },
    min: [0.12, 0.05, 0, 0.55, 0.25, 0.3, 0.48, 0.45, 0.35],
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
      bass: ['synthBass', 'fmBass', 'subBass'],
      chords: ['organ', 'epiano', 'strings'],
      arp: ['pluckSaw', 'marimba'],
      lead: ['sawLead', 'squareLead', 'fluteLead'],
      texture: ['bell', 'glassPad'],
      counter: ['warmBrass', 'epiano', 'vibraphone'],
      drone: ['warmPad', 'deepDrone'],
      mallet: ['marimba', 'steelDrum', 'vibraphone'],
    },
    fx: { reverb: 0.45, delay: 0.45, chorus: 0.4 },
    min: [0.15, 0.1, 0, 0.5, 0.3, 0.5, 0.55, 0.48, 0.42],
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
      bass: ['acidBass', 'synthBass', 'fmBass'],
      chords: ['strings', 'organ', 'warmPad'],
      arp: ['pluckSaw', 'chipPulse'],
      lead: ['squareLead', 'sawLead'],
      texture: ['bell', 'glassPad'],
      counter: ['warmBrass', 'oboe'],
      drone: ['deepDrone', 'organDrone'],
      mallet: ['marimba', 'clavinet', 'bell'],
    },
    fx: { reverb: 0.4, delay: 0.55, chorus: 0.1 },
    min: [0.1, 0.1, 0.1, 0.25, 0.4, 0.55, 0.62, 0.35, 0.48],
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
      counter: ['chipSquare', 'oboe'],
      drone: ['organDrone'],
      mallet: ['musicBox', 'bell'],
    },
    fx: { reverb: 0.15, delay: 0.25, chorus: 0 },
    min: [0.15, 0.1, 0, 0.2, 0.2, 0.6, 0.45, 0.8, 0.55],
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
      lead: ['fluteLead', 'warmBrass', 'epiano', 'marimba'],
      texture: ['bell', 'musicBox'],
      counter: ['vibraphone', 'warmBrass', 'cello'],
      drone: ['organDrone'],
      mallet: ['vibraphone', 'marimba'],
    },
    fx: { reverb: 0.4, delay: 0.2, chorus: 0.3 },
    min: [0.1, 0.05, 0, 0.9, 0.2, 0.5, 0.35, 0.78, 0.42],
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
      chords: ['strings', 'choirPad', 'warmPad', 'glassPad'],
      arp: ['pizzicato', 'harp', 'marimba', 'softPluck'],
      lead: ['fluteLead', 'cello', 'warmBrass', 'sawLead'],
      texture: ['bell', 'glassPad', 'choirPad'],
      counter: ['cello', 'oboe', 'warmBrass'],
      drone: ['deepDrone', 'organDrone', 'shimmerDrone'],
      mallet: ['pizzicato', 'harp', 'marimba'],
    },
    fx: { reverb: 0.9, delay: 0.35, chorus: 0.4 },
    min: [0.4, 0.1, 0, 0.3, 0.3, 0.2, 0.28, 0.1, 0.45],
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
      counter: ['fluteLead', 'cello'],
      drone: ['deepDrone', 'shimmerDrone'],
      mallet: ['marimba', 'kalimba'],
    },
    fx: { reverb: 0.5, delay: 0.4, chorus: 0.3 },
    min: [0.1, 0.1, 0, 0.5, 0.35, 0.5, 0.52, 0.35, 0.6],
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
      chords: ['harp', 'softPluck', 'epiano', 'musicBox'],
      arp: ['harp', 'pizzicato', 'marimba', 'musicBox'],
      lead: ['fluteLead', 'oboe', 'cello', 'softPluck', 'musicBox'],
      texture: ['bell', 'musicBox', 'harp'],
      counter: ['cello', 'oboe', 'fluteLead'],
      drone: ['organDrone', 'strings'],
      mallet: ['pizzicato', 'harp', 'musicBox'],
    },
    fx: { reverb: 0.7, delay: 0.25, chorus: 0.2 },
    min: [1.5, 0.2, 0, 0.45, 0.15, 0.3, 0.25, 0.4, 0.38],
  },

  // ---- 6 new built-in styles ----
  bossa: {
    id: 'bossa',
    name: 'Bossa Nova',
    blurb: 'Warm nylon syncopation, vibes and gentle shakers',
    accent: '#f59e0b',
    bpm: [96, 132, 114],
    scales: ['major', 'dorian', 'lydian', 'minor'],
    meters: ['4/4'],
    swing: 0.2,
    swingGrid: 1,
    hr: [[1, 0.6], [0.5, 0.3], [2, 0.1]],
    ext: 0.9,
    kit: 'latin',
    duck: 0,
    drums: { kick: 'sparse', kickSync: 0.45, snare: 'none', backbeat: 'snare', ghost: 0.3, hat: 'eighth', perc: 0.75, fill: 0.25, fillKinds: ['roll'] },
    bass: ['groove', 'walk'],
    bassDensity: 0.42,
    comp: ['stab', 'offbeat', 'sustain'],
    compDensity: 0.55,
    arp: { rate: 2, pats: ['updown', 'converge'], octaves: 1, fast: false, gate: 0.85 },
    lead: { grid: 1, density: 0.48, legato: 0.88, center: 71 },
    texture: 0.45,
    patches: {
      bass: ['upright', 'subBass'],
      chords: ['softPluck', 'epiano', 'harp'],
      arp: ['harp', 'kalimba', 'marimba'],
      lead: ['fluteLead', 'vibraphone', 'epiano'],
      texture: ['vibraphone', 'musicBox'],
      counter: ['vibraphone', 'cello', 'fluteLead'],
      drone: ['warmPad'],
      mallet: ['vibraphone', 'kalimba', 'marimba'],
    },
    fx: { reverb: 0.42, delay: 0.22, chorus: 0.25 },
    min: [0.1, 0.05, 0, 0.65, 0.2, 0.45, 0.35, 0.75, 0.32],
  },
  dub: {
    id: 'dub',
    name: 'Dub Reggae',
    blurb: 'Heavy sub bass, skank stabs and echo chambers',
    accent: '#10b981',
    bpm: [68, 92, 78],
    scales: ['minor', 'dorian', 'pentMinor', 'mixolydian'],
    meters: ['4/4'],
    swing: 0.32,
    swingGrid: 1,
    hr: [[2, 0.6], [1, 0.4]],
    ext: 0.45,
    kit: 'lofi',
    duck: 0.22,
    drums: { kick: 'break', kickSync: 0.35, snare: 'half', backbeat: 'snare', ghost: 0.4, hat: 'sixteenth', perc: 0.55, fill: 0.4, fillKinds: ['toms', 'roll'] },
    bass: ['groove', 'sustain'],
    bassDensity: 0.4,
    comp: ['offbeat', 'stab'],
    compDensity: 0.4,
    arp: { rate: 2, pats: ['up', 'thirds'], octaves: 1, fast: false, gate: 0.65 },
    lead: { grid: 2, density: 0.35, legato: 0.85, center: 70 },
    texture: 0.7,
    patches: {
      bass: ['subBass', 'fmBass'],
      chords: ['organ', 'clavinet', 'epiano'],
      arp: ['steelDrum', 'kalimba'],
      lead: ['fluteLead', 'warmBrass', 'steelDrum'],
      texture: ['bell', 'steelDrum', 'vibraphone'],
      counter: ['warmBrass', 'oboe', 'steelDrum'],
      drone: ['deepDrone', 'organDrone'],
      mallet: ['steelDrum', 'kalimba', 'marimba'],
    },
    fx: { reverb: 0.78, delay: 0.78, chorus: 0.35 },
    min: [0.12, 0.05, 0, 0.6, 0.3, 0.25, 0.42, 0.3, 0.34],
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Darkwave',
    blurb: 'Gritty industrial drums, brass swells and brooding bass',
    accent: '#e11d48',
    bpm: [96, 126, 110],
    scales: ['phrygian', 'harmonicMinor', 'minor'],
    meters: ['4/4', '7/8'],
    swing: 0,
    swingGrid: 1,
    hr: [[2, 0.55], [1, 0.45]],
    ext: 0.25,
    kit: 'industrial',
    duck: 0.45,
    drums: { kick: 'four', kickSync: 0.25, snare: 'backbeat', backbeat: 'both', ghost: 0.2, hat: 'sixteenth', perc: 0.6, fill: 0.6, fillKinds: ['toms', 'roll'] },
    bass: ['pulse', 'groove'],
    bassDensity: 0.72,
    comp: ['sustain', 'stab'],
    compDensity: 0.35,
    arp: { rate: 1, pats: ['down', 'updown', 'converge'], octaves: 2, fast: true, gate: 0.68 },
    lead: { grid: 2, density: 0.48, legato: 0.85, center: 69 },
    texture: 0.55,
    patches: {
      bass: ['reeseBass', 'acidBass', 'synthBass'],
      chords: ['strings', 'warmPad', 'choirPad'],
      arp: ['pluckSaw', 'clavinet', 'chipPulse'],
      lead: ['sawLead', 'warmBrass', 'squareLead'],
      texture: ['bell', 'glassPad'],
      counter: ['cello', 'warmBrass'],
      drone: ['deepDrone', 'organDrone'],
      mallet: ['pizzicato', 'bell'],
    },
    fx: { reverb: 0.62, delay: 0.48, chorus: 0.65 },
    min: [0.12, 0.08, 0, 0.32, 0.3, 0.42, 0.42, 0.15, 0.55],
  },
  funk: {
    id: 'funk',
    name: 'Neo-Funk',
    blurb: 'Slap bass, clavinet stabs and tight horn lines',
    accent: '#ec4899',
    bpm: [98, 122, 108],
    scales: ['dorian', 'mixolydian', 'pentMinor', 'blues'],
    meters: ['4/4'],
    swing: 0.35,
    swingGrid: 1,
    hr: [[1, 0.6], [2, 0.25], [0.5, 0.15]],
    ext: 0.85,
    kit: 'electro',
    duck: 0.2,
    drums: { kick: 'break', kickSync: 0.65, snare: 'backbeat', backbeat: 'snare', ghost: 0.7, hat: 'sixteenth', perc: 0.45, fill: 0.5, fillKinds: ['roll', 'hats'] },
    bass: ['groove'],
    bassDensity: 0.68,
    comp: ['stab', 'offbeat'],
    compDensity: 0.62,
    arp: { rate: 1, pats: ['up', 'thirds'], octaves: 1, fast: false, gate: 0.6 },
    lead: { grid: 1, density: 0.55, legato: 0.7, center: 72 },
    texture: 0.35,
    patches: {
      bass: ['slapBass', 'fmBass', 'synthBass'],
      chords: ['clavinet', 'epiano', 'organ'],
      arp: ['clavinet', 'marimba', 'epiano'],
      lead: ['warmBrass', 'sawLead', 'fluteLead'],
      texture: ['vibraphone', 'bell'],
      counter: ['warmBrass', 'oboe', 'clavinet'],
      drone: ['organDrone'],
      mallet: ['vibraphone', 'clavinet', 'marimba'],
    },
    fx: { reverb: 0.28, delay: 0.25, chorus: 0.35 },
    min: [0.1, 0.05, 0, 0.65, 0.28, 0.62, 0.35, 0.85, 0.4],
  },
  folk: {
    id: 'folk',
    name: 'Celtic Folk',
    blurb: 'Lilting 6/8 harps, woodwinds and open drones',
    accent: '#84cc16',
    bpm: [82, 124, 102],
    scales: ['dorian', 'mixolydian', 'major', 'pentMajor'],
    meters: ['6/8', '3/4', '4/4'],
    swing: 0,
    swingGrid: 1,
    hr: [[1, 0.65], [0.5, 0.2], [2, 0.15]],
    ext: 0.15,
    kit: 'jazz',
    duck: 0,
    drums: { kick: 'sparse', kickSync: 0.3, snare: 'none', backbeat: 'snare', ghost: 0.25, hat: 'sparse', perc: 0.65, fill: 0.25, fillKinds: ['toms'] },
    bass: ['sustain', 'pulse'],
    bassDensity: 0.35,
    comp: ['alberti', 'sustain'],
    compDensity: 0.45,
    arp: { rate: 1, pats: ['updown', 'up'], octaves: 2, fast: false, gate: 0.9 },
    lead: { grid: 1, density: 0.62, legato: 0.88, center: 73 },
    texture: 0.45,
    patches: {
      bass: ['upright', 'subBass'],
      chords: ['harp', 'softPluck', 'strings'],
      arp: ['harp', 'pizzicato', 'kalimba'],
      lead: ['fluteLead', 'oboe', 'harp'],
      texture: ['harp', 'musicBox', 'bell'],
      counter: ['cello', 'oboe', 'fluteLead'],
      drone: ['organDrone', 'shimmerDrone'],
      mallet: ['kalimba', 'pizzicato', 'harp'],
    },
    fx: { reverb: 0.65, delay: 0.2, chorus: 0.18 },
    min: [0.45, 0.15, 0, 0.35, 0.12, 0.4, 0.28, 0.18, 0.35],
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Pulse',
    blurb: 'Interlocking mallets, subtle phase shifts and glass',
    accent: '#60a5fa',
    bpm: [104, 132, 118],
    scales: ['lydian', 'dorian', 'major', 'pentMajor'],
    meters: ['4/4', '5/4', '7/8'],
    swing: 0,
    swingGrid: 1,
    hr: [[2, 0.65], [1, 0.35]],
    ext: 0.5,
    kit: 'cinema',
    duck: 0.08,
    drums: { kick: 'sparse', kickSync: 0.2, snare: 'none', backbeat: 'clap', ghost: 0, hat: 'eighth', perc: 0.6, fill: 0.2, fillKinds: ['hats'] },
    bass: ['pulse', 'sustain'],
    bassDensity: 0.4,
    comp: ['sustain', 'alberti'],
    compDensity: 0.35,
    arp: { rate: 1, pats: ['converge', 'updown', 'thirds'], octaves: 2, fast: false, gate: 0.78 },
    lead: { grid: 2, density: 0.32, legato: 0.85, center: 72 },
    texture: 0.65,
    patches: {
      bass: ['subBass', 'upright'],
      chords: ['glassPad', 'epiano', 'harp'],
      arp: ['marimba', 'kalimba', 'pizzicato'],
      lead: ['vibraphone', 'fluteLead', 'marimba'],
      texture: ['bell', 'musicBox', 'glassPad'],
      counter: ['cello', 'vibraphone', 'oboe'],
      drone: ['shimmerDrone', 'glassPad'],
      mallet: ['marimba', 'kalimba', 'vibraphone'],
    },
    fx: { reverb: 0.68, delay: 0.55, chorus: 0.25 },
    min: [0.55, 0.15, 0, 0.18, 0.38, 0.22, 0.34, 0.22, 0.15],
  },
};

const CUSTOM_KEY = 'aeon-custom-styles-v1';

function loadCustomStylesFromStorage(): Record<string, StyleDef> {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return {};
    const list = JSON.parse(raw) as StyleDef[];
    if (!Array.isArray(list)) return {};
    const out: Record<string, StyleDef> = {};
    for (const item of list) {
      if (item && typeof item.id === 'string' && item.name) {
        out[item.id] = normalizeStyleDef({ ...item, custom: true });
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function normalizeStyleDef(def: StyleDef): StyleDef {
  const fb = BUILTIN_STYLES.synthwave;
  const min = Array.isArray(def.min) ? def.min.slice(0, 9) : fb.min.slice();
  while (min.length < 9) min.push(0.45);
  return {
    ...fb,
    ...def,
    patches: {
      bass: def.patches?.bass?.length ? def.patches.bass : fb.patches.bass,
      chords: def.patches?.chords?.length ? def.patches.chords : fb.patches.chords,
      arp: def.patches?.arp?.length ? def.patches.arp : fb.patches.arp,
      lead: def.patches?.lead?.length ? def.patches.lead : fb.patches.lead,
      texture: def.patches?.texture?.length ? def.patches.texture : fb.patches.texture,
      counter: def.patches?.counter?.length ? def.patches.counter : fb.patches.counter,
      drone: def.patches?.drone?.length ? def.patches.drone : fb.patches.drone,
      mallet: def.patches?.mallet?.length ? def.patches.mallet : fb.patches.mallet,
    },
    min,
  };
}

let customStyles: Record<string, StyleDef> = typeof localStorage !== 'undefined' ? loadCustomStylesFromStorage() : {};

function persistCustomStyles() {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(Object.values(customStyles)));
  } catch {
    /* storage unavailable */
  }
}

export const BUILTIN_STYLE_LIST: StyleDef[] = Object.values(BUILTIN_STYLES);

export function getStyle(id: string): StyleDef {
  return customStyles[id] ?? BUILTIN_STYLES[id as BuiltinStyleId] ?? BUILTIN_STYLES.synthwave;
}

export function hasStyle(id: string): boolean {
  return Boolean(customStyles[id] || BUILTIN_STYLES[id as BuiltinStyleId]);
}

export function isCustomStyle(id: string): boolean {
  return Boolean(customStyles[id]) && !BUILTIN_STYLES[id as BuiltinStyleId];
}

export function getCustomStyles(): StyleDef[] {
  return Object.values(customStyles);
}

export function getAllStyles(): StyleDef[] {
  return [...BUILTIN_STYLE_LIST, ...Object.values(customStyles)];
}

export function createCustomStyleId(name: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'custom';
  let id = `custom-${slug}`;
  let n = 2;
  while (hasStyle(id)) {
    id = `custom-${slug}-${n++}`;
  }
  return id;
}

export function saveCustomStyle(def: StyleDef): StyleDef {
  const normalized = normalizeStyleDef({ ...def, custom: true });
  customStyles = { ...customStyles, [normalized.id]: normalized };
  persistCustomStyles();
  return normalized;
}

export function deleteCustomStyle(id: string) {
  if (!customStyles[id]) return;
  const next = { ...customStyles };
  delete next[id];
  customStyles = next;
  persistCustomStyles();
}

// Legacy alias kept for direct imports
export const STYLES: Record<string, StyleDef> = BUILTIN_STYLES;
export const STYLE_LIST: StyleDef[] = BUILTIN_STYLE_LIST;
