/**
 * Script to revert quota fallback changes from kp.tsx and fsp.tsx
 * The quota fallback was causing double-counting issues
 * Run with: node scripts/revert-quota-fallback.js
 */

const fs = require('fs');
const path = require('path');

// Files to fix
const files = [
  path.join(__dirname, '..', 'app', '(tabs)', 'simulation', 'kp.tsx'),
  path.join(__dirname, '..', 'app', '(tabs)', 'simulation', 'fsp.tsx'),
];

files.forEach((filePath) => {
  const fileName = path.basename(filePath);
  console.log(`\n📝 Processing ${fileName}...`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Remove the quotaFallback import
  const importPatterns = [
    /import { verifyAndFixQuota, getCurrentQuotaUsed } from '@\/lib\/quotaFallback';\n?/g,
    /import \{ verifyAndFixQuota, getCurrentQuotaUsed \} from '@\/lib\/quotaFallback';\n?/g,
  ];

  importPatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      modified = true;
      console.log('✅ Removed quotaFallback import');
    }
  });

  // 2. Remove the fallback code block (KP version)
  const kpFallbackBlock = `
        // CRITICAL FIX: Verify quota was actually incremented and fix if needed
        const usedBefore = await getCurrentQuotaUsed(user?.id);
        const fallbackResult = await verifyAndFixQuota(user?.id, usedBefore);
        if (fallbackResult.fixed) {
          console.warn('🔧 Quota was fixed via fallback mechanism');
        }`;

  if (content.includes(kpFallbackBlock)) {
    content = content.replace(kpFallbackBlock, '');
    modified = true;
    console.log('✅ Removed KP fallback code block');
  }

  // 3. Remove the fallback code block (FSP version)
  const fspFallbackBlock = `
        // CRITICAL FIX: Verify quota was actually incremented and fix if needed
        const usedBefore = await getCurrentQuotaUsed(user?.id);
        const fallbackResult = await verifyAndFixQuota(user?.id, usedBefore);
        if (fallbackResult.fixed) {
          console.warn('🔧 FSP: Quota was fixed via fallback mechanism');
        }`;

  if (content.includes(fspFallbackBlock)) {
    content = content.replace(fspFallbackBlock, '');
    modified = true;
    console.log('✅ Removed FSP fallback code block');
  }

  // 4. Also try removing with different whitespace
  const fallbackPattern =
    /\n\s*\/\/ CRITICAL FIX: Verify quota was actually incremented and fix if needed\n\s*const usedBefore = await getCurrentQuotaUsed\(user\?\.\id\);\n\s*const fallbackResult = await verifyAndFixQuota\(user\?\.\id, usedBefore\);\n\s*if \(fallbackResult\.fixed\) \{\n\s*console\.warn\(['"].*Quota was fixed via fallback mechanism['"]\);\n\s*\}/g;

  if (fallbackPattern.test(content)) {
    content = content.replace(fallbackPattern, '');
    modified = true;
    console.log('✅ Removed fallback code block (pattern match)');
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Changes written to ${fileName}`);
  } else {
    console.log(`ℹ️ No changes needed in ${fileName}`);
  }
});

// 5. Delete the quotaFallback.ts file
const quotaFallbackPath = path.join(__dirname, '..', 'lib', 'quotaFallback.ts');
if (fs.existsSync(quotaFallbackPath)) {
  fs.unlinkSync(quotaFallbackPath);
  console.log('\n✅ Deleted lib/quotaFallback.ts');
} else {
  console.log('\nℹ️ lib/quotaFallback.ts already deleted');
}

// 6. Delete the apply scripts (no longer needed)
const scriptsToDelete = [path.join(__dirname, 'apply-quota-fix.js'), path.join(__dirname, 'apply-quota-fix-fsp.js')];

scriptsToDelete.forEach((scriptPath) => {
  if (fs.existsSync(scriptPath)) {
    fs.unlinkSync(scriptPath);
    console.log(`✅ Deleted ${path.basename(scriptPath)}`);
  }
});

console.log('\n🎉 Done! Quota fallback code has been removed.');
console.log('The cleanup RPC will no longer increment quota (after migration is applied).');
