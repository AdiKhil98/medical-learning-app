import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const { session, loading } = useAuth();

  console.log('Index.tsx render:', { loading, hasSession: !!session });

  // Show loading state while checking authentication
  if (loading) {
    console.log('Showing loading spinner');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  // If no session, redirect to login
  if (!session) {
    console.log('No session, redirecting to /auth/login');
    return <Redirect href="/auth/login" />;
  }

  // If authenticated, redirect to the main app
  console.log('Has session, redirecting to /(tabs)');
  return <Redirect href="/(tabs)" />;
}