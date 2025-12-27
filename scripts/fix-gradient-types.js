const fs = require('fs');
const path = require('path');

// Files to fix based on tsc errors
const filesToFix = [
  'app/feedback.tsx',
  'app/haftung.tsx',
  'app/help/index.tsx',
  'app/impressum.tsx',
  'app/konto/datenschutz-agb.tsx',
  'app/konto/passwort-aendern.tsx',
  'app/konto/persoenliche-daten.tsx',
  'app/profile.tsx',
  'app/settings/licenses.tsx',
  'components/dashboard/ErrorBoundary.tsx',
  'components/dashboard/sections/DailyQuestionSection.tsx',
  'components/dashboard/sections/DailyTipSection.tsx',
  'components/evaluation/EvaluationDetailScreen.tsx',
  'components/examiner-evaluation/CategoryTable.tsx',
  'components/homepage/SlidingHomepage.tsx',
  'components/onboarding/WelcomeFlow.tsx',
  'components/OptimizedImage.tsx',
  'components/ui/CelestialOrb.tsx',
  'components/ui/folder.tsx',
  'components/ui/HierarchicalSectionCard.tsx',
  'components/ui/InlineInstructions.tsx',
  'components/ui/Input.tsx',
  'components/ui/InteractiveMedicalContent.tsx',
  'components/ui/MedicalContentModal.tsx',
  'components/ui/MedicalSectionCard.tsx',
  'components/ui/Menu.tsx',
  'components/ui/MobileBibliothekCard.tsx',
  'components/ui/ModernMedicalCard.tsx',
  'components/ui/SplineOrb.tsx',
  'components/ui/SubscriptionPlans.tsx',
  'components/ui/ViewModeToggle.tsx',
  'components/ui/VoiceMicrophone.tsx',
];

// Pattern to match gradient variable declarations (const gradient = [...];)
const gradientPattern = /^(\s*(?:const|let)\s+\w*(?:gradient|Gradient|colors|Colors)\w*\s*=\s*\[)([^\]]+)(\];)/gm;

filesToFix.forEach((file) => {
  const fullPath = path.join(process.cwd(), file);

  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Fix pattern: const gradient = ['#xxx', '#yyy']; -> const gradient = ['#xxx', '#yyy'] as const;
  content = content.replace(gradientPattern, (match, prefix, colors, suffix) => {
    // Skip if already has 'as const' or 'as readonly'
    if (match.includes('as const') || match.includes('as readonly')) {
      return match;
    }
    modified = true;
    // Change ]; to ] as const;
    return `${prefix}${colors}] as const;`;
  });

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`No changes needed: ${file}`);
  }
});

console.log('\nDone!');
