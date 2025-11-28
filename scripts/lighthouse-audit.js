#!/usr/bin/env node
/**
 * Lighthouse Performance Audit Script
 *
 * Runs comprehensive Lighthouse audits on the production app.
 * Measures performance, accessibility, SEO, and best practices.
 *
 * Usage:
 *   npm run lighthouse
 *   npm run lighthouse -- --url=https://custom-url.com
 *   npm run lighthouse -- --mobile
 *   npm run lighthouse -- --desktop
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const urlArg = args.find((arg) => arg.startsWith('--url='));
const mobileArg = args.includes('--mobile');
const desktopArg = args.includes('--desktop');

// Default to production URL (update this to your actual production URL)
const DEFAULT_URL = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';
const url = urlArg ? urlArg.split('=')[1] : DEFAULT_URL;

// Device configuration
const formFactor = desktopArg ? 'desktop' : mobileArg ? 'mobile' : 'mobile';

// Lighthouse configuration
const lighthouseConfig = {
  extends: 'lighthouse:default',
  settings: {
    formFactor,
    throttling:
      formFactor === 'mobile'
        ? {
            // Mobile 4G
            rttMs: 150,
            throughputKbps: 1.6 * 1024,
            requestLatencyMs: 150,
            downloadThroughputKbps: 1.6 * 1024,
            uploadThroughputKbps: 750,
            cpuSlowdownMultiplier: 4,
          }
        : {
            // Desktop
            rttMs: 40,
            throughputKbps: 10 * 1024,
            requestLatencyMs: 0,
            downloadThroughputKbps: 0,
            uploadThroughputKbps: 0,
            cpuSlowdownMultiplier: 1,
          },
    screenEmulation:
      formFactor === 'mobile'
        ? {
            mobile: true,
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            disabled: false,
          }
        : {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
          },
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },
};

// Performance budgets
const PERFORMANCE_BUDGETS = {
  performance: 90, // Good
  accessibility: 90, // Good
  'best-practices': 90, // Good
  seo: 90, // Good
  // Core Web Vitals
  'largest-contentful-paint': 2500, // ms - Good
  'cumulative-layout-shift': 0.1, // Good
  'total-blocking-time': 200, // ms - Good
  'first-contentful-paint': 1800, // ms - Good
  'speed-index': 3400, // ms - Good
};

function getScoreColor(score) {
  if (score >= 90) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

function getScoreEmoji(score) {
  if (score >= 90) return '✅';
  if (score >= 50) return '⚠️ ';
  return '❌';
}

function formatScore(score) {
  return Math.round(score * 100);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function launchChromeAndRunLighthouse(url, config) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  });

  const options = {
    logLevel: 'error',
    output: ['html', 'json'],
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(url, options, config);
    return { runnerResult, chrome };
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

function analyzeCoreWebVitals(lhr) {
  const metrics = lhr.audits;

  return {
    lcp: {
      value: metrics['largest-contentful-paint']?.numericValue || 0,
      score: metrics['largest-contentful-paint']?.score || 0,
      displayValue: metrics['largest-contentful-paint']?.displayValue || 'N/A',
    },
    cls: {
      value: metrics['cumulative-layout-shift']?.numericValue || 0,
      score: metrics['cumulative-layout-shift']?.score || 0,
      displayValue: metrics['cumulative-layout-shift']?.displayValue || 'N/A',
    },
    fcp: {
      value: metrics['first-contentful-paint']?.numericValue || 0,
      score: metrics['first-contentful-paint']?.score || 0,
      displayValue: metrics['first-contentful-paint']?.displayValue || 'N/A',
    },
    tbt: {
      value: metrics['total-blocking-time']?.numericValue || 0,
      score: metrics['total-blocking-time']?.score || 0,
      displayValue: metrics['total-blocking-time']?.displayValue || 'N/A',
    },
    si: {
      value: metrics['speed-index']?.numericValue || 0,
      score: metrics['speed-index']?.score || 0,
      displayValue: metrics['speed-index']?.displayValue || 'N/A',
    },
  };
}

function checkBudgets(lhr, webVitals) {
  const violations = [];

  // Check category scores
  Object.entries(lhr.categories).forEach(([key, category]) => {
    const score = formatScore(category.score);
    const budget = PERFORMANCE_BUDGETS[key];

    if (budget && score < budget) {
      violations.push({
        metric: category.title,
        actual: score,
        budget,
        difference: score - budget,
      });
    }
  });

  // Check Core Web Vitals
  if (webVitals.lcp.value > PERFORMANCE_BUDGETS['largest-contentful-paint']) {
    violations.push({
      metric: 'Largest Contentful Paint',
      actual: `${Math.round(webVitals.lcp.value)}ms`,
      budget: `${PERFORMANCE_BUDGETS['largest-contentful-paint']}ms`,
      difference: `+${Math.round(webVitals.lcp.value - PERFORMANCE_BUDGETS['largest-contentful-paint'])}ms`,
    });
  }

  if (webVitals.cls.value > PERFORMANCE_BUDGETS['cumulative-layout-shift']) {
    violations.push({
      metric: 'Cumulative Layout Shift',
      actual: webVitals.cls.value.toFixed(3),
      budget: PERFORMANCE_BUDGETS['cumulative-layout-shift'],
      difference: `+${(webVitals.cls.value - PERFORMANCE_BUDGETS['cumulative-layout-shift']).toFixed(3)}`,
    });
  }

  return violations;
}

function getTopIssues(lhr, category, count = 5) {
  const categoryAudits = lhr.categories[category]?.auditRefs || [];
  const failedAudits = categoryAudits
    .map((ref) => {
      const audit = lhr.audits[ref.id];
      return {
        id: ref.id,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue,
      };
    })
    .filter((audit) => audit.score !== null && audit.score < 1)
    .sort((a, b) => a.score - b.score)
    .slice(0, count);

  return failedAudits;
}

async function main() {
  log('\n╔════════════════════════════════════════╗', 'bright');
  log('║     Lighthouse Performance Audit       ║', 'bright');
  log('╚════════════════════════════════════════╝', 'bright');

  log(`\n🌐 URL: ${url}`, 'cyan');
  log(`📱 Device: ${formFactor}`, 'cyan');
  log(`\n🚀 Running Lighthouse audit...\n`, 'cyan');

  try {
    const { runnerResult, chrome } = await launchChromeAndRunLighthouse(url, lighthouseConfig);

    // Close Chrome
    await chrome.kill();

    const lhr = runnerResult.lhr;

    // Save reports
    const reportsDir = path.join(__dirname, '..', 'lighthouse-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlReport = runnerResult.report[0];
    const jsonReport = runnerResult.report[1];

    const htmlPath = path.join(reportsDir, `lighthouse-${formFactor}-${timestamp}.html`);
    const jsonPath = path.join(reportsDir, `lighthouse-${formFactor}-${timestamp}.json`);

    fs.writeFileSync(htmlPath, htmlReport);
    fs.writeFileSync(jsonPath, jsonReport);

    // Analyze results
    log('📊 Audit Results:', 'bright');
    log('');

    // Category scores
    Object.entries(lhr.categories).forEach(([key, category]) => {
      const score = formatScore(category.score);
      const color = getScoreColor(score);
      const emoji = getScoreEmoji(score);
      const budget = PERFORMANCE_BUDGETS[key];
      const budgetText = budget ? ` (Budget: ${budget})` : '';

      log(`  ${emoji} ${category.title}: ${score}${budgetText}`, color);
    });

    // Core Web Vitals
    log('\n🎯 Core Web Vitals:', 'bright');
    const webVitals = analyzeCoreWebVitals(lhr);

    Object.entries(webVitals).forEach(([key, vital]) => {
      const score = formatScore(vital.score);
      const color = getScoreColor(score);
      const emoji = getScoreEmoji(score);
      const labels = {
        lcp: 'Largest Contentful Paint',
        cls: 'Cumulative Layout Shift',
        fcp: 'First Contentful Paint',
        tbt: 'Total Blocking Time',
        si: 'Speed Index',
      };

      log(`  ${emoji} ${labels[key]}: ${vital.displayValue}`, color);
    });

    // Performance metrics
    log('\n⚡ Performance Metrics:', 'bright');
    const metrics = lhr.audits;

    const metricsToShow = [
      { key: 'interactive', label: 'Time to Interactive' },
      { key: 'max-potential-fid', label: 'Max Potential FID' },
      { key: 'total-byte-weight', label: 'Total Page Weight' },
      { key: 'dom-size', label: 'DOM Size' },
    ];

    metricsToShow.forEach(({ key, label }) => {
      const metric = metrics[key];
      if (metric) {
        const displayValue = metric.displayValue || 'N/A';
        log(`  • ${label}: ${displayValue}`);
      }
    });

    // Budget violations
    const violations = checkBudgets(lhr, webVitals);
    if (violations.length > 0) {
      log('\n⚠️  Performance Budget Violations:', 'yellow');
      violations.forEach((v) => {
        log(`  • ${v.metric}: ${v.actual} (Budget: ${v.budget}, ${v.difference})`, 'yellow');
      });
    } else {
      log('\n✅ All performance budgets met!', 'green');
    }

    // Top issues by category
    const categoriesToCheck = ['performance', 'accessibility', 'best-practices', 'seo'];

    categoriesToCheck.forEach((category) => {
      const issues = getTopIssues(lhr, category, 3);
      if (issues.length > 0) {
        const categoryLabel = lhr.categories[category].title;
        log(`\n🔍 Top ${categoryLabel} Issues:`, 'bright');
        issues.forEach((issue, index) => {
          log(`  ${index + 1}. ${issue.title}`, 'yellow');
          if (issue.displayValue) {
            log(`     ${issue.displayValue}`, 'reset');
          }
        });
      }
    });

    // Recommendations
    log('\n💡 Quick Wins:', 'bright');
    const quickWins = [
      { key: 'uses-optimized-images', label: 'Optimize images' },
      { key: 'unminified-css', label: 'Minify CSS' },
      { key: 'unminified-javascript', label: 'Minify JavaScript' },
      { key: 'unused-css-rules', label: 'Remove unused CSS' },
      { key: 'unused-javascript', label: 'Remove unused JavaScript' },
    ];

    let hasQuickWins = false;
    quickWins.forEach(({ key, label }) => {
      const audit = metrics[key];
      if (audit && audit.score < 1) {
        hasQuickWins = true;
        const savings = audit.details?.overallSavingsMs
          ? `(Save ~${Math.round(audit.details.overallSavingsMs)}ms)`
          : '';
        log(`  • ${label} ${savings}`, 'cyan');
      }
    });

    if (!hasQuickWins) {
      log('  No major quick wins identified!', 'green');
    }

    // Report locations
    log('\n📁 Reports saved:', 'bright');
    log(`  HTML: ${path.relative(process.cwd(), htmlPath)}`, 'cyan');
    log(`  JSON: ${path.relative(process.cwd(), jsonPath)}`, 'cyan');

    // Summary
    const avgScore =
      Object.values(lhr.categories).reduce((sum, cat) => sum + cat.score, 0) / Object.keys(lhr.categories).length;
    const avgScoreFormatted = formatScore(avgScore);

    log('\n📈 Overall Score:', 'bright');
    log(`  ${getScoreEmoji(avgScoreFormatted)} ${avgScoreFormatted}/100`, getScoreColor(avgScoreFormatted));

    log('\n✅ Audit complete!', 'green');
    log('\n════════════════════════════════════════\n', 'bright');

    // Exit with error if budgets violated
    if (violations.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    log('\n❌ Audit failed:', 'red');
    log(`  ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
