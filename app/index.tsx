import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const { session, loading } = useAuth();


  // Show loading state while checking authentication
  if (loading) {
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

  // If authenticated, redirect to the main app
  return <Redirect href="/(tabs)" />;
}