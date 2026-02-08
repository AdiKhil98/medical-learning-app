import { Ionicons } from '@expo/vector-icons';

export interface OnboardingFeature {
  id: string;
  emoji: string;
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  tagline: string;
  color: string;
  gradientColors: [string, string];
  intro: string;
  blocks: {
    title: string;
    subtitle: string;
    items: [string, string][]; // [label, description]
  }[];
  tip: string;
}

export const ONBOARDING_FEATURES: OnboardingFeature[] = [
  {
    id: 'simulation',
    emoji: '🎤',
    iconName: 'mic',
    title: 'Simulation',
    tagline: 'KI-Prüfungssimulation per Sprache',
    color: '#F97316',
    gradientColors: ['#F97316', '#EA580C'],
    intro:
      'Üben Sie Ihre FSP oder KP Prüfung mit realistischen KI-Patienten und Prüfern — komplett per Sprache, genau wie in der echten Prüfung.',
    blocks: [
      {
        title: 'FSP-Simulation',
        subtitle: 'Fachsprachprüfung üben',
        items: [
          ['Fallauswahl', 'Innere Medizin, Neurologie oder Notfallmedizin'],
          ['Anamnese', 'Gespräch mit dem KI-Patienten auf Deutsch'],
          ['Prüfergespräch', 'Dr. Hoffmann stellt Fachfragen zum Fall'],
          ['Bewertung', 'Detailliertes Feedback zu Sprache & Kommunikation'],
        ],
      },
      {
        title: 'KP-Simulation',
        subtitle: 'Kenntnisprüfung üben',
        items: [
          ['Komplexe Fälle', 'Mit Differentialdiagnosen & Komorbiditäten'],
          ['Diagnostik', 'EKG, Labor- und Bildinterpretation'],
          ['Medizinrecht', 'Schweigepflicht, BTM-Rezept, Patientenrechte'],
          ['Fachwissen', 'Bewertung nach medizinischer Kompetenz'],
        ],
      },
    ],
    tip: 'Sagen Sie „Ich habe keine weitere Fragen" um zur nächsten Phase zu wechseln.',
  },
  {
    id: 'bibliothek',
    emoji: '📚',
    iconName: 'book',
    title: 'Bibliothek',
    tagline: '300+ strukturierte Lernthemen',
    color: '#8B5CF6',
    gradientColors: ['#8B5CF6', '#7C3AED'],
    intro:
      'Ihre zentrale Wissensbasis — über 300 medizinische Themen als Text und Audio, speziell für FSP und KP aufbereitet.',
    blocks: [
      {
        title: 'Text-Bibliothek',
        subtitle: 'Kostenloser Zugang',
        items: [
          ['FSP Bibliothek', '57 Themen mit Beispielantworten für Prüferfragen'],
          ['FSP Anamnese', '29 strukturierte Anamneseleitfäden'],
          ['FSP Fachbegriffe', '10 Kategorien medizinischer Terminologie'],
          ['KP Bibliothek 444', '257 Themen — Definition bis Therapie'],
        ],
      },
      {
        title: 'Audio-Bibliothek',
        subtitle: 'Premium · ab €7/Monat',
        items: [
          ['98+ Stunden', 'Professionell produzierte Audio-Lektionen'],
          ['Überall lernen', 'Beim Pendeln, Sport oder unterwegs'],
          ['FSP Audio', 'Bibliothek, Anamnese & Fachbegriffe'],
          ['KP Audio', 'Alle 257 Themen der Bibliothek 444'],
        ],
      },
    ],
    tip: 'Nutzen Sie die Bibliothek vor der Simulation, um sich optimal vorzubereiten.',
  },
  {
    id: 'ekg',
    emoji: '💓',
    iconName: 'pulse',
    title: 'EKG-Training',
    tagline: 'Interaktive EKG-Interpretation',
    color: '#EC4899',
    gradientColors: ['#EC4899', '#DB2777'],
    intro:
      '23 EKG-Themen mit interaktiven SVG-Diagrammen und klinischen Fällen — von Sinusrhythmus bis Kammerflimmern.',
    blocks: [
      {
        title: 'Lernmodule',
        subtitle: 'Kostenloser Zugang',
        items: [
          ['23 Themen', 'Systematische EKG-Befundung Schritt für Schritt'],
          ['SVG-Diagramme', 'Interaktive Darstellungen typischer EKG-Muster'],
          ['15 klinische Fälle', 'Prüfungsrelevante Fallbeispiele mit Fragen'],
          ['Musterantworten', 'Detaillierte Erklärungen zu jedem Fall'],
        ],
      },
    ],
    tip: 'Jeder klinische Fall enthält Prüfungsfragen mit ausführlichen Musterantworten.',
  },
  {
    id: 'fortschritt',
    emoji: '📊',
    iconName: 'bar-chart',
    title: 'Fortschritt',
    tagline: 'Ihre Entwicklung verfolgen',
    color: '#10B981',
    gradientColors: ['#10B981', '#059669'],
    intro: 'Verfolgen Sie Ihre Leistung über alle Simulationen. Erkennen Sie Stärken und Schwächen gezielt.',
    blocks: [
      {
        title: 'Analyse & Berichte',
        subtitle: 'Nach jeder Simulation',
        items: [
          ['HTML-Berichte', 'Detaillierte, farbcodierte Auswertungen'],
          ['Stärken & Schwächen', 'Kategorisierte Analyse Ihrer Leistung'],
          ['Verlaufskurve', 'Fortschritt über die Zeit verfolgen'],
          ['Verbesserungstipps', 'Konkrete Empfehlungen für die nächste Übung'],
        ],
      },
    ],
    tip: 'Regelmäßiges Üben zeigt deutliche Verbesserungen in den Bewertungen.',
  },
];

// Tour order - only includes features with refs on the homepage
// Note: 'ekg' and 'fortschritt' are available via tabs but don't have dedicated cards on homepage
export const TOUR_ORDER = ['simulation', 'bibliothek'];
