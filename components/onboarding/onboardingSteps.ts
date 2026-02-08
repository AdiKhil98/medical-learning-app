export interface OnboardingStep {
  refKey: string; // matches a ref key on a dashboard element
  title: string; // short bold title
  description: string; // 1-2 sentence explanation
  tooltipPosition: 'below' | 'above'; // where tooltip appears relative to element
  emoji: string; // visual accent
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    refKey: 'trial_banner',
    title: 'Ihre Testphase',
    description: '5 Tage kostenlos mit unbegrenzten Simulationen. Danach: €100/Monat oder €200/Quartal.',
    tooltipPosition: 'below',
    emoji: '⏳',
  },
  {
    refKey: 'simulation_button',
    title: 'Simulation starten',
    description:
      'Üben Sie die FSP oder KP Prüfung mit einem KI-Patienten und Prüfer. Alles per Sprache — wie in der echten Prüfung.',
    tooltipPosition: 'below',
    emoji: '🎤',
  },
];
