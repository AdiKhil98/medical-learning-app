#!/usr/bin/env node

/**
 * Coverage Badge Script
 *
 * Reads coverage-summary.json and displays coverage information
 * Can be used to generate dynamic badge URLs
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');

// Color thresholds
const getColor = (percentage) => {
  if (percentage >= 80) return 'brightgreen';
  if (percentage >= 60) return 'green';
  if (percentage >= 40) return 'yellow';
  if (percentage >= 20) return 'orange';
  return 'red';
};

const getBadgeUrl = (label, value, color) => {
  return `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(value)}-${color}`;
};

try {
  // Check if coverage file exists
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error('❌ Coverage file not found!');
    console.error('   Run: npm run test:coverage');
    process.exit(1);
  }

  // Read coverage data
  const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  const total = coverage.total;

  // Calculate overall percentage
  const statements = total.statements.pct;
  const branches = total.branches.pct;
  const functions = total.functions.pct;
  const lines = total.lines.pct;

  const overall = Math.round((statements + branches + functions + lines) / 4);

  // Display coverage information
  console.log('\n📊 Test Coverage Summary\n');
  console.log('═'.repeat(50));
  console.log(`  Statements : ${statements.toFixed(2)}%`);
  console.log(`  Branches   : ${branches.toFixed(2)}%`);
  console.log(`  Functions  : ${functions.toFixed(2)}%`);
  console.log(`  Lines      : ${lines.toFixed(2)}%`);
  console.log('═'.repeat(50));
  console.log(`  Overall    : ${overall}%`);
  console.log('═'.repeat(50));

  // Display badge URL
  const color = getColor(overall);
  const badgeUrl = getBadgeUrl('coverage', `${overall}%`, color);

  console.log('\n🏷️  Coverage Badge:\n');
  console.log(`  ${badgeUrl}`);
  console.log('\n📝 Markdown:\n');
  console.log(`  ![Coverage](${badgeUrl})`);

  // Display detailed coverage by file
  console.log('\n📂 Coverage by File:\n');

  const files = Object.keys(coverage)
    .filter((key) => key !== 'total')
    .sort((a, b) => {
      const aLines = coverage[a].lines.pct;
      const bLines = coverage[b].lines.pct;
      return bLines - aLines; // Sort by coverage descending
    });

  files.forEach((file) => {
    const fileCoverage = coverage[file];
    const fileLines = fileCoverage.lines.pct;
    const emoji = fileLines >= 80 ? '✅' : fileLines >= 60 ? '🟡' : '❌';

    // Shorten file path for display
    const shortPath = file.replace(process.cwd(), '.').substring(0, 50);

    console.log(`  ${emoji} ${shortPath.padEnd(52)} ${fileLines.toFixed(1)}%`);
  });

  console.log('\n');

  // Exit with appropriate code
  if (overall < 15) {
    console.error('⚠️  Coverage is below 15% threshold!');
    process.exit(1);
  }

  console.log('✅ Coverage thresholds met!\n');
  process.exit(0);
} catch (error) {
  console.error('❌ Error reading coverage data:', error.message);
  process.exit(1);
}
