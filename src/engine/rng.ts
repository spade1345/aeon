/** Small, fast, seedable PRNG (mulberry32). Deterministic: same seed => same music. */
export class Rng {
  private a: number;
  constructor(seed: number) {
    this.a = seed >>> 0;
  }
  next(): number {
    this.a = (this.a + 0x6d2b79f5) | 0;
    let t = Math.imul(this.a ^ (this.a >>> 15), 1 | this.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    let sum = 0;
    for (let i = 0; i < items.length; i++) sum += weights[i];
    if (sum <= 0) return items[this.int(items.length)];
    let r = this.next() * sum;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }
  /** Pick k distinct indices with probability proportional to weights. */
  sample(weights: readonly number[], k: number): number[] {
    const w = weights.slice();
    const out: number[] = [];
    for (let j = 0; j < k; j++) {
      let sum = 0;
      for (let i = 0; i < w.length; i++) sum += w[i];
      if (sum <= 0) break;
      let r = this.next() * sum;
      let chosen = w.length - 1;
      for (let i = 0; i < w.length; i++) {
        r -= w[i];
        if (r < 0) {
          chosen = i;
          break;
        }
      }
      out.push(chosen);
      w[chosen] = 0;
    }
    return out;
  }
}

export const randomSeed = (): number => (Math.random() * 0xffffffff) >>> 0;
