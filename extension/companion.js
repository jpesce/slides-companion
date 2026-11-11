// The companion: our mascot, pinned to the top of Slides' side toolbar, whose eyes follow the
// mouse. His picture and where his eyes are come from companion-drawing.js (npm run brand).
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

  // Where a pupil sits, in the picture's units, when the mouse is (vx, vy) from its eye's centre: as
  // far that way as keeps a rim of white around it (DRAWING.margin), measured in the eye's own tilted
  // frame. Less far when the mouse is close, so he looks at it rather than past it, and a little
  // inward (`side`), which reads as attention.
  function pupilOffset(eye, vx, vy, side) {
    const distance = Math.hypot(vx, vy) || 1;
    const reach = Math.min(1, distance / (eye.rx * 2.5));
    const ux = (vx / distance) * reach + side * 0.28;
    const uy = (vy / distance) * reach;
    const tilt = (eye.tilt * Math.PI) / 180;
    const [cos, sin] = [Math.cos(tilt), Math.sin(tilt)];
    let lx = ux * cos + uy * sin;
    let ly = -ux * sin + uy * cos;
    const length = Math.hypot(lx, ly);
    if (length > 1) [lx, ly] = [lx / length, ly / length];
    // 0.93 allows for the eye's hand-drawn wobble denting its oval inward.
    lx *= Math.max(0, eye.rx * 0.93 - eye.r - DRAWING.margin);
    ly *= Math.max(0, eye.ry * 0.93 - eye.r - DRAWING.margin);
    return [lx * cos - ly * sin, lx * sin + ly * cos];
  }

  function followMouse(button) {
    const svg = button.querySelector('svg');
    const pupils = button.querySelectorAll('.slides-companion-pupil');
    const { x: viewX, y: viewY, size } = DRAWING.view;
    let mouseX = 0;
    let mouseY = 0;
    let pending = false;

    // Aim at the latest mouse position, at most once per frame.
    function render() {
      pending = false;
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const scale = rect.width / size;
      pupils.forEach((pupil, i) => {
        const eye = DRAWING.eyes[i];
        const vx = (mouseX - (rect.left + (eye.x - viewX) * scale)) / scale;
        const vy = (mouseY - (rect.top + (eye.y - viewY) * scale)) / scale;
        const [dx, dy] = pupilOffset(eye, vx, vy, i === 0 ? 1 : -1);
        pupil.setAttribute('cx', (eye.x + dx).toFixed(1));
        pupil.setAttribute('cy', (eye.y + dy).toFixed(1));
      });
    }

    document.addEventListener(
      'mousemove',
      (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
        if (pending) return;
        pending = true;
        requestAnimationFrame(render);
      },
      { passive: true },
    );
  }

  function mount(sideToolbar) {
    // A previous copy of this script (e.g. before an extension reload) may have left one behind.
    document.querySelector('.slides-companion-button')?.remove();
    const button = createCompanion();
    sideToolbar.insertBefore(button, sideToolbar.firstChild);
    followMouse(button);
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
