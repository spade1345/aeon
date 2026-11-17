// Look-ahead step sequencer: turns composed bars into precisely timed Web Audio events.
// Independent of timers/DOM so it can also be driven offline.
import { Composer, D_KICK, type Bar, type Ev } from './composer';
import { PATCHES, type Patch } from './patches';
import type { Roll } from './roll';
import type { Settings } from './settings';
import { getStyle } from './styles';
import { NUM_LAYERS, type Synth, type NoteOpts } from './synth';
import { mtof } from './theory';

const PRIO = [2, 2, 2, 0, 1, 0, 1, 1, 0];

export class Sequencer {
  nextTime = 0;
  stepInBar = 0;
  bar: Bar | null = null;
  capScale = 1;
  onBar: ((bar: Bar, t: number) => void) | null = null;
  onChord: ((bar: Bar, idx: number, t: number) => void) | null = null;

  private settings: Settings;
  private curBpm: number;
  private bpmTarget: number;
  private tempoScale = 1;
  private audible: boolean[] = new Array(NUM_LAYERS).fill(true);
  private baseBright: number[] = new Array(NUM_LAYERS).fill(1);
  private opts: NoteOpts[];
  private patches: (Patch | null)[] = new Array(NUM_LAYERS).fill(null);
  private lastAuto: string[] = new Array(NUM_LAYERS).fill('');
  private duckDepth = 0;
  private swingGrid: 1 | 2 = 1;
  private kit = '';
  private fq: number[] = [];

  constructor(
    private synth: Synth,
    readonly composer: Composer,
    private roll: Roll,
    s: Settings,
  ) {
    this.settings = s;
    this.curBpm = s.bpm;
    this.bpmTarget = s.bpm;
    this.opts = PRIO.map((prio) => ({ bright: 1, atk: 1, rel: 1, wave: 'auto', prio, single: false }));
    this.applySettings(s);
  }

  applySettings(s: Settings) {
    this.settings = s;
    const syn = this.synth;
    const single = s.perf === 'eco';
    for (let l = 0; l < NUM_LAYERS; l++) {
      const L = s.layers[l];
      if (!L) continue;
      this.audible[l] = L.enabled;
      syn.setLayer(l, L.volume, L.enabled);
      const o = this.opts[l];
      this.baseBright[l] = Math.pow(2, (L.brightness - 0.5) * 3);
      o.atk = Math.pow(4, (L.attack - 0.5) * 2);
      o.rel = Math.pow(4, (L.release - 0.5) * 2);
      o.wave = L.wave;
      o.single = single;
    }
    syn.setMaster(s.master);
    syn.setFx(s.reverb, s.delay, s.chorus, s.perf !== 'eco');
    syn.setPerf(s.perf, this.capScale);
    this.bpmTarget = s.bpm * this.tempoScale;
    this.resolvePatches();
  }

  setCapScale(v: number) {
    this.capScale = v;
    this.synth.setPerf(this.settings.perf, v);
  }

  private resolvePatches() {
    for (let l = 1; l < NUM_LAYERS; l++) {
      const pin = this.settings.layers[l]?.patch ?? 'auto';
      const id = pin === 'auto' || !PATCHES[pin] ? this.lastAuto[l] : pin;
      this.patches[l] = PATCHES[id] ?? null;
    }
  }

  private beginBar(t: number) {
    const bar = this.composer.nextBar(this.settings);
    const m = bar.meta;
    this.bar = bar;
    this.stepInBar = 0;
    const st = getStyle(m.styleId);
    this.duckDepth = st.duck;
    this.swingGrid = st.swingGrid;
    if (this.kit !== st.kit) {
      this.kit = st.kit;
      this.synth.setKit(st.kit);
    }
    this.lastAuto = m.patches;
    this.resolvePatches();
    for (let l = 0; l < NUM_LAYERS; l++) this.opts[l].bright = this.baseBright[l] * (0.65 + 0.7 * m.energy);
    this.tempoScale = m.tempoScale;
    this.bpmTarget = this.settings.bpm * this.tempoScale;
    this.synth.setBrightness(m.energy);
    this.synth.setTempo(this.bpmTarget);
    this.onBar?.(bar, t);
  }

  /** Schedule every step that starts before `until` (audio-clock seconds). */
  run(until: number) {
    let guard = 0;
    while (this.nextTime < until && guard++ < 256) {
      if (!this.bar || this.stepInBar >= this.bar.steps) this.beginBar(this.nextTime);
      const bar = this.bar!;
      const s = this.stepInBar;
      this.curBpm += (this.bpmTarget - this.curBpm) * 0.2;
      const stepDur = 60 / (this.curBpm * 4);
      let t = this.nextTime;
      const sw = this.settings.swing;
      if (sw > 0) {
        const p = bar.pos[s];
        if (this.swingGrid === 1 ? (p & 1) === 1 : p % 4 === 2) t += stepDur * sw * (this.swingGrid === 1 ? 0.333 : 0.667);
      }
      const evs = bar.ev[s];
      if (evs) for (let i = 0; i < evs.length; i++) this.fire(evs[i], t, stepDur);
      const b = bar.beat[s];
      if (b) this.roll.mark(t, b === 2 && bar.meta.bar === 0 ? 3 : b);
      if (s > 0) {
        const spans = bar.meta.spans;
        for (let i = 1; i < spans.length; i++) if (spans[i].step === s) this.onChord?.(bar, spans[i].idx, t);
      }
      this.stepInBar++;
      this.nextTime += stepDur;
    }
  }

  private fire(e: Ev, t: number, stepDur: number) {
    const l = e.layer;
    if (!this.audible[l]) return;
    const syn = this.synth;
    if (l === 0) {
      syn.drum(e.drum, t, e.vel, e.p, e.dur * stepDur);
      if (e.drum === D_KICK && this.duckDepth > 0) syn.duck(t, this.duckDepth);
      if (e.drum < 8) this.roll.push(t, 0.12, -1 - e.drum, 0, e.vel);
      return;
    }
    const patch = this.patches[l];
    if (!patch) return;
    const fq = this.fq;
    const n = e.notes.length;
    fq.length = n;
    for (let i = 0; i < n; i++) fq[i] = mtof(e.notes[i]);
    const dur = e.dur * stepDur;
    const ts = l >= 2 && l !== 3 && l !== 8 ? t + (Math.random() - 0.3) * 0.01 : t; // light humanisation (not arps/mallets/drums)
    // only the notes that actually sound are drawn (a chord may be thinned, or refused, by the voice budget)
    const played = syn.note(l, patch, fq, ts, dur, e.vel, this.opts[l]);
    for (let i = 0; i < played; i++) this.roll.push(t, Math.max(dur, 0.08), e.notes[i], l, e.vel);
  }
}
