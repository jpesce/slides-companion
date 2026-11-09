// The demo deck, "Slides Companion demo", as Google Slides API requests.
// It's built to look like Google made it: Slides' own layouts, Google Sans, and Material 3's baseline
// colours set in the theme (white slides, blue-grey cards, Google blue), with no branding of our own.
//
//   node scripts/demo/deck.mjs build          → the requests that build it, in one batch
//   node scripts/demo/deck.mjs notes ids.json → the speaker notes, given each slide's notes box id
//
// Build it in a new, empty presentation (one title slide, "p"). The pictures are public domain, from
// Wikimedia Commons; Slides fetches them from these addresses.
import fs from 'node:fs';

const EMU = 914400; // per inch; the slide is 10 x 5.625 in
const MASTER = 'simple-light-2';
const TITLE_ONLY_TITLE = 'p6_i0'; // the "Title only" layout's title
const FONT = 'Google Sans';

// Material 3's baseline, as Google's own apps use it, in the theme's slots.
const hex = (value) => {
  const n = parseInt(value, 16);
  return { red: (n >> 16) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
};
const THEME = {
  DARK1: '1F1F1F', // on surface
  LIGHT1: 'FFFFFF',
  DARK2: '444746', // on surface variant
  LIGHT2: 'F0F4F9', // surface container
  ACCENT1: '0B57D0', // primary
  ACCENT2: 'D3E3FD', // primary container
  ACCENT3: '041E49', // on primary container
  ACCENT4: '146C2E', // green
  ACCENT5: 'B3261E', // red
  ACCENT6: 'E37400', // orange
  HYPERLINK: '0B57D0',
  FOLLOWED_HYPERLINK: '0B57D0',
};
const theme = (slot) => ({ themeColor: slot });

const X = 0.5; // text boxes keep Slides' own inset, so their text starts at 0.6 in
const W = 9;
const box = (page, x, y, w, h) => ({
  pageObjectId: page,
  size: { width: { magnitude: Math.round(w * EMU), unit: 'EMU' }, height: { magnitude: Math.round(h * EMU), unit: 'EMU' } },
  transform: { scaleX: 1, scaleY: 1, translateX: Math.round(x * EMU), translateY: Math.round(y * EMU), unit: 'EMU' },
});

const style = (objectId, { size, color = 'DARK1', link, underline }, textRange = { type: 'ALL' }) => ({
  updateTextStyle: {
    objectId,
    textRange,
    style: {
      fontFamily: FONT,
      ...(size && { fontSize: { magnitude: size, unit: 'PT' } }),
      foregroundColor: { opaqueColor: theme(color) },
      ...(link && { link: { url: link } }),
      ...(underline !== undefined && { underline }),
    },
    fields: ['fontFamily', size && 'fontSize', 'foregroundColor', link && 'link', underline !== undefined && 'underline'].filter(Boolean).join(','),
  },
});
const paragraph = (objectId, { align = 'START', spaceBelow } = {}) => ({
  updateParagraphStyle: {
    objectId,
    textRange: { type: 'ALL' },
    style: { alignment: align, ...(spaceBelow !== undefined && { spaceBelow: { magnitude: spaceBelow, unit: 'PT' } }) },
    fields: ['alignment', spaceBelow !== undefined && 'spaceBelow'].filter(Boolean).join(','),
  },
});
const middle = (objectId) => ({
  updateShapeProperties: { objectId, shapeProperties: { contentAlignment: 'MIDDLE' }, fields: 'contentAlignment' },
});

function text(page, id, value, { x, y, w, h, size, color, align, valign, link, underline }) {
  return [
    { createShape: { objectId: id, shapeType: 'TEXT_BOX', elementProperties: box(page, x, y, w, h) } },
    { insertText: { objectId: id, text: value } },
    style(id, { size, color, link, underline }),
    paragraph(id, { align }),
    ...(valign === 'MIDDLE' ? [middle(id)] : []),
  ];
}

// A card: Material's filled container, a rounded box with no outline.
function card(page, id, { x, y, w, h, fill = 'LIGHT2', link }) {
  return [
    { createShape: { objectId: id, shapeType: 'ROUND_RECTANGLE', elementProperties: box(page, x, y, w, h) } },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: theme(fill) } },
          outline: { propertyState: 'NOT_RENDERED' },
          ...(link && { link: { url: link } }),
        },
        fields: ['shapeBackgroundFill.solidFill.color', 'outline.propertyState', link && 'link'].filter(Boolean).join(','),
      },
    },
  ];
}

const image = (page, id, url, { x, y, w, h }) => ({ createImage: { objectId: id, url, elementProperties: box(page, x, y, w, h) } });

// Each feature slide, on the "Title only" layout: the feature's name in blue above the title, and
// what to do below it.
function featureSlide(id, index, { label, title, body }) {
  return [
    {
      createSlide: {
        objectId: id,
        insertionIndex: index,
        slideLayoutReference: { predefinedLayout: 'TITLE_ONLY' },
        placeholderIdMappings: [{ layoutPlaceholder: { type: 'TITLE', index: 0 }, objectId: `${id}_title` }],
      },
    },
    { insertText: { objectId: `${id}_title`, text: title } },
    ...text(id, `${id}_label`, label, { x: X, y: 0.42, w: W, h: 0.36, size: 14, color: 'ACCENT1' }),
    ...text(id, `${id}_body`, body, { x: X, y: 1.38, w: W, h: 0.42, size: 16, color: 'DARK2' }),
  ];
}

const commons = (path) => `https://upload.wikimedia.org/wikipedia/commons/${path}`;
export const PICTURES = {
  earthrise: { url: commons('a/a8/NASA-Apollo8-Dec24-Earthrise.jpg'), credit: 'Earthrise: NASA, Apollo 8, 1968. Public domain.' },
  marble: { url: commons('c/cb/The_Blue_Marble_(remastered).jpg'), credit: 'The Blue Marble: NASA, Apollo 17, 1972, remastered. Public domain.' },
  mars: { url: commons('5/56/Mars_Valles_Marineris.jpeg'), credit: 'Valles Marineris: NASA, Viking 1. Public domain.' },
  minard: { url: commons('2/29/Minard.png'), credit: "Charles Minard's map of Napoleon's march on Moscow, 1869. Public domain." },
};

// The slides' ids, in order, for the recording.
export const SLIDES = {
  title: 'p',
  spotlight: 's2_spotlight',
  links: 's3_links',
  zoom: 's4_zoom',
  pen: 's5_pen',
  timer: 's6_timer',
  notes: 's7_notes',
  liveEdits: 's8_live',
  closing: 's9_closing',
};
export const LIVE_NUMBER = 's8_live_number';

export const NOTES = {
  [SLIDES.title]: 'Welcome. Everything you will see works inside Google Slides, on top of its own slideshow.',
  [SLIDES.spotlight]: [
    'Three photos from space. Click one to see it full screen, then use the arrow keys to go through the others.',
    '',
    PICTURES.earthrise.credit,
    PICTURES.marble.credit,
    PICTURES.mars.credit,
  ].join('\n'),
  [SLIDES.links]: 'Click a link: the page opens over the slide, and Esc brings you back.',
  [SLIDES.zoom]: ["Minard's map: the width of the line is the size of Napoleon's army. Zoom in on the numbers along the way.", '', PICTURES.minard.credit].join('\n'),
  [SLIDES.pen]: 'Circle the best month with the pen. End the slideshow, start it again: the circle is still there.',
  [SLIDES.timer]: 'Fifteen minutes in all. The bar fills as time goes by, and the timer turns orange before the end. Click + for one more minute.',
  [SLIDES.notes]: [
    'Look at the room, not at the screen.',
    'Three things to say here:',
    '1. The notes follow the slideshow.',
    '2. Zoom them so you can read from a distance.',
    '3. Put them on your laptop while the slides are on the projector.',
  ].join('\n'),
  [SLIDES.liveEdits]: 'Someone changes the number in the editor on another computer, and it changes here within seconds.',
  [SLIDES.closing]: 'Get it from the Chrome Web Store. Thank you.',
};

// Two numbers side by side; the first is the one edited while the slideshow runs.
export function liveEditCards() {
  return [['card', 'Sign-ups so far', '128', 0.6], ['seats', 'Seats left', '22', 5.1]].flatMap(([name, caption, number, x]) => {
    const id = `${SLIDES.liveEdits}_${name}`;
    return [
      ...card(SLIDES.liveEdits, id, { x, y: 2.05, w: 4.3, h: 2.7 }),
      ...text(SLIDES.liveEdits, `${id}_caption`.replace('_card_caption', '_caption'), caption, { x: x + 0.35, y: 2.4, w: 3.7, h: 0.4, size: 18, color: 'DARK2' }),
      ...text(SLIDES.liveEdits, name === 'card' ? LIVE_NUMBER : `${id}_number`, number, { x: x + 0.35, y: 2.85, w: 3.7, h: 1.55, size: 96, color: 'ACCENT1', valign: 'MIDDLE' }),
    ];
  });
}

export function build() {
  const r = [];

  // The theme: colours, Google Sans for every placeholder, and a 32 pt title on "Title only", lower
  // down to leave room for the feature's name above it.
  r.push({
    updatePageProperties: {
      objectId: MASTER,
      pageProperties: { colorScheme: { colors: Object.entries(THEME).map(([type, value]) => ({ type, color: hex(value) })) } },
      fields: 'colorScheme',
    },
  });
  for (const id of ['p1_i0', 'p1_i1', 'p1_i2']) {
    r.push({ updateTextStyle: { objectId: id, textRange: { type: 'ALL' }, style: { fontFamily: FONT }, fields: 'fontFamily' } });
  }
  r.push(
    { updateTextStyle: { objectId: TITLE_ONLY_TITLE, textRange: { type: 'ALL' }, style: { fontSize: { magnitude: 32, unit: 'PT' } }, fields: 'fontSize' } },
    {
      updatePageElementTransform: {
        objectId: TITLE_ONLY_TITLE,
        applyMode: 'ABSOLUTE',
        transform: { scaleX: (W * EMU) / 3e6, scaleY: (0.62 * EMU) / 3e6, shearX: 0, shearY: 0, translateX: X * EMU, translateY: 0.76 * EMU, unit: 'EMU' },
      },
    },
  );

  // 1. Title, on the "Title slide" layout the deck starts with.
  r.push(
    { updatePageProperties: { objectId: SLIDES.title, pageProperties: { pageBackgroundFill: { solidFill: { color: theme('ACCENT2') } } }, fields: 'pageBackgroundFill.solidFill.color' } },
    { insertText: { objectId: 'i0', text: 'Slides Companion' } },
    style('i0', { color: 'ACCENT3' }),
    { insertText: { objectId: 'i1', text: 'Presenter tools for Google Slides' } },
    style('i1', { size: 24, color: 'ACCENT3' }),
  );

  // 2. Spotlight: three square photos.
  r.push(...featureSlide(SLIDES.spotlight, 1, {
    label: 'Spotlight',
    title: 'See any picture up close',
    body: 'Select a picture and press Space. During a slideshow, just click it.',
  }));
  const square = 2.75, gap = (8.8 - 3 * square) / 2;
  [PICTURES.earthrise, PICTURES.marble, PICTURES.mars].forEach((picture, i) =>
    r.push(image(SLIDES.spotlight, `${SLIDES.spotlight}_photo${i + 1}`, picture.url, { x: 0.6 + i * (square + gap), y: 2.05, w: square, h: square })),
  );

  // 3. Links: two cards, each a link to a Wikipedia article.
  r.push(...featureSlide(SLIDES.links, 2, {
    label: 'Links',
    title: 'Open websites right in the slideshow',
    body: 'Links open over your slide. Press Esc to come back right where you were.',
  }));
  [
    ['Earthrise', 'The photo, the mission and the crew', 'https://en.wikipedia.org/wiki/Earthrise'],
    ['Charles Joseph Minard', 'The engineer who drew the map on the next slide', 'https://en.wikipedia.org/wiki/Charles_Joseph_Minard'],
  ].forEach(([name, about, url], i) => {
    const id = `${SLIDES.links}_card${i + 1}`;
    const y = 2.05 + i * 1.4;
    r.push(...card(SLIDES.links, id, { x: 0.6, y, w: 8.8, h: 1.15, link: url }));
    r.push(
      ...text(SLIDES.links, `${id}_text`, `${name}\n${about} · Wikipedia`, { x: 0.75, y: y + 0.17, w: 8.5, h: 0.82, size: 16, color: 'DARK2' }),
      style(`${id}_text`, { size: 22, color: 'HYPERLINK', link: url, underline: true }, { type: 'FIXED_RANGE', startIndex: 0, endIndex: name.length }),
      paragraph(`${id}_text`, { spaceBelow: 4 }),
    );
  });

  // 4. Zoom: Minard's map, whole, centred.
  r.push(...featureSlide(SLIDES.zoom, 3, {
    label: 'Zoom',
    title: 'Zoom in on the details',
    body: 'Pinch, scroll or press + to zoom into the slide, and drag to look around.',
  }));
  const mapH = 3.2, mapW = mapH * (2003 / 955);
  r.push(image(SLIDES.zoom, `${SLIDES.zoom}_map`, PICTURES.minard.url, { x: (10 - mapW) / 2, y: 2.0, w: mapW, h: mapH }));

  // 5. Pen: a bar chart with a month worth circling.
  r.push(...featureSlide(SLIDES.pen, 4, {
    label: 'Pen',
    title: 'Draw on a slide, and find it there next time',
    body: "What you draw with Slides' pen stays on the slide for your next slideshow.",
  }));
  r.push(...text(SLIDES.pen, `${SLIDES.pen}_caption`, 'Visitors per month, in thousands (example)', { x: X, y: 2.0, w: W, h: 0.34, size: 14, color: 'DARK2' }));
  const months = [['Jan', 32], ['Feb', 41], ['Mar', 38], ['Apr', 55], ['May', 61], ['Jun', 74]];
  const top = 2.75, bottom = 4.72, bar = 0.9, step = 8.8 / months.length;
  months.forEach(([month, value], i) => {
    const id = `${SLIDES.pen}_bar${i + 1}`;
    const h = ((bottom - top) * value) / 74;
    const x = 0.6 + i * step + (step - bar) / 2;
    const best = value === 74;
    r.push(...card(SLIDES.pen, id, { x, y: bottom - h, w: bar, h, fill: best ? 'ACCENT1' : 'ACCENT2' }));
    r.push(...text(SLIDES.pen, `${id}_value`, String(value), { x: x - 0.2, y: bottom - h - 0.36, w: bar + 0.4, h: 0.32, size: 14, color: best ? 'ACCENT1' : 'DARK2', align: 'CENTER' }));
    r.push(...text(SLIDES.pen, `${id}_month`, month, { x: x - 0.2, y: bottom + 0.04, w: bar + 0.4, h: 0.32, size: 14, color: 'DARK2', align: 'CENTER' }));
  });

  // 6. Timer: the talk's agenda, with how long each part takes.
  r.push(...featureSlide(SLIDES.timer, 5, {
    label: 'Timer',
    title: 'A countdown only you can see',
    body: 'In presenter view, click the timer and set how long you have.',
  }));
  [['Welcome', '2 min'], ['Where we are', '5 min'], ["What's next", '5 min'], ['Questions', '3 min']].forEach(([item, time], i) => {
    const id = `${SLIDES.timer}_row${i + 1}`;
    const y = 2.05 + i * 0.72;
    r.push(...card(SLIDES.timer, id, { x: 0.6, y, w: 8.8, h: 0.58 }));
    r.push(...text(SLIDES.timer, `${id}_item`, item, { x: 0.75, y, w: 6, h: 0.58, size: 18, valign: 'MIDDLE' }));
    r.push(...text(SLIDES.timer, `${id}_time`, time, { x: 7.65, y, w: 1.6, h: 0.58, size: 16, color: 'DARK2', align: 'END', valign: 'MIDDLE' }));
  });

  // 7. Floating notes: a quote, the notes being the point. The quote leaves the bottom right corner
  // free, where Chrome puts the picture-in-picture window.
  r.push(...featureSlide(SLIDES.notes, 6, {
    label: 'Floating notes',
    title: 'Your notes, floating on top',
    body: 'In a picture-in-picture window, in front of the full-screen slideshow.',
  }));
  r.push(...card(SLIDES.notes, `${SLIDES.notes}_quote_card`, { x: 0.6, y: 2.05, w: 6.0, h: 2.7, fill: 'ACCENT2' }));
  r.push(...text(SLIDES.notes, `${SLIDES.notes}_quote`, '“Speak to the room, not to the screen.”', { x: 1.0, y: 2.05, w: 5.2, h: 2.7, size: 36, color: 'ACCENT3', valign: 'MIDDLE' }));

  // 8. Live edits: a number to change in the editor while the slideshow runs.
  r.push(...featureSlide(SLIDES.liveEdits, 7, {
    label: 'Live edits',
    title: 'Edit the deck while it’s on screen',
    body: 'Changes made in the editor, by you or anyone else, reach the running slideshow.',
  }));
  r.push(...liveEditCards());

  // 9. Closing, on the "Section header" layout.
  r.push({
    createSlide: {
      objectId: SLIDES.closing,
      insertionIndex: 8,
      slideLayoutReference: { predefinedLayout: 'SECTION_HEADER' },
      placeholderIdMappings: [{ layoutPlaceholder: { type: 'TITLE', index: 0 }, objectId: `${SLIDES.closing}_title` }],
    },
  });
  r.push(
    { updatePageProperties: { objectId: SLIDES.closing, pageProperties: { pageBackgroundFill: { solidFill: { color: theme('ACCENT2') } } }, fields: 'pageBackgroundFill.solidFill.color' } },
    { insertText: { objectId: `${SLIDES.closing}_title`, text: 'Free and open source' } },
    style(`${SLIDES.closing}_title`, { color: 'ACCENT3' }),
    ...text(SLIDES.closing, `${SLIDES.closing}_body`, 'No account, no servers: everything happens in your browser.', { x: X, y: 3.4, w: W, h: 0.45, size: 20, color: 'ACCENT3', align: 'CENTER' }),
  );

  return r;
}

// The speaker notes, given { slideId: speakerNotesObjectId }.
// Notes stay in Arial, as Slides writes them in a new deck.
export function notes(ids) {
  return Object.entries(NOTES).flatMap(([slide, value]) => [
    { insertText: { objectId: ids[slide], text: value } },
    { updateTextStyle: { objectId: ids[slide], textRange: { type: 'ALL' }, style: { fontFamily: 'Arial' }, fields: 'fontFamily' } },
  ]);
}
// For a deck whose notes are already written: just the font.
export const notesFont = (ids) => notes(ids).filter((request) => request.updateTextStyle);

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, file] = process.argv.slice(2);
  const requests = command === 'notes' ? notes(JSON.parse(fs.readFileSync(file, 'utf8'))) : command === 'notes-font' ? notesFont(JSON.parse(fs.readFileSync(file, 'utf8'))) : command === 'seats' ? liveEditCards().slice(-11) : build();
  process.stdout.write(JSON.stringify(requests));
}
