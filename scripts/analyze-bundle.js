#!/usr/bin/env node
/**
 * Bundle Size Analyzer
 *
 * Analyzes and reports bundle sizes for web and native builds.
 * Helps track bundle growth and identify optimization opportunities.
 *
 * Usage:
 *   node scripts/analyze-bundle.js
 *   npm run analyze:bundle
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

// Bundle size budgets (in KB)
const BUDGETS = {
  web: {
    main: 500, // Main bundle should be < 500KB
    vendor: 1000, // Vendor bundle should be < 1MB
    total: 1500, // Total should be < 1.5MB
  },
  native: {
    android: 30000, // Android APK should be < 30MB
    ios: 30000, // iOS IPA should be < 30MB
  },
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function checkBudget(size, budget, name) {
  const sizeKB = size / 1024;
  const percentage = ((sizeKB / budget) * 100).toFixed(1);

  if (sizeKB < budget) {
    log(`  ✅ ${name}: ${formatSize(size)} (${percentage}% of budget)`, 'green');
    return true;
  } else if (sizeKB < budget * 1.1) {
    log(`  ⚠️  ${name}: ${formatSize(size)} (${percentage}% of budget)`, 'yellow');
    return false;
  } else {
    log(`  ❌ ${name}: ${formatSize(size)} (${percentage}% of budget)`, 'red');
    return false;
  }
}

function analyzeWebBundle() {
  log('\n📦 Analyzing Web Bundle...', 'cyan');

  const distPath = path.join(__dirname, '..', 'dist', 'client');

  if (!fs.existsSync(distPath)) {
    log('  ℹ️  Web build not found. Run: npm run build:web', 'yellow');
    return;
  }

  let totalSize = 0;
  let mainSize = 0;
  let vendorSize = 0;
  const files = [];

  function walkDir(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
        const size = stat.size;
        totalSize += size;

        if (fullPath.includes('vendor')) {
          vendorSize += size;
        } else {
          mainSize += size;
        }

        files.push({
          name: path.relative(distPath, fullPath),
          size,
        });
      }
    }
  }

  walkDir(distPath);

  // Sort files by size
  files.sort((a, b) => b.size - a.size);

  log('\n  📊 Bundle Breakdown:', 'bright');
  log(`  Total: ${formatSize(totalSize)}`);
  log(`  Main: ${formatSize(mainSize)}`);
  log(`  Vendor: ${formatSize(vendorSize)}`);

  log('\n  🎯 Budget Check:', 'bright');
  const mainOk = checkBudget(mainSize, BUDGETS.web.main * 1024, 'Main bundle');
  const vendorOk = checkBudget(vendorSize, BUDGETS.web.vendor * 1024, 'Vendor bundle');
  const totalOk = checkBudget(totalSize, BUDGETS.web.total * 1024, 'Total bundle');

  log('\n  📂 Largest Files:', 'bright');
  files.slice(0, 5).forEach((file, i) => {
    log(`  ${i + 1}. ${file.name}: ${formatSize(file.size)}`);
  });

  return mainOk && vendorOk && totalOk;
}

function analyzeNativeBundle() {
  log('\n📱 Analyzing Native Bundles...', 'cyan');

  // Check for Android APK
  const androidPath = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk');

  if (fs.existsSync(androidPath)) {
    log('\n  🤖 Android:', 'bright');
    let largestApk = null;
    let largestSize = 0;

    function findApks(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          findApks(fullPath);
        } else if (item.endsWith('.apk')) {
          if (stat.size > largestSize) {
            largestSize = stat.size;
            largestApk = fullPath;
          }
        }
      }
    }

    findApks(androidPath);

    if (largestApk) {
      log(`  APK: ${formatSize(largestSize)}`);
      checkBudget(largestSize, BUDGETS.native.android * 1024, 'Android APK');
    }
  } else {
    log('  ℹ️  Android build not found', 'yellow');
  }

  // Check for iOS IPA
  const iosPath = path.join(__dirname, '..', 'ios', 'build');
  if (fs.existsSync(iosPath)) {
    log('\n  🍎 iOS:', 'bright');
    log('  ℹ️  iOS bundle analysis requires Xcode build', 'yellow');
  } else {
    log('  ℹ️  iOS build not found', 'yellow');
  }
}

function saveReport(data) {
  const reportPath = path.join(__dirname, '..', 'bundle-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    ...data,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n💾 Report saved to: bundle-report.json`, 'green');
}

function main() {
  log('\n╔═══════════════════════════════════════╗', 'bright');
  log('║     Bundle Size Analysis Report      ║', 'bright');
  log('╚═══════════════════════════════════════╝', 'bright');

  const webOk = analyzeWebBundle();
  analyzeNativeBundle();

  log('\n═══════════════════════════════════════\n', 'bright');

  if (webOk === false) {
    log('⚠️  Bundle size budgets exceeded!', 'red');
    log('Consider:');
    log('  • Lazy loading more components');
    log('  • Removing unused dependencies');
    log('  • Code splitting large features');
    log('  • Optimizing images and assets');
    process.exit(1);
  } else if (webOk === true) {
    log('✅ All bundle budgets met!', 'green');
  }
}

main();
