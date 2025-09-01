import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Mic, Brain } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

export default function SimulationScreen() {
  const router = useRouter();


  return (
    <SafeAreaView style={styles.container}>
      {/* Light gradient background matching the app theme */}
      <LinearGradient
        colors={[MEDICAL_COLORS.lightGradient[0], MEDICAL_COLORS.lightGradient[1], '#ffffff']}
        style={styles.gradientBackground}
      />
      
      {/* Header with primary gradient */}
      <LinearGradient
        colors={[MEDICAL_COLORS.primaryGradient[0], MEDICAL_COLORS.primaryGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>Simulation</Text>
        <Text style={styles.subtitle}>
          Wählen Sie eine Simulationsart für Ihre Prüfungsvorbereitung
        </Text>
      </LinearGradient>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.cardsContainer}>
          {/* FSP Simulation Card */}
          <TouchableOpacity
            onPress={() => router.push('/simulation/fsp')}
            activeOpacity={0.7}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={[MEDICAL_COLORS.white, MEDICAL_COLORS.cardGradient[1]]}
              style={styles.card}
            >
              <LinearGradient
                colors={['#EF444415', '#EF444408']}
                style={styles.iconContainer}
              >
                <Mic size={28} color="#EF4444" />
              </LinearGradient>
              
              <Text style={styles.cardTitle}>FSP-Simulation</Text>
              <Text style={styles.cardSubtitle}>(Sprache)</Text>
              <Text style={styles.cardDescription}>
                Interaktive Patientengespräche und Kommunikationstraining
              </Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.cardAction}>Starten</Text>
                <ChevronRight size={18} color={MEDICAL_COLORS.primary} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* KP Simulation Card */}
          <TouchableOpacity
            onPress={() => router.push('/simulation/kp')}
            activeOpacity={0.7}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={[MEDICAL_COLORS.white, MEDICAL_COLORS.cardGradient[1]]}
              style={styles.card}
            >
              <LinearGradient
                colors={[`${MEDICAL_COLORS.primary}15`, `${MEDICAL_COLORS.primary}08`]}
                style={styles.iconContainer}
              >
                <Brain size={28} color={MEDICAL_COLORS.primary} />
              </LinearGradient>
              
              <Text style={styles.cardTitle}>KP-Simulation</Text>
              <Text style={styles.cardSubtitle}>(Wissen)</Text>
              <Text style={styles.cardDescription}>
                Medizinische Fallsimulationen und Wissenstraining
              </Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.cardAction}>Starten</Text>
                <ChevronRight size={18} color={MEDICAL_COLORS.primary} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MEDICAL_COLORS.white,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: MEDICAL_COLORS.white,
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: MEDICAL_COLORS.white,
    opacity: 0.9,
    lineHeight: 22,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 30,
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    minHeight: 200,
    shadowColor: MEDICAL_COLORS.shadowMedium,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.lightGray,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: MEDICAL_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  cardSubtitle: {
    fontSize: 14,
    color: MEDICAL_COLORS.gray,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Inter-Medium',
  },
  cardDescription: {
    fontSize: 14,
    color: MEDICAL_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: 'Inter-Regular',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  cardAction: {
    fontSize: 16,
    color: MEDICAL_COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
    fontFamily: 'Inter-SemiBold',
  },
});