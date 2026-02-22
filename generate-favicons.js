/**
 * Generate Favicon Files for MedMeister
 *
 * This script generates all necessary favicon sizes from the main icon
 * and copies them to the correct locations for web deployment.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_ICON = path.join(__dirname, 'assets', 'images', 'icon.png');
const OUTPUT_DIR_PUBLIC = path.join(__dirname, 'public');
const OUTPUT_DIR_ASSETS = path.join(__dirname, 'assets', 'images');

// Favicon sizes to generate
const FAVICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR_PUBLIC)) {
  fs.mkdirSync(OUTPUT_DIR_PUBLIC, { recursive: true });
}

async function generateFavicons() {
  console.log('🎨 Starting favicon generation...\n');

  // Check if input file exists
  if (!fs.existsSync(INPUT_ICON)) {
    console.error(`❌ Input icon not found: ${INPUT_ICON}`);
    console.log('💡 Using the main icon.png as source. Make sure it exists in assets/images/');
    return;
  }

  try {
    // Generate all favicon sizes
    for (const { size, name } of FAVICON_SIZES) {
      // Generate to public directory (for web deployment)
      const publicPath = path.join(OUTPUT_DIR_PUBLIC, name);
      await sharp(INPUT_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(publicPath);

      console.log(`✅ Generated ${name} (${size}x${size}) → public/`);

      // Also save common sizes to assets/images
      if ([16, 32, 192, 512].includes(size)) {
        const assetsPath = path.join(OUTPUT_DIR_ASSETS, name);
        await sharp(INPUT_ICON)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .png()
          .toFile(assetsPath);
      }
    }

    // Generate main favicon.png (32x32)
    const mainFaviconPath = path.join(OUTPUT_DIR_PUBLIC, 'favicon.png');
    await sharp(INPUT_ICON)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toFile(mainFaviconPath);

    console.log('✅ Generated favicon.png (32x32) → public/\n');

    // Summary
    console.log('🎉 All favicons generated successfully!\n');
    console.log('📋 Generated files:');
    console.log('   • favicon.png (32x32)');
    console.log('   • favicon-16x16.png');
    console.log('   • favicon-32x32.png');
    console.log('   • favicon-48x48.png');
    console.log('   • icon-192.png (for Android/PWA)');
    console.log('   • icon-512.png (for Android/PWA)');
    console.log('   • apple-touch-icon.png (for iOS)\n');

    console.log('📁 Files saved to:');
    console.log(`   • ${OUTPUT_DIR_PUBLIC}`);
    console.log(`   • ${OUTPUT_DIR_ASSETS}\n`);

    console.log('🚀 Next steps:');
    console.log('   1. Run: npm run build:web');
    console.log('   2. Deploy to Netlify');
    console.log('   3. Hard refresh your browser (Ctrl+Shift+R)\n');
  } catch (error) {
    console.error('❌ Error generating favicons:', error.message);
    console.log('\n💡 Make sure you have sharp installed:');
    console.log('   npm install sharp\n');
  }
}

// Run the script
generateFavicons();
