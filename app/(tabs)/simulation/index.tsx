import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Mic, Brain, Play, Target, TrendingUp, Clock, Users, Award } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

const { width: screenWidth } = Dimensions.get('window');

export default function SimulationScreen() {
  const router = useRouter();


  return (
    <SafeAreaView style={styles.container}>
      {/* Modern gradient background */}
      <LinearGradient
        colors={['#f0f4ff', '#e6f0ff', '#ffffff']}
        style={styles.gradientBackground}
      />
      
      {/* Enhanced header with modern styling */}
      <LinearGradient
        colors={['#4338ca', '#3730a3', '#312e81']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.modernHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.modernTitle}>Prüfungs-Simulation</Text>
            <Text style={styles.modernSubtitle}>
              Bereiten Sie sich optimal auf Ihre medizinische Prüfung vor
            </Text>
          </View>
          
          {/* Floating header elements */}
          <View style={styles.headerFloatingElements}>
            <View style={[styles.floatingElement, styles.element1]}>
              <Target size={20} color="#4338ca" />
            </View>
            <View style={[styles.floatingElement, styles.element2]}>
              <TrendingUp size={18} color="#6366f1" />
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Clock size={18} color="#4338ca" />
            <Text style={styles.statNumber}>25 Min</Text>
            <Text style={styles.statLabel}>Durchschnitt</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Users size={18} color="#059669" />
            <Text style={styles.statNumber}>1.2K+</Text>
            <Text style={styles.statLabel}>Teilnehmer</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Award size={18} color="#dc2626" />
            <Text style={styles.statNumber}>85%</Text>
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
              <LinearGradient
                colors={['#ffffff', '#f0f4ff']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={['#4338ca', '#3730a3']}
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
                    <Target size={14} color="#4338ca" />
                    <Text style={styles.featureText}>Präzise</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Clock size={14} color="#4338ca" />
                    <Text style={styles.featureText}>15-25 Min</Text>
                  </View>
                </View>
                
                <TouchableOpacity style={[styles.modernCardButton, styles.knowledgeButton]}>
                  <Text style={styles.modernButtonText}>Simulation starten</Text>
                  <ChevronRight size={16} color="white" />
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* FSP Simulation Card - Now Second */}
          <View style={styles.modernCardWrapper}>
            <TouchableOpacity
              onPress={() => router.push('/simulation/fsp')}
              activeOpacity={0.8}
              style={styles.modernCard}
            >
              <LinearGradient
                colors={['#ffffff', '#fef7f7']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
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
                    <Play size={14} color="#ef4444" />
                    <Text style={styles.featureText}>Interaktiv</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Clock size={14} color="#ef4444" />
                    <Text style={styles.featureText}>20-30 Min</Text>
                  </View>
                </View>
                
                <TouchableOpacity style={styles.modernCardButton}>
                  <Text style={styles.modernButtonText}>Simulation starten</Text>
                  <ChevronRight size={16} color="white" />
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  
  // Modern Header Styles
  modernHeader: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    paddingTop: 60,
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  modernTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modernSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
    maxWidth: '85%',
  },
  headerFloatingElements: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  floatingElement: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  element1: {
    top: 0,
    right: 0,
    transform: [{ rotate: '15deg' }],
  },
  element2: {
    bottom: 0,
    left: 0,
    transform: [{ rotate: '-15deg' }],
  },

  // Stats Section
  statsSection: {
    marginTop: -20,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(67, 56, 202, 0.1)',
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
    backgroundColor: '#e5e7eb',
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
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  heroDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
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
  cardGradient: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
    backgroundColor: '#ef4444',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  knowledgeButton: {
    backgroundColor: '#4338ca',
    shadowColor: '#4338ca',
  },
  modernButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});