// Fixed-size ring buffers feeding the visualiser. Zero allocation at runtime.
export const ROLL_N = 768;
export const MARK_N = 96;

export class Roll {
  t = new Float64Array(ROLL_N); // start time (audio clock)
  d = new Float32Array(ROLL_N); // duration (s)
  m = new Int16Array(ROLL_N); // midi note, or -1 - drumId for drums
  l = new Uint8Array(ROLL_N); // layer
  v = new Float32Array(ROLL_N); // velocity
  head = 0;

  mt = new Float64Array(MARK_N); // marker time
  mk = new Uint8Array(MARK_N); // 1 beat, 2 bar, 3 section
  mhead = 0;

  push(t: number, d: number, m: number, l: number, v: number) {
    const i = this.head;
    this.t[i] = t;
    this.d[i] = d;
    this.m[i] = m;
    this.l[i] = l;
    this.v[i] = v;
    this.head = (i + 1) % ROLL_N;
  }

  mark(t: number, kind: number) {
    const i = this.mhead;
    this.mt[i] = t;
    this.mk[i] = kind;
    this.mhead = (i + 1) % MARK_N;
  }

  clear() {
    this.t.fill(-1e9);
    this.mt.fill(-1e9);
    this.mk.fill(0);
    this.head = 0;
    this.mhead = 0;
  }
}
