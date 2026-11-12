// Prepares what record.mjs captured for the After Effects edit (build/demo/ae/): each window of each
// scene as a ProRes clip at the size it was captured, with no zoom, since After Effects moves the
// camera itself. Chrome's screencast sends a frame only when the page changes, so each frame is held
// until the next one.
//   node scripts/demo/ae.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../build/demo');
const RAW = path.join(ROOT, 'raw');
export const AE = path.join(ROOT, 'ae');
const FOOTAGE = path.join(AE, 'footage');
const FPS = 30;

function clip(scene, stream) {
  const dir = path.join(RAW, scene.name, stream.name);
  // Chrome can hand frames over slightly out of order.
  const frames = JSON.parse(fs.readFileSync(`${dir}.json`, 'utf8')).sort((a, b) => a.t - b.t);
  const lines = [];
  frames.forEach((frame, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : scene.duration;
    if (next <= frame.t) return;
    lines.push(
      `file '${path.join(dir, frame.file)}'`,
      `duration ${(next - Math.max(0, frame.t)).toFixed(4)}`,
    );
  });
  lines.push(`file '${path.join(dir, frames.at(-1).file)}'`);
  const list = path.join(FOOTAGE, `${scene.name}-${stream.name}.txt`);
  fs.writeFileSync(list, lines.join('\n'));
  const out = path.join(FOOTAGE, `${scene.name}-${stream.name}.mov`);
  // story.json gives the window's size, but a popup's page is shorter than its window (the title
  // bar), so the frames keep their own size: scaling to the window's would squash them.
  const [width, height] = execFileSync('ffprobe', [
    ...['-v', 'error', '-select_streams', 'v:0'],
    ...['-show_entries', 'stream=width,height', '-of', 'csv=p=0'],
    path.join(dir, frames[0].file),
  ])
    .toString()
    .trim()
    .split(',')
    .map((n) => Math.round(Number(n) / 2) * 2);
  execFileSync('ffmpeg', [
    ...['-hide_banner', '-loglevel', 'error', '-y'],
    ...['-f', 'concat', '-safe', '0', '-i', list],
    ...['-vf', `fps=${FPS},scale=${width}:${height}:flags=lanczos,setsar=1`],
    ...['-t', String(scene.duration)],
    // ProRes 422 LT: every frame stands alone, so After Effects scrubs it quickly.
    ...['-c:v', 'prores_ks', '-profile:v', '1', '-pix_fmt', 'yuv422p10le'],
    out,
  ]);
  fs.rmSync(list);
  return { out, width, height };
}

export function footage() {
  const story = JSON.parse(fs.readFileSync(path.join(RAW, 'story.json'), 'utf8'));
  fs.mkdirSync(FOOTAGE, { recursive: true });
  for (const scene of story) {
    if (scene.card) continue;
    for (const stream of scene.streams) {
      const { out, width, height } = clip(scene, stream);
      const name = path.relative(process.cwd(), out);
      console.log(`${name}: ${width}×${height}, ${scene.duration.toFixed(1)} s`);
      // Where the pointer was, for the edit to draw it (in CSS pixels: times scene.scale for the clip).
      const pointer = path.join(RAW, scene.name, `${stream.name}-pointer.json`);
      if (fs.existsSync(pointer)) fs.copyFileSync(pointer, out.replace(/\.mov$/, '-pointer.json'));
    }
  }
  fs.copyFileSync(path.join(RAW, 'story.json'), path.join(AE, 'story.json'));
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) footage();
