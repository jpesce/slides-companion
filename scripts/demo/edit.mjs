// Edits what record.mjs captured into the demo video, build/demo/slides-companion-demo.mp4.
// Made to look like Google's own product videos: the windows on Google's light surface, with rounded
// corners and Material's soft shadow, Google Sans, and what's pressed shown in a Material snackbar.
// The words and chips are drawn as web pages (overlays.html) and laid over the recording by ffmpeg.
//   node scripts/demo/edit.mjs
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../build/demo');
const RAW = path.join(ROOT, 'raw');
const WORK = path.join(ROOT, 'edit');
export const OUT = path.join(ROOT, 'slides-companion-demo.mp4');
// A lighter copy for the README: GitHub plays a video attached to it only up to 10 MB on a free plan.
export const OUT_README = path.join(ROOT, 'slides-companion-demo-readme.mp4');
const FPS = 30;
const SIZE = { width: 1920, height: 1080 };

const ffmpeg = (args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: 'inherit',
  });

// Where each window goes on screen, by how many windows the scene shows: as large as fits below the
// captions, which sit above the windows rather than over them. At the top, where the eye starts and
// away from the bottom edge, where video players draw their controls and subtitles.
const CAPTIONS = 128;
const BELOW_CAPTIONS = SIZE.height - CAPTIONS;
const top = (h) => CAPTIONS + Math.round((BELOW_CAPTIONS - h) / 2) - 8;
// Floating notes is a picture-in-picture window: over the slideshow's bottom right corner, where
// Chrome first puts it, under Chrome's own title bar (measured from Chrome on macOS, in points
// scaled with the window: 46 tall, 27 tall buttons).
const PIP = { width: 400, inset: 28, bar: 40 };
function layout(streams, pip) {
  if (pip) {
    const [main] = layout(streams.filter((s) => s.name !== pip));
    const s = streams.find((s) => s.name === pip);
    const width = PIP.width,
      height = even((s.height * PIP.width) / s.width);
    const floating = {
      ...s,
      x: main.x + main.width - PIP.inset - width,
      y: main.y + main.height - PIP.inset - height,
      width,
      height,
      bar: PIP.bar,
    };
    return streams.map((st) =>
      st.name === pip
        ? floating
        : { ...main, ...st, x: main.x, y: main.y, width: main.width, height: main.height },
    );
  }
  const gap = 40;
  if (streams.length === 1) {
    const [s] = streams;
    const scale = Math.min(1600 / s.width, 864 / s.height);
    const width = even(s.width * scale),
      height = even(s.height * scale);
    return [{ ...s, x: (SIZE.width - width) / 2, y: top(height), width, height }];
  }
  // Side by side, the same height, centred.
  const height = 760;
  const widths = streams.map((s) => even((s.width * height) / s.height));
  let total = widths.reduce((a, b) => a + b, 0) + gap * (streams.length - 1);
  const shrink = Math.min(1, 1800 / total);
  const h = even(height * shrink);
  const ws = widths.map((w) => even(w * shrink));
  total = ws.reduce((a, b) => a + b, 0) + gap * (streams.length - 1);
  let x = (SIZE.width - total) / 2;
  return streams.map((s, i) => {
    const placed = { ...s, x: Math.round(x), y: top(h), width: ws[i], height: h };
    x += ws[i] + gap;
    return placed;
  });
}
const even = (n) => Math.round(n / 2) * 2;

// The captured frames come when the page changes; this gives each its time on screen, at FPS, and
// zooms in where the recording asked to.
function streamClip(part, stream) {
  const scene = part.name,
    duration = part.duration;
  const dir = path.join(RAW, scene, stream.name);
  // Chrome can hand frames over slightly out of order.
  const frames = JSON.parse(fs.readFileSync(`${dir}.json`, 'utf8')).sort((a, b) => a.t - b.t);
  const lines = [];
  frames.forEach((frame, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : duration;
    if (next <= frame.t) return;
    lines.push(
      `file '${path.join(dir, frame.file)}'`,
      `duration ${(next - Math.max(0, frame.t)).toFixed(4)}`,
    );
  });
  lines.push(`file '${path.join(dir, frames.at(-1).file)}'`);
  const list = path.join(WORK, `${scene}-${stream.name}.txt`);
  fs.writeFileSync(list, lines.join('\n'));
  const out = path.join(WORK, `${scene}-${stream.name}.mp4`);
  const focus = (part.focus ?? []).filter((f) => f.stream === stream.name);
  const fit = focus.length
    ? zoompan(focus, stream, part.scale ?? 1)
    : `scale=${stream.width}:${stream.height}:flags=lanczos`;
  ffmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    list,
    '-vf',
    `fps=${FPS},${fit},format=yuv420p`,
    '-t',
    String(duration),
    '-c:v',
    'libx264',
    '-crf',
    '12',
    '-preset',
    'medium',
    out,
  ]);
  return out;
}

// A smooth zoom (and pan) to each box the recording focused on, and back out, as a camera would. It
// moves the visible frame's edges, not its centre, so an edge the box shares with the window (the
// top of presenter view, for the timer) stays put all the way in and out.
function zoompan(focus, stream, scale) {
  const D = 0.8; // seconds for each move
  // The source frames' size: what the window was captured at.
  const { sourceWidth: W, sourceHeight: H } = stream;
  const whole = { left: 0, top: 0, width: W };
  const target = (box) => {
    if (!box) return whole;
    const bw = box.width * scale,
      bh = box.height * scale;
    const z = Math.max(1, Math.min(2.4, W / bw, H / bh));
    const width = W / z,
      height = H / z;
    const clamp = (v, size, max) => Math.min(Math.max(v, 0), max - size);
    return {
      left: clamp((box.x + box.width / 2) * scale - width / 2, width, W),
      top: clamp((box.y + box.height / 2) * scale - height / 2, height, H),
      width,
    };
  };
  const terms = { left: [], top: [], width: [] };
  let previous = whole;
  for (const f of focus) {
    const next = target(f.box);
    const u = `clip((it-${f.t.toFixed(3)})/${D},0,1)`;
    const ease = `(${u})*(${u})*(3-2*(${u}))`;
    for (const key of Object.keys(terms)) {
      const change = next[key] - previous[key];
      if (Math.abs(change) > 1e-6) terms[key].push(`${change.toFixed(4)}*${ease}`);
    }
    previous = next;
  }
  const expr = (key) => [whole[key].toFixed(4), ...terms[key]].join('+');
  return `zoompan=z='${W}/(${expr('width')})':x='${expr('left')}':y='${expr('top')}':d=1:s=${stream.width}x${stream.height}:fps=${FPS}`;
}

// Draws the overlays (background with shadows, window masks, snackbars, title cards) as PNGs.
async function drawOverlays(jobs) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: SIZE });
  await page.goto(`file://${path.join(import.meta.dirname, 'overlays.html')}`);
  await page.evaluate(() => document.fonts.ready);
  for (const job of jobs) {
    await page.evaluate((job) => window.draw(job), job);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((img) => img.complete));
    await page.screenshot({
      path: job.out,
      omitBackground: true,
      ...(job.clip && { clip: job.clip }),
    });
  }
  await browser.close();
}

// A card of its own: the title at the start, the ending.
function cardClip(name, png, duration) {
  const out = path.join(WORK, `${name}.mp4`);
  ffmpeg([
    '-loop',
    '1',
    '-framerate',
    String(FPS),
    '-i',
    png,
    '-t',
    String(duration),
    '-vf',
    'format=yuv420p',
    '-c:v',
    'libx264',
    '-crf',
    '12',
    out,
  ]);
  return out;
}

function sceneClip(name, scene, windows, overlays) {
  const out = path.join(WORK, `${name}.mp4`);
  const inputs = ['-loop', '1', '-framerate', String(FPS), '-i', overlays.background];
  const filters = [];
  let last = '0:v';
  let input = 1;
  const still = (png) => {
    inputs.push('-loop', '1', '-framerate', String(FPS), '-i', png);
    return input++;
  };
  windows.forEach((w, i) => {
    if (overlays.frames[i]) {
      filters.push(`[${last}][${still(overlays.frames[i])}:v]overlay=0:0[f${i}]`);
      last = `f${i}`;
    }
    inputs.push('-i', w.clip);
    const video = input++;
    const mask = still(overlays.masks[i]);
    filters.push(
      `[${video}:v]format=rgba[v${i}]`,
      `[${mask}:v]format=gray[m${i}]`,
      `[v${i}][m${i}]alphamerge[w${i}]`,
    );
    filters.push(`[${last}][w${i}]overlay=${w.x}:${w.y}:shortest=0[b${i}]`);
    last = `b${i}`;
  });
  scene.captions.forEach((caption, i) => {
    const input = still(overlays.captions[i]);
    const fade = 0.2;
    const end = Math.min(caption.end ?? scene.duration, scene.duration);
    filters.push(
      `[${input}:v]format=rgba,fade=in:st=${caption.start}:d=${fade}:alpha=1,fade=out:st=${end - fade}:d=${fade}:alpha=1[c${i}]`,
      `[${last}][c${i}]overlay=0:0:enable='between(t,${caption.start},${end})'[o${i}]`,
    );
    last = `o${i}`;
  });
  filters.push(`[${last}]format=yuv420p[out]`);
  ffmpeg([
    ...inputs,
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[out]',
    '-t',
    String(scene.duration),
    '-r',
    String(FPS),
    '-c:v',
    'libx264',
    '-crf',
    '14',
    '-preset',
    'medium',
    out,
  ]);
  return out;
}

// One clip after another, each fading through Google's light surface.
function join(clips, durations) {
  const fade = 0.35;
  const inputs = clips.flatMap((clip) => ['-i', clip]);
  const filters = [];
  let last = '0:v';
  let offset = durations[0];
  for (let i = 1; i < clips.length; i++) {
    offset -= fade;
    filters.push(
      `[${last}][${i}:v]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(3)}[x${i}]`,
    );
    last = `x${i}`;
    offset += durations[i];
  }
  ffmpeg([
    ...inputs,
    '-filter_complex',
    filters.join(';') || 'null',
    '-map',
    clips.length > 1 ? `[${last}]` : '0:v',
    '-c:v',
    'libx264',
    '-crf',
    '18',
    '-preset',
    'slow',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    OUT,
  ]);
}

export async function edit() {
  const story = JSON.parse(fs.readFileSync(path.join(RAW, 'story.json'), 'utf8'));
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });

  const jobs = [];
  const plans = story.map((part, n) => {
    const name = `${String(n).padStart(2, '0')}-${part.name}`;
    if (part.card) {
      const png = path.join(WORK, `${name}.png`);
      jobs.push({ kind: 'card', ...part.card, out: png });
      return { name, part, png };
    }
    const windows = layout(part.streams, part.pip).map((w, i) => ({
      ...w,
      sourceWidth: part.streams[i].width,
      sourceHeight: part.streams[i].height,
    }));
    const background = path.join(WORK, `${name}-background.png`);
    jobs.push({ kind: 'background', windows: windows.filter((w) => !w.bar), out: background });
    const masks = windows.map((w, i) => {
      const out = path.join(WORK, `${name}-mask${i}.png`);
      jobs.push({
        kind: 'mask',
        window: w,
        out,
        clip: { x: w.x, y: w.y, width: w.width, height: w.height },
      });
      return out;
    });
    // A floating window's frame (its shadow and title bar) goes over the windows under it.
    const frames = windows.map((w, i) => {
      if (!w.bar) return null;
      const out = path.join(WORK, `${name}-frame${i}.png`);
      jobs.push({ kind: 'pip', window: w, out });
      return out;
    });
    const captions = part.captions.map((caption, i) => {
      const out = path.join(WORK, `${name}-caption${i}.png`);
      jobs.push({ kind: 'caption', caption, out });
      return out;
    });
    return { name, part, windows, overlays: { background, masks, frames, captions } };
  });
  await drawOverlays(jobs);

  const clips = [],
    durations = [];
  for (const plan of plans) {
    if (plan.png) {
      clips.push(cardClip(plan.name, plan.png, plan.part.duration));
    } else {
      const windows = plan.windows.map((w) => ({ ...w, clip: streamClip(plan.part, w) }));
      clips.push(sceneClip(plan.name, plan.part, windows, plan.overlays));
    }
    durations.push(plan.part.duration);
    console.log(`${plan.name}: ${plan.part.duration.toFixed(1)} s`);
  }
  join(clips, durations);
  ffmpeg([
    '-i',
    OUT,
    '-c:v',
    'libx264',
    '-crf',
    '26',
    '-preset',
    'slow',
    '-tune',
    'stillimage',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    OUT_README,
  ]);
  return OUT;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await edit();
  console.log(path.relative(process.cwd(), out));
}
