const evaluation2 = `**GESAMTEINDRUCK:**
Sehr gute, professionelle Gesprächsführung mit systematischer Anamnese und empathischer Patientenkommunikation. Exzellente Fachsprache-Übersetzung für Laien und beruhigende Aufklärung bei Patientenängsten. Kleinere Verbesserungen bei Allergieabfrage und expliziter Verständnissicherung möglich.

---

**HAUPTFEHLER (SOFORT VERBESSERN):**

**1. FEHLENDE ALLERGIEABFRAGE:** -3 Punkte

❌ "Haben Sie Vorerkrankungen oder nehmen Sie regelmäßig Medikamente?" - ohne Allergien zu erwähnen
✅ Besser: "Haben Sie Vorerkrankungen, nehmen Sie regelmäßig Medikamente oder haben Sie Allergien oder Unverträglichkeiten?"
💡 Problem: Sicherheitsrelevante Information fehlt

📋 **Warum problematisch:** Allergien sind essentiell für Therapieplanung und Patientensicherheit - besonders wichtig vor möglicher Medikamentenverschreibung.
✨ **Besserer Ansatz:** Allergieabfrage immer als Standardfrage in die Anamnese integrieren.`;

console.log('='.repeat(80));
console.log('ANALYZING SECOND EVALUATION FORMAT');
console.log('='.repeat(80));

console.log('\n📝 KEY DIFFERENCES FROM FIRST EVALUATION:\n');

console.log('1. SECTION HEADERS:');
console.log('   First eval: **ZUSAMMENFASSUNG:** (single keyword)');
console.log('   Second eval: **GESAMTEINDRUCK:** (different keyword)');
console.log('   First eval: **✅ RICHTIG GEMACHT:** (emoji header)');
console.log('   Second eval: **✓ GUT GEMACHT:** (text symbol, no emoji in header)');

console.log('\n2. SUMMARY SECTION:');
const summaryMatch = evaluation2.match(/\*{2,}(?:ZUSAMMENFASSUNG|OVERVIEW|SUMMARY|GESAMTEINDRUCK)[\s:*]+(.+?)(?=\s*\*{2,}|---|\n\n|$)/is);
console.log('   Current regex looks for: ZUSAMMENFASSUNG|OVERVIEW|SUMMARY');
console.log('   This eval has: GESAMTEINDRUCK');
console.log('   Match found:', summaryMatch ? 'YES ✅' : 'NO ❌');
if (summaryMatch) {
  console.log('   Extracted:', summaryMatch[1].substring(0, 100) + '...');
}

console.log('\n3. SCORE FORMAT:');
const scoreMatch = evaluation2.match(/\*{0,2}(?:SCORE|ENDSCORE|PUNKTE|PUNKTZAHL)[\s:]*(\d+)\s*\/\s*(\d+)/i);
console.log('   First eval: **SCORE: 68/100**');
console.log('   Second eval: No SCORE keyword found');
console.log('   Match found:', scoreMatch ? 'YES' : 'NO ❌');
console.log('   -> Parser will return score: 0/100 (default)');

console.log('\n4. CATEGORIES FORMAT:');
const categoryMatch = evaluation2.match(/\*{0,2}\d+\.\s*([^:*\n]+?)[\s:*]+(\d+)\s*[\/:]?\s*(\d+)/g);
console.log('   First eval: 1. Med. Korrektheit: 25/40');
console.log('   Second eval: Looking for numbered format...');
const categories = [];
let match;
const regex = /\*{0,2}\d+\.\s*([^:*\n]+?)[\s:*]+(\d+)\s*[\/:]?\s*(\d+)/g;
while ((match = regex.exec(evaluation2)) !== null) {
  categories.push(`${match[1].trim()}: ${match[2]}/${match[3]}`);
}
console.log('   Categories found:', categories.length);
console.log('   -> None found, will show defaults based on total score (0)');

console.log('\n5. DETAILED CATEGORIES SECTION:');
const detailedCatMatch = evaluation2.match(/\*{2,}DETAILLIERTE KATEGORIEN[\s:*]+(.+?)(?=\s*\*{2,}SPRACHNIVEAU|---|\n\n|$)/is);
console.log('   Has "**📊 KOMMUNIKATIV:** 32/35 (91%)" format');
console.log('   Has "**📊 SPRACHLICH:** 29/30 (97%)" format');
console.log('   Current parser does NOT look for 📊 emoji format');
console.log('   Match attempt:', detailedCatMatch ? 'YES' : 'NO');

console.log('\n6. STRENGTHS SECTION:');
const strengthsMatch = evaluation2.match(/\*{2,}✅\s*(?:RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN|STRENGTHS)[\s:*]+(.+?)(?=\s*\*{2,}[❓📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is);
console.log('   Current regex looks for: ✅ with header');
console.log('   This eval has: **✓ GUT GEMACHT:** (checkmark text, not emoji)');
console.log('   AND: **✨ IHRE STÄRKEN:** (different header)');
console.log('   Match found:', strengthsMatch ? 'YES' : 'NO ❌');

console.log('\n7. MISSING QUESTIONS SECTION:');
const missingMatch = evaluation2.match(/\*{2,}❓\s*(?:FEHLENDE ÜBERLEGUNGEN|MISSING|GAPS|FEHLENDE FRAGEN)[\s:*]+(.+?)(?=\s*\*{2,}[✅📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is);
console.log('   Current regex looks for: ❓ FEHLENDE ÜBERLEGUNGEN');
console.log('   This eval has: **VERPASSTE CHANCEN:** (different wording, no emoji)');
console.log('   Match found:', missingMatch ? 'YES' : 'NO ❌');

console.log('\n8. MAIN ERRORS SECTION:');
const errorsMatch = evaluation2.match(/\*{2,}HAUPTFEHLER/);
console.log('   This eval has: **HAUPTFEHLER (SOFORT VERBESSERN):**');
console.log('   Formatted as: **1. FEHLENDE ALLERGIEABFRAGE:** -3 Punkte');
console.log('   Current parser looks for: ISSUE_1_TITLE or structured format');
console.log('   Match found:', errorsMatch ? 'YES' : 'NO');

console.log('\n' + '='.repeat(80));
console.log('CONCLUSION:');
console.log('='.repeat(80));
console.log(`
This evaluation uses COMPLETELY DIFFERENT formatting:
1. Different keywords (GESAMTEINDRUCK vs ZUSAMMENFASSUNG)
2. Different symbols (✓ vs ✅)
3. Different section names (VERPASSTE CHANCEN vs FEHLENDE ÜBERLEGUNGEN)
4. No explicit SCORE: X/100 format
5. Different category format (📊 KOMMUNIKATIV: 32/35 vs numbered list)
6. Different strengths header (✨ IHRE STÄRKEN vs ✅ RICHTIG GEMACHT)

The parser is designed for Format A (first evaluation),
but this is Format B (completely different structure).

That's why it showed:
- Summary: Generic text (parser matched something but wrong section)
- Strengths: Only 2-3 items (partial match)
- Categories: All 0% (no score found, no numbered categories found)
- Missing: Probably empty or wrong section
`);
