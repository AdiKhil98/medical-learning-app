import React from 'react';
import { logger } from '@/utils/logger';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface UpgradeRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  remainingSimulations: number;
  totalLimit: number;
  // Trial-specific props
  trialExpired?: boolean;
  trialDaysRemaining?: number;
}

export function UpgradeRequiredModal({
  isOpen,
  onClose,
  currentTier,
  remainingSimulations,
  totalLimit,
  trialExpired,
  trialDaysRemaining,
}: UpgradeRequiredModalProps) {
  const router = useRouter();

  const getTierName = (tier: string) => {
    const names: Record<string, string> = {
      trial: 'Testphase',
      free: 'Kostenlos',
      basic: 'Basis',
      premium: 'Premium',
      // Legacy names
      basis: 'Basis',
      profi: 'Premium',
    };
    return names[tier] || 'Aktuell';
  };

  const getUpgradeMessage = () => {
    // Trial expired message
    if (trialExpired || currentTier === 'expired_trial') {
      return 'Ihre 5-Tage-Testphase ist abgelaufen. Abonnieren Sie jetzt, um weiterhin unbegrenzte Simulationen zu nutzen!';
    }

    // Regular quota exceeded messages
    if (currentTier === 'free' || !currentTier) {
      return `Sie haben alle ${totalLimit} kostenlosen Simulationen verbraucht.`;
    } else {
      return `Sie haben alle ${totalLimit} Simulationen Ihres ${getTierName(currentTier)}-Plans für diesen Monat verbraucht.`;
    }
  };

  const getTitle = () => {
    if (trialExpired || currentTier === 'expired_trial') {
      return 'Testphase abgelaufen';
    }
    return 'Simulationslimit erreicht';
  };

  const getIcon = () => {
    if (trialExpired || currentTier === 'expired_trial') {
      return '⏰';
    }
    return '🚀';
  };

  const handleUpgradeClick = () => {
    logger.info('🔄 Navigating to subscription page...');
    onClose();
    // Navigate using the string path directly (Expo Router v3+ syntax)
    router.push('subscription' as any);
  };

  return (
    <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Schließen">
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            {/* Icon */}
            <Text style={styles.icon}>{getIcon()}</Text>

            {/* Title */}
            <Text style={styles.title}>{getTitle()}</Text>

            {/* Message */}
            <Text style={styles.message}>{getUpgradeMessage()}</Text>

            {/* Usage Display - Hide for trial expired */}
            {!trialExpired && currentTier !== 'expired_trial' && totalLimit > 0 && (
              <View style={styles.usageContainer}>
                <View style={styles.usageBarContainer}>
                  <View style={[styles.usageBarFill, { width: '100%' }]} />
                </View>
                <Text style={styles.usageText}>
                  <Text style={styles.usageUsed}>{totalLimit - remainingSimulations}</Text>
                  <Text style={styles.usageSeparator}>/</Text>
                  <Text style={styles.usageTotal}>{totalLimit}</Text>
                  <Text style={styles.usageLabel}> Simulationen verbraucht</Text>
                </Text>
              </View>
            )}

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Upgraden Sie für:</Text>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>Mehr monatliche Simulationen</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>Detaillierte Auswertungen</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>Prioritärer Support</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>Erweiterte Lernmaterialien</Text>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleUpgradeClick}>
                <Text style={styles.primaryButtonText}>Pläne ansehen & upgraden</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Später</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollContent: {
    padding: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  icon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  usageContainer: {
    marginBottom: 24,
  },
  usageBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  usageText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  usageUsed: {
    fontWeight: 'bold',
    color: '#ef4444',
  },
  usageSeparator: {
    color: '#999',
  },
  usageTotal: {
    fontWeight: 'bold',
    color: '#999',
  },
  usageLabel: {
    color: '#666',
  },
  benefitsContainer: {
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    padding: 20,
    borderRadius: 12,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    fontSize: 18,
    color: '#10b981',
    marginRight: 12,
    fontWeight: 'bold',
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#C99487',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});
