import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import SlidingHomepage from '@/components/homepage/SlidingHomepage';
import FeatureSheet from '@/components/onboarding/FeatureSheet';
import { OnboardingFeature } from '@/components/onboarding/onboardingData';
import { withMonitoring } from '@/components/withMonitoring';
import VoiceflowSupportWidget from '@/components/VoiceflowSupportWidget';

function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [exploreSheet, setExploreSheet] = useState<OnboardingFeature | null>(null);
  const [exploreSheetVisible, setExploreSheetVisible] = useState(false);

  const handleGetStarted = () => {
    // You can navigate to a specific screen or show a modal
    logger.info('Get Started button pressed');
    // For example: router.push('/dashboard');
  };

  return (
    <>
      <SlidingHomepage onGetStarted={handleGetStarted} />

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
