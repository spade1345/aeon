// Transport + audio-context lifecycle + bridge from the audio clock to UI state.
import { Composer, type Bar, type SectionType } from './composer';
import { Roll } from './roll';
import { Sequencer } from './sequencer';
import type { Settings } from './settings';
import { Synth } from './synth';
import { TickTimer } from './timer';
import { randomSeed } from './rng';
import type { ScaleId } from './theory';

export type Status = 'stopped' | 'playing' | 'paused' | 'blocked' | 'error';

export interface PlayerState {
  status: Status;
  message: string;
  type: SectionType | null;
  secIndex: number;
  bar: number;
  bars: number;
  chords: string[];
  chordIdx: number;
  key: number;
  scale: ScaleId | null;
  styleId: string;
  bpm: number;
  energy: number;
  patches: string[];
  active: boolean[];
  movement: number;
  seed: number;
  history: { type: SectionType; bars: number; idx: number }[];
  autoEco: boolean;
}

const initial = (seed: number): PlayerState => ({
  status: 'stopped',
  message: '',
  type: null,
  secIndex: -1,
  bar: 0,
  bars: 0,
  chords: [],
  chordIdx: 0,
  key: 0,
  scale: null,
  styleId: '',
  bpm: 0,
  energy: 0,
  patches: ['', '', '', '', '', '', '', '', ''],
  active: [false, false, false, false, false, false, false, false, false],
  movement: 0,
  seed,
  history: [],
  autoEco: false,
});

const TICK_MS = 40;

export class Player {
  readonly roll = new Roll();
  private composer = new Composer();
  private ctx: AudioContext | null = null;
  private synth: Synth | null = null;
  private seq: Sequencer | null = null;
  private timer = new TickTimer(() => this.tick(), TICK_MS);
  private settings: Settings;
  private uiQ: { t: number; p: Partial<PlayerState> }[] = [];
  private state: PlayerState;
  private listeners = new Set<() => void>();
  private token = 0;
  private late = 0;
  private lastTick = 0;
  private lateDecay = 0;
  private capScale = 1;
  private planAt = 0;
  private planDirty = false;
  private planThemes = false;

  constructor(settings: Settings) {
    this.settings = settings;
    this.roll.clear();
    this.state = initial(this.composer.seed);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVis);
  }

  // ---- external store ---------------------------------------------------------------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.state;

  private update(p: Partial<PlayerState>) {
    const prev = this.state;
    const next: PlayerState = { ...prev, ...p };
    // a new section begins (only bar patches carry `bars`)
    if (p.bars !== undefined && p.type && p.secIndex !== undefined && p.secIndex >= 0 && p.secIndex !== prev.secIndex) {
      next.history = [...prev.history, { type: p.type, bars: p.bars, idx: p.secIndex }].slice(-12);
    }
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  // ---- clocks ---------------------------------------------------------------------------
  private latency(): number {
    const c = this.ctx;
    if (!c) return 0;
    return Math.min(0.3, c.outputLatency || c.baseLatency || 0);
  }
  /** Audio-clock time of the sound currently leaving the speakers. */
  heardTime(): number {
    return this.ctx ? this.ctx.currentTime - this.latency() : 0;
  }
  getLevel(): number {
    return this.synth && this.state.status === 'playing' ? this.synth.getLevel() : 0;
  }

  // ---- settings -------------------------------------------------------------------------
  setSettings(s: Settings) {
    const p = this.settings;
    this.settings = s;
    if (
      p.melodic !== s.melodic ||
      p.harmonic !== s.harmonic ||
      p.rhythmic !== s.rhythmic ||
      p.randomness !== s.randomness ||
      p.energy !== s.energy
    ) {
      // Re-planning only makes sense while a piece is in progress. When stopped, the composer starts
      // from bar one with the new settings anyway, and a pending re-plan would cut the intro short.
      if (this.state.status !== 'stopped') {
        this.planDirty = true;
        this.planAt = performance.now();
        if (p.melodic !== s.melodic || p.rhythmic !== s.rhythmic) this.planThemes = true;
      }
    }
    this.seq?.applySettings(s);
  }

  // ---- transport ---------------------------------------------------------------------------
  private build() {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = w.AudioContext ?? w.webkitAudioContext;
    if (!AC) throw new Error('Web Audio is not supported in this browser.');
    const ctx = new AC({ latencyHint: 'playback' });
    const synth = new Synth(ctx, this.settings.perf);
    const seq = new Sequencer(synth, this.composer, this.roll, this.settings);
    seq.setCapScale(this.capScale);
    seq.onBar = (bar, t) => this.onBar(bar, t);
    seq.onChord = (_bar, idx, t) => this.uiQ.push({ t, p: { chordIdx: idx } });
    ctx.onstatechange = () => this.onCtxState(ctx);
    this.ctx = ctx;
    this.synth = synth;
    this.seq = seq;
    this.roll.clear();
    this.uiQ.length = 0;
  }

  private onBar(bar: Bar, t: number) {
    const m = bar.meta;
    this.uiQ.push({
      t,
      p: {
        type: m.type,
        secIndex: m.secIndex,
        bar: m.bar,
        bars: m.bars,
        chords: m.chords,
        chordIdx: m.chordIdx,
        key: m.key,
        scale: m.scale,
        styleId: m.styleId,
        bpm: this.settings.bpm * m.tempoScale,
        energy: m.energy,
        patches: m.patches.slice(),
        active: m.active.slice(),
        movement: m.movement,
        seed: m.seed,
      },
    });
  }

  private onCtxState(ctx: AudioContext) {
    if (ctx !== this.ctx) return;
    const st = this.state.status;
    if ((ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') && st === 'playing') {
      this.timer.stop();
      this.update({ status: 'blocked', message: 'Audio was suspended by the browser. Press play to resume.' });
    } else if (ctx.state === 'running' && st === 'blocked') {
      this.begin();
    }
  }

  private onVis = () => {
    this.lastTick = performance.now();
    const c = this.ctx;
    if (!document.hidden && c && this.state.status === 'playing' && c.state !== 'running') void c.resume().catch(() => undefined);
  };

  private begin() {
    const ctx = this.ctx!;
    const seq = this.seq!;
    seq.nextTime = Math.max(seq.nextTime, ctx.currentTime + 0.08);
    this.synth!.fadeIn(0.12);
    this.lastTick = performance.now();
    this.update({ status: 'playing', message: '' });
    this.timer.start();
    this.tick();
  }

  async play() {
    if (this.state.status === 'playing') return;
    const token = ++this.token;
    try {
      if (!this.ctx) this.build();
      const ctx = this.ctx!;
      if (ctx.state !== 'running') {
        await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 1500))]);
      }
      if (token !== this.token) return;
      if (ctx.state !== 'running') {
        this.update({ status: 'blocked', message: 'The browser blocked audio. Click play again to start.' });
        return;
      }
      this.begin();
    } catch (e) {
      console.error(e);
      this.update({ status: 'error', message: e instanceof Error ? e.message : 'Could not start audio.' });
    }
  }

  pause() {
    if (this.state.status !== 'playing') return;
    const token = ++this.token;
    this.timer.stop();
    this.synth?.fadeOut(0.08);
    this.update({ status: 'paused', message: '' });
    const ctx = this.ctx;
    setTimeout(() => {
      if (token === this.token && ctx && ctx === this.ctx) void ctx.suspend().catch(() => undefined);
    }, 140);
  }

  stop() {
    ++this.token;
    this.timer.stop();
    const ctx = this.ctx;
    const synth = this.synth;
    synth?.fadeOut(0.08);
    this.ctx = null;
    this.synth = null;
    this.seq = null;
    if (ctx) {
      setTimeout(() => {
        void ctx.close().catch(() => undefined);
      }, 160);
    }
    this.uiQ.length = 0;
    this.planDirty = this.planThemes = false; // a pending re-plan belongs to the piece that just ended
    this.composer.reseed(this.composer.seed); // rewind: the same seed replays the same piece
    this.roll.clear();
    this.update({ ...initial(this.composer.seed), autoEco: this.state.autoEco });
  }

  // ---- compositional controls ----------------------------------------------------------
  setSeed(seed: number) {
    this.composer.reseed(seed >>> 0);
    this.uiQ.length = 0;
    this.planDirty = this.planThemes = false; // the new piece starts with the current settings anyway
    this.update({ seed: this.composer.seed, history: [], secIndex: -1 });
  }
  regenerate() {
    this.setSeed(randomSeed());
  }
  changeDirection() {
    this.composer.requestRedirect();
  }
  nextSection() {
    this.composer.requestSkip();
  }
  get seed() {
    return this.composer.seed;
  }

  // ---- scheduler tick ---------------------------------------------------------------------
  private tick = () => {
    const seq = this.seq;
    const ctx = this.ctx;
    if (!seq || !ctx || this.state.status !== 'playing') return;
    try {
      const nowMs = performance.now();
      const gap = nowMs - this.lastTick;
      this.lastTick = nowMs;
      if (!document.hidden) {
        if (gap > 200) this.late++;
        if (nowMs - this.lateDecay > 6000) {
          this.lateDecay = nowMs;
          if (this.late > 0) this.late--;
        }
        if (this.late >= 4) this.degrade(seq);
      }
      const now = ctx.currentTime;
      if (seq.nextTime < now - 0.05) seq.nextTime = now + 0.03; // recover after a stall: resync, don't burst
      seq.run(now + (document.hidden ? 0.5 : 0.2));
      this.drain(now);
      if (this.planDirty && nowMs - this.planAt > 700) {
        this.planDirty = false;
        this.composer.requestReplan(this.planThemes);
        this.planThemes = false;
      }
    } catch (e) {
      console.error(e);
      this.timer.stop();
      this.update({ status: 'error', message: 'The engine hit an error. Press "New piece", then play.' });
    }
  };

  /** Repeated scheduling stalls: shed polyphony so playback stays glitch-free. */
  private degrade(seq: Sequencer) {
    this.late = 0;
    if (this.capScale > 0.45) {
      this.capScale *= 0.75;
      seq.setCapScale(this.capScale);
      this.update({ autoEco: true });
    }
  }

  private drain(now: number) {
    const q = this.uiQ;
    if (!q.length) return;
    const heard = now - this.latency();
    let patch: Partial<PlayerState> | null = null;
    let n = 0;
    while (n < q.length && q[n].t <= heard) {
      patch = Object.assign(patch ?? {}, q[n].p);
      n++;
    }
    if (n) {
      q.splice(0, n);
      if (patch) this.update(patch);
    }
  }
}
