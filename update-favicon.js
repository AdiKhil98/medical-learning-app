#!/usr/bin/env node
/**
 * Quick Favicon Update Script
 *
 * Usage: node update-favicon.js [path-to-new-icon.png]
 *
 * This script:
 * 1. Takes a new icon image
 * 2. Generates all required favicon sizes
 * 3. Copies them to the correct locations
 * 4. Updates configuration if needed
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const INPUT_FILE = args[0] || path.join(__dirname, 'assets', 'images', 'icon.png');

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ Error: File not found: ${INPUT_FILE}`);
  console.log('\n📖 Usage:');
  console.log('   node update-favicon.js [path-to-icon.png]');
  console.log('\n💡 Example:');
  console.log('   node update-favicon.js ./my-new-logo.png');
  process.exit(1);
}

const SIZES = [
  { size: 16, output: 'public/favicon-16x16.png' },
  { size: 32, output: 'public/favicon-32x32.png' },
  { size: 32, output: 'public/favicon.png' },
  { size: 48, output: 'public/favicon-48x48.png' },
  { size: 180, output: 'public/apple-touch-icon.png' },
  { size: 192, output: 'public/icon-192.png' },
  { size: 192, output: 'assets/images/favicon-192x192.png' },
  { size: 512, output: 'public/icon-512.png' },
  { size: 512, output: 'assets/images/icon.png' }, // Update main icon
];

async function updateFavicons() {
  console.log('🎨 Updating favicons from:', INPUT_FILE);
  console.log('');

  try {
    for (const { size, output } of SIZES) {
      const outputPath = path.join(__dirname, output);

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await sharp(INPUT_FILE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ ${output} (${size}x${size})`);
    }

    console.log('');
    console.log('🎉 All favicons updated successfully!');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Test locally: npm run dev');
    console.log('   2. Build: npm run build:web');
    console.log('   3. Commit changes: git add . && git commit -m "Update favicon"');
    console.log('   4. Deploy: git push');
    console.log('');
    console.log('💡 Clear browser cache to see changes (Ctrl+Shift+R)');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateFavicons();
