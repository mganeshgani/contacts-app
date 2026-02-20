/**
 * Generate proper branded PNG assets for the ExcelContact Importer app.
 * Uses only Node.js built-in modules (no external dependencies).
 *
 * Generates:
 *  - icon.png          (1024×1024)
 *  - adaptive-icon.png (1024×1024)
 *  - splash.png        (1284×2778)
 *  - favicon.png       (48×48)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Brand colours
const PRIMARY = [37, 99, 235];       // #2563EB
const PRIMARY_DARK = [30, 64, 175];  // #1E40AF
const WHITE = [255, 255, 255];
const ACCENT = [96, 165, 250];       // #60A5FA

// ── PNG helpers ──────────────────────────────────────────────

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const payload = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload), 0);
  return Buffer.concat([len, payload, crc]);
}

function createPNG(width, height, pixelCallback) {
  // Build raw scanlines (filter byte 0 = None per row)
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 3);
    raw[rowOffset] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelCallback(x, y, width, height);
      const px = rowOffset + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  // Compress
  const compressed = zlib.deflateSync(raw, { level: 6 });

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing primitives ───────────────────────────────────────

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// ── Icon pixel shader (1024×1024) ────────────────────────────
// Rounded-rect gradient background with a stylised "EC" monogram

function iconPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const cornerR = w * 0.22; // rounded corner radius

  // Check if inside rounded rect (inset by 2% for padding)
  const pad = w * 0.02;
  const left = pad, right = w - pad, top = pad, bottom = h - pad;
  const rr = cornerR;

  function insideRoundedRect() {
    if (x >= left + rr && x <= right - rr) return true;
    if (y >= top + rr && y <= bottom - rr) return true;
    // Corners
    const corners = [
      [left + rr, top + rr],
      [right - rr, top + rr],
      [left + rr, bottom - rr],
      [right - rr, bottom - rr],
    ];
    for (const [cx2, cy2] of corners) {
      if (
        ((x < left + rr && cx2 === left + rr) || (x > right - rr && cx2 === right - rr)) &&
        ((y < top + rr && cy2 === top + rr) || (y > bottom - rr && cy2 === bottom - rr))
      ) {
        if (dist(x, y, cx2, cy2) <= rr) return true;
        return false;
      }
    }
    return true;
  }

  if (!insideRoundedRect()) return [244, 245, 249]; // light bg outside

  // Gradient background (top-left primary-dark to bottom-right primary)
  const diag = (x + y) / (w + h);
  const bg = lerpColor(PRIMARY_DARK, PRIMARY, diag);

  // --- Draw "E" letter on the left side ---
  const letterScale = w / 1024;
  const eLeft = 220 * letterScale;
  const eTop = 300 * letterScale;
  const eWidth = 250 * letterScale;
  const eHeight = 420 * letterScale;
  const eStroke = 70 * letterScale;

  const inE =
    // Vertical bar
    (x >= eLeft && x <= eLeft + eStroke && y >= eTop && y <= eTop + eHeight) ||
    // Top horizontal
    (x >= eLeft && x <= eLeft + eWidth && y >= eTop && y <= eTop + eStroke) ||
    // Middle horizontal
    (x >= eLeft && x <= eLeft + eWidth * 0.85 && y >= eTop + eHeight / 2 - eStroke / 2 && y <= eTop + eHeight / 2 + eStroke / 2) ||
    // Bottom horizontal
    (x >= eLeft && x <= eLeft + eWidth && y >= eTop + eHeight - eStroke && y <= eTop + eHeight);

  if (inE) return WHITE;

  // --- Draw "C" letter on the right side ---
  const cCx = 660 * letterScale;
  const cCy = 510 * letterScale;
  const cOuterR = 215 * letterScale;
  const cInnerR = 145 * letterScale;
  const cStroke2 = cOuterR - cInnerR;

  const d = dist(x, y, cCx, cCy);
  if (d <= cOuterR && d >= cInnerR) {
    // Make it a C shape: exclude the right opening (angle between -45° and +45°)
    const angle = Math.atan2(y - cCy, x - cCx) * (180 / Math.PI);
    if (angle < -50 || angle > 50) {
      return WHITE;
    }
  }

  // Small decorative dot (accent) in the upper-right area
  const dotCx = 800 * letterScale;
  const dotCy = 230 * letterScale;
  const dotR = 45 * letterScale;
  if (dist(x, y, dotCx, dotCy) <= dotR) return ACCENT;

  // Subtle inner glow along top edge
  const topGlow = Math.max(0, 1 - (y - top) / (h * 0.15));
  if (topGlow > 0) {
    return lerpColor(bg, [Math.min(bg[0] + 30, 255), Math.min(bg[1] + 30, 255), Math.min(bg[2] + 30, 255)], topGlow * 0.3);
  }

  return bg;
}

// ── Adaptive Icon pixel shader (has wider padding for Android masking) ─
function adaptiveIconPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;

  // Gradient fill — covers entire canvas (Android applies its own mask)
  const diag = (x + y) / (w + h);
  const bg = lerpColor(PRIMARY_DARK, PRIMARY, diag);

  // Scale letters to center with safe-zone padding (Android crops ~18% edges)
  const safePad = w * 0.18;
  const innerW = w - safePad * 2;
  const letterScale = innerW / 1024;
  const offsetX = safePad;
  const offsetY = safePad;

  // Adjusted local coordinates
  const lx = x - offsetX;
  const ly = y - offsetY;

  // "E" letter
  const eLeft = 220 * letterScale;
  const eTop = 300 * letterScale;
  const eWidth = 250 * letterScale;
  const eHeight = 420 * letterScale;
  const eStroke = 70 * letterScale;

  const inE =
    (lx >= eLeft && lx <= eLeft + eStroke && ly >= eTop && ly <= eTop + eHeight) ||
    (lx >= eLeft && lx <= eLeft + eWidth && ly >= eTop && ly <= eTop + eStroke) ||
    (lx >= eLeft && lx <= eLeft + eWidth * 0.85 && ly >= eTop + eHeight / 2 - eStroke / 2 && ly <= eTop + eHeight / 2 + eStroke / 2) ||
    (lx >= eLeft && lx <= eLeft + eWidth && ly >= eTop + eHeight - eStroke && ly <= eTop + eHeight);

  if (inE) return WHITE;

  // "C" letter
  const cCx = 660 * letterScale;
  const cCy = 510 * letterScale;
  const cOuterR = 215 * letterScale;
  const cInnerR = 145 * letterScale;

  const d = dist(lx, ly, cCx, cCy);
  if (d <= cOuterR && d >= cInnerR) {
    const angle = Math.atan2(ly - cCy, lx - cCx) * (180 / Math.PI);
    if (angle < -50 || angle > 50) return WHITE;
  }

  // Accent dot
  const dotCx = 800 * letterScale;
  const dotCy = 230 * letterScale;
  const dotR = 45 * letterScale;
  if (dist(lx, ly, dotCx, dotCy) <= dotR) return ACCENT;

  return bg;
}

// ── Splash pixel shader (1284×2778) ──────────────────────────
function splashPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;

  // Vertical gradient background
  const t = y / h;
  const bg = lerpColor(PRIMARY_DARK, PRIMARY, t);

  // Central circle glow
  const d = dist(x, y, cx, cy);
  const glowR = Math.min(w, h) * 0.35;
  if (d < glowR) {
    const glowT = 1 - d / glowR;
    return lerpColor(bg, ACCENT, glowT * 0.15);
  }

  // "E" and "C" centered
  const letterScale = w / 1284 * 1.2;
  const lettersWidth = 600 * letterScale;
  const offsetX = cx - lettersWidth / 2;
  const offsetY = cy - 240 * letterScale;
  const lx = x - offsetX;
  const ly = y - offsetY;

  // "E"
  const eLeft = 50 * letterScale;
  const eTop = 40 * letterScale;
  const eWidth = 200 * letterScale;
  const eHeight = 340 * letterScale;
  const eStroke = 56 * letterScale;

  const inE =
    (lx >= eLeft && lx <= eLeft + eStroke && ly >= eTop && ly <= eTop + eHeight) ||
    (lx >= eLeft && lx <= eLeft + eWidth && ly >= eTop && ly <= eTop + eStroke) ||
    (lx >= eLeft && lx <= eLeft + eWidth * 0.85 && ly >= eTop + eHeight / 2 - eStroke / 2 && ly <= eTop + eHeight / 2 + eStroke / 2) ||
    (lx >= eLeft && lx <= eLeft + eWidth && ly >= eTop + eHeight - eStroke && ly <= eTop + eHeight);
  if (inE) return WHITE;

  // "C"
  const cCx = 480 * letterScale;
  const cCy = 210 * letterScale;
  const cOuterR = 175 * letterScale;
  const cInnerR = 118 * letterScale;
  const d2 = dist(lx, ly, cCx, cCy);
  if (d2 <= cOuterR && d2 >= cInnerR) {
    const angle = Math.atan2(ly - cCy, lx - cCx) * (180 / Math.PI);
    if (angle < -50 || angle > 50) return WHITE;
  }

  // Accent dot
  const dotCx = 530 * letterScale;
  const dotCy = 40 * letterScale;
  const dotR = 30 * letterScale;
  if (dist(lx, ly, dotCx, dotCy) <= dotR) return ACCENT;

  // Horizontal line under letters (decorative)
  const lineY = offsetY + 380 * letterScale;
  const lineHalf = 120 * letterScale;
  if (y >= lineY && y <= lineY + 4 * letterScale && x >= cx - lineHalf && x <= cx + lineHalf) {
    return lerpColor(WHITE, bg, 0.3);
  }

  return bg;
}

// ── Favicon pixel shader (48×48) ────────────────────────────
function faviconPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 1;

  // Circle mask
  if (dist(x, y, cx, cy) > r) return [244, 245, 249];

  // Gradient fill
  const diag = (x + y) / (w + h);
  const bg = lerpColor(PRIMARY_DARK, PRIMARY, diag);

  // Simple "E" centred – scaled for tiny size
  const s = w / 48;
  const eL = 12 * s, eT = 14 * s, eW = 24 * s, eH = 20 * s, eS = 5 * s;

  const inE =
    (x >= eL && x <= eL + eS && y >= eT && y <= eT + eH) ||
    (x >= eL && x <= eL + eW && y >= eT && y <= eT + eS) ||
    (x >= eL && x <= eL + eW * 0.8 && y >= eT + eH / 2 - eS / 2 && y <= eT + eH / 2 + eS / 2) ||
    (x >= eL && x <= eL + eW && y >= eT + eH - eS && y <= eT + eH);

  if (inE) return WHITE;

  return bg;
}

// ── Generate all assets ──────────────────────────────────────

const assetsDir = path.join(__dirname, '..', 'assets');

console.log('Generating icon.png (1024x1024)...');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), createPNG(1024, 1024, iconPixel));

console.log('Generating adaptive-icon.png (1024x1024)...');
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), createPNG(1024, 1024, adaptiveIconPixel));

console.log('Generating splash.png (1284x2778)...');
fs.writeFileSync(path.join(assetsDir, 'splash.png'), createPNG(1284, 2778, splashPixel));

console.log('Generating favicon.png (48x48)...');
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), createPNG(48, 48, faviconPixel));

console.log('\nAll assets generated successfully!');

// Print sizes
for (const f of ['icon.png', 'adaptive-icon.png', 'splash.png', 'favicon.png']) {
  const stat = fs.statSync(path.join(assetsDir, f));
  console.log(`  ${f}: ${(stat.size / 1024).toFixed(1)} KB`);
}
