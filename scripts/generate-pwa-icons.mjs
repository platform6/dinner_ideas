// One-off script that generates the app's PWA icons as plain PNGs, with no
// external image dependency or asset download. Run with:
//   node scripts/generate-pwa-icons.mjs
// Regenerate only if the design below changes — the output files are checked in.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

// Simple two-tone "plate" icon: teal background, white circle, darker teal ring —
// legible at small sizes and safe within a maskable icon's center "safe zone".
function pixelAt(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const plateRadius = size * 0.32;
  const ringRadius = size * 0.36;

  const teal = [44, 122, 123, 255]; // Chakra teal.600
  const darkTeal = [35, 96, 97, 255];
  const white = [255, 255, 255, 255];

  if (dist <= plateRadius) return white;
  if (dist <= ringRadius) return darkTeal;
  return teal;
}

function buildPng(size) {
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y, size);
      const px = rowStart + 1 + x * 4;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = deflateSync(raw);

  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [192, 512]) {
  const path = new URL(`../public/icon-${size}.png`, import.meta.url);
  writeFileSync(path, buildPng(size));
  console.log(`wrote ${path.pathname} (${size}x${size})`);
}
