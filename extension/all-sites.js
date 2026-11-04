// The "Show every site over the slide" checkbox (card 56), in a frame of the Settings dialog
// (settings-dialog.js). Ticking it asks Chrome for access to every site right away, as Chrome asks
// only during a click; the dialog's Cancel gives it back. Unticking gives it back on OK.
{
  const ALL_SITES = { origins: ['*://*/*'] };
  const DIALOG_ORIGIN = 'https://docs.google.com';
  const box = document.querySelector('input');
  let granted = false;
  let grantedHere = false;
  let answered = false;

  const tell = (message) => parent.postMessage({ source: 'slides-companion-all-sites', ...message }, DIALOG_ORIGIN);

  chrome.permissions.contains(ALL_SITES).then((has) => {
    granted = has;
    box.checked = has;
  });

  box.addEventListener('change', async () => {
    if (!box.checked) return;
    try {
      granted = await chrome.permissions.request(ALL_SITES);
    } catch {
      granted = false;
    }
    grantedHere ||= granted;
    box.checked = granted;
  });

  // The dialog's answer: OK or Cancel, whichever comes first (OK closes the dialog too).
  window.addEventListener('message', (event) => {
    if (event.source !== parent || event.origin !== DIALOG_ORIGIN) return;
    if (event.data === 'focus') {
      document.documentElement.classList.add('slides-companion-tabbed');
      box.focus();
      return;
    }
    if (answered) return;
    answered = true;
    if (event.data === 'save' ? granted && !box.checked : grantedHere) chrome.permissions.remove(ALL_SITES);
  });

  // The dialog's keys: Esc cancels, Enter is OK, Tab goes on to its other controls.
  window.addEventListener('keydown', (event) => {
    if (!['Escape', 'Enter', 'Tab'].includes(event.key)) return;
    event.preventDefault();
    tell({ type: 'key', key: event.key, shiftKey: event.shiftKey });
  });
  window.addEventListener('mousedown', () => document.documentElement.classList.remove('slides-companion-tabbed'));
  window.addEventListener('blur', () => document.documentElement.classList.remove('slides-companion-tabbed'));

  new ResizeObserver(() => tell({ type: 'height', height: document.documentElement.scrollHeight })).observe(document.body);
}
