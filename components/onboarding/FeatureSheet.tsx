import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingFeature } from './onboardingData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeatureSheetProps {
  feature: OnboardingFeature | null;
  visible: boolean;
  onClose: () => void;
}

const FeatureSheet: React.FC<FeatureSheetProps> = ({ feature, visible, onClose }) => {
  if (!feature) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>{feature.emoji}</Text>
            <Text style={styles.title}>{feature.title}</Text>
            <Text style={[styles.tagline, { color: feature.color }]}>{feature.tagline}</Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {feature.details.map((block, index) => (
              <View key={index} style={styles.contentBlock}>
                <Text style={styles.blockTitle}>{block.title}</Text>
                {block.subtitle && <Text style={styles.blockSubtitle}>{block.subtitle}</Text>}
                {block.items && (
                  <View style={styles.itemsList}>
                    {block.items.map((item, itemIndex) => (
                      <View key={itemIndex} style={styles.itemRow}>
                        <View style={[styles.bullet, { backgroundColor: feature.color }]} />
                        <Text style={styles.itemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* Tip Box */}
            {feature.tip && (
              <View style={styles.tipBox}>
                <Text style={styles.tipEmoji}>💡</Text>
                <Text style={styles.tipText}>{feature.tip}</Text>
              </View>
            )}
          </ScrollView>

          {/* Verstanden Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <LinearGradient
                colors={['#F97316', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Verstanden</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFF9F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentBlock: {
    marginBottom: 24,
  },
  blockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  blockSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 22,
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipEmoji: {
    fontSize: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default FeatureSheet;
