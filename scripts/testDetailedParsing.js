const sampleEvaluation = `**ZUSAMMENFASSUNG:** Dr. Weber zeigt eine medizinisch korrekte Herangehensweise bei der Diabetes-Verdachtsdiagnose mit systematischer Anamnese und angemessenem Diagnostikplan. Jedoch fehlen wichtige Differentialdiagnosen und eine körperliche Untersuchung vollständig.  **BESTANDEN:** JA (≥60 Punkte UND keine gefährlichen Fehler)  **SCORE: 68/100**  ---  **PUNKTEVERTEILUNG:** 1. Med. Korrektheit: 25/40 2. Anamnese/Untersuchung: 14/20 3. Therapieplan: 15/20 4. Kommunikation: 12/15 5. Professionalität: 5/5  **Abzüge:** -3 Punkte **ENDSCORE:** 68/100  ---  **✅ RICHTIG GEMACHT:** - Korrekte Erkennung der klassischen Diabetes-Trias (Polydipsie, Polyurie, Gewichtsverlust) - Systematische Anamnese mit relevanten Risikofaktoren (Familienanamnese, Lifestyle) - Angemessener Diagnostikplan (NBZ, HbA1c, Urin auf Glukose/Ketone) - Patientengerechte Aufklärung ohne Panikmache - Strukturiertes Vorgehen mit klarem Terminplan  **❓ FEHLENDE ÜBERLEGUNGEN:** - Keine Differentialdiagnosen erwähnt (Hyperthyreose, Malignome, Diabetes insipidus) - Körperliche Untersuchung komplett ausgelassen (Vital signs, BMI, abdomineller Befund) - Keine Erwähnung von weiteren Laborparametern (Kreatinin, Lipidstatus) - Akute Komplikationen nicht abgefragt (Ketoazidose-Symptome)  ---  **📚 LERNPRIORITÄTEN:** 🔴 DRINGEND: Differentialdiagnostik bei Polydipsie/Polyurie vertiefen 🟡 WICHTIG: Körperliche Untersuchung bei Diabetes-Verdacht standardisieren 🟢 OPTIONAL: Erweiterte Diabetes-Diagnostik (OGTT-Indikationen)  **💪 KONKRETE NÄCHSTE SCHRITTE:** 1. Lerne die wichtigsten 3-5 Differentialdiagnosen bei Polydipsie auswendig 2. Erstelle eine Checkliste für die körperliche Untersuchung bei Diabetes-Verdacht  **📖 EMPFOHLENE RESSOURCEN:** - S3-Leitlinie "Therapie des Typ-2-Diabetes" (DDG/DGIM) - DEGAM-Leitlinie "Diabetes mellitus Typ 2"`;

console.log('Testing Summary Extract:\n');
const summaryMatch = sampleEvaluation.match(/\*{2,}(?:ZUSAMMENFASSUNG|OVERVIEW|SUMMARY)[\s:*]+(.+?)(?=\s*\*{2,}(?:BESTANDEN|SCORE|PUNKTEVERTEILUNG)|---|\n\n|$)/is);
if (summaryMatch) {
  console.log('FOUND:', summaryMatch[1].substring(0, 150) + '...\n');
}

console.log('Testing Strengths Extract:\n');
const strengthsMatch = sampleEvaluation.match(/\*{2,}✅\s*(?:RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN|STRENGTHS)[\s:*]+(.+?)(?=\s*\*{2,}[❓📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is);
if (strengthsMatch) {
  console.log('FOUND:', strengthsMatch[1].substring(0, 150) + '...\n');
  const bullets = strengthsMatch[1].match(/(?:^|\n)\s*[-*•]\s*(.+?)(?=\n[-*•]|\n\n|\*{2,}|$)/g);
  console.log('BULLETS:', bullets ? bullets.length : 0);
  if (bullets) {
    bullets.slice(0, 3).forEach((b, i) => console.log(`  ${i+1}. ${b.trim().substring(0, 60)}...`));
  }
}

console.log('\nTesting Missing Questions Extract:\n');
const missingMatch = sampleEvaluation.match(/\*{2,}❓\s*(?:FEHLENDE ÜBERLEGUNGEN|MISSING|GAPS|FEHLENDE FRAGEN)[\s:*]+(.+?)(?=\s*\*{2,}[✅📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is);
if (missingMatch) {
  console.log('FOUND:', missingMatch[1].substring(0, 150) + '...\n');
  const bullets = missingMatch[1].match(/(?:^|\n)\s*[-*•]\s*(.+?)(?=\n[-*•]|\n\n|\*{2,}|$)/g);
  console.log('BULLETS:', bullets ? bullets.length : 0);
  if (bullets) {
    bullets.slice(0, 3).forEach((b, i) => console.log(`  ${i+1}. ${b.trim().substring(0, 60)}...`));
  }
}

console.log('\nTesting Learning Priorities Extract:\n');
const prioritiesSection = sampleEvaluation.match(/\*{2,}📚\s*(?:LERNPRIORITÄTEN|LEARNING PRIORITIES)[\s:*]+(.+?)(?=\s*\*{2,}[✅❓💪📖🔴🟡🟢✗❌]|---|\n\n|$)/is);
if (prioritiesSection) {
  console.log('SECTION FOUND:', prioritiesSection[1].substring(0, 200) + '...\n');
}

console.log('\nTesting Concrete Steps Extract:\n');
const stepsSection = sampleEvaluation.match(/\*{2,}💪\s*(?:KONKRETE NÄCHSTE SCHRITTE|NEXT STEPS)[\s:*]+(.+?)(?=\s*\*{2,}[✅❓📚📖🔴🟡🟢✗❌]|---|\n\n|$)/is);
if (stepsSection) {
  console.log('SECTION FOUND:', stepsSection[1].substring(0, 200) + '...\n');
  const lines = stepsSection[1].split('\n');
  lines.forEach((line, i) => {
    const match = line.match(/^\s*(\d+)\.\s*(.+?)$/);
    if (match) {
      console.log(`  Step ${match[1]}: ${match[2].substring(0, 70)}`);
    }
  });
}
