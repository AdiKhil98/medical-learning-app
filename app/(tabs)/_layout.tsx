import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { Home, BookOpen, BarChart, Activity } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { colors, isDarkMode } = useTheme();
  const { session, loading } = useAuth();

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
          height: 60,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.05,
          shadowRadius: 4,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12,
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
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
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bibliothek"
        options={{
          title: 'Bibliothek',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="simulation"
        options={{
          title: 'Simulation',
          tabBarIcon: ({ color, size }) => <Activity size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Fortschritt',
          tabBarIcon: ({ color, size }) => <BarChart size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}