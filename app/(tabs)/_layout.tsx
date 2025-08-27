import React from 'react';
import { Tabs } from 'expo-router';
import { Home, BookOpen, BarChart, Activity } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

export default function TabLayout() {
  const { colors, isDarkMode } = useTheme();
  
  // Initialize session timeout monitoring for authenticated screens
  const { triggerActivity } = useSessionTimeout({
    timeoutDuration: 15 * 60 * 1000, // 15 minutes
    warningDuration: 2 * 60 * 1000,  // 2 minutes warning
    activityUpdateInterval: 5 * 60 * 1000, // 5 minutes database updates
    enabled: true,
  });

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