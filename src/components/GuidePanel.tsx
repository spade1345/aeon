import { LAYER_DEFS } from '@/engine/settings';
import { Card } from './ui';

const LAYER_GUIDE: Record<string, string> = {
  drums: 'Synthesised kick, snare, clap, hi-hats, toms, rimshots, shakers, crash cymbals, and section-transition noise risers.',
  bass: 'Anchors chord roots with style-specific rhythmic personalities: sustained, pulsing 8ths, off-beat bounce, syncopated grooves, or walking basslines.',
  chords: 'Voices 3- to 5-note chords with smooth voice-leading between changes, adapting automatically between sustained pads, stabs, skanks, or Alberti figures.',
  arp: 'Breaks the active chord into ascending, descending, converging, or thirds patterns synced to the bar meter and Euclidean masks.',
  lead: 'Generates call-and-answer themes in scale-index space, then develops them with inversion, retrograde, ornamentation, and cadences.',
  texture: 'Adds high-register bell chimes, harp echoes, or gentle thematic replies when the lead rests.',
  counter: 'Weaves a responsive mid-register inner voice in contrary motion around the lead melody, favouring 3rds, 7ths, and 9ths.',
  drone: 'Holds deep tonic pedals or open fifths in the low-mid register to ground atmospheric, ambient, folk, and cinematic sections.',
  mallet: 'Plays interlocking Euclidean pitched-percussion patterns (vibraphone, kalimba, marimba, steel drum) across chord color tones.',
};

export function GuidePanel() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="1. Live procedural composition">
          <p className="text-sm leading-relaxed text-slate-300">
            Nothing in Aeon is pre-recorded or streamed from audio files. Every bar is composed in real time from your{' '}
            <span className="font-medium text-white">seed</span>, <span className="font-medium text-white">style</span>, and{' '}
            <span className="font-medium text-white">composition</span> controls, then synthesised live in your browser using the Web Audio API.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Because composition happens bar-by-bar just ahead of the playhead, changes to complexity, tempo, scale, or instruments take effect smoothly without interrupting the groove.
          </p>
        </Card>

        <Card title="2. Form, harmony & motifs">
          <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
            <li>
              <span className="font-semibold text-white">Movements & sections:</span> Each movement creates its own themes, chord progressions, and key center. A Markov form model transitions through{' '}
              <span className="text-slate-200">Intro, Verse, Build-up, Chorus, Bridge,</span> and <span className="text-slate-200">Breakdown</span> while an energy curve brings layers in and out.
            </li>
            <li>
              <span className="font-semibold text-white">Chord grammar:</span> Functional Markov chains and mode templates build 4-bar progressions with half and full cadences, secondary dominants, and smooth voice-leading.
            </li>
            <li>
              <span className="font-semibold text-white">Motif development:</span> Themes live in scale-step space, letting them transpose cleanly across any key, scale, or time signature.
            </li>
          </ul>
        </Card>

        <Card title="3. Real-time synthesis & controls">
          <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
            <li>
              <span className="font-semibold text-white">Web Audio synth:</span> Voices combine detuned oscillators, pulse waves, 2-operator FM synthesis, key-tracked lowpass filters, and shared convolution reverb, ping-pong delay, and stereo chorus.
            </li>
            <li>
              <span className="font-semibold text-white">Seeds & replay:</span> The same seed number and settings always produce the exact same piece. Use <span className="text-slate-200">Effects & performance</span> to load or share a seed.
            </li>
            <li>
              <span className="font-semibold text-white">Custom styles:</span> In the <span className="text-slate-200">Style</span> tab, click <span className="text-slate-200">Create style</span> to build your own genre presets with custom kits, scales, rhythms, and instrument pools.
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">Tip: Press Space anytime to play or pause.</p>
        </Card>
      </div>

      <Card title="The 9 instrument layers">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LAYER_DEFS.map((layer) => (
            <div key={layer.id} className="border-t border-slate-800/80 pt-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: layer.color }} />
                <span className="text-sm font-semibold text-slate-100">{layer.name}</span>
                <span className="text-[11px] text-slate-500">· {layer.desc}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{LAYER_GUIDE[layer.id]}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
