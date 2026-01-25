import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrialStatus } from '@/hooks/useTrialStatus';

export default function TrialStatusTimeline() {
  const router = useRouter();
  const {
    isLoading,
    isTrialActive,
    daysRemaining,
    daysUsed,
    totalDays,
    trialEndsFormatted,
    isExpiringSoon,
    isExpired,
    isSubscribed,
  } = useTrialStatus();

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  // ============================================
  // SUBSCRIBED USER - Show premium status badge
  // ============================================
  if (isSubscribed) {
    return (
      <View style={styles.container}>
        <View style={styles.subscriberCard}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscriberGradient}
          >
            <View style={styles.subscriberContent}>
              <View style={styles.subscriberIconContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.subscriberTextContainer}>
                <Text style={styles.subscriberTitle}>Premium Mitglied</Text>
                <Text style={styles.subscriberSubtitle}>Unbegrenzter Zugang zu allen Simulationen</Text>
              </View>
              <Ionicons name="star" size={20} color="#FCD34D" />
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }

  // Show loading skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeleton} />
      </View>
    );
  }

  // ============================================
  // TRIAL EXPIRED - Show expired state
  // ============================================
  if (isExpired) {
    return (
      <View style={styles.container}>
        <View style={styles.expiredCard}>
          <View style={styles.expiredHeader}>
            <View style={styles.expiredIconContainer}>
              <Ionicons name="time-outline" size={24} color="#EF4444" />
            </View>
            <View style={styles.expiredTextContainer}>
              <Text style={styles.expiredTitle}>Testphase abgelaufen</Text>
              <Text style={styles.expiredSubtitle}>Abonnieren Sie für unbegrenzten Zugang</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleUpgrade} style={styles.expiredUpgradeButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['#F97316', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.expiredUpgradeGradient}
            >
              <Text style={styles.expiredUpgradeText}>Jetzt abonnieren</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================
  // TRIAL ACTIVE - Show timeline
  // ============================================
  if (isTrialActive && daysRemaining > 0) {
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
            {daysUsed > 0 && (
              <LinearGradient
                colors={['#F97316', '#FBBF24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressLineFilled, { width: `${Math.min((daysUsed / (totalDays - 1)) * 100, 100)}%` }]}
              />
            )}

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

  // Fallback - show nothing if no state matches
  return null;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    marginBottom: 24,
    marginTop: 16,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  // ============================================
  // TRIAL TIMELINE CARD STYLES
  // ============================================
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
  skeleton: {
    height: 180,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
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
  // ============================================
  // SUBSCRIBER STYLES
  // ============================================
  subscriberCard: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(16, 185, 129, 0.2)',
      },
      default: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  subscriberGradient: {
    padding: 16,
    width: '100%',
  },
  subscriberContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subscriberIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  subscriberTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  subscriberTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subscriberSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  // ============================================
  // EXPIRED STYLES
  // ============================================
  expiredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)',
      },
      default: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  expiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  expiredIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expiredTextContainer: {
    flex: 1,
  },
  expiredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
  },
  expiredSubtitle: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 2,
  },
  expiredUpgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  expiredUpgradeGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  expiredUpgradeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
