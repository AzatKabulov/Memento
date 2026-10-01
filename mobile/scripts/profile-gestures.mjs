import { resolve } from 'node:path';
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
      await page.getByRole('button', { name: 'Open diary prototype' }).click();
      await page.getByRole('button', { name: 'Previous month', exact: true }).click();
      await page.getByRole('button', { name: /September 26.*photo moment/ }).click();
      await page.getByText('Rain on the way home.', { exact: true }).waitFor();
      // Decode adjacent originals before collecting motion data in both builds.
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        window.frameTimes = [];
        window.profileFrames = true;
        const record = time => {
          window.frameTimes.push(time);
          if (window.profileFrames) requestAnimationFrame(record);
        };
        requestAnimationFrame(record);
      });
      for (let round = 0; round < 3; round++) {
        await page.getByRole('button', { name: 'Next saved moment' }).click();
        await page.getByText('The morning light stayed a little longer today.', { exact: true }).waitFor();
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Previous saved moment' }).click();
        await page.getByText('Rain on the way home.', { exact: true }).waitFor();
        await page.waitForTimeout(300);
      }
      const result = await page.evaluate(() => {
        window.profileFrames = false;
        const gaps = window.frameTimes.slice(1).map((time, index) => time - window.frameTimes[index]).sort((a, b) => a - b);
        return {
          frameSamples: gaps.length,
          medianFrameMs: gaps[Math.floor(gaps.length * .5)],
          p95FrameMs: gaps[Math.floor(gaps.length * .95)],
          maxFrameMs: Math.max(...gaps),
          gapsOver50Ms: gaps.filter(gap => gap > 50).length,
          samplePhotoNetworkBytes: performance.getEntriesByType('resource')
            .filter(resource => resource.name.includes('/samples/'))
            .reduce((total, resource) => total + resource.encodedBodySize, 0),
        };
      });
      reports.push({ export: directory, browser: 'headless Chromium, 390 × 844, CPU ×4', workflow: 'three decoded next/previous photo round trips', ...result });
    } finally {
      await context.close();
      await server.close();
    }
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(reports, null, 2));
