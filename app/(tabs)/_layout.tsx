import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator, Text, Platform, Dimensions } from 'react-native';
import { Home, BookOpen, BarChart, Activity } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

export default function TabLayout() {
  const { colors, isDarkMode } = useTheme();
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();

  // Initialize session timeout monitoring for authenticated screens
  const { triggerActivity } = useSessionTimeout({
    timeoutDuration: 3 * 60 * 60 * 1000, // 3 hours (180 minutes)
    warningDuration: 5 * 60 * 1000,  // 5 minutes warning (extended for longer session)
    activityUpdateInterval: 15 * 60 * 1000, // 15 minutes database updates (reduced frequency)
    enabled: true,
  });

  // Show loading state while checking authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 14 }}>
          Authentifizierung wird überprüft...
        </Text>
      </View>
    );
  }

  // If no session, redirect to login
  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: screenWidth < 600 ? 56 + insets.bottom : 60,
          paddingBottom: screenWidth < 600 ? Math.max(8, insets.bottom) : 4,
          paddingTop: screenWidth < 600 ? 6 : 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.05,
          shadowRadius: 4,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: screenWidth < 600 ? 10 : 12,
          marginBottom: screenWidth < 600 ? 0 : 4,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginTop: screenWidth < 600 ? 2 : 4,
        },
        headerShown: false,
      }}
      screenListeners={{
        // Trigger activity on tab press
        tabPress: () => {
          triggerActivity();
        },
        // Trigger activity on focus
        focus: () => {
          triggerActivity();
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Home size={screenWidth < 600 ? 20 : 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bibliothek"
        options={{
          title: 'Bibliothek',
          tabBarIcon: ({ color }) => <BookOpen size={screenWidth < 600 ? 20 : 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="simulation"
        options={{
          title: 'Simulation',
          tabBarIcon: ({ color }) => <Activity size={screenWidth < 600 ? 20 : 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Fortschritt',
          tabBarIcon: ({ color }) => <BarChart size={screenWidth < 600 ? 20 : 24} color={color} />,
        }}
      />
    </Tabs>
  );
}