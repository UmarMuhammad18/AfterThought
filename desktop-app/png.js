// Tiny PNG encoder for the desktop app's icons, so the repo needs no binary
// image assets. Used by main.ts (tray icon) and scripts/build.js (app icon).
const zlib = require('zlib');

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encode RGBA pixels (width*height*4 bytes) as a PNG buffer. */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * The AfterThought mark: a filled circle, optionally with a ring around it
 * (app icon), anti-aliased at the edges.
 */
function drawMark(size, { color = '#60a5fa', background = null, ring = false } = {}) {
  const [r, g, b] = hexToRgb(color);
  const bg = background ? hexToRgb(background) : null;
  const px = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const dot = size * (ring ? 0.22 : 0.4);
  const ringOuter = size * 0.4;
  const ringInner = size * 0.33;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      const edge = (radius) => Math.max(0, Math.min(1, radius - d + 0.5));
      let a = edge(dot);
      if (ring) a = Math.max(a, Math.min(edge(ringOuter), 1 - edge(ringInner)));
      const i = (y * size + x) * 4;
      if (bg) {
        // Rounded-square background for the app icon.
        const corner = size * 0.22;
        const qx = Math.max(Math.abs(x - c) - (size / 2 - corner), 0);
        const qy = Math.max(Math.abs(y - c) - (size / 2 - corner), 0);
        const inside = Math.max(0, Math.min(1, corner - Math.hypot(qx, qy) + 0.5));
        px[i] = Math.round(bg[0] * (1 - a) + r * a);
        px[i + 1] = Math.round(bg[1] * (1 - a) + g * a);
        px[i + 2] = Math.round(bg[2] * (1 - a) + b * a);
        px[i + 3] = Math.round(255 * inside);
      } else {
        px[i] = r;
        px[i + 1] = g;
        px[i + 2] = b;
        px[i + 3] = Math.round(255 * a);
      }
    }
  }
  return encodePng(size, size, px);
}

module.exports = { encodePng, drawMark };
