export interface OnboardingStep {
  refKey: string;
  title: string;
  description: string;
  tooltipPosition: 'below' | 'above';
  emoji: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    refKey: 'hero_card',
    title: 'Willkommen bei KP Med!',
    description: 'Ihre Plattform für FSP & KP Prüfungsvorbereitung mit KI-Simulation, Bibliothek und EKG-Training.',
    tooltipPosition: 'below',
    emoji: '👋',
  },
  {
    refKey: 'simulation_button',
    title: 'Simulation starten',
    description:
      'Üben Sie die FSP oder KP Prüfung mit einem KI-Patienten und Prüfer. Alles per Sprache — wie in der echten Prüfung.',
    tooltipPosition: 'above',
    emoji: '🎤',
  },
  {
    refKey: 'subscribe_button',
    title: 'Abonnement & Testphase',
    description:
      '5 Tage kostenlos mit unbegrenzten Simulationen. Nutzen Sie die Bibliothek (📚 unten) zum Lernen und die Simulation (🎤 unten) zum Üben.',
    tooltipPosition: 'above',
    emoji: '⭐',
  },
];
