import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, GraduationCap, ChevronRight, Menu as MenuIcon, Library, FileText } from 'lucide-react-native';
import { useRouter, Href } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/tokens';
import { withErrorBoundary } from '@/components/withErrorBoundary';

// Selection Card Component with Animations
const SelectionCard: React.FC<{
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: readonly [string, string, ...string[]];
  onPress: () => void;
  index: number;
}> = ({ title, subtitle, description, icon, gradient, onPress, index }) => {
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
        accessibilityHint={`Öffnet ${title}`}
      >
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>{icon}</View>
            <View style={styles.textContainer}>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDescription}>{description}</Text>
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

const BibliothekSelectionScreen: React.FC = () => {
  const router = useRouter();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleHauptPress = () => {
    router.push('/(tabs)/bibliothek/haupt' as Href);
  };

  const handleKPPress = () => {
    router.push('/(tabs)/bibliothek/kp' as Href);
  };

  const backgroundGradient = MEDICAL_COLORS.backgroundGradient as unknown as readonly [string, string, ...string[]];

  return (
    <View style={styles.container}>
      <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View
          style={[
            styles.modernHeader,
            Platform.OS === 'web' && {
              position: 'sticky' as any,
              top: 0,
              zIndex: 1000,
            },
          ]}
        >
          {Platform.OS === 'web' && (
            <LinearGradient
              colors={['#6366f1', '#8b5cf6', '#a78bfa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 3, width: '100%' }}
            />
          )}
          <LinearGradient colors={MEDICAL_COLORS.headerGradient as any} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setMenuOpen(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Menü öffnen"
                >
                  <LinearGradient
                    colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.10)']}
                    style={styles.menuButtonGradient}
                  >
                    <MenuIcon size={22} color="#6366f1" />
                  </LinearGradient>
                </TouchableOpacity>
                <Logo size="medium" variant="medical" textColor="#6366f1" animated={false} />
              </View>
              <UserAvatar size="medium" />
            </View>
          </LinearGradient>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <Library size={48} color="#6366f1" />
            </View>
            <Text style={styles.heroTitle}>Bibliothek</Text>
            <Text style={styles.heroSubtitle}>
              Wählen Sie eine Bibliothek aus, um medizinisches Wissen zu vertiefen
            </Text>
          </View>

          {/* Selection Cards */}
          <View style={styles.cardsContainer}>
            {/* Haupt Bibliothek Card */}
            <SelectionCard
              title="Haupt Bibliothek"
              subtitle="Vollständige Sammlung"
              description="Umfassende medizinische Fachgebiete mit strukturierten Inhalten nach Kategorien"
              icon={<BookOpen size={36} color="#ffffff" strokeWidth={2} />}
              gradient={['#6366f1', '#8b5cf6', '#a78bfa'] as readonly [string, string, ...string[]]}
              onPress={handleHauptPress}
              index={0}
            />

            {/* KP Bibliothek (444) Card */}
            <SelectionCard
              title="KP Bibliothek (444)"
              subtitle="Prüfungsvorbereitung"
              description="444 prüfungsrelevante Themen mit Prioritäten und strukturierten Lerninhalten"
              icon={<GraduationCap size={36} color="#ffffff" strokeWidth={2} />}
              gradient={['#ec4899', '#f472b6', '#fda4af'] as readonly [string, string, ...string[]]}
              onPress={handleKPPress}
              index={1}
            />
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <FileText size={24} color={MEDICAL_COLORS.slate500} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Tipp</Text>
                <Text style={styles.infoText}>
                  Die KP Bibliothek enthält priorisierte Themen für die Prüfungsvorbereitung mit +++ (sehr wichtig), ++
                  (wichtig) und + (relevant) Markierungen.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerGradient: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    minWidth: 44,
    minHeight: 44,
  },
  menuButtonGradient: {
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 96,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  heroIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: MEDICAL_COLORS.slate900,
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: MEDICAL_COLORS.slate600,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  cardsContainer: {
    gap: SPACING.xl,
    marginBottom: SPACING.xxxl,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING.xxl,
    minHeight: 160,
    ...SHADOWS.xl,
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
    marginRight: SPACING.xl,
  },
  textContainer: {
    flex: 1,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: SPACING.sm,
  },
  cardDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  arrowContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  infoSection: {
    marginTop: SPACING.lg,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
    alignItems: 'flex-start',
    gap: SPACING.lg,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate900,
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.slate600,
    lineHeight: 20,
  },
});

export default withErrorBoundary(BibliothekSelectionScreen, 'Bibliothek');
