import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

export default function TrialStatusBanner() {
  const router = useRouter();
  const { user } = useAuth();
  const { subscriptionStatus, isTrial, trialDaysRemaining, trialExpired } = useSubscription(user?.id);

  // Don't show banner if no user or if user has paid subscription
  if (!user || !subscriptionStatus) return null;

  const tier = subscriptionStatus.subscriptionTier;
  const isPaidSubscriber = ['monthly', 'quarterly', 'basic', 'premium'].includes(tier || '');

  // Don't show for paid subscribers
  if (isPaidSubscriber) return null;

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  // Debug logging
  console.log('[TrialBanner] Data:', { tier, isTrial, trialDaysRemaining, trialExpired, subscriptionStatus });

  // Trial active - show days remaining (check tier === 'trial' as fallback)
  if ((isTrial || tier === 'trial') && trialDaysRemaining !== undefined && trialDaysRemaining > 0) {
    return (
      <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {trialDaysRemaining === 1 ? '1 Tag' : `${trialDaysRemaining} Tage`} Testphase verbleibend
            </Text>
            <Text style={styles.subtitle}>Unbegrenzte Simulationen bis zum Ende der Testphase</Text>
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade} activeOpacity={0.8}>
            <Text style={styles.upgradeButtonText}>Abo wählen</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Trial active without days info - show generic trial banner
  if ((isTrial || tier === 'trial') && (trialDaysRemaining === undefined || trialDaysRemaining === null)) {
    return (
      <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Testphase aktiv</Text>
            <Text style={styles.subtitle}>Unbegrenzte Simulationen während der Testphase</Text>
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade} activeOpacity={0.8}>
            <Text style={styles.upgradeButtonText}>Abo wählen</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Trial expired - show upgrade prompt
  if (trialExpired || tier === 'expired_trial' || tier === 'free') {
    return (
      <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Testphase abgelaufen</Text>
            <Text style={styles.subtitle}>Abonnieren Sie jetzt für unbegrenzte Simulationen</Text>
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade} activeOpacity={0.8}>
            <Text style={styles.upgradeButtonText}>Jetzt abonnieren</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  upgradeButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
});
