const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, getPixelRgba) {
  // CRC table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function writeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);

    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);

    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = writeChunk('IHDR', ihdr);

  // Raw Scanlines: each row starts with filter byte 0 (None)
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = writeChunk('IDAT', compressed);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Generate 1200x630 Social Card
const width = 1200;
const height = 630;

const pngBuffer = createPng(width, height, (x, y, w, h) => {
  // Background: Deep dark slate with subtle crimson radial vignette
  const dx = (x - w / 2) / (w / 2);
  const dy = (y - h / 2) / (h / 2);
  const distSq = dx * dx + dy * dy;

  let bgR = 15;
  let bgG = 23;
  let bgB = 42;

  // Add crimson glow around center-left where the brand icon sits
  const iconCenterX = 320;
  const iconCenterY = 315;
  const distToIcon = Math.hypot(x - iconCenterX, y - iconCenterY);

  if (distToIcon < 380) {
    const glow = Math.cos((distToIcon / 380) * (Math.PI / 2));
    bgR = Math.min(255, bgR + Math.round(glow * 90));
    bgG = Math.min(255, bgG + Math.round(glow * 15));
    bgB = Math.min(255, bgB + Math.round(glow * 40));
  }

  // Draw circular badge icon at (320, 315) radius 180
  const badgeRadius = 180;
  if (distToIcon <= badgeRadius) {
    // Red-rose gradient badge
    const badgeRatio = (y - (iconCenterY - badgeRadius)) / (badgeRadius * 2);
    const borderDist = Math.abs(distToIcon - badgeRadius);
    
    // Outer white rim
    if (borderDist < 6) {
      return [255, 255, 255, 220];
    }

    // Badge fill gradient
    const br = Math.round(244 * (1 - badgeRatio) + 190 * badgeRatio);
    const bg = Math.round(63 * (1 - badgeRatio) + 18 * badgeRatio);
    const bb = Math.round(94 * (1 - badgeRatio) + 60 * badgeRatio);

    // Inner PDF sheet
    // Sheet bounds: left=230, right=410, top=190, bottom=440
    const sheetL = 230;
    const sheetR = 410;
    const sheetT = 190;
    const sheetB = 440;

    if (x >= sheetL && x <= sheetR && y >= sheetT && y <= sheetB) {
      // Folded corner check at top right: x > 350, y < 250
      if (x > 350 && y < (190 + (x - 350))) {
        // Transparent corner cutout
        return [br, bg, bb, 255];
      }
      if (x >= 350 && y <= 250 && y >= (190 + (x - 350))) {
        // Corner flap
        return [203, 213, 225, 255];
      }

      // PDF text banner in sheet: y between 340 and 410
      if (y >= 340 && y <= 410 && x >= 235 && x <= 405) {
        return [225, 29, 72, 255];
      }

      // Accent lines on paper
      if (y >= 240 && y <= 255 && x >= 260 && x <= 330) {
        return [225, 29, 72, 220];
      }
      if (y >= 275 && y <= 290 && x >= 260 && x <= 380) {
        return [148, 163, 184, 180];
      }

      // White paper sheet body
      return [255, 255, 255, 255];
    }

    // Golden AI Sparkle near top-left of sheet (x: 215, y: 175)
    const distSparkle = Math.hypot(x - 215, y - 175);
    if (distSparkle < 30) {
      const sparkleFactor = 1 - (distSparkle / 30);
      return [251, Math.round(191 * sparkleFactor), 36, 255];
    }

    return [br, bg, bb, 255];
  }

  return [bgR, bgG, bgB, 255];
});

fs.writeFileSync(path.join(__dirname, '../public/og-image.png'), pngBuffer);
console.log('Successfully generated /public/og-image.png (1200x630)');

// Generate 512x512 Square Social & WhatsApp Card
const sqWidth = 512;
const sqHeight = 512;
const sqBuffer = createPng(sqWidth, sqHeight, (x, y, w, h) => {
  const iconCenterX = 256;
  const iconCenterY = 256;
  const distToIcon = Math.hypot(x - iconCenterX, y - iconCenterY);

  let bgR = 15;
  let bgG = 23;
  let bgB = 42;

  if (distToIcon < 320) {
    const glow = Math.cos((distToIcon / 320) * (Math.PI / 2));
    bgR = Math.min(255, bgR + Math.round(glow * 90));
    bgG = Math.min(255, bgG + Math.round(glow * 15));
    bgB = Math.min(255, bgB + Math.round(glow * 40));
  }

  const badgeRadius = 200;
  if (distToIcon <= badgeRadius) {
    const badgeRatio = (y - (iconCenterY - badgeRadius)) / (badgeRadius * 2);
    const borderDist = Math.abs(distToIcon - badgeRadius);
    
    if (borderDist < 6) return [255, 255, 255, 240];

    const br = Math.round(244 * (1 - badgeRatio) + 190 * badgeRatio);
    const bg = Math.round(63 * (1 - badgeRatio) + 18 * badgeRatio);
    const bb = Math.round(94 * (1 - badgeRatio) + 60 * badgeRatio);

    const sheetL = 150;
    const sheetR = 362;
    const sheetT = 110;
    const sheetB = 402;

    if (x >= sheetL && x <= sheetR && y >= sheetT && y <= sheetB) {
      if (x > 292 && y < (110 + (x - 292))) {
        return [br, bg, bb, 255];
      }
      if (x >= 292 && y <= 180 && y >= (110 + (x - 292))) {
        return [203, 213, 225, 255];
      }
      if (y >= 280 && y <= 370 && x >= 155 && x <= 357) {
        return [225, 29, 72, 255];
      }
      if (y >= 170 && y <= 188 && x >= 185 && x <= 265) {
        return [225, 29, 72, 220];
      }
      if (y >= 210 && y <= 228 && x >= 185 && x <= 325) {
        return [148, 163, 184, 180];
      }
      return [255, 255, 255, 255];
    }

    const distSparkle = Math.hypot(x - 135, y - 95);
    if (distSparkle < 30) {
      const sparkleFactor = 1 - (distSparkle / 30);
      return [251, Math.round(191 * sparkleFactor), 36, 255];
    }

    return [br, bg, bb, 255];
  }

  return [bgR, bgG, bgB, 255];
});

fs.writeFileSync(path.join(__dirname, '../public/og-image-square.png'), sqBuffer);
console.log('Successfully generated /public/og-image-square.png (512x512)');
