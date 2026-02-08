import React, { useRef, useState } from 'react';
import { logger } from '@/utils/logger';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import SlidingHomepage from '@/components/homepage/SlidingHomepage';
import { useOnboarding } from '@/hooks/useOnboarding';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import FeatureSheet from '@/components/onboarding/FeatureSheet';
import { ONBOARDING_FEATURES, OnboardingFeature } from '@/components/onboarding/onboardingData';
import { withMonitoring } from '@/components/withMonitoring';
import VoiceflowSupportWidget from '@/components/VoiceflowSupportWidget';

function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { hasCompletedOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  const [exploreSheet, setExploreSheet] = useState<OnboardingFeature | null>(null);
  const [exploreSheetVisible, setExploreSheetVisible] = useState(false);
  const featureRefs = useRef<Record<string, any>>({});

  const handleGetStarted = () => {
    // You can navigate to a specific screen or show a modal
    logger.info('Get Started button pressed');
    // For example: router.push('/dashboard');
  };

  if (onboardingLoading) {
    return <SlidingHomepage onGetStarted={handleGetStarted} />;
  }

  return (
    <>
      <SlidingHomepage onGetStarted={handleGetStarted} featureRefs={featureRefs} />

      {/* New Onboarding Flow - shows intro slides + guided tour on first login */}
      {!onboardingLoading && !hasCompletedOnboarding && (
        <OnboardingFlow onComplete={completeOnboarding} featureRefs={featureRefs} />
      )}

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
    </>
  );
}

export default withMonitoring(DashboardScreen, 'Home');
