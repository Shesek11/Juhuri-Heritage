import sharp from 'sharp';
import fs from 'node:fs';

const SOURCE = 'public/images/logo-concept-3.png';

async function main() {
  // Read image as raw pixels
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  console.log(`Image: ${width}x${height}`);

  // Remove dark background → transparent
  const output = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const brightness = (r + g + b) / 3;

    if (brightness < 60) {
      output[i] = 0; output[i + 1] = 0; output[i + 2] = 0; output[i + 3] = 0;
    } else if (brightness < 90) {
      const alpha = Math.round(((brightness - 60) / 30) * 255);
      output[i] = r; output[i + 1] = g; output[i + 2] = b; output[i + 3] = alpha;
    } else {
      output[i] = r; output[i + 1] = g; output[i + 2] = b; output[i + 3] = 255;
    }
  }

  // Save full transparent version
  const transparentPath = 'public/images/logo-transparent.png';
  await sharp(output, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(transparentPath);

  // Now trim all transparent padding and save a tight-cropped version
  const trimmed = await sharp(transparentPath)
    .trim()  // removes transparent borders
    .toBuffer({ resolveWithObject: true });

  console.log(`Trimmed: ${trimmed.info.width}x${trimmed.info.height}`);

  const trimmedPath = 'public/images/logo-trimmed.png';
  await sharp(trimmed.data)
    .toFile(trimmedPath);

  // Generate favicons from trimmed version — fill the entire space
  const sizes = [
    { name: 'public/favicon-16x16.png', size: 16 },
    { name: 'public/favicon-32x32.png', size: 32 },
    { name: 'public/favicon-48x48.png', size: 48 },
  ];

  for (const { name, size } of sizes) {
    await sharp(trimmedPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(name);
    console.log(`  ${name} (${size}px)`);
  }

  // Rebuild favicon.ico
  const icoSizes = [16, 32, 48];
  const pngBuffers = [];
  for (const size of icoSizes) {
    const buf = await sharp(trimmedPath)
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
  fs.writeFileSync('public/favicon.ico', ico);
  console.log('  favicon.ico rebuilt');

  // Also update apple-touch-icon from trimmed
  await sharp(trimmedPath)
    .resize(180, 180, { fit: 'contain', background: { r: 28, g: 25, b: 23, alpha: 1 } })
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('  apple-touch-icon.png (180px)');

  console.log('\nDone!');
}

main().catch(console.error);
