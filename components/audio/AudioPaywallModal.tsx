import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/utils/logger';
import { AUDIO_PRICING, type AudioLibraryType } from '@/types/audio';

interface AudioPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraryType: AudioLibraryType;
  topicTitle?: string;
}

export function AudioPaywallModal({ isOpen, onClose, libraryType, topicTitle }: AudioPaywallModalProps) {
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

  const getLibraryName = () => {
    return libraryType === 'fsp_audio' ? 'FSP Audio' : 'KP Audio';
  };

  const getPricing = () => {
    const pricing = AUDIO_PRICING[libraryType];
    return `${pricing.price}€/${pricing.period === 'month' ? 'Monat' : pricing.period}`;
  };

  const getFeatures = () => {
    if (libraryType === 'fsp_audio') {
      return [
        '96 Audio-Lektionen',
        'Fachsprachprüfung Vorbereitung',
        'Bibliothek, Anamnese & Fachbegriffe',
        'Offline verfügbar',
      ];
    }
    return ['257 Audio-Lektionen', 'Kenntnisprüfung Vorbereitung', 'Alle Fachgebiete abgedeckt', 'Offline verfügbar'];
  };

  const handleSubscribeClick = () => {
    logger.info('[Audio Paywall] Navigating to subscription page for:', libraryType);
    onClose();
    try {
      router.push('/subscription');
    } catch (error) {
      logger.error('[Audio Paywall] Navigation error:', error);
      router.replace('/subscription');
    }
  };

  return (
    <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose}>
          <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              {/* Icon */}
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🎧</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>{getLibraryName()} Zugang</Text>

              {/* Message */}
              <Text style={styles.message}>
                {topicTitle
                  ? `Um "${topicTitle}" anzuhören, benötigen Sie ein ${getLibraryName()}-Abonnement.`
                  : `Schalten Sie alle ${getLibraryName()}-Inhalte frei.`}
              </Text>

              {/* Pricing */}
              <View style={styles.pricingContainer}>
                <Text style={styles.pricingPrice}>{getPricing()}</Text>
                <Text style={styles.pricingSubtext}>Jederzeit kündbar</Text>
              </View>

              {/* Features Section */}
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featuresContainer}
              >
                <Text style={styles.featuresTitle}>Im Abo enthalten:</Text>
                <View style={styles.featuresList}>
                  {getFeatures().map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <View style={styles.featureIcon}>
                        <Text style={styles.featureIconText}>✓</Text>
                      </View>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSubscribeClick} activeOpacity={0.8}>
                  <LinearGradient
                    colors={libraryType === 'fsp_audio' ? ['#10B981', '#059669'] : ['#6366f1', '#4f46e5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={styles.primaryButtonText}>Jetzt abonnieren</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={onClose} activeOpacity={0.7}>
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
    color: '#1F2937',
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
  pricingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pricingPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366f1',
  },
  pricingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  featuresContainer: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  featureText: {
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
    shadowColor: 'rgba(99, 102, 241, 0.3)',
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
    borderColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
});
