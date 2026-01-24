import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

export default function TrialStatusTimeline() {
  const router = useRouter();
  const { user } = useAuth();
  const { subscriptionStatus, isTrial, trialDaysRemaining, trialExpired } = useSubscription(user?.id);

  // Don't show if no user or loading
  if (!user || !subscriptionStatus) return null;

  const tier = subscriptionStatus.subscriptionTier;
  const isPaidSubscriber = ['monthly', 'quarterly', 'basic', 'premium'].includes(tier || '');

  // Don't show for paid subscribers
  if (isPaidSubscriber) return null;

  // Don't show if trial expired (different UI handles that)
  if (trialExpired && tier !== 'trial') return null;

  // Calculate days used and other metrics
  const totalDays = 5;
  const daysRemaining = trialDaysRemaining ?? 0;
  const daysUsed = Math.max(0, totalDays - daysRemaining);
  const isExpiringSoon = daysRemaining <= 2 && daysRemaining > 0;

  // Format expiration date
  const getTrialEndsFormatted = () => {
    if (subscriptionStatus.trialExpiresAt) {
      const expiresAt = new Date(subscriptionStatus.trialExpiresAt);
      const formatter = new Intl.DateTimeFormat('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return formatter.format(expiresAt);
    }
    // Calculate from days remaining
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysRemaining);
    const formatter = new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(expiresAt);
  };

  const trialEndsFormatted = getTrialEndsFormatted();

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  // Show timeline for active trial users
  if ((isTrial || tier === 'trial') && daysRemaining > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerLabel}>Ihre Testphase</Text>
            <Text style={[styles.headerValue, isExpiringSoon && styles.headerValueUrgent]}>
              {daysRemaining} von {totalDays} Tagen übrig
            </Text>
          </View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            {/* Progress Line Background */}
            <View style={styles.progressLineBackground} />

            {/* Progress Line Filled */}
            <LinearGradient
              colors={['#F97316', '#FBBF24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressLineFilled, { width: `${(daysUsed / (totalDays - 1)) * 100}%` }]}
            />

            {/* Day Dots */}
            <View style={styles.dotsContainer}>
              {[1, 2, 3, 4, 5].map((day) => {
                const isPast = day <= daysUsed;
                const isCurrent = day === daysUsed + 1;

                return (
                  <View key={day} style={styles.dayItem}>
                    {isPast ? (
                      <LinearGradient colors={['#F97316', '#FBBF24']} style={styles.dotCompleted}>
                        <Text style={styles.dotTextCompleted}>{day}</Text>
                      </LinearGradient>
                    ) : isCurrent ? (
                      <View style={styles.dotCurrent}>
                        <Text style={styles.dotTextCurrent}>{day}</Text>
                      </View>
                    ) : (
                      <View style={styles.dotFuture}>
                        <Text style={styles.dotTextFuture}>{day}</Text>
                      </View>
                    )}
                    <Text style={styles.dayLabel}>Tag {day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerTextContainer}>
              <Text style={styles.footerText}>
                Unbegrenzte Simulationen bis <Text style={styles.footerTextBold}>{trialEndsFormatted}</Text>
              </Text>
            </View>

            <TouchableOpacity onPress={handleUpgrade} style={styles.upgradeButton} activeOpacity={0.8}>
              <LinearGradient
                colors={['#F97316', '#FBBF24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeButtonGradient}
              >
                <Text style={styles.upgradeButtonText}>Jetzt upgraden</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Urgency Banner (shows when 1-2 days left) */}
          {isExpiringSoon && (
            <View style={styles.urgencyBanner}>
              <Text style={styles.urgencyText}>
                ⏰ Nur noch {daysRemaining} {daysRemaining === 1 ? 'Tag' : 'Tage'}! Sichern Sie sich jetzt unbegrenzten
                Zugang.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  headerValueUrgent: {
    color: '#EF4444',
  },
  timelineContainer: {
    position: 'relative',
    height: 80,
    marginBottom: 20,
  },
  progressLineBackground: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
  },
  progressLineFilled: {
    position: 'absolute',
    top: 16,
    left: 16,
    height: 2,
    borderRadius: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayItem: {
    alignItems: 'center',
  },
  dotCompleted: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)',
      },
      default: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  dotTextCompleted: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dotCurrent: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotTextCurrent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
  },
  dotFuture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotTextFuture: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  dayLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
  },
  footerTextBold: {
    fontWeight: '600',
    color: '#374151',
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  urgencyBanner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  urgencyText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
});
