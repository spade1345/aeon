// Motif generation and development. Motifs live in *scale-index space* so the same
// melodic idea can be re-harmonised, transposed, inverted and re-pitched into any key/scale.
import { Rng } from './rng';
import { clamp, type Meter } from './theory';

export interface Cell {
  kind: 'on' | 'hold' | 'rest';
  on: [number, number][]; // [offset, duration] in 16th steps
  c: number; // rhythmic complexity 0..1
  fine: boolean; // uses 16th-note resolution
}
export interface MNote {
  t: number; // start step in bar
  d: number; // duration in steps
  i: number; // scale-index offset from the anchor
  s: number; // 1 = structural (snaps to chord tones), 0 = passing
}
export interface Motif {
  notes: MNote[];
  cells: Cell[];
  len: number;
}
export interface Theme {
  a: Motif;
  b: Motif;
}
export type Op = 'inv' | 'ret' | 'thin' | 'orn' | 'syn' | 'frag' | 'aug';

const on = (c: number, fine: boolean, ...p: [number, number][]): Cell => ({ kind: 'on', on: p, c, fine });
const HOLD: Cell = { kind: 'hold', on: [], c: 0.15, fine: false };
const REST: Cell = { kind: 'rest', on: [], c: 0.25, fine: false };

const CELLS4: Cell[] = [
  on(0, false, [0, 4]),
  on(0.1, false, [0, 2], [2, 2]),
  on(0.3, true, [0, 3], [3, 1]),
  on(0.4, true, [0, 2], [2, 1], [3, 1]),
  on(0.4, true, [0, 1], [1, 1], [2, 2]),
  on(0.55, true, [0, 1], [1, 1], [2, 1], [3, 1]),
  on(0.7, true, [0, 1], [1, 2], [3, 1]),
  on(0.5, false, [2, 2]),
  on(0.8, true, [1, 3]),
  on(0.6, true, [0, 2], [3, 1]),
  HOLD,
  REST,
];
const CELLS6: Cell[] = [
  on(0, false, [0, 6]),
  on(0.1, false, [0, 2], [2, 2], [4, 2]),
  on(0.15, false, [0, 4], [4, 2]),
  on(0.2, false, [0, 2], [2, 4]),
  on(0.3, true, [0, 3], [3, 3]),
  on(0.5, true, [0, 2], [2, 2], [4, 1], [5, 1]),
  on(0.45, true, [0, 4], [4, 1], [5, 1]),
  on(0.6, true, [0, 2], [2, 1], [3, 3]),
  on(0.5, false, [2, 4]),
  HOLD,
  REST,
];

export interface MotifParams {
  mc: number; // melodic complexity 0..1
  rc: number; // rhythmic complexity 0..1
  dens: number; // note density 0..1
  grid: 1 | 2; // 2 => no 16th-note cells
}

function pickCell(rng: Rng, L: number, first: boolean, last: boolean, p: MotifParams): Cell {
  const lib = L === 6 ? CELLS6 : CELLS4;
  const tgt = 0.08 + p.rc * 0.72;
  const nT = (L === 6 ? 0.8 : 0.6) + p.dens * 2.5;
  const ws = lib.map((c) => {
    if (p.grid === 2 && c.fine) return 0;
    if (first && (c.kind !== 'on' || c.on[0][0] > 0)) return 0;
    let w = Math.exp(-((c.c - tgt) * (c.c - tgt)) / 0.08);
    if (c.kind === 'on') {
      w *= Math.exp(-0.28 * (c.on.length - nT) * (c.on.length - nT));
      if (last && c.on.length <= 2) w *= 1.45;
    } else if (c.kind === 'hold') {
      w *= (1.25 - p.dens) * (last ? 1.5 : 0.8);
    } else {
      w *= (1.05 - p.dens) * (last ? 1.15 : 0.45);
    }
    return w;
  });
  return rng.weighted(lib, ws);
}

function makeCells(rng: Rng, meter: Meter, p: MotifParams, base?: Cell[]): Cell[] {
  const cells: Cell[] = [];
  const nb = meter.beats.length;
  // When deriving consequent B from call motif A, keep the opening beat(s) intact for an unmistakable hook
  let mutateAt = -1;
  let mutateAt2 = -1;
  if (base) {
    mutateAt = nb - 1;
    if (nb >= 3 && rng.chance(0.45)) mutateAt2 = nb - 2;
  }
  for (let b = 0; b < nb; b++) {
    if (base && b !== mutateAt && b !== mutateAt2) cells.push(base[b]);
    else cells.push(pickCell(rng, meter.beats[b], b === 0, b === nb - 1, p));
  }
  return cells;
}

function cellsToNotes(cells: Cell[], meter: Meter): { t: number; d: number }[] {
  const out: { t: number; d: number }[] = [];
  cells.forEach((c, b) => {
    const s0 = meter.starts[b];
    if (c.kind === 'on') {
      for (const [o, d] of c.on) out.push({ t: s0 + o, d });
    } else if (c.kind === 'hold' && out.length) {
      const prev = out[out.length - 1];
      prev.d = s0 + meter.beats[b] - prev.t;
    }
  });
  return out;
}

type Shape = 'arch' | 'dip' | 'up' | 'down' | 'wave' | 'flat';
const SHAPES: Shape[] = ['arch', 'arch', 'wave', 'wave', 'dip', 'up', 'down'];

/** Pitch contour in scale steps: hook-friendly repeated tones, stepwise flow, leaps resolved by step. */
function genContour(rng: Rng, n: number, mc: number, baseContour?: number[]): number[] {
  if (baseContour && baseContour.length > 0 && n > 2) {
    const headCount = Math.min(n - 1, Math.max(2, Math.floor(n * 0.55)), baseContour.length);
    const out = baseContour.slice(0, headCount);
    let cur = out[out.length - 1];
    let lastDir = headCount >= 2 ? Math.sign(cur - out[headCount - 2]) : 0;
    for (let k = headCount; k < n; k++) {
      const remaining = n - 1 - k;
      // Steer the answer tail smoothly back toward a stable closing target (0 or +/-1)
      const target = remaining === 0 ? rng.pick([0, -1, 0, 1]) : 0;
      const toTarget = target - cur;
      let step: number;
      if (Math.abs(toTarget) >= remaining * 2) {
        step = Math.sign(toTarget) * (Math.abs(toTarget) > 2 ? 2 : 1);
      } else if (rng.chance(0.22)) {
        step = 0;
      } else {
        const dir = toTarget !== 0 && rng.chance(0.7) ? Math.sign(toTarget) : lastDir !== 0 && rng.chance(0.65) ? -lastDir : rng.chance(0.5) ? 1 : -1;
        step = dir * (rng.chance(0.82) ? 1 : 2);
      }
      cur = clamp(cur + step, -3, 5);
      lastDir = Math.sign(step);
      out.push(cur);
    }
    return out;
  }

  const out = [0];
  let cur = 0;
  let lastLeap = 0;
  const shape = rng.pick(SHAPES);
  for (let k = 1; k < n; k++) {
    const prog = n > 1 ? k / (n - 1) : 0;
    let pUp: number;
    switch (shape) {
      case 'arch':
        pUp = prog < 0.55 ? 0.76 : 0.22;
        break;
      case 'dip':
        pUp = prog < 0.5 ? 0.28 : 0.78;
        break;
      case 'up':
        pUp = 0.72;
        break;
      case 'down':
        pUp = 0.28;
        break;
      case 'wave':
        pUp = 0.5 + 0.36 * Math.sin(prog * Math.PI * 2);
        break;
      default:
        pUp = 0.5;
    }
    let mag: number;
    let sign: number;
    if (lastLeap !== 0) {
      // Always resolve melodic leaps by an opposite step for singable balance
      sign = -Math.sign(lastLeap);
      mag = rng.chance(0.85) ? 1 : 2;
      lastLeap = 0;
    } else {
      const r = rng.next();
      const leapP = 0.04 + mc * 0.16;
      const repP = 0.15 * (1 - mc * 0.45) + 0.06;
      sign = rng.chance(pUp) ? 1 : -1;
      if (r < repP) {
        mag = 0;
        lastLeap = 0;
      } else if (r < repP + leapP) {
        mag = rng.pick([3, 3, 4]);
        lastLeap = sign * mag;
      } else {
        mag = rng.chance(0.8) ? 1 : 2;
        lastLeap = 0;
      }
    }
    let nxt = cur + sign * mag;
    if (nxt > 5 || nxt < -3) nxt = cur - sign * mag;
    cur = clamp(nxt, -3, 5);
    out.push(cur);
  }
  return out;
}

function buildMotif(cells: Cell[], contour: number[], meter: Meter): Motif {
  const rn = cellsToNotes(cells, meter);
  const notes: MNote[] = rn.map((r, k) => ({
    t: r.t,
    d: r.d,
    i: contour[k] ?? 0,
    // 2 = must anchor on chord triad core (downbeats, long holds), 1 = prefer chord tone, 0 = passing/neighbor
    s: meter.w[r.t] >= 3 || r.d >= 3 ? 2 : meter.w[r.t] >= 2 ? 1 : 0,
  }));
  return { notes, cells, len: meter.steps };
}

export function makeMotif(rng: Rng, meter: Meter, p: MotifParams, base?: Motif): Motif {
  const cells = makeCells(rng, meter, p, base?.cells);
  const n = cells.reduce((a, c) => a + (c.kind === 'on' ? c.on.length : 0), 0);
  const baseContour = base ? base.notes.map((x) => x.i) : undefined;
  const contour = genContour(rng, Math.max(1, n), p.mc, baseContour);
  return buildMotif(cells, contour, meter);
}

export function makeTheme(rng: Rng, meter: Meter, p: MotifParams): Theme {
  const a = makeMotif(rng, meter, p);
  const b = makeMotif(rng, meter, p, a);
  return { a, b };
}

/** Contrasting theme sharing the rhythmic DNA of another: gentle diatonic inversion keeping anchor intact. */
export function invertTheme(t: Theme, meter: Meter, rng: Rng): Theme {
  return {
    a: transform(rng, t.a, 'inv', meter),
    b: transform(rng, t.b, 'inv', meter),
  };
}

export function transform(rng: Rng, m: Motif, op: Op, meter: Meter): Motif {
  let notes = m.notes.map((x) => ({ ...x }));
  switch (op) {
    case 'inv':
      for (const x of notes) x.i = -x.i;
      break;
    case 'ret': {
      const is = notes.map((x) => x.i).reverse();
      notes.forEach((x, k) => (x.i = is[k]));
      break;
    }
    case 'thin': {
      const kept: MNote[] = [];
      notes.forEach((x, k) => {
        if (k > 0 && x.s === 0 && rng.chance(0.55)) return;
        kept.push(x);
      });
      notes = kept;
      break;
    }
    case 'orn': {
      const out: MNote[] = [];
      for (let k = 0; k < notes.length; k++) {
        const cur = notes[k];
        const nxt = notes[k + 1];
        if (nxt && cur.d >= 2 && cur.t + cur.d === nxt.t && rng.chance(0.6)) {
          const diff = nxt.i - cur.i;
          const passing = Math.abs(diff) >= 2 ? cur.i + Math.sign(diff) : nxt.i + (rng.chance(0.5) ? 1 : -1);
          out.push({ ...cur, d: cur.d - 1 });
          out.push({ t: cur.t + cur.d - 1, d: 1, i: passing, s: 0 });
        } else out.push(cur);
      }
      notes = out;
      break;
    }
    case 'syn': {
      for (let k = 1; k < notes.length; k++) {
        const cur = notes[k];
        const prev = notes[k - 1];
        if (meter.w[cur.t] >= 2 && prev.t + prev.d === cur.t && prev.d > 1 && rng.chance(0.6)) {
          cur.t -= 1;
          cur.d += 1;
          prev.d -= 1;
          cur.s = 1;
          break;
        }
      }
      break;
    }
    case 'frag': {
      const half = meter.starts[Math.floor(meter.beats.length / 2)];
      const first = notes.filter((x) => x.t < half).map((x) => ({ ...x, d: Math.min(x.d, half - x.t) }));
      const shiftI = rng.pick([-1, 1, 2]);
      const echo = first
        .map((x) => ({ ...x, t: x.t + half, i: x.i + shiftI }))
        .filter((x) => x.t < meter.steps)
        .map((x) => ({ ...x, d: Math.min(x.d, meter.steps - x.t) }));
      notes = [...first, ...echo];
      break;
    }
    case 'aug': {
      notes = notes
        .map((x) => ({ ...x, t: x.t * 2, d: x.d * 2 }))
        .filter((x) => x.t < meter.steps)
        .map((x) => ({ ...x, d: Math.min(x.d, meter.steps - x.t) }));
      break;
    }
  }
  if (notes.length === 0) notes = [{ ...m.notes[0] }];
  notes.sort((a, b) => a.t - b.t);
  return { notes, cells: m.cells, len: m.len };
}
