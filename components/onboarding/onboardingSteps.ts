export interface OnboardingStep {
  refKey: string;
  title: string;
  description: string;
  tooltipPosition: 'below' | 'above';
  emoji: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    refKey: 'simulation_button',
    title: 'Willkommen bei KP Med!',
    description:
      'Starten Sie hier Ihre erste FSP oder KP Simulation mit einem KI-Patienten und Prüfer. Alles per Sprache — wie in der echten Prüfung.',
    tooltipPosition: 'above',
    emoji: '👋',
  },
  {
    refKey: 'subscribe_button',
    title: 'Abonnement & Testphase',
    description: '5 Tage kostenlos mit unbegrenzten Simulationen. Danach ab €100/Monat oder €200/Quartal.',
    tooltipPosition: 'above',
    emoji: '⭐',
  },
  {
    refKey: 'trial_banner',
    title: 'Ihre Testphase',
    description:
      'Hier sehen Sie Ihre verbleibende Testzeit. Nutzen Sie die Bibliothek (📚 unten) zum Lernen und die Simulation (🎤 unten) zum Üben.',
    tooltipPosition: 'below',
    emoji: '⏳',
  },
];
