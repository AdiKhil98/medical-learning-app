/**
 * Script to apply quota fallback fix to fsp.tsx
 * Run with: node scripts/apply-quota-fix-fsp.js
 */

const fs = require('fs');
const path = require('path');

const fspFilePath = path.join(__dirname, '..', 'app', '(tabs)', 'simulation', 'fsp.tsx');

console.log('📝 Reading fsp.tsx...');
let content = fs.readFileSync(fspFilePath, 'utf8');

// 1. Add import statement if not exists
if (content.includes('verifyAndFixQuota')) {
  console.log('✅ Import already exists');
} else {
  const importTarget = `import { simulationTracker } from '@/lib/simulationTrackingService';`;
  const importReplacement = `import { simulationTracker } from '@/lib/simulationTrackingService';
import { verifyAndFixQuota, getCurrentQuotaUsed } from '@/lib/quotaFallback';`;

  if (content.includes(importTarget)) {
    content = content.replace(importTarget, importReplacement);
    console.log('✅ Added import statement');
  } else {
    console.error('❌ Could not find import target');
    process.exit(1);
  }
}

// 2. Add fallback logic after "Counter automatically incremented by database function"
const markerLine = `console.log('✅ FSP: Counter automatically incremented by database function');`;
const fallbackCode = `console.log('✅ FSP: Counter automatically incremented by database function');

        // CRITICAL FIX: Verify quota was actually incremented and fix if needed
        const usedBefore = await getCurrentQuotaUsed(user?.id);
        const fallbackResult = await verifyAndFixQuota(user?.id, usedBefore);
        if (fallbackResult.fixed) {
          console.warn('🔧 FSP: Quota was fixed via fallback mechanism');
        }`;

if (content.includes('verifyAndFixQuota(user')) {
  console.log('✅ Fallback logic already exists');
} else if (content.includes(markerLine)) {
  // Replace the marker line with marker + fallback
  content = content.replace(markerLine, fallbackCode);
  console.log('✅ Added fallback logic after Counter incremented log');
} else {
  console.error('❌ Could not find marker line');
  console.log('Looking for:', markerLine);
  process.exit(1);
}

// Write back
fs.writeFileSync(fspFilePath, content, 'utf8');
console.log('✅ Changes written to fsp.tsx');
console.log('🎉 Done! Run "npm run web" to test');
