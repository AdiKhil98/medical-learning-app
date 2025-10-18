import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Mic,
  Brain,
  Target,
  Clock,
  Menu as MenuIcon,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Zap,
  Award
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';

const { width: screenWidth } = Dimensions.get('window');

export default function SimulationScreen() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#EEF2FF', '#FFFFFF', '#FFF7ED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(251, 146, 60, 0.15)', 'rgba(239, 68, 68, 0.10)']}
                style={styles.menuButtonGradient}
              >
                <MenuIcon size={24} color="#FB923C" />
              </LinearGradient>
            </TouchableOpacity>
            <Logo size="medium" variant="medical" textColor="#FB923C" animated={true} />
            <UserAvatar size="medium" />
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Hero Section with Animated Background */}
        <View style={styles.heroSection}>
          {/* Animated Background Blobs */}
          <View style={styles.animatedBlobsContainer}>
            <View style={[styles.blob, styles.blob1]} />
            <View style={[styles.blob, styles.blob2]} />
          </View>

          {/* Badge */}
          <View style={styles.badge}>
            <Sparkles size={16} color="#F97316" />
            <Text style={styles.badgeText}>Prüfungsvorbereitung</Text>
          </View>

          {/* Main Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.gradientTitle}>Meistere deine</Text>
            <Text style={styles.mainTitle}>medizinische Prüfung</Text>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Realistische Simulationen mit KI-gestütztem Feedback für KP & FSP
          </Text>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <CheckCircle2 size={20} color="#10B981" />
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>24</Text>
                <Text style={styles.statLabel}>Abgeschlossen</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <TrendingUp size={20} color="#3B82F6" />
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>89%</Text>
                <Text style={styles.statLabel}>Erfolgsrate</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <Zap size={20} color="#F97316" />
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>7 Tage</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Simulation Cards */}
        <View style={styles.cardsContainer}>
          {/* KP Simulation Card - Purple/Pink Gradient */}
          <TouchableOpacity
            onPress={() => router.push('/simulation/kp')}
            activeOpacity={0.9}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCard}
            >
              {/* Background Pattern */}
              <View style={styles.cardBackgroundPattern}>
                <View style={[styles.patternCircle, styles.patternCircle1]} />
                <View style={[styles.patternCircle, styles.patternCircle2]} />
              </View>

              <View style={styles.cardInner}>
                {/* Badge */}
                <View style={styles.cardBadge}>
                  <Target size={16} color="#FFFFFF" />
                  <Text style={styles.cardBadgeText}>Klinische Prüfung</Text>
                </View>

                {/* Title */}
                <Text style={styles.cardTitle}>KP-Simulation</Text>

                {/* Description */}
                <Text style={styles.cardDescription}>
                  Umfassende Fallsimulationen mit diagnostischen Herausforderungen und komplexen Therapieentscheidungen
                </Text>

                {/* Features */}
                <View style={styles.features}>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <CheckCircle2 size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.featureText}>Praxisnahe Fallbeispiele</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <CheckCircle2 size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.featureText}>Detailliertes Feedback</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <CheckCircle2 size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.featureText}>15-25 Minuten pro Session</Text>
                  </View>
                </View>

                {/* Button */}
                <TouchableOpacity style={styles.cardButton}>
                  <Text style={styles.cardButtonText}>Jetzt starten</Text>
                  <ChevronRight size={20} color="#6366F1" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* FSP Simulation Card - Orange/Yellow Gradient */}
          <TouchableOpacity
            onPress={() => router.push('/simulation/fsp')}
            activeOpacity={0.9}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={['#F97316', '#FB923C', '#FBBF24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCard}
            >
              {/* Background Pattern */}
              <View style={styles.cardBackgroundPattern}>
                <View style={[styles.patternCircle, styles.patternCircle3]} />
                <View style={[styles.patternCircle, styles.patternCircle4]} />
              </View>

              <View style={styles.cardInner}>
                {/* Badge */}
                <View style={styles.cardBadge}>
                  <Mic size={16} color="#FFFFFF" />
                  <Text style={styles.cardBadgeText}>Fachsprachprüfung</Text>
                </View>

                {/* Title */}
                <Text style={styles.cardTitle}>FSP-Simulation</Text>

                {/* Description */}
                <Text style={styles.cardDescription}>
                  Interaktive Patientengespräche mit KI-gestütztem Feedback und realitätsnahen Gesprächsszenarien
                </Text>

                {/* Features */}
                <View style={styles.features}>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <CheckCircle2 size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.featureText}>Realistische Dialoge</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <CheckCircle2 size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.featureText}>Sprach-Feedback</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <CheckCircle2 size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.featureText}>20-30 Minuten pro Session</Text>
                  </View>
                </View>

                {/* Button */}
                <TouchableOpacity style={styles.cardButton}>
                  <Text style={styles.cardButtonText}>Jetzt starten</Text>
                  <ChevronRight size={20} color="#F97316" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Why Choose Section */}
        <View style={styles.whyChooseSection}>
          <View style={styles.whyChooseHeader}>
            <Text style={styles.whyChooseTitle}>Warum KP MED Simulationen?</Text>
            <Text style={styles.whyChooseSubtitle}>
              Die effektivste Methode zur Prüfungsvorbereitung mit nachweislichen Ergebnissen
            </Text>
          </View>

          <View style={styles.whyChooseGrid}>
            <View style={styles.whyChooseCard}>
              <View style={[styles.whyChooseIcon, styles.whyChooseIconBlue]}>
                <Brain size={32} color="#3B82F6" />
              </View>
              <Text style={styles.whyChooseCardTitle}>KI-gestützt</Text>
              <Text style={styles.whyChooseCardText}>
                Intelligentes Feedback basierend auf deinen individuellen Antworten
              </Text>
            </View>

            <View style={styles.whyChooseCard}>
              <View style={[styles.whyChooseIcon, styles.whyChooseIconPurple]}>
                <Award size={32} color="#8B5CF6" />
              </View>
              <Text style={styles.whyChooseCardTitle}>Zertifiziert</Text>
              <Text style={styles.whyChooseCardText}>
                Von medizinischen Experten entwickelt und validiert
              </Text>
            </View>

            <View style={styles.whyChooseCard}>
              <View style={[styles.whyChooseIcon, styles.whyChooseIconGreen]}>
                <TrendingUp size={32} color="#10B981" />
              </View>
              <Text style={styles.whyChooseCardTitle}>Messbar</Text>
              <Text style={styles.whyChooseCardText}>
                Verfolge deinen Fortschritt und optimiere deine Vorbereitung
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  // Modern Header Styles
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 1000,
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuButtonGradient: {
    padding: 14,
    borderRadius: 16,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Content Styles
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  animatedBlobsContainer: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    height: 300,
    zIndex: -1,
    opacity: 0.2,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: '#93C5FD',
  },
  blob1: {
    width: 256,
    height: 256,
    top: 0,
    left: '25%',
    backgroundColor: '#93C5FD',
  },
  blob2: {
    width: 256,
    height: 256,
    top: 40,
    right: '25%',
    backgroundColor: '#C4B5FD',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EA580C',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  gradientTitle: {
    fontSize: screenWidth < 600 ? 40 : 48,
    fontFamily: 'Inter-Bold',
    color: '#8B5CF6',
    textAlign: 'center',
    letterSpacing: -1,
  },
  mainTitle: {
    fontSize: screenWidth < 600 ? 40 : 48,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: '90%',
    marginBottom: 32,
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },

  // Simulation Cards
  cardsContainer: {
    gap: 24,
    marginBottom: 40,
  },
  cardWrapper: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  gradientCard: {
    borderRadius: 24,
    padding: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  cardBackgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  patternCircle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
  },
  patternCircle1: {
    width: 256,
    height: 256,
    top: -64,
    right: -64,
  },
  patternCircle2: {
    width: 192,
    height: 192,
    bottom: -64,
    left: -64,
  },
  patternCircle3: {
    width: 256,
    height: 256,
    top: -64,
    left: -64,
  },
  patternCircle4: {
    width: 192,
    height: 192,
    bottom: -64,
    right: -64,
  },
  cardInner: {
    position: 'relative',
    zIndex: 10,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginBottom: 24,
  },
  cardBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  cardDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: 24,
  },
  features: {
    gap: 12,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },

  // Why Choose Section
  whyChooseSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: screenWidth < 600 ? 24 : 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  whyChooseHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  whyChooseTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  whyChooseSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: '90%',
  },
  whyChooseGrid: {
    gap: 32,
  },
  whyChooseCard: {
    alignItems: 'center',
  },
  whyChooseIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  whyChooseIconBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  whyChooseIconPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  whyChooseIconGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  whyChooseCardTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  whyChooseCardText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
