import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import IntroSlides from './IntroSlides';
import GuidedTour, { TourRect } from './GuidedTour';
import FeatureSheet from './FeatureSheet';
import { OnboardingFeature } from './onboardingData';

type OnboardingPhase = 'intro' | 'tour' | 'done';

interface OnboardingFlowProps {
  onComplete: () => void;
  featureRefs: React.MutableRefObject<Record<string, any>>;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, featureRefs }) => {
  const [phase, setPhase] = useState<OnboardingPhase>('intro');
  const [tourIdx, setTourIdx] = useState(0);
  const [sheetFeature, setSheetFeature] = useState<OnboardingFeature | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [currentRect, setCurrentRect] = useState<TourRect | null>(null);

  // Mock features data - in real implementation, import from onboardingData
  const features: OnboardingFeature[] = [
    {
      id: 'audio-playback',
      emoji: '🎤',
      title: 'Audio-Wiedergabe',
      tagline: 'Hören Sie sich Fälle an',
      color: '#F97316',
      details: [
        {
          title: 'Geführtes Lernen',
          subtitle: 'Lassen Sie sich durch medizinische Fälle führen',
          items: [
            'Automatische Wiedergabe der Fallinformationen',
            'Pause und Fortsetzung jederzeit möglich',
            'Geschwindigkeitsanpassung nach Ihren Bedürfnissen',
          ],
        },
      ],
      tip: 'Nutzen Sie die Audio-Funktion beim Pendeln oder Sport!',
    },
    {
      id: 'favorites',
      emoji: '📚',
      title: 'Favoriten',
      tagline: 'Merken Sie sich wichtige Fälle',
      color: '#EF4444',
      details: [
        {
          title: 'Persönliche Sammlung',
          subtitle: 'Speichern Sie relevante Fälle für später',
          items: [
            'Schneller Zugriff auf gespeicherte Fälle',
            'Organisieren Sie Ihr Wissen',
            'Wiederholung für Prüfungen',
          ],
        },
      ],
      tip: 'Markieren Sie schwierige Fälle für spätere Wiederholung!',
    },
    {
      id: 'progress',
      emoji: '💓',
      title: 'Fortschritt',
      tagline: 'Verfolgen Sie Ihre Entwicklung',
      color: '#F59E0B',
      details: [
        {
          title: 'Lernstatistiken',
          subtitle: 'Sehen Sie Ihren Fortschritt auf einen Blick',
          items: ['Abgeschlossene Fälle im Überblick', 'Zeitaufwand pro Kategorie', 'Erfolgsquote und Verbesserungen'],
        },
      ],
      tip: 'Regelmäßiges Lernen führt zu besseren Ergebnissen!',
    },
  ];

  const handleIntroComplete = useCallback(() => {
    setPhase('tour');
    // Measure first feature position
    measureFeaturePosition(0);
  }, []);

  const measureFeaturePosition = useCallback(
    (index: number) => {
      const feature = features[index];
      const ref = featureRefs.current[feature.id];

      if (ref && ref.measureInWindow) {
        ref.measureInWindow((x: number, y: number, width: number, height: number) => {
          setCurrentRect({ x, y, width, height });
        });
      }
    },
    [featureRefs, features]
  );

  const handleFeatureTap = useCallback(() => {
    setSheetFeature(features[tourIdx]);
    setSheetVisible(true);
  }, [tourIdx, features]);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    setSheetFeature(null);

    // Auto-advance to next feature
    setTimeout(() => {
      if (tourIdx < features.length - 1) {
        const nextIdx = tourIdx + 1;
        setTourIdx(nextIdx);
        measureFeaturePosition(nextIdx);
      } else {
        // Tour complete
        setPhase('done');
        onComplete();
      }
    }, 300);
  }, [tourIdx, features.length, measureFeaturePosition, onComplete]);

  const handleSkipTour = useCallback(() => {
    setPhase('done');
    onComplete();
  }, [onComplete]);

  if (phase === 'intro') {
    return <IntroSlides onComplete={handleIntroComplete} />;
  }

  if (phase === 'tour') {
    return (
      <View style={styles.container}>
        <GuidedTour
          currentFeature={features[tourIdx]}
          currentRect={currentRect}
          stepIndex={tourIdx}
          totalSteps={features.length}
          onFeatureTap={handleFeatureTap}
          onSkip={handleSkipTour}
        />
        <FeatureSheet feature={sheetFeature} visible={sheetVisible} onClose={handleSheetClose} />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default OnboardingFlow;
