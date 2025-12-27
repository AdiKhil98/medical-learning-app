import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface QuotaExhaustedCardProps {
  simulationsUsed: number;
  totalSimulations: number;
  subscriptionTier: 'free' | 'basic' | 'premium';
  periodEnd?: Date;
}

export default function QuotaExhaustedCard({
  simulationsUsed,
  totalSimulations,
  subscriptionTier,
  periodEnd,
}: QuotaExhaustedCardProps) {
  const router = useRouter();

  const formatResetDate = () => {
    if (!periodEnd) return 'am Monatsende';

    const date = new Date(periodEnd);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `am ${day}.${month}.${year}`;
  };

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FF8C42', '#FF6B6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="trophy" size={48} color="#FFFFFF" />
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          Super! Du hast {simulationsUsed} Simulation{simulationsUsed !== 1 ? 'en' : ''} abgeschlossen
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          Du hast dein monatliches Limit von {totalSimulations} Simulationen erreicht.
          {'\n'}
          Dein Kontingent wird {formatResetDate()} zurückgesetzt.
        </Text>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#FF8C42" />
          <Text style={styles.infoText}>Du kannst weiterhin auf Lernkarten und andere Inhalte zugreifen</Text>
        </View>

        {/* Upgrade Button */}
        {subscriptionTier !== 'premium' && (
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade} activeOpacity={0.8}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="rocket" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Jetzt upgraden für unbegrenzte Simulationen</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Alternative Options */}
        <View style={styles.alternativesContainer}>
          <Text style={styles.alternativesTitle}>Weiterlernen:</Text>
          <View style={styles.alternativesList}>
            <View style={styles.alternativeItem}>
              <Ionicons name="card" size={16} color="#FFFFFF" />
              <Text style={styles.alternativeText}>Lernkarten durchgehen</Text>
            </View>
            <View style={styles.alternativeItem}>
              <Ionicons name="book" size={16} color="#FFFFFF" />
              <Text style={styles.alternativeText}>Notizen wiederholen</Text>
            </View>
            <View style={styles.alternativeItem}>
              <Ionicons name="people" size={16} color="#FFFFFF" />
              <Text style={styles.alternativeText}>Patientenvorstellung üben</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quota Info Footer */}
      <View style={styles.footer}>
        <View style={styles.quotaInfo}>
          <View style={styles.quotaBar}>
            <View style={[styles.quotaFill, { width: '100%' }]} />
          </View>
          <Text style={styles.quotaText}>
            {simulationsUsed} / {totalSimulations} Simulationen verwendet
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    opacity: 0.95,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  upgradeButton: {
    width: '100%',
    marginBottom: 20,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  alternativesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  alternativesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  alternativesList: {
    gap: 10,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alternativeText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
    opacity: 0.95,
  },
  footer: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  quotaInfo: {
    alignItems: 'center',
  },
  quotaBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  quotaFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  quotaText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
});
