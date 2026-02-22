/**
 * Create Custom Medical-Themed Favicon for KP Med
 *
 * Design: Medical cross with book/learning element
 * Colors: Brand gold (#D4A574) and medical blue/white
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Brand colors from app.json
const BRAND_COLOR = '#D4A574'; // Golden/tan
const ACCENT_COLOR = '#B15740'; // Darker accent
const WHITE = '#FFFFFF';
const MEDICAL_BLUE = '#2563EB';

async function createMedicalFavicon() {
  console.log('🎨 Creating custom medical-themed favicon for KP Med...\n');

  // Create SVG for medical cross with book icon
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BRAND_COLOR};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${ACCENT_COLOR};stop-opacity:1" />
        </linearGradient>

        <!-- Shadow filter for depth -->
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Background circle -->
      <circle cx="256" cy="256" r="240" fill="url(#grad)" filter="url(#shadow)"/>

      <!-- Medical cross (white) -->
      <g transform="translate(256, 256)">
        <!-- Vertical bar -->
        <rect x="-25" y="-120" width="50" height="240" rx="8" fill="${WHITE}" opacity="0.95"/>
        <!-- Horizontal bar -->
        <rect x="-120" y="-25" width="240" height="50" rx="8" fill="${WHITE}" opacity="0.95"/>

        <!-- Small book icon overlay (bottom right of cross) -->
        <g transform="translate(40, 60) scale(0.8)">
          <!-- Book pages -->
          <rect x="-30" y="-25" width="60" height="50" rx="4" fill="${MEDICAL_BLUE}" opacity="0.9"/>
          <!-- Book spine highlight -->
          <rect x="-30" y="-25" width="8" height="50" fill="${WHITE}" opacity="0.3"/>
          <!-- Page lines -->
          <line x1="-20" y1="-10" x2="20" y2="-10" stroke="${WHITE}" stroke-width="2" opacity="0.5"/>
          <line x1="-20" y1="0" x2="20" y2="0" stroke="${WHITE}" stroke-width="2" opacity="0.5"/>
          <line x1="-20" y1="10" x2="20" y2="10" stroke="${WHITE}" stroke-width="2" opacity="0.5"/>
        </g>
      </g>

      <!-- Optional: "KP" letters (subtle) -->
      <text x="256" y="440" font-family="Arial, sans-serif" font-size="48" font-weight="bold"
            text-anchor="middle" fill="${WHITE}" opacity="0.8">KP</text>
    </svg>
  `;

  // Save SVG
  const svgPath = path.join(__dirname, 'assets', 'images', 'favicon.svg');
  fs.writeFileSync(svgPath, svg);
  console.log('✅ Created favicon.svg');

  // Generate main 512x512 icon
  const mainIconPath = path.join(__dirname, 'assets', 'images', 'icon.png');
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(mainIconPath);
  console.log('✅ Created icon.png (512x512)');

  // Generate all favicon sizes
  const sizes = [
    { size: 16, name: 'favicon-16x16.png', dirs: ['public', 'assets/images'] },
    { size: 32, name: 'favicon-32x32.png', dirs: ['public', 'assets/images'] },
    { size: 32, name: 'favicon.png', dirs: ['public', 'assets/images'] },
    { size: 48, name: 'favicon-48x48.png', dirs: ['public'] },
    { size: 180, name: 'apple-touch-icon.png', dirs: ['public'] },
    { size: 192, name: 'icon-192.png', dirs: ['public', 'assets/images'] },
    { size: 512, name: 'icon-512.png', dirs: ['public'] },
  ];

  for (const { size, name, dirs } of sizes) {
    const buffer = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

    for (const dir of dirs) {
      const outputPath = path.join(__dirname, dir, name);
      await fs.promises.writeFile(outputPath, buffer);
      console.log(`✅ Created ${dir}/${name} (${size}x${size})`);
    }
  }

  console.log('\n🎉 Custom medical favicon created successfully!\n');
  console.log('📋 Design features:');
  console.log('   • Medical cross (primary symbol)');
  console.log('   • Book icon (education/learning)');
  console.log('   • Brand colors (golden/tan gradient)');
  console.log('   • "KP" letters at bottom');
  console.log('   • Professional medical theme\n');

  console.log('🚀 Next steps:');
  console.log('   1. Preview: Check assets/images/icon.png');
  console.log('   2. Build: npm run build:web');
  console.log('   3. Commit: git add . && git commit -m "Add custom medical favicon"');
  console.log('   4. Deploy: git push\n');
}

createMedicalFavicon().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
