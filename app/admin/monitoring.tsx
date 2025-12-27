/**
 * Admin Monitoring Dashboard Route
 *
 * Displays system health and performance metrics for admins.
 * Shows:
 * - Error tracking
 * - Performance metrics
 * - Screen load times
 * - API call performance
 * - Budget violations
 *
 * Only accessible to admin users.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MonitoringDashboard } from '@/components/MonitoringDashboard';
import { withMonitoring } from '@/components/withMonitoring';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';

function MonitoringScreen() {
  const { user } = useAuth();

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MonitoringDashboard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default withMonitoring(MonitoringScreen, 'Admin Monitoring');
