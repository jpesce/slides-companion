// Draws the illustration at the top of each feature's page in Settings and writes them to
// extension/illustrations.js (`npm run illustrations`). The style comes from Android Settings'
// illustration frame, a slide drawn as Android draws a screen (an outline and
// simple blocks), one accent, and moves on Material's and Android's curves. Each is an SVG
// animation (SMIL) that loops and ends as it starts.
import fs from 'node:fs';

const OUT = new URL('../extension/illustrations.js', import.meta.url);
// The frame is 176 tall, cropped 2px off the top and bottom of a 180 drawing, so the tallest page
// fits a dialog as tall as Meet's Settings (650px).
const W = 495, H = 180;
// The loop's length in seconds; a scene can set its own.
let T = 6;

// Material's curves (m3.material.io), and the After Effects "easy ease" Android's own Settings
// animations use for moves.
const HOLD = '0 0 1 1';
const EASY = '0.33 0 0.67 1';
const DECEL = '0.05 0.7 0.1 1';
const ACCEL = '0.3 0 0.8 0.15';
const STD_ACCEL = '0.3 0 1 1';
const FADE_IN = '0 0 0.2 1'; // Material fade, enter (the spotlight's stage)
const FADE_OUT = '0.4 0 1 1'; // Material fade, exit
const DISSOLVE = '0.4 0 0.2 1'; // the live edit's dissolve

// A curve, as CSS's cubic-bezier: the progress at a fraction of the time.
const ease = (x1, y1, x2, y2) => (x) => {
  let lo = 0, hi = 1, t = x;
  for (let i = 0; i < 30; i++) {
    t = (lo + hi) / 2;
    if (3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3 < x) lo = t;
    else hi = t;
  }
  return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3;
};

const kt = (ts) => ts.map((x) => (x / T).toFixed(4)).join(';');
const loop = () => `dur="${T}s" repeatCount="indefinite"`;
// Values and times pair up, with one curve for each step between them.
const anim = (attr, values, times, curves) =>
  `<animate attributeName="${attr}" values="${values.join(';')}" keyTimes="${kt(times)}" calcMode="spline" keySplines="${curves.join(';')}" ${loop()}/>`;
const step = (attr, values, times) =>
  `<animate attributeName="${attr}" values="${values.join(';')}" keyTimes="${kt(times)}" calcMode="discrete" ${loop()}/>`;
const tf = (type, values, times, curves, sum = false) =>
  `<animateTransform attributeName="transform" type="${type}" values="${values.join(';')}" keyTimes="${kt(times)}" calcMode="spline" keySplines="${curves.join(';')}" ${loop()}${sum ? ' additive="sum"' : ''}/>`;
const motion = (path, points, times, curves) =>
  `<animateMotion path="${path}" keyPoints="${points.join(';')}" keyTimes="${kt(times)}" calcMode="spline" keySplines="${curves.join(';')}" ${loop()}/>`;
// Shown from one time to another, and hidden the rest of the loop.
const during = (from, to) =>
  from > 0 ? step('visibility', ['hidden', 'visible', 'hidden'], [0, from, to]) : step('visibility', ['visible', 'hidden'], [0, to]);

// Android Settings' illustration frame (28dp corners), in Slides' surface colour.
const frame = (id, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2 ${W} 176" width="${W}" height="176" class="slides-companion-dialog-illustration" aria-hidden="true">
  <defs><clipPath id="${id}-frame"><rect y="2" width="${W}" height="176" rx="28"/></clipPath></defs>
  <g clip-path="url(#${id}-frame)">
    <rect y="2" width="${W}" height="176" fill="#f0f4f9"/>
    ${body}
  </g>
</svg>`;

// A slide, in its own 241 × 135 space, drawn as Android draws a screen: an outline that keeps 2px
// at any size, and simple blocks.
const outline = () =>
  '<rect width="241" height="135" rx="12" fill="#fff" stroke="#c4c7c5" stroke-width="2" vector-effect="non-scaling-stroke"/>';
const bar = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;
const title = bar(129, 23, 90, 10, '#c4c7c5');
const line = (n, w) => bar(129, 53 + 12 * n, w, 6, '#e3e3e3');
// The photo: a sun over rounded hills, 96 × 104.
const photo = (id, rx = 8) => `<clipPath id="${id}"><rect width="96" height="104" rx="${rx}"/></clipPath>
    <g clip-path="url(#${id})"><rect width="96" height="104" fill="#d3e3fd"/><circle cx="68" cy="26" r="9" fill="#a8c7fa"/>
    <path d="M-8 112L32 62Q36 57 40 62L61 87L72 74Q76 69 80 74L104 104V112Z" fill="#a8c7fa"/></g>`;
// A wide photo: a sun over a rolling hill, 90 × 40.
const wide = (id, rx = 6) => `<clipPath id="${id}"><rect width="90" height="40" rx="${rx}"/></clipPath>
    <g clip-path="url(#${id})"><rect width="90" height="40" fill="#d3e3fd"/><circle cx="18" cy="13" r="6" fill="#a8c7fa"/>
    <path d="M0 40V30Q20 16 44 27Q66 37 90 22V40Z" fill="#a8c7fa"/></g>`;
const at = (x, y, s, body) => `<g transform="translate(${x} ${y})${s === 1 ? '' : ` scale(${s})`}">${body}</g>`;
const slide = (id, ...lines) => `${outline()}${at(15, 15, 1, photo(id))}${title}${lines.map((w, n) => line(n, w)).join('')}`;

// The length of a path of absolute M, Q and C commands, measured along 64 points of each curve.
const pathLength = (d) => {
  const numbers = (text) => text.trim().split(/[\s,]+/).map(Number);
  let length = 0, x = 0, y = 0;
  for (const [, command, args] of d.matchAll(/([MQC])([^MQC]*)/g)) {
    const n = numbers(args);
    if (command === 'M') {
      [x, y] = n;
      continue;
    }
    const points = command === 'Q' ? [[x, y], [n[0], n[1]], [n[2], n[3]]] : [[x, y], [n[0], n[1]], [n[2], n[3]], [n[4], n[5]]];
    const at = (t) => {
      let p = points;
      while (p.length > 1) p = p.slice(1).map(([px, py], i) => [p[i][0] + (px - p[i][0]) * t, p[i][1] + (py - p[i][1]) * t]);
      return p[0];
    };
    let [px, py] = [x, y];
    for (let i = 1; i <= 64; i++) {
      const [qx, qy] = at(i / 64);
      length += Math.hypot(qx - px, qy - py);
      [px, py] = [qx, qy];
    }
    [x, y] = points.at(-1);
  }
  return length;
};

// The pointer, as Chrome draws it (a little larger, to read at this size): white, outlined in
// near-black, with its hot spot at 0 0. Over something to click it's the pointing hand, and while
// dragging the slide, the grabbing hand.
const ARROW = 'M0 0V17L4.6 12.7L7.8 19.6L10.6 18.4L7.5 11.6H13.5Z';
const HAND = `<g transform="translate(-6.5 0)">
          <path d="M5 1.5Q5 0 6.5 0Q8 0 8 1.5V8Q8 7 9.25 7Q10.5 7 10.5 8.5Q10.5 7.5 11.75 7.5Q13 7.5 13 9Q13 8.3 14.1 8.3Q15.2 8.3 15.2 9.8V14Q15.2 19 10.5 19H8Q5.5 19 4 16.5L1.2 12.2Q0.6 11 1.6 10.4Q2.6 9.8 3.6 11L5 12.8Z"/>
          <path d="M10.5 8.5V11M13 9V11.3" fill="none"/></g>`;
const GRAB = `<g transform="translate(-8.5 -11)">
          <path d="M3.5 8Q3.5 6 5.25 6Q7 6 7 8Q7 5.5 8.75 5.5Q10.5 5.5 10.5 8Q10.5 6 12.25 6Q14 6 14 8Q14 6.8 15 6.8Q16 6.8 16 8.3V12.5Q16 18 10.5 18H9Q5.5 18 4 15.3L2 11.8Q1.4 10.6 2.5 10Q3.5 9.5 4.2 10.7L3.5 10Z"/>
          <path d="M7 8V10.5M10.5 8V10.5M14 8V10.5" fill="none"/></g>`;
// The pointer's journey. It rests at each stop, [x, y, arrive, leave], and moves between stops on
// an arc (in a straight line when a stop says 'line', as a drag does). The first stop is at 0s
// and the last lasts until the loop ends. `shapes` are [HAND or GRAB, from, to], the arrow
// otherwise; it presses in at each of `clicks`. `beside` moves with it, unpressed.
const cursor = (stops, shapes = [], clicks = [], beside = '') => {
  let d = `M${stops[0][0]} ${stops[0][1]}`;
  const lengths = [0];
  for (let i = 1; i < stops.length; i++) {
    const [x0, y0] = stops[i - 1], [x1, y1, , , how] = stops[i];
    const bend = how === 'line' ? 0 : 0.15;
    const cx = (x0 + x1) / 2 - (y1 - y0) * bend, cy = (y0 + y1) / 2 + (x1 - x0) * bend;
    const move = `M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`;
    d += move.slice(move.indexOf('Q'));
    lengths.push(lengths.at(-1) + pathLength(move));
  }
  const points = [], times = [], curves = [];
  stops.forEach(([, , arrive, leave], i) => {
    const p = (lengths[i] / lengths.at(-1)).toFixed(4);
    points.push(p, p);
    times.push(arrive, leave);
    curves.push(HOLD);
    if (i < stops.length - 1) curves.push(EASY);
  });
  const arrow = { values: ['visible'], times: [0] };
  for (const [, from, to] of shapes) {
    if (from > 0) arrow.values.push('hidden'), arrow.times.push(from);
    else arrow.values[0] = 'hidden';
    if (to < T) arrow.values.push('visible'), arrow.times.push(to);
  }
  const press = clicks.length
    ? tf('scale', [1, ...clicks.flatMap(() => [1, 0.85, 1]), 1], [0, ...clicks.flatMap((c) => [c, c + 0.08, c + 0.2]), T], [HOLD, ...clicks.flatMap(() => [EASY, EASY, HOLD])])
    : '';
  return `<g>
      ${motion(d, points, times, curves)}
      <g>${press}
        <g transform="scale(1.25)" fill="#fff" stroke="#1f1f1f" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">
          <path d="${ARROW}">${step('visibility', arrow.values, arrow.times)}</path>
          ${shapes.map(([shape, from, to]) => `<g visibility="hidden">${during(from, to)}${shape}</g>`).join('\n          ')}
        </g>
      </g>
      ${beside}
    </g>`;
};
// Where the pointer rests before and after, on the slide's lower right, clear of anything to click.
const REST = [330, 124];

// Spotlight's stage: black, with the bars in the stage's dark grey, and Close at the top right.
const closer = `<circle cx="458" cy="28" r="10" fill="#1f1f1f"/>
      <path d="M454 24L462 32M462 24L454 32" stroke="#e3e3e3" stroke-width="1.75" stroke-linecap="round"/>`;
const chevron = (x, dir) =>
  `<path d="M${x + 2 * dir} 160L${x - 2 * dir} 164L${x + 2 * dir} 168" fill="none" stroke="#e3e3e3" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`;
const stage = (from, to, body) => `<g opacity="0">
      ${anim('opacity', [0, 0, 1, 1, 0, 0], [0, from, from + 0.15, to, to + 0.075, T], [HOLD, FADE_IN, HOLD, FADE_OUT, HOLD])}
      <rect width="${W}" height="${H}" fill="#000"/>
      ${body}
      ${closer}
    </g>`;

// Each scene, and the moment it holds still on when motion is reduced.
const scenes = {};

// Spotlight: the pointer, on Close where the last loop left it, clicks a photo on the slide, which
// shows full screen on black. Next goes to the slide's other photo, and Close back to the slide.
{
  const open = 1.1, next = 2.5, close = 3.9;
  scenes.spotlight = { still: 1.8, svg: frame('spotlight', `
    <!-- The slide in the slideshow: a photo, a title, two lines and a wide photo. -->
    ${at(127, 23, 1, `${slide('spotlight-a', 84, 72)}${at(129, 81, 1, wide('spotlight-b'))}`)}
    <!-- The stage, with the photo fitted, and the bar to go from one photo to the next. -->
    ${stage(open, close, `<g visibility="hidden">${during(open, next)}${at(190.25, 22, 1.1923, photo('spotlight-a-stage', 8 / 1.1923))}</g>
      <g visibility="hidden">${during(next, T)}${at(108, 22, 3.1, wide('spotlight-b-stage', 8 / 3.1))}</g>
      <rect x="217.5" y="154" width="60" height="20" rx="10" fill="#1f1f1f"/>
      ${chevron(231, 1)}${chevron(264, -1)}${bar(240, 162, 15, 4, '#e3e3e3')}`)}
    ${cursor([[458, 28, 0, 0.25], [196, 96, 0.85, 1.35], [264, 164, 2.05, 2.6], [458, 28, 3.35, T]],
      [[HAND, 0.8, 1.15], [HAND, 2.0, 2.65], [HAND, 3.3, 3.95]], [open - 0.1, next - 0.1, close - 0.1])}`) };
}

// Links: the pointer, on Close where the last loop left it, clicks a link on the slide. Its page
// opens over the slide, on the stage, and scrolls under the pointer; Close comes back to the slide.
{
  const open = 1.1, close = 4.0;
  const page = `<clipPath id="links-page"><rect x="92" y="18" width="311" height="128" rx="8"/></clipPath>
      <rect x="92" y="18" width="311" height="128" rx="8" fill="#fff"/>
      <g clip-path="url(#links-page)"><g>
        ${tf('translate', ['0 0', '0 0', '0 -46', '0 -46'], [0, 2.1, 2.9, T], [HOLD, EASY, HOLD])}
        <rect x="92" y="18" width="311" height="22" fill="#f0f4f9"/>
        ${bar(104, 26, 40, 6, '#c4c7c5')}${bar(318, 27, 22, 4, '#c4c7c5')}${bar(346, 27, 22, 4, '#c4c7c5')}${bar(374, 27, 18, 4, '#c4c7c5')}
        ${bar(104, 54, 120, 10, '#c4c7c5')}${bar(104, 76, 130, 6, '#e3e3e3')}${bar(104, 88, 116, 6, '#e3e3e3')}${bar(104, 100, 124, 6, '#e3e3e3')}
        <rect x="250" y="54" width="141" height="80" rx="8" fill="#d3e3fd"/>
        <circle cx="342" cy="78" r="10" fill="#a8c7fa"/>
        ${bar(104, 148, 287, 6, '#e3e3e3')}${bar(104, 160, 260, 6, '#e3e3e3')}${bar(104, 172, 274, 6, '#e3e3e3')}${bar(104, 184, 200, 6, '#e3e3e3')}
      </g></g>`;
  scenes.links = { still: 1.6, svg: frame('links', `
    <!-- The slide, with a link in Slides' link blue. -->
    ${at(127, 23, 1, `${slide('links-a', 84)}${bar(129, 65, 58, 6, '#0b57d0')}${line(2, 80)}`)}
    <!-- The stage: the page, the bar naming its site (and Open in new tab), and Close. -->
    ${stage(open, close, `${page}
      <rect x="197.5" y="154" width="100" height="20" rx="10" fill="#1f1f1f"/>
      <circle cx="210" cy="164" r="4" fill="#a8c7fa"/>${bar(219, 162, 46, 4, '#e3e3e3')}
      <path d="M281 160H277.5Q276 160 276 161.5V168.5Q276 170 277.5 170H284.5Q286 170 286 168.5V165M283 159H287V163M287 159L281.5 164.5" fill="none" stroke="#e3e3e3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`)}
    ${cursor([[458, 28, 0, 0.25], [278, 91, 0.85, 1.35], [300, 100, 1.7, 3.05], [458, 28, 3.55, T]],
      [[HAND, 0.8, 1.15], [HAND, 3.5, 4.05]], [open - 0.1, close - 0.1])}`) };
}

// Zoom & scroll: a mouse wheel beside the pointer rolls forward and the slide zooms in smoothly
// around the pointer; the hand drags the slide along to the title; the wheel rolls back and it
// zooms out.
{
  const IN = [1.2, 2.1], PAN = [2.5, 3.3], OUT = [3.6, 4.4], HELD = [2.35, 3.45];
  const standard = ease(0.2, 0, 0, 1), easy = ease(0.33, 0, 0.67, 1);
  const progress = (t, [from, to], curve) => curve(Math.min(1, Math.max(0, (t - from) / (to - from))));
  // The zoom at a time: in about the point under the pointer, (218, 72), which stays put; along
  // by the drag; out about the pointer's new place, (158, 72), kept within the slide as the real
  // zoom keeps it.
  const zoomAt = (t) => {
    if (t < OUT[0]) {
      const scale = 1 + progress(t, IN, standard);
      return { scale, x: 218 * (1 - scale) - 60 * progress(t, PAN, easy), y: 72 * (1 - scale) };
    }
    const scale = 2 - progress(t, OUT, standard);
    const x = Math.min(127 * (1 - scale), Math.max(368 * (1 - scale), 158 - 218 * scale));
    return { scale, x, y: 72 * (1 - scale) };
  };
  // Sampled 30 times a second, so the zoom follows these exactly.
  const frames = Array.from({ length: T * 30 + 1 }, (_, i) => i / 30);
  const zooms = frames.map(zoomAt);
  const sampled = (type, values, sum = false) =>
    `<animateTransform attributeName="transform" type="${type}" values="${values.join(';')}" keyTimes="${kt(frames)}" ${loop()}${sum ? ' additive="sum"' : ''}/>`;
  // The wheel, beside the pointer while it rolls: as a mouse draws it, in Slides' blue, with an
  // arrow the way it turns. Its ridges roll by as much as the zoom changes: forward to zoom in,
  // back to zoom out.
  const ridges = zooms.map(({ scale }) => `0 ${(-14 * Math.log2(scale)).toFixed(2)}`);
  const wheel = `<g transform="translate(26 6)" opacity="0">
        ${anim('opacity', [0, 0, 1, 1, 0, 0, 1, 1, 0, 0], [0, IN[0] - 0.15, IN[0], IN[1], IN[1] + 0.15, OUT[0] - 0.15, OUT[0], OUT[1], OUT[1] + 0.15, T], [HOLD, FADE_IN, HOLD, FADE_OUT, HOLD, FADE_IN, HOLD, FADE_OUT, HOLD])}
        <clipPath id="zoom-wheel"><rect x="-4.5" y="-8" width="9" height="16" rx="4.5"/></clipPath>
        <rect x="-4.5" y="-8" width="9" height="16" rx="4.5" fill="#fff" stroke="#0b57d0" stroke-width="2"/>
        <g clip-path="url(#zoom-wheel)"><g>${sampled('translate', ridges)}
          <path d="${Array.from({ length: 16 }, (_, i) => `M-2 ${-10 + 3.5 * i}H2`).join('')}" stroke="#0b57d0" stroke-width="1.5" stroke-linecap="round"/>
        </g></g>
        <path d="M-4 -12L0 -16L4 -12" fill="none" stroke="#0b57d0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" visibility="hidden">${during(IN[0] - 0.15, IN[1] + 0.15)}</path>
        <path d="M-4 12L0 16L4 12" fill="none" stroke="#0b57d0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" visibility="hidden">${during(OUT[0] - 0.15, OUT[1] + 0.15)}</path>
      </g>`;
  scenes.zoom = { still: 2.3, svg: frame('zoom', `
    <!-- The slide, zoomed inside the screen's outline. -->
    <clipPath id="zoom-screen"><rect x="127" y="23" width="241" height="135" rx="12"/></clipPath>
    <rect x="127" y="23" width="241" height="135" rx="12" fill="#fff"/>
    <g clip-path="url(#zoom-screen)"><g>
      ${sampled('translate', zooms.map(({ x, y }) => `${x.toFixed(2)} ${y.toFixed(2)}`))}
      ${sampled('scale', zooms.map(({ scale }) => scale.toFixed(4)), true)}
      ${at(127, 23, 1, slide('zoom-a', 84, 72, 80))}
    </g></g>
    <rect x="127" y="23" width="241" height="135" rx="12" fill="none" stroke="#c4c7c5" stroke-width="2"/>
    ${cursor([[...REST, 0, 0.3], [218, 72, 1.0, PAN[0]], [158, 72, PAN[1], 4.6, 'line'], [...REST, 5.3, T]], [[GRAB, ...HELD]], [], wheel)}`) };
}

// Pen: the pen's red dot appears, glides over to the picture, draws a loop round the sun, lifts and
// underlines the title, and moves back aside; a moment later Erase all clears it. The dot rides
// the ink: both share the strokes' paths, times and curve.
{
  // The pen's strokes and its moves between them, on arcs as Material moves things. The dot rests
  // on the slide's lower right before and after, so the loop starts where it ends.
  const ENTRY = 'M352 128Q300 130 230 52';
  const P1 = 'M230 52C220 43 196 44 189 57C182 70 192 82 209 83C226 84 235 74 233 61C231 51 223 46 214 46';
  const TRAVEL = 'M214 46Q240 30 254 64';
  const P2 = 'M254 64C278 67 318 64 348 61';
  const ASIDE = 'M348 61Q370 96 352 128';
  const parts = [ENTRY, P1, TRAVEL, P2, ASIDE];
  const lengths = parts.map(pathLength);
  const total = lengths.reduce((a, b) => a + b);
  let sum = 0;
  const k = lengths.slice(0, -1).map((x) => ((sum += x) / total).toFixed(4));
  const dot = ENTRY + parts.slice(1).map((d) => d.replace(/^M[\d.]+ [\d.]+/, '')).join('');
  const t = { dotIn: 0.3, dotFull: 0.5, glide: 0.7, arrive: 1.5, s1: 1.6, e1: 2.7, s2: 3.15, e2: 3.6, aside: 3.7, rest: 4.2, erase: 5.0, erased: 5.2, dotOut: 5.3, dotGone: 5.5 };
  // A stroke shows only once it starts: undrawn, its round cap would leave a dot at its start.
  const stroke = (d, start, end) => `<path d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" visibility="hidden">
        ${step('visibility', ['hidden', 'visible'], [0, start])}
        ${anim('stroke-dashoffset', [1, 1, 0, 0], [0, start, end, T], [HOLD, EASY, HOLD])}
      </path>`;
  scenes.pen = { still: 4.6, svg: frame('pen', `
    <!-- A slide in a slideshow. -->
    ${at(127, 23, 1, slide('pen-a', 84, 72, 80))}
    <!-- What the pen draws, in the colour and with the round ends of Slides' pen. -->
    <g fill="none" stroke="#fe5252" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      ${anim('opacity', [1, 1, 0, 0], [0, t.erase, t.erased, T], [HOLD, STD_ACCEL, HOLD])}
      ${stroke(P1, t.s1, t.e1)}
      ${stroke(P2, t.s2, t.e2)}
    </g>
    <!-- The pen's pointer: Slides shows a dot in the pen's colour. -->
    <g>
      ${motion(dot, [0, 0, k[0], k[0], k[1], k[2], k[3], k[3], 1, 1], [0, t.glide, t.arrive, t.s1, t.e1, t.s2, t.e2, t.aside, t.rest, T], [HOLD, EASY, HOLD, EASY, EASY, EASY, HOLD, EASY, HOLD])}
      <circle r="4.5" fill="#fe5252" transform="scale(0)">
        ${tf('scale', [0, 0, 1, 1, 0, 0], [0, t.dotIn, t.dotFull, t.dotOut, t.dotGone, T], [HOLD, DECEL, HOLD, ACCEL, HOLD])}
      </circle>
    </g>`) };
}

// Timer: presenter view's timer counts down from 15 minutes, its bar filling up under it. Time lapses
// to two minutes left, where it turns orange, then lapses to the end; the pointer clicks Reset and it
// starts again.
{
  T = 8;
  const easy = ease(0.33, 0, 0.67, 1);
  // A time lapse: the seconds race from one time to another, slow, fast, slow, 24 frames a second.
  const lapse = (from, to, start, end) => Array.from({ length: Math.round((end - start) * 24) }, (_, i) =>
    [Math.round(from - (from - to) * easy(i / ((end - start) * 24))), start + i / 24]);
  const RESET = 7.55;
  const ticks = [[900, 0], [899, 1.0], ...lapse(898, 121, 1.6, 3.0), [121, 3.0], [120, 3.6], [119, 4.6],
    ...lapse(118, 0, 5.4, 6.4), [0, 6.4], [900, RESET]].filter(([left], i, all) => i === 0 || left !== all[i - 1][0]);
  const format = (left) => [Math.floor(left / 3600), Math.floor(left / 60) % 60, left % 60].map((part) => String(part).padStart(2, '0')).join(':');
  const font = `font-family="'Google Sans Flex','Google Sans',Roboto,Arial,sans-serif" font-size="18" font-weight="500"`;
  // In Google's orange (the timer's own) from two minutes left, the timer's default.
  const time = ticks.map(([left, from], i) => {
    const to = ticks[i + 1]?.[1] ?? T;
    return `<text x="105" y="42" ${font} fill="${left <= 120 ? '#e37400' : '#1f1f1f'}" visibility="hidden">${during(from, to)}${format(left)}</text>`;
  }).join('\n    ');
  // The bar under the time (countdown.css): Slides' recording studio's, filling up as the time goes.
  const BAR = 190;
  const times = ticks.map(([, from]) => from);
  const fill = `<rect x="105" y="46" height="4" rx="2">
      ${step('width', ticks.map(([left]) => Math.round((BAR * (900 - left)) / 900)), times)}
      ${step('fill', ticks.map(([left]) => (left <= 120 ? '#e37400' : '#747775')), times)}
    </rect>`;
  scenes.timer = { still: 4.0, svg: frame('timer', `
    <!-- Presenter view: the timer and its buttons along the top, the slide and its notes below. -->
    <rect x="87" y="14" width="321" height="152" rx="12" fill="#fff" stroke="#c4c7c5" stroke-width="2"/>
    ${time}
    ${bar(105, 46, BAR, 4, '#dde3ea')}
    ${fill}
    <!-- Slides' Pause and Reset, as text buttons, then the timer's button. -->
    ${bar(200, 31, 30, 8, '#c4c7c5')}${bar(238, 31, 30, 8, '#c4c7c5')}
    <circle cx="285" cy="35" r="10" fill="#f0f4f9"/>
    <circle cx="285" cy="36" r="5" fill="none" stroke="#444746" stroke-width="1.5"/>
    <path d="M283 29.5H287M285 34V36.5" stroke="#444746" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M88 54H407" stroke="#e3e3e3" stroke-width="1"/>
    ${at(103, 68, 0.55, slide('timer-a', 84, 72, 80))}
    ${bar(252, 72, 140, 6, '#e3e3e3')}${bar(252, 84, 128, 6, '#e3e3e3')}${bar(252, 96, 136, 6, '#e3e3e3')}${bar(252, 108, 92, 6, '#e3e3e3')}
    <!-- The pointer, on Reset from the last loop, moves aside and comes back for it. -->
    ${cursor([[253, 35, 0, 0.6], [372, 140, 1.3, 6.6], [253, 35, 7.3, T]], [[HAND, 0, 0.65], [HAND, 7.25, T]], [RESET - 0.1])}`) };
  T = 6;
}

// Edits during a slideshow: a line is typed on the slide in the editor, and a moment later the
// slideshow's slide dissolves into its new version.
{
  const typed = [1.0, 1.2, 1.4, 1.6, 1.8], widths = [0, 16, 32, 48, 64, 80];
  const shown = 2.9, reset = 5.4;
  const typing = `<rect x="129" y="77" height="6" rx="3" fill="#c4c7c5" width="0">
        ${step('width', [...widths, 0], [0, ...typed, reset + 0.3])}
        ${anim('opacity', [1, 1, 0, 0], [0, reset, reset + 0.3, T], [HOLD, STD_ACCEL, HOLD])}
      </rect>
      <!-- The text cursor: steady while typing, then blinking. -->
      <rect y="72" width="3" height="16" fill="#0b57d0" x="129" visibility="hidden">
        ${step('x', [...widths.map((w) => 129 + w + 1), 129], [0, ...typed, reset])}
        ${step('visibility', ['hidden', 'visible', 'hidden', 'visible', 'hidden', 'visible', 'hidden'], [0, 0.6, 2.3, 2.8, 3.3, 3.8, 4.3])}
      </rect>`;
  scenes['live-edits'] = { still: 4.0, svg: frame('edits', `
    <!-- The editor: a toolbar, the slides down the side, and the slide being edited. -->
    <rect x="30" y="28" width="205" height="124" rx="12" fill="#fff" stroke="#c4c7c5" stroke-width="2"/>
    <path d="M31 46H234" stroke="#e3e3e3"/>
    ${bar(42, 34, 24, 6, '#c4c7c5')}${bar(72, 35, 18, 4, '#e3e3e3')}${bar(94, 35, 18, 4, '#e3e3e3')}${bar(116, 35, 18, 4, '#e3e3e3')}
    <rect x="40" y="56" width="22" height="13" rx="2" fill="#fff" stroke="#0b57d0" stroke-width="1.5"/>
    <rect x="40" y="76" width="22" height="13" rx="2" fill="#fff" stroke="#c4c7c5"/>
    <rect x="40" y="96" width="22" height="13" rx="2" fill="#fff" stroke="#c4c7c5"/>
    ${at(72, 61, 0.6473, `${slide('edits-a', 84, 72)}${typing}`)}
    <!-- The slideshow, drawn as the other scenes draw one: it dissolves into the new version. -->
    ${at(256, 33.5, 0.8714, `${slide('edits-b', 84, 72)}<g opacity="0">
      ${anim('opacity', [0, 0, 1, 1, 0, 0], [0, shown, shown + 0.5, reset, reset + 0.3, T], [HOLD, DISSOLVE, HOLD, STD_ACCEL, HOLD])}
      ${bar(129, 77, 80, 6, '#c4c7c5')}
    </g>`)}`) };
}

const quote = (svg) => `\`${svg.replace(/[`\\$]/g, (c) => `\\${c}`)}\``;
// Ids live in the page's document, so each takes the extension's name.
const named = (svg) => svg.replace(/id="([^"]+)"/g, 'id="slides-companion-illustration-$1"').replace(/url\(#([^)]+)\)/g, 'url(#slides-companion-illustration-$1)');
// The moment to hold still on goes with each, as data-still.
const markup = (svg, still) => named(svg).replace('<svg ', `<svg data-still="${still}" `);
fs.writeFileSync(OUT, `// Made by scripts/build-illustrations.mjs (npm run illustrations): change that, not this.
// The illustration at the top of each feature's page in Settings (settings-dialog.js), by feature.
globalThis.slidesCompanion ??= {};
globalThis.slidesCompanion.illustrations = {
${Object.entries(scenes).map(([id, { still, svg }]) => `  '${id}': ${quote(markup(svg, still))},`).join('\n')}
};
`);
console.log(`Wrote ${Object.keys(scenes).join(', ')} to extension/illustrations.js`);
