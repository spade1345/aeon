// Chord-progression generation: functional-harmony Markov chains + idiomatic templates + cadences.
import { Rng } from './rng';
import type { Family } from './theory';

// Transition weights between scale degrees (rows: from, columns: to) for major-like / minor-like modes.
const MARKOV_MAJOR: number[][] = [
  /* I   */ [0.03, 0.15, 0.08, 0.27, 0.22, 0.23, 0.02],
  /* ii  */ [0.05, 0.0, 0.05, 0.12, 0.6, 0.12, 0.06],
  /* iii */ [0.05, 0.12, 0.0, 0.3, 0.08, 0.4, 0.05],
  /* IV  */ [0.22, 0.15, 0.03, 0.0, 0.42, 0.12, 0.06],
  /* V   */ [0.55, 0.04, 0.05, 0.1, 0.0, 0.24, 0.02],
  /* vi  */ [0.05, 0.25, 0.1, 0.35, 0.2, 0.0, 0.05],
  /* vii */ [0.6, 0.0, 0.2, 0.0, 0.0, 0.2, 0.0],
];
const MARKOV_MINOR: number[][] = [
  /* i   */ [0.03, 0.02, 0.15, 0.2, 0.1, 0.3, 0.2],
  /* ii  */ [0.1, 0.0, 0.05, 0.2, 0.65, 0.0, 0.0],
  /* III */ [0.1, 0.02, 0.0, 0.2, 0.1, 0.3, 0.28],
  /* iv  */ [0.25, 0.08, 0.04, 0.0, 0.25, 0.1, 0.28],
  /* v   */ [0.62, 0.0, 0.03, 0.1, 0.0, 0.25, 0.0],
  /* VI  */ [0.1, 0.05, 0.12, 0.23, 0.15, 0.0, 0.35],
  /* VII */ [0.35, 0.0, 0.3, 0.12, 0.05, 0.18, 0.0],
];

const TEMPLATES: Record<Family, number[][]> = {
  major: [
    [0, 4, 5, 3],
    [0, 5, 3, 4],
    [0, 3, 4, 3],
    [0, 5, 1, 4],
    [0, 2, 3, 4],
    [5, 3, 0, 4],
    [0, 2, 5, 3],
    [0, 3, 5, 4],
  ],
  minor: [
    [0, 5, 2, 6],
    [0, 6, 5, 4],
    [0, 3, 6, 2],
    [0, 3, 4, 0],
    [0, 5, 3, 4],
    [0, 2, 6, 3],
    [0, 6, 3, 6],
    [5, 6, 0, 0],
  ],
  dorian: [
    [0, 3, 0, 3],
    [0, 6, 3, 0],
    [0, 3, 6, 0],
    [0, 1, 3, 0],
    [0, 2, 6, 3],
    [0, 4, 3, 6],
  ],
  mixolydian: [
    [0, 6, 3, 0],
    [0, 3, 6, 3],
    [0, 1, 6, 3],
    [0, 5, 6, 0],
    [0, 4, 6, 3],
  ],
  lydian: [
    [0, 1, 0, 1],
    [0, 1, 4, 0],
    [0, 4, 1, 0],
    [0, 5, 1, 4],
    [0, 2, 1, 0],
  ],
  phrygian: [
    [0, 1, 0, 1],
    [0, 1, 2, 0],
    [0, 5, 1, 0],
    [0, 3, 1, 0],
    [0, 6, 5, 1],
  ],
  harmonic: [
    [0, 5, 3, 4],
    [0, 3, 4, 0],
    [0, 5, 1, 4],
    [0, 3, 4, 5],
    [0, 2, 5, 4],
  ],
};

const JAZZ: Record<Family, number[][]> = {
  major: [
    [1, 4, 0, 5],
    [0, 5, 1, 4],
    [2, 5, 1, 4],
    [0, 2, 1, 4],
    [0, 1, 4, 0],
  ],
  minor: [
    [1, 4, 0, 3],
    [0, 3, 6, 2],
    [0, 5, 1, 4],
    [0, 3, 1, 4],
  ],
  dorian: [
    [0, 3, 1, 4],
    [0, 6, 3, 0],
    [1, 4, 0, 3],
  ],
  mixolydian: [
    [0, 3, 1, 4],
    [0, 5, 1, 4],
    [0, 6, 3, 0],
  ],
  lydian: [
    [0, 1, 5, 1],
    [0, 4, 1, 0],
  ],
  phrygian: [
    [0, 1, 5, 1],
    [0, 3, 1, 0],
  ],
  harmonic: [
    [1, 4, 0, 3],
    [0, 3, 1, 4],
  ],
};

const FAM_BASE: Record<Family, 'major' | 'minor'> = {
  major: 'major',
  lydian: 'major',
  mixolydian: 'major',
  minor: 'minor',
  dorian: 'minor',
  phrygian: 'minor',
  harmonic: 'minor',
};

// [penultimate, final] pairs for full cadences, and targets for half cadences.
const CADENCES: Record<Family, { full: [number, number][]; half: number[] }> = {
  major: { full: [[4, 0], [4, 0], [3, 0]], half: [4, 4, 3] },
  minor: { full: [[4, 0], [6, 0], [3, 0], [6, 0]], half: [4, 4, 6] },
  dorian: { full: [[6, 0], [3, 0], [4, 0]], half: [4, 6, 3] },
  mixolydian: { full: [[6, 0], [3, 0], [4, 0]], half: [3, 6, 4] },
  lydian: { full: [[1, 0], [4, 0], [1, 0]], half: [1, 4] },
  phrygian: { full: [[1, 0], [6, 0]], half: [1, 6] },
  harmonic: { full: [[4, 0], [4, 0], [3, 0]], half: [4, 4] },
};

export const DOMINANT: Record<Family, number> = {
  major: 4,
  minor: 4,
  dorian: 4,
  mixolydian: 4,
  lydian: 4,
  phrygian: 4,
  harmonic: 4,
};

/** Generate a 4-chord degree sequence (one chord per bar) for a mode family. */
export function genDegrees(rng: Rng, fam: Family, jazzy: boolean): number[] {
  if (jazzy && rng.chance(0.55)) return rng.pick(JAZZ[fam]).slice();
  if (rng.chance(0.55)) return rng.pick(TEMPLATES[fam]).slice();
  const table = FAM_BASE[fam] === 'major' ? MARKOV_MAJOR : MARKOV_MINOR;
  const all = [0, 1, 2, 3, 4, 5, 6];
  const out: number[] = [rng.chance(0.85) ? 0 : rng.pick([5, 3])];
  for (let i = 1; i < 4; i++) {
    let next = rng.weighted(all, table[out[i - 1]]);
    if (next === out[i - 1]) next = rng.weighted(all, table[out[i - 1]]);
    out.push(next);
  }
  return out;
}

/** Apply a cadence to the end of a chord-slot sequence (degrees). */
export function applyCadence(slots: number[], kind: 'half' | 'full', fam: Family, rng: Rng): void {
  const n = slots.length;
  const c = CADENCES[fam];
  if (kind === 'half') {
    slots[n - 1] = rng.pick(c.half);
    return;
  }
  const [pen, fin] = rng.pick(c.full);
  slots[n - 1] = fin;
  if (n >= 2) slots[n - 2] = pen;
}

/** Choose a related "passing" chord degree to colour a repeated harmony (used for fast harmonic rhythm). */
export function passingDegree(rng: Rng, cur: number, next: number, fam: Family): number {
  const table = FAM_BASE[fam] === 'major' ? MARKOV_MAJOR : MARKOV_MINOR;
  const all = [0, 1, 2, 3, 4, 5, 6];
  const w = all.map((d) => table[cur][d] * (table[d][next] + 0.05));
  const d = rng.weighted(all, w);
  return d;
}
