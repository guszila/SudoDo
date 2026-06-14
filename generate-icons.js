import fs from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';

const svgPath = resolve('public/favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  console.log('Generating high-resolution PWA icons from favicon.svg...');

  // Generate 64x64 icon
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile('public/pwa-64x64.png');
  console.log('- public/pwa-64x64.png created');

  // Generate 192x192 icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');
  console.log('- public/pwa-192x192.png created');

  // Generate 512x512 icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');
  console.log('- public/pwa-512x512.png created');

  // Generate apple-touch-icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon-180x180.png');
  console.log('- public/apple-touch-icon-180x180.png created');

  // Generate maskable icon 512x512
  // We can add a bit of padding for maskable icons (e.g. 10%) so it doesn't get clipped on some phone launchers.
  // We can do this by resizing and placing it on a background, or just scaling the SVG.
  // Since favicon.svg already has a dark background and safe padding around the logo, rendering it directly at 512x512 is perfect.
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/maskable-icon-512x512.png');
  console.log('- public/maskable-icon-512x512.png created');

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
