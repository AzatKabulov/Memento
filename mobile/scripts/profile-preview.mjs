import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { serveExport } from '../tests/browserServer.mjs';

const playwright = await import(process.env.MEMENTO_PLAYWRIGHT_PATH
  ? pathToFileURL(resolve(process.env.MEMENTO_PLAYWRIGHT_PATH)).href
  : 'playwright');
const browser = await playwright.chromium.launch({
  headless: true,
  ...(process.env.MEMENTO_BROWSER_PATH ? { executablePath: process.env.MEMENTO_BROWSER_PATH } : {}),
});
const reports = [];
try {
  for (const directory of process.argv.slice(2)) {
    const server = await serveExport(directory);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await context.addInitScript(() => {
        const RealDate = Date;
        window.Date = class extends RealDate {
          constructor(...args) { super(...(args.length ? args : ['2026-10-01T12:00:00'])); }
          static now() { return RealDate.now(); }
        };
      });
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(server.url);
      await page.getByRole('button', { name: /Open diary prototype|Explore sample diary/ }).click();
      await page.getByRole('button', { name: 'Previous month', exact: true }).click();
      await page.waitForTimeout(400);
      const tile = await page.getByRole('button', { name: /September 26.*photo moment/ }).boundingBox();
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }] });
      await page.waitForTimeout(650);
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const image = page.getByTestId('preview-pager').locator('img[src*="rainy-window"]').first();
      await image.waitFor();
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
      await page.waitForTimeout(350);
      const box = await image.boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const runs = [];
      for (let run = 0; run < 3; run++) {
        await page.evaluate(() => {
          window.frameTimes = [];
          window.profileFrames = true;
          const generation = window.frameGeneration = (window.frameGeneration || 0) + 1;
          const record = time => {
            if (!window.profileFrames || window.frameGeneration !== generation) return;
            window.frameTimes.push(time);
            requestAnimationFrame(record);
          };
          requestAnimationFrame(record);
        });
        for (let drag = 0; drag < 3; drag++) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          for (const [dx, dy] of [[5, 8], [15, 25], [35, 55], [55, 85], [35, 40], [5, 0], [-25, -30], [-40, -50]]) {
            await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
            await page.waitForTimeout(16);
          }
          // Force a genuinely slow final move in both builds. The baseline can
          // retain stale velocity through a stationary hold alone.
          for (const [dx, dy] of [[-43, -53], [-45, -55]]) {
            await page.waitForTimeout(100);
            await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
          }
          await page.waitForTimeout(150);
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForTimeout(400);
          const returned = await image.count() ? await image.boundingBox() : null;
          assert.ok(returned && Math.abs(returned.x - box.x) < 2 && Math.abs(returned.y - box.y) < 2,
            `Every compared drag must return to the same preview (${JSON.stringify({ directory, run, drag, initial: box, returned })})`);
        }
        runs.push(await page.evaluate(() => {
          window.profileFrames = false;
          const gaps = window.frameTimes.slice(1).map((time, index) => time - window.frameTimes[index]).sort((a, b) => a - b);
          return {
            frameSamples: gaps.length,
            medianFrameMs: gaps[Math.floor(gaps.length * .5)],
            p95FrameMs: gaps[Math.floor(gaps.length * .95)],
            maxFrameMs: Math.max(...gaps),
            gapsOver50Ms: gaps.filter(gap => gap > 50).length,
          };
        }));
      }
      const backdrop = await page.evaluate(() => {
        const element = document.querySelector('[data-testid="preview-backdrop"]');
        if (!element) return null;
        const style = getComputedStyle(element);
        return { filter: style.backdropFilter, background: style.backgroundColor, opacity: style.opacity };
      });
      reports.push({ export: directory, browser: 'headless Chromium, 390 × 844, CPU ×4', workflow: 'three runs of three warm preview down-right/reversal/spring-return drags', backdrop, runs });
    } finally {
      await context.close();
      await server.close();
    }
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(reports, null, 2));
