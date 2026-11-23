import { LAYER_DEFS } from '@/engine/settings';

interface LayerSpec {
  prio: number;
  pan: string;
  sends: string;
  duck: string;
  logic: string;
}

const LAYER_SPECS: Record<string, LayerSpec> = {
  drums: {
    prio: 2,
    pan: '0.00',
    sends: '0.12 / 0.00 / 0.00',
    duck: 'Trigger',
    logic: 'Oscillator kick/toms + filtered shared noise (7.5 kHz HP, 1.9/1.3 kHz BP); beat fills & 400–9k Hz risers.',
  },
  bass: {
    prio: 2,
    pan: '0.00',
    sends: '0.02 / 0.00 / 0.00',
    duck: 'No',
    logic: 'Follows chord roots in register ~35–55 MIDI; switches between sustained pedal, 8th pulse, offbeat bounce, groove, and walking passing tones.',
  },
  chords: {
    prio: 2,
    pan: '-0.12',
    sends: '0.50 / 0.10 / 0.50',
    duck: 'Yes',
    logic: '3–5 note voicings solved via voiceChord(); rendered as pads, rhythmic stabs, off-beat skanks, or Alberti arpeggiations sharing one filter/ADSR.',
  },
  arp: {
    prio: 0,
    pan: '+0.28',
    sends: '0.35 / 0.45 / 0.20',
    duck: 'Yes',
    logic: 'Subdivides chord pitch pool (up/down/converge/thirds) gated by Euclidean masks ((i·k) mod n) < k synced to meter.',
  },
  lead: {
    prio: 1,
    pan: '+0.10',
    sends: '0.35 / 0.30 / 0.30',
    duck: 'No',
    logic: 'Coherent A/B hook motifs locked short-term per chorus; triad-core anchoring on downbeats & cadences with leap-bounded register continuity (orn, thin, syn, frag).',
  },
  texture: {
    prio: 0,
    pan: '-0.30',
    sends: '0.80 / 0.50 / 0.20',
    duck: 'Yes',
    logic: 'High-register chimes and sparse harmonic echoes answering lead rests; dropped first when the polyphony ceiling tightens.',
  },
  counter: {
    prio: 1,
    pan: '-0.24',
    sends: '0.45 / 0.28 / 0.35',
    duck: 'No',
    logic: 'Mid-register contrary-motion voice moving opposite lead intervals and favouring diatonic 3rds, 7ths, and 9ths.',
  },
  drone: {
    prio: 1,
    pan: '+0.05',
    sends: '0.72 / 0.15 / 0.45',
    duck: 'Yes',
    logic: 'Long low-mid tonic root and open-fifth sustain anchored across harmonic changes with high reverb/chorus depth.',
  },
  mallet: {
    prio: 0,
    pan: '+0.36',
    sends: '0.35 / 0.40 / 0.15',
    duck: 'No',
    logic: 'Euclidean pitched percussion stepping diagonally across chord color tones (root, 3rd, 5th, 7th, 9th) with short percussive envelopes.',
  },
};

export function GuidePanel() {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-slate-300 sm:p-6">
      <header className="border-b border-slate-800 pb-4">
        <h2 className="text-base font-semibold tracking-tight text-white">Aeon Synthesis &amp; Composition Architecture</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
          Every sound is generated in-browser from a 32-bit deterministic seed using multi-timescale Markov models, minimal-displacement voice-leading, a Web Worker lookahead sequencer, and a shared-send Web Audio synthesizer.
        </p>
      </header>

      {/* 01. Pipeline, PRNG Seeding & Lookahead Clock */}
      <section className="space-y-3 border-b border-slate-800/80 py-5">
        <h3 className="text-sm font-semibold text-white">01. Deterministic PRNG, Lookahead Scheduler &amp; Clock Sync</h3>
        <pre className="overflow-x-auto rounded-lg bg-slate-950/80 p-3 font-mono text-[11px] leading-relaxed text-slate-300 tabular-nums">
{`Seed (u32) ─▶ Mulberry32 PRNG ─▶ Composer (Movement → Section → Bar, 16th-step grid)
                                       │
Web Worker TickTimer (40 ms) ──▶ Sequencer lookahead (+200 ms active / +500 ms hidden)
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
AudioContext.currentTime                               Lock-Free Ring Buffer (Float64/Int16)
(Oscillators, Filters, FX)                             (768 notes + 96 markers → Piano Roll)
        │                                                             │
        └───────── uiQ drain at t_heard = currentTime - outputLatency ┘`}
        </pre>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-200">Mulberry32 State Transition &amp; Replay</div>
            <p className="text-xs leading-relaxed text-slate-400">
              All stochastic decisions (form, progressions, motifs, rhythmic fills, patch rolls) consume one 32-bit seeded PRNG instance, guaranteeing identical playback for the same seed and settings:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/75 px-3 py-2 font-mono text-[11px] text-violet-200 tabular-nums">
{`a = (a + 0x6d2b79f5) | 0
t = imul(a ^ (a >>> 15), 1 | a)
t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t
u = ((t ^ (t >>> 14)) >>> 0) / 2³²`}
            </pre>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-200">Lookahead Timing, Swing &amp; Stall Recovery</div>
            <p className="text-xs leading-relaxed text-slate-400">
              A Blob Web Worker fires every <span className="font-mono text-slate-200 tabular-nums">40 ms</span> so background tabs cannot throttle scheduling to <span className="font-mono text-slate-200 tabular-nums">1 Hz</span>. Bars are generated lazily at bar boundaries so slider edits apply within one bar without resetting the beat.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/75 px-3 py-2 font-mono text-[11px] text-emerald-200 tabular-nums">
{`stepDur = 60 / (4 · curBpm)    curBpm += (target - curBpm) · 0.2
t_swing = t + stepDur · swing · (16thGrid ? 0.333 : 0.667)
if 4 ticks exceed 200 ms: capScale *= 0.75 (min 0.45)`}
            </pre>
          </div>
        </div>
      </section>

      {/* 02. Form Grammar, Harmony & Voice-Leading Math */}
      <section className="space-y-3 border-b border-slate-800/80 py-5">
        <h3 className="text-sm font-semibold text-white">02. Markov Form, Chord Grammar &amp; Voice-Leading Math</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-200">Section Markov Chain &amp; Harmonic Progression</div>
            <p className="text-xs leading-relaxed text-slate-400">
              A 6-state first-order Markov chain transitions through <span className="text-slate-200">intro, verse, build, chorus, bridge, breakdown</span> across <span className="font-mono text-slate-200 tabular-nums">8–20</span> section movements, optionally modulating by <span className="font-mono text-slate-200 tabular-nums">[+7, +5, +2, +3, +9, +10] mod 12</span> semitones. Each progression picks an idiomatic/jazz 4-bar template (<span className="font-mono tabular-nums">55%</span>) or samples a <span className="font-mono tabular-nums">7×7</span> functional degree matrix with cadences and passing harmonies:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/75 px-3 py-2 font-mono text-[11px] text-sky-200 tabular-nums">
{`energy  = clamp(base + 0.45·sin(arc)·(0.25 + 0.75·evo) + typeOff, 0.06, 1)
admit_l = (energy + typeBonus[l]) >= style.min[l]
w_pass(d) = P(cur → d) · (P(d → next) + 0.05)`}
            </pre>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-200">Minimal-Displacement Voice-Leading (<span className="font-mono">voiceChord</span>)</div>
            <p className="text-xs leading-relaxed text-slate-400">
              Diatonic stacked thirds (or dominant <span className="font-mono text-slate-200 tabular-nums">V7</span> extensions) are built in priority order <span className="font-mono text-slate-200 tabular-nums">[1, 3, 7, 9, 5]</span> up to <span className="font-mono text-slate-200">maxNotes</span>. Every close-position inversion rotation <span className="font-mono text-slate-200">rot ∈ [0, m)</span> and octave shift <span className="font-mono text-slate-200 tabular-nums">Δ ∈ &#123;-12, 0, +12&#125;</span> is scored to minimize inner-voice movement:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/75 px-3 py-2 font-mono text-[11px] text-amber-200 tabular-nums">
{`cost(c) = Σ |c[i] - prev[i]| + 1.5·|len(c) - len(prev)|
        + 4·max(0, c_top - hi) + 4·max(0, lo - 2 - c_bot)
bestVoicing = argmin_{rot, Δ} cost(c)`}
            </pre>
          </div>
        </div>
      </section>

      {/* 03. Motifs & Euclidean Rhythm Generation */}
      <section className="space-y-2.5 border-b border-slate-800/80 py-5">
        <h3 className="text-sm font-semibold text-white">03. Scale-Index Motifs &amp; Euclidean Rhythm Masks</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <p className="text-xs leading-relaxed text-slate-400">
            <span className="font-semibold text-slate-200">Scale-step abstraction:</span> Call/answer motif cells store relative scale degrees <span className="font-mono text-slate-200">MNote &#123; t, d, i, s &#125;</span> with structural weights (<span className="font-mono text-slate-200 tabular-nums">s = 2</span> triad <span className="font-mono text-slate-200">coreMask</span> downbeats/cadences, <span className="font-mono tabular-nums">0</span> rub-guarded passing tones) placed by minimum-leap cost without octave wrapping. Chorus phrases lock form short-term and evolve via <span className="font-mono text-slate-200">orn, thin, syn, frag</span>.
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            <span className="font-semibold text-slate-200">Meters &amp; Euclidean masks:</span> Compound and odd meters (<span className="font-mono text-slate-200 tabular-nums">4/4, 3/4, 6/8, 5/4, 7/8, 12/8</span>) encode per-step metric weight arrays (<span className="font-mono tabular-nums">4 → 0</span>). Arpeggio, mallet, and auxiliary percussion gate patterns spread <span className="font-mono text-slate-200">k</span> hits across <span className="font-mono text-slate-200">n</span> steps uniformly via <span className="font-mono text-slate-200 tabular-nums">((i · k) mod n) &lt; k</span>.
          </p>
        </div>
      </section>

      {/* 04. Web Audio DSP Graph & Polyphony Budget */}
      <section className="space-y-3 border-b border-slate-800/80 py-5">
        <h3 className="text-sm font-semibold text-white">04. Web Audio DSP Graph &amp; Priority Voice Budget</h3>
        <pre className="overflow-x-auto rounded-lg bg-slate-950/80 p-3 font-mono text-[11px] leading-relaxed text-slate-300 tabular-nums">
{`[Osc / PeriodicWave(N=48) / 2-Op FM] ─▶ [Shared Lowpass Filter] ─▶ [ADSR GainNode]
                                                                          │
   ┌──────────────────────────────────────────────────────────────────────┘
   ▼
[9 Layer Buses: Gain · StereoPanner]
   ├──▶ Dry (Layers 2,3,5,7 ─▶ Kick DuckNode [1-depth ─▶ 1 over 220 ms]; others ─▶ pre)
   ├──▶ Send Rev ─▶ HP(250Hz) ─▶ LP(7kHz) ─▶ ConvolverNode(IR) ──────────────┐
   ├──▶ Send Dly ─▶ Ping-Pong dL/dR (0.75·60/bpm, LP 3.2kHz, fb 0.42) ───────┼─▶ [pre(0.8)]
   └──▶ Send Cho ─▶ LFO(0.4Hz) ─▶ ±17/25ms modulated stereo taps ────────────┘      │
                                                                                    ▼
   [Output] ◀─ [Master Gain (v²·0.6) + Analyser(256)] ◀─ [Comp(-14dB, 10:1)] ◀─ [Sweep LPF]`}
        </pre>
        <div className="grid gap-4 md:grid-cols-2">
          <pre className="overflow-x-auto rounded-lg bg-slate-950/75 px-3 py-2 font-mono text-[11px] text-fuchsia-200 tabular-nums">
{`f_cut  = clamp(cutoff · (f_mean / 261.63)^kt · bright · (0.55 + 0.9·vel), 60, 16000)
fm_dev = index · f · ratio · min(1, 700 / f) · (0.5 + 0.5·vel)
IR(x)  = lp_decay(1 - x)^2.6 · exp(-2.2·x)   (12 ms pre-delay, 1.4–3.2 s)`}
          </pre>
          <div className="space-y-1 text-xs leading-relaxed text-slate-400">
            <div className="font-semibold text-slate-200">Oscillator Budget &amp; Priority Admission</div>
            <p>
              Performance caps (<span className="font-mono text-slate-200 tabular-nums">eco: 30, balanced: 52, high: 80</span> oscillators × <span className="font-mono text-slate-200">capScale</span>) multiply by priority tier:
              <span className="font-mono text-slate-200 tabular-nums"> 1.1×</span> (Prio 0: arp, tex, mallet),
              <span className="font-mono text-slate-200 tabular-nums"> 1.25×</span> (Prio 1: lead, counter, drone), and
              <span className="font-mono text-slate-200 tabular-nums"> 1.4×</span> (Prio 2: drums, bass, chords). Excess polyphony thins top chord extensions instead of dropping roots.
            </p>
          </div>
        </div>
      </section>

      {/* 05. Layer Synthesis & Bus Routing Specification */}
      <section className="space-y-3 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">05. Nine-Layer Bus &amp; Composition Specification</h3>
          <span className="font-mono text-[11px] text-slate-500">Sends: Rev / Dly / Cho</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                <th className="py-2 pr-3">Layer</th>
                <th className="px-2 py-2 text-right">Prio</th>
                <th className="px-2 py-2 text-right">Pan</th>
                <th className="px-2 py-2 text-right">Rev / Dly / Cho</th>
                <th className="px-2 py-2">Duck</th>
                <th className="py-2 pl-3">Procedural &amp; DSP Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {LAYER_DEFS.map((layer) => {
                const spec = LAYER_SPECS[layer.id];
                return (
                  <tr key={layer.id} className="align-top transition-colors hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-semibold whitespace-nowrap text-slate-100">{layer.name}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-slate-300 tabular-nums">{spec.prio}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-slate-300 tabular-nums">{spec.pan}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-slate-300 tabular-nums">{spec.sends}</td>
                    <td className="px-2 py-2.5 font-mono text-slate-400">{spec.duck}</td>
                    <td className="py-2.5 pl-3 leading-relaxed text-slate-400">{spec.logic}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
