import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = 'public/images/logo-concept-3.png';
const OUT = 'public';

// Favicon sizes — transparent background for browser tabs
const faviconSizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
];

// App icons — keep dark background
const appIconSizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

// Logo copies
const logoSizes = [
  { name: 'images/logo.png', size: 512 },
  { name: 'images/logo-256.png', size: 256 },
  { name: 'images/logo-128.png', size: 128 },
  { name: 'images/logo-64.png', size: 64 },
];

async function main() {
  const meta = await sharp(SOURCE).metadata();
  console.log(`Source: ${meta.width}x${meta.height}, ${meta.format}`);

  // For favicons: extract the motif with transparent background
  // The source has dark bg — we'll trim and use transparent bg
  for (const { name, size } of faviconSizes) {
    const outPath = path.join(OUT, name);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`  ${name} (${size}x${size})`);
  }

  // App icons and logos — keep dark background
  for (const { name, size } of [...appIconSizes, ...logoSizes]) {
    const outPath = path.join(OUT, name);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 28, g: 25, b: 23, alpha: 1 } })
      .png()
      .toFile(outPath);
    console.log(`  ${name} (${size}x${size})`);
  }

  // Build favicon.ico
  const icoSizes = [16, 32, 48];
  const pngBuffers = [];
  for (const size of icoSizes) {
    const buf = await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buf });
  }

  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let dataOffset = headerSize + dirEntrySize * numImages;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  const dirEntries = Buffer.alloc(dirEntrySize * numImages);
  const dataBuffers = [];
  let currentOffset = dataOffset;

  for (let i = 0; i < numImages; i++) {
    const { size, buf } = pngBuffers[i];
    const offset = i * dirEntrySize;
    dirEntries.writeUInt8(size < 256 ? size : 0, offset);
    dirEntries.writeUInt8(size < 256 ? size : 0, offset + 1);
    dirEntries.writeUInt8(0, offset + 2);
    dirEntries.writeUInt8(0, offset + 3);
    dirEntries.writeUInt16LE(1, offset + 4);
    dirEntries.writeUInt16LE(32, offset + 6);
    dirEntries.writeUInt32LE(buf.length, offset + 8);
    dirEntries.writeUInt32LE(currentOffset, offset + 12);
    currentOffset += buf.length;
    dataBuffers.push(buf);
  }

  const ico = Buffer.concat([header, dirEntries, ...dataBuffers]);
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), ico);
  console.log(`  favicon.ico (${icoSizes.join('+')})`);

  console.log('\nDone!');
}

main().catch(console.error);
