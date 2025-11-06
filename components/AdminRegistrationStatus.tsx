'use client';

import { useEffect, useState } from 'react';
import { checkRegistrationStatus, getActiveUserCount, type RegistrationStatus } from '@/lib/registrationLimit';
import { Users, Clock, AlertCircle } from 'lucide-react-native';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export function AdminRegistrationStatus() {
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    // Refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadStatus() {
    const data = await checkRegistrationStatus();
    setStatus(data);
    setLoading(false);
  }

  if (loading || !status) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const spotsRemaining = status.max_users - status.current_count;
  const percentFilled = (status.current_count / status.max_users) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Users color="#111827" size={20} />
        <Text style={styles.headerText}>Registration Status</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Current Users</Text>
          <Text style={styles.statValue}>{status.current_count}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Max Limit</Text>
          <Text style={styles.statValue}>{status.max_users}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Spots Left</Text>
          <Text style={[styles.statValue, styles.statValueBlue]}>{spotsRemaining}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Capacity</Text>
          <Text style={styles.progressPercent}>{percentFilled.toFixed(1)}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentFilled}%`,
                backgroundColor:
                  percentFilled >= 90 ? '#dc2626' :
                  percentFilled >= 75 ? '#ca8a04' :
                  '#16a34a'
              }
            ]}
          />
        </View>
      </View>

      <View style={[
        styles.statusBadge,
        status.allowed ? styles.statusBadgeGreen : styles.statusBadgeRed
      ]}>
        {status.allowed ? (
          <>
            <Clock color="#15803d" size={16} />
            <Text style={styles.statusTextGreen}>Registration Open</Text>
          </>
        ) : (
          <>
            <AlertCircle color="#991b1b" size={16} />
            <Text style={styles.statusTextRed}>Registration Closed</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statValueBlue: {
    color: '#2563eb',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressPercent: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusBadgeGreen: {
    backgroundColor: '#f0fdf4',
  },
  statusBadgeRed: {
    backgroundColor: '#fef2f2',
  },
  statusTextGreen: {
    fontSize: 14,
    color: '#15803d',
  },
  statusTextRed: {
    fontSize: 14,
    color: '#991b1b',
  },
});
