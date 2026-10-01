import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serveExport } from './browserServer.mjs';

// This suite intentionally uses a credential-free sample export, never a user's session.
const playwright = await import(process.env.MEMENTO_PLAYWRIGHT_PATH
  ? pathToFileURL(resolve(process.env.MEMENTO_PLAYWRIGHT_PATH)).href
  : 'playwright');
let browser;
let server;

before(async () => {
  server = await serveExport(resolve(process.env.MEMENTO_TEST_DIST || 'dist-preview'));
  browser = await playwright.chromium.launch({
    ...(process.env.MEMENTO_BROWSER_PATH ? { executablePath: process.env.MEMENTO_BROWSER_PATH } : {}),
    headless: true,
  });
});
after(async () => {
  await browser?.close();
  await server?.close();
});

async function sampleDiary(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...options });
  t.after(() => context.close());
  await context.addInitScript(() => {
    const RealDate = Date;
    const fixed = '2026-10-01T12:00:00';
    window.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      // Keep the animation clock live while fixing calendar dates.
      static now() { return RealDate.now(); }
    };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  t.after(() => assert.deepEqual(failures, [], 'No browser runtime errors'));
  await page.goto(server.url);
  await page.getByRole('button', { name: /Open diary prototype|Explore sample diary/ }).click();
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await page.getByRole('button', { name: 'Choose month and year' }).filter({ hasText: 'September' }).waitFor();
  return page;
}

async function swipe(page, from, to) {
  // Real browser touch input exercises responder capture and default scrolling.
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  for (let step = 1; step <= 10; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
      x: from.x + (to.x - from.x) * step / 10,
      y: from.y + (to.y - from.y) * step / 10,
    }] });
    await page.waitForTimeout(16);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

async function mediaImages(page) {
  return page.locator('img').elementHandles().then(async handles => {
    const images = [];
    for (const image of handles) {
      const box = await image.boundingBox();
      if (box && box.width > 250 && box.height > 250) images.push({ image, box, source: await image.getAttribute('src') });
    }
    return images;
  });
}

test('returning from a September moment preserves September even when today is October', async t => {
  const page = await sampleDiary(t);
  await page.getByRole('button', { name: /September 26.*photo moment/ }).click();
  await page.getByRole('button', { name: 'Back to calendar' }).click();
  const month = page.getByRole('button', { name: 'Choose month and year' });
  await month.waitFor();
  assert.match(await month.innerText(), /September/, 'Return to the browsed month');
});

test('advancing to a decoded neighboring photo keeps its image mounted', async t => {
  const page = await sampleDiary(t);
  await page.getByRole('button', { name: /September 26.*photo moment/ }).click();
  await page.getByText('Rain on the way home.', { exact: true }).waitFor();
  await page.waitForTimeout(350);
  const images = await mediaImages(page);
  const incoming = images.find(item => item.source.includes('morning-kitchen'));
  assert.ok(incoming, 'The next photo is already mounted beside the current photo');
  await incoming.image.evaluate(image => image.decode());
  await page.getByRole('button', { name: 'Next saved moment' }).click();
  await page.getByText('The morning light stayed a little longer today.', { exact: true }).waitFor({ timeout: 2000 });
  assert.equal(await incoming.image.evaluate(image => image.isConnected), true, 'The incoming decoded image must not remount at the end of the slide');
});

test('full-view touch swipes navigate in both directions repeatedly', async t => {
  const page = await sampleDiary(t);
  await page.getByRole('button', { name: /September 26.*photo moment/ }).click();
  await page.getByText('Rain on the way home.', { exact: true }).waitFor();
  for (const direction of [-1, 1, -1, 1]) {
    const current = (await mediaImages(page)).find(item => item.box.x >= 0 && item.box.x < 100);
    assert.ok(current, 'An active media surface exists');
    const y = current.box.y + 170;
    await swipe(page, { x: direction < 0 ? 300 : 70, y }, { x: direction < 0 ? 70 : 300, y });
    const caption = direction < 0 ? 'The morning light stayed a little longer today.' : 'Rain on the way home.';
    await page.getByText(caption, { exact: true }).waitFor({ timeout: 2000 });
  }
});

test('horizontal calendar swipes change months in either direction', async t => {
  const page = await sampleDiary(t);
  // Start in an empty calendar tile to exercise the grid's gesture coordination.
  const empty = await page.getByRole('button', { name: /September 17.*empty date/ }).boundingBox();
  await swipe(page, { x: 310, y: empty.y + 20 }, { x: 80, y: empty.y + 20 });
  const month = page.getByRole('button', { name: 'Choose month and year' });
  await page.waitForTimeout(400);
  assert.match(await month.innerText(), /October/);
  await swipe(page, { x: 80, y: empty.y + 20 }, { x: 310, y: empty.y + 20 });
  await page.waitForTimeout(400);
  assert.match(await month.innerText(), /September/);
});

async function holdPreview(page, day = 26, source = 'rainy-window') {
  const tile = await page.getByRole('button', { name: new RegExp(`September ${day}.*photo moment`) }).boundingBox();
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }] });
  await page.waitForTimeout(650);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await page.getByTestId('preview-pager').waitFor();
  // Finish the opening motion before a test measures drag displacement.
  await page.waitForTimeout(350);
  return page.getByTestId('preview-pager').locator(`img[src*="${source}"]`).first();
}

test('holding opens an expanding preview that stays after release and shrinks on outside tap', async t => {
  const page = await sampleDiary(t);
  await page.evaluate(() => {
    window.previewMeasurements = [];
    window.measurePreview = true;
    const record = now => {
      const image = document.querySelector('[data-testid="preview-pager"] img[src*="rainy-window"]');
      if (image) window.previewMeasurements.push({ time: now, width: image.getBoundingClientRect().width });
      if (window.measurePreview) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  const image = await holdPreview(page);
  const expanded = await image.boundingBox();
  assert.ok(expanded.width > 300, 'The preview expands beyond its calendar tile');
  const opening = await page.evaluate(() => window.previewMeasurements);
  assert.ok(opening.some(frame => frame.width < expanded.width * .8), 'Opening has intermediate smaller frames');
  await page.waitForTimeout(200);
  assert.equal(await page.getByTestId('preview-pager').count(), 1, 'Releasing the finger leaves the preview open');
  await page.evaluate(() => { window.previewMeasurements = []; });
  await page.touchscreen.tap(12, 30);
  await page.getByTestId('preview-pager').waitFor({ state: 'detached' });
  const closing = await page.evaluate(() => { window.measurePreview = false; return window.previewMeasurements; });
  assert.ok(closing.some(frame => frame.width < expanded.width * .8), 'Closing shrinks through intermediate frames');
  assert.match(await page.getByRole('button', { name: 'Choose month and year' }).innerText(), /September/);
});

test('a held preview follows a vertical drag that reverses before finger release', async t => {
  const page = await sampleDiary(t);
  const image = await holdPreview(page);
  const initial = await image.boundingBox();
  const x = initial.x + initial.width / 2;
  const y = initial.y + initial.height / 2;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (const offset of [15, 40, 70, 90]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + offset }] });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(50);
  const down = await image.boundingBox();
  assert.ok(down.y > initial.y + 65, `The preview follows the downward drag (${down.y - initial.y}px)`);
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 40 }] });
  await page.waitForTimeout(50);
  const reversed = await image.boundingBox();
  assert.ok(Math.abs(reversed.y - (initial.y - 40)) < 20, `The preview follows the reversed finger position promptly (${reversed.y - initial.y}px)`);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
});

test('a preview follows both coordinates of a diagonal drag and its reversal', async t => {
  const page = await sampleDiary(t);
  const image = await holdPreview(page);
  const initial = await image.boundingBox();
  const origin = { x: initial.x + initial.width / 2, y: initial.y + initial.height / 2 };
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin] });
  for (const [dx, dy] of [[4, 8], [12, 22], [35, 55], [55, 85]]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: origin.x + dx, y: origin.y + dy }] });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(40);
  const downRight = await image.boundingBox();
  assert.ok(Math.abs(downRight.x - initial.x - 55) < 16, `The diagonal drag follows X (${downRight.x - initial.x}px)`);
  assert.ok(Math.abs(downRight.y - initial.y - 85) < 16, `The diagonal drag follows Y (${downRight.y - initial.y}px)`);
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: origin.x - 45, y: origin.y - 55 }] });
  await page.waitForTimeout(40);
  const upLeft = await image.boundingBox();
  assert.ok(Math.abs(upLeft.x - initial.x + 45) < 16, `The reversed drag follows X (${upLeft.x - initial.x}px)`);
  assert.ok(Math.abs(upLeft.y - initial.y + 55) < 16, `The reversed drag follows Y (${upLeft.y - initial.y}px)`);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
});

test('a mostly horizontal preview drag still follows vertical finger drift', async t => {
  const page = await sampleDiary(t);
  const image = await holdPreview(page);
  const initial = await image.boundingBox();
  const origin = { x: initial.x + initial.width / 2, y: initial.y + initial.height / 2 };
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin] });
  for (const [dx, dy] of [[12, 2], [40, 8], [75, 20], [110, 32]]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: origin.x + dx, y: origin.y + dy }] });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(40);
  const dragged = await image.boundingBox();
  assert.ok(Math.abs(dragged.x - initial.x - 110) < 20, `The horizontal displacement follows the finger (${dragged.x - initial.x}px)`);
  assert.ok(Math.abs(dragged.y - initial.y - 32) < 14, `The vertical drift remains free (${dragged.y - initial.y}px)`);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
});

test('a short slow free preview drag settles back to its original center', async t => {
  const page = await sampleDiary(t);
  const image = await holdPreview(page);
  const initial = await image.boundingBox();
  const origin = { x: initial.x + initial.width / 2, y: initial.y + initial.height / 2 };
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin] });
  for (const [dx, dy] of [[5, 8], [12, 17], [23, 31], [29, 39], [30, 40]]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: origin.x + dx, y: origin.y + dy }] });
    await page.waitForTimeout(40);
  }
  const dragged = await image.boundingBox();
  assert.ok(dragged.x > initial.x + 15 && dragged.y > initial.y + 20, 'The small drag visibly displaces both coordinates');
  await page.waitForTimeout(150);
  await page.evaluate(({ x, y }) => {
    window.previewReturnFrames = [];
    window.recordPreviewReturn = true;
    const record = () => {
      const image = document.querySelector('[data-testid="preview-pager"] img[src*="rainy-window"]');
      const box = image?.getBoundingClientRect();
      if (box) window.previewReturnFrames.push(Math.hypot(box.x - x, box.y - y));
      if (window.recordPreviewReturn) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  }, { x: initial.x, y: initial.y });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await page.waitForFunction(({ x, y }) => {
    const image = document.querySelector('[data-testid="preview-pager"] img[src*="rainy-window"]');
    const box = image?.getBoundingClientRect();
    return box && Math.abs(box.x - x) < 2 && Math.abs(box.y - y) < 2;
  }, { x: initial.x, y: initial.y });
  const returnFrames = await page.evaluate(() => {
    window.recordPreviewReturn = false;
    return window.previewReturnFrames;
  });
  const distance = Math.hypot(dragged.x - initial.x, dragged.y - initial.y);
  assert.ok(returnFrames.some(value => value > distance * .2 && value < distance * .8), 'The preview returns through intermediate positions instead of snapping to center');
  assert.equal(await page.getByTestId('preview-pager').count(), 1, 'A small drag keeps the preview open');
});

test('the preview uses a real blurred translucent backdrop that preserves the calendar underneath', async t => {
  const page = await sampleDiary(t);
  await holdPreview(page);
  const backdrop = await page.evaluate(() => {
    const explicit = document.querySelector('[data-testid="preview-backdrop"]');
    let overlay = document.querySelector('[data-testid="preview-pager"]').parentElement;
    while (overlay.parentElement && getComputedStyle(overlay).zIndex !== '20') overlay = overlay.parentElement;
    const element = explicit || overlay.firstElementChild;
    const style = getComputedStyle(element);
    const filters = [element, ...element.querySelectorAll('*')].map(node => {
      const computed = getComputedStyle(node);
      return computed.backdropFilter || computed.webkitBackdropFilter || 'none';
    });
    const parts = style.backgroundColor.match(/^rgba?\((.*)\)$/)?.[1].split(',').map(Number);
    return { filters, background: style.backgroundColor, alpha: parts?.length === 4 ? parts[3] : parts?.length === 3 ? 1 : 0, opacity: Number(style.opacity) };
  });
  assert.ok(backdrop.filters.some(filter => /blur\((?!0px)/.test(filter)), `The calendar is blurred by a real backdrop filter (${JSON.stringify(backdrop)})`);
  assert.ok(backdrop.alpha * backdrop.opacity < .9, `The backdrop stays translucent (${JSON.stringify(backdrop)})`);
  assert.match(await page.getByRole('button', { name: 'Choose month and year' }).innerText(), /September/);
});

test('boundary previews follow diagonal overswipes, return, and can still dismiss diagonally', async t => {
  const page = await sampleDiary(t);
  for (const [day, source, direction] of [[22, 'park-walk', 1], [29, 'morning-kitchen', -1]]) {
    const image = await holdPreview(page, day, source);
    const initial = await image.boundingBox();
    const x = initial.x + initial.width / 2;
    const y = initial.y + initial.height / 2;
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const offset of [12, 35, 65, 100]) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + direction * offset, y: y + offset * .3 }] });
      await page.waitForTimeout(25);
    }
    const dragged = await image.boundingBox();
    assert.ok(Math.abs(dragged.x - initial.x - direction * 100) < 18, `A boundary does not lock or strongly resist the held preview X (${JSON.stringify({ day, initial, dragged })})`);
    assert.ok(dragged.y - initial.y > 15, 'The boundary preview also follows Y');
    await page.waitForTimeout(150);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(({ source, x, y }) => {
      const box = document.querySelector(`[data-testid="preview-pager"] img[src*="${source}"]`)?.getBoundingClientRect();
      return box && Math.abs(box.x - x) < 2 && Math.abs(box.y - y) < 2;
    }, { source, x: initial.x, y: initial.y });
    await session.detach();
    await swipe(page, { x, y }, { x: x + direction * 60, y: y + 130 });
    await page.getByTestId('preview-pager').waitFor({ state: 'detached' });
  }
});

test('a short preview drag held at rest returns instead of using stale fling velocity', async t => {
  const page = await sampleDiary(t);
  const image = await holdPreview(page);
  const initial = await image.boundingBox();
  const x = initial.x + initial.width / 2;
  const y = initial.y + initial.height / 2;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (const offset of [5, 15, 45]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + offset, y: y + offset }] });
    await page.waitForTimeout(8);
  }
  // A real held pause: do not send another move to manufacture a low velocity.
  await page.waitForTimeout(150);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await page.waitForTimeout(500);
  const returned = await image.count() ? await image.boundingBox() : null;
  assert.ok(returned && Math.abs(returned.x - initial.x) < 2 && Math.abs(returned.y - initial.y) < 2,
    `The stationary release springs back to the same photo (${JSON.stringify({ initial, returned })})`);
  assert.equal(await page.getByTestId('preview-pager').count(), 1);
});

test('a new drag interrupts a returning preview without losing either coordinate', async t => {
  const page = await sampleDiary(t);
  const image = await holdPreview(page);
  const initial = await image.boundingBox();
  const x = initial.x + initial.width / 2;
  const y = initial.y + initial.height / 2;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (const offset of [8, 18, 30, 44, 45]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + offset, y: y + offset }] });
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(120);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(30);
  const returning = await image.boundingBox();
  assert.ok(returning.x > initial.x + 5 && returning.y > initial.y + 5, `The second touch starts while the spring is still returning (${JSON.stringify({ initial, returning })})`);
  const again = { x: returning.x + returning.width / 2, y: returning.y + returning.height / 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [again] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: again.x + 6, y: again.y + 6 }] });
  await page.waitForTimeout(20);
  const grabbed = await image.boundingBox();
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: again.x + 31, y: again.y + 26 }] });
  await page.waitForTimeout(20);
  const moved = await image.boundingBox();
  assert.ok(Math.abs(moved.x - grabbed.x - 25) < 14, `The interrupted spring follows the new horizontal motion (${JSON.stringify({ initial, returning, grabbed, moved })})`);
  assert.ok(Math.abs(moved.y - grabbed.y - 20) < 14, `The interrupted spring follows the new vertical motion (${JSON.stringify({ initial, returning, grabbed, moved })})`);
  await page.waitForTimeout(150);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await page.waitForFunction(({ x, y }) => {
    const box = document.querySelector('[data-testid="preview-pager"] img[src*="rainy-window"]')?.getBoundingClientRect();
    return box && Math.abs(box.x - x) < 2 && Math.abs(box.y - y) < 2;
  }, { x: initial.x, y: initial.y });
});

test('the persistent preview navigates photos with horizontal touch swipes', async t => {
  const page = await sampleDiary(t);
  await holdPreview(page);
  const pager = page.getByTestId('preview-pager');
  await swipe(page, { x: 300, y: 420 }, { x: 70, y: 420 });
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-testid="preview-pager"] img[src*="morning-kitchen"]');
    const box = image?.getBoundingClientRect();
    const page = image?.closest('[style*="transform"]');
    return box && Math.abs(box.x - (innerWidth - box.width) / 2) < 2 && page && getComputedStyle(page).pointerEvents === 'auto';
  });
  assert.equal(await pager.locator('img[src*="morning-kitchen"]').count(), 1);
  await swipe(page, { x: 70, y: 420 }, { x: 300, y: 420 });
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-testid="preview-pager"] img[src*="rainy-window"]');
    const box = image?.getBoundingClientRect();
    const page = image?.closest('[style*="transform"]');
    return box && Math.abs(box.x - (innerWidth - box.width) / 2) < 2 && page && getComputedStyle(page).pointerEvents === 'auto';
  });
});

test('account actions have a visible filled touch target on the web', async t => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.goto(server.url + '/auth');
  const button = page.getByRole('button', { name: 'Sign in', exact: true });
  await button.waitFor();
  const surface = await button.evaluate(element => {
    const style = getComputedStyle(element);
    return { height: element.getBoundingClientRect().height, background: style.backgroundColor };
  });
  assert.ok(surface.height >= 50, `The primary action is a full touch target (${surface.height}px)`);
  assert.notEqual(surface.background, 'rgba(0, 0, 0, 0)', 'The primary action has a visible surface');
});

test('a vertical preview swipe dismisses back to its calendar month', async t => {
  const page = await sampleDiary(t);
  await holdPreview(page);
  await swipe(page, { x: 195, y: 420 }, { x: 195, y: 660 });
  await page.getByTestId('preview-pager').waitFor({ state: 'detached' });
  assert.match(await page.getByRole('button', { name: 'Choose month and year' }).innerText(), /September/);
});

test('touching again during preview swipe dismissal cannot strand the overlay', async t => {
  const page = await sampleDiary(t);
  const image = await holdPreview(page);
  const box = await image.boundingBox();
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (const offset of [15, 35, 60, 90]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + offset }] });
    await page.waitForTimeout(16);
  }
  // Ending from rest selects the slower close, leaving time to touch again.
  await page.waitForTimeout(100);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const closingBox = await image.boundingBox();
  assert.ok(closingBox, 'The dismissing image remains mounted during the closing motion');
  const again = { x: closingBox.x + closingBox.width / 2, y: closingBox.y + closingBox.height / 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [again] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: again.x + 20, y: again.y - 20 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await page.getByTestId('preview-pager').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: /September 26.*photo moment/ }).click();
  await page.getByRole('button', { name: 'Back to calendar' }).waitFor();
});

test('swiping past the earliest and latest moments keeps the boundary photo visible', async t => {
  const page = await sampleDiary(t);
  await page.getByRole('button', { name: /September 22.*photo moment/ }).click();
  await page.getByText('A quiet walk before dinner.', { exact: true }).waitFor();
  await swipe(page, { x: 70, y: 330 }, { x: 300, y: 330 });
  await page.waitForTimeout(300);
  assert.equal(await page.getByText('A quiet walk before dinner.', { exact: true }).count(), 1);
  for (const caption of ['Rain on the way home.', 'The morning light stayed a little longer today.']) {
    await swipe(page, { x: 300, y: 330 }, { x: 70, y: 330 });
    await page.getByText(caption, { exact: true }).waitFor();
  }
  await swipe(page, { x: 300, y: 330 }, { x: 70, y: 330 });
  await page.waitForTimeout(300);
  assert.equal(await page.getByText('The morning light stayed a little longer today.', { exact: true }).count(), 1);
});

test('touch photo navigation remains available with reduced motion enabled', async t => {
  const page = await sampleDiary(t, { reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /September 26.*photo moment/ }).click();
  await page.getByText('Rain on the way home.', { exact: true }).waitFor();
  await swipe(page, { x: 300, y: 330 }, { x: 70, y: 330 });
  await page.getByText('The morning light stayed a little longer today.', { exact: true }).waitFor();
  await swipe(page, { x: 70, y: 330 }, { x: 300, y: 330 });
  await page.getByText('Rain on the way home.', { exact: true }).waitFor();
});

test('a library video plays inline and its visible player toggles mute by tapping', async t => {
  const page = await sampleDiary(t);
  const clip = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 240; canvas.height = 240;
    const context = canvas.getContext('2d');
    context.fillStyle = '#d6b589'; context.fillRect(0, 0, 240, 240);
    const stream = canvas.captureStream(20);
    const audio = new AudioContext();
    await audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain(); gain.gain.value = .01;
    const destination = audio.createMediaStreamDestination();
    oscillator.connect(gain).connect(destination);
    oscillator.start();
    for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
    const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = event => chunks.push(event.data);
    const stopped = new Promise(resolveStopped => { recorder.onstop = resolveStopped; });
    let frame = 0;
    recorder.start();
    const timer = setInterval(() => {
      context.fillStyle = frame++ % 2 ? '#94714e' : '#d6b589';
      context.fillRect(0, 0, 240, 240);
    }, 50);
    await new Promise(resolveDuration => setTimeout(resolveDuration, 1200));
    recorder.stop(); await stopped;
    clearInterval(timer); oscillator.stop();
    stream.getTracks().forEach(track => track.stop());
    await audio.close();
    const blob = new Blob(chunks, { type: mime });
    const base64 = await new Promise(resolveData => {
      const reader = new FileReader();
      reader.onload = () => resolveData(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
    return { base64, mime };
  });
  const fileSelection = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /September 27.*empty date/ }).click();
  const chooser = await fileSelection;
  await chooser.setFiles({ name: clip.mime === 'video/mp4' ? 'synthetic.mp4' : 'synthetic.webm', mimeType: clip.mime, buffer: Buffer.from(clip.base64, 'base64') });
  await page.getByRole('button', { name: 'Keep this moment' }).click();
  const video = page.getByTestId('moment-pager').locator('video');
  await video.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="moment-pager"] video')?.readyState >= 2);
  assert.equal(await video.evaluate(element => element.playsInline), true);
  await page.getByRole('button', { name: 'Mute video', exact: true }).click();
  assert.equal(await video.evaluate(element => element.muted), true);
  await page.getByRole('button', { name: 'Unmute video', exact: true }).click();
  assert.equal(await video.evaluate(element => element.muted), false);
  assert.equal(await video.evaluate(element => element.paused), false);
  assert.equal(await video.evaluate(element => element.error), null);
});
