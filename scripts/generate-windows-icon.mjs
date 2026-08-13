import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourcePath = path.join(root, 'public', 'Logo.png');
const outputPath = path.join(root, 'public', 'Logo.ico');
const sizes = [16, 24, 32, 48, 64, 96, 128, 256];

const images = await Promise.all(
  sizes.map(async size => ({
    size,
    buffer: await sharp(sourcePath)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer(),
  })),
);

const headerSize = 6;
const entrySize = 16;
let offset = headerSize + entrySize * images.length;
const header = Buffer.alloc(offset);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

for (const [index, image] of images.entries()) {
  const entryOffset = headerSize + index * entrySize;
  const dimension = image.size === 256 ? 0 : image.size;
  header.writeUInt8(dimension, entryOffset);
  header.writeUInt8(dimension, entryOffset + 1);
  header.writeUInt8(0, entryOffset + 2);
  header.writeUInt8(0, entryOffset + 3);
  header.writeUInt16LE(1, entryOffset + 4);
  header.writeUInt16LE(32, entryOffset + 6);
  header.writeUInt32LE(image.buffer.length, entryOffset + 8);
  header.writeUInt32LE(offset, entryOffset + 12);
  offset += image.buffer.length;
}

fs.writeFileSync(outputPath, Buffer.concat([header, ...images.map(image => image.buffer)]));
console.log(`Logo.ico multi-résolution générée: ${sizes.join(', ')} px`);
