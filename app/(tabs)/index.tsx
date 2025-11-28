import React from 'react';
import { logger } from '@/utils/logger';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import SlidingHomepage from '@/components/homepage/SlidingHomepage';
import { useOnboarding } from '@/hooks/useOnboarding';
import WelcomeFlow from '@/components/onboarding/WelcomeFlow';
import { withMonitoring } from '@/components/withMonitoring';

function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { showWelcome: showWelcomeFlow, loading: onboardingLoading, completeOnboarding } = useOnboarding();

  const handleGetStarted = () => {
    // You can navigate to a specific screen or show a modal
    logger.info('Get Started button pressed');
    // For example: router.push('/dashboard');
  };

  const handleOnboardingComplete = () => {
    completeOnboarding();
  };

  if (onboardingLoading) {
    return (
      <SlidingHomepage onGetStarted={handleGetStarted} />
    );
  }

  return (
    <>
      <SlidingHomepage onGetStarted={handleGetStarted} />
      
      {/* Welcome Flow for new users */}
      <WelcomeFlow
        visible={showWelcomeFlow}
        onComplete={handleOnboardingComplete}
        onDismiss={completeOnboarding}
      />
    </>
  );
}

export default withMonitoring(DashboardScreen, 'Home');

