const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'brand', 'workora-icon.png');
const dstIco = path.join(__dirname, 'resources', 'icon.ico');
const dstPng = path.join(__dirname, 'resources', 'icon-256.png');

async function createIco() {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = [];

  for (const size of sizes) {
    const buf = await sharp(src)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();
    images.push(buf);
  }

  // ICO format: header(6) + entries(16 each) + image data
  const numImages = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: icon
  header.writeUInt16LE(numImages, 4); // count

  let dataOffset = 6 + numImages * 16;
  const entries = [];
  const imageBuffers = [];

  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const buf = images[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);   // width
    entry.writeUInt8(size === 256 ? 0 : size, 1);   // height
    entry.writeUInt8(0, 2);                          // color palette
    entry.writeUInt8(0, 3);                          // reserved
    entry.writeUInt16LE(1, 4);                       // color planes
    entry.writeUInt16LE(32, 6);                      // bits per pixel
    entry.writeUInt32LE(buf.length, 8);              // size of image data
    entry.writeUInt32LE(dataOffset, 12);             // offset
    entries.push(entry);
    imageBuffers.push(buf);
    dataOffset += buf.length;
  }

  const ico = Buffer.concat([header, ...entries, ...imageBuffers]);
  fs.writeFileSync(dstIco, ico);
  console.log('icon.ico created:', ico.length, 'bytes');

  fs.copyFileSync(src, dstPng);
  console.log('icon-256.png copied:', fs.statSync(dstPng).size, 'bytes');
}

createIco().catch(err => console.error(err));
