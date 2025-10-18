import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Mic, Brain, Play, Target, TrendingUp, Clock, Users, Award, Menu as MenuIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';

const { width: screenWidth } = Dimensions.get('window');

export default function SimulationScreen() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Clean white background */}
      <View style={styles.cleanBackground} />

      {/* Modern Header - Same as Homepage */}
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

      {/* Page Title Section */}
      <View style={styles.pageTitleSection}>
        <Text style={styles.pageTitle}>Prüfungs-Simulation</Text>
        <Text style={styles.pageSubtitle}>
          Bereiten Sie sich optimal auf Ihre medizinische Prüfung vor
        </Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Clock size={18} color="#B87E70" />
            <Text style={styles.statNumber}>25 Min</Text>
            <Text style={styles.statLabel}>Durchschnitt</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Users size={18} color="#E2827F" />
            <Text style={styles.statNumber}>120</Text>
            <Text style={styles.statLabel}>Teilnehmer</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Award size={18} color="#B15740" />
            <Text style={styles.statNumber}>91%</Text>
            <Text style={styles.statLabel}>Erfolgsrate</Text>
          </View>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Wählen Sie Ihren Simulationsmodus</Text>
          <Text style={styles.heroDescription}>
            Trainieren Sie gezielt für verschiedene Prüfungsabschnitte mit interaktiven Simulationen
          </Text>
        </View>

        <View style={styles.modernCardsContainer}>
          {/* KP Simulation Card - Now First */}
          <View style={styles.modernCardWrapper}>
            <TouchableOpacity
              onPress={() => router.push('/simulation/kp')}
              activeOpacity={0.8}
              style={styles.modernCard}
            >
              <View style={[styles.cardContainer, styles.knowledgeCard]}>
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={['#B87E70', '#E2827F']}
                    style={styles.modernIconContainer}
                  >
                    <Brain size={24} color="white" />
                  </LinearGradient>
                </View>
                
                <View style={styles.cardContent}>
                  <Text style={styles.modernCardTitle}>KP-Simulation</Text>
                  <Text style={styles.modernCardDescription}>
                    Umfassende Fallsimulationen mit diagnostischen Herausforderungen und Therapieentscheidungen
                  </Text>
                </View>

                <View style={styles.cardFeatures}>
                  <View style={styles.featureItem}>
                    <Target size={14} color="#B87E70" />
                    <Text style={styles.featureText}>Präzise</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Clock size={14} color="#B87E70" />
                    <Text style={styles.featureText}>15-25 Min</Text>
                  </View>
                </View>
                
                <TouchableOpacity style={[styles.modernCardButton, styles.knowledgeButton]}>
                  <Text style={styles.modernButtonText}>Simulation starten</Text>
                  <ChevronRight size={16} color="white" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>

          {/* FSP Simulation Card - Now Second */}
          <View style={styles.modernCardWrapper}>
            <TouchableOpacity
              onPress={() => router.push('/simulation/fsp')}
              activeOpacity={0.8}
              style={styles.modernCard}
            >
              <View style={[styles.cardContainer, styles.practiceCard]}>
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={['#E2827F', '#B15740']}
                    style={styles.modernIconContainer}
                  >
                    <Mic size={24} color="white" />
                  </LinearGradient>
                </View>
                
                <View style={styles.cardContent}>
                  <Text style={styles.modernCardTitle}>FSP-Simulation</Text>
                  <Text style={styles.modernCardDescription}>
                    Interaktive Patientengespräche mit KI-gestütztem Feedback und realitätsnahen Szenarien
                  </Text>
                </View>

                <View style={styles.cardFeatures}>
                  <View style={styles.featureItem}>
                    <Play size={14} color="#E2827F" />
                    <Text style={styles.featureText}>Interaktiv</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Clock size={14} color="#E2827F" />
                    <Text style={styles.featureText}>20-30 Min</Text>
                  </View>
                </View>
                
                <TouchableOpacity style={styles.modernCardButton}>
                  <Text style={styles.modernButtonText}>Simulation starten</Text>
                  <ChevronRight size={16} color="white" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
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
    backgroundColor: '#ffffff',
  },
  cleanBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#FFFFFF',
  },

  // Modern Header Styles (Same as Homepage)
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

  // Page Title Section
  pageTitleSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
  },

  // Stats Section
  statsSection: {
    marginTop: -20,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  statsContainer: {
    backgroundColor: '#F9F6F2',
    borderRadius: 20,
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: 'rgba(181,87,64,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(184, 126, 112, 0.3)',
    marginHorizontal: 16,
  },

  // Content Styles
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 30,
  },
  heroSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  heroDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '90%',
  },

  // Modern Cards
  modernCardsContainer: {
    gap: 20,
  },
  modernCardWrapper: {
    marginBottom: 8,
  },
  modernCard: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 15,
  },
  cardContainer: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',
    backgroundColor: '#F9F6F2',
  },
  knowledgeCard: {
    backgroundColor: '#F9F6F2',
  },
  practiceCard: {
    backgroundColor: '#F9F6F2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modernIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  knowledgeBadge: {
    backgroundColor: '#4338ca',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    marginBottom: 20,
  },
  modernCardTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  modernCardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
    marginBottom: 12,
  },
  modernCardDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    lineHeight: 22,
  },
  cardFeatures: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  modernCardButton: {
    backgroundColor: '#E2827F',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(226, 130, 127, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  knowledgeButton: {
    backgroundColor: '#B87E70',
    shadowColor: 'rgba(184, 126, 112, 0.4)',
  },
  modernButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});