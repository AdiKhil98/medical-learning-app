import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Languages, GraduationCap, ChevronRight, Headphones } from 'lucide-react-native';
import { AUDIO_PRICING } from '@/types/audio';

// Selection Card Component with Animations
const AudioSelectionCard: React.FC<{
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: readonly [string, string, ...string[]];
  price: string;
  topicCount: number;
  onPress: () => void;
  index: number;
}> = ({ title, subtitle, description, icon, gradient, price, topicCount, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 150,
      useNativeDriver: true,
    }).start();
  }, [index, fadeAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>{icon}</View>
            <View style={styles.textContainer}>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDescription}>{description}</Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="headset" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.metaText}>{topicCount} Themen</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>{price}</Text>
                </View>
              </View>
            </View>
            <View style={styles.arrowContainer}>
              <ChevronRight size={28} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function AudioHomeScreen() {
  const router = useRouter();

  const handleFSPPress = () => {
    router.push('/(tabs)/bibliothek/audio/fsp');
  };

  const handleKPPress = () => {
    router.push('/(tabs)/bibliothek/audio/kp');
  };

  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Audio Bibliothek</Text>
          <Text style={styles.headerSubtitle}>Lernen Sie unterwegs</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Headphones size={48} color="#6366f1" />
          </View>
          <Text style={styles.heroTitle}>Audio Lernen</Text>
          <Text style={styles.heroSubtitle}>
            Hören Sie medizinische Inhalte - perfekt für unterwegs oder beim Pendeln
          </Text>
        </View>

        {/* Selection Cards */}
        <View style={styles.cardsContainer}>
          {/* FSP Audio Card */}
          <AudioSelectionCard
            title="FSP Audio"
            subtitle="Fachsprachprüfung"
            description="Audio-Lektionen zu Bibliothek, Anamnese und Fachbegriffen"
            icon={<Languages size={36} color="#ffffff" strokeWidth={2} />}
            gradient={['#10b981', '#059669', '#047857'] as readonly [string, string, ...string[]]}
            price={`${AUDIO_PRICING.fsp_audio.price}€/Monat`}
            topicCount={96}
            onPress={handleFSPPress}
            index={0}
          />

          {/* KP Audio Card */}
          <AudioSelectionCard
            title="KP Audio"
            subtitle="Kenntnisprüfung"
            description="Umfassende Audio-Sammlung aller prüfungsrelevanten Themen"
            icon={<GraduationCap size={36} color="#ffffff" strokeWidth={2} />}
            gradient={['#6366f1', '#4f46e5', '#4338ca'] as readonly [string, string, ...string[]]}
            price={`${AUDIO_PRICING.kp_audio.price}€/Monat`}
            topicCount={257}
            onPress={handleKPPress}
            index={1}
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#6366f1" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Hinweis</Text>
              <Text style={styles.infoText}>
                Audio-Inhalte erfordern ein separates Abonnement. Sie können sowohl FSP als auch KP Audio abonnieren.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 96,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  cardsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 20,
    padding: 24,
    minHeight: 180,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      },
    }),
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  priceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  arrowContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  infoSection: {
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-start',
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      },
    }),
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
