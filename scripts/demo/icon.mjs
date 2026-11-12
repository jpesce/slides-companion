// The icon on the video's first and last screens, animated: the companion peeks up from the tile's
// bottom edge as it arrives, then blinks, as he does in Slides' toolbar. On the last screen, his eyes
// go down to "Free in the Chrome Web Store" behind that blink (a blink hides a change of gaze, which
// is when the toolbar companion blinks too). Frames go to build/demo/stills/icon/<screen>/, 60 a
// second, with transparency, for After Effects to put in place of a still icon.
//   node scripts/demo/icon.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { COMPANION } from '../build-brand.mjs';
import { STILLS } from './stills.mjs';

const FPS = 60;
// Twice the 128 px the tile shows at, so After Effects scales it down, never up.
const SIZE = 256;
// Each screen: how long it lasts, when the peek and the blink start (seconds), and where his pupils
// look after the blink, as shares of the room each has (null: where the icon draws them, looking up).
const SCREENS = {
  title: { duration: 2.6, peek: 0.3, blink: 1.45, look: null },
  end: {
    duration: 3.4,
    peek: 0.3,
    blink: 1.4,
    look: [
      [0.25, 0.85],
      [-0.15, 0.85],
    ],
  },
};
// How far below his place he starts, in the drawing's units: only the crown's hair shows.
const PEEK_FROM = 380;
// The peek is a spring that overshoots a touch, so he settles like the toolbar companion does.
const PEEK_SPRING = [11, 0.72];
// The blink, as the toolbar companion's (companion.js BLINK).
const BLINK = { close: 80, hold: 17, open: 180, lowerLag: 17 };
// His glance, as the toolbar companion's (companion.js SPRINGS.gaze).
const GAZE_SPRING = [40, 0.78];
// The icon draws his pupils this far inside the white, in the drawing's units.
const MARGIN = 14;

// How shut a blink's lids are, `t` milliseconds into it: 0 open, 1 shut (companion.js shut()).
function shut(t) {
  const { close, hold, open } = BLINK;
  if (t < 0 || t > close + hold + open) return 0;
  if (t < close) return (t / close) ** 2 * (3 - (2 * t) / close);
  if (t < close + hold) return 1;
  return (1 - (t - close - hold) / open) ** 3;
}

// The opening the lids leave, around the eye's centre (companion.js aperture(), without the
// squeeze): the upper edge arches over the eye and comes down onto the lower one as it rises.
function aperture(eye, blink, rise) {
  const lowerMiddle = 1.25 + (0.2 - 1.25) * 0.3 * rise;
  const lowerCurve = -0.15;
  const upperMiddle = -1.3 + (lowerMiddle + 1.3) * blink;
  const upperCurve = 0.32 + (lowerCurve - 0.32) * blink ** 2;
  const above = [];
  const below = [];
  for (let i = 0; i <= 24; i++) {
    const u = -Math.cos((Math.PI * i) / 24);
    const x = (eye.rx * 1.25 * u).toFixed(1);
    const yUpper = (upperMiddle + upperCurve * u * u) * eye.ry;
    const yLower = (lowerMiddle + lowerCurve * u * u) * eye.ry;
    above.push(`${x} ${yUpper.toFixed(1)}`);
    below.unshift(`${x} ${Math.max(yUpper, yLower).toFixed(1)}`);
  }
  return `M${above.join(' L')} L${below.join(' L')} Z`;
}

// A damped spring from 0 to 1, `t` seconds after it starts.
function spring([omega, zeta], t) {
  if (t <= 0) return 0;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return (
    1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
  );
}

// A pupil's offset from its eye's centre for a look given in shares of its room, in the eye's tilt.
function lookAt(eye, r, [sx, sy]) {
  const t = (eye.tilt * Math.PI) / 180;
  const [ax, ay] = [eye.rx * 0.93 - r - MARGIN, eye.ry * 0.93 - r - MARGIN];
  const n = Math.max(1, Math.hypot(sx, sy));
  const [lx, ly] = [(sx / n) * ax, (sy / n) * ay];
  return [lx * Math.cos(t) - ly * Math.sin(t), lx * Math.sin(t) + ly * Math.cos(t)];
}

// The icon's SVG with ids on what moves: the companion (body), each eye's lids and pupil.
function prepare(svg) {
  let eye = 0;
  return svg
    .replace(/(<g transform="[^"]+">)(<path)/, '$1<g id="body">$2')
    .replace(/<\/g><\/g><\/svg>/, '</g></g></g></svg>')
    .replace(/<path d="([^"]+)" fill="#fff"\/><circle /g, (_, d) => {
      const i = eye++;
      return `<clipPath id="lids-${i}"><path id="lid-${i}"/></clipPath><g clip-path="url(#lids-${i})"><path d="${d}" fill="#fff"/><circle id="pupil-${i}" `;
    })
    .replace(/(<circle id="pupil-\d"[^>]+\/>)/g, '$1</g>');
}

function frame(screen, t) {
  const { peek, blink, look } = SCREENS[screen];
  const rise = spring(PEEK_SPRING, t - peek);
  const ms = (t - blink) * 1000;
  const upper = shut(ms);
  const lower = shut(ms - BLINK.lowerLag);
  // His eyes start moving once the lids are nearly shut.
  const glance = look ? spring(GAZE_SPRING, t - blink - BLINK.close / 1000) : 0;
  const eyes = COMPANION.eyes.map((eye, i) => {
    const r = Math.min(eye.rx, eye.ry) * COMPANION.pupil;
    const rest = [eye.rest[0] * eye.rx, eye.rest[1] * eye.ry];
    const to = look ? lookAt(eye, r, look[i]) : rest;
    const at = rest.map((v, k) => v + (to[k] - v) * glance);
    return {
      lid: aperture(eye, upper, lower),
      clip: `translate(${eye.x} ${eye.y})`,
      cx: eye.x + at[0],
      // Pupils dip with a blink, as eyes roll down when the lids close.
      cy: eye.y + at[1] + 0.25 * eye.ry * upper,
    };
  });
  // He dips a touch as he blinks, from his base, as in the toolbar.
  const base = 805.9;
  const dip = 1 - 0.012 * upper;
  return {
    body: `translate(0 ${(PEEK_FROM * (1 - rise)).toFixed(2)}) translate(540 ${base}) scale(1 ${dip.toFixed(4)}) translate(-540 ${-base})`,
    eyes,
  };
}

async function main() {
  const svg = prepare(
    fs.readFileSync(path.resolve(import.meta.dirname, '../../brand/icon.svg'), 'utf8'),
  );
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${SIZE}px;height:${SIZE}px}</style>${svg}`,
  );
  for (const screen of Object.keys(SCREENS)) {
    const dir = path.join(STILLS, 'icon', screen);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const frames = Math.round(SCREENS[screen].duration * FPS);
    for (let n = 0; n < frames; n++) {
      await page.evaluate(
        (f) => {
          document.getElementById('body').setAttribute('transform', f.body);
          f.eyes.forEach((eye, i) => {
            const lid = document.getElementById(`lid-${i}`);
            lid.setAttribute('d', eye.lid);
            lid.setAttribute('transform', eye.clip);
            const pupil = document.getElementById(`pupil-${i}`);
            pupil.setAttribute('cx', eye.cx.toFixed(1));
            pupil.setAttribute('cy', eye.cy.toFixed(1));
          });
        },
        frame(screen, n / FPS),
      );
      await page.screenshot({
        path: path.join(dir, `${String(n).padStart(4, '0')}.png`),
        omitBackground: true,
      });
    }
    console.log(`${frames} frames in ${path.relative(process.cwd(), dir)}`);
  }
  await browser.close();
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) await main();
