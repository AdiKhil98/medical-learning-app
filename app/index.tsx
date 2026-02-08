import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { hasCompletedOnboarding, isLoading: onboardingLoading } = useOnboarding();

  // Show loading state while checking authentication and onboarding
  if (authLoading || onboardingLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: '#666' }}>Lädt...</Text>
      </View>
    );
  }

  // If no session, redirect to login
  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  // If authenticated but hasn't completed onboarding, redirect to onboarding
  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  // If authenticated and onboarding complete, redirect to the main app
  return <Redirect href="/(tabs)" />;
}
