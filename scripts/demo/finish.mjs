// Puts the sound on the After Effects render and makes the two files STORE.md asks for:
// - build/demo/slides-companion-demo.mp4: the video for YouTube, with mix.wav from sound.mjs.
// - build/demo/slides-companion-demo-readme.mp4: a lighter copy for the README, since GitHub plays
//   videos up to 10 MB on a free plan.
// After Effects renders the main comp, "Slides Companion demo", to the picture alone; the sound is
// put on here, so a change to sound.mjs needs no new render.
//   node scripts/demo/finish.mjs [render.mp4]   (default build/demo/ae/slides-companion-demo-video.mp4)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEMO = path.resolve(import.meta.dirname, '../../build/demo');
const MIX = path.join(DEMO, 'audio', 'mix.wav');
const VIDEO = path.join(DEMO, 'slides-companion-demo.mp4');
const README = path.join(DEMO, 'slides-companion-demo-readme.mp4');
const README_LIMIT = 10 * 1024 * 1024;

const ffmpeg = (...args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

function main() {
  const render = path.resolve(
    process.argv[2] ?? path.join(DEMO, 'ae', 'slides-companion-demo-video.mp4'),
  );
  for (const file of [render, MIX])
    if (!fs.existsSync(file)) throw new Error(`${path.relative(process.cwd(), file)} is missing`);

  // The picture as After Effects encoded it; the sound in AAC, which YouTube and browsers play.
  ffmpeg(
    ...['-i', render, '-i', MIX, '-map', '0:v', '-map', '1:a'],
    ...['-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart'],
    VIDEO,
  );
  // 720p is sharp enough at the width GitHub shows a README, and keeps the file well under 10 MB.
  ffmpeg(
    ...['-i', VIDEO, '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow'],
    ...['-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'],
    README,
  );
  const size = fs.statSync(README).size;
  if (size > README_LIMIT)
    throw new Error(
      `${path.relative(process.cwd(), README)} is ${(size / 2 ** 20).toFixed(1)} MB, over GitHub's 10 MB`,
    );
  for (const file of [VIDEO, README])
    console.log(
      `${path.relative(process.cwd(), file)}: ${(fs.statSync(file).size / 2 ** 20).toFixed(1)} MB`,
    );
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
