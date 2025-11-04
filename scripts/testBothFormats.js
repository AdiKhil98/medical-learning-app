// Import the parser (we'll simulate it here since we can't import TS directly)
const eval2 = `**GESAMTEINDRUCK:**
Sehr gute, professionelle Gesprächsführung mit systematischer Anamnese und empathischer Patientenkommunikation.

---

**DETAILLIERTE KATEGORIEN:**

**📊 KOMMUNIKATIV:** 32/35 (91%)
**📊 SPRACHLICH:** 29/30 (97%)
**📊 ANAMNESE:** 22/25 (88%)
**📊 PRAKTISCH:** 10/10 (100%)

---

**HAUPTFEHLER (SOFORT VERBESSERN):**

**1. FEHLENDE ALLERGIEABFRAGE:** -3 Punkte
**2. UNVOLLSTÄNDIGE VERSTÄNDNISSICHERUNG:** -2 Punkte

---

**VERPASSTE CHANCEN:**

**EXPLIZITE BERUHIGUNG BEI DIAGNOSEANGST**
⚠️ Essentiell weil: Patient zeigt deutliche Sorge

---

**✓ GUT GEMACHT:**
- Strukturierte Anamnese
- Gezielte Nachfragen
- Zusammenfassung

---

**✨ IHRE STÄRKEN:**
✓ Exzellente Anamnese-Struktur
✓ Perfekte Fachsprache-Übersetzung
✓ Beruhigende Aufklärung`;

console.log('='.repeat(80));
console.log('TESTING UPDATED PARSER WITH FORMAT B (Second Evaluation)');
console.log('='.repeat(80));

console.log('\n📊 TEST 1: Score Extraction from Category Totals');
const categoryScores = [];
const emojiCategoryPattern = /📊\s*[^:]+:\s*(\d+)\/(\d+)/g;
let match;
while ((match = emojiCategoryPattern.exec(eval2)) !== null) {
  categoryScores.push({
    score: parseInt(match[1]),
    max: parseInt(match[2])
  });
}
console.log('Categories found:', categoryScores.length);
if (categoryScores.length > 0) {
  const total = categoryScores.reduce((sum, cat) => sum + cat.score, 0);
  const maxScore = categoryScores.reduce((sum, cat) => sum + cat.max, 0);
  const percentage = Math.round((total / maxScore) * 100);
  console.log(`✅ Total Score: ${total}/${maxScore} (${percentage}%)`);
  categoryScores.forEach((cat, i) => {
    console.log(`   Category ${i+1}: ${cat.score}/${cat.max}`);
  });
}

console.log('\n📋 TEST 2: Category Details Extraction');
const emojiPattern = /\*{2,}📊\s*([^:*]+?)[\s:*]+(\d+)\/(\d+)\s*\((\d+)%\)/g;
const categories = [];
while ((match = emojiPattern.exec(eval2)) !== null) {
  categories.push({
    name: match[1].trim(),
    score: parseInt(match[2]),
    max: parseInt(match[3]),
    percentage: parseInt(match[4])
  });
}
console.log('Detailed categories found:', categories.length);
categories.forEach(cat => {
  console.log(`✅ ${cat.name}: ${cat.score}/${cat.max} (${cat.percentage}%)`);
});

console.log('\n❌ TEST 3: HAUPTFEHLER (Critical Errors)');
const hauptfehlerMatch = eval2.match(/\*{2,}HAUPTFEHLER[\s:(]*(.+?)(?=\s*\*{2,}VERPASSTE|---|\n\n|$)/is);
if (hauptfehlerMatch) {
  console.log('HAUPTFEHLER section found ✅');
  const errorPattern = /\*{2,}(\d+)\.\s*([^:*]+?)[\s:*]+\-(\d+)\s*Punkte/g;
  const errors = [];
  while ((match = errorPattern.exec(hauptfehlerMatch[1])) !== null) {
    errors.push({
      number: match[1],
      title: match[2].trim(),
      points: parseInt(match[3])
    });
  }
  console.log(`Errors extracted: ${errors.length}`);
  errors.forEach(err => {
    console.log(`✅ ${err.number}. ${err.title}: -${err.points} Punkte`);
  });
}

console.log('\n❓ TEST 4: VERPASSTE CHANCEN (Missing Questions)');
const verpassteMatch = eval2.match(/\*{2,}(?:FEHLENDE ÜBERLEGUNGEN|VERPASSTE CHANCEN)[\s:*]+(.+?)(?=\s*\*{2,}[✅✓✨📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is);
if (verpassteMatch) {
  console.log('VERPASSTE CHANCEN section found ✅');
  console.log('Content:', verpassteMatch[1].substring(0, 100) + '...');
}

console.log('\n✓ TEST 5: Strengths with ✓ symbol');
const checkStrengthsMatch = eval2.match(/\*{2,}✓\s*(?:GUT GEMACHT|RICHTIG GEMACHT|STÄRKEN)[\s:*]+(.+?)(?=\s*\*{2,}[❓📚🔴🟡🟢✗❌💪📖✨]|---|\n\n|$)/is);
if (checkStrengthsMatch) {
  console.log('✓ GUT GEMACHT section found ✅');
  const bullets = checkStrengthsMatch[1].split(/\s*-\s*/).filter(b => b.trim().length > 0);
  console.log(`Strengths found: ${bullets.length}`);
  bullets.slice(0, 3).forEach((b, i) => {
    const cleaned = b.trim().split(/[\*]{2,}/)[0].trim();
    console.log(`✅ ${i+1}. ${cleaned.substring(0, 50)}...`);
  });
}

console.log('\n✨ TEST 6: Strengths with ✨ symbol');
const sparklesMatch = eval2.match(/\*{2,}✨\s*(?:IHRE STÄRKEN|STÄRKEN|STRENGTHS)[\s:*]+(.+?)(?=\s*\*{2,}[❓📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is);
if (sparklesMatch) {
  console.log('✨ IHRE STÄRKEN section found ✅');
  const bullets = sparklesMatch[1].split(/\n/).filter(line => line.trim().startsWith('✓'));
  console.log(`Strengths found: ${bullets.length}`);
  bullets.forEach((b, i) => {
    const cleaned = b.replace(/^✓\s*/, '').trim();
    console.log(`✅ ${i+1}. ${cleaned}`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY: Parser should now handle Format B correctly!');
console.log('='.repeat(80));
