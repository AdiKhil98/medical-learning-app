import { Evaluation } from '@/types/evaluation';

export const MOCK_EVALUATION_RAW_TEXT = `═══════════════════════════════════════════════════
ARZT-PATIENT GESPRÄCH BEWERTUNG - KP PRÜFUNG
═══════════════════════════════════════════════════

GESAMTEINDRUCK: Checklistenartiges Vorgehen ohne medizinische Logik. Schwere Sprachfehler behindern professionelle Kommunikation.

HAUPTFEHLER DIE SOFORT KORRIGIERT WERDEN MÜSSEN:

1. **KRITISCHER SPRACHFEHLER**:
   • Was falsch gemacht wurde: "Magen Sie etwas gegen die Schmerzen eingenommen?"
   • Warum das problematisch ist: Völlig unverständliche Sätze schaffen Verwirrung beim Patienten
   • Besserer Ansatz: "Haben Sie Medikamente gegen die Schmerzen eingenommen?"
   • Punktabzug: -15 Punkte

2. **FEHLENDE MEDIZINISCHE LOGIK**:
   • Was falsch gemacht wurde: Keine gezielten Fragen zu Begleitsymptomen bei akuten Bauchschmerzen
   • Warum das problematisch ist: Wichtige Differentialdiagnosen werden übersehen
   • Besserer Ansatz: Systematische Abfrage von Übelkeit, Erbrechen, Fieber, Stuhlveränderungen
   • Punktabzug: -12 Punkte

3. **MANGELNDE SYSTEMATIK**:
   • Was falsch gemacht wurde: Sprung von Schmerzlokalisation direkt zu Vorerkrankungen ohne Schmerzcharakter zu erfragen
   • Warum das problematisch ist: Unstrukturiertes Vorgehen verzögert Diagnose
   • Besserer Ansatz: OPQRST-Schema konsequent anwenden
   • Punktabzug: -8 Punkte

WAS GUT GEMACHT WURDE:
• Freundliche Begrüßung und Vorstellung
• Nachfrage nach aktuellen Beschwerden
• Patient wurde ausreden gelassen

KONKRETE NÄCHSTE SCHRITTE:

1. Sprachtraining intensivieren
   Üben Sie täglich medizinische Standardfragen mit korrekter Grammatik. Nutzen Sie die Sprachübungen in der App.

2. Systematik verbessern
   Lernen Sie die OPQRST- und SAMPLER-Schemata auswendig und wenden Sie diese konsequent an.

3. Medizinisches Wissen vertiefen
   Arbeiten Sie die Differentialdiagnosen für akute Bauchschmerzen durch.

GESAMTPUNKTZAHL: 42/100 PUNKTE
**MEHR ÜBUNG NÖTIG ✗**

Mit gezielter Übung können Sie sich schnell verbessern. Konzentrieren Sie sich zuerst auf korrekte Frageformulierungen!`;

export const MOCK_EVALUATION: Evaluation = {
  id: 'eval_123',
  timestamp: new Date().toISOString(),
  type: 'KP',
  evaluationType: 'KP - Patientengespräch',
  score: {
    total: 42,
    maxScore: 100,
    percentage: 42,
    status: 'critical',
    statusText: 'Mehr Übung nötig',
    statusEmoji: '✗',
  },
  summary: {
    mainIssue: 'Checklistenartiges Vorgehen ohne medizinische Logik. Schwere Sprachfehler behindern professionelle Kommunikation.',
    strengths: [
      'Freundliche Begrüßung und Vorstellung',
      'Nachfrage nach aktuellen Beschwerden',
      'Patient wurde ausreden gelassen',
    ],
    criticalGapsCount: 1,
  },
  scoreBreakdown: [
    {
      category: 'Sprachqualität',
      score: 15,
      maxScore: 30,
      percentage: 50,
      color: '#EF4444',
      icon: 'chatbubble-ellipses',
    },
    {
      category: 'Medizinische Logik',
      score: 12,
      maxScore: 25,
      percentage: 48,
      color: '#F59E0B',
      icon: 'medical',
    },
    {
      category: 'Empathie',
      score: 8,
      maxScore: 20,
      percentage: 40,
      color: '#3B82F6',
      icon: 'heart',
    },
    {
      category: 'Systematik',
      score: 7,
      maxScore: 25,
      percentage: 28,
      color: '#8B5CF6',
      icon: 'list',
    },
  ],
  criticalErrors: [
    {
      severity: 'critical',
      title: 'KRITISCHER SPRACHFEHLER',
      pointDeduction: 15,
      examples: [
        {
          incorrect: 'Magen Sie etwas gegen die Schmerzen eingenommen?',
          correct: 'Haben Sie Medikamente gegen die Schmerzen eingenommen?',
        },
      ],
      explanation: 'Völlig unverständliche Sätze schaffen Verwirrung beim Patienten',
      whyProblematic: 'Völlig unverständliche Sätze schaffen Verwirrung beim Patienten',
      betterApproach: 'Haben Sie Medikamente gegen die Schmerzen eingenommen?',
    },
    {
      severity: 'major',
      title: 'FEHLENDE MEDIZINISCHE LOGIK',
      pointDeduction: 12,
      examples: [
        {
          incorrect: 'Keine gezielten Fragen zu Begleitsymptomen bei akuten Bauchschmerzen',
          correct: 'Systematische Abfrage von Übelkeit, Erbrechen, Fieber, Stuhlveränderungen',
        },
      ],
      explanation: 'Wichtige Differentialdiagnosen werden übersehen',
      whyProblematic: 'Wichtige Differentialdiagnosen werden übersehen',
      betterApproach: 'Systematische Abfrage von Übelkeit, Erbrechen, Fieber, Stuhlveränderungen',
    },
    {
      severity: 'minor',
      title: 'MANGELNDE SYSTEMATIK',
      pointDeduction: 8,
      examples: [
        {
          incorrect: 'Sprung von Schmerzlokalisation direkt zu Vorerkrankungen ohne Schmerzcharakter zu erfragen',
          correct: 'OPQRST-Schema konsequent anwenden',
        },
      ],
      explanation: 'Unstrukturiertes Vorgehen verzögert Diagnose',
      whyProblematic: 'Unstrukturiertes Vorgehen verzögert Diagnose',
      betterApproach: 'OPQRST-Schema konsequent anwenden',
    },
  ],
  positives: [
    'Freundliche Begrüßung und Vorstellung',
    'Nachfrage nach aktuellen Beschwerden',
    'Patient wurde ausreden gelassen',
  ],
  nextSteps: [
    {
      priority: 1,
      action: 'Sprachtraining intensivieren',
      details: 'Üben Sie täglich medizinische Standardfragen mit korrekter Grammatik. Nutzen Sie die Sprachübungen in der App.',
      exerciseLink: '/exercises/language',
    },
    {
      priority: 2,
      action: 'Systematik verbessern',
      details: 'Lernen Sie die OPQRST- und SAMPLER-Schemata auswendig und wenden Sie diese konsequent an.',
      exerciseLink: '/exercises/systematic',
    },
    {
      priority: 3,
      action: 'Medizinisches Wissen vertiefen',
      details: 'Arbeiten Sie die Differentialdiagnosen für akute Bauchschmerzen durch.',
      exerciseLink: '/bibliothek/innere-medizin/gastroenterologie',
    },
  ],
  motivationalMessage: 'Mit gezielter Übung können Sie sich schnell verbessern. Konzentrieren Sie sich zuerst auf korrekte Frageformulierungen!',
  rawText: MOCK_EVALUATION_RAW_TEXT,
};

// Example of excellent evaluation
export const MOCK_EXCELLENT_EVALUATION: Evaluation = {
  id: 'eval_456',
  timestamp: new Date().toISOString(),
  type: 'KP',
  evaluationType: 'KP - Patientengespräch',
  score: {
    total: 92,
    maxScore: 100,
    percentage: 92,
    status: 'excellent',
    statusText: 'Ausgezeichnet',
    statusEmoji: '★',
  },
  summary: {
    mainIssue: 'Sehr strukturierte und empathische Gesprächsführung mit klarer medizinischer Logik.',
    strengths: [
      'Exzellente Anwendung des OPQRST-Schemas',
      'Sehr empathischer Umgang mit dem Patienten',
      'Klare und verständliche Sprache',
      'Umfassende Anamneseerhebung',
      'Professionelle Gesprächsführung',
    ],
    criticalGapsCount: 0,
  },
  scoreBreakdown: [
    {
      category: 'Sprachqualität',
      score: 28,
      maxScore: 30,
      percentage: 93,
      color: '#10B981',
      icon: 'chatbubble-ellipses',
    },
    {
      category: 'Medizinische Logik',
      score: 24,
      maxScore: 25,
      percentage: 96,
      color: '#10B981',
      icon: 'medical',
    },
    {
      category: 'Empathie',
      score: 18,
      maxScore: 20,
      percentage: 90,
      color: '#10B981',
      icon: 'heart',
    },
    {
      category: 'Systematik',
      score: 22,
      maxScore: 25,
      percentage: 88,
      color: '#10B981',
      icon: 'list',
    },
  ],
  criticalErrors: [
    {
      severity: 'minor',
      title: 'ALLERGIEABFRAGE KÖNNTE DETAILLIERTER SEIN',
      pointDeduction: 3,
      examples: [
        {
          incorrect: 'Haben Sie Allergien?',
          correct: 'Haben Sie bekannte Allergien gegen Medikamente, Nahrungsmittel oder andere Substanzen?',
        },
      ],
      explanation: 'Spezifischere Fragestellung erhöht Genauigkeit der Anamnese',
      whyProblematic: 'Unspezifische Frage könnte wichtige Allergieinformationen übersehen',
      betterApproach: 'Detaillierte Allergieabfrage mit konkreten Kategorien',
    },
  ],
  positives: [
    'Exzellente Anwendung des OPQRST-Schemas',
    'Sehr empathischer Umgang mit dem Patienten',
    'Klare und verständliche Sprache durchweg',
    'Umfassende und strukturierte Anamneseerhebung',
    'Professionelle Gesprächsführung mit guter Körpersprache',
    'Aktives Zuhören und Nachfragen bei Unklarheiten',
  ],
  nextSteps: [
    {
      priority: 1,
      action: 'Allergieabfrage verfeinern',
      details: 'Üben Sie detaillierte Allergieabfragen mit Kategorisierung nach Medikamenten, Nahrungsmitteln und Umweltallergenen.',
    },
    {
      priority: 2,
      action: 'Weiter auf diesem Niveau üben',
      details: 'Behalten Sie Ihre strukturierte Vorgehensweise bei und verfeinern Sie Details.',
    },
  ],
  motivationalMessage: 'Hervorragende Leistung! Sie zeigen ein sehr hohes Niveau in der Gesprächsführung. Machen Sie weiter so!',
};
