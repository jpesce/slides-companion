import { test, expect, deckUrl, openSettings } from './fixtures.js';

// Starts the slideshow with presenter view, the window Slides opens beside it.
async function openPresenterView(context) {
  const page = await context.newPage();
  await page.goto(deckUrl);
  await page.locator('#punch-start-presentation-right').click();
  const opened = context.waitForEvent('page');
  // Presenter view is the first choice in the slideshow's menu.
  await page.locator('.goog-menuitem').filter({ visible: true }).first().click();
  const presenter = await opened;
  await expect(timer(presenter)).toBeVisible();
  return { page, presenter };
}

const timer = (presenter) => presenter.locator('.punch-viewer-speakernotes-timer-time-container');
const button = (presenter) => presenter.locator('.slides-companion-countdown-button');
const countdown = (presenter) => presenter.locator('.slides-companion-countdown');
const menu = (presenter) => presenter.locator('.slides-companion-countdown-menu');
const choice = (presenter, name) =>
  menu(presenter).locator('.goog-menuitem').filter({ has: presenter.getByText(name, { exact: true }) });
const field = (presenter) => presenter.locator('.slides-companion-countdown-input');
const hint = (presenter) => presenter.getByRole('tooltip');
const slidesTime = (presenter) => presenter.locator('.punch-viewer-speakernotes-timer-time:not(.slides-companion-countdown)');
const [pause, reset] = [0, 1].map((n) => (presenter) => presenter.locator('.punch-viewer-speakernotes-timer-button').nth(n));

async function choose(presenter, name) {
  await button(presenter).click();
  await choice(presenter, name).click();
}

async function countDownFrom(presenter, time) {
  await timer(presenter).click();
  await choice(presenter, 'Other time…').click();
  await presenter.keyboard.type(time);
  await presenter.keyboard.press('Enter');
}

const seconds = (text) => {
  const [hours, minutes, secs] = text.split(':').map(Number);
  return hours * 3600 + minutes * 60 + secs;
};
const secondsLeft = async (presenter) => seconds(await countdown(presenter).textContent());

test('choosing a time in the timer’s menu counts down from it, and Slides’ Pause and Reset still work', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  // Slides' timer starts with presenter view; the countdown starts when it's chosen.
  await expect(slidesTime(presenter)).toHaveText(/^00:00:0[3-9]$/, { timeout: 8000 });
  await choose(presenter, 'Count down from 20 minutes');
  await expect(menu(presenter)).toHaveCount(0);
  await expect(slidesTime(presenter)).toBeHidden();
  expect(await secondsLeft(presenter)).toBeGreaterThanOrEqual(20 * 60 - 1);
  await expect.poll(() => secondsLeft(presenter), { timeout: 5000 }).toBeLessThan(20 * 60 - 1);

  await pause(presenter).click();
  const paused = await secondsLeft(presenter);
  await presenter.waitForTimeout(2000);
  expect(await secondsLeft(presenter)).toBe(paused);

  await reset(presenter).click();
  await expect.poll(() => secondsLeft(presenter)).toBe(20 * 60);

  await choose(presenter, 'Count up, as usual');
  await expect(countdown(presenter)).toBeHidden();
  await expect(slidesTime(presenter)).toBeVisible();
});

test('the timer turns orange shortly before the end, then red, and counts on past the end', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await countDownFrom(presenter, '0:03');
  await expect(countdown(presenter)).toHaveClass(/slides-companion-countdown-warning/);
  await expect(countdown(presenter)).toHaveCSS('color', 'rgb(227, 116, 0)');
  await expect(countdown(presenter)).toHaveClass(/slides-companion-countdown-over/, { timeout: 8000 });
  await expect(countdown(presenter)).toHaveText(/^00:00:0[1-9]$/);
  expect(await countdown(presenter).evaluate((element) => getComputedStyle(element, '::before').content)).toBe('"−"');
  await expect(countdown(presenter)).not.toHaveClass(/slides-companion-countdown-warning/);
  await expect(countdown(presenter)).toHaveCSS('color', 'rgb(179, 38, 30)');
});

test('the menu ticks how the timer counts, and keeps the last time typed', async ({ context }) => {
  const first = await openPresenterView(context);
  await button(first.presenter).click();
  await expect(choice(first.presenter, 'Count up, as usual')).toHaveAttribute('aria-checked', 'true');
  await expect(choice(first.presenter, 'Add 1 minute')).toHaveCount(0);
  await first.presenter.keyboard.press('Escape');
  await countDownFrom(first.presenter, '1:30:00');
  await expect(countdown(first.presenter)).toHaveText(/^01:(30:00|29:5\d)$/);
  await button(first.presenter).click();
  await expect(choice(first.presenter, 'Count down from 1 hour 30 minutes')).toHaveAttribute('aria-checked', 'true');
  await expect(choice(first.presenter, 'Count up, as usual')).toHaveAttribute('aria-checked', 'false');
  await expect(choice(first.presenter, 'Add 1 minute')).toBeVisible();
  // A time the menu has is ticked, not added again.
  await choice(first.presenter, 'Other time…').click();
  await expect(field(first.presenter)).toHaveValue('1:30:00');
  await first.presenter.keyboard.type('30');
  await first.presenter.keyboard.press('Enter');
  await button(first.presenter).click();
  await expect(choice(first.presenter, 'Count down from 30 minutes')).toHaveAttribute('aria-checked', 'true');
  await expect(choice(first.presenter, 'Count down from 1 hour 30 minutes')).toHaveAttribute('aria-checked', 'false');
  await expect(menu(first.presenter).locator('.goog-menuitem')).toHaveCount(11);
  await first.presenter.close();
  await first.page.close();
});

test('each deck remembers its time, and whether it was counting down', async ({ context }) => {
  const first = await openPresenterView(context);
  await countDownFrom(first.presenter, '1:30:00');
  await first.presenter.close();
  await first.page.close();

  const second = await openPresenterView(context);
  await expect(countdown(second.presenter)).toHaveText(/^01:(30:00|29:5\d)$/);
  await expect(bar(second.presenter)).toBeVisible();
  await choose(second.presenter, 'Count up, as usual');
  await second.presenter.close();
  await second.page.close();

  const { presenter } = await openPresenterView(context);
  await expect(slidesTime(presenter)).toBeVisible();
  await expect(countdown(presenter)).toBeHidden();
  await button(presenter).click();
  await expect(choice(presenter, 'Count down from 1 hour 30 minutes')).toHaveAttribute('aria-checked', 'false');
});

test('changing the time while counting down keeps the time already spent', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await choose(presenter, 'Count down from 20 minutes');
  await expect.poll(() => secondsLeft(presenter), { timeout: 8000 }).toBeLessThanOrEqual(20 * 60 - 3);
  await choose(presenter, 'Count down from 30 minutes');
  expect(await secondsLeft(presenter)).toBeLessThanOrEqual(30 * 60 - 3);
  expect(await secondsLeft(presenter)).toBeGreaterThan(29 * 60);
});

test('Add 1 minute is for this talk only: Reset starts over from the time chosen', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  // Reset shows as Slides' time going back, so it needs a time to go back from.
  await expect(slidesTime(presenter)).toHaveText(/^00:00:0[3-9]$/, { timeout: 8000 });
  await choose(presenter, 'Count down from 10 minutes');
  await choose(presenter, 'Add 1 minute');
  await choose(presenter, 'Add 1 minute');
  expect(await secondsLeft(presenter)).toBeGreaterThan(11 * 60);
  await button(presenter).click();
  // Still ticked as 10 minutes, the talk's length.
  await expect(choice(presenter, 'Count down from 10 minutes')).toHaveAttribute('aria-checked', 'true');
  await presenter.keyboard.press('Escape');
  await reset(presenter).click();
  await expect.poll(() => secondsLeft(presenter)).toBe(10 * 60);
});

test('a time it can’t read is marked, and the field stays open to fix it; nothing typed changes nothing', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await countDownFrom(presenter, 'twenty');
  await expect(field(presenter)).toBeFocused();
  await expect(field(presenter)).toHaveAttribute('aria-invalid', 'true');
  await expect(field(presenter)).toHaveCSS('border-top-color', 'rgb(179, 38, 30)');
  await expect(hint(presenter)).toHaveText('Type minutes, like 20, or a time, like 1:20:00');
  // Typed over, as the field selects what it couldn't read.
  await presenter.keyboard.type('20 min');
  await expect(field(presenter)).not.toHaveAttribute('aria-invalid');
  await expect(hint(presenter)).toHaveText('Press Enter to start the countdown');
  await presenter.keyboard.press('Enter');
  await expect(countdown(presenter)).toHaveText(/^00:(20:00|19:5\d)$/);
  await expect(hint(presenter)).toHaveCount(0);

  await timer(presenter).click();
  await choice(presenter, 'Other time…').click();
  await presenter.keyboard.press('Backspace');
  await presenter.keyboard.press('Enter');
  await expect(field(presenter)).toHaveCount(0);
  await expect(countdown(presenter)).toHaveText(/^00:(20:00|19:5\d)$/);
});

test('the field reads times in words and full-width digits, but not minutes past 59 or 100 hours and more', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await countDownFrom(presenter, '20:75');
  await expect(field(presenter)).toHaveAttribute('aria-invalid', 'true');
  await presenter.keyboard.type('1h 30');
  await presenter.keyboard.press('Enter');
  await expect(countdown(presenter)).toHaveText(/^01:(30:00|29:5\d)$/);

  await countDownFrom(presenter, '100:00:00');
  await expect(field(presenter)).toHaveAttribute('aria-invalid', 'true');
  // As Japanese and Chinese keyboards type digits.
  await presenter.keyboard.type('２０');
  await presenter.keyboard.press('Enter');
  await expect(countdown(presenter)).toHaveText(/^00:(20:00|19:5\d)$/);
});

test('typing in the timer keeps keys from Slides, and Escape leaves the time as it was', async ({ context }) => {
  const { page, presenter } = await openPresenterView(context);
  await countDownFrom(presenter, '10');
  await timer(presenter).click();
  await choice(presenter, 'Other time…').click();
  // In presenter view, the arrows change slides.
  await presenter.keyboard.press('ArrowRight');
  await presenter.keyboard.type('5');
  await presenter.keyboard.press('Escape');
  await expect.poll(() => secondsLeft(presenter)).toBeGreaterThan(9 * 60);
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute('aria-label', /^\D*1\D/);
});

test('while typing a time, a tooltip like Slides’ says Enter starts the countdown', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await timer(presenter).click();
  await choice(presenter, 'Other time…').click();
  await expect(hint(presenter)).toHaveText('Press Enter to start the countdown');
  await expect(field(presenter)).toHaveAttribute('aria-describedby', await hint(presenter).getAttribute('id'));
  // Presenter view's own tooltip style, below the field with its arrow at the field's middle.
  await expect(hint(presenter)).toHaveCSS('background-color', 'rgb(42, 42, 42)');
  const [fieldBox, hintBox, arrowBox] = await Promise.all([
    field(presenter).boundingBox(),
    hint(presenter).boundingBox(),
    hint(presenter).locator('.jfk-tooltip-arrowimplbefore').boundingBox(),
  ]);
  expect(hintBox.y).toBeGreaterThan(fieldBox.y + fieldBox.height);
  expect(Math.abs(arrowBox.x + arrowBox.width / 2 - (fieldBox.x + fieldBox.width / 2))).toBeLessThan(2);
  await presenter.keyboard.press('Escape');
  await expect(hint(presenter)).toHaveCount(0);

  await choose(presenter, 'Count down from 10 minutes');
  await timer(presenter).click();
  await choice(presenter, 'Other time…').click();
  await expect(hint(presenter)).toHaveText('Press Enter to change the time');
  // Clicking elsewhere puts both away.
  await presenter.mouse.click(600, 300);
  await expect(field(presenter)).toHaveCount(0);
  await expect(hint(presenter)).toHaveCount(0);
});

test('the timer’s menu is made like presenter view’s slide picker, beside Reset', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  const [resetBox, box] = await Promise.all([reset(presenter).boundingBox(), button(presenter).boundingBox()]);
  expect(box.y).toBe(resetBox.y);
  expect(box.x).toBeGreaterThan(resetBox.x);

  const look = (list) =>
    list.evaluate((element) => {
      const style = (node) => {
        const computed = getComputedStyle(node);
        return ['font', 'color', 'background', 'border', 'padding', 'box-shadow', 'z-index'].map((name) => computed[name]);
      };
      const items = [...element.querySelectorAll('.goog-menuitem')];
      return [element, items.find((item) => item.matches('.goog-option-selected')), items.find((item) => item.matches('.goog-menuitem-highlight'))].map(style);
    });
  await presenter.locator('.jfk-select').first().click();
  const picker = presenter.locator('.goog-menu').filter({ visible: true }).filter({ hasNot: presenter.locator('.slides-companion-countdown-menu') });
  await picker.locator('.goog-menuitem').nth(1).hover();
  const native = await look(picker.first());
  await presenter.keyboard.press('Escape');

  await button(presenter).click();
  await expect(button(presenter)).toHaveAttribute('aria-expanded', 'true');
  await expect(button(presenter)).toHaveClass(/jfk-button-checked/);
  await choice(presenter, 'Count down from 10 minutes').hover();
  expect(await look(menu(presenter))).toEqual(native);
  // Lined up with the button's right edge, just below it.
  const menuBox = await menu(presenter).boundingBox();
  expect(Math.round(menuBox.x + menuBox.width)).toBe(Math.round(box.x + box.width));
  expect(Math.round(menuBox.y)).toBe(Math.round(box.y + box.height));

  // Clicking elsewhere closes it.
  await presenter.mouse.click(600, 300);
  await expect(menu(presenter)).toHaveCount(0);
  await expect(button(presenter)).toHaveAttribute('aria-expanded', 'false');
  await expect(button(presenter)).not.toHaveClass(/jfk-button-checked/);
});

test('in a short window the timer’s menu fits and scrolls, and the arrows bring choices into view', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await presenter.setViewportSize({ width: 420, height: 220 });
  await button(presenter).focus();
  await presenter.keyboard.press('Enter');
  const menuBox = await menu(presenter).boundingBox();
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(220);
  await presenter.keyboard.press('End');
  const lit = await choice(presenter, 'Other time…').boundingBox();
  expect(lit.y + lit.height).toBeLessThanOrEqual(menuBox.y + menuBox.height);
  await presenter.keyboard.press('Home');
  const first = await choice(presenter, 'Count up, as usual').boundingBox();
  expect(first.y).toBeGreaterThanOrEqual(menuBox.y);
});

test('the timer’s menu works from the keyboard, without changing slides', async ({ context }) => {
  const { page, presenter } = await openPresenterView(context);
  await button(presenter).focus();
  await presenter.keyboard.press('Enter');
  await expect(choice(presenter, 'Count up, as usual')).toHaveClass(/goog-menuitem-highlight/);
  await presenter.keyboard.press('ArrowDown');
  await presenter.keyboard.press('ArrowDown');
  await expect(choice(presenter, 'Count down from 10 minutes')).toHaveClass(/goog-menuitem-highlight/);
  await presenter.keyboard.press('Enter');
  await expect(menu(presenter)).toHaveCount(0);
  await expect(countdown(presenter)).toHaveText(/^00:(10:00|09:5\d)$/);
  await expect(button(presenter)).toBeFocused();

  // Up from the top goes round to the bottom.
  await presenter.keyboard.press(' ');
  await presenter.keyboard.press('ArrowUp');
  await expect(choice(presenter, 'Add 1 minute')).toHaveClass(/goog-menuitem-highlight/);
  await presenter.keyboard.press(' ');
  await expect(menu(presenter)).toHaveCount(0);
  expect(await secondsLeft(presenter)).toBeGreaterThan(10 * 60);

  await presenter.keyboard.press('ArrowDown');
  await expect(menu(presenter)).toBeVisible();
  await presenter.keyboard.press('Escape');
  await expect(menu(presenter)).toHaveCount(0);
  await expect(button(presenter)).toBeFocused();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute('aria-label', /^\D*1\D/);
});

test('the audience’s slideshow never shows the countdown', async ({ context }) => {
  const { page, presenter } = await openPresenterView(context);
  await countDownFrom(presenter, '10');
  await expect(countdown(presenter)).toBeVisible();
  await expect(page.locator('.slides-companion-countdown')).toHaveCount(0);
  await expect(page.frameLocator('iframe.punch-present-iframe').locator('.slides-companion-countdown')).toHaveCount(0);
});

test('with the warning set to 5 minutes in Settings, the timer turns orange 5 minutes before the end', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(deckUrl);
  await openSettings(page, 'Timer');
  await page.getByRole('radio', { name: /5 minutes before the end/ }).check();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.close();

  const { presenter } = await openPresenterView(context);
  await countDownFrom(presenter, '4');
  await expect(countdown(presenter)).toHaveClass(/slides-companion-countdown-warning/);
  await countDownFrom(presenter, '6');
  await expect(countdown(presenter)).not.toHaveClass(/slides-companion-countdown-warning/);
});

const bar = (presenter) => presenter.locator('.slides-companion-countdown-bar');
const box = (locator) => locator.evaluate((element) => element.getBoundingClientRect().toJSON());
// The share of the bar filled, and of the time gone.
const filled = (presenter) =>
  bar(presenter).evaluate((element) => element.firstChild.getBoundingClientRect().width / element.getBoundingClientRect().width);
const panel = (presenter) => presenter.locator('.punch-viewer-speakernotes-timer-panel');
const below = (presenter) => presenter.locator('.punch-viewer-speakernotes-page-control-panel');

test('counting down, a bar under the time fills up as it goes, and what’s below makes room for it', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await expect(slidesTime(presenter)).toHaveText(/^00:00:0[3-9]$/, { timeout: 8000 });
  await expect(bar(presenter)).toBeHidden();
  const [before, row] = await Promise.all([box(below(presenter)), box(timer(presenter))]);
  await choose(presenter, 'Count down from 5 minutes');
  await expect(bar(presenter)).toBeVisible();
  await expect(bar(presenter)).toHaveAttribute('aria-hidden', 'true');
  // Lined up with the time and the slide picker. The row of the time and its buttons stays where
  // Slides puts it, and the bar has as much room below it as the row has above (then the panel's 1px
  // border). The slide picker and slides below it move down to make room.
  const [track, time, edge, moved] = await Promise.all([box(bar(presenter)), box(timer(presenter)), box(panel(presenter)), box(below(presenter))]);
  expect(time).toEqual(row);
  expect(track.left).toBe(time.left);
  expect(edge.right - track.right).toBe(track.left - edge.left);
  const buttons = await box(pause(presenter));
  expect(edge.bottom - 1 - track.bottom).toBe(buttons.top - edge.top);
  expect(moved.top).toBeCloseTo(edge.bottom, 0);
  expect(moved.top).toBeGreaterThan(before.top);
  await expect.poll(() => secondsLeft(presenter), { timeout: 5000 }).toBeLessThan(5 * 60 - 1);
  const share = async () => Math.abs((await filled(presenter)) - (1 - (await secondsLeft(presenter)) / (5 * 60)));
  expect(await share()).toBeLessThan(0.01);

  // Adding a minute makes the talk longer, so less of it has gone.
  await choose(presenter, 'Add 1 minute');
  expect(Math.abs((await filled(presenter)) - (1 - (await secondsLeft(presenter)) / (6 * 60)))).toBeLessThan(0.01);
  await reset(presenter).click();
  await expect.poll(() => filled(presenter)).toBeLessThan(0.01);

  await choose(presenter, 'Count up, as usual');
  await expect(bar(presenter)).toBeHidden();
  expect(await box(below(presenter))).toEqual(before);
});

test('the bar turns orange and red with the timer, and is full past the end', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await countDownFrom(presenter, '0:03');
  const fill = bar(presenter).locator('.slides-companion-countdown-bar-fill');
  await expect(fill).toHaveCSS('background-color', 'rgb(227, 116, 0)');
  await expect(countdown(presenter)).toHaveClass(/slides-companion-countdown-over/, { timeout: 8000 });
  await expect(fill).toHaveCSS('background-color', 'rgb(179, 38, 30)');
  expect(await filled(presenter)).toBe(1);
});

// Slides' recording studio shows its time limit with a bar; its styles are in presenter view.
test('the bar is made like Slides’ own time bar', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await choose(presenter, 'Count down from 20 minutes');
  await expect(bar(presenter)).toBeVisible();
  // Slides' bar, put in beside ours with its own classes.
  await presenter.evaluate(() => {
    const track = document.createElement('div');
    track.className = 'ttr-studio-time-indicator-bar-v2';
    track.append(Object.assign(document.createElement('div'), { className: 'ttr-studio-time-indicator-progress-bar-v2' }));
    document.body.append(track);
  });
  const looks = (track) =>
    track.evaluate((element) =>
      [element, element.firstChild].map((part) => {
        const style = getComputedStyle(part);
        return { height: style.height, borderRadius: style.borderRadius, background: style.backgroundColor, overflow: style.overflow };
      }),
    );
  expect(await looks(bar(presenter))).toEqual(await looks(presenter.locator('.ttr-studio-time-indicator-bar-v2')));
});

// Windows' high-contrast mode takes away background colours, which would leave a gap.
test('in a high-contrast mode, the bar still shows', async ({ context }) => {
  const { presenter } = await openPresenterView(context);
  await presenter.emulateMedia({ forcedColors: 'active' });
  await countDownFrom(presenter, '0:03');
  const fill = bar(presenter).locator('.slides-companion-countdown-bar-fill');
  await expect(fill).toHaveCSS('background-color', 'rgb(227, 116, 0)');
  await expect(bar(presenter)).not.toHaveCSS('outline-style', 'none');
});

test('turning the bar off or on in Settings shows at once in an open presenter view', async ({ context }) => {
  const { page, presenter } = await openPresenterView(context);
  await countDownFrom(presenter, '10');
  await expect(bar(presenter)).toBeVisible();
  const settings = await context.newPage();
  await settings.goto(deckUrl);
  const turn = async (on) => {
    await openSettings(settings, 'Timer');
    await settings.getByRole('checkbox', { name: /Show a bar under the time/ }).setChecked(on);
    await settings.getByRole('button', { name: 'OK' }).click();
  };
  await turn(false);
  await expect(bar(presenter)).toBeHidden();
  expect((await box(below(presenter))).top).toBe((await box(panel(presenter))).bottom);
  await turn(true);
  await expect(bar(presenter)).toBeVisible();
  expect(page.isClosed()).toBe(false);
});

test('turned off in Settings, there’s no bar under the countdown', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(deckUrl);
  await openSettings(page, 'Timer');
  await page.getByRole('checkbox', { name: /Show a bar under the time/ }).uncheck();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.close();

  const { presenter } = await openPresenterView(context);
  const before = await box(below(presenter));
  await countDownFrom(presenter, '10');
  await expect(countdown(presenter)).toBeVisible();
  await expect(bar(presenter)).toBeHidden();
  expect(await box(below(presenter))).toEqual(before);
});
