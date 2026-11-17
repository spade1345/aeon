# Aeon

Aeon is a browser synthesizer that composes and plays an endless stream of music. Nothing is pre-recorded and there are no loops. A procedural composer writes each bar shortly before you hear it, and a small synthesizer built directly on the Web Audio API plays it.

It is a React, Vite and TypeScript app with no audio libraries, designed for modest hardware such as Chromebooks.

This document explains how it works.

- [Quick start](#quick-start)
- [Using the app](#using-the-app)
- [How it works](#how-it-works)
  - [The pipeline](#the-pipeline)
  - [Time and meter](#time-and-meter)
  - [The composer](#the-composer)
  - [The sequencer](#the-sequencer)
  - [The synthesizer](#the-synthesizer)
  - [The player and the interface](#the-player-and-the-interface)
- [Performance design](#performance-design)
- [Seeds and reproducibility](#seeds-and-reproducibility)
- [Project layout](#project-layout)
- [Extending Aeon](#extending-aeon)
- [Troubleshooting](#troubleshooting)
- [Status and known limitations](#status-and-known-limitations)

## Quick start

Requires Node.js 20.19+ or 22.12+ (the Vite 7 requirement).

```bash
npm install
npm run dev       # development server with hot reload
npm run build     # production build
npm run preview   # serve the production build locally
```

The build produces one self-contained file, `dist/index.html`, with all JavaScript and CSS inlined, so it can be hosted on any static server.

Browsers do not allow audio before a user gesture, so nothing sounds until you press play.

## Using the app

### Transport

| Control | What it does |
| --- | --- |
| Play / Pause | Starts or pauses. Pausing suspends the audio engine; resuming continues from the same bar. `Space` does the same unless a form control has focus. |
| Stop | Stops, releases the audio engine and rewinds. Pressing play again replays the same piece from its first bar. |
| New piece | Picks a new random seed. A different piece starts at the next bar. |
| Change direction | Starts a new movement at the next bar: new themes, chord progressions, bass style and instruments, and a new key if **Evolve key** is on. |
| Next section | Ends the current section at the next bar. |
| Surprise me | Switches to a different style with a random key, one of that style's scales, a tempo in its range, and a new seed. |
| Tempo | 40 to 200 BPM. Changes are applied within a few notes. |
| Master volume | 100% is the loudest level that stays below clipping. The default is 90%. |

### Settings

**Style** selects one of ten styles. A style is a bundle of tendencies (drum patterns, bass behaviour, chord vocabulary, instruments, effects), not a fixed arrangement. Choosing one resets tempo, scale, swing and effect amounts to that style's defaults and clears any pinned instruments and oscillator overrides. The time signature is kept if the style supports it.

| Style | Default tempo (range) | Default scale | Character |
| --- | --- | --- | --- |
| Synthwave | 100 (88–118) | Natural minor | Sustained pads, pulsing eighth-note bass, plucked arpeggios that double speed at high energy |
| Ambient Drift | 68 (58–82) | Lydian | Long chords, bell arpeggios, heavy reverb; drums only at very high intensity |
| Lo-Fi Chill | 80 (68–92) | Dorian | Swung boom-bap drums with ghost notes, electric-piano stabs, 7th and 9th chords |
| House | 124 (118–128) | Natural minor | Four-on-the-floor kick, off-beat bass and open hats, organ stabs, strong ducking |
| Acid Techno | 132 (124–140) | Phrygian | Sixteenth-note hats, resonant acid bass, slow-moving harmony |
| Chiptune Arcade | 138 (120–160) | Major | Pulse and square waves, fast arpeggios, mostly plain triads, almost no reverb |
| Jazz Lounge | 112 (84–140) | Dorian | Walking bass, swung ride cymbal, ii–V–I progressions, often two chords per bar |
| Cinematic | 78 (62–96) | Natural minor | String pads, half-time snare, tom fills, long reverb |
| Drum & Bass | 172 (168–178) | Natural minor | Fast breakbeat, reese bass, sustained pads, sixteenth-note plucked arpeggios |
| Neo-Classical | 92 (72–112) | Major | Broken-chord (Alberti) accompaniment, music-box and plucked melodies, no drums |

**Composition** sets the key, one of ten scales (major, natural minor, Dorian, Phrygian, Lydian, Mixolydian, harmonic minor, major and minor pentatonic, blues), one of six time signatures, three complexity sliders, and how the music varies and evolves. [What each control changes](#what-each-control-changes) lists the effect of every slider.

**Instruments** shows the six layers: Drums, Bass, Harmony, Arpeggio, Lead and Texture. Each can be switched off and has a volume. Pitched layers have a patch selector (leave it on **Auto** to let the instrument change as the music develops) and a **Sound design** section with an oscillator override, filter brightness, attack and release. The drum kit follows the style.

**Effects & performance** sets the reverb, delay and chorus amounts and the performance mode (Eco, Balanced or High). It also shows the current seed, accepts a seed to compose from, and resets all settings.

Settings are saved in the browser's `localStorage` and restored on the next visit. The seed is not saved: each page load starts a new piece.

### What you see

The piano roll scrolls the notes that are sounding, coloured by layer, with a drum lane underneath, beat, bar and section markers, and a level meter. Below it are the current section and bar, a history of recent sections, the current chord within the section's progression, the actual key (which can differ from the selected one when **Evolve key** is on), the intensity, and which layers are playing with which instruments.

## How it works

### The pipeline

```
              settings (React state, saved in localStorage)
                               |
                               v
  seed --> Composer --> Sequencer --> Synth --> speakers
           writes one   look-ahead    Web Audio voices,
           bar at a     scheduler     shared effects,
           time         (16th steps)  voice budget
                            |
                            +--> Roll (ring buffers) --> Visualizer (canvas)
                            +--> Player state ---------> React interface
```

Each stage is a plain TypeScript class in `src/engine/`. None of them imports React. The composer has no audio or DOM dependency at all: given a seed and the settings, it returns note events. The sequencer turns those events into precisely timed calls on the synth. The synth builds short-lived Web Audio node graphs. A `Player` owns the audio context, runs the scheduling timer and publishes state to the interface.

### Time and meter

Everything lives on a grid of sixteenth-note steps. Tempo is the quarter-note rate, so one beat at the displayed BPM is four steps. A meter is a list of beat lengths in steps:

| Meter | Beats, in steps | Steps per bar |
| --- | --- | --- |
| 4/4 | 4 + 4 + 4 + 4 | 16 |
| 3/4 | 4 + 4 + 4 | 12 |
| 6/8 | 6 + 6 | 12 |
| 5/4 | 4 + 4 + 4 + 4 + 4, accented as 3 + 2 | 20 |
| 7/8 | 4 + 4 + 6, that is 2 + 2 + 3 eighths | 14 |
| 12/8 | 6 + 6 + 6 + 6 | 24 |

Every step has a metric weight: downbeat, strong beat, beat, eighth or sixteenth. The whole composer leans on these weights. They decide where kicks land, which melody notes must be chord tones, and how arpeggio notes are accented.

In 6/8 and 12/8 the felt pulse is the dotted quarter, which is two-thirds of the displayed BPM.

### The composer

`composer.ts` produces music at three levels.

#### Movements, sections and bars

A **movement** is a self-contained piece. It has three themes, three chord progressions (for verses, for builds and choruses, and for bridges), a harmonic rhythm (each chord lasts half a bar, one bar or two bars), a bass style and an instrument line-up. A movement lasts between 8 sections (Evolution speed at maximum) and 20 sections (at minimum). The next movement gets entirely new material. With **Evolve key** on, it also moves the tonic by a fourth, fifth, whole tone, minor third, major sixth or minor seventh, or returns home. A new movement enters through a breakdown or an intro.

A **section** is an intro, verse, build, chorus, bridge or breakdown. The next section type is drawn from a table of transition weights. For example, a build is followed by a chorus 92% of the time, and a verse may repeat once but never three times in a row.

| Section | Base length | Energy offset | Theme | Character |
| --- | --- | --- | --- | --- |
| Intro | 4 bars | −0.22 | A | No lead; energy rises through the section |
| Verse | 8 bars | −0.04 | A | |
| Build | 4 bars | +0.06 | B | Rising sequence, steeply rising energy, drum fill and noise riser; ends unresolved |
| Chorus | 8 bars | +0.20 | B | Lead in a higher register; usually opens with a crash |
| Bridge | 4 bars | −0.06 | C | Its own chord progression; the theme is A turned upside down |
| Breakdown | 4 bars | −0.28 | A | No drums; the theme at half speed, every other bar |

Lengths double when Evolution speed is below 25% and halve above 75%, within 4 to 16 bars.

Each section has an **energy** between 0 and 1: the Intensity setting, plus a slow sine-shaped arc that drifts over many sections, plus the offset above. Energy decides which layers play. Every style defines the energy at which each layer joins, so Ambient brings in drums only near the top of the range and Neo-Classical never does. Energy also drives velocity, filter brightness and details such as whether hats play sixteenths.

A **bar** is composed only when the sequencer asks for it, from the section's plan and the settings at that moment. That is why most setting changes take effect at the next bar.

#### Harmony

Chords are built by stacking thirds on the degrees of a seven-note scale. Pentatonic and blues scales borrow the chords of their parent major or natural minor scale, while the melody uses the five or six notes of the scale itself.

A progression is four scale degrees. It comes from one of two sources:

- **Idiomatic templates** for each mode family, such as I–V–vi–IV in major, i–VI–III–VII in minor, a i–IV vamp in Dorian, I–II in Lydian and i–♭II in Phrygian. The Jazz style prefers ii–V–I shapes.
- **A Markov chain** over scale degrees whose transition weights encode functional harmony: ii tends to go to V, V tends to go to I, and so on.

Every four-bar phrase ends with a cadence. Phrases inside a section end on a half cadence (a chord that wants to continue), and the last phrase ends on a full cadence that resolves to the tonic. Builds stay unresolved so that the following chorus provides the resolution.

Harmonic complexity and the style then add colour: 7ths and 9ths, a major dominant in minor-type modes, the occasional suspended fourth, secondary dominants (the dominant of the chord that follows), and in major keys the borrowed minor iv and ♭VII. When chords change twice a bar, passing chords are inserted between the main ones.

Chords are **voiced** as three or four notes in close position between F3 and B♭4. Each chord takes whichever inversion moves the voices least from the previous chord, which is what makes the Harmony layer sound connected rather than jumping between block chords.

#### Melody

Melodies are stored as steps of the scale relative to an anchor note, not as pitches. The same idea can therefore be transposed, turned upside down, moved to another key or scale, and fitted to different chords.

- **Rhythm.** Each beat gets a rhythm cell from a small library (12 cells for four-step beats, 11 for six-step beats), including ties and rests. Cells are chosen by how close they are to the complexity and density asked for.
- **Contour.** A shape (arch, dip, rise, fall or wave) biases the direction. Motion is mostly by step. Leaps become more likely with Melodic complexity and are usually followed by a step back the other way. The range stays within about an octave and a half.
- **Themes.** A theme is a call and an answer. The answer keeps the call's rhythm, except for one or two beats, and gets a contour of its own. Each movement has theme A, a denser theme B, and theme C, which is A inverted.
- **Phrases.** A four-bar phrase arranges the call (a) and answer (b) in one of five forms, such as a a′ a↑ b or a b a′ b↓, where ′ means varied and the arrows mean moved up or down a scale step. Builds use a rising sequence that breaks into fragments.

Repeats are varied with these operators:

| Operator | Effect |
| --- | --- |
| Ornament | Inserts passing or neighbour notes before the following note |
| Syncopate | Pulls one on-beat note a sixteenth early |
| Thin | Removes about half of the non-structural notes |
| Fragment | Repeats the first half of the bar, moved up or down by a step or two |
| Retrograde | Reverses the order of the pitches while keeping the rhythm |
| Invert | Mirrors the contour (theme C) |
| Augment | Doubles the note lengths (breakdowns) |

When a bar is composed, each note is mapped into the current key and scale and then **fitted to the chord**. Notes on strong beats and long notes are moved to the nearest chord tone. Notes on ordinary beats are moved with a probability that falls as Melodic complexity rises. Everything else is left as a passing tone. Each phrase then ends on a held cadence note: the nearest chord tone, restricted to the root, third or fifth at a full cadence.

#### The other layers

- **Bass** has five styles: sustained roots; a pulse of eighth notes with octaves and fifths; off-beat notes; a syncopated groove drawn from the metric weights, coloured with fifths, octaves, sevenths and chromatic approach notes; and a walking line, improvised bar by bar, that lands on the root, moves through nearby chord tones and approaches the next root by a semitone.
- **Harmony** sustains chords, plays them on the off-beats, stabs them in a syncopated pattern, or breaks them into single notes. A slow-attack pad cannot articulate a stab, so when the layer's instrument is a pad it always sustains.
- **Arpeggio** cycles through chord tones over one or two octaves in one of five patterns (up, down, up-down, converging, skipping), at eighth or sixteenth notes. It is sometimes masked by a Euclidean rhythm, which spreads a number of hits as evenly as possible over the bar and gives a syncopated feel.
- **Drums** combine a kick pattern (four-on-the-floor, strong beats, breakbeat or sparse) with optional syncopations, a snare or clap backbeat or a half-time snare, ghost notes, a hat pattern, Euclidean percussion, fills at the end of some sections, crashes at section starts and a noise riser through the end of a build.
- **Texture** echoes the opening of the theme at half speed an octave higher while the lead is resting. Otherwise it adds occasional long chord tones high up.

#### What each control changes

| Control | Effect | Takes effect |
| --- | --- | --- |
| Style, scale, time signature | Starts a new movement with new themes and progressions, beginning with a verse | Next bar |
| Key | Transposes; the piece continues | Next bar |
| Melodic complexity | More leaps and ornaments; fewer notes forced onto chord tones. Themes are rewritten | Next bar after you stop moving the slider (0.7 s) |
| Rhythmic complexity | Busier and more syncopated rhythm cells, kick syncopations, ghost notes, extra hats, denser bass and stabs, Euclidean arpeggios. Themes are rewritten | Same |
| Harmonic complexity | More 7ths and 9ths, major dominants in minor, suspended chords, secondary dominants, borrowed chords | Same; the section is re-planned with the existing themes |
| Randomness / variation | How often a repeated motif is varied | Same |
| Intensity | Centre of the energy arc: dynamics and brightness at once, the layer line-up after re-planning | Next bar |
| Evolution speed | Section length, how soon a new movement begins, how far and how fast energy swings, how often bridges, breakdowns, fills and instrument changes occur | Next section |
| Evolve key, Evolve instruments, Tempo drift | Key change per movement; instrument changes per section; tempo wanders by up to 3% per section, within 7% | Next section or movement |
| Tempo, swing, volumes, mutes, patches, sound design, effects, master volume | Sound only: the composition is unchanged | Immediately |

Muting a layer silences it without disturbing the composition, so unmuting brings it back in the right place.

### The sequencer

`sequencer.ts` is a look-ahead scheduler, the standard pattern for precise timing in Web Audio. Every 40 ms it schedules all steps that begin within the next 0.2 seconds (0.5 seconds when the tab is hidden), each at an exact time on the audio clock. Timing accuracy therefore comes from the audio hardware clock, not from JavaScript timers, which only need to fire often enough to stay ahead.

For each step it:

- moves the tempo a fifth of the way towards its target, so tempo changes glide over a few notes;
- applies **swing** by delaying off-beat steps. Most styles swing the sixteenths; Jazz swings the off-beat eighth. At 100% the delay produces a triplet feel;
- nudges harmony, lead and texture notes by a few milliseconds so they do not sound machine-perfect;
- sends each event to the synth with the layer's patch and sound-design settings.

At each bar it asks the composer for the next bar and updates the drum kit, the instruments, the brightness of the mix and the delay time. If scheduling stalls, for example because the machine was busy, it resynchronises to the present instead of firing a burst of late notes.

### The synthesizer

`synth.ts` builds every sound from Web Audio nodes.

```
 voice:  oscillators (1 to 3) --> [low-pass filter + envelope] --> amp envelope --+
         (FM patches: modulator --> carrier frequency)                            |
                                                                                  v
 layer bus (x6):  gain --> pan --> [ducking on each kick] ---------------------> mix
                     \--> sends to reverb, delay and chorus -------------------> mix
                                                                                  |
 mix --> low-pass that opens with energy --> compressor --> master volume --> output
```

#### Voices

A note is one to three oscillators, an optional low-pass filter and an amplitude envelope. A chord is treated as one voice: all of its oscillators share a single filter and envelope, which keeps chords cheap.

- **Envelope.** Attack is a linear ramp, decay and release are exponential ramps. A note released before its decay has finished follows the same decay curve up to the moment of release and then releases from that level, so the gain never jumps.
- **Filter.** The cutoff follows the pitch (key tracking), the velocity, the layer's brightness setting and the section's energy. An envelope sweeps it at the start of each note, closing for plucks and opening for pads.
- **FM.** Four patches use two-operator frequency modulation: a second oscillator modulates the first one's frequency, with an index that decays over the note. This gives the electric piano, marimba, bell and music box their struck quality.
- **Modulation.** One shared 5.3 Hz oscillator provides vibrato for every voice that wants it. Pulse waves are generated as custom waveforms.

#### Patches

A patch is data in `patches.ts`: oscillators (waveform, frequency ratio, detune, level), optional FM settings, optional filter settings, the four envelope times and levels, vibrato depth and a minimum ring time for struck sounds. There are 21:

| Family | Patches |
| --- | --- |
| Pads and sustained | Warm Pad, Glass Pad, Strings, Drawbar Organ |
| Keys and plucks | FM E-Piano, Soft Pluck, Saw Pluck, Pulse 25%, Marimba, FM Bell, Music Box |
| Leads | Saw Lead, Square Lead, Soft Flute, Chip Square |
| Basses | Sub Bass, Analog Bass, Acid Bass, Pulse Bass, Reese Bass, Upright Bass |

Each style lists the patches it may use per layer. With **Evolve instruments** on, the composer occasionally swaps a layer's patch at a section boundary.

#### Drums

Drums are synthesised, not sampled. The kick is an oscillator with a fast downward pitch sweep. The snare is band-passed noise plus a short pitched body. The clap is three noise bursts 11 ms apart followed by a tail. Hats and crashes are high-passed noise with short or long decays. Toms are pitched sweeps. The riser is band-passed noise sweeping upwards. All noise-based hits read from one shared two-second noise buffer, and hats, crashes, snares and claps pass through three shared filters. Five kits (electro, lo-fi, jazz, chip and cinema) differ only in parameters.

#### Mixing and effects

Each layer has a bus with a volume, a pan position and three sends. There is exactly one reverb, one delay and one chorus for the whole synth.

| Layer | Pan | Reverb send | Delay send | Chorus send | Ducked by kick |
| --- | --- | --- | --- | --- | --- |
| Drums | centre | 0.12 | – | – | no |
| Bass | centre | 0.02 | – | – | no |
| Harmony | slightly left | 0.50 | 0.10 | 0.50 | yes |
| Arpeggio | right | 0.35 | 0.45 | 0.20 | yes |
| Lead | slightly right | 0.35 | 0.30 | 0.30 | no |
| Texture | left | 0.80 | 0.50 | 0.20 | yes |

The send levels are multiplied by the Reverb, Delay and Chorus sliders.

- **Reverb** is a convolution with an impulse response generated at start-up: filtered noise with an exponential decay, 1.4, 2.2 or 3.2 seconds long depending on the performance mode.
- **Delay** is a ping-pong echo: two delay lines feeding each other with a low-pass filter in the loop, timed to a dotted eighth note at the current tempo.
- **Chorus** is two short delay taps whose times are slowly modulated in opposite directions and panned apart.
- **Ducking** dips the Harmony, Arpeggio and Texture buses on every kick and lets them recover over about a fifth of a second. The depth is set by the style: strong in House and Techno, absent in Ambient and Jazz.

The mix then passes through a low-pass filter that opens as the section's energy rises, a compressor (10:1 above −14 dB) and the master volume. The compressor is not a brick-wall limiter and lets fast transients through, so the master volume is scaled so that 100% still leaves the output below full scale.

#### The voice budget

The number of oscillators sounding at once is the main CPU cost, so it is budgeted. Each performance mode has a cap, and each kind of sound may start only while the total is below its threshold:

| Priority | Sounds | Admitted while below |
| --- | --- | --- |
| Low | Arpeggio, texture, auxiliary percussion, riser | 1.1 × cap |
| Medium | Lead, hats, toms, crash | 1.25 × cap |
| Critical | Kick, snare, clap, bass, harmony | 1.4 × cap |

| Mode | Cap | Hard ceiling | Oscillators per note | Reverb | Chorus |
| --- | --- | --- | --- | --- | --- |
| Eco | 30 | 42 | 1 (2 for FM patches) | 1.4 s | off |
| Balanced | 52 | 72 | as designed (1 to 3) | 2.2 s | on |
| High | 80 | 112 | as designed (1 to 3) | 3.2 s | on |

A sound that does not fit is not started. It is not queued, and no sounding note is cut off to make room. A chord that does not fit completely is thinned from the top rather than dropped, so the harmony survives a tight budget. The piano roll draws only the pitched notes that were actually started.

How often this happens was measured by simulating 60 minutes of each style at default settings (see [Status](#status-and-known-limitations)). The ranges are across the ten styles:

| | Eco | Balanced | High |
| --- | --- | --- | --- |
| Oscillators sounding, average | 13–23 | 19–39 | 19–39 |
| Oscillators sounding, 95th percentile | 18–34 | 31–54 | 31–55 |
| Arpeggio notes not started | 0–10%, Jazz 21% | 0–2.3% | 0% |
| Texture notes not started | 0–24% | 0–4.7% | 0% |
| Lead notes not started | 0–2.4%, Jazz 5% | up to 0.1% | 0% |
| Drum hits not started | up to 0.8% | up to 0.1% | 0% |
| Chords dropped | up to 0.1% | none | none |
| Chord notes lost to thinning | up to 1.2% | none | none |
| Bass notes not started | none | none | none |

In Jazz the arpeggio only plays at very high energy, so its Eco figure is high but rarely heard. FM patches (electric piano, marimba, bell, music box) need two oscillators per note in every mode, so styles that rely on them gain less from Eco than the others.

### The player and the interface

`player.ts` owns the audio context and the transport.

- **Starting audio.** The audio context is created on the first press of play. If the browser still refuses to run it, the app shows an "Audio blocked" state and waits for another press. If the browser suspends audio later, the app shows the same state and continues when you press play, or by itself if the browser resumes the audio.
- **Pause and stop.** Pause fades out and suspends the context, so a paused app uses no audio CPU. Stop fades out, closes the context and rewinds the composer.
- **State for the interface.** The sequencer schedules up to half a second ahead, so the player queues each bar's description with its start time and releases it when that time is actually heard, compensating for the output latency reported by the browser. The chord display and the piano roll's playhead therefore follow the sound rather than the scheduler.
- **Errors.** An exception in the scheduler stops the timer and shows a message instead of failing silently.

The React side is thin. `App.tsx` holds the settings and passes every change to the player, which applies it to the running engine. The player exposes its state through `useSyncExternalStore`, and updates it only when a bar or chord begins. The visualiser bypasses React completely: it reads fixed-size ring buffers that the sequencer fills and draws them on a canvas.

## Performance design

The app was designed for low-powered machines. These are the measures taken:

- **Scheduling that tolerates a busy main thread.** Notes are scheduled ahead on the audio clock. The timer runs in a Web Worker, which browsers throttle less than page timers in background tabs, with a fallback to `setInterval`. The audio context is opened with the `playback` latency hint, which asks for larger buffers: fewer dropouts at the cost of a slightly longer delay before a control change is heard.
- **A voice budget** with priorities, described above.
- **Shared effects.** One reverb, one delay and one chorus serve all layers through sends.
- **Cheap voices.** Chords share a filter and an envelope, drums share one noise buffer and three filters, and all vibrato comes from one oscillator.
- **Eco mode.** One oscillator per note, no chorus, a shorter reverb and a 20 fps visualiser. It is selected automatically on first run when the browser reports two or fewer CPU cores or 2 GB of memory or less.
- **Self-protection.** If the scheduler is repeatedly called more than 200 ms late while the tab is visible, the caps are lowered to 75%, then 56%, then 42% of the mode's values for the rest of the session, and the Effects & performance tab says so.
- **A cheap visualiser.** It uses fixed ring buffers (768 notes and 96 markers) and allocates nothing per frame. It is capped at 30 frames per second, limits the canvas to 1.5 device pixels per CSS pixel, and stops drawing while paused or hidden.
- **Few React updates.** Interface state changes once per bar or chord, never per frame.
- **No accumulation.** Audio nodes are created per note and released when the note ends. Composing a bar takes on the order of a millisecond.

These are design measures and simulation results, not measurements on a Chromebook. The caps in particular are estimates. See [Status](#status-and-known-limitations).

## Seeds and reproducibility

Every piece comes from a 32-bit seed, shown in the header and in the Effects & performance tab. The composer draws all of its random choices from a generator started with that seed.

The same seed with the same composition settings always produces the same notes. The composition settings are the style, key, scale, time signature, the three complexity sliders, randomness, evolution speed, intensity and the three evolution toggles. Tempo, swing, volumes, mutes, effects, the master volume, sound design and the performance mode do not affect what is composed. The instrument chosen for the Harmony layer affects only that layer: pads sustain where other instruments might play stabs.

Stop rewinds to the first bar of the current seed. Entering a seed, or pressing **New piece**, starts that piece from its first bar.

Changing a composition setting, or pressing **Next section** or **Change direction**, while a piece is playing changes its course from that point, so the result then depends on when you did it.

The audio is not bit-for-bit identical between sessions. The millisecond timing nudges, the noise used for drums and the reverb impulse are randomised each time.

## Project layout

```
index.html                 Page shell
src/
  main.tsx                 React entry point
  App.tsx                  Settings state, tabs, keyboard shortcut, wiring to the player
  index.css                Tailwind import and slider styling
  components/
    TransportBar.tsx       Play, pause, stop, generation actions, tempo, master volume
    NowPlaying.tsx         Section, harmony and intensity read-outs
    Visualizer.tsx         Canvas piano roll, reading the ring buffers directly
    Panels.tsx             The four settings tabs
    ui.tsx                 Slider, select, toggle, segmented control, card
  engine/
    rng.ts                 Seedable random number generator
    theory.ts              Scales, meters, chord construction and naming, voice leading
    harmony.ts             Progression templates, Markov tables, cadences
    motif.ts               Rhythm cells, contours, themes, development operators
    styles.ts              The ten style definitions (data)
    patches.ts             The 21 patches and five drum kits (data)
    composer.ts            Movements, sections and bar-by-bar composition of the six layers
    sequencer.ts           Look-ahead scheduler
    synth.ts               Voices, drums, effects, master chain, voice budget
    roll.ts                Ring buffers that feed the visualiser
    timer.ts               Web Worker timer with a setInterval fallback
    player.ts              Transport, audio context lifecycle, state for the interface
    settings.ts            Settings model, defaults, style application, persistence
    instance.ts            The single shared player
  utils/cn.ts              Class-name helper
```

## Extending Aeon

Most of the musical character is data, so many changes need no new logic.

- **Add a patch.** Add an entry to `PATCHES` in `patches.ts`. List its id in `LAYER_PATCHES` for each layer whose selector should offer it, and in a style's `patches` if that style should choose it automatically. Long-ringing patches are expensive on fast lines, because every note holds its oscillators until it has rung out.
- **Add a style.** Add a `StyleDef` to `STYLES` in `styles.ts` and its id to the `StyleId` type. The style grid, **Surprise me** and the composer pick it up from there.
- **Add a scale.** Add it to `SCALES` in `theory.ts` with its seven-note `parent` scale, from which chords are built, and its `fam`, which selects the progression templates and cadences in `harmony.ts`. Add its id to `ScaleId`.
- **Add a meter.** Add it to `METERS` and `METER_LIST` in `theory.ts` and to `MeterId`. Beats must be four or six steps long, because rhythm cells exist only for those lengths.
- **Tune the load.** `CAPS` and `limit()` in `synth.ts` set the voice budget. `MASTER_MAX` sets the gain at 100% volume.

## Troubleshooting

- **No sound after pressing play.** An "Audio blocked" badge means the browser suspended audio: press play again. Otherwise check the master volume and that the layers are switched on.
- **Crackles or dropouts.** Switch to Eco in Effects & performance.
- **Arpeggio or texture notes missing in busy passages.** The voice budget declined them. Use High on a faster machine.
- **A different piece after reloading.** The seed is random on each load. Note the seed to return to a piece.

## Status and known limitations

### What has been verified, and how

At the time of writing the app has been checked by automated analysis only. The tools were throwaway scripts and are not part of this repository, which contains no test suite.

- **Envelopes.** The gain curve produced by the real voice code was compared with the analytic envelope for all 21 patches, with short and long notes: 42 cases, all within 0.2%, with no step larger than 0.2% of peak.
- **Long runs.** The real composer, sequencer and synth were driven against a strict stand-in for the audio context that advances a simulated clock, ends sounds on time and rejects arguments a browser would reject. About 90 simulated hours, including 4 hours of random setting changes, ran with no exceptions. The voice count never went negative and always returned to zero, and memory stayed flat over a 48-hour run. The voice budget figures above come from these runs.
- **Audio output.** Seventy renders through a real Web Audio implementation running offline (not a browser) showed no invalid samples, no silent gaps other than musical rests, and no clipping, including forty renders at 100% volume with dense settings.
- **Composition.** 19,200 bars composed under random setting changes contained no invalid notes. All ten styles replay identically from a seed.
- **Interface.** The React app was driven through play, pause, stop, every control, style and performance changes and a minute of playback in a simulated DOM: 23 checks passed.

### What has not been verified

- **Nobody has listened to it.** Notes, harmony, levels and envelopes have been checked numerically. Whether it sounds good has not.
- **It has not been run in a real browser.** Behaviour in Chrome is inferred from the Web Audio specification. Firefox and Safari are untested.
- **It has not been profiled on a Chromebook.** The voice caps are estimates of what such hardware can sustain.

### Known limitations

- In Eco mode, busy passages in some styles lose a noticeable share of arpeggio and texture notes (see the table above).
- Pinning a long-ringing patch (FM Bell, Music Box) on the Arpeggio layer in a fast style exhausts the voice budget, and the arpeggio is thinned heavily.
- In Jazz with a 12/8 time signature, swing delays only the middle eighth note of each beat. Set Swing to 0 for an even feel.
- Styles whose Harmony instrument is plucked, such as Neo-Classical, can have very sparse intros: one chord per bar followed by near silence.
- The oscillator override has no effect on the four FM patches. Filter brightness has no effect on the four patches without a filter (Drawbar Organ, Marimba, FM Bell, Music Box).
- The drum kit is tied to the style and has no sound-design controls.
- Drum hits are drawn on the piano roll when scheduled, even in the rare case that the voice budget declines them.
- Because 100% master volume is set conservatively, the app may be quieter than other audio at the same system volume.
- There is no audio or MIDI export and no MIDI input.
