import React, { useState, useRef } from 'react';
import { logger } from '@/utils/logger';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import SlidingHomepage from '@/components/homepage/SlidingHomepage';
import FeatureSheet from '@/components/onboarding/FeatureSheet';
import { OnboardingFeature } from '@/components/onboarding/onboardingData';
import { withMonitoring } from '@/components/withMonitoring';
import VoiceflowSupportWidget from '@/components/VoiceflowSupportWidget';
import SpotlightOverlay from '@/components/onboarding/SpotlightOverlay';
import { useOnboarding } from '@/components/onboarding/useOnboarding';

function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [exploreSheet, setExploreSheet] = useState<OnboardingFeature | null>(null);
  const [exploreSheetVisible, setExploreSheetVisible] = useState(false);

  // Progressive onboarding
  const { showOnboarding, isReady, dismiss } = useOnboarding();
  const onboardingRefs = useRef<Record<string, any>>({});

  console.log('[Dashboard] Onboarding state:', { isReady, showOnboarding });
  console.log('[Dashboard] Onboarding refs:', Object.keys(onboardingRefs.current));

  const handleGetStarted = () => {
    // You can navigate to a specific screen or show a modal
    logger.info('Get Started button pressed');
    // For example: router.push('/dashboard');
  };

  return (
    <>
      <SlidingHomepage onGetStarted={handleGetStarted} onboardingRefs={onboardingRefs} />

      {/* Explore mode feature sheet - accessible after onboarding via long-press */}
      <FeatureSheet
        feature={exploreSheet}
        visible={exploreSheetVisible}
        onClose={() => {
          setExploreSheetVisible(false);
          setTimeout(() => setExploreSheet(null), 300);
        }}
      />

      {/* Voiceflow Support Chat Widget - only shows on web */}
      <VoiceflowSupportWidget />

      {/* Progressive In-Context Onboarding */}
      {isReady && showOnboarding && <SpotlightOverlay refs={onboardingRefs.current} onDismiss={dismiss} />}
    </>
  );
}

export default withMonitoring(DashboardScreen, 'Home');
