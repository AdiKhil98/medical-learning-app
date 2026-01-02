/**
 * Script to apply quota fallback fix to kp.tsx
 * Run with: node scripts/apply-quota-fix.js
 */

const fs = require('fs');
const path = require('path');

const kpFilePath = path.join(__dirname, '..', 'app', '(tabs)', 'simulation', 'kp.tsx');

console.log('📝 Reading kp.tsx...');
let content = fs.readFileSync(kpFilePath, 'utf8');

// 1. Add import statement if not exists
if (content.includes('verifyAndFixQuota')) {
  console.log('✅ Import already exists');
} else {
  const importTarget = `import { quotaService } from '@/lib/quotaService';`;
  const importReplacement = `import { quotaService } from '@/lib/quotaService';
import { verifyAndFixQuota, getCurrentQuotaUsed } from '@/lib/quotaFallback';`;

  if (content.includes(importTarget)) {
    content = content.replace(importTarget, importReplacement);
    console.log('✅ Added import statement');
  } else {
    console.error('❌ Could not find import target');
    process.exit(1);
  }
}

// 2. Add fallback logic after "SIMULATION MARKED AS COUNTED IN DATABASE"
const markerLine = `console.warn('✅✅✅ SIMULATION MARKED AS COUNTED IN DATABASE');`;
const fallbackCode = `console.warn('✅✅✅ SIMULATION MARKED AS COUNTED IN DATABASE');

        // CRITICAL FIX: Verify quota was actually incremented and fix if needed
        const usedBefore = await getCurrentQuotaUsed(user?.id);
        const fallbackResult = await verifyAndFixQuota(user?.id, usedBefore);
        if (fallbackResult.fixed) {
          console.warn('🔧 Quota was fixed via fallback mechanism');
        }`;

if (content.includes('verifyAndFixQuota(user')) {
  console.log('✅ Fallback logic already exists');
} else if (content.includes(markerLine)) {
  // Replace the marker line with marker + fallback
  content = content.replace(markerLine, fallbackCode);
  console.log('✅ Added fallback logic after MARKED AS COUNTED log');
} else {
  console.error('❌ Could not find marker line');
  console.log('Looking for:', markerLine);
  process.exit(1);
}

// Write back
fs.writeFileSync(kpFilePath, content, 'utf8');
console.log('✅ Changes written to kp.tsx');
console.log('🎉 Done! Run "npm run web" to test');
