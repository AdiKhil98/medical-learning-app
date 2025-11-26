import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface UpgradeRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string | null;
  remainingSimulations: number;
  totalLimit: number;
  simulationsUsed?: number;  // Add used count prop
}

export function UpgradeRequiredModal({
  isOpen,
  onClose,
  currentTier,
  remainingSimulations,
  totalLimit,
  simulationsUsed
}: UpgradeRequiredModalProps) {
  const router = useRouter();

  // Close modal on Escape key (web only)
  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web') return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Get tier display name
  const getTierName = (tier: string | null) => {
    const names: Record<string, string> = {
      'free': 'Kostenlos',
      'basis': 'Basis',
      'profi': 'Profi',
      'unlimited': 'Unlimited'
    };
    return names[tier || 'free'] || 'Aktuell';
  };

  // Get upgrade message based on tier
  const getUpgradeMessage = () => {
    if (currentTier === 'free' || !currentTier) {
      return `Sie haben alle ${totalLimit} kostenlosen Simulationen verbraucht.`;
    } else {
      return `Sie haben alle ${totalLimit} Simulationen Ihres ${getTierName(currentTier)}-Plans für diesen Monat verbraucht.`;
    }
  };

  const handleUpgradeClick = () => {
    logger.info('🔄 Navigating to subscription page...');
    onClose();
    // Use correct Expo Router syntax for navigation
    try {
      router.push('/subscription');
      logger.info('✅ Navigation to subscription page initiated');
    } catch (error) {
      logger.error('❌ Error navigating to subscription:', error);
      // Fallback navigation
      router.replace('/subscription');
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              {/* Icon */}
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🚀</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>
                Simulationslimit erreicht
              </Text>

              {/* Message */}
              <Text style={styles.message}>
                {getUpgradeMessage()}
              </Text>

              {/* Usage Display */}
              <View style={styles.usageContainer}>
                <View style={styles.usageBarContainer}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.usageBarFill}
                  />
                </View>
                <View style={styles.usageTextContainer}>
                  <Text style={styles.usageUsed}>{simulationsUsed !== undefined ? simulationsUsed : totalLimit}</Text>
                  <Text style={styles.usageSeparator}>/</Text>
                  <Text style={styles.usageTotal}>{totalLimit}</Text>
                  <Text style={styles.usageLabel}>Simulationen verbraucht</Text>
                </View>
              </View>

              {/* Benefits Section */}
              <LinearGradient
                colors={['rgba(226, 130, 127, 0.1)', 'rgba(184, 126, 112, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.benefitsContainer}
              >
                <Text style={styles.benefitsTitle}>Upgraden Sie für:</Text>
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Text style={styles.benefitIconText}>✓</Text>
                    </View>
                    <Text style={styles.benefitText}>Mehr monatliche Simulationen</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Text style={styles.benefitIconText}>✓</Text>
                    </View>
                    <Text style={styles.benefitText}>Detaillierte Auswertungen</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Text style={styles.benefitIconText}>✓</Text>
                    </View>
                    <Text style={styles.benefitText}>Prioritärer Support</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Text style={styles.benefitIconText}>✓</Text>
                    </View>
                    <Text style={styles.benefitText}>Erweiterte Lernmaterialien</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleUpgradeClick}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={styles.primaryButtonText}>
                      Pläne ansehen & upgraden
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>Später</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.4,
    shadowRadius: 80,
    elevation: 20,
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    padding: 40,
    paddingTop: 60,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '400',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#B15740',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  message: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  usageContainer: {
    backgroundColor: '#F8F3E8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  usageBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  usageBarFill: {
    height: '100%',
    width: '100%',
    borderRadius: 4,
  },
  usageTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  usageUsed: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
  },
  usageSeparator: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  usageTotal: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },
  usageLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  benefitsContainer: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B15740',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#10B981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitIconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#B87E70',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#B87E70',
    fontSize: 16,
    fontWeight: '600',
  },
});
