#!/usr/bin/env node
/**
 * Metro Bundle Analyzer for React Native
 *
 * Analyzes the React Native bundle to identify large modules
 * and optimization opportunities.
 *
 * Usage:
 *   npm run analyze:metro
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

log('\n╔════════════════════════════════════════╗', 'bright');
log('║   Metro Bundle Analysis (React Native) ║', 'bright');
log('╚════════════════════════════════════════╝', 'bright');

log('\n📦 Generating bundle...', 'cyan');

try {
  // Generate bundle with source map
  execSync(
    'npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/bundle.android.js --sourcemap-output /tmp/bundle.android.map',
    { stdio: 'inherit' }
  );

  const bundlePath = '/tmp/bundle.android.js';
  const bundleStats = fs.statSync(bundlePath);

  log('\n📊 Bundle Statistics:', 'bright');
  log(`  Total Size: ${formatSize(bundleStats.size)}`);

  // Read bundle to analyze
  const bundleContent = fs.readFileSync(bundlePath, 'utf8');

  // Count lines
  const lines = bundleContent.split('\n').length;
  log(`  Lines: ${lines.toLocaleString()}`);

  // Estimate module count (rough estimate)
  const modules = (bundleContent.match(/\_\_d\(function/g) || []).length;
  log(`  Modules: ~${modules.toLocaleString()}`);

  // Check for large dependencies
  log('\n🔍 Checking for large dependencies...', 'bright');

  const largeDeps = [
    { name: 'react-native', pattern: /react-native/g },
    { name: 'expo', pattern: /expo/g },
    { name: '@react-navigation', pattern: /@react-navigation/g },
    { name: 'lucide-react-native', pattern: /lucide-react-native/g },
    { name: 'victory', pattern: /victory/g },
  ];

  largeDeps.forEach((dep) => {
    const matches = (bundleContent.match(dep.pattern) || []).length;
    if (matches > 0) {
      log(`  • ${dep.name}: ${matches} references`);
    }
  });

  // Budget check
  log('\n🎯 Budget Check:', 'bright');
  const budgetMB = 5; // 5MB budget for React Native bundle
  const sizeMB = bundleStats.size / (1024 * 1024);
  const percentage = ((sizeMB / budgetMB) * 100).toFixed(1);

  if (sizeMB < budgetMB) {
    log(
      `  ✅ Bundle size: ${formatSize(bundleStats.size)} (${percentage}% of ${budgetMB}MB budget)`,
      'green'
    );
  } else if (sizeMB < budgetMB * 1.1) {
    log(
      `  ⚠️  Bundle size: ${formatSize(bundleStats.size)} (${percentage}% of ${budgetMB}MB budget)`,
      'yellow'
    );
  } else {
    log(
      `  ❌ Bundle size: ${formatSize(bundleStats.size)} (${percentage}% of ${budgetMB}MB budget)`,
      'red'
    );
  }

  log('\n💡 Optimization Tips:', 'bright');
  log('  • Use lazy loading for heavy screens');
  log('  • Remove unused imports');
  log('  • Use platform-specific code');
  log('  • Optimize images and assets');

  // Clean up
  fs.unlinkSync(bundlePath);
  fs.unlinkSync('/tmp/bundle.android.map');

  log('\n✅ Analysis complete!', 'green');
} catch (error) {
  log('\n❌ Error analyzing bundle:', 'red');
  log(`  ${error.message}`, 'red');
  log('\n💡 Make sure you have React Native CLI installed:', 'yellow');
  log('  npm install -g react-native-cli', 'yellow');
  process.exit(1);
}

log('\n════════════════════════════════════════\n', 'bright');
