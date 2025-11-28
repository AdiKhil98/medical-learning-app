import React, { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function AdminLayout() {
  const { user } = useAuth();
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState<boolean | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // SECURITY FIX: Server-side admin role verification
  useEffect(() => {
    const verifyAdminRole = async () => {
      if (!user) {
        setIsVerifiedAdmin(false);
        return;
      }

      try {
        // Verify admin role directly from database using auth.uid()
        const { data, error } = await supabase
          .rpc('verify_admin_role');

        if (error) {
          logger.error('Admin verification error:', error);
          setVerificationError('Fehler bei der Admin-Verifizierung');
          setIsVerifiedAdmin(false);
          return;
        }

        // data should be { is_admin: boolean }
        setIsVerifiedAdmin(data?.is_admin === true);
      } catch (err) {
        logger.error('Admin verification exception:', err);
        setVerificationError('Verifizierungsfehler');
        setIsVerifiedAdmin(false);
      }
    };

    verifyAdminRole();
  }, [user]);

  // Show loading while verifying
  if (isVerifiedAdmin === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A574" />
        <Text style={styles.loadingText}>Admin-Berechtigung wird überprüft...</Text>
      </View>
    );
  }

  // Protect admin routes - must pass BOTH client and server checks
  if (!user || user.role !== 'admin' || !isVerifiedAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        // Enable lazy loading for all admin screens
        // Reduces initial bundle size since admin screens aren't needed for regular users
        lazy: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="test-simulation"
        options={{
          title: 'Test Simulation',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="add-update"
        options={{
          title: 'Post Update',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="manage-users"
        options={{
          title: 'Manage Users',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="content"
        options={{
          title: 'Content Management',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="database"
        options={{
          title: 'Database Management',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="monitoring"
        options={{
          title: 'System Monitoring',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="daily-tips"
        options={{
          title: 'Daily Tips Management',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="feedback-manager"
        options={{
          title: 'Feedback Manager',
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="transform-content"
        options={{
          title: 'Transform Content',
          headerShown: true,
          lazy: true,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
});