import React, { useEffect, useState } from 'react';
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
          console.error('Admin verification error:', error);
          setVerificationError('Fehler bei der Admin-Verifizierung');
          setIsVerifiedAdmin(false);
          return;
        }

        // data should be { is_admin: boolean }
        setIsVerifiedAdmin(data?.is_admin === true);
      } catch (err) {
        console.error('Admin verification exception:', err);
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
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Admin Dashboard',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="test-simulation" 
        options={{ 
          title: 'Test Simulation',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="add-update" 
        options={{ 
          title: 'Post Update',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="manage-users" 
        options={{ 
          title: 'Manage Users',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="analytics" 
        options={{ 
          title: 'Analytics',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="content" 
        options={{ 
          title: 'Content Management',
          headerShown: true 
        }} 
      />
      <Stack.Screen
        name="database"
        options={{
          title: 'Database Management',
          headerShown: true
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