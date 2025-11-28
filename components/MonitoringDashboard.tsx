/**
 * Performance Monitoring Dashboard
 *
 * Admin-only component that displays real-time app health and performance metrics.
 *
 * Features:
 * - Error rate monitoring with trends
 * - Performance metrics (load times, API calls)
 * - Screen-level error tracking
 * - Quick links to PostHog insights
 * - Real-time health status
 *
 * Usage:
 *   <MonitoringDashboard />
 *
 * Requires admin permissions to view.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  RefreshCw,
} from 'lucide-react-native';
import { logger } from '@/utils/logger';
import { analytics, AnalyticsEvent } from '@/utils/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ErrorMetrics {
  totalErrors: number;
  last24Hours: number;
  mostFrequentScreen: string;
  errorRate: number;
  trend: 'up' | 'down' | 'stable';
}

interface PerformanceMetrics {
  avgScreenLoadTime: number;
  avgApiResponseTime: number;
  slowestScreen: string;
  p95LoadTime: number;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastChecked: Date;
}

const MONITORING_KEYS = {
  ERRORS: '@monitoring/errors',
  PERFORMANCE: '@monitoring/performance',
  SCREEN_LOADS: '@monitoring/screen_loads',
  API_CALLS: '@monitoring/api_calls',
};

export function MonitoringDashboard() {
  const [errorMetrics, setErrorMetrics] = useState<ErrorMetrics>({
    totalErrors: 0,
    last24Hours: 0,
    mostFrequentScreen: 'N/A',
    errorRate: 0,
    trend: 'stable',
  });

  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      avgScreenLoadTime: 0,
      avgApiResponseTime: 0,
      slowestScreen: 'N/A',
      p95LoadTime: 0,
    });

  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'healthy',
    message: 'All systems operational',
    lastChecked: new Date(),
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate health status based on metrics
  const calculateHealthStatus = useCallback(
    (errors: ErrorMetrics, perf: PerformanceMetrics): HealthStatus => {
      // Critical: High error rate or very slow performance
      if (errors.errorRate > 5 || perf.avgScreenLoadTime > 5000) {
        return {
          status: 'critical',
          message: 'Critical issues detected - immediate attention required',
          lastChecked: new Date(),
        };
      }

      // Warning: Moderate error rate or slow performance
      if (
        errors.errorRate > 2 ||
        perf.avgScreenLoadTime > 3000 ||
        errors.trend === 'up'
      ) {
        return {
          status: 'warning',
          message: 'Performance degradation detected - monitoring required',
          lastChecked: new Date(),
        };
      }

      // Healthy
      return {
        status: 'healthy',
        message: 'All systems operational',
        lastChecked: new Date(),
      };
    },
    []
  );

  // Load monitoring data from storage
  const loadMonitoringData = useCallback(async () => {
    try {
      // Load error data
      const errorDataStr = await AsyncStorage.getItem(MONITORING_KEYS.ERRORS);
      if (errorDataStr) {
        const errorData = JSON.parse(errorDataStr);
        const last24Hours = errorData.errors?.filter((e: any) => {
          const errorTime = new Date(e.timestamp).getTime();
          const now = Date.now();
          return now - errorTime < 24 * 60 * 60 * 1000;
        }).length || 0;

        const errorsByScreen = errorData.errors?.reduce(
          (acc: any, e: any) => {
            acc[e.screen] = (acc[e.screen] || 0) + 1;
            return acc;
          },
          {}
        );

        const mostFrequentScreen =
          Object.keys(errorsByScreen || {}).sort(
            (a, b) => errorsByScreen[b] - errorsByScreen[a]
          )[0] || 'N/A';

        const previousLast24 = errorData.previousLast24 || 0;
        const trend =
          last24Hours > previousLast24 * 1.2
            ? 'up'
            : last24Hours < previousLast24 * 0.8
              ? 'down'
              : 'stable';

        setErrorMetrics({
          totalErrors: errorData.errors?.length || 0,
          last24Hours,
          mostFrequentScreen,
          errorRate: last24Hours / 24, // Errors per hour
          trend,
        });

        // Store current last24Hours for next comparison
        await AsyncStorage.setItem(
          MONITORING_KEYS.ERRORS,
          JSON.stringify({ ...errorData, previousLast24: last24Hours })
        );
      }

      // Load performance data
      const screenLoadsStr = await AsyncStorage.getItem(
        MONITORING_KEYS.SCREEN_LOADS
      );
      if (screenLoadsStr) {
        const screenLoads = JSON.parse(screenLoadsStr);
        const loadTimes = screenLoads.loads?.map((l: any) => l.duration) || [];

        if (loadTimes.length > 0) {
          const avgLoadTime =
            loadTimes.reduce((a: number, b: number) => a + b, 0) /
            loadTimes.length;
          const sortedTimes = [...loadTimes].sort((a, b) => a - b);
          const p95Index = Math.floor(sortedTimes.length * 0.95);
          const p95 = sortedTimes[p95Index] || 0;

          const slowestLoad = screenLoads.loads?.reduce(
            (max: any, load: any) =>
              load.duration > max.duration ? load : max,
            screenLoads.loads[0]
          );

          setPerformanceMetrics((prev) => ({
            ...prev,
            avgScreenLoadTime: avgLoadTime,
            slowestScreen: slowestLoad?.screen || 'N/A',
            p95LoadTime: p95,
          }));
        }
      }

      // Load API performance data
      const apiCallsStr = await AsyncStorage.getItem(
        MONITORING_KEYS.API_CALLS
      );
      if (apiCallsStr) {
        const apiCalls = JSON.parse(apiCallsStr);
        const responseTimes =
          apiCalls.calls?.map((c: any) => c.duration) || [];

        if (responseTimes.length > 0) {
          const avgApiTime =
            responseTimes.reduce((a: number, b: number) => a + b, 0) /
            responseTimes.length;

          setPerformanceMetrics((prev) => ({
            ...prev,
            avgApiResponseTime: avgApiTime,
          }));
        }
      }
    } catch (error) {
      logger.error('Failed to load monitoring data', error);
    }
  }, []);

  // Update health status when metrics change
  useEffect(() => {
    const newHealthStatus = calculateHealthStatus(
      errorMetrics,
      performanceMetrics
    );
    setHealthStatus(newHealthStatus);
  }, [errorMetrics, performanceMetrics, calculateHealthStatus]);

  // Load data on mount
  useEffect(() => {
    loadMonitoringData();
  }, [loadMonitoringData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMonitoringData();
    setIsRefreshing(false);
  }, [loadMonitoringData]);

  const openPostHog = useCallback(async () => {
    const url = 'https://app.posthog.com';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      analytics.track(AnalyticsEvent.EXTERNAL_LINK_CLICKED, {
        destination: 'PostHog Dashboard',
      });
    }
  }, []);

  const getStatusColor = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={24} color="#10B981" />;
      case 'warning':
        return <AlertTriangle size={24} color="#F59E0B" />;
      case 'critical':
        return <XCircle size={24} color="#EF4444" />;
      default:
        return <Activity size={24} color="#6B7280" />;
    }
  };

  const getTrendIcon = (trend: ErrorMetrics['trend']) => {
    if (trend === 'up') {
      return <TrendingUp size={16} color="#EF4444" />;
    } else if (trend === 'down') {
      return <TrendingDown size={16} color="#10B981" />;
    }
    return null;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>System Health Monitor</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <RefreshCw size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Health Status Card */}
      <LinearGradient
        colors={[getStatusColor(healthStatus.status), getStatusColor(healthStatus.status) + '80']}
        style={styles.healthCard}
      >
        <View style={styles.healthCardContent}>
          {getStatusIcon(healthStatus.status)}
          <View style={styles.healthText}>
            <Text style={styles.healthTitle}>
              {healthStatus.status.toUpperCase()}
            </Text>
            <Text style={styles.healthMessage}>{healthStatus.message}</Text>
            <Text style={styles.healthTimestamp}>
              Last checked: {healthStatus.lastChecked.toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Error Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Tracking</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{errorMetrics.last24Hours}</Text>
            <Text style={styles.metricLabel}>Last 24 Hours</Text>
            {getTrendIcon(errorMetrics.trend)}
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {errorMetrics.errorRate.toFixed(1)}
            </Text>
            <Text style={styles.metricLabel}>Errors/Hour</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{errorMetrics.totalErrors}</Text>
            <Text style={styles.metricLabel}>Total Errors</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Most Frequent Error Screen</Text>
          <Text style={styles.infoValue}>{errorMetrics.mostFrequentScreen}</Text>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {(performanceMetrics.avgScreenLoadTime / 1000).toFixed(2)}s
            </Text>
            <Text style={styles.metricLabel}>Avg Screen Load</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {(performanceMetrics.avgApiResponseTime / 1000).toFixed(2)}s
            </Text>
            <Text style={styles.metricLabel}>Avg API Response</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {(performanceMetrics.p95LoadTime / 1000).toFixed(2)}s
            </Text>
            <Text style={styles.metricLabel}>P95 Load Time</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Slowest Screen</Text>
          <Text style={styles.infoValue}>
            {performanceMetrics.slowestScreen}
          </Text>
        </View>
      </View>

      {/* PostHog Link */}
      <TouchableOpacity style={styles.postHogButton} onPress={openPostHog}>
        <Text style={styles.postHogButtonText}>Open PostHog Dashboard</Text>
        <ExternalLink size={16} color="#fff" />
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Monitoring data refreshes automatically
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  refreshButton: {
    padding: 8,
  },
  healthCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  healthCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthText: {
    marginLeft: 16,
    flex: 1,
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  healthMessage: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  healthTimestamp: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  postHogButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postHogButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default MonitoringDashboard;
