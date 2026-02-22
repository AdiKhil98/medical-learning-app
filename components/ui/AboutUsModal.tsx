import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { X, AlertTriangle, CheckCircle, BookOpen, Users, BarChart3, Quote, Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface AboutUsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AboutUsModal({ visible, onClose }: AboutUsModalProps) {
  const router = useRouter();

  const handleGetStarted = () => {
    onClose();
    router.push('/subscription');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <LinearGradient colors={['#FF8C42', '#FF6B6B']} style={styles.hero}>
            {/* Dotted pattern overlay */}
            <View style={styles.heroPattern} />

            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <View style={styles.closeButtonInner}>
                <X size={24} color="#FF6B6B" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Effektive Prüfungsvorbereitung,{'\n'}die wirklich funktioniert</Text>
              <Text style={styles.heroSubtitle}>
                Wir kennen das Problem: Tausende Euro für Kurse ausgeben, nur um medizinische Informationen zu hören,
                die Sie durch Google finden können. Über Sie treten Telegram-Gruppen bei, wo zwei Personen eine Prüfung
                simulieren – ohne echtes Feedback, ohne Struktur, ohne wirklichen Mehrwert.
              </Text>
              <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.9}>
                <View style={styles.ctaButton}>
                  <Text style={styles.ctaButtonText}>Jetzt Premium sichern</Text>
                </View>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Main Content Container */}
          <View style={styles.mainContent}>
            {/* Problem vs Solution Cards */}
            <View style={styles.cardSection}>
              {/* Problem Card */}
              <View style={[styles.card, styles.problemCard]}>
                <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.cardIcon}>
                  <AlertTriangle size={32} color="#DC2626" strokeWidth={2} />
                </LinearGradient>
                <Text style={styles.cardTitle}>Das Problem mit traditioneller Prüfungsvorbereitung</Text>
                <Text style={styles.cardText}>
                  Die meisten Vorbereitungskurse überschütten Sie mit Informationen. Aber nicht alle Informationen sind
                  gleich wichtig. Sie gehen verschwendet wertvolle Kapazität auf irrelevante Details, während
                  prüfungsrelevante Inhalte untergehen. Sie zahlen viel, lernen viel – aber bereiten sich nicht optimal
                  vor.
                </Text>
              </View>

              {/* Solution Card */}
              <View style={[styles.card, styles.solutionCard]}>
                <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={styles.cardIcon}>
                  <CheckCircle size={32} color="#059669" strokeWidth={2} />
                </LinearGradient>
                <Text style={styles.cardTitle}>Unsere Lösung: Fokussiertes Lernen + Realistische Simulation</Text>
                <Text style={styles.cardText}>
                  Bei KP Med erhalten Sie genau das, was Sie brauchen: prüfungsrelevante medizinische Inhalte kombiniert
                  mit realistischen Simulationen für Kenntnisprüfung und Fachsprachprüfung. Kein überflüssiges Wissen,
                  keine Zeitverschwendung – nur das, was wirklich in der Prüfung vorkommt.
                </Text>
              </View>
            </View>

            {/* Features Section */}
            <View style={styles.featuresSection}>
              <View style={styles.featuresHeader}>
                <Text style={styles.featuresTitle}>Was macht KP Med besonders?</Text>
                <Text style={styles.featuresSubtitle}>
                  Eine Plattform, die Ihnen die besten Lernressourcen und realistische Prüfungssituationen bietet.
                </Text>
              </View>

              <View style={styles.featureList}>
                {/* Feature 1 */}
                <View style={styles.featureItem}>
                  <LinearGradient colors={['#FF8C42', '#FF6B6B']} style={styles.featureIcon}>
                    <BookOpen size={24} color="#FFFFFF" strokeWidth={2} />
                  </LinearGradient>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Prüfungsrelevante medizinische Inhalte</Text>
                    <Text style={styles.featureText}>
                      Wir konzentrieren uns auf das, was wirklich in der Prüfung vorkommt. Keine Zeitverschwendung mit
                      überflüssigen Details.
                    </Text>
                  </View>
                </View>

                {/* Feature 2 */}
                <View style={styles.featureItem}>
                  <LinearGradient colors={['#FF8C42', '#FF6B6B']} style={styles.featureIcon}>
                    <Users size={24} color="#FFFFFF" strokeWidth={2} />
                  </LinearGradient>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>
                      Professionelle Simulationen für Kenntnisprüfung und Fachsprachprüfung
                    </Text>
                    <Text style={styles.featureText}>
                      Realistische Prüfungssituationen, die Sie optimal vorbereiten. Üben Sie so oft Sie möchten in
                      einer sicheren Umgebung.
                    </Text>
                  </View>
                </View>

                {/* Feature 3 */}
                <View style={styles.featureItem}>
                  <LinearGradient colors={['#FF8C42', '#FF6B6B']} style={styles.featureIcon}>
                    <BarChart3 size={24} color="#FFFFFF" strokeWidth={2} />
                  </LinearGradient>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Detaillierte, personalisierte Auswertungen</Text>
                    <Text style={styles.featureText}>Nach jeder Simulation erhalten Sie eine präzise Analyse:</Text>
                    <View style={styles.featureBullets}>
                      <Text style={styles.bulletText}>• Ihre echten Stärken</Text>
                      <Text style={styles.bulletText}>• Ihre Schwachpunkte</Text>
                      <Text style={styles.bulletText}>• Konkrete Empfehlungen, woran Sie arbeiten sollten</Text>
                      <Text style={styles.bulletText}>• Ihr persönlicher Lernplan für maximale Fortschritte</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Pricing Comparison */}
            <View style={styles.pricingSection}>
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingTitle}>Hochwertige Vorbereitung zu fairen Preisen</Text>
                <Text style={styles.pricingSubtitle}>
                  Statt tausende Euro auszugeben, beginnen Sie unsere Pläne bei nur 1,50€ pro Tag.
                </Text>
              </View>

              <View style={styles.pricingCards}>
                {/* Traditional Course Card */}
                <View style={[styles.pricingCard, styles.traditionalCard]}>
                  <Text style={styles.pricingCardIcon}>🏛️</Text>
                  <Text style={styles.pricingCardTitle}>Traditioneller Kurs</Text>
                  <Text style={[styles.pricingAmount, styles.traditionalAmount]}>€2.000 - €5.000</Text>
                  <Text style={styles.pricingPeriod}>Einmalig</Text>
                  <Text style={styles.pricingDescription}>
                    Hohe Kosten für oft generisches Wissen ohne individuelle Anpassung.
                  </Text>
                </View>

                {/* KP Med Card */}
                <View style={[styles.pricingCard, styles.kpMedCard]}>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>EMPFOHLEN</Text>
                  </View>
                  <Text style={styles.pricingCardIcon}>⚡</Text>
                  <Text style={styles.pricingCardTitle}>KP Med Premium</Text>
                  <LinearGradient
                    colors={['#FF8C42', '#FF6B6B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientTextContainer}
                  >
                    <Text style={styles.kpMedAmount}>ab €45</Text>
                  </LinearGradient>
                  <Text style={styles.pricingPeriod}>/Monat</Text>
                  <Text style={styles.pricingDescription}>
                    Wir glauben, dass exzellente medizinische Ausbildung zugänglich sein sollte. Deshalb haben wir KP
                    Med entwickelt – zu einem Bruchteil der Kosten traditioneller Kurse.
                  </Text>
                </View>
              </View>
            </View>

            {/* Testimonial */}
            <LinearGradient colors={['#FFF7ED', '#FFEDD5']} style={styles.testimonial}>
              <Quote size={48} color="#FF8C42" strokeWidth={1.5} style={styles.quoteIcon} />
              <Text style={styles.testimonialText}>
                "Ich habe mit KP Med beim ersten Versuch bestanden – die Simulationen waren fast identisch mit der
                echten Prüfung!"
              </Text>
              <Text style={styles.testimonialAuthor}>— Dr. Sarah M.</Text>
            </LinearGradient>

            {/* Final CTA */}
            <View style={styles.finalCta}>
              <Text style={styles.finalCtaTitle}>Starten Sie heute Ihre erfolgreiche Prüfungsvorbereitung</Text>
              <Text style={styles.finalCtaText}>
                Erleben Sie den Unterschied selbst und sehen Sie, wie KP Med Ihre Vorbereitung transformiert.
              </Text>
              <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.9}>
                <LinearGradient colors={['#FF8C42', '#FF6B6B']} style={styles.ctaButtonLarge}>
                  <Text style={styles.ctaButtonLargeText}>Jetzt Premium sichern →</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Contact Section */}
              <View style={styles.contactSection}>
                <Text style={styles.contactTitle}>Noch Fragen? Wir helfen gerne!</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL('mailto:support@kpmed.de')}
                  style={styles.contactButton}
                  activeOpacity={0.7}
                >
                  <Mail size={20} color="#FF6B6B" />
                  <Text style={styles.contactEmail}>support@kpmed.de</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },

  // Hero Section
  hero: {
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  heroContent: {
    maxWidth: 1200,
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: isMobile ? 32 : 56,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: isMobile ? 38 : 64,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      textShadow: '0 2px 20px rgba(0,0,0,0.1)' as any,
    }),
  },
  heroSubtitle: {
    fontSize: isMobile ? 17 : 20,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: isMobile ? 26 : 32,
    maxWidth: 800,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  ctaButtonText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },

  // Main Content
  mainContent: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    marginTop: -60,
    marginBottom: 80,
    zIndex: 2,
  },

  // Card Section
  cardSection: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 40,
    marginBottom: 60,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  problemCard: {
    borderWidth: 0,
  },
  solutionCard: {
    borderWidth: 0,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 30,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  cardText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 28,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },

  // Features Section
  featuresSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: isMobile ? 40 : 60,
    marginBottom: 60,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  featuresHeader: {
    alignItems: 'center',
    marginBottom: 50,
  },
  featuresTitle: {
    fontSize: isMobile ? 32 : 40,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    color: '#FF8C42',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  featuresSubtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  featureList: {
    gap: 40,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    minWidth: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  featureText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 26,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  featureBullets: {
    marginTop: 12,
    gap: 6,
  },
  bulletText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 24,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },

  // Pricing Section
  pricingSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    padding: isMobile ? 40 : 60,
    marginBottom: 60,
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: 50,
  },
  pricingTitle: {
    fontSize: isMobile ? 32 : 40,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  pricingSubtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  pricingCards: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 40,
    maxWidth: 900,
    alignSelf: 'center',
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  traditionalCard: {
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  kpMedCard: {
    borderWidth: 3,
    borderColor: '#FF8C42',
    transform: isMobile ? [] : [{ scale: 1.05 }],
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  recommendedBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FF8C42',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recommendedBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  pricingCardIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  pricingCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  pricingAmount: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 8,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  traditionalAmount: {
    color: '#DC2626',
  },
  gradientTextContainer: {
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  kpMedAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  pricingPeriod: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  pricingDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 26,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },

  // Testimonial
  testimonial: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
    borderRadius: 16,
    padding: 40,
    marginBottom: 60,
    ...Platform.select({
      ios: {
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  quoteIcon: {
    opacity: 0.7,
    marginBottom: 20,
  },
  testimonialText: {
    fontSize: 20,
    fontStyle: 'italic',
    color: '#78350F',
    marginBottom: 20,
    lineHeight: 32,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  testimonialAuthor: {
    fontSize: 17,
    fontWeight: '700',
    color: '#92400E',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },

  // Final CTA
  finalCta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: isMobile ? 40 : 60,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  finalCtaTitle: {
    fontSize: isMobile ? 28 : 36,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  finalCtaText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 28,
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  ctaButtonLarge: {
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  ctaButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  contactSection: {
    marginTop: 40,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
});
