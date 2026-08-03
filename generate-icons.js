// Generate PWA icons as simple PNG files
// Uses a canvas-like approach with raw PNG generation

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Minimal PNG generator for solid color icons with text
function createPNG(size) {
  // Create a simple PNG with blue background and white clock icon
  // Using raw PNG format
  
  const width = size;
  const height = size;
  
  // RGBA pixel data
  const pixels = Buffer.alloc(width * height * 4);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.35;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Background - blue gradient
      const bgR = 37;
      const bgG = 99;
      const bgB = 235;
      
      // Distance from center
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Rounded rectangle background
      const margin = size * 0.1;
      const cornerRadius = size * 0.15;
      const inRect = x >= margin && x < width - margin && y >= margin && y < height - margin;
      
      // Simple rounded check
      let inRoundedRect = false;
      if (inRect) {
        inRoundedRect = true;
      } else {
        // Check corners
        const corners = [
          [margin + cornerRadius, margin + cornerRadius],
          [width - margin - cornerRadius, margin + cornerRadius],
          [margin + cornerRadius, height - margin - cornerRadius],
          [width - margin - cornerRadius, height - margin - cornerRadius],
        ];
        for (const [cx, cy] of corners) {
          const cdx = x - cx;
          const cdy = y - cy;
          if (Math.sqrt(cdx * cdx + cdy * cdy) <= cornerRadius) {
            inRoundedRect = true;
            break;
          }
        }
        // Check edges
        if (!inRoundedRect) {
          if (x >= margin + cornerRadius && x < width - margin - cornerRadius && y >= margin - 1 && y < height - margin + 1) inRoundedRect = true;
          if (y >= margin + cornerRadius && y < height - margin - cornerRadius && x >= margin - 1 && x < width - margin + 1) inRoundedRect = true;
        }
      }
      
      if (!inRoundedRect) {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 0; // transparent
        continue;
      }
      
      // Clock circle
      const clockRadius = radius;
      const clockRing = size * 0.04;
      const isClockRing = Math.abs(dist - clockRadius) < clockRing;
      
      // Clock hands
      const hourHandLen = radius * 0.5;
      const minHandLen = radius * 0.7;
      const handWidth = size * 0.03;
      
      // Hour hand (pointing to 10 o'clock = -60 degrees from 12)
      const hourAngle = -Math.PI / 6; // 10 o'clock
      const hourEndX = centerX + Math.sin(hourAngle) * hourHandLen;
      const hourEndY = centerY - Math.cos(hourAngle) * hourHandLen;
      
      // Minute hand (pointing to 2 = 60 degrees from 12)
      const minAngle = Math.PI / 3; // 2 o'clock  
      const minEndX = centerX + Math.sin(minAngle) * minHandLen;
      const minEndY = centerY - Math.cos(minAngle) * minHandLen;
      
      // Check if point is on a hand (line distance)
      function distToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = lenSq !== 0 ? dot / lenSq : -1;
        param = Math.max(0, Math.min(1, param));
        const xx = x1 + param * C;
        const yy = y1 + param * D;
        return Math.sqrt((px - xx) * (px - xx) + (py - yy) * (py - yy));
      }
      
      const onHourHand = distToLine(x, y, centerX, centerY, hourEndX, hourEndY) < handWidth;
      const onMinHand = distToLine(x, y, centerX, centerY, minEndX, minEndY) < handWidth;
      const onCenter = dist < size * 0.04;
      
      const isWhite = isClockRing || onHourHand || onMinHand || onCenter;
      
      if (isWhite) {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 255;
      } else {
        pixels[idx] = bgR;
        pixels[idx + 1] = bgG;
        pixels[idx + 2] = bgB;
        pixels[idx + 3] = 255;
      }
    }
  }
  
  return encodePNG(pixels, width, height);
}

function encodePNG(pixels, width, height) {
  // Minimal PNG encoder
  const { deflateSync } = require('zlib');
  
  // Create raw image data with filter bytes
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (width * 4 + 1) + 1 + x * 4;
      rawData[dstIdx] = pixels[srcIdx];
      rawData[dstIdx + 1] = pixels[srcIdx + 1];
      rawData[dstIdx + 2] = pixels[srcIdx + 2];
      rawData[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  
  const compressed = deflateSync(rawData);
  
  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return ~crc;
}

// Generate all icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  const png = createPNG(size);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated: icon-${size}.png`);
}

console.log('All icons generated!');
