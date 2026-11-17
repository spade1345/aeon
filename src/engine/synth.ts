// Real-time synthesis engine built on the Web Audio API.
//
// CPU-conscious design:
//   * every layer shares ONE reverb, ONE ping-pong delay and ONE chorus (send effects)
//   * voices are short-lived node graphs that clean themselves up on `ended`
//   * a global oscillator budget with per-layer priority drops the least important notes first
//   * one shared noise buffer and shared drum filters; chords share one filter + envelope per chord
import { KITS, type Kit, type KitId, type Patch, type Wave } from './patches';
import type { PerfMode } from './settings';
import { clamp } from './theory';

export const NUM_LAYERS = 6;
export interface NoteOpts {
  bright: number; // cutoff multiplier
  atk: number; // attack time multiplier
  rel: number; // release time multiplier
  wave: string; // 'auto' or oscillator type override
  prio: number; // 0 low .. 2 critical
  single: boolean; // eco: one oscillator per note
}

const SEND_REV = [0.12, 0.02, 0.5, 0.35, 0.35, 0.8];
const SEND_DLY = [0, 0, 0.1, 0.45, 0.3, 0.5];
const SEND_CHO = [0, 0, 0.5, 0.2, 0.3, 0.2];
const PANS = [0, 0, -0.12, 0.28, 0.1, -0.3];
const DUCKED = [false, false, true, true, false, true];
const VIB_DEPTHS = [5, 9, 14];

const IR_SECONDS: Record<PerfMode, number> = { eco: 1.4, balanced: 2.2, high: 3.2 };
const CAPS: Record<PerfMode, number> = { eco: 30, balanced: 52, high: 80 };
/**
 * Gain at 100% master volume. The output compressor adds make-up gain and lets fast transients
 * through, so its output can peak at roughly 1.6; this keeps the top of the slider below full scale.
 */
const MASTER_MAX = 0.6;

interface LayerBus {
  input: GainNode;
  pan: StereoPannerNode;
  rev: GainNode;
  dly: GainNode;
  cho: GainNode;
}

function makeIR(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  const pre = Math.floor(sr * 0.012);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const x = (i - pre) / (len - pre);
      const env = Math.pow(1 - x, 2.6) * Math.exp(-x * 2.2);
      const k = 0.85 - 0.7 * Math.min(1, x * 1.6); // high frequencies die away first
      lp += (Math.random() * 2 - 1 - lp) * k;
      d[i] = lp * env;
    }
  }
  return buf;
}

/** Smooth a parameter towards a target without piling up automation events. */
function smooth(param: AudioParam, target: number, now: number, dur = 0.03) {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + dur);
}

export class Synth {
  readonly ctx: BaseAudioContext;
  cap: number;
  active = 0;
  dropped = 0;
  readonly layers: LayerBus[] = [];

  private pre: GainNode;
  private mfilter: BiquadFilterNode;
  private fade: GainNode;
  private master: GainNode;
  private analyser: AnalyserNode;
  private lvBuf: Float32Array<ArrayBuffer>;
  private duckNode: GainNode;
  private revIn: GainNode;
  private revLp: BiquadFilterNode;
  private revWet: GainNode;
  private conv: ConvolverNode;
  private dlyIn: GainNode;
  private dL: DelayNode;
  private dR: DelayNode;
  private choIn: GainNode;
  private noise: AudioBuffer;
  private vib: GainNode[] = [];
  private pulse: Record<string, PeriodicWave> = {};
  private hatF: BiquadFilterNode;
  private snareF: BiquadFilterNode;
  private clapF: BiquadFilterNode;
  private kit: Kit = KITS.electro;
  private kitId: KitId | '' = '';
  private perf: PerfMode;
  private volume = 0.9;
  private lastDly = 0;

  constructor(ctx: BaseAudioContext, perf: PerfMode) {
    this.ctx = ctx;
    this.perf = perf;
    this.cap = CAPS[perf];
    const g = (v: number) => {
      const n = ctx.createGain();
      n.gain.value = v;
      return n;
    };
    const bq = (type: BiquadFilterType, f: number, q = 0.7) => {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = f;
      n.Q.value = q;
      return n;
    };
    const pan = (v: number) => {
      const n = ctx.createStereoPanner();
      n.pan.value = v;
      return n;
    };

    // ---- master chain: pre -> lowpass(sweep) -> compressor/limiter -> fade -> master -> out
    this.pre = g(0.8);
    this.mfilter = bq('lowpass', 16000, 0.5);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 10;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    this.fade = g(0);
    this.master = g(this.volume * this.volume * MASTER_MAX);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;
    this.lvBuf = new Float32Array(256);
    this.pre.connect(this.mfilter);
    this.mfilter.connect(comp);
    comp.connect(this.fade);
    this.fade.connect(this.master);
    this.master.connect(ctx.destination);
    this.master.connect(this.analyser);

    this.duckNode = g(1);
    this.duckNode.connect(this.pre);

    // ---- reverb (shared)
    this.revIn = g(1);
    const revHp = bq('highpass', 250, 0.5);
    this.revLp = bq('lowpass', 7000, 0.5);
    this.conv = ctx.createConvolver();
    this.conv.buffer = makeIR(ctx, IR_SECONDS[perf]);
    this.revWet = g(1.1);
    this.revIn.connect(revHp);
    revHp.connect(this.revLp);
    this.revLp.connect(this.conv);
    this.conv.connect(this.revWet);
    this.revWet.connect(this.pre);

    // ---- ping-pong delay (shared)
    this.dlyIn = g(1);
    this.dL = ctx.createDelay(2);
    this.dR = ctx.createDelay(2);
    this.dL.delayTime.value = 0.375;
    this.dR.delayTime.value = 0.375;
    const dLp = bq('lowpass', 3200, 0.5);
    const fb = g(0.42);
    const dWet = g(0.8);
    this.dlyIn.connect(this.dL);
    this.dL.connect(dLp);
    dLp.connect(this.dR);
    this.dR.connect(fb);
    fb.connect(this.dL);
    const pL = pan(-0.8);
    const pR = pan(0.8);
    this.dL.connect(pL);
    this.dR.connect(pR);
    pL.connect(dWet);
    pR.connect(dWet);
    dWet.connect(this.pre);

    // ---- chorus (shared, two modulated delay taps)
    this.choIn = g(1);
    const d1 = ctx.createDelay(0.05);
    const d2 = ctx.createDelay(0.05);
    d1.delayTime.value = 0.017;
    d2.delayTime.value = 0.025;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.4;
    const lg1 = g(0.0022);
    const lg2 = g(-0.0028);
    lfo.connect(lg1);
    lfo.connect(lg2);
    lg1.connect(d1.delayTime);
    lg2.connect(d2.delayTime);
    const cp1 = pan(-0.8);
    const cp2 = pan(0.8);
    const cWet = g(0.8);
    this.choIn.connect(d1);
    this.choIn.connect(d2);
    d1.connect(cp1);
    d2.connect(cp2);
    cp1.connect(cWet);
    cp2.connect(cWet);
    cWet.connect(this.pre);
    lfo.start();

    // ---- layer buses
    for (let l = 0; l < NUM_LAYERS; l++) {
      const input = g(0.7);
      const p = pan(PANS[l]);
      const rev = g(0);
      const dly = g(0);
      const cho = g(0);
      input.connect(p);
      p.connect(DUCKED[l] ? this.duckNode : this.pre);
      input.connect(rev);
      input.connect(dly);
      input.connect(cho);
      rev.connect(this.revIn);
      dly.connect(this.dlyIn);
      cho.connect(this.choIn);
      this.layers.push({ input, pan: p, rev, dly, cho });
    }

    // ---- shared noise buffer (looped) and drum filters
    const sr = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, sr * 2, sr);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.hatF = bq('highpass', 7500, 0.5);
    this.snareF = bq('bandpass', 1900, 0.8);
    this.clapF = bq('bandpass', 1300, 0.9);
    for (const f of [this.hatF, this.snareF, this.clapF]) f.connect(this.layers[0].input);

    // ---- shared vibrato LFO (three depths) and pulse-wave tables
    const vlfo = ctx.createOscillator();
    vlfo.frequency.value = 5.3;
    for (const depth of VIB_DEPTHS) {
      const vg = g(depth);
      vlfo.connect(vg);
      this.vib.push(vg);
    }
    vlfo.start();
    this.pulse.pulse25 = this.makePulse(0.25);
    this.pulse.pulse12 = this.makePulse(0.125);
    this.setKit('electro');
  }

  private makePulse(duty: number): PeriodicWave {
    const N = 48;
    const real = new Float32Array(N + 1);
    const imag = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) {
      real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      imag[n] = (2 / (n * Math.PI)) * (1 - Math.cos(n * Math.PI * duty));
    }
    return this.ctx.createPeriodicWave(real, imag);
  }

  // ---- configuration -----------------------------------------------------------------
  setKit(id: KitId) {
    if (this.kitId === id) return;
    this.kitId = id;
    this.kit = KITS[id];
    this.hatF.frequency.value = this.kit.hat.hp;
    this.snareF.frequency.value = this.kit.snare.bp;
    this.snareF.Q.value = this.kit.snare.q;
    this.clapF.frequency.value = this.kit.clap.bp;
  }

  setPerf(perf: PerfMode, capScale = 1) {
    if (perf !== this.perf) {
      this.perf = perf;
      // swap in a new convolver so the tail is never cut abruptly
      const old = this.conv;
      const nc = this.ctx.createConvolver();
      nc.buffer = makeIR(this.ctx, IR_SECONDS[perf]);
      this.revLp.connect(nc);
      nc.connect(this.revWet);
      this.conv = nc;
      setTimeout(() => {
        try {
          this.revLp.disconnect(old);
          old.disconnect();
        } catch {
          /* already gone */
        }
      }, 400);
    }
    this.cap = Math.round(CAPS[perf] * capScale);
  }

  setMaster(v: number) {
    this.volume = v;
    smooth(this.master.gain, v * v * MASTER_MAX, this.ctx.currentTime, 0.04);
  }

  fadeIn(sec = 0.15) {
    const g = this.fade.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(1, now + sec);
  }
  fadeOut(sec = 0.08) {
    const g = this.fade.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + sec);
  }

  setLayer(l: number, volume: number, enabled: boolean) {
    smooth(this.layers[l].input.gain, enabled ? volume * volume * 1.2 : 0, this.ctx.currentTime, 0.03);
  }

  setFx(reverb: number, delay: number, chorus: number, chorusAllowed: boolean) {
    const now = this.ctx.currentTime;
    for (let l = 0; l < NUM_LAYERS; l++) {
      const b = this.layers[l];
      smooth(b.rev.gain, SEND_REV[l] * reverb, now, 0.06);
      smooth(b.dly.gain, SEND_DLY[l] * delay, now, 0.06);
      smooth(b.cho.gain, chorusAllowed ? SEND_CHO[l] * chorus : 0, now, 0.06);
    }
  }

  setTempo(bpm: number) {
    const t = clamp((60 / bpm) * 0.75, 0.12, 1.2);
    if (Math.abs(t - this.lastDly) / t < 0.03) return;
    this.lastDly = t;
    const now = this.ctx.currentTime;
    smooth(this.dL.delayTime, t, now, 0.3);
    smooth(this.dR.delayTime, t, now, 0.3);
  }

  /** Slow master brightness sweep following the musical energy. */
  setBrightness(energy: number) {
    const cut = clamp(4500 * Math.pow(2, energy * 2.1), 3000, 16000);
    smooth(this.mfilter.frequency, cut, this.ctx.currentTime, 1.5);
  }

  duck(t: number, depth: number) {
    const g = this.duckNode.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1 - depth, t);
    g.linearRampToValueAtTime(1, t + 0.22);
  }

  getLevel(): number {
    this.analyser.getFloatTimeDomainData(this.lvBuf);
    let s = 0;
    for (let i = 0; i < this.lvBuf.length; i++) s += this.lvBuf[i] * this.lvBuf[i];
    return Math.sqrt(s / this.lvBuf.length);
  }

  // ---- voice budget ---------------------------------------------------------------
  /**
   * Admission threshold for a priority class, as a multiple of the mode's cap. Arpeggio, texture and
   * auxiliary percussion stop being admitted first, then lead, hats and toms; kick, snare, bass and
   * harmony may use the whole ceiling (1.4 x cap). The gap between 1.1 and 1.4 is the reserve kept
   * for the critical layers.
   */
  private limit(prio: number): number {
    return this.cap * (prio >= 2 ? 1.4 : prio === 1 ? 1.25 : 1.1);
  }

  private take(n: number, prio: number): boolean {
    if (this.active + n > this.limit(prio)) {
      this.dropped++;
      return false;
    }
    this.active += n;
    return true;
  }

  private fin(src: AudioScheduledSourceNode, node: AudioNode, n: number, extra?: () => void) {
    src.onended = () => {
      src.onended = null;
      this.active -= n; // first: the budget must be released even if cleanup throws
      try {
        node.disconnect();
        extra?.();
      } catch {
        /* nodes already detached */
      }
    };
  }

  private setWave(osc: OscillatorNode, w: Wave | string) {
    const p = this.pulse[w];
    if (p) osc.setPeriodicWave(p);
    else osc.type = w as OscillatorType;
  }

  // ---- melodic voices -----------------------------------------------------------------
  /**
   * Play one note (or one chord: all frequencies share a single filter + amp envelope).
   * Returns how many of the requested notes were started: 0 if the voice budget refused the event,
   * and fewer than `freqs.length` if a chord had to be thinned to fit.
   */
  note(layer: number, patch: Patch, freqs: number[], t: number, dur: number, vel: number, o: NoteOpts): number {
    if (freqs.length === 0) return 0;
    const ctx = this.ctx;
    const specs = o.single ? [patch.oscs[0]] : patch.oscs;
    const per = specs.length + (patch.fm ? 1 : 0);
    // A chord that does not fit the budget is thinned from the top instead of being dropped outright,
    // so the harmony survives even when the budget is nearly spent.
    const fit = Math.floor((this.limit(o.prio) - this.active) / per);
    if (fit < 1) {
      this.dropped++;
      return 0;
    }
    if (fit < freqs.length) freqs = freqs.slice(0, fit);
    const total = per * freqs.length;
    this.active += total;

    const env = patch.env;
    const a = Math.max(0.002, env.a * o.atk);
    const r = Math.max(0.03, env.r * o.rel) * 1.2;
    const gate = Math.max(dur, a + 0.015, patch.hold ?? 0);
    const end = t + gate + r + 0.03;
    const peak = patch.gain * (0.2 + 0.8 * vel) * (1 / Math.sqrt(freqs.length)) * (o.single ? 1.3 : 1);

    // ADSR built only from linear/exponential ramps, so every segment is continuous.
    const amp = ctx.createGain();
    const ag = amp.gain;
    const dd = Math.max(0.02, env.d);
    const sus = Math.max(peak * env.s, peak * 0.003);
    ag.setValueAtTime(0, t);
    ag.linearRampToValueAtTime(peak, t + a);
    if (gate >= a + dd) {
      // full decay, then hold the sustain level until note-off
      ag.exponentialRampToValueAtTime(sus, t + a + dd);
      ag.setValueAtTime(sus, t + gate);
    } else {
      // note-off arrives mid-decay: follow the same decay curve, cut short at the gate
      ag.exponentialRampToValueAtTime(peak * Math.pow(sus / peak, (gate - a) / dd), t + gate);
    }
    ag.exponentialRampToValueAtTime(0.0003, t + gate + r);
    amp.connect(this.layers[layer].input);

    let dest: AudioNode = amp;
    const pf = patch.filter;
    if (pf) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      let mean = 0;
      for (const x of freqs) mean += Math.log(x);
      mean = Math.exp(mean / freqs.length);
      const cut = clamp(pf.cutoff * Math.pow(mean / 261.63, pf.kt) * o.bright * (0.55 + 0.9 * vel), 60, 16000);
      f.Q.value = pf.q;
      if (Math.abs(pf.env) > 0.05) {
        f.frequency.setValueAtTime(clamp(cut * Math.pow(2, pf.env), 60, 18000), t);
        f.frequency.exponentialRampToValueAtTime(cut, t + Math.max(0.03, pf.decay));
      } else f.frequency.value = cut;
      f.connect(amp);
      dest = f;
    }

    const vib = patch.vib ? this.vib[patch.vib <= 7 ? 0 : patch.vib <= 11 ? 1 : 2] : null;
    const vibTargets: AudioParam[] = [];
    let first: OscillatorNode | null = null;
    for (const f of freqs) {
      for (let i = 0; i < specs.length; i++) {
        const sp = specs[i];
        const osc = ctx.createOscillator();
        this.setWave(osc, o.wave !== 'auto' && !(patch.fm && i === 0) ? o.wave : sp.type);
        osc.frequency.value = f * sp.mult;
        if (sp.detune) osc.detune.value = sp.detune;
        if (sp.gain !== 1) {
          const gn = ctx.createGain();
          gn.gain.value = sp.gain;
          osc.connect(gn);
          gn.connect(dest);
        } else osc.connect(dest);
        if (vib) {
          vib.connect(osc.detune);
          vibTargets.push(osc.detune);
        }
        if (patch.fm && i === 0) {
          const fm = patch.fm;
          const mod = ctx.createOscillator();
          mod.frequency.value = f * fm.ratio;
          const mg = ctx.createGain();
          const dev = fm.index * f * fm.ratio * (f > 700 ? 700 / f : 1) * (0.5 + 0.5 * vel);
          mg.gain.setValueAtTime(dev, t);
          mg.gain.exponentialRampToValueAtTime(Math.max(dev * fm.sus, 0.01), t + Math.max(0.03, fm.decay));
          mod.connect(mg);
          mg.connect(osc.frequency);
          mod.start(t);
          mod.stop(end);
        }
        osc.start(t);
        osc.stop(end);
        if (!first) first = osc;
      }
    }
    if (first) {
      this.fin(first, amp, total, () => {
        if (vib) for (const p of vibTargets) vib.disconnect(p);
      });
    }
    return freqs.length;
  }

  // ---- drums -----------------------------------------------------------------------------
  private noiseSrc(t: number, dur: number): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur);
    return s;
  }

  drum(kind: number, t: number, vel: number, p: number, dur: number) {
    switch (kind) {
      case 0:
        return this.kick(t, vel);
      case 1:
        return this.snare(t, vel);
      case 2:
        return this.clap(t, vel);
      case 3:
        return this.hat(t, vel, false);
      case 4:
        return this.hat(t, vel, true);
      case 5:
        return this.perc(t, vel);
      case 6:
        return this.tom(t, vel, p);
      case 7:
        return this.crash(t, vel);
      case 8:
        return this.riser(t, dur, vel);
    }
  }

  private kick(t: number, vel: number) {
    if (!this.take(1, 2)) return;
    const k = this.kit.kick;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = k.type;
    o.frequency.setValueAtTime(k.f0, t);
    o.frequency.exponentialRampToValueAtTime(k.f1, t + k.pd);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * k.gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + k.ad);
    o.connect(g);
    g.connect(this.layers[0].input);
    o.start(t);
    o.stop(t + k.ad + 0.02);
    this.fin(o, g, 1);
  }

  private snare(t: number, vel: number) {
    const s = this.kit.snare;
    const n = s.tg > 0 ? 2 : 1;
    if (!this.take(n, 2)) return;
    const ctx = this.ctx;
    const ns = this.noiseSrc(t, s.nd + 0.03);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vel * s.ng, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + s.nd);
    ns.connect(ng);
    ng.connect(this.snareF);
    this.fin(ns, ng, 1);
    if (s.tg > 0) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(s.tone * 1.5, t);
      o.frequency.exponentialRampToValueAtTime(s.tone, t + 0.03);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vel * s.tg, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + s.td);
      o.connect(g);
      g.connect(this.layers[0].input);
      o.start(t);
      o.stop(t + s.td + 0.02);
      this.fin(o, g, 1);
    }
  }

  private clap(t: number, vel: number) {
    if (!this.take(1, 2)) return;
    const c = this.kit.clap;
    const ns = this.noiseSrc(t, c.d + 0.06);
    const g = this.ctx.createGain();
    const v = vel * c.g;
    const gp = g.gain;
    gp.setValueAtTime(0.0001, t);
    for (let i = 0; i < 3; i++) {
      gp.setValueAtTime(v, t + i * 0.011);
      gp.exponentialRampToValueAtTime(v * 0.2, t + i * 0.011 + 0.009);
    }
    gp.setValueAtTime(v, t + 0.034);
    gp.exponentialRampToValueAtTime(0.001, t + 0.034 + c.d);
    ns.connect(g);
    g.connect(this.clapF);
    this.fin(ns, g, 1);
  }

  private hat(t: number, vel: number, open: boolean) {
    if (!this.take(1, 1)) return;
    const h = open ? this.kit.open : this.kit.hat;
    const ns = this.noiseSrc(t, h.d + 0.03);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vel * h.g, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + h.d);
    ns.connect(g);
    g.connect(this.hatF);
    this.fin(ns, g, 1);
  }

  private perc(t: number, vel: number) {
    if (!this.take(1, 0)) return;
    const pc = this.kit.perc;
    const ctx = this.ctx;
    const g = ctx.createGain();
    if (pc.kind === 'rim') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = pc.f;
      g.gain.setValueAtTime(vel * pc.g * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      o.connect(g);
      g.connect(this.layers[0].input);
      o.start(t);
      o.stop(t + 0.05);
      this.fin(o, g, 1);
    } else {
      const ns = this.noiseSrc(t, 0.1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vel * pc.g, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      ns.connect(g);
      g.connect(this.hatF);
      this.fin(ns, g, 1);
    }
  }

  private tom(t: number, vel: number, pitch: number) {
    if (!this.take(1, 1)) return;
    const k = this.kit.tom;
    const f = k.f * [1.5, 1.2, 1][clamp(pitch, 0, 2)];
    const o = this.ctx.createOscillator();
    o.type = k.type;
    o.frequency.setValueAtTime(f * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vel * k.g, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + k.d);
    o.connect(g);
    g.connect(this.layers[0].input);
    o.start(t);
    o.stop(t + k.d + 0.02);
    this.fin(o, g, 1);
  }

  private crash(t: number, vel: number) {
    if (!this.take(1, 1)) return;
    const c = this.kit.crash;
    const ns = this.noiseSrc(t, c.d + 0.05);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vel * c.g, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + c.d);
    ns.connect(g);
    g.connect(this.hatF);
    this.fin(ns, g, 1);
  }

  private riser(t: number, dur: number, vel: number) {
    if (!this.take(1, 0)) return;
    const ctx = this.ctx;
    const d = clamp(dur, 0.5, 12);
    const ns = this.noiseSrc(t, d + 0.1);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(9000, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.45, t + d * 0.97);
    g.gain.linearRampToValueAtTime(0, t + d + 0.05);
    ns.connect(bp);
    bp.connect(g);
    g.connect(this.layers[0].input);
    this.fin(ns, g, 1, () => bp.disconnect());
  }

  dispose() {
    const c = this.ctx as AudioContext;
    if (typeof c.close === 'function') void c.close().catch(() => undefined);
  }
}

