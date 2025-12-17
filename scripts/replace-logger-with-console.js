const fs = require('fs');
const path = require('path');

// Files to update
const files = [
  path.join(__dirname, '..', 'app', '(tabs)', 'simulation', 'kp.tsx'),
  path.join(__dirname, '..', 'app', '(tabs)', 'simulation', 'fsp.tsx'),
];

files.forEach((filePath) => {
  console.log(`\n📝 Processing: ${path.basename(filePath)}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Count occurrences before replacement
  const loggerInfoCount = (content.match(/logger\.info/g) || []).length;
  const loggerWarnCount = (content.match(/logger\.warn/g) || []).length;
  const loggerErrorCount = (content.match(/logger\.error/g) || []).length;
  const loggerDebugCount = (content.match(/logger\.debug/g) || []).length;

  console.log(`   Found:`);
  console.log(`   - logger.info: ${loggerInfoCount}`);
  console.log(`   - logger.warn: ${loggerWarnCount}`);
  console.log(`   - logger.error: ${loggerErrorCount}`);
  console.log(`   - logger.debug: ${loggerDebugCount}`);

  // Replace logger calls
  content = content.replace(/logger\.info/g, 'console.log');
  content = content.replace(/logger\.warn/g, 'console.warn');
  content = content.replace(/logger\.error/g, 'console.error');
  content = content.replace(/logger\.debug/g, 'console.log');

  // Remove logger import
  content = content.replace(/import\s+{\s*logger\s*}\s+from\s+['"]@\/utils\/logger['"]\s*;?\s*\n?/g, '');

  // Write back
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   ✅ Replaced all logger calls with console.log/warn/error`);
    console.log(`   ✅ Removed logger import`);
  } else {
    console.log(`   ℹ️  No changes needed`);
  }
});

console.log('\n✅ Done! All logger calls replaced with console methods.');
console.log('📊 Summary:');
console.log('   - logger.info → console.log');
console.log('   - logger.warn → console.warn');
console.log('   - logger.error → console.error');
console.log('   - logger.debug → console.log');
