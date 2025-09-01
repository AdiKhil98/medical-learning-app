// Comprehensive import verification for index.tsx
const fs = require('fs');

const indexPath = 'app/(tabs)/index.tsx';
const content = fs.readFileSync(indexPath, 'utf8');

console.log('🔍 COMPREHENSIVE IMPORT VERIFICATION');
console.log('=' .repeat(50));

// Extract current imports
const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
console.log('\n📦 CURRENT IMPORTS:');
importLines.forEach(line => console.log(`  ${line.trim()}`));

// Find all component usage
const componentMatches = content.match(/<[A-Z][a-zA-Z0-9]*[\s\/>]/g) || [];
const usedComponents = [...new Set(componentMatches.map(match => match.replace(/[<\s\/>]/g, '')))];

console.log('\n🧩 COMPONENTS USED IN JSX:');
usedComponents.sort().forEach(comp => console.log(`  - ${comp}`));

// Check React Native components
const reactNativeComponents = [
  'View', 'Text', 'ScrollView', 'TouchableOpacity', 'SafeAreaView', 
  'Alert', 'Animated', 'Modal', 'StyleSheet', 'ActivityIndicator',
  'TextInput', 'Image', 'FlatList', 'Pressable', 'Switch', 'Slider'
];

const currentRNImports = content.match(/import\s*{([^}]+)}\s*from\s*['"]react-native['"]/);
const importedRN = currentRNImports ? currentRNImports[1].split(',').map(s => s.trim()) : [];

console.log('\n⚛️  REACT NATIVE COMPONENT CHECK:');
reactNativeComponents.forEach(comp => {
  const isUsed = usedComponents.includes(comp);
  const isImported = importedRN.includes(comp);
  if (isUsed && !isImported) {
    console.log(`  ❌ MISSING: ${comp} (used but not imported)`);
  } else if (isUsed && isImported) {
    console.log(`  ✅ OK: ${comp}`);
  }
});

// Check Lucide icons
const currentLucideImports = content.match(/import\s*{([^}]+)}\s*from\s*['"]lucide-react-native['"]/);
const importedLucide = currentLucideImports ? currentLucideImports[1].split(',').map(s => s.trim().replace(/\s+as\s+\w+/, '')) : [];

console.log('\n🎨 LUCIDE ICONS CHECK:');
const lucidePattern = /([A-Z][a-zA-Z0-9]*)\s+size=/g;
let match;
const lucideIcons = new Set();
while ((match = lucidePattern.exec(content)) !== null) {
  lucideIcons.add(match[1]);
}

[...lucideIcons].forEach(icon => {
  const isImported = importedLucide.some(imp => imp.includes(icon));
  if (!isImported) {
    console.log(`  ❌ MISSING LUCIDE: ${icon}`);
  } else {
    console.log(`  ✅ OK: ${icon}`);
  }
});

console.log('\n🎯 SUMMARY:');
console.log('Run this script after each deployment to verify all imports are correct.');
console.log('Any ❌ MISSING items need to be added to imports.');