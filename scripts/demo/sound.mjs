// The demo video's sound: a quiet ambient instrumental and the interface sounds (clicks, keys,
// one chime), all synthesized here, so the video carries no recorded or licensed audio.
// The times come from the After Effects edit (build/demo/ae/), so each sound lands on the frame it
// belongs to. Writes music.wav, sfx.wav and mix.wav (the two together) to build/demo/audio/.
//   node scripts/demo/sound.mjs
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '../../build/demo/audio');
const SR = 48000;
const LENGTH = 47.7667; // the main comp's duration
const N = Math.ceil(LENGTH * SR);
const TAU = 2 * Math.PI;
const FRAME = 1 / 60;

// The music sits low, as a bed under the interface sounds (product-video practice puts a bed at
// -24 to -20 LUFS). The chime is set relative to it, in loudness units; clicks and keys
// by their peak in dBFS, since a few milliseconds of snap has almost no loudness to measure.
const MUSIC = -20;
const ABOVE = { chime: 6 };
const PEAK = { click: -7, key: -9, grab: -10 };

// Where each scene starts in the main comp. A scene's screen starts 0.3 s in, and the stage times
// passed to at() are the ones set in each stage comp (clicks, key presses, changes on screen).
const SCENE = {
  title: 0,
  spotlight: 2.72,
  links: 7.44,
  zoom: 13.86,
  pen: 20.28,
  timer: 27.3,
  notes: 33.62,
  live: 38.64,
  end: 44.36,
};
const at = (scene, t) => SCENE[scene] + 0.3 + t;

// Twenty bars from the title's first frame to the end card, so the last chord lands as the end
// card appears: about 108 bpm.
const START = 0.1;
const BEAT = (SCENE.end - START) / 80;
const beat = (b) => START + b * BEAT;
const SIXTEENTH = BEAT / 4;

// Seeded, so every run writes the same audio.
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const bus = (n = N) => ({ L: new Float32Array(n), R: new Float32Array(n) });
const copy = (source) => ({ L: source.L.slice(), R: source.R.slice() });
// Note-off: a short fade rather than a cut, which would click.
const gate = (t, length, release) =>
  t < length ? 1 : Math.max(0, 1 - (t - length) / release) ** 2;

// Adds a voice (a function of the time since its start) to a bus, panned with equal power.
function place(target, time, seconds, gain, pan, voice) {
  const first = Math.round(time * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  const count = Math.round(seconds * SR);
  for (let i = 0; i < count; i++) {
    const n = first + i;
    if (n < 0) continue;
    if (n >= target.L.length) break;
    const v = voice(i / SR);
    target.L[n] += v * gl;
    target.R[n] += v * gr;
  }
}

// Adds a rendered sound into a longer bus at a time.
function mix(target, source, gain = 1, time = 0) {
  const first = Math.round(time * SR);
  for (let i = 0; i < source.L.length; i++) {
    const n = first + i;
    if (n < 0) continue;
    if (n >= target.L.length) break;
    target.L[n] += source.L[i] * gain;
    target.R[n] += source.R[i] * gain;
  }
  return target;
}

function scale(source, gain) {
  for (let n = 0; n < source.L.length; n++) {
    source.L[n] *= gain;
    source.R[n] *= gain;
  }
  return source;
}

// State-variable filter (Zavalishin's topology-preserving form): stays stable while the cutoff moves.
function filter(source, type, cutoff, q = 0.707) {
  const k = 1 / q;
  for (const channel of [source.L, source.R]) {
    let ic1 = 0;
    let ic2 = 0;
    for (let n = 0; n < channel.length; n++) {
      const fc = typeof cutoff === 'function' ? cutoff(n / SR) : cutoff;
      const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
      const a1 = 1 / (1 + g * (g + k));
      const a2 = g * a1;
      const a3 = g * a2;
      const x = channel[n];
      const v3 = x - ic2;
      const v1 = a1 * ic1 + a2 * v3;
      const v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1;
      ic2 = 2 * v2 - ic2;
      channel[n] = type === 'low' ? v2 : type === 'band' ? v1 : x - k * v1 - v2;
    }
  }
  return source;
}

// Freeverb (Jezar's public-domain design): eight damped combs and four allpasses per side, the right
// side's delays slightly longer for width.
function reverb(source, { room = 0.82, damp = 0.35, predelay = 0.025 } = {}) {
  const k = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const allpasses = [556, 441, 341, 225];
  const feedback = room * 0.28 + 0.7;
  const d = damp * 0.4;
  const pre = Math.round(predelay * SR);
  const length = source.L.length;
  const out = bus(length);
  for (const [side, spread] of [
    ['L', 0],
    ['R', 23],
  ]) {
    const cs = combs.map((c) => ({
      buf: new Float32Array(Math.round((c + spread) * k)),
      i: 0,
      s: 0,
    }));
    const as = allpasses.map((a) => ({
      buf: new Float32Array(Math.round((a + spread) * k)),
      i: 0,
    }));
    const y = out[side];
    for (let n = 0; n < length; n++) {
      const m = n - pre;
      const x = m < 0 ? 0 : (source.L[m] + source.R[m]) * 0.015;
      let sum = 0;
      for (const c of cs) {
        const o = c.buf[c.i];
        c.s = o * (1 - d) + c.s * d;
        c.buf[c.i] = x + c.s * feedback;
        if (++c.i === c.buf.length) c.i = 0;
        sum += o;
      }
      for (const a of as) {
        const o = a.buf[a.i];
        a.buf[a.i] = sum + o * 0.5;
        sum = o - sum;
        if (++a.i === a.buf.length) a.i = 0;
      }
      y[n] = sum;
    }
  }
  // Low end in the reverb only muddies the bass.
  return filter(out, 'high', 220);
}

// Ping-pong delay, darker on each repeat.
function echo(source, seconds, feedback) {
  const length = Math.round(seconds * SR);
  const bl = new Float32Array(length);
  const br = new Float32Array(length);
  const out = bus(source.L.length);
  let i = 0;
  let lpL = 0;
  let lpR = 0;
  for (let n = 0; n < source.L.length; n++) {
    const oL = bl[i];
    const oR = br[i];
    lpL += 0.35 * (oL - lpL);
    lpR += 0.35 * (oR - lpR);
    bl[i] = (source.L[n] + source.R[n]) * 0.5 + lpR * feedback;
    br[i] = lpL * feedback;
    out.L[n] = oL;
    out.R[n] = oR;
    if (++i === length) i = 0;
  }
  return out;
}

// K-weighted power per sample (ITU-R BS.1770, at 48 kHz), summed over both channels.
function weighted(source) {
  const stages = [
    [
      [1.53512485958697, -2.69169618940638, 1.19839281085285],
      [-1.69065929318241, 0.73248077421585],
    ],
    [
      [1, -2, 1],
      [-1.99004745483398, 0.99007225036621],
    ],
  ];
  const length = source.L.length;
  const power = new Float64Array(length);
  for (const channel of [source.L, source.R]) {
    let x = channel;
    for (const [[b0, b1, b2], [a1, a2]] of stages) {
      const y = new Float64Array(length);
      let x1 = 0;
      let x2 = 0;
      let y1 = 0;
      let y2 = 0;
      for (let n = 0; n < length; n++) {
        const v = b0 * x[n] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1;
        x1 = x[n];
        y2 = y1;
        y1 = v;
        y[n] = v;
      }
      x = y;
    }
    for (let n = 0; n < length; n++) power[n] += x[n] * x[n];
  }
  return power;
}

const lufs = (z) => -0.691 + 10 * Math.log10(z);

// Integrated loudness: 400 ms blocks, both gates.
function loudness(source) {
  const power = weighted(source);
  const block = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const blocks = [];
  for (let s = 0; s + block <= power.length; s += hop) {
    let sum = 0;
    for (let n = s; n < s + block; n++) sum += power[n];
    blocks.push(sum / block);
  }
  const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const loud = blocks.filter((z) => lufs(z) > -70);
  if (!loud.length) return -Infinity;
  const relative = lufs(mean(loud)) - 10;
  return lufs(mean(loud.filter((z) => lufs(z) > relative)));
}

// The loudest 400 ms of a sound (momentary loudness), so a ringing sound is set to the level a
// listener hears rather than to its peak.
function momentary(sound) {
  const power = weighted(sound);
  const block = Math.round(0.4 * SR);
  let sum = 0;
  let most = 0;
  for (let n = 0; n < power.length + block; n++) {
    sum += n < power.length ? power[n] : 0;
    if (n >= block) sum -= power[n - block];
    most = Math.max(most, sum);
  }
  return lufs(most / block);
}

const level = (source, target) => scale(source, 10 ** ((target - loudness(source)) / 20));

function peak(source) {
  let p = 0;
  for (let n = 0; n < source.L.length; n++) {
    p = Math.max(p, Math.abs(source.L[n]), Math.abs(source.R[n]));
  }
  return p;
}

// Brickwall limiter with 3 ms of lookahead, so the loudest hits stay under the ceiling without
// clipping.
function limit(source, ceiling) {
  const ahead = Math.round(0.003 * SR);
  const release = Math.exp(-1 / (0.08 * SR));
  const need = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const p = Math.max(Math.abs(source.L[n]), Math.abs(source.R[n]));
    need[n] = p > ceiling ? ceiling / p : 1;
  }
  let g = 1;
  const window = [];
  for (let n = 0; n < N; n++) {
    // The smallest gain needed within the lookahead, reached by the time its peak arrives.
    const m = n + ahead < N ? need[n + ahead] : 1;
    while (window.length && window[window.length - 1] > m) window.pop();
    window.push(m);
    if (window.length > ahead) window.shift();
    const target = Math.min(...window);
    g = target < g ? g + (target - g) / ahead : target + (g - target) * release;
    source.L[n] *= Math.min(g, need[n]);
    source.R[n] *= Math.min(g, need[n]);
  }
}

function writeWav(file, source) {
  const bytes = N * 2 * 3;
  const out = Buffer.alloc(44 + bytes);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + bytes, 4);
  out.write('WAVEfmt ', 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 6, 28);
  out.writeUInt16LE(6, 32);
  out.writeUInt16LE(24, 34);
  out.write('data', 36);
  out.writeUInt32LE(bytes, 40);
  let o = 44;
  for (let n = 0; n < N; n++) {
    for (const v of [source.L[n], source.R[n]]) {
      out.writeIntLE(Math.round(Math.max(-1, Math.min(1, v)) * 8388607), o, 3);
      o += 3;
    }
  }
  fs.writeFileSync(path.join(OUT, file), out);
}

// --- Instruments -------------------------------------------------------------------------------

// Electric piano: two-operator FM, its brightness falling as the note rings, with a little tine.
function piano(f, length) {
  const decay = 0.5 + 1.4 * (220 / f) ** 0.5;
  return (t) => {
    const env = Math.min(1, t / 0.003) * Math.exp(-t / decay) * gate(t, length, 0.3);
    const index = 1.4 * Math.exp(-t / 0.3) + 0.2;
    const body = Math.sin(TAU * f * t + index * Math.sin(TAU * f * t));
    const tine = 0.1 * Math.exp(-t / 0.025) * Math.sin(TAU * f * 7 * t);
    return env * (body + tine);
  };
}

// Bell: a soft celesta, mostly fundamental.
function bell(f) {
  return (t) =>
    Math.min(1, t / 0.0015) *
    (Math.sin(TAU * f * t) * Math.exp(-t / 1.5) +
      0.28 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.5) +
      0.1 * Math.sin(TAU * 3 * f * t) * Math.exp(-t / 0.22) +
      0.04 * Math.sin(TAU * 5.1 * f * t) * Math.exp(-t / 0.07));
}

// Sub: a sine that swells in and out under each chord, with its octave so laptop speakers, which
// can't play the fundamental, still hint at it.
function sub(f, length) {
  return (t) =>
    (Math.sin(TAU * f * t) + 0.2 * Math.sin(2 * TAU * f * t)) *
    Math.min(1, t / 0.15) *
    gate(t, length, 0.5);
}

// Pad voice: a band-limited saw (polyBLEP); the pad's filter is applied to the whole bus.
function saw(f, length, phase) {
  let ph = phase;
  const dt = f / SR;
  return (t) => {
    ph += dt;
    if (ph >= 1) ph -= 1;
    let v = 2 * ph - 1;
    if (ph < dt) {
      const x = ph / dt;
      v -= x + x - x * x - 1;
    } else if (ph > 1 - dt) {
      const x = (ph - 1) / dt;
      v -= x * x + x + x + 1;
    }
    return v * Math.min(1, t / 0.9) * gate(t, length, 1.2);
  };
}

// --- The music ---------------------------------------------------------------------------------

// Harmony in the Clube da Esquina way: D as a modal centre held as a pedal under borrowed chords,
// sus chords standing as chords of their own, open voicings that mix fourths with close seconds, and
// parallel climbs (Toninho Horta's inner voices moving by step). Root is the bass (the sub plays it an
// octave up), keys the piano's and the pad's voicing, high the notes the arpeggio and the bell use.
const CHORDS = {
  Dmaj9: { root: 38, keys: [54, 57, 61, 64], high: [62, 64, 66, 69, 73] },
  Bm9: { root: 35, keys: [54, 57, 61, 62], high: [62, 66, 69, 71, 73] },
  'D9sus4 (C/D)': { root: 38, keys: [55, 57, 60, 64], high: [62, 64, 67, 69, 72] },
  'Bbmaj7#11/D': { root: 38, keys: [53, 57, 58, 64], high: [62, 65, 69, 70, 72] },
  'Gm6/D': { root: 38, keys: [55, 58, 62, 64], high: [62, 64, 67, 69, 70] },
  Em9: { root: 28, keys: [55, 59, 62, 66], high: [62, 64, 66, 67, 71] },
  'Fmaj7#11': { root: 29, keys: [57, 59, 60, 64], high: [64, 65, 67, 69, 72] },
  'Gmaj7#11': { root: 31, keys: [57, 59, 61, 66], high: [62, 66, 67, 69, 71] },
  A9sus4: { root: 33, keys: [59, 62, 64, 67], high: [62, 64, 67, 69, 71] },
  'Bbmaj7#11': { root: 34, keys: [57, 58, 62, 64], high: [62, 65, 69, 70, 72] },
};
// The intro's two chords a bar each. Then, over a D pedal, the major chord darkens through chords
// borrowed from D minor (C, Bb, Gm: I-bVII-bVI-iv) and comes home. Halfway, the bass climbs
// E-F-G-A under parallel chords, and bVI-I closes on the end card. Two bars a chord, so it breathes.
const PLAN = [
  ['Dmaj9', 'Bm9'],
  ...[
    'D9sus4 (C/D)',
    'Bbmaj7#11/D',
    'Gm6/D',
    'Dmaj9',
    'Em9',
    'Fmaj7#11',
    'Gmaj7#11',
    'A9sus4',
    'Bbmaj7#11',
  ].map((c) => [c, c]),
  ['Dmaj9'],
].flat();
const BARS = 20; // then the final chord, on the end card

// The arpeggio, sparse so the echoes fill the gaps: sixteenth, tone, velocity. It thickens a
// little halfway through.
const SPARSE = [
  [0, 0, 1],
  [6, 2, 0.6],
  [8, 3, 0.8],
  [14, 1, 0.55],
];
const FULLER = [
  [0, 0, 1],
  [3, 2, 0.5],
  [6, 1, 0.6],
  [8, 3, 0.8],
  [11, 4, 0.5],
  [14, 2, 0.6],
];
// The bell's tune, a line a bar repeating every four bars, in tones of the chord under it (so it
// follows the borrowed chords): beat, tone, beats.
const TUNE = [
  [
    [0, 4, 1.5],
    [1.5, 3, 1],
    [2.5, 1, 1.5],
  ],
  [
    [0.5, 0, 0.5],
    [1, 1, 1],
    [2, 2, 2],
  ],
  [
    [0, 4, 1.5],
    [1.5, 3, 1],
    [3, 2, 1],
  ],
  [
    [0, 1, 1],
    [1, 3, 3],
  ],
];
// Rising sparkle under the title's and the end card's icon.
const FLOURISH = [74, 78, 81, 85, 86];

function music() {
  const rng = random(7);
  const parts = { piano: bus(), arp: bus(), bell: bus(), sub: bus(), pad: bus(), swell: bus() };
  const s16 = (bar, sixteenth) => beat(bar * 4) + sixteenth * SIXTEENTH;

  for (let bar = 0; bar <= BARS; bar++) {
    const chord = CHORDS[PLAN[bar]];
    const intro = bar < 2;
    const last = bar === BARS;
    const lift = bar >= 10 && !last;
    // The last beat before the end card is a breath: only the pad and the swell.
    const playing = (sixteenth) => !(bar === BARS - 1 && sixteenth >= 12);
    const barLength = last ? LENGTH - beat(bar * 4) : 4 * BEAT;
    // How long this chord lasts from here, when it starts on this bar.
    const starts = bar === 0 || PLAN[bar - 1] !== PLAN[bar];
    let bars = 1;
    while (bar + bars < BARS && PLAN[bar + bars] === PLAN[bar]) bars++;
    const chordLength = last ? barLength : bars * 4 * BEAT;

    for (const [i, note] of chord.keys.entries()) {
      if (starts) {
        for (const [v, cents] of [-8, 0, 8].entries()) {
          place(
            parts.pad,
            beat(bar * 4),
            chordLength + 1.4,
            0.2,
            [-0.6, 0, 0.6][v],
            saw(hz(note + cents / 100), chordLength, rng()),
          );
        }
      }
      // The chord, rolled a little, as the intro plays it; softer on its second bar, and struck
      // again gently halfway through each bar.
      place(
        parts.piano,
        beat(bar * 4) + i * 0.014,
        barLength + 0.4,
        intro || last ? 0.5 : starts ? 0.42 : 0.3,
        0,
        piano(hz(note), barLength),
      );
      if (!intro && !last && playing(8)) {
        const half = 2 * BEAT;
        place(parts.piano, s16(bar, 8) + i * 0.02, half + 0.4, 0.22, 0, piano(hz(note), half));
      }
    }
    if (last || bar === 0) {
      FLOURISH.forEach((note, i) =>
        place(parts.bell, s16(bar, i), 2.5, 0.6 + 0.08 * i, -0.3 + 0.15 * i, bell(hz(note))),
      );
    }
    // The sub holds each bass note for as long as it stays: across the whole pedal.
    if (!intro && (bar === 2 || CHORDS[PLAN[bar - 1]].root !== chord.root)) {
      let held = 1;
      while (bar + held < BARS && CHORDS[PLAN[bar + held]].root === chord.root) held++;
      const breath = bar + held === BARS ? BEAT : 0;
      const length = (last ? barLength : held * 4 * BEAT) - breath;
      place(parts.sub, beat(bar * 4), length + 0.5, 1, 0, sub(hz(chord.root + 12), length));
    }
    if (intro || last) continue;

    for (const [sixteenth, tone, velocity] of lift ? FULLER : SPARSE) {
      if (!playing(sixteenth)) continue;
      place(
        parts.arp,
        s16(bar, sixteenth),
        1.6,
        velocity,
        tone % 2 ? 0.4 : -0.4,
        piano(hz(chord.high[tone] + 12), SIXTEENTH),
      );
    }
    if (lift) {
      for (const [b, tone, beats] of TUNE[bar % 4]) {
        const note = chord.high[tone] + 12;
        place(parts.bell, beat(bar * 4 + b), beats * BEAT + 2, 0.7, 0.15, bell(hz(note)));
      }
    }
  }

  // A soft swell of air over the last two bars, into the end chord.
  const riseFrom = beat((BARS - 2) * 4);
  const riseTo = beat(BARS * 4);
  place(parts.swell, riseFrom, riseTo - riseFrom, 1, 0, (t) => {
    const k = t / (riseTo - riseFrom);
    return (rng() * 2 - 1) * k ** 3 * Math.min(1, (1 - k) * 40);
  });
  filter(parts.swell, 'low', (t) => {
    const k = Math.min(1, Math.max(0, (t - riseFrom) / (riseTo - riseFrom)));
    return 250 * (3500 / 250) ** k;
  });

  // The pad stays dark and opens a little as the music grows.
  const opening = [
    [0, 600],
    [beat(8), 850],
    [beat(40), 1200],
    [beat(72), 1700],
    [beat(80), 1900],
    [LENGTH, 1000],
  ];
  filter(parts.pad, 'low', (t) => {
    let i = 1;
    while (i < opening.length - 1 && opening[i][0] < t) i++;
    const [t0, f0] = opening[i - 1];
    const [t1, f1] = opening[i];
    return f0 + (f1 - f0) * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  });
  filter(parts.arp, 'high', 300);

  // A slow auto-pan, like a Rhodes' tremolo.
  for (let n = 0; n < N; n++) {
    const w = 0.12 * Math.sin((TAU * 2.4 * n) / SR);
    parts.piano.L[n] *= 1 + w;
    parts.piano.R[n] *= 1 - w;
  }

  // Each part at a level relative to the others, in LUFS.
  const LEVELS = { piano: -21, arp: -26, bell: -25, pad: -23, sub: -26, swell: -33 };
  for (const [name, target] of Object.entries(LEVELS)) level(parts[name], target);

  const dry = bus();
  for (const p of Object.values(parts)) mix(dry, p);
  const sends = bus();
  const SEND = { piano: 0.35, arp: 0.5, bell: 0.6, pad: 0.4, swell: 0.4 };
  for (const [name, amount] of Object.entries(SEND)) mix(sends, parts[name], amount);
  const delays = bus();
  mix(delays, parts.arp, 0.35);
  mix(delays, parts.bell, 0.4);
  mix(delays, parts.piano, 0.08);

  // A big, dark room and dotted-eighth echoes: most of the ambience.
  const dryLevel = loudness(dry);
  const wet = level(reverb(sends, { room: 0.9, damp: 0.45, predelay: 0.03 }), dryLevel - 5);
  const repeats = level(echo(delays, 0.75 * BEAT, 0.45), dryLevel - 10);
  const out = bus();
  mix(out, dry);
  mix(out, wet);
  mix(out, repeats);
  // Below 35 Hz laptops and phones play nothing; it would only spend headroom.
  filter(out, 'high', 35);
  // A gentle dip around 3 kHz leaves room for the clicks and keys, which live there.
  mix(out, filter(copy(out), 'band', 3200, 0.8), -0.35);

  // Fade the last half second, so the reverb doesn't stop dead on the last frame.
  const fade = Math.round(0.5 * SR);
  for (let i = 0; i < fade; i++) {
    const g = (1 - i / fade) ** 2;
    out.L[N - fade + i] *= g;
    out.R[N - fade + i] *= g;
  }
  return out;
}

// --- Interface sounds --------------------------------------------------------------------------
// Two families only: clicks (and keys) and one chime. Transitions and the zoom stay silent: whooshes
// over them sounded cheap, and the picture already says what's happening.

// Renders a mono voice into a short stereo sound.
function render(seconds, voice, pan = 0) {
  const b = bus(Math.round(seconds * SR));
  place(b, 0, seconds, 1, pan, voice);
  return b;
}

// One edge of a switch: a broadband snap and the plastic's few resonances, each gone within a few
// milliseconds, so it reads as a click and not as a pitch.
function snap(rng, modes, pitch, noise, body) {
  const ringing = modes.map(([f, decay, amp]) => [
    f * pitch * (0.97 + 0.06 * rng()),
    decay,
    amp,
    TAU * rng(),
  ]);
  return (t) => {
    let v = noise * (rng() * 2 - 1) * Math.exp(-t / 0.0012);
    for (const [f, decay, amp, phase] of ringing) {
      v += amp * Math.sin(TAU * f * t + phase) * Math.exp(-t / decay);
    }
    return v + body[1] * Math.sin(TAU * body[0] * t) * Math.exp(-t / 0.006);
  };
}

// Resonances (Hz, decay in seconds, level) of a mouse button and of a laptop key.
const MOUSE = [
  [1850, 0.004, 0.5],
  [3300, 0.003, 0.7],
  [5200, 0.002, 0.6],
  [7900, 0.0015, 0.4],
];
const KEY = [
  [1200, 0.006, 0.5],
  [2500, 0.004, 0.6],
  [4100, 0.003, 0.4],
];

// A press and its release: the release quieter and a little higher, as a real button sounds.
function press(rng, modes, { pitch = 1, gap = 0.075, release = 0.45, body = [140, 0.25] } = {}) {
  const down = snap(rng, modes, pitch, 0.6, body);
  const up = snap(rng, modes, pitch * 1.08, 0.6, [body[0], body[1] * 0.5]);
  const sound = render(gap + 0.04, (t) => down(t) + (t >= gap ? release * up(t - gap) : 0));
  // Nothing below 120 Hz: a UI sound needs no rumble.
  return filter(sound, 'high', 120);
}

function sfx() {
  const rng = random(11);
  const out = bus();
  const room = bus();
  // Places a sound at a time, at a loudness relative to the music or at a peak, varied a little each
  // time so repeats don't sound copied.
  const put = (time, sound, { above, peakDb, reverbSend = 0 }) => {
    const vary = (rng() - 0.5) * 2;
    const gain =
      peakDb === undefined
        ? 10 ** ((MUSIC + above + vary - momentary(sound)) / 20)
        : 10 ** ((peakDb + vary) / 20) / peak(sound);
    mix(out, sound, gain, time);
    if (reverbSend) mix(room, sound, gain * reverbSend, time);
  };

  // Pointer clicks, a frame before the ripple, as the pointer is still squashing down.
  for (const t of [
    at('spotlight', 1.85),
    at('links', 1.85),
    at('timer', 2.05),
    at('timer', 2.95),
  ]) {
    put(t - FRAME, press(rng, MOUSE, { pitch: 0.96 + 0.08 * rng() }), { peakDb: PEAK.click });
  }
  // The double click that selects the slide number: quick releases, the second click softer.
  put(at('live', 2.0) - FRAME, press(rng, MOUSE, { gap: 0.05 }), { peakDb: PEAK.click });
  put(at('live', 2.12) - FRAME, press(rng, MOUSE, { gap: 0.05, pitch: 1.03 }), {
    peakDb: PEAK.click - 2.5,
  });
  // Grabbing the zoomed slide and letting go: the button's two edges, apart.
  put(at('zoom', 3.5) - FRAME, press(rng, MOUSE, { pitch: 0.9, release: 0 }), {
    peakDb: PEAK.grab,
  });
  put(at('zoom', 4.9) - FRAME, press(rng, MOUSE, { pitch: 0.97, gap: 0.001, release: 0 }), {
    peakDb: PEAK.grab - 3,
  });

  // Keys: the arrow that turns the notes' page, then typing "129" into the editor.
  for (const t of [at('notes', 2.7), at('live', 2.55), at('live', 2.8), at('live', 3.05)]) {
    const sound = press(rng, KEY, {
      pitch: 0.95 + 0.1 * rng(),
      gap: 0.06,
      release: 0.35,
      body: [260, 0.3],
    });
    put(t - FRAME, sound, { peakDb: PEAK.key });
  }

  // The edit arriving in the slideshow: two quick bell notes rising, in the music's key.
  const chime = render(
    2.5,
    (t) => bell(hz(81))(t) + (t > 0.09 ? 0.85 * bell(hz(86))(t - 0.09) : 0),
    0.2,
  );
  put(at('live', 4.0), chime, { above: ABOVE.chime, reverbSend: 0.8 });

  mix(out, reverb(room, { room: 0.55, damp: 0.5, predelay: 0.015 }), 0.5);
  return out;
}

fs.mkdirSync(OUT, { recursive: true });
const m = level(music(), MUSIC);
const s = sfx();
const all = bus();
mix(all, m);
mix(all, s);
// AAC encoding adds up to a decibel between samples, so the ceiling leaves room for it.
limit(all, 10 ** (-2.5 / 20));
writeWav('music.wav', m);
writeWav('sfx.wav', s);
writeWav('mix.wav', all);
const db = (x) => (20 * Math.log10(x)).toFixed(1);
console.log(
  `music ${loudness(m).toFixed(1)} LUFS; sfx peak ${db(peak(s))} dBFS; ` +
    `mix ${loudness(all).toFixed(1)} LUFS, peak ${db(peak(all))} dBFS`,
);
