import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Search, BookOpen, Activity, Heart, Stethoscope, Scissors, AlertTriangle, Baby, Brain, FlaskRound, Settings as Lungs, Pill, Plane as Ambulance, Scan, Circle, Syringe, Zap, Soup, Shield, Users, Eye, Bone, Smile, Thermometer, Zap as Lightning, CircuitBoard, Microscope, FileText, Italic as Hospital, Cross, Droplets, Mic } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '@/components/ui/Card';

export default function SimulationScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();

  const gradientColors = isDarkMode 
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#e0f2fe', '#f0f9ff', '#ffffff'];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 24,
    },
    card: {
      marginBottom: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    textContainer: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    cardDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={dynamicStyles.title}>Simulation</Text>
        <Text style={dynamicStyles.subtitle}>
          Wählen Sie eine Simulationsart für Ihre Prüfungsvorbereitung
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/simulation/fsp')}
          activeOpacity={0.7}
        >
          <Card style={dynamicStyles.card}>
            <View style={dynamicStyles.cardContent}>
              <View style={[
                dynamicStyles.iconContainer,
                { backgroundColor: '#EF444420' }
              ]}>
                <Mic size={24} color="#EF4444" />
              </View>
              <View style={dynamicStyles.textContainer}>
                <Text style={dynamicStyles.cardTitle}>FSP-Simulation (Sprache)</Text>
                <Text style={dynamicStyles.cardDescription}>
                  Interaktive Patientengespräche und Kommunikationstraining
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/simulation/kp')}
          activeOpacity={0.7}
        >
          <Card style={dynamicStyles.card}>
            <View style={dynamicStyles.cardContent}>
              <View style={[
                dynamicStyles.iconContainer,
                { backgroundColor: '#0077B620' }
              ]}>
                <Brain size={24} color="#0077B6" />
              </View>
              <View style={dynamicStyles.textContainer}>
                <Text style={dynamicStyles.cardTitle}>KP-Simulation (Wissen)</Text>
                <Text style={dynamicStyles.cardDescription}>
                  Medizinische Fallsimulationen und Wissenstraining
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          </Card>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  content: {
    padding: 16,
  },
});