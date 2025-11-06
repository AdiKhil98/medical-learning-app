'use client';

import { useEffect, useState } from 'react';
import { checkRegistrationStatus, type RegistrationStatus } from '@/lib/registrationLimit';
import { AlertCircle, Clock, Users } from 'lucide-react-native';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function RegistrationStatusBanner() {
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    const data = await checkRegistrationStatus();
    setStatus(data);
    setLoading(false);
  }

  if (loading) {
    return null; // Or skeleton loader
  }

  if (!status) {
    return null; // Failed to load, don't block user
  }

  const spotsRemaining = status.max_users - status.current_count;
  const percentFilled = (status.current_count / status.max_users) * 100;

  // Show different messages based on how many spots left
  if (!status.allowed) {
    return (
      <View style={styles.bannerYellow}>
        <AlertCircle color="#d97706" size={20} style={styles.icon} />
        <View style={styles.content}>
          <Text style={styles.titleYellow}>
            Registration Currently Closed
          </Text>
          <Text style={styles.messageYellow}>
            We've reached our limit of {status.max_users} beta users. Join our waitlist to be notified when spots open up!
          </Text>
        </View>
      </View>
    );
  }

  // Urgent message when almost full (less than 10 spots)
  if (spotsRemaining <= 10) {
    return (
      <View style={styles.bannerRed}>
        <Clock color="#dc2626" size={20} style={styles.icon} />
        <View style={styles.content}>
          <Text style={styles.titleRed}>
            Only {spotsRemaining} Spots Remaining!
          </Text>
          <Text style={styles.messageRed}>
            We're in limited beta. Register now before spots run out.
          </Text>
        </View>
      </View>
    );
  }

  // Show spots remaining when under 50% capacity
  if (percentFilled > 50) {
    return (
      <View style={styles.bannerBlue}>
        <Users color="#2563eb" size={20} style={styles.icon} />
        <View style={styles.content}>
          <Text style={styles.titleBlue}>
            Limited Beta Access
          </Text>
          <Text style={styles.messageBlue}>
            {spotsRemaining} spots remaining out of {status.max_users} total
          </Text>
        </View>
      </View>
    );
  }

  return null; // Plenty of spots, no need to show banner
}

const styles = StyleSheet.create({
  bannerYellow: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerRed: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerBlue: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginTop: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  titleYellow: {
    fontWeight: '600',
    fontSize: 16,
    color: '#78350f',
    marginBottom: 4,
  },
  titleRed: {
    fontWeight: '600',
    fontSize: 16,
    color: '#7f1d1d',
    marginBottom: 4,
  },
  titleBlue: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1e3a8a',
    marginBottom: 4,
  },
  messageYellow: {
    fontSize: 14,
    color: '#92400e',
  },
  messageRed: {
    fontSize: 14,
    color: '#991b1b',
  },
  messageBlue: {
    fontSize: 14,
    color: '#1e40af',
  },
});
