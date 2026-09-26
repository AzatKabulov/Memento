import assert from "node:assert/strict";
import test from "node:test";
import { crc32Hex, crc32Update, paddedSize, readTarHeader, tarHeader } from "../src/archive/tar.ts";

test("archive headers round-trip and reject damaged metadata", () => {
  const header = tarHeader("media/2026-09-27.jpg", 12345);
  assert.deepEqual(readTarHeader(header), { name: "media/2026-09-27.jpg", size: 12345 });
  header[20] ^= 1;
  assert.throws(() => readTarHeader(header), /damaged/);
  assert.equal(readTarHeader(new Uint8Array(512)), null);
});

test("archive paths and sizes cannot escape the format", () => {
  assert.throws(() => tarHeader("../private.jpg", -1));
  assert.throws(() => readTarHeader(tarHeader("../private.jpg", 1)), /invalid path/);
  assert.equal(paddedSize(513), 1024);
});

test("media checksum is stable across streamed chunks", () => {
  const bytes = new TextEncoder().encode("123456789");
  let state = crc32Update(0xffffffff, bytes.subarray(0, 4));
  state = crc32Update(state, bytes.subarray(4));
  assert.equal(crc32Hex(state), "cbf43926");
});
