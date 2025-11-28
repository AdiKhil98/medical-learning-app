#!/usr/bin/env node
/**
 * Image Optimization Script
 *
 * Automatically optimizes images in the assets folder:
 * - Compresses PNG/JPG images
 * - Converts to WebP for web
 * - Generates responsive image sizes
 * - Reports file size savings
 *
 * Usage:
 *   npm run optimize:images
 *   node scripts/optimize-images.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileSize(filepath) {
  try {
    return fs.statSync(filepath).size;
  } catch {
    return 0;
  }
}

function optimizeImage(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  const basename = path.basename(filepath, ext);
  const dirname = path.dirname(filepath);

  const originalSize = getFileSize(filepath);
  let optimized = false;
  let newSize = originalSize;

  try {
    // Check if sharp is available (optional dependency)
    try {
      require.resolve('sharp');
      const sharp = require('sharp');

      // Optimize based on file type
      if (ext === '.png') {
        // Optimize PNG
        sharp(filepath)
          .png({ quality: 80, compressionLevel: 9 })
          .toFile(`${filepath  }.tmp`)
          .then(() => {
            fs.renameSync(`${filepath  }.tmp`, filepath);
          });
        optimized = true;
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        // Optimize JPEG
        sharp(filepath)
          .jpeg({ quality: 85, progressive: true })
          .toFile(`${filepath  }.tmp`)
          .then(() => {
            fs.renameSync(`${filepath  }.tmp`, filepath);
          });
        optimized = true;
      }

      // Generate WebP version for web
      const webpPath = path.join(dirname, `${basename  }.webp`);
      sharp(filepath)
        .webp({ quality: 80 })
        .toFile(webpPath)
        .catch(() => {}); // Silent fail if already exists

      newSize = getFileSize(filepath);
    } catch (err) {
      // Sharp not available, use fallback message
      log(`  ℹ️  Install 'sharp' for automatic optimization: npm install --save-dev sharp`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed to optimize ${path.basename(filepath)}: ${error.message}`, 'red');
  }

  return {
    filepath,
    originalSize,
    newSize,
    saved: originalSize - newSize,
    optimized,
  };
}

function findImages(dir, images = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findImages(fullPath, images);
    } else if (/\.(png|jpe?g|webp)$/i.test(item)) {
      images.push(fullPath);
    }
  }

  return images;
}

function main() {
  log('\n╔════════════════════════════════════════╗', 'bright');
  log('║     Image Optimization Report          ║', 'bright');
  log('╚════════════════════════════════════════╝', 'bright');

  const assetsDir = path.join(__dirname, '..', 'assets');

  if (!fs.existsSync(assetsDir)) {
    log('\n❌ Assets directory not found', 'red');
    process.exit(1);
  }

  log('\n🔍 Finding images...', 'cyan');
  const images = findImages(assetsDir);

  if (images.length === 0) {
    log('  ℹ️  No images found to optimize', 'yellow');
    process.exit(0);
  }

  log(`  Found ${images.length} images`, 'green');

  log('\n🔧 Optimizing images...', 'cyan');
  const results = images.map(optimizeImage);

  // Wait for async operations
  setTimeout(() => {
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalNew = results.reduce((sum, r) => sum + r.newSize, 0);
    const totalSaved = totalOriginal - totalNew;
    const percentSaved = ((totalSaved / totalOriginal) * 100).toFixed(1);

    log('\n📊 Optimization Results:', 'bright');
    log(`  Original size: ${formatSize(totalOriginal)}`);
    log(`  Optimized size: ${formatSize(totalNew)}`);

    if (totalSaved > 0) {
      log(`  Saved: ${formatSize(totalSaved)} (${percentSaved}%)`, 'green');
    } else {
      log(`  No savings (images already optimized)`, 'yellow');
    }

    log('\n📝 Individual Results:', 'bright');
    results.forEach((result) => {
      const filename = path.basename(result.filepath);
      const saved = result.saved;

      if (saved > 0) {
        const percent = ((saved / result.originalSize) * 100).toFixed(1);
        log(`  ✅ ${filename}: -${formatSize(saved)} (-${percent}%)`, 'green');
      } else if (result.optimized) {
        log(`  ℹ️  ${filename}: Already optimized`, 'yellow');
      } else {
        log(`  ⏭️  ${filename}: Skipped`, 'cyan');
      }
    });

    log('\n💡 Recommendations:', 'bright');
    log('  1. Install sharp for automatic optimization: npm install --save-dev sharp');
    log('  2. Commit optimized images to git');
    log('  3. Use WebP images for web (auto-generated)');
    log('  4. Consider using an image CDN (Cloudinary, ImageKit)');

    log('\n✅ Optimization complete!', 'green');
    log('\n════════════════════════════════════════\n', 'bright');
  }, 2000); // Wait for sharp operations to complete
}

main();
