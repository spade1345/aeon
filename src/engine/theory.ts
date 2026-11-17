// Music theory primitives: scales, meters, chords, voicing.

export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mod = (n: number, m: number) => ((n % m) + m) % m;
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] as const;
export const NOTE_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;
export const NOTE_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const;

/** Spell notes with flats in flat keys (by relative major), sharps otherwise. */
export function usesFlats(keyRoot: number, minorish: boolean): boolean {
  const major = minorish ? mod(keyRoot + 3, 12) : keyRoot;
  return [5, 10, 3, 8, 1].includes(major);
}

export type Family = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'lydian' | 'phrygian' | 'harmonic';
export type ScaleId =
  | 'major'
  | 'minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'harmonicMinor'
  | 'pentMajor'
  | 'pentMinor'
  | 'blues';

export interface ScaleDef {
  id: ScaleId;
  name: string;
  steps: number[]; // melodic scale (semitones above tonic)
  parent: number[]; // heptatonic scale used to build diatonic chords
  fam: Family;
}

const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];

export const SCALES: ScaleDef[] = [
  { id: 'major', name: 'Major (Ionian)', steps: MAJ, parent: MAJ, fam: 'major' },
  { id: 'minor', name: 'Natural Minor', steps: MIN, parent: MIN, fam: 'minor' },
  { id: 'dorian', name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10], parent: [0, 2, 3, 5, 7, 9, 10], fam: 'dorian' },
  { id: 'phrygian', name: 'Phrygian', steps: [0, 1, 3, 5, 7, 8, 10], parent: [0, 1, 3, 5, 7, 8, 10], fam: 'phrygian' },
  { id: 'lydian', name: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11], parent: [0, 2, 4, 6, 7, 9, 11], fam: 'lydian' },
  { id: 'mixolydian', name: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10], parent: [0, 2, 4, 5, 7, 9, 10], fam: 'mixolydian' },
  { id: 'harmonicMinor', name: 'Harmonic Minor', steps: [0, 2, 3, 5, 7, 8, 11], parent: [0, 2, 3, 5, 7, 8, 11], fam: 'harmonic' },
  { id: 'pentMajor', name: 'Major Pentatonic', steps: [0, 2, 4, 7, 9], parent: MAJ, fam: 'major' },
  { id: 'pentMinor', name: 'Minor Pentatonic', steps: [0, 3, 5, 7, 10], parent: MIN, fam: 'minor' },
  { id: 'blues', name: 'Blues', steps: [0, 3, 5, 6, 7, 10], parent: MIN, fam: 'minor' },
];
export const SCALE_BY_ID = Object.fromEntries(SCALES.map((s) => [s.id, s])) as Record<ScaleId, ScaleDef>;

// ---------------------------------------------------------------------------
// Meters. All grids are 16th-note steps. `beats` are beat lengths in steps
// (so 7/8 can be grouped 2+2+3 and 5/4 can be 3+2 via `strong`).
// ---------------------------------------------------------------------------
export type MeterId = '4/4' | '3/4' | '6/8' | '5/4' | '7/8' | '12/8';

export interface Meter {
  id: MeterId;
  beats: number[];
  starts: number[];
  steps: number;
  strong: number[]; // beat indices that carry kicks / strong accents
  backbeat: number[]; // beat indices for snare/clap
  half: number; // beat index for half-time snare
  w: number[]; // metric weight per step: 4 downbeat, 3 strong, 2 beat, 1 eighth, 0 sixteenth
}

function mkMeter(id: MeterId, beats: number[], strong: number[], backbeat: number[], half: number): Meter {
  const starts: number[] = [];
  let acc = 0;
  for (const b of beats) {
    starts.push(acc);
    acc += b;
  }
  const w: number[] = new Array(acc).fill(0);
  beats.forEach((len, b) => {
    for (let o = 0; o < len; o++) {
      w[starts[b] + o] = o === 0 ? (b === 0 ? 4 : strong.includes(b) ? 3 : 2) : o % 2 === 0 ? 1 : 0;
    }
  });
  return { id, beats, starts, steps: acc, strong, backbeat, half, w };
}

export const METERS: Record<MeterId, Meter> = {
  '4/4': mkMeter('4/4', [4, 4, 4, 4], [0, 2], [1, 3], 2),
  '3/4': mkMeter('3/4', [4, 4, 4], [0], [1, 2], 1),
  '6/8': mkMeter('6/8', [6, 6], [0], [1], 1),
  '5/4': mkMeter('5/4', [4, 4, 4, 4, 4], [0, 3], [2, 4], 3),
  '7/8': mkMeter('7/8', [4, 4, 6], [0, 2], [1], 2),
  '12/8': mkMeter('12/8', [6, 6, 6, 6], [0, 2], [1, 3], 2),
};
export const METER_LIST: MeterId[] = ['4/4', '3/4', '6/8', '5/4', '7/8', '12/8'];

/** Euclidean rhythm mask: k onsets spread over n slots. */
export function euclid(k: number, n: number): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < n; i++) out.push((i * k) % n < k);
  return out;
}

// ---------------------------------------------------------------------------
// Chords
// ---------------------------------------------------------------------------
export interface Chord {
  root: number; // semitones above tonic (0..11)
  iv: number[]; // intervals above root: [0, third, fifth, (seventh), (ninth)]
  deg: number; // scale degree (0..6) or -1 for chromatic chords
  suf: string; // name suffix ("m7", "maj9", ...)
  mask: number; // pitch classes (relative to tonic) as a 12-bit mask
  pool?: number[]; // cached arpeggio pool
  poolKey?: number;
}

export function chordSuffix(iv: number[]): string {
  const third = iv[1];
  const fifth = iv[2];
  const sev = iv[3];
  const nin = iv[4];
  const sus = third === 5 || third === 2;
  let s: string;
  if (sus) s = third === 5 ? 'sus4' : 'sus2';
  else if (third === 3) s = fifth === 6 ? 'dim' : 'm';
  else s = fifth === 8 ? 'aug' : '';
  if (sev !== undefined) {
    if (!sus && third === 3 && fifth === 6) s = sev === 9 ? 'dim7' : 'm7♭5';
    else if (!sus && third === 3) s = sev === 11 ? 'm(maj7)' : 'm7';
    else if (!sus) s = sev === 11 ? 'maj7' : '7';
    else s += '7';
    if (nin !== undefined) {
      if (/7$/.test(s)) s = s.replace(/7$/, '9');
      else s += 'add9';
      if (nin === 13) s += '♭9';
    }
  } else if (nin !== undefined) {
    s += 'add9';
  }
  return s;
}

export function finishChord(root: number, iv: number[], deg: number): Chord {
  let mask = 0;
  for (const i of iv) mask |= 1 << mod(root + i, 12);
  return { root: mod(root, 12), iv, deg, suf: chordSuffix(iv), mask };
}

/** Stack thirds on a degree of the parent heptatonic scale. ext: 0 triad, 1 seventh, 2 ninth. */
export function buildDiatonic(parent: number[], deg: number, ext: number): Chord {
  const at = (k: number) => {
    const idx = deg + k;
    return parent[idx % 7] + 12 * Math.floor(idx / 7);
  };
  const root = at(0);
  const iv = [0, at(2) - root, at(4) - root];
  if (ext >= 1) iv.push(at(6) - root);
  if (ext >= 2) iv.push(at(8) - root);
  return finishChord(root, iv, deg);
}

export function dominantSeventh(rootSemis: number): Chord {
  return finishChord(rootSemis, [0, 4, 7, 10], -1);
}

export function chordName(c: Chord, keyRoot: number, flats = false): string {
  return (flats ? NOTE_FLAT : NOTE_SHARP)[mod(keyRoot + c.root, 12)] + c.suf;
}

/** Lowest MIDI note >= lo with the given pitch class. */
export function lowestOfPc(pc: number, lo: number): number {
  return lo + mod(pc - lo, 12);
}

/** MIDI note with pitch class `pc` nearest to `ref`, clamped into [lo, hi]. */
export function nearestOfPc(pc: number, ref: number, lo: number, hi: number): number {
  let m = ref + mod(pc - ref + 6, 12) - 6;
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return m;
}

/**
 * Voice a chord as a compact close-position cluster with smooth voice-leading
 * from the previous voicing (minimal movement between chords).
 */
export function voiceChord(
  chord: Chord,
  keyRoot: number,
  prev: number[] | null,
  lo: number,
  hi: number,
  maxNotes: number,
): number[] {
  // priority: root, third, seventh, ninth, fifth
  const order = [0, 1, 3, 4, 2];
  const picked: number[] = [];
  for (const k of order) {
    if (chord.iv[k] !== undefined && picked.length < maxNotes) picked.push(k);
  }
  picked.sort((a, b) => a - b);
  const pcs = picked.map((k) => mod(keyRoot + chord.root + chord.iv[k], 12));
  const m = pcs.length;
  const center = (lo + hi) / 2;
  let best: number[] = [];
  let bestCost = Infinity;
  for (let rot = 0; rot < m; rot++) {
    const cand: number[] = [];
    let cur = lowestOfPc(pcs[rot], lo);
    cand.push(cur);
    for (let j = 1; j < m; j++) {
      const pc = pcs[(rot + j) % m];
      cur = cur + 1 + mod(pc - cur - 1, 12);
      cand.push(cur);
    }
    for (const shift of [-12, 0, 12]) {
      const c = cand.map((x) => x + shift);
      let cost = 0;
      if (prev && prev.length) {
        for (let i = 0; i < c.length; i++) cost += Math.abs(c[i] - prev[Math.min(i, prev.length - 1)]);
        cost += Math.abs(c.length - prev.length) * 1.5;
      } else {
        let mean = 0;
        for (const x of c) mean += x;
        cost += Math.abs(mean / c.length - center) * c.length;
      }
      const top = c[c.length - 1];
      const bot = c[0];
      if (top > hi) cost += (top - hi) * 4;
      if (bot < lo - 2) cost += (lo - bot) * 4;
      if (cost < bestCost) {
        bestCost = cost;
        best = c;
      }
    }
  }
  return best;
}
