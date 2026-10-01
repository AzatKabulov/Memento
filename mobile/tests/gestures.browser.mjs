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

async function holdPreview(page) {
  const tile = await page.getByRole('button', { name: /September 26.*photo moment/ }).boundingBox();
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }] });
  await page.waitForTimeout(650);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await page.getByTestId('preview-pager').waitFor();
  await page.waitForTimeout(100);
  return page.getByTestId('preview-pager').locator('img[src*="rainy-window"]').first();
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
