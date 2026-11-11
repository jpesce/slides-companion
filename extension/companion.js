// The companion: our mascot, pinned to the top of Slides' side toolbar, whose eyes follow the
// mouse, who blinks, and who squashes when pressed. His picture and where his eyes are come from
// companion-drawing.js (npm run brand).
{
  const DRAWING = globalThis.slidesCompanion.companionDrawing;

  // Slides shows its toolbar tooltips after about this long.
  const TOOLTIP_DELAY_MS = 300;

  function createCompanion() {
    const button = document.createElement('div');
    button.className = 'slides-companion-button';
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', globalThis.slidesCompanion.text('settingsLabel'));
    button.innerHTML = DRAWING.svg;

    const openSettings = () => {
      hideTooltip();
      globalThis.slidesCompanion.openSettings(button);
    };
    button.addEventListener('click', openSettings);
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      openSettings();
    });
    showTooltipOnHover(button);
    return button;
  }

  // Slides' tooltip manager only knows its own buttons, so we draw the same `jfk-tooltip`
  // (Slides' own styles) centred 1px below the button, as Slides does.
  let tooltip = null;
  let tooltipTimer = 0;

  function showTooltipOnHover(button) {
    button.addEventListener('mouseenter', () => {
      tooltipTimer = setTimeout(() => showTooltip(button), TOOLTIP_DELAY_MS);
    });
    button.addEventListener('mouseleave', hideTooltip);
    button.addEventListener('mousedown', hideTooltip);
  }

  function showTooltip(button) {
    hideTooltip();
    tooltip = document.createElement('div');
    tooltip.className = 'jfk-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    const content = document.createElement('div');
    content.className = 'jfk-tooltip-contentId';
    content.textContent = globalThis.slidesCompanion.text('settingsLabel');
    tooltip.append(content);
    document.body.append(tooltip);

    const anchor = button.getBoundingClientRect();
    const left = anchor.left + anchor.width / 2 - tooltip.offsetWidth / 2;
    tooltip.style.left = `${Math.max(4, Math.min(left, innerWidth - tooltip.offsetWidth - 4)) + scrollX}px`;
    tooltip.style.top = `${anchor.bottom + 1 + scrollY}px`;
  }

  function hideTooltip() {
    clearTimeout(tooltipTimer);
    tooltip?.remove();
    tooltip = null;
  }

  // ---- How he moves ----
  // His pupils follow the mouse; he blinks now and then, and when his gaze swings a long way (a
  // blink hides a change of gaze, as animators time one); pressed, he gives under the finger and
  // squeezes his eyes into happy arcs, and let go, he springs back past his shape and wobbles to rest, his face
  // settling a beat after his body. All of it is springs and timed blinks, stepped once a frame and
  // only while something is still moving. A spring carries on from wherever it is, at the speed
  // it's going, so a press that interrupts a bounce, or a glance in the middle of a blink, flows on
  // from it instead of jumping. Nothing moves but his pupils when the system asks for reduced
  // motion, and those jump straight to where they look.

  // A damped spring: `omega` is how quick it is (radians a second), `zeta` how much it overshoots
  // (1 doesn't, lower wobbles more).
  class Spring {
    constructor([omega, zeta], precision = 0.001) {
      this.x = 0;
      this.v = 0;
      this.target = 0;
      this.precision = precision;
      this.tune([omega, zeta]);
    }
    tune([omega, zeta]) {
      this.omega = omega;
      this.zeta = zeta;
    }
    step(dt) {
      const pull =
        -(this.omega ** 2) * (this.x - this.target) - 2 * this.zeta * this.omega * this.v;
      this.v += pull * dt;
      this.x += this.v * dt;
    }
    snap() {
      this.x = this.target;
      this.v = 0;
    }
    get resting() {
      return (
        Math.abs(this.x - this.target) < this.precision &&
        Math.abs(this.v) < this.precision * this.omega
      );
    }
  }

  const SPRINGS = {
    // A glance: quick, landing with the smallest overshoot.
    gaze: [40, 0.78],
    // Pressed: he gives at once, without bouncing.
    press: [46, 0.92],
    // Let go: back past his shape and a wobble or two, settled in about half a second.
    release: [23, 0.32],
    // His face rides inside his body a beat late, which reads as soft rather than rigid.
    face: [16, 0.42],
    // Pointed at, his pupils widen a little, as when something interests him.
    interest: [14, 1],
  };
  // How far he squashes when pressed (and, by the overshoot, stretches when let go): shorter and
  // wider in about the same area, from his base.
  const SQUASH = { y: 0.13, x: 0.09 };
  // A blink, timed as on an animator's chart: the upper lids shut in about five frames, stay shut
  // for one, and open slower, most of the way at once and then easing (a long half-open tail reads
  // as sleepy). The lower lids rise a little to meet them a frame behind. One blink in eight is a
  // double, the second starting before the eyes are fully open again.
  const BLINK = { close: 80, hold: 17, open: 180, lowerLag: 17, double: 0.125 };
  const BLINK_EVERY = [2600, 7200];
  // A glance that swings this far (radians), within this long, brings a blink, but not more often
  // than every `rest` milliseconds.
  const GLANCE = { angle: 1.75, within: 400, chance: 0.7, rest: 1400 };

  // How shut a blink's lids are, `t` milliseconds into it: 0 open, 1 shut.
  function shut(t) {
    const { close, hold, open } = BLINK;
    if (t < 0 || t > close + hold + open) return 0;
    if (t < close) return (t / close) ** 2 * (3 - (2 * t) / close);
    if (t < close + hold) return 1;
    return (1 - (t - close - hold) / open) ** 3;
  }

  // The opening an eye's lids leave, as a closed outline around the eye's centre, in the picture's
  // units. Each lid's edge is a curve, given by its middle and how far its corners dip, both as
  // shares of the eye's height: an upper lid's edge arches over the eyeball, a rising lower lid's
  // arches up into a smile. The lids move up and down the face, not along each eye's tilt: tilted,
  // the two shutting eyes made a worried face.
  //  - Open, both edges sit just outside the eye's hand-drawn wobble.
  //  - Blinking (`blink` the upper lid, `rise` the lower one), the upper edge comes down and takes
  //    the lower one's curve as it lands, so they meet all along.
  //  - Squeezed (`squeeze`, when he's pressed), both edges take the same strong arch a little apart:
  //    what's left of each eye is an arc, the ^ ^ of a happy face, with the pupils hidden.
  function aperture(eye, blink, rise, squeeze) {
    const meet = 0.2;
    const lowerMiddle = 1.25 + (meet - 1.25) * 0.3 * rise;
    const lowerCurve = -0.15;
    const upperMiddle = -1.3 + (lowerMiddle + 1.3) * blink;
    const upperCurve = 0.32 + (lowerCurve - 0.32) * blink ** 2;
    const toward = (from, to) => from + (to - from) * squeeze;
    const edges = [
      [toward(upperMiddle, -0.95), toward(upperCurve, 0.8)],
      [toward(lowerMiddle, -0.5), toward(lowerCurve, 0.8)],
    ];
    const above = [];
    const below = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 6 - 1;
      const x = (u * eye.rx * 1.25).toFixed(1);
      const [yUpper, yLower] = edges.map(([middle, curve]) => (middle + curve * u * u) * eye.ry);
      above.push(`${x} ${yUpper.toFixed(1)}`);
      below.unshift(`${x} ${Math.max(yUpper, yLower).toFixed(1)}`);
    }
    return `M${above.join(' L')} L${below.join(' L')} Z`;
  }

  // Where a pupil of radius `r` sits, in the picture's units, when the mouse is (vx, vy) from its
  // eye's centre: as far that way as keeps a rim of white around it (DRAWING.margin), measured in
  // the eye's own tilted frame. Less far when the mouse is close, so he looks at it rather than past
  // it, and a little inward (`side`), which reads as attention.
  function pupilOffset(eye, r, vx, vy, side) {
    const distance = Math.hypot(vx, vy) || 1;
    const reach = Math.min(1, distance / (eye.rx * 2.5));
    const toward = [(vx / distance) * reach + side * 0.28, (vy / distance) * reach];
    return keepInside(eye, r, toward, true);
  }

  // A pupil of radius `r` moved (x, y) from its eye's centre, kept inside the room it has, in the
  // eye's tilted frame. (x, y) is in the picture's units, or, `asShare`, in shares of that room.
  function keepInside(eye, r, [x, y], asShare) {
    const tilt = (eye.tilt * Math.PI) / 180;
    const [cos, sin] = [Math.cos(tilt), Math.sin(tilt)];
    // 0.93 allows for the eye's hand-drawn wobble denting its oval inward.
    const roomX = Math.max(0.01, eye.rx * 0.93 - r - DRAWING.margin);
    const roomY = Math.max(0.01, eye.ry * 0.93 - r - DRAWING.margin);
    let lx = x * cos + y * sin;
    let ly = -x * sin + y * cos;
    if (!asShare) [lx, ly] = [lx / roomX, ly / roomY];
    const length = Math.hypot(lx, ly);
    if (length > 1) [lx, ly] = [lx / length, ly / length];
    [lx, ly] = [lx * roomX, ly * roomY];
    return [lx * cos - ly * sin, lx * sin + ly * cos];
  }

  function animate(button) {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = button.querySelector('svg');
    const bodyGroup = svg.querySelector('.slides-companion-body');
    const faceGroup = svg.querySelector('.slides-companion-face');
    const eyeGroups = [...svg.querySelectorAll('.slides-companion-eye')];
    const pupils = [...svg.querySelectorAll('.slides-companion-pupil')];
    const { x: viewX, y: viewY, size } = DRAWING.view;
    const { base } = DRAWING;
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    // Each eye's lids: a clip path the shape of the opening they leave.
    const defs = document.createElementNS(SVG_NS, 'defs');
    const lids = DRAWING.eyes.map((eye, i) => {
      const clip = document.createElementNS(SVG_NS, 'clipPath');
      clip.id = `slides-companion-lids-${i}`;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('transform', `translate(${eye.x} ${eye.y})`);
      clip.append(path);
      defs.append(clip);
      eyeGroups[i]
        .querySelector('.slides-companion-lids')
        .setAttribute('clip-path', `url(#${clip.id})`);
      return path;
    });
    svg.prepend(defs);

    const gaze = DRAWING.eyes.map(() => [
      new Spring(SPRINGS.gaze, 0.05),
      new Spring(SPRINGS.gaze, 0.05),
    ]);
    const squash = new Spring(SPRINGS.press);
    const face = new Spring(SPRINGS.face);
    const interest = new Spring(SPRINGS.interest);
    const springs = [...gaze.flat(), squash, face, interest];
    let mouse = null;
    let moved = false;
    let blinks = [];
    let pressedAt = 0;
    let releaseTimer = 0;
    let lastBlink = -Infinity;

    // Lids and dips for the blinks under way at `now`.
    function blinking(now) {
      blinks = blinks.filter(
        (start) => now - start <= BLINK.close + BLINK.hold + BLINK.open + BLINK.lowerLag,
      );
      return {
        upper: Math.max(0, ...blinks.map((start) => shut(now - start))),
        lower: Math.max(0, ...blinks.map((start) => shut(now - start - BLINK.lowerLag))),
      };
    }

    function blink(now = performance.now()) {
      if (still.matches || pressedAt || now - lastBlink < 200) return;
      lastBlink = now;
      blinks.push(now);
      if (Math.random() < BLINK.double)
        blinks.push(now + BLINK.close + BLINK.hold + BLINK.open * 0.45);
      wake();
    }

    (function blinkNow() {
      const [least, most] = BLINK_EVERY;
      setTimeout(
        () => {
          if (!document.hidden && button.isConnected) blink();
          if (button.isConnected) blinkNow();
        },
        least + Math.random() * (most - least),
      );
    })();

    let frame = 0;
    let last = 0;
    function wake() {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function tick() {
      frame = 0;
      const now = performance.now();
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const scale = rect.width / size;
      const radius = (eye) => eye.r * (1 + 0.1 * interest.x);

      // Where each pupil wants to be.
      if (mouse) {
        if (moved) noticeGlance(now, rect);
        moved = false;
        DRAWING.eyes.forEach((eye, i) => {
          const vx = (mouse.x - (rect.left + (eye.x - viewX) * scale)) / scale;
          const vy = (mouse.y - (rect.top + (eye.y - viewY) * scale)) / scale;
          const [dx, dy] = pupilOffset(eye, radius(eye), vx, vy, i === 0 ? 1 : -1);
          [gaze[i][0].target, gaze[i][1].target] = [eye.x + dx, eye.y + dy];
        });
      }

      // Small steps keep the stiffest springs steady whatever the frame rate.
      if (still.matches) {
        springs.forEach((spring) => spring.snap());
        blinks = [];
      } else {
        const dt = Math.min(0.064, (now - last) / 1000);
        const steps = Math.ceil(dt / (1 / 240));
        for (let i = 0; i < steps; i++) {
          face.target = squash.x;
          springs.forEach((spring) => spring.step(dt / steps));
        }
      }
      last = now;

      const { upper, lower } = blinking(now);
      const s = squash.x;
      const squeeze = Math.min(1, Math.max(0, s));
      const stretch = Math.max(0, -s);
      // The body squashes from its base, and dips a touch as he blinks.
      const sx = 1 + SQUASH.x * s;
      const sy = 1 - SQUASH.y * s - 0.012 * upper;
      bodyGroup.setAttribute(
        'transform',
        `translate(${base.x} ${base.y}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-base.x} ${-base.y})`,
      );
      faceGroup.setAttribute(
        'transform',
        `translate(0 ${((face.x - s) * 26 + 6 * upper).toFixed(2)})`,
      );

      DRAWING.eyes.forEach((eye, i) => {
        // Stretched, his eyes widen a little, the way a face opens up in delight.
        const widen = 1 + 0.14 * stretch;
        eyeGroups[i].setAttribute(
          'transform',
          `translate(${eye.x} ${eye.y}) scale(${widen.toFixed(4)}) translate(${-eye.x} ${-eye.y})`,
        );
        lids[i].setAttribute('d', aperture(eye, upper, lower, squeeze));
        // Pupils dip with a blink, as eyes roll down when the lids close.
        const r = radius(eye);
        const at = [gaze[i][0].x - eye.x, gaze[i][1].x - eye.y + 0.25 * eye.ry * upper];
        const [dx, dy] = keepInside(eye, r, at, false);
        pupils[i].setAttribute('cx', (eye.x + dx).toFixed(1));
        pupils[i].setAttribute('cy', (eye.y + dy).toFixed(1));
        pupils[i].setAttribute('r', r.toFixed(1));
      });

      if (!still.matches && (blinks.length || springs.some((spring) => !spring.resting))) wake();
    }

    // The pupils start where they're drawn, at rest.
    DRAWING.eyes.forEach((eye, i) => {
      gaze[i][0].x = gaze[i][0].target = Number(pupils[i].getAttribute('cx'));
      gaze[i][1].x = gaze[i][1].target = Number(pupils[i].getAttribute('cy'));
    });
    tick();

    // A glance that swings far, measured from his face, brings a blink.
    let glance = null;
    function noticeGlance(now, rect) {
      const angle = Math.atan2(
        mouse.y - (rect.top + rect.height / 2),
        mouse.x - (rect.left + rect.width / 2),
      );
      if (!glance || now - glance.at > GLANCE.within) {
        glance = { angle, at: now };
        return;
      }
      const turn = Math.abs(
        Math.atan2(Math.sin(angle - glance.angle), Math.cos(angle - glance.angle)),
      );
      if (turn < GLANCE.angle) return;
      glance = { angle, at: now };
      if (now - lastBlink > GLANCE.rest && Math.random() < GLANCE.chance) blink(now);
    }

    document.addEventListener(
      'mousemove',
      (event) => {
        mouse = { x: event.clientX, y: event.clientY };
        moved = true;
        wake();
      },
      { passive: true },
    );

    function press() {
      if (still.matches) return;
      clearTimeout(releaseTimer);
      pressedAt = performance.now();
      blinks = [];
      squash.tune(SPRINGS.press);
      squash.target = 1;
      wake();
    }
    // A quick click still gets a full squash: the release waits until he's had time to give.
    function release() {
      if (!pressedAt) return;
      const wait = Math.max(0, pressedAt + 90 - performance.now());
      pressedAt = 0;
      releaseTimer = setTimeout(() => {
        squash.tune(SPRINGS.release);
        squash.target = 0;
        wake();
      }, wait);
    }
    button.addEventListener('pointerdown', (event) => {
      if (event.button === 0) press();
    });
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      press();
      release();
    });
    button.addEventListener('pointerenter', () => {
      interest.target = 1;
      wake();
    });
    button.addEventListener('pointerleave', () => {
      interest.target = 0;
      wake();
    });
  }

  function mount(sideToolbar) {
    // A previous copy of this script (e.g. before an extension reload) may have left one behind.
    document.querySelector('.slides-companion-button')?.remove();
    const button = createCompanion();
    sideToolbar.insertBefore(button, sideToolbar.firstChild);
    animate(button);
  }

  // The side toolbar may render after the content script runs.
  const existing = document.querySelector('#docs-side-toolbar');
  if (existing) {
    mount(existing);
  } else {
    const observer = new MutationObserver(() => {
      const sideToolbar = document.querySelector('#docs-side-toolbar');
      if (!sideToolbar) return;
      observer.disconnect();
      mount(sideToolbar);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
