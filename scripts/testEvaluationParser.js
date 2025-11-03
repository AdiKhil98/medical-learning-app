/**
 * Test script to verify the flexible evaluation parser
 * Run with: node scripts/testEvaluationParser.js
 */

// Sample evaluation from user's Supabase
const sampleEvaluation = `**ZUSAMMENFASSUNG:** Dr. Weber zeigt eine medizinisch korrekte Herangehensweise bei der Diabetes-Verdachtsdiagnose mit systematischer Anamnese und angemessenem Diagnostikplan. Jedoch fehlen wichtige Differentialdiagnosen und eine körperliche Untersuchung vollständig.  **BESTANDEN:** JA (≥60 Punkte UND keine gefährlichen Fehler)  **SCORE: 68/100**  ---  **PUNKTEVERTEILUNG:** 1. Med. Korrektheit: 25/40 2. Anamnese/Untersuchung: 14/20 3. Therapieplan: 15/20 4. Kommunikation: 12/15 5. Professionalität: 5/5  **Abzüge:** -3 Punkte **ENDSCORE:** 68/100  ---  **✅ RICHTIG GEMACHT:** - Korrekte Erkennung der klassischen Diabetes-Trias (Polydipsie, Polyurie, Gewichtsverlust) - Systematische Anamnese mit relevanten Risikofaktoren (Familienanamnese, Lifestyle) - Angemessener Diagnostikplan (NBZ, HbA1c, Urin auf Glukose/Ketone) - Patientengerechte Aufklärung ohne Panikmache - Strukturiertes Vorgehen mit klarem Terminplan  **❓ FEHLENDE ÜBERLEGUNGEN:** - Keine Differentialdiagnosen erwähnt (Hyperthyreose, Malignome, Diabetes insipidus) - Körperliche Untersuchung komplett ausgelassen (Vital signs, BMI, abdomineller Befund) - Keine Erwähnung von weiteren Laborparametern (Kreatinin, Lipidstatus) - Akute Komplikationen nicht abgefragt (Ketoazidose-Symptome)  ---  **📚 LERNPRIORITÄTEN:** 🔴 DRINGEND: Differentialdiagnostik bei Polydipsie/Polyurie vertiefen 🟡 WICHTIG: Körperliche Untersuchung bei Diabetes-Verdacht standardisieren 🟢 OPTIONAL: Erweiterte Diabetes-Diagnostik (OGTT-Indikationen)  **💪 KONKRETE NÄCHSTE SCHRITTE:** 1. Lerne die wichtigsten 3-5 Differentialdiagnosen bei Polydipsie auswendig 2. Erstelle eine Checkliste für die körperliche Untersuchung bei Diabetes-Verdacht  **📖 EMPFOHLENE RESSOURCEN:** - S3-Leitlinie "Therapie des Typ-2-Diabetes" (DDG/DGIM) - DEGAM-Leitlinie "Diabetes mellitus Typ 2"`;

console.log('🧪 Testing Flexible Evaluation Parser\n');
console.log('=' .repeat(60));

// Test score parsing
console.log('\n📊 SCORE PARSING:');
const scoreMatch = sampleEvaluation.match(/\*{0,2}(?:SCORE|ENDSCORE|PUNKTE|PUNKTZAHL)[\s:]*(\d+)\s*\/\s*(\d+)/i);
if (scoreMatch) {
  console.log(`✅ Found: ${scoreMatch[1]}/${scoreMatch[2]}`);
  console.log(`   Percentage: ${Math.round((parseInt(scoreMatch[1]) / parseInt(scoreMatch[2])) * 100)}%`);
} else {
  console.log('❌ Score not found');
}

// Test categories parsing
console.log('\n📋 CATEGORIES PARSING:');
const numberedPattern = /\*{0,2}\d+\.\s*([^:*\n]+?)[\s:*]+(\d+)\s*[\/:]?\s*(\d+)/g;
let match;
let categoryCount = 0;
while ((match = numberedPattern.exec(sampleEvaluation)) !== null) {
  categoryCount++;
  const name = match[1].trim();
  const score = parseInt(match[2]);
  const maxScore = parseInt(match[3]);
  const percentage = Math.round((score / maxScore) * 100);
  console.log(`✅ ${categoryCount}. ${name}: ${score}/${maxScore} (${percentage}%)`);
}

// Test strengths parsing
console.log('\n✅ STRENGTHS PARSING:');
const strengthsPattern = /\*{0,2}✅\s*(?:RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN|STRENGTHS)[\s:*]+(.+?)(?=\n\*{0,2}[❓📚🔴🟡🟢✗❌]|\n\n\*{0,2}\w+:|$)/is;
const strengthsMatch = sampleEvaluation.match(strengthsPattern);
if (strengthsMatch) {
  const bullets = strengthsMatch[1].match(/(?:^|\n)\s*[-*•]\s*(.+?)(?=\n|$)/g);
  if (bullets) {
    bullets.forEach((bullet, i) => {
      const cleaned = bullet.replace(/^\s*[-*•]\s*/, '').trim();
      console.log(`✅ ${i + 1}. ${cleaned.substring(0, 60)}${cleaned.length > 60 ? '...' : ''}`);
    });
  }
}

// Test missing questions parsing
console.log('\n❓ MISSING QUESTIONS PARSING:');
const missingPattern = /\*{0,2}❓\s*(?:FEHLENDE ÜBERLEGUNGEN|MISSING|GAPS|FEHLENDE FRAGEN)[\s:*]+(.+?)(?=\n\*{0,2}[✅📚🔴🟡🟢✗❌]|\n\n\*{0,2}\w+:|$)/is;
const missingMatch = sampleEvaluation.match(missingPattern);
if (missingMatch) {
  const bullets = missingMatch[1].match(/(?:^|\n)\s*[-*•]\s*(.+?)(?=\n|$)/g);
  if (bullets) {
    bullets.forEach((bullet, i) => {
      const cleaned = bullet.replace(/^\s*[-*•]\s*/, '').trim();
      console.log(`❓ ${i + 1}. ${cleaned.substring(0, 60)}${cleaned.length > 60 ? '...' : ''}`);
    });
  }
}

// Test next steps parsing (priorities)
console.log('\n📚 LEARNING PRIORITIES PARSING:');
const priorityPatterns = [
  { regex: /🔴\s*(?:DRINGEND|URGENT|KRITISCH):\s*(.+?)(?=\n|$)/gi, label: 'URGENT' },
  { regex: /🟡\s*(?:WICHTIG|IMPORTANT):\s*(.+?)(?=\n|$)/gi, label: 'IMPORTANT' },
  { regex: /🟢\s*(?:OPTIONAL|EMPFOHLEN|RECOMMENDED):\s*(.+?)(?=\n|$)/gi, label: 'OPTIONAL' },
];

priorityPatterns.forEach(({ regex, label }) => {
  let priorityMatch;
  while ((priorityMatch = regex.exec(sampleEvaluation)) !== null) {
    const action = priorityMatch[1].trim();
    console.log(`${label === 'URGENT' ? '🔴' : label === 'IMPORTANT' ? '🟡' : '🟢'} ${label}: ${action}`);
  }
});

// Test concrete next steps
console.log('\n💪 CONCRETE NEXT STEPS PARSING:');
const stepsPattern = /\*{0,2}💪\s*(?:KONKRETE NÄCHSTE SCHRITTE|NEXT STEPS|NÄCHSTE SCHRITTE)[\s:*]+(.+?)(?=\n\*{0,2}[✅❓📚📖🔴]|\n\n\*{0,2}\w+:|$)/is;
const stepsMatch = sampleEvaluation.match(stepsPattern);
if (stepsMatch) {
  const numberedSteps = stepsMatch[1].match(/(?:^|\n)\s*\d+\.\s*(.+?)(?=\n|$)/g);
  if (numberedSteps) {
    numberedSteps.forEach((step, index) => {
      const cleaned = step.replace(/^\s*\d+\.\s*/, '').trim();
      console.log(`💪 ${index + 1}. ${cleaned}`);
    });
  }
}

// Test summary parsing
console.log('\n📝 SUMMARY PARSING:');
const summaryPattern = /\*{0,2}(?:ZUSAMMENFASSUNG|OVERVIEW|SUMMARY)[\s:*]+(.+?)(?=\n\*{0,2}(?:BESTANDEN|SCORE|PUNKTEVERTEILUNG)|$)/is;
const summaryMatch = sampleEvaluation.match(summaryPattern);
if (summaryMatch) {
  const summary = summaryMatch[1].trim();
  console.log(`✅ ${summary.substring(0, 100)}${summary.length > 100 ? '...' : ''}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ Parser test completed!\n');
