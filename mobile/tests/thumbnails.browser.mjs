import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { serveExport } from './browserServer.mjs';
const playwright = await import(process.env.MEMENTO_PLAYWRIGHT_PATH ? pathToFileURL(resolve(process.env.MEMENTO_PLAYWRIGHT_PATH)).href : 'playwright');
test('private calendar thumbnails are small, reused after reload, and removed on sign-out', async () => {
  const server = await serveExport(resolve(process.env.MEMENTO_TEST_DIST || 'dist-preview'));
  const browser = await playwright.chromium.launch({ headless: true, ...(process.env.MEMENTO_BROWSER_PATH ? { executablePath: process.env.MEMENTO_BROWSER_PATH } : {}) });
  try {
    const page = await browser.newPage();
    await page.goto(server.url);
    const source = await readFile('src/lib/photoThumbnails.web.ts', 'utf8');
    const script = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText + '\nactivatePhotoThumbnails("alice"); window.thumbnailModule = { preparePhotoThumbnail, cachedPhotoThumbnail, clearPhotoThumbnails };';
    const inject = async () => {
      await page.addScriptTag({ type: 'module', content: script });
      await page.waitForFunction(() => !!window.thumbnailModule);
    };
    await inject();
    const stats = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 1800;
      const ctx = canvas.getContext('2d'); const gradient = ctx.createLinearGradient(0, 0, 2400, 1800);
      gradient.addColorStop(0, '#d5b989'); gradient.addColorStop(1, '#342418'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 2400, 1800);
      const original = canvas.toDataURL('image/png');
      const thumb = await window.thumbnailModule.preparePhotoThumbnail('alice', 'alice/photo.jpg', original);
      const image = new Image(); image.src = thumb; await image.decode();
      return { original: original.length, thumbnail: thumb.length, width: image.width, height: image.height };
    });
    assert.ok(stats.width <= 512 && stats.height <= 512);
    assert.ok(stats.thumbnail < stats.original / 10, JSON.stringify(stats));
    console.log('thumbnail measurement', stats);
    await page.reload(); await inject();
    assert.equal(await page.evaluate(() => window.thumbnailModule.cachedPhotoThumbnail('bob', 'alice/photo.jpg')), undefined);
    assert.ok(await page.evaluate(() => window.thumbnailModule.cachedPhotoThumbnail('alice', 'alice/photo.jpg')));
    await page.evaluate(() => window.thumbnailModule.clearPhotoThumbnails('alice'));
    assert.equal(await page.evaluate(() => window.thumbnailModule.cachedPhotoThumbnail('alice', 'alice/photo.jpg')), undefined);
  } finally { await browser.close(); await server.close(); }
});

test('removing a photo does not wait for decoding or let stale preparation restore its thumbnail', async () => {
  const server = await serveExport(resolve(process.env.MEMENTO_TEST_DIST || 'dist-preview'));
  const browser = await playwright.chromium.launch({ headless: true, ...(process.env.MEMENTO_BROWSER_PATH ? { executablePath: process.env.MEMENTO_BROWSER_PATH } : {}) });
  try {
    const page = await browser.newPage();
    await page.goto(server.url);
    const source = await readFile('src/lib/photoThumbnails.web.ts', 'utf8');
    const script = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      + '\nactivatePhotoThumbnails("alice"); window.thumbnailModule = { preparePhotoThumbnail, cachedPhotoThumbnail, removePhotoThumbnail };';
    const inject = async () => {
      await page.addScriptTag({ type: 'module', content: script });
      await page.waitForFunction(() => !!window.thumbnailModule);
    };
    await inject();
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 600;
      canvas.getContext('2d').fillRect(0, 0, 900, 600);
      const originalDecode = HTMLImageElement.prototype.decode;
      let started;
      window.thumbnailDecodeStarted = new Promise(resolveStarted => { started = resolveStarted; });
      const gate = new Promise(resolveGate => { window.releaseThumbnailDecode = resolveGate; });
      HTMLImageElement.prototype.decode = function () {
        started();
        return gate.then(() => originalDecode.call(this));
      };
      window.restoreThumbnailDecode = () => { HTMLImageElement.prototype.decode = originalDecode; };
      window.pendingThumbnail = window.thumbnailModule.preparePhotoThumbnail('alice', 'alice/pending.jpg', canvas.toDataURL('image/png'));
    });
    await page.evaluate(() => window.thumbnailDecodeStarted);
    const removedBeforeDecode = await page.evaluate(() => Promise.race([
      window.thumbnailModule.removePhotoThumbnail('alice', 'alice/pending.jpg').then(() => true),
      new Promise(resolveTimeout => setTimeout(() => resolveTimeout(false), 2000)),
    ]));
    assert.equal(removedBeforeDecode, true, 'Deletion finishes while Image.decode is still blocked');
    const prepared = await page.evaluate(async () => {
      window.releaseThumbnailDecode();
      window.restoreThumbnailDecode();
      return window.pendingThumbnail;
    });
    assert.equal(prepared, undefined, 'The stale preparation is discarded after decode finishes');
    assert.equal(await page.evaluate(() => window.thumbnailModule.cachedPhotoThumbnail('alice', 'alice/pending.jpg')), undefined);
    // Reload drops in-memory invalidation: this verifies that persistent storage
    // was not repopulated either, rather than merely hidden by a tombstone.
    await page.reload();
    await inject();
    assert.equal(await page.evaluate(() => window.thumbnailModule.cachedPhotoThumbnail('alice', 'alice/pending.jpg')), undefined);
  } finally { await browser.close(); await server.close(); }
});
