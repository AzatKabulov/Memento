export const TAR_BLOCK = 512;

function putAscii(
  target: Uint8Array,
  offset: number,
  length: number,
  text: string,
) {
  if (!/^[\x20-\x7e]*$/.test(text) || text.length > length)
    throw new Error(
      "Archive path is too long or contains unsupported characters.",
    );
  for (let index = 0; index < text.length; index += 1)
    target[offset + index] = text.charCodeAt(index);
}

function putOctal(
  target: Uint8Array,
  offset: number,
  width: number,
  value: number,
) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("Archive contains an invalid size.");
  const digits = value.toString(8);
  if (digits.length > width - 1) throw new Error("Archive entry is too large.");
  putAscii(target, offset, width, digits.padStart(width - 1, "0"));
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  let end = start;
  while (end < start + length && bytes[end]) end += 1;
  return String.fromCharCode(...bytes.subarray(start, end));
}

function octal(bytes: Uint8Array, start: number, length: number) {
  const value = ascii(bytes, start, length).trim();
  if (!/^[0-7]+$/.test(value))
    throw new Error("Archive has an invalid header.");
  return parseInt(value, 8);
}

export function tarHeader(name: string, size: number) {
  const header = new Uint8Array(TAR_BLOCK);
  putAscii(header, 0, 100, name);
  putOctal(header, 100, 8, 0o600);
  putOctal(header, 108, 8, 0);
  putOctal(header, 116, 8, 0);
  putOctal(header, 124, 12, size);
  putOctal(header, 136, 12, 0);
  header.fill(32, 148, 156);
  header[156] = 48;
  putAscii(header, 257, 6, "ustar");
  putAscii(header, 263, 2, "00");
  let checksum = 0;
  for (const byte of header) checksum += byte;
  putOctal(header, 148, 8, checksum);
  return header;
}

export function readTarHeader(bytes: Uint8Array) {
  if (bytes.length !== TAR_BLOCK)
    throw new Error("Archive ended unexpectedly.");
  if (bytes.every((byte) => byte === 0)) return null;
  const expected = octal(bytes, 148, 8);
  let checksum = 0;
  for (let index = 0; index < TAR_BLOCK; index += 1)
    checksum += index >= 148 && index < 156 ? 32 : bytes[index];
  if (checksum !== expected || ascii(bytes, 257, 5) !== "ustar")
    throw new Error("Archive header is damaged.");
  if (bytes[156] !== 0 && bytes[156] !== 48)
    throw new Error("Archive contains an unsupported entry.");
  const name = ascii(bytes, 0, 100);
  if (!name || name.includes("..") || name.startsWith("/"))
    throw new Error("Archive contains an invalid path.");
  return { name, size: octal(bytes, 124, 12) };
}

export function paddedSize(size: number) {
  return Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
}

export function crc32Update(state: number, bytes: Uint8Array) {
  let next = state;
  for (const byte of bytes) {
    next ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      next = next & 1 ? (next >>> 1) ^ 0xedb88320 : next >>> 1;
  }
  return next >>> 0;
}

export function crc32Hex(state: number) {
  return (~state >>> 0).toString(16).padStart(8, "0");
}
