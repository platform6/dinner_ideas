// One-off script that derives the app's brand assets from the source `logo.png`
// (a chef-hatted dinosaur over a "Dino Recipes" wordmark). Run with:
//   node scripts/prepare-logo-assets.mjs
// No external image dependency — PNG decode/encode and resampling are done here with
// only `node:zlib`. The output files under public/ are checked in; regenerate only if
// the source logo or the crop/key parameters below change.
//
// What it does:
//   1. decode logo.png (8-bit RGB)
//   2. crop to the dinosaur (drops the "Dino Recipes" wordmark + leaf divider)
//   3. trim to the ink bounding box
//   4. key the near-white background to transparent by a luminance ramp
//   5. box-downscale (on premultiplied alpha) to each target size
//   6. write: dino-mark, icon-192, icon-512, icon-maskable-512, favicon-32, apple-touch-icon

import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('../logo.png', import.meta.url);
const OUT_DIR = new URL('../public/', import.meta.url);

// --- source-specific parameters (see logo.png analysis) -------------------------------------
const DINO_CROP = { x0: 285, y0: 145, x1: 950, y1: 865 }; // generous box around the dinosaur only
const KEY_OPAQUE_BELOW = 205; // luma <= this  -> fully opaque
const KEY_CLEAR_ABOVE = 245; //  luma >= this  -> fully transparent
const PAPER_BASE = [255, 253, 250]; // opaque backdrop for maskable / apple-touch tiles

// --- tiny PNG codec (RGBA, 8-bit, non-interlaced) ------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function decodePng(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('not a PNG');
  let off = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG not supported');
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG (bitDepth ${bitDepth}, colorType ${colorType})`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height); // unfiltered, `channels`-per-pixel
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowIn = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const rowOut = out.subarray(y * stride, y * stride + stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, (y - 1) * stride + stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? rowOut[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= channels ? prev[i - channels] : 0;
      let v = rowIn[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      rowOut[i] = v & 0xff;
    }
  }
  // normalize to RGBA
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    rgba[p * 4] = out[p * channels];
    rgba[p * 4 + 1] = out[p * channels + 1];
    rgba[p * 4 + 2] = out[p * channels + 2];
    rgba[p * 4 + 3] = channels === 4 ? out[p * channels + 3] : 255;
  }
  return { width, height, data: rgba };
}

function encodePng({ width, height, data }) {
  const bpp = 4;
  const stride = width * bpp;
  const rawFramed = Buffer.alloc((stride + 1) * height);
  const cur = Buffer.from(data.buffer, data.byteOffset, data.length);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  const line = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const row = cur.subarray(y * stride, y * stride + stride);
    const prev = y > 0 ? cur.subarray((y - 1) * stride, (y - 1) * stride + stride) : null;
    let bestType = 0;
    let bestSum = Infinity;
    let bestLine = null;
    for (let ft = 0; ft <= 4; ft++) {
      let sum = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? row[i - bpp] : 0;
        const b = prev ? prev[i] : 0;
        const c = prev && i >= bpp ? prev[i - bpp] : 0;
        let v;
        if (ft === 0) v = row[i];
        else if (ft === 1) v = row[i] - a;
        else if (ft === 2) v = row[i] - b;
        else if (ft === 3) v = row[i] - ((a + b) >> 1);
        else v = row[i] - paeth(a, b, c);
        v &= 0xff;
        line[i] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) {
        bestSum = sum;
        bestType = ft;
        bestLine = Buffer.from(line);
      }
    }
    rawFramed[y * (stride + 1)] = bestType;
    bestLine.copy(rawFramed, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = deflateSync(rawFramed, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- image ops ----------------------------------------------------------------------------
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function crop(img, { x0, y0, x1, y1 }) {
  const w = x1 - x0;
  const h = y1 - y0;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y0 + y) * img.width + (x0 + x)) * 4;
      const d = (y * w + x) * 4;
      data[d] = img.data[s];
      data[d + 1] = img.data[s + 1];
      data[d + 2] = img.data[s + 2];
      data[d + 3] = img.data[s + 3];
    }
  }
  return { width: w, height: h, data };
}

// Flatten the line art to a single flat colour + an alpha key. The source logo is one dark
// green hue on cream; snapping every pixel's RGB to `INK` (the app's brand.500 olive) and
// quantising alpha to a few steps keeps large flat runs, so the RGBA PNGs stay small and the
// mark matches the app palette exactly.
const INK = [74, 103, 65]; // brand.500, "Kitchen Table" theme
const ALPHA_STEPS = 8;

/** Replace RGB with INK everywhere and alpha with a quantised luminance key. */
function keyBackground(img) {
  const out = new Uint8ClampedArray(img.data.length);
  const step = 255 / (ALPHA_STEPS - 1);
  for (let p = 0; p < img.width * img.height; p++) {
    const L = luma(img.data[p * 4], img.data[p * 4 + 1], img.data[p * 4 + 2]);
    let a;
    if (L <= KEY_OPAQUE_BELOW) a = 255;
    else if (L >= KEY_CLEAR_ABOVE) a = 0;
    else a = (1 - (L - KEY_OPAQUE_BELOW) / (KEY_CLEAR_ABOVE - KEY_OPAQUE_BELOW)) * 255;
    out[p * 4] = INK[0];
    out[p * 4 + 1] = INK[1];
    out[p * 4 + 2] = INK[2];
    out[p * 4 + 3] = Math.round(Math.round(a / step) * step);
  }
  return { width: img.width, height: img.height, data: out };
}

/** Tight bounding box of pixels with alpha above `minA`. */
function alphaBBox(img, minA = 8) {
  let x0 = img.width;
  let y0 = img.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > minA) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

/** Box-average resample (downscale) done on premultiplied alpha to avoid edge fringing. */
function resize(img, dstW, dstH) {
  const { width: sw, height: sh, data: sd } = img;
  const out = new Uint8ClampedArray(dstW * dstH * 4);
  for (let dy = 0; dy < dstH; dy++) {
    const sy0 = Math.floor((dy * sh) / dstH);
    const sy1 = Math.max(sy0 + 1, Math.floor(((dy + 1) * sh) / dstH));
    for (let dx = 0; dx < dstW; dx++) {
      const sx0 = Math.floor((dx * sw) / dstW);
      const sx1 = Math.max(sx0 + 1, Math.floor(((dx + 1) * sw) / dstW));
      let r = 0;
      let g = 0;
      let b = 0;
      let aSum = 0; // sum of source alpha, 0..255 units
      let n = 0;
      for (let y = sy0; y < sy1; y++) {
        for (let x = sx0; x < sx1; x++) {
          const s = (y * sw + x) * 4;
          const sa = sd[s + 3] / 255;
          r += sd[s] * sa;
          g += sd[s + 1] * sa;
          b += sd[s + 2] * sa;
          aSum += sd[s + 3];
          n++;
        }
      }
      const d = (dy * dstW + dx) * 4;
      const meanA = aSum / n; // 0..255
      if (aSum < 1) {
        out[d] = out[d + 1] = out[d + 2] = out[d + 3] = 0;
      } else {
        // mean colour, un-premultiplied: sum(colour*sa) / sum(sa), and sum(sa) = aSum/255
        out[d] = Math.round((r * 255) / aSum);
        out[d + 1] = Math.round((g * 255) / aSum);
        out[d + 2] = Math.round((b * 255) / aSum);
        out[d + 3] = Math.round(meanA);
      }
    }
  }
  return { width: dstW, height: dstH, data: out };
}

/** Scale `img` to fit `frac` of a `size` square and centre it; optional opaque backdrop. */
function squareCanvas(img, size, frac, bg /* [r,g,b] | null */) {
  const scale = Math.min((size * frac) / img.width, (size * frac) / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const scaled = resize(img, w, h);
  const data = new Uint8ClampedArray(size * size * 4);
  if (bg) {
    for (let p = 0; p < size * size; p++) {
      data[p * 4] = bg[0];
      data[p * 4 + 1] = bg[1];
      data[p * 4 + 2] = bg[2];
      data[p * 4 + 3] = 255;
    }
  }
  const ox = Math.floor((size - w) / 2);
  const oy = Math.floor((size - h) / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      const d = ((oy + y) * size + (ox + x)) * 4;
      const a = scaled.data[s + 3] / 255;
      if (bg) {
        data[d] = Math.round(scaled.data[s] * a + data[d] * (1 - a));
        data[d + 1] = Math.round(scaled.data[s + 1] * a + data[d + 1] * (1 - a));
        data[d + 2] = Math.round(scaled.data[s + 2] * a + data[d + 2] * (1 - a));
        data[d + 3] = 255;
      } else {
        data[d] = scaled.data[s];
        data[d + 1] = scaled.data[s + 1];
        data[d + 2] = scaled.data[s + 2];
        data[d + 3] = scaled.data[s + 3];
      }
    }
  }
  return { width: size, height: size, data };
}

// --- run --------------------------------------------------------------------------------
const src = decodePng(readFileSync(SRC));
console.log(`source: ${src.width}x${src.height}`);

const keyed = keyBackground(crop(src, DINO_CROP));
const bb = alphaBBox(keyed);
const dino = crop(keyed, bb);
console.log(`dino trimmed: ${dino.width}x${dino.height}`);

function write(name, img) {
  const path = new URL(name, OUT_DIR);
  const bytes = encodePng(img);
  writeFileSync(path, bytes);
  console.log(`wrote public/${name}  ${img.width}x${img.height}  ${(bytes.length / 1024).toFixed(1)} KB`);
}

// in-app display mark: keep aspect, longest side 160, transparent
{
  const longest = Math.max(dino.width, dino.height);
  const s = 160 / longest;
  write('dino-mark.png', resize(dino, Math.round(dino.width * s), Math.round(dino.height * s)));
}
// PWA "any" icons: transparent, ~82% of the square
write('icon-192.png', squareCanvas(dino, 192, 0.82, null));
write('icon-512.png', squareCanvas(dino, 512, 0.82, null));
// PWA maskable: opaque paper backdrop, ~62% safe zone
write('icon-maskable-512.png', squareCanvas(dino, 512, 0.62, PAPER_BASE));
// favicon: transparent, fills most of the 32px square
write('favicon-32.png', squareCanvas(dino, 32, 0.92, null));
// apple-touch: opaque paper backdrop (iOS composites on an opaque tile)
write('apple-touch-icon.png', squareCanvas(dino, 180, 0.72, PAPER_BASE));

console.log('done.');
