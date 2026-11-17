// The procedural composer. Produces an endless stream of bars (note events per 16th step).
//
// Architecture
//   Movement  – a "piece": own themes, chord progressions, harmonic rhythm, bass personality, key.
//   Section   – intro / verse / build / chorus / bridge / breakdown, chosen by a Markov form model.
//   Bar       – composed just-in-time from the section plan, so settings changes apply within a bar.
import { Rng, randomSeed } from './rng';
import {
  METERS,
  SCALE_BY_ID,
  buildDiatonic,
  chordName,
  clamp,
  dominantSeventh,
  euclid,
  finishChord,
  lerp,
  lowestOfPc,
  mod,
  nearestOfPc,
  usesFlats,
  voiceChord,
  type Chord,
  type Meter,
  type ScaleDef,
  type ScaleId,
} from './theory';
import { applyCadence, genDegrees, passingDegree } from './harmony';
import { getStyle, STYLES, type ArpPat, type BassMode, type CompMode, type FillKind, type StyleDef } from './styles';
import { LAYER_PATCHES, PATCHES } from './patches';
import { invertTheme, makeTheme, transform, type Motif, type Op, type Theme } from './motif';
import type { Settings } from './settings';

export type SectionType = 'intro' | 'verse' | 'build' | 'chorus' | 'bridge' | 'breakdown';

export const L_DRUMS = 0;
export const L_BASS = 1;
export const L_CHORDS = 2;
export const L_ARP = 3;
export const L_LEAD = 4;
export const L_TEX = 5;
export const L_COUNTER = 6;
export const L_DRONE = 7;
export const L_MALLET = 8;

export const D_KICK = 0;
export const D_SNARE = 1;
export const D_CLAP = 2;
export const D_HAT = 3;
export const D_OPEN = 4;
export const D_PERC = 5;
export const D_TOM = 6;
export const D_CRASH = 7;
export const D_RISER = 8;

const EMPTY: number[] = [];
const BASS_LO = 35;

export interface Ev {
  layer: number;
  notes: number[]; // MIDI notes (pitched layers)
  dur: number; // in steps
  vel: number;
  drum: number; // drum voice id or -1
  p: number; // drum pitch parameter (toms)
}
const ev = (layer: number, notes: number[], dur: number, vel: number, drum = -1, p = 0): Ev => ({
  layer,
  notes,
  dur,
  vel,
  drum,
  p,
});

export interface BarMeta {
  type: SectionType;
  secIndex: number;
  bar: number;
  bars: number;
  chords: string[];
  chordIdx: number;
  spans: { step: number; idx: number }[];
  energy: number;
  key: number;
  scale: ScaleId;
  styleId: string;
  tempoScale: number;
  patches: string[];
  active: boolean[];
  movement: number;
  seed: number;
  hr: number;
}

export interface Bar {
  steps: number;
  ev: (Ev[] | null)[];
  beat: Uint8Array; // 0 none, 1 beat, 2 bar start
  pos: Uint8Array; // step offset within its beat (for swing)
  meta: BarMeta;
}

interface BassNote {
  t: number;
  d: number;
  role: number;
  vel: number;
}
interface DrumPlan {
  kick: number[];
  snare: number[];
  clap: number[];
  hat: number[];
  hatX: number[];
  open: number[];
  perc: number[];
  ghost: number[];
  fill: FillKind | null;
}
interface LeadBar {
  m: Motif | null;
  shift: number;
  cad: number; // 0 none, 1 half cadence, 2 full cadence
  oct: number;
}
interface Section {
  type: SectionType;
  index: number;
  bars: number;
  energy: number;
  slope: number;
  baseUser: number;
  hr: number;
  chords: Chord[];
  active: boolean[];
  drum: DrumPlan;
  bass: { mode: BassMode; pats: BassNote[][] };
  comp: { mode: CompMode; pat: { t: number; d: number; vel: number }[] };
  arp: { rate: number; pat: ArpPat; mask: boolean[]; oct: number };
  mallet: { rate: number; mask: boolean[]; dir: 1 | -1 };
  lead: LeadBar[];
  theme: Theme | null;
  anchor: number;
  fillEnd: boolean;
  crash: boolean;
  riser: boolean;
  texEcho: boolean;
  voic: (number[] | undefined)[];
  voicKey: number;
  names: string[];
  namesKey: number;
}

type Put = (step: number, e: Ev) => void;

const BASE_BARS: Record<SectionType, number> = { intro: 4, verse: 8, build: 4, chorus: 8, bridge: 4, breakdown: 4 };
const TYPE_E: Record<SectionType, number> = {
  intro: -0.22,
  verse: -0.04,
  build: 0.06,
  chorus: 0.2,
  bridge: -0.06,
  breakdown: -0.28,
};
// energy offsets for each layer (drums, bass, chords, arp, lead, texture, counter, drone, mallet) by section type; -9 = off
const TYPE_BONUS: Record<SectionType, number[]> = {
  intro: [-0.2, -0.1, 0.3, -0.1, -9, 0.3, -0.1, 0.25, -0.05],
  verse: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  build: [0.1, 0.1, 0.1, 0.2, -0.1, 0, 0.05, 0.1, 0.15],
  chorus: [0.15, 0.1, 0.1, 0.1, 0.15, 0, 0.12, 0.05, 0.1],
  bridge: [-0.1, 0, 0.1, 0, 0, 0.2, 0.18, 0.15, 0.05],
  breakdown: [-9, -0.15, 0.3, 0.1, -0.2, 0.3, 0.12, 0.25, 0.1],
};
const NEXT: Record<SectionType, [SectionType, number][]> = {
  intro: [['verse', 0.7], ['build', 0.15], ['breakdown', 0.15]],
  verse: [['verse', 0.2], ['chorus', 0.3], ['build', 0.3], ['bridge', 0.1], ['breakdown', 0.1]],
  build: [['chorus', 0.92], ['verse', 0.08]],
  chorus: [['verse', 0.3], ['bridge', 0.2], ['breakdown', 0.2], ['chorus', 0.12], ['build', 0.18]],
  bridge: [['build', 0.45], ['chorus', 0.3], ['verse', 0.15], ['breakdown', 0.1]],
  breakdown: [['build', 0.55], ['verse', 0.3], ['chorus', 0.15]],
};

interface FormOp {
  th: 0 | 1;
  sh: number;
  v?: boolean;
  f?: boolean;
}
const FORMS: FormOp[][] = [
  [{ th: 0, sh: 0 }, { th: 0, sh: 0, v: true }, { th: 0, sh: 1 }, { th: 1, sh: 0 }],
  [{ th: 0, sh: 0 }, { th: 0, sh: -1 }, { th: 1, sh: 0 }, { th: 0, sh: 0, v: true }],
  [{ th: 0, sh: 0 }, { th: 1, sh: 0 }, { th: 0, sh: 0, v: true }, { th: 1, sh: -1 }],
  [{ th: 0, sh: 0 }, { th: 0, sh: 1 }, { th: 0, sh: 2 }, { th: 1, sh: 0 }],
  [{ th: 0, sh: 0 }, { th: 1, sh: 0 }, { th: 0, sh: 1 }, { th: 1, sh: 0 }],
];
const BUILD_FORM: FormOp[] = [
  { th: 0, sh: 0 },
  { th: 0, sh: 1, v: true },
  { th: 0, sh: 2 },
  { th: 0, sh: 3, f: true },
];

const PATCH_KEYS = ['', 'bass', 'chords', 'arp', 'lead', 'texture', 'counter', 'drone', 'mallet'] as const;

export class Composer {
  seed: number;
  private rng: Rng;
  private inited = false;
  private style: StyleDef = STYLES.synthwave;
  private scale: ScaleDef = SCALE_BY_ID.minor;
  private meter: Meter = METERS['4/4'];
  private home = 0;
  private modOff = 0;
  private movement = 0;
  private secInMove = 0;
  private secCount = 0;
  private arc = 0;
  private sec: Section | null = null;
  private barIn = 0;
  private prevType: SectionType | null = null;
  private forceType: SectionType | null = null;
  private themes: Theme[] = [];
  private progs: number[][] = [];
  private hrBars = 1;
  private bassMode: BassMode = 'groove';
  private tempoScale = 1;
  private autoPatch: string[] = ['', '', '', '', '', '', '', '', ''];
  private prevVoicing: number[] | null = null;
  private bassPrev = 0;
  private leadPrev = 72;
  private texPrev = 84;
  private counterPrev = 64;
  private malletPrev = 69;
  private skip = false;
  private replan = false;
  private regenThemes = false;
  private redirect = false;
  private tonic = 60;
  private key = 0;

  constructor(seed: number = randomSeed()) {
    this.seed = seed;
    this.rng = new Rng(seed);
  }

  // ---- control surface -------------------------------------------------------
  reseed(seed: number) {
    this.seed = seed;
    this.rng = new Rng(seed);
    this.inited = false;
    this.sec = null;
    this.barIn = 0;
    this.secCount = 0;
    this.forceType = null;
    this.prevType = null;
    this.skip = this.replan = this.regenThemes = this.redirect = false;
    this.prevVoicing = null;
    // register memories must restart too, otherwise a replayed seed drifts from the original
    this.bassPrev = 0;
    this.leadPrev = 72;
    this.texPrev = 84;
    this.counterPrev = 64;
    this.malletPrev = 69;
  }
  requestSkip() {
    this.skip = true;
  }
  requestReplan(regenThemes: boolean) {
    this.replan = true;
    if (regenThemes) this.regenThemes = true;
  }
  requestRedirect() {
    this.redirect = true;
  }
  currentKey() {
    return this.key;
  }

  // ---- pitch helpers ---------------------------------------------------------
  private setPitchContext() {
    this.key = mod(this.home + this.modOff, 12);
    this.tonic = 60 + mod(this.key + 5, 12) - 5;
  }
  private midiOfIdx(idx: number): number {
    const st = this.scale.steps;
    const n = st.length;
    const oct = Math.floor(idx / n);
    return this.tonic + 12 * oct + st[idx - oct * n];
  }
  private idxNear(midi: number): number {
    const n = this.scale.steps.length;
    let best = 0;
    let bd = 999;
    for (let i = -n * 3; i <= n * 4; i++) {
      const d = Math.abs(this.midiOfIdx(i) - midi);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }
  private snap(midi: number, mask: number, prev: number): number {
    const key = this.key;
    if ((mask >> mod(midi - key, 12)) & 1) return midi;
    for (let d = 1; d <= 3; d++) {
      const up = midi + d;
      const dn = midi - d;
      const okU = (mask >> mod(up - key, 12)) & 1;
      const okD = (mask >> mod(dn - key, 12)) & 1;
      if (okU && okD) return Math.abs(up - prev) <= Math.abs(dn - prev) ? up : dn;
      if (okU) return up;
      if (okD) return dn;
    }
    return midi;
  }
  private chordIdx(sec: Section, step: number): number {
    return Math.floor(step / sec.hr) % sec.chords.length;
  }
  private chordAt(sec: Section, step: number): Chord {
    return sec.chords[this.chordIdx(sec, step)];
  }

  // ---- song / movement state ---------------------------------------------------
  private applyStructure(s: Settings) {
    this.style = getStyle(s.style);
    this.scale = SCALE_BY_ID[s.scale];
    this.meter = METERS[s.meter];
  }

  private sync(s: Settings) {
    if (!this.inited) {
      this.inited = true;
      this.applyStructure(s);
      this.home = s.keyRoot;
      this.modOff = 0;
      this.movement = -1;
      this.arc = this.rng.range(0, 6.28);
      this.secCount = 0;
      this.sec = null;
      this.tempoScale = 1;
      this.prevVoicing = null;
      this.setPitchContext();
      this.newMovement(s, true);
      return;
    }
    const nextStyle = getStyle(s.style);
    if (nextStyle !== this.style || s.scale !== this.scale.id || s.meter !== this.meter.id) {
      this.applyStructure(s);
      this.modOff = 0;
      this.setPitchContext();
      this.newMovement(s, true);
      this.sec = null;
      this.forceType = 'verse';
      this.prevVoicing = null;
    }
    if (s.keyRoot !== this.home) this.home = s.keyRoot;
    this.setPitchContext();
  }

  private newMovement(s: Settings, fresh: boolean) {
    const rng = this.rng;
    const st = this.style;
    this.movement++;
    this.secInMove = 0;
    if (!fresh && s.autoKey) {
      if (this.modOff !== 0 && rng.chance(0.4)) this.modOff = 0;
      else this.modOff = mod(this.modOff + rng.pick([7, 5, 2, 3, 9, 10]), 12);
      this.setPitchContext();
    }
    const okHalf = this.meter.id === '4/4' || this.meter.id === '12/8' || this.meter.id === '6/8';
    const opts = st.hr.filter(([h]) => h !== 0.5 || okHalf);
    this.hrBars = rng.weighted(
      opts.map((o) => o[0]),
      opts.map((o) => o[1]),
    );
    const fam = this.scale.fam;
    const jazzy = st.ext > 0.8;
    const a = genDegrees(rng, fam, jazzy);
    let b = genDegrees(rng, fam, jazzy);
    for (let i = 0; i < 4 && b.join() === a.join(); i++) b = genDegrees(rng, fam, jazzy);
    this.progs = [a, b, genDegrees(rng, fam, jazzy)];
    this.makeThemes(s);
    this.bassMode = rng.pick(st.bass);
    this.rollPatches(s, true);
  }

  private makeThemes(s: Settings) {
    const st = this.style;
    const m = this.meter;
    const rng = this.rng;
    const dens = clamp(st.lead.density * (0.55 + 0.9 * s.rhythmic), 0.1, 0.95);
    const p = { mc: s.melodic, rc: s.rhythmic, dens, grid: st.lead.grid };
    const A = makeTheme(rng, m, p);
    const B = makeTheme(rng, m, { ...p, dens: clamp(dens + 0.15, 0.1, 0.95), rc: clamp(s.rhythmic + 0.1, 0, 1) });
    const C = invertTheme(A, m, rng);
    this.themes = [A, B, C];
  }

  private rollPatches(s: Settings, init: boolean) {
    const rng = this.rng;
    const evo = s.evolution;
    for (let l = 1; l < PATCH_KEYS.length; l++) {
      const key = PATCH_KEYS[l];
      const pool = (key ? this.style.patches[key] : null) ?? LAYER_PATCHES[l];
      if (!s.autoInstruments) {
        this.autoPatch[l] = pool[0];
      } else if (init || !this.autoPatch[l] || !pool.includes(this.autoPatch[l])) {
        this.autoPatch[l] = rng.chance(0.6) ? pool[0] : rng.pick(pool);
      } else if (pool.length > 1 && rng.chance((l === 1 ? 0.05 : 0.12) + 0.3 * evo)) {
        const others = pool.filter((x) => x !== this.autoPatch[l]);
        this.autoPatch[l] = rng.pick(others);
      }
    }
  }

  private pickType(evo: number): SectionType {
    const last = this.sec!.type;
    const table = NEXT[last];
    const w = table.map(([t, p]) => {
      let x = p;
      if (t === 'bridge' || t === 'breakdown') x *= 0.5 + evo;
      if (t === last && (t === 'verse' || t === 'chorus') && this.prevType === last) x = 0;
      return x;
    });
    return this.rng.weighted(
      table.map((t) => t[0]),
      w,
    );
  }

  // ---- section planning ----------------------------------------------------------
  private startSection(s: Settings) {
    const rng = this.rng;
    const st = this.style;
    const evo = s.evolution;
    const finished = this.sec?.type ?? null;

    if (this.regenThemes) {
      this.regenThemes = false;
      this.makeThemes(s);
    }

    let type: SectionType;
    if (this.forceType) {
      type = this.forceType;
      this.forceType = null;
    } else if (!this.sec) {
      type = 'intro';
    } else {
      const moveLen = Math.round(lerp(20, 8, evo));
      if (this.secInMove >= moveLen) {
        this.newMovement(s, false);
        type = rng.chance(0.6) ? 'breakdown' : 'intro';
      } else type = this.pickType(evo);
    }

    this.setPitchContext();
    const steps = this.meter.steps;
    const mult = evo < 0.25 ? 2 : evo > 0.75 ? 0.5 : 1;
    const bars = clamp(Math.round((BASE_BARS[type] * mult) / 4) * 4, 4, 16);

    this.arc += rng.range(0.6, 1.3) * (0.35 + evo);
    const arcV = 0.5 + 0.5 * Math.sin(this.arc);
    const amount = 0.25 + 0.75 * evo;
    const energy = clamp(s.energy + (arcV - 0.5) * 0.9 * amount + TYPE_E[type], 0.06, 1);
    const slope = type === 'build' ? 0.28 : type === 'intro' ? 0.15 : type === 'breakdown' ? 0.08 : 0;
    const active = TYPE_BONUS[type].map((b, l) => energy + b >= (st.min[l] ?? 0.5));
    active[L_CHORDS] = true;

    if (s.tempoDrift) this.tempoScale = clamp(this.tempoScale + rng.range(-0.03, 0.03), 0.93, 1.07);
    else this.tempoScale = 1;
    if (this.secCount > 0) this.rollPatches(s, false);

    const hr = Math.round(this.hrBars * steps);
    const chords = this.buildChords(type, bars, hr, s);
    const theme =
      type === 'chorus' || type === 'build' ? this.themes[1] : type === 'bridge' ? this.themes[2] : this.themes[0];
    const centerMidi = st.lead.center + (type === 'chorus' ? 3 : type === 'bridge' ? -2 : 0);
    const anchor = this.idxNear(centerMidi);

    const sec: Section = {
      type,
      index: this.secCount,
      bars,
      energy,
      slope,
      baseUser: s.energy,
      hr,
      chords,
      active,
      drum: this.planDrums(s),
      bass: this.planBass(type, hr, s),
      comp: this.planComp(type, s),
      arp: this.planArp(energy, s),
      mallet: this.planMallet(energy, s),
      lead: this.planLead(type, bars, theme, energy, s),
      theme,
      anchor,
      fillEnd: type === 'build' || rng.chance(st.drums.fill * (0.5 + 0.5 * evo)),
      crash:
        type !== 'build' &&
        type !== 'breakdown' &&
        (type === 'chorus' || finished === 'build' || finished === 'breakdown' || finished === 'intro'),
      riser: type === 'build' && st.id !== 'classical',
      texEcho: !active[L_LEAD] && rng.chance(0.75),
      voic: [],
      voicKey: this.key,
      names: [],
      namesKey: -1,
    };
    this.prevType = finished;
    this.sec = sec;
    this.barIn = 0;
    this.secCount++;
    this.secInMove++;
    this.leadPrev = this.midiOfIdx(anchor);
  }

  private makeChord(deg: number, e: number, hc: number): Chord {
    const rng = this.rng;
    const fam = this.scale.fam;
    const r = rng.next();
    let ext = 0;
    if (r < clamp(e - 0.55, 0, 1)) ext = 2;
    else if (r < clamp(e - 0.1, 0, 1)) ext = 1;
    let c = buildDiatonic(this.scale.parent, deg, ext);
    // keep colour tones tasteful: no 9th on diminished chords or with a flat-9 clash
    if (ext === 2 && (c.iv[2] === 6 || c.iv[4] === 13)) c = buildDiatonic(this.scale.parent, deg, 1);
    const minorish = fam === 'minor' || fam === 'dorian' || fam === 'phrygian';
    if (deg === 4 && minorish && c.iv[1] === 3 && c.iv[2] === 7 && rng.chance(0.4 + hc * 0.3)) {
      const iv = c.iv.slice();
      iv[1] = 4;
      if (iv[3] !== undefined) iv[3] = 10;
      c = finishChord(c.root, iv, deg);
    }
    if (hc > 0.5 && (deg === 0 || deg === 4) && c.iv[2] === 7 && rng.chance(0.12 * hc)) {
      const iv = c.iv.slice();
      iv[1] = 5;
      c = finishChord(c.root, iv, deg);
    }
    return c;
  }

  private buildChords(type: SectionType, bars: number, hr: number, s: Settings): Chord[] {
    const rng = this.rng;
    const steps = this.meter.steps;
    const fam = this.scale.fam;
    const st = this.style;
    const base = this.progs[type === 'chorus' || type === 'build' ? 1 : type === 'bridge' ? 2 : 0];
    const phrases = Math.max(1, Math.floor(bars / 4));
    const slotsPer = Math.max(2, Math.round((4 * steps) / hr));
    const hc = s.harmonic;
    const e = hc * 0.7 + st.ext * 0.5;
    const chords: Chord[] = [];
    for (let p = 0; p < phrases; p++) {
      const slots: number[] = [];
      if (slotsPer >= 8) {
        for (let k = 0; k < 4; k++) {
          slots.push(base[k]);
          slots.push(rng.chance(0.5) ? base[k] : passingDegree(rng, base[k], base[(k + 1) % 4], fam));
        }
      } else if (slotsPer === 4) slots.push(...base);
      else slots.push(base[0], base[2]);
      const last = p === phrases - 1;
      applyCadence(slots, last && type !== 'build' ? 'full' : 'half', fam, rng);
      const row: Chord[] = slots.map((d) => this.makeChord(d, e, hc));
      // colour: secondary dominants and borrowed chords at higher harmonic complexity
      if (hc > 0.45) {
        for (let k = 1; k < row.length - 1; k++) {
          const target = row[k + 1];
          if (
            target.deg >= 0 &&
            target.iv[2] === 7 &&
            slots[k] !== 4 &&
            slots[k + 1] !== slots[k] &&
            rng.chance((hc - 0.4) * 0.5)
          ) {
            row[k] = dominantSeventh(mod(target.root + 7, 12));
          } else if (fam === 'major' && hc > 0.55 && slots[k] === 3 && rng.chance((hc - 0.5) * 0.5)) {
            row[k] = finishChord(row[k].root, [0, 3, 7], -1);
          } else if (fam === 'major' && hc > 0.55 && slots[k] === 6 && rng.chance((hc - 0.5) * 0.7)) {
            row[k] = finishChord(10, [0, 4, 7], -1);
          }
        }
      }
      chords.push(...row);
    }
    return chords;
  }

  private planLead(type: SectionType, bars: number, theme: Theme, energy: number, s: Settings): LeadBar[] {
    const rng = this.rng;
    const m = this.meter;
    const out: LeadBar[] = [];
    const varP = 0.1 + 0.75 * s.randomness;
    const phrases = Math.max(1, Math.floor(bars / 4));
    const forms = type === 'build' ? [BUILD_FORM] : FORMS;
    let form = rng.pick(forms);
    for (let p = 0; p < phrases; p++) {
      if (p > 0 && rng.chance(0.25)) form = rng.pick(forms);
      for (let j = 0; j < 4; j++) {
        const op = form[j];
        let mo: Motif | null = op.th === 0 ? theme.a : theme.b;
        if (rng.chance(op.v ? 0.85 : varP * (p > 0 ? 0.6 : 0.3))) mo = this.vary(mo, s);
        if (op.f) mo = transform(rng, mo, 'frag', m);
        let shift = op.sh;
        if (type === 'chorus' && p > 0 && energy > 0.6) shift += 2;
        const bi = p * 4 + j;
        if (type === 'breakdown') {
          mo = bi % 2 === 0 ? transform(rng, transform(rng, mo, 'aug', m), 'thin', m) : null;
        }
        const cad = j === 3 ? (p === phrases - 1 && type !== 'build' ? 2 : 1) : 0;
        out.push({ m: mo, shift, cad, oct: 0 });
      }
    }
    return out;
  }

  private vary(mo: Motif, s: Settings): Motif {
    const rng = this.rng;
    const ops: Op[] = ['orn', 'syn', 'thin', 'frag', 'ret'];
    const w = [0.2 + 0.7 * s.melodic, 0.25 + 0.4 * s.rhythmic, 0.15, 0.12, 0.04];
    return transform(rng, mo, rng.weighted(ops, w), this.meter);
  }

  private planDrums(s: Settings): DrumPlan {
    const rng = this.rng;
    const st = this.style.drums;
    const m = this.meter;
    const rc = s.rhythmic;
    const steps = m.steps;
    const z = () => new Array<number>(steps).fill(0);
    const p: DrumPlan = {
      kick: z(),
      snare: z(),
      clap: z(),
      hat: z(),
      hatX: z(),
      open: z(),
      perc: z(),
      ghost: z(),
      fill: st.fillKinds.length ? rng.pick(st.fillKinds) : null,
    };
    // snare / clap backbeat
    if (st.snare !== 'none') {
      const beats = st.snare === 'half' ? [m.half] : m.backbeat;
      for (const b of beats) {
        const step = m.starts[b];
        if (st.backbeat === 'snare' || st.backbeat === 'both') p.snare[step] = 1;
        if (st.backbeat === 'clap' || st.backbeat === 'both') p.clap[step] = st.backbeat === 'both' ? 0.6 : 0.9;
      }
    }
    // kick
    switch (st.kick) {
      case 'four':
        m.starts.forEach((s0, b) => (p.kick[s0] = b === 0 ? 1 : 0.9));
        break;
      case 'strong':
        m.strong.forEach((b) => (p.kick[m.starts[b]] = b === 0 ? 1 : 0.9));
        break;
      case 'break':
        p.kick[0] = 1;
        m.strong.forEach((b) => {
          if (b > 0 && rng.chance(0.5)) p.kick[m.starts[b]] = 0.85;
        });
        break;
      case 'sparse':
        p.kick[0] = 1;
        if (m.strong.length > 1 && rng.chance(0.6)) p.kick[m.starts[m.strong[1]]] = 0.8;
        break;
      default:
        break;
    }
    if (st.kick !== 'none' && st.kick !== 'four' && st.kickSync > 0) {
      const k = Math.round(st.kickSync * (0.8 + rc * 2.4) + (rng.chance(0.3) ? 1 : 0));
      const ws = m.w.map((w, i) => (p.kick[i] || p.snare[i] || p.clap[i] ? 0 : w === 1 ? 0.6 : w === 0 ? 0.3 : 0));
      for (const i of rng.sample(ws, k)) p.kick[i] = 0.7 + rng.next() * 0.2;
    }
    // ghost notes
    if (st.ghost > 0) {
      const ws = m.w.map((w, i) => (w === 0 && !p.snare[i] && !p.snare[i + 1] && !p.snare[i - 1] ? 1 : 0));
      const k = Math.round(st.ghost * (1 + rc * 3));
      for (const i of rng.sample(ws, k)) p.ghost[i] = 0.2 + rng.next() * 0.1;
    }
    // hats
    switch (st.hat) {
      case 'eighth':
        m.w.forEach((w, i) => {
          if (w >= 1) p.hat[i] = w >= 2 ? 0.8 : 0.55;
          else if (rng.chance(0.2 + 0.5 * rc)) p.hatX[i] = 0.28;
        });
        break;
      case 'sixteenth':
        m.w.forEach((w, i) => (p.hat[i] = w >= 2 ? 0.85 : w === 1 ? 0.6 : 0.38));
        break;
      case 'offbeat':
        m.w.forEach((w, i) => {
          if (w >= 1) p.hat[i] = w >= 2 ? 0.35 : 0.5;
          else if (rng.chance(0.15 + 0.5 * rc)) p.hatX[i] = 0.25;
        });
        m.starts.forEach((s0, b) => {
          p.open[s0 + Math.floor(m.beats[b] / 2)] = 0.7;
        });
        break;
      case 'ride':
        m.starts.forEach((s0, b) => {
          p.open[s0] = 0.7;
          if (b % 2 === 1 || m.beats.length === 3) p.open[s0 + 2] = 0.5;
        });
        m.backbeat.forEach((b) => (p.hat[m.starts[b]] = 0.35));
        break;
      case 'sparse':
        m.starts.forEach((s0, b) => {
          p.hat[s0] = 0.45;
          p.hatX[s0 + Math.floor(m.beats[b] / 2)] = 0.3;
        });
        break;
      default:
        break;
    }
    // euclidean percussion
    if (st.perc > 0) {
      const k = clamp(Math.round(2 + st.perc * 3 + rc * 3), 2, Math.floor(steps / 2));
      const mask = euclid(k, steps);
      const rot = rng.int(steps);
      for (let i = 0; i < steps; i++) {
        if (mask[(i + rot) % steps] && !p.snare[i] && !p.clap[i] && !p.kick[i]) p.perc[i] = 0.3 + 0.08 * m.w[i];
      }
    }
    return p;
  }

  private genBass(mode: BassMode, hr: number, rc: number): BassNote[] {
    const rng = this.rng;
    const m = this.meter;
    const steps = m.steps;
    const out: BassNote[] = [];
    switch (mode) {
      case 'sustain': {
        const span = Math.min(hr, steps);
        for (let t = 0; t < steps; t += span) out.push({ t, d: Math.min(span, steps - t) * 0.98, role: 0, vel: 0.9 });
        if (rc > 0.5 && span === steps && rng.chance(rc * 0.6)) {
          const t2 = m.starts[Math.floor(m.beats.length / 2)];
          out[0].d = t2 - 0.5;
          out.push({ t: t2, d: (steps - t2) * 0.95, role: rng.chance(0.5) ? 2 : 1, vel: 0.6 });
        }
        break;
      }
      case 'pulse': {
        const tpl = rng.pick([
          [0, 0, 0, 0],
          [0, 2, 0, 2],
          [0, 0, 1, 0],
          [0, 2, 0, 1],
          [0, 0, 2, 0],
        ]);
        for (let t = 0, k = 0; t < steps; t += 2, k++) {
          if (t > 0 && m.w[t] <= 1 && rng.chance(rc * 0.2)) continue;
          out.push({ t, d: 1.7, role: tpl[k % 4], vel: m.w[t] >= 2 ? 1 : 0.75 });
        }
        break;
      }
      case 'offbeat': {
        m.starts.forEach((s0, b) => {
          out.push({ t: s0 + 2, d: 1.8, role: 0, vel: 0.9 });
          if (b === 0 && rng.chance(0.5)) out.push({ t: s0, d: 1.5, role: 0, vel: 0.7 });
          if (b < m.beats.length - 1 && rng.chance(rc * 0.4)) out.push({ t: s0 + 3, d: 0.9, role: 2, vel: 0.6 });
        });
        break;
      }
      case 'groove': {
        const F = [0.2 + 0.35 * rc, 0.4 + 0.25 * rc, 0.5, 0.8, 1];
        const dens = this.style.bassDensity * (0.6 + 0.8 * rc);
        let last = -9;
        for (let t = 0; t < steps; t++) {
          const w = m.w[t];
          const p = t === 0 ? 1 : dens * F[w];
          if (!rng.chance(p)) continue;
          if (t - last < 2 && w === 0 && rc < 0.6) continue;
          out.push({ t, d: 1, role: 0, vel: 0.6 + 0.1 * w });
          last = t;
        }
        for (let k = 0; k < out.length; k++) {
          const nxt = k + 1 < out.length ? out[k + 1].t : steps;
          out[k].d = Math.min(6, nxt - out[k].t) * 0.9;
          if (out[k].t > 0) {
            out[k].role = rng.weighted([0, 2, 1, 3, 4, 5], [0.5, 0.15, 0.2, 0.05, 0.05, out[k].t >= steps - 4 ? 0.35 : 0]);
          }
        }
        break;
      }
      default:
        break; // 'walk' is improvised bar by bar
    }
    return out;
  }

  private planBass(type: SectionType, hr: number, s: Settings): { mode: BassMode; pats: BassNote[][] } {
    let mode = this.bassMode;
    if ((type === 'intro' || type === 'breakdown') && mode !== 'walk') mode = 'sustain';
    const rc = s.rhythmic;
    return { mode, pats: [this.genBass(mode, hr, rc), this.genBass(mode, hr, clamp(rc + 0.15, 0, 1))] };
  }

  private planComp(type: SectionType, s: Settings) {
    const rng = this.rng;
    const m = this.meter;
    const st = this.style;
    const rc = s.rhythmic;
    let mode = rng.pick(st.comp);
    if ((type === 'intro' || type === 'breakdown') && mode !== 'alberti') mode = 'sustain';
    const pat: { t: number; d: number; vel: number }[] = [];
    if (mode === 'offbeat') {
      m.starts.forEach((s0, b) => pat.push({ t: s0 + Math.floor(m.beats[b] / 2), d: 1.6, vel: 0.85 }));
    } else if (mode === 'stab') {
      const W = [0.25 + 0.35 * rc, 0.6, 0.5, 0.7, 1];
      const k = clamp(Math.round(1.5 + st.compDensity * 3 + rc * 2), 2, 7);
      const picks = rng.sample(
        m.w.map((w) => W[w]),
        k,
      ).sort((a, b) => a - b);
      if (!picks.includes(0) && rng.chance(0.8)) picks.unshift(0);
      picks.forEach((t, i) => {
        const nxt = picks[i + 1] ?? m.steps;
        pat.push({ t, d: clamp((nxt - t) * 0.85, 1, 6), vel: 0.7 + 0.08 * m.w[t] });
      });
    }
    return { mode, pat };
  }

  private planArp(energy: number, s: Settings) {
    const rng = this.rng;
    const a = this.style.arp;
    const steps = this.meter.steps;
    const rate = energy > 0.7 && a.fast ? 1 : a.rate;
    const slots = Math.ceil(steps / rate);
    let mask: boolean[];
    if (s.rhythmic > 0.35 && rng.chance(0.55)) {
      const k = clamp(Math.round(slots * (0.5 + 0.35 * rng.next())), 3, slots);
      const rot = rng.int(slots);
      const e = euclid(k, slots);
      mask = e.map((_, i) => e[(i + rot) % slots]);
      mask[0] = true;
    } else mask = new Array<boolean>(slots).fill(true);
    return { rate, pat: rng.pick(a.pats), mask, oct: a.octaves };
  }

  private planMallet(energy: number, s: Settings) {
    const rng = this.rng;
    const rate = s.rhythmic > 0.65 && energy > 0.55 ? 1 : 2;
    const slots = Math.ceil(this.meter.steps / rate);
    const k = clamp(Math.round(slots * (0.28 + 0.38 * s.rhythmic)), 2, Math.max(2, slots - 1));
    const rot = rng.int(slots);
    const e = euclid(k, slots);
    const mask = e.map((_, i) => e[(i + rot) % slots]);
    return { rate, mask, dir: (rng.chance(0.5) ? 1 : -1) as 1 | -1 };
  }

  // ---- bar composition ---------------------------------------------------------------
  nextBar(s: Settings): Bar {
    this.sync(s);
    let start = !this.sec || this.barIn >= this.sec.bars;
    if (this.redirect) {
      this.redirect = false;
      this.newMovement(s, false);
      this.forceType = this.rng.pick<SectionType>(['verse', 'chorus', 'verse', 'bridge']);
      start = true;
    } else if (this.skip) {
      this.skip = false;
      start = true;
    } else if (this.replan && this.sec) {
      this.replan = false;
      this.forceType = this.sec.type === 'intro' ? 'verse' : this.sec.type;
      start = true;
    }
    if (start) {
      this.replan = false;
      this.startSection(s);
    }
    const bar = this.composeBar(s);
    this.barIn++;
    return bar;
  }

  private voicing(sec: Section, idx: number): number[] {
    let v = sec.voic[idx];
    if (!v) {
      const chord = sec.chords[idx];
      v = voiceChord(chord, this.key, this.prevVoicing, 53, 70, chord.iv.length >= 4 ? 4 : 3);
      sec.voic[idx] = v;
      this.prevVoicing = v;
    }
    return v;
  }

  private composeBar(s: Settings): Bar {
    const sec = this.sec!;
    const m = this.meter;
    const steps = m.steps;
    const bi = this.barIn;
    this.setPitchContext();
    if (sec.voicKey !== this.key) {
      sec.voic = [];
      sec.voicKey = this.key;
    }
    const frac = sec.bars > 1 ? bi / (sec.bars - 1) : 0;
    const e = clamp(sec.energy + sec.slope * frac + (s.energy - sec.baseUser), 0.05, 1);
    const evs: (Ev[] | null)[] = new Array(steps).fill(null);
    const put: Put = (step, x) => {
      const a = evs[step];
      if (a) a.push(x);
      else evs[step] = [x];
    };
    const base = bi * steps;
    if (sec.active[L_DRUMS]) this.composeDrums(sec, bi, e, put);
    if (sec.active[L_BASS]) this.composeBass(sec, bi, e, put, base);
    if (sec.active[L_CHORDS]) this.composeChords(sec, e, put, base, s);
    if (sec.active[L_ARP]) this.composeArp(sec, e, put, base);
    if (sec.active[L_LEAD]) this.composeLead(sec, bi, e, put, base, s.melodic);
    if (sec.active[L_TEX]) this.composeTexture(sec, bi, e, put, base);
    if (sec.active[L_COUNTER]) this.composeCounter(sec, bi, e, put, base, s.melodic);
    if (sec.active[L_DRONE]) this.composeDrone(sec, e, put, base);
    if (sec.active[L_MALLET]) this.composeMallet(sec, bi, e, put, base);

    const beat = new Uint8Array(steps);
    m.starts.forEach((s0, b) => (beat[s0] = b === 0 ? 2 : 1));

    if (sec.namesKey !== this.key) {
      const flats = usesFlats(this.key, this.scale.steps[2] === 3);
      sec.names = sec.chords.map((c) => chordName(c, this.key, flats));
      sec.namesKey = this.key;
    }
    const pos = new Uint8Array(steps);
    m.starts.forEach((s0, b) => {
      for (let o = 0; o < m.beats[b]; o++) pos[s0 + o] = o;
    });
    const spans: { step: number; idx: number }[] = [{ step: 0, idx: this.chordIdx(sec, base) }];
    for (let st = 1; st < steps; st++) {
      if ((base + st) % sec.hr === 0) spans.push({ step: st, idx: this.chordIdx(sec, base + st) });
    }
    return {
      steps,
      ev: evs,
      beat,
      pos,
      meta: {
        type: sec.type,
        secIndex: sec.index,
        bar: bi,
        bars: sec.bars,
        chords: sec.names,
        chordIdx: spans[0].idx,
        spans,
        energy: e,
        key: this.key,
        scale: this.scale.id,
        styleId: this.style.id,
        tempoScale: this.tempoScale,
        patches: this.autoPatch,
        active: sec.active,
        movement: this.movement,
        seed: this.seed,
        hr: sec.hr,
      },
    };
  }

  private composeDrums(sec: Section, bi: number, e: number, put: Put) {
    const p = sec.drum;
    const m = this.meter;
    const steps = m.steps;
    const rng = this.rng;
    const vh = (v: number) => clamp(v * (0.92 + rng.next() * 0.16), 0.05, 1);
    const fill = sec.fillEnd && bi === sec.bars - 1 && p.fill !== null;
    const from = fill
      ? sec.type === 'build' && m.beats.length >= 4
        ? m.starts[m.starts.length - 2]
        : m.starts[m.starts.length - 1]
      : steps;
    for (let s = 0; s < from; s++) {
      if (p.kick[s]) put(s, ev(0, EMPTY, 1, vh(p.kick[s]), D_KICK));
      if (p.snare[s]) put(s, ev(0, EMPTY, 1, vh(p.snare[s]), D_SNARE));
      if (p.clap[s]) put(s, ev(0, EMPTY, 1, vh(p.clap[s]), D_CLAP));
      const w = m.w[s];
      let h = p.hat[s];
      if (e < 0.4 && w === 0) h = 0;
      if (h) put(s, ev(0, EMPTY, 1, vh(h), D_HAT));
      if (p.hatX[s] && e > 0.55) put(s, ev(0, EMPTY, 1, vh(p.hatX[s]), D_HAT));
      if (p.open[s]) put(s, ev(0, EMPTY, 1, vh(p.open[s]), D_OPEN));
      if (p.perc[s] && e > 0.4) put(s, ev(0, EMPTY, 1, vh(p.perc[s]), D_PERC));
      if (p.ghost[s] && e > 0.45) put(s, ev(0, EMPTY, 1, vh(p.ghost[s]), D_SNARE));
    }
    if (fill) {
      const n = steps - from;
      switch (p.fill) {
        case 'toms': {
          const hits = Math.min(n, 6);
          for (let i = 0; i < hits; i++) {
            put(from + Math.floor((i * n) / hits), ev(0, EMPTY, 1, 0.6 + (0.4 * i) / hits, D_TOM, Math.min(2, Math.floor((i * 3) / hits))));
          }
          break;
        }
        case 'hats': {
          for (let s = from; s < steps; s++) put(s, ev(0, EMPTY, 1, 0.3 + (0.5 * (s - from)) / n, D_HAT));
          put(steps - 1, ev(0, EMPTY, 1, 0.8, D_OPEN));
          put(from, ev(0, EMPTY, 1, 0.9, D_KICK));
          break;
        }
        default: {
          for (let s = from; s < steps; s++) {
            put(s, ev(0, EMPTY, 1, 0.35 + (0.6 * (s - from)) / Math.max(1, n - 1), D_SNARE));
          }
          break;
        }
      }
    }
    if (bi === 0 && sec.crash) put(0, ev(0, EMPTY, 4, 0.8, D_CRASH));
    if (sec.riser && bi === sec.bars - 2) put(0, ev(0, EMPTY, steps * 2, 0.6, D_RISER));
  }

  private composeBass(sec: Section, bi: number, e: number, put: Put, base: number) {
    if (sec.bass.mode === 'walk') {
      this.composeWalk(sec, put, base);
      return;
    }
    const pats = sec.bass.pats;
    const pat = bi % 4 === 3 && pats.length > 1 ? pats[1] : pats[0];
    for (const n of pat) {
      const chord = this.chordAt(sec, base + n.t);
      const rootMidi = lowestOfPc(mod(this.key + chord.root, 12), BASS_LO);
      let midi: number;
      switch (n.role) {
        case 1:
          midi = rootMidi + 7;
          break;
        case 2:
          midi = rootMidi + 12;
          break;
        case 3:
          midi = rootMidi + chord.iv[1];
          break;
        case 4:
          midi = rootMidi + (chord.iv[3] ?? 10);
          break;
        case 5: {
          const nxt = this.chordAt(sec, base + n.t + Math.ceil(n.d));
          const nr = lowestOfPc(mod(this.key + nxt.root, 12), BASS_LO);
          if (nr === rootMidi) midi = rootMidi + 7;
          else midi = Math.abs(nr - 1 - rootMidi) <= Math.abs(nr + 1 - rootMidi) ? nr - 1 : nr + 1;
          break;
        }
        default:
          midi = rootMidi;
      }
      if (midi > 52) midi -= 12;
      put(n.t, ev(L_BASS, [midi], n.d, clamp(n.vel * (0.8 + 0.25 * e), 0.2, 1)));
    }
  }

  private composeWalk(sec: Section, put: Put, base: number) {
    const m = this.meter;
    const rng = this.rng;
    const nb = m.beats.length;
    let prev = this.bassPrev || 40;
    const nextChord = this.chordAt(sec, base + m.steps);
    for (let k = 0; k < nb; k++) {
      const s0 = m.starts[k];
      const chord = this.chordAt(sec, base + s0);
      let midi: number;
      if (k === 0) {
        midi = nearestOfPc(mod(this.key + chord.root, 12), prev, BASS_LO, BASS_LO + 13);
      } else if (k === nb - 1) {
        const target = nearestOfPc(mod(this.key + nextChord.root, 12), prev, BASS_LO, BASS_LO + 13);
        midi = target + (rng.chance(0.6) ? -1 : 1);
      } else {
        const cands: number[] = [];
        for (let i = 0; i < Math.min(4, chord.iv.length); i++) {
          const c = nearestOfPc(mod(this.key + chord.root + chord.iv[i], 12), prev, BASS_LO, BASS_LO + 14);
          if (c !== prev && Math.abs(c - prev) <= 7) cands.push(c);
        }
        midi = cands.length
          ? rng.weighted(
              cands,
              cands.map((c) => 1 / (1 + Math.abs(c - prev))),
            )
          : prev + rng.pick([-2, -1, 1, 2]);
      }
      prev = midi;
      put(s0, ev(L_BASS, [midi], m.beats[k] * 0.95, k === 0 ? 0.95 : 0.8));
    }
    this.bassPrev = prev;
  }

  /** True when the Harmony layer's current patch (pinned by the user, or chosen automatically) has a slow attack. */
  private harmonyIsPad(s: Settings): boolean {
    const pin = s.layers[L_CHORDS].patch;
    const patch = PATCHES[pin !== 'auto' && PATCHES[pin] ? pin : this.autoPatch[L_CHORDS]];
    return !!patch && patch.env.a >= 0.2;
  }

  private composeChords(sec: Section, e: number, put: Put, base: number, s: Settings) {
    const m = this.meter;
    const steps = m.steps;
    const hr = sec.hr;
    const comp = sec.comp;
    const vel0 = 0.68 + 0.2 * e;
    // A slow-attack pad cannot articulate stabs, off-beats or broken chords: every hit would swell and
    // then ring for seconds, smearing the rhythm and stacking up overlapping voices. Pads always sustain.
    // (Decided here, per bar and without random numbers, so the choice of patch never alters the other layers.)
    const mode = comp.mode !== 'sustain' && this.harmonyIsPad(s) ? 'sustain' : comp.mode;
    if (mode === 'sustain') {
      for (let s = 0; s < steps; s++) {
        if ((base + s) % hr !== 0) continue;
        const idx = this.chordIdx(sec, base + s);
        put(s, ev(L_CHORDS, this.voicing(sec, idx), hr + 1, vel0));
      }
    } else if (mode === 'alberti') {
      for (let s = 0, i = 0; s + 2 <= steps; s += 2, i++) {
        const v = this.voicing(sec, this.chordIdx(sec, base + s));
        const top = v.length - 1;
        const order = [0, top, Math.min(1, top), top];
        put(s, ev(L_CHORDS, [v[order[i % 4]]], 1.9, vel0 * (m.w[s] >= 2 ? 1 : 0.8)));
      }
    } else {
      for (const h of comp.pat) {
        const v = this.voicing(sec, this.chordIdx(sec, base + h.t));
        put(h.t, ev(L_CHORDS, v, h.d, vel0 * h.vel));
      }
    }
  }

  /** Arpeggio pool: exactly `len` (4 or 8) ascending chord tones from the root, so patterns align with the bar. */
  private arpPool(chord: Chord, len: number): number[] {
    const key = this.key * 100 + len;
    if (chord.pool && chord.poolKey === key) return chord.pool;
    const n = Math.min(4, chord.iv.length);
    let m0 = lowestOfPc(mod(this.key + chord.root, 12), 55);
    const top = (k: number) => m0 + chord.iv[k % n] + 12 * Math.floor(k / n);
    while (top(len - 1) > 90) m0 -= 12;
    const pool: number[] = [];
    for (let k = 0; k < len; k++) pool.push(top(k));
    chord.pool = pool;
    chord.poolKey = key;
    return pool;
  }

  private arpIndex(pat: ArpPat, i: number, len: number): number {
    switch (pat) {
      case 'down':
        return len - 1 - (i % len);
      case 'updown': {
        const period = Math.max(1, 2 * len - 2);
        const j = i % period;
        return j < len ? j : period - j;
      }
      case 'converge': {
        const j = i % len;
        return j % 2 === 0 ? j / 2 : len - 1 - (j - 1) / 2;
      }
      case 'thirds':
        return (i * 2 + Math.floor((i * 2) / len)) % len;
      default:
        return i % len;
    }
  }

  private composeArp(sec: Section, e: number, put: Put, base: number) {
    const a = sec.arp;
    const m = this.meter;
    const gate = this.style.arp.gate;
    const len = a.oct === 2 ? 8 : 4;
    for (let s = 0; s < m.steps; s += a.rate) {
      const slot = s / a.rate;
      if (!a.mask[slot]) continue;
      const pool = this.arpPool(this.chordAt(sec, base + s), len);
      if (!pool.length) continue;
      const note = pool[this.arpIndex(a.pat, slot, pool.length)];
      const vel = (m.w[s] >= 2 ? 0.85 : m.w[s] === 1 ? 0.65 : 0.5) * (0.7 + 0.3 * e);
      put(s, ev(L_ARP, [note], a.rate * gate, vel));
    }
  }

  private composeLead(sec: Section, bi: number, e: number, put: Put, base: number, mc: number) {
    const lb = sec.lead[bi];
    if (!lb || !lb.m) return;
    const m = this.meter;
    const steps = m.steps;
    const n = this.scale.steps.length;
    const center = this.style.lead.center;
    const lo = center - 9;
    const hi = center + 14;
    const rng = this.rng;
    const out: { t: number; d: number; midi: number; vel: number }[] = [];
    const cut = lb.cad ? m.starts[Math.max(1, m.beats.length - 2)] : steps;
    let prev = this.leadPrev;
    for (const nt of lb.m.notes) {
      if (nt.t >= cut) break;
      const idx = sec.anchor + lb.shift + nt.i + lb.oct * n;
      let midi = this.midiOfIdx(idx);
      const mask = this.chordAt(sec, base + nt.t).mask;
      if (nt.s === 2 || (nt.s === 1 && rng.chance(0.62 - 0.35 * mc))) {
        const raw = midi;
        midi = this.snap(midi, mask, prev);
        if (midi === prev && raw !== prev) {
          // avoid collapsing the contour into a repeated note: step to the next chord tone in its direction
          const dir = raw > prev ? 1 : -1;
          for (let d = 1; d <= 5; d++) {
            if ((mask >> mod(prev + dir * d - this.key, 12)) & 1) {
              midi = prev + dir * d;
              break;
            }
          }
        }
      } else if (nt.d >= 2 && !((mask >> mod(midi - this.key, 12)) & 1) && (mask >> mod(midi - 1 - this.key, 12)) & 1) midi -= 1;
      while (midi > hi) midi -= 12;
      while (midi < lo) midi += 12;
      out.push({
        t: nt.t,
        d: Math.min(nt.d, cut - nt.t),
        midi,
        vel: clamp(0.5 + 0.11 * m.w[nt.t] + 0.12 * e + (rng.next() - 0.5) * 0.08, 0.25, 1),
      });
      prev = midi;
    }
    if (lb.cad) {
      const chord = this.chordAt(sec, base + cut);
      let mask = chord.mask;
      if (lb.cad === 2) {
        mask = 0;
        for (let i = 0; i < 3; i++) mask |= 1 << mod(chord.root + chord.iv[i], 12);
      }
      let best = prev;
      let bd = 99;
      for (let x = lo; x <= hi; x++) {
        if (!((mask >> mod(x - this.key, 12)) & 1)) continue;
        const d = Math.abs(x - prev) + (x > prev ? 0.3 : 0);
        if (d < bd) {
          bd = d;
          best = x;
        }
      }
      out.push({ t: cut, d: Math.max(2, (steps - cut) * 0.9), midi: best, vel: 0.78 });
      prev = best;
    }
    this.leadPrev = prev;
    const gate = lerp(0.72, 1, this.style.lead.legato);
    for (let k = 0; k < out.length; k++) {
      const o = out[k];
      const nxt = out[k + 1];
      const d = nxt ? Math.min(o.d, nxt.t - o.t) : o.d;
      put(o.t, ev(L_LEAD, [o.midi], Math.max(0.8, d * gate), o.vel));
    }
  }

  private composeTexture(sec: Section, bi: number, e: number, put: Put, base: number) {
    const m = this.meter;
    const rng = this.rng;
    const steps = m.steps;
    const n = this.scale.steps.length;
    let prev = this.texPrev;
    if (sec.texEcho && sec.theme) {
      if (bi % 2 !== 0) return;
      for (const nt of sec.theme.a.notes.slice(0, 4)) {
        const t = nt.t * 2;
        if (t >= steps) break;
        let midi = this.midiOfIdx(sec.anchor + nt.i + n);
        if (nt.s) midi = this.snap(midi, this.chordAt(sec, base + t).mask, prev);
        while (midi > 96) midi -= 12;
        while (midi < 72) midi += 12;
        put(t, ev(L_TEX, [midi], Math.min(nt.d * 2, steps - t), 0.4 + 0.15 * e));
        prev = midi;
      }
      this.texPrev = prev;
      return;
    }
    if (!rng.chance(0.35 + 0.5 * this.style.texture)) return;
    const count = rng.chance(0.35) ? 2 : 1;
    const ws = m.w.map((w) => (w === 0 ? 0 : w === 1 ? 1 : w === 2 ? 0.6 : 0.2));
    for (const s of rng.sample(ws, count)) {
      const chord = this.chordAt(sec, base + s);
      const pool: number[] = [];
      for (let x = 76; x <= 96; x++) {
        if ((chord.mask >> mod(x - this.key, 12)) & 1) pool.push(x);
      }
      if (!pool.length) continue;
      const midi = rng.weighted(
        pool,
        pool.map((x) => 1 / (1 + Math.abs(x - prev))),
      );
      put(s, ev(L_TEX, [midi], 6 + rng.int(6), 0.3 + 0.2 * rng.next() + 0.1 * e));
      prev = midi;
    }
    this.texPrev = prev;
  }

  private composeCounter(sec: Section, bi: number, e: number, put: Put, base: number, mc: number) {
    const m = this.meter;
    const rng = this.rng;
    const steps = m.steps;
    const n = this.scale.steps.length;
    const center = this.style.lead.center - 7;
    const lo = center - 7;
    const hi = center + 8;
    let prev = this.counterPrev;
    const leadBar = sec.lead[bi];
    const leadActive = sec.active[L_LEAD] && leadBar?.m;

    // Derive sparse, lyrical inner voice steps: answer where the lead holds or rests, or weave contrary motion
    const motif = sec.active[L_LEAD] ? this.themes[2].a : this.themes[1].b;
    const rawSteps: { t: number; d: number; idx: number }[] = [];
    if (leadActive && leadBar.m) {
      const lNotes = leadBar.m.notes;
      for (let k = 0; k < lNotes.length; k++) {
        const cur = lNotes[k];
        const nxt = lNotes[k + 1];
        const gap = nxt ? nxt.t - cur.t : steps - cur.t;
        if (k % 2 === 1 || gap >= 4) {
          const t = cur.t + (gap >= 4 && cur.t + 2 < steps ? 2 : 0);
          if (t < steps) {
            const d = Math.max(2, Math.min(gap >= 4 ? gap - 1 : gap, steps - t));
            // contrary motion relative to the lead contour
            rawSteps.push({ t, d, idx: sec.anchor - n + Math.round(-cur.i * (0.6 + 0.4 * mc)) });
          }
        }
      }
    }
    if (!rawSteps.length) {
      for (let k = 0; k < motif.notes.length; k += 2) {
        const nt = motif.notes[k];
        const nxt = motif.notes[k + 2];
        const d = nxt ? Math.min(6, nxt.t - nt.t) : Math.max(2, steps - nt.t);
        rawSteps.push({ t: nt.t, d, idx: sec.anchor - n + nt.i });
      }
    }

    for (let k = 0; k < rawSteps.length; k++) {
      const r = rawSteps[k];
      const nxt = rawSteps[k + 1];
      const chord = this.chordAt(sec, base + r.t);
      let midi = this.midiOfIdx(r.idx);
      // Prefer 3rd, 7th, 9th or 5th chord tones for rich inner counter-harmony
      if (m.w[r.t] >= 2 || rng.chance(0.75)) {
        midi = this.snap(midi, chord.mask, prev);
      }
      while (midi > hi) midi -= 12;
      while (midi < lo) midi += 12;
      const d = nxt ? Math.min(r.d, nxt.t - r.t) : r.d;
      put(r.t, ev(L_COUNTER, [midi], Math.max(1.4, d * 0.92), clamp(0.45 + 0.1 * m.w[r.t] + 0.15 * e, 0.25, 0.88)));
      prev = midi;
    }
    this.counterPrev = prev;
  }

  private composeDrone(sec: Section, e: number, put: Put, base: number) {
    const m = this.meter;
    const steps = m.steps;
    const span = Math.min(sec.hr, steps);
    for (let s = 0; s < steps; s++) {
      if ((base + s) % span !== 0) continue;
      const chord = this.chordAt(sec, base + s);
      // Pedal on tonic during intro/breakdown, otherwise follow root or fifth in warm low-mid register
      const pc = sec.type === 'intro' || sec.type === 'breakdown' ? this.key : mod(this.key + chord.root, 12);
      const rootMidi = lowestOfPc(pc, 38);
      const notes = e > 0.45 && chord.iv[2] === 7 ? [rootMidi, rootMidi + 7] : [rootMidi];
      put(s, ev(L_DRONE, notes, Math.min(span, steps - s) * 0.99, clamp(0.32 + 0.22 * e, 0.2, 0.65)));
    }
  }

  private composeMallet(sec: Section, bi: number, e: number, put: Put, base: number) {
    const ml = sec.mallet;
    const m = this.meter;
    const rng = this.rng;
    let prev = this.malletPrev;
    let stepIdx = bi * ml.mask.length;
    for (let s = 0; s < m.steps; s += ml.rate) {
      const slot = Math.floor(s / ml.rate);
      if (!ml.mask[slot % ml.mask.length]) continue;
      const chord = this.chordAt(sec, base + s);
      // Build color-tone pool (3rd, 5th, 7th, 9th, root) in C4..C6
      const colorIndices = [1, 2, 3, 4, 0].filter((idx) => chord.iv[idx] !== undefined);
      const pickIdx = colorIndices[(stepIdx * (ml.dir > 0 ? 1 : 3)) % colorIndices.length];
      const pc = mod(this.key + chord.root + chord.iv[pickIdx], 12);
      let midi = nearestOfPc(pc, prev + ml.dir * 2, 60, 84);
      if (m.w[s] >= 3 && rng.chance(0.25)) midi = clamp(midi + 12, 60, 88);
      const vel = clamp((0.42 + 0.1 * m.w[s] + 0.18 * e) * (0.88 + 0.24 * rng.next()), 0.22, 0.92);
      put(s, ev(L_MALLET, [midi], Math.max(1.2, ml.rate * 1.15), vel));
      prev = midi;
      stepIdx++;
    }
    this.malletPrev = prev;
  }
}
