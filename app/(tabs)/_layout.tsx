import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { Home, BookOpen, BarChart, Activity } from 'lucide-react-native';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useResponsive } from '@/hooks/useResponsive';

export default function TabLayout() {
  const { session, loading, isEmailVerified } = useAuth();
  const insets = useSafeAreaInsets();
  const { isMobile, width: screenWidth } = useResponsive();

  // Initialize session timeout monitoring for authenticated screens
  // Uses default 30-minute timeout from hook (HIPAA compliant)
  const { triggerActivity } = useSessionTimeout({
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

  // SECURITY FIX: Enforce email verification before app access
  if (!isEmailVerified) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}>
          E-Mail-Bestätigung erforderlich
        </Text>
        <Text
          style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 24 }}
        >
          Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben.
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
          Überprüfen Sie auch Ihren Spam-Ordner.
        </Text>
      </View>
    );
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
          shadowOpacity: 0.05,
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
