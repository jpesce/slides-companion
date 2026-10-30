// The companion: our logo, pinned to the top of Slides' side toolbar, whose eyes follow the mouse.
// Ported from Image Spotlight for Google Slides (feat/present-and-edit-mode).
{
  const LOGO_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" aria-hidden="true">
      <path d="M328.3 957c-48.83 0-97.74-13.16-141.46-38.04-43.45-24.74-79.76-59.9-105-101.7-24.22-40.1-37.66-85.88-38.87-132.4-1.32-50.94 11.43-102.28 37.9-152.61 42.55-80.91 91.06-160.38 137.97-237.24 8.78-14.39 17.56-28.77 26.3-43.16l.41-.67c4.7-7.74 9.39-15.49 14.07-23.23l.35-.59.38-.57c44.92-67.9 101.84-103.8 164.62-103.8 43.26 0 84.09 15.15 116.34 42.44 32.25-27.29 73.08-42.44 116.34-42.44 32.65 0 66.08 12.75 99.36 37.89 33.13 25.02 57.2 55.56 71.55 76.78l.63.94.57.98c5.75 9.89 12.04 20.64 19.25 32.88l.63 1.08c10.54 17.89 21.33 36.05 31.77 53.63 38.69 65.12 78.7 132.46 114.84 200.69 1.35 2.54 2.71 5.08 4.08 7.61 7.19 13.35 14.63 27.15 20.16 43.02 31.05 89.03 18.21 183.23-35.22 258.43-25.43 35.79-59.3 65.54-97.95 86.03-40.21 21.31-85.72 32.57-131.62 32.57h-.03c-20.26 0-40.84-2.16-61.15-6.41-37.1-7.77-71.99-23.28-103.69-46.1-18.15-13.06-35.25-28.52-51.13-46.19-.77.97-1.49 1.83-2.21 2.64-29.08 32.6-62.56 57.54-99.53 74.12-34.67 15.55-71.57 23.44-109.68 23.44Z"/>
      <path fill="#fff" d="M657.66 156c54.52 0 109.55 49.86 143.58 100.16 6.41 11.03 12.87 22.05 19.35 33.05.03.05.05.11.08.16h.01c49.63 84.26 100.78 167.77 146.43 253.94 7.98 15.06 16.59 29.85 22.24 46.04 58.86 168.78-66.25 333.16-233.66 333.16-17.71 0-35.91-1.84-54.4-5.71-67.94-14.22-121.48-56.62-161.1-112.12-.07-.01-.13-.02-.21-.02-4.53 0-22.43 27.57-27.12 32.83-54.02 60.57-120.2 86.52-184.57 86.52-167.84 0-323.32-176.54-218.22-376.39 49.96-95 107.57-186.9 163.61-279.19s.04-.07.06-.11c4.72-7.77 9.43-15.54 14.12-23.32 33.21-50.21 79.15-89 137.09-89 47.28 0 89.33 22.25 116.34 56.82C568.3 178.25 610.36 156 657.63 156m.03-66c-33.43 0-65.48 7.54-95.25 22.4-7.24 3.62-14.29 7.66-21.09 12.1-6.8-4.44-13.85-8.48-21.09-12.1C490.46 97.54 458.41 90 424.98 90c-41.02 0-79.91 12.64-115.6 37.56-24.02 16.77-46.21 38.96-66.14 66.11l-1.18-.27-9.36 15.41-.62.93-.71 1.18c-4.15 6.88-8.7 14.39-13.9 22.96l-.18.3c-.05.09-.11.18-.17.27l-.42.69c-8.64 14.22-17.47 28.69-26.01 42.69-47.18 77.3-95.98 157.23-139.02 239.07C22.55 572.28 8.52 629.08 9.99 685.73c.69 26.72 4.91 53.17 12.53 78.62 7.31 24.4 17.76 47.94 31.07 69.98 28.15 46.61 68.58 85.79 116.92 113.32 48.68 27.72 103.24 42.37 157.79 42.37 42.79 0 84.23-8.86 123.18-26.33 32.13-14.41 61.82-34.4 88.6-59.59 10.12 9.3 20.63 17.88 31.48 25.69 35.47 25.53 74.57 42.9 116.21 51.62 22.55 4.72 45.4 7.11 67.92 7.11 26.09 0 52.02-3.2 77.07-9.5a312.838 312.838 0 0 0 70.05-26.93c43.18-22.89 81.01-56.11 109.4-96.08 28.32-39.87 47.13-86.36 54.4-134.43 3.79-25.04 4.5-50.63 2.14-76.05-2.44-26.2-8.19-52.41-17.08-77.9-6.4-18.34-14.83-33.99-22.27-47.8-1.33-2.47-2.66-4.93-3.97-7.41-36.53-68.94-76.74-136.64-115.64-202.1-10.6-17.85-21.57-36.31-32.25-54.44l-.24-.41c-7.28-12.36-13.32-22.68-19-32.46l-1.14-1.96-1.01-1.49-5.48-9.3-.81.26c-16.13-22.48-40.56-51.48-72.96-75.95-17.51-13.23-35.56-23.68-53.63-31.07-21.89-8.95-43.97-13.49-65.62-13.49Z"/>
      <circle fill="#fff" cx="758.27" cy="673.85" r="149.64"/>
      <circle fill="#fff" cx="330.36" cy="673.85" r="149.64"/>
      <circle class="slides-companion-iris" cx="269.53" cy="673.79" r="69.74"/>
      <circle class="slides-companion-iris" cx="697.44" cy="673.79" r="69.74"/>
    </svg>`;

  // In SVG units (viewBox 0 0 1080 1080). Irises keep the logo's resting distance from the eye centre.
  const VIEWBOX = 1080;
  const EYE_CENTRES = [330.355, 758.265];
  const EYE_CY = 673.855;
  const IRIS_TRAVEL = 330.355 - 269.53;

  const LABEL = 'Slides Companion settings';
  // Slides shows its toolbar tooltips after about this long.
  const TOOLTIP_DELAY_MS = 300;

  function createCompanion() {
    const button = document.createElement('div');
    button.className = 'slides-companion-button';
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', LABEL);
    button.innerHTML = LOGO_SVG;

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
    content.textContent = LABEL;
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

  function followMouse(button) {
    const svg = button.querySelector('svg');
    const irises = button.querySelectorAll('.slides-companion-iris');
    let mouseX = 0;
    let mouseY = 0;
    let pending = false;

    // Aim at the latest mouse position, at most once per frame.
    function render() {
      pending = false;
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const scale = rect.width / VIEWBOX;
      irises.forEach((iris, i) => {
        const angle = Math.atan2(
          mouseY - (rect.top + EYE_CY * scale),
          mouseX - (rect.left + EYE_CENTRES[i] * scale),
        );
        iris.setAttribute('cx', EYE_CENTRES[i] + Math.cos(angle) * IRIS_TRAVEL);
        iris.setAttribute('cy', EYE_CY + Math.sin(angle) * IRIS_TRAVEL);
      });
    }

    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (pending) return;
      pending = true;
      requestAnimationFrame(render);
    }, { passive: true });
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
