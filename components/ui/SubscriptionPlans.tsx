import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Star, Crown, Users, Shield, Calendar, BarChart3 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SubscriptionPlansProps {
  onSelectPlan?: (planId: string) => void;
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  simulations: number;
  bonusSimulations: number;
  totalSimulations: number;
  features: PlanFeature[];
  recommended?: boolean;
  icon: React.ComponentType<any>;
  gradient: string[];
  idealFor: string;
}

export default function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const { colors, isDarkMode } = useTheme();

  const plans: SubscriptionPlan[] = [
    {
      id: 'basic',
      name: 'Basis-Tarif',
      price: 50,
      currency: '€',
      period: 'Monat',
      simulations: 30,
      bonusSimulations: 2,
      totalSimulations: 32,
      icon: Star,
      gradient: ['#3B82F6', '#1E40AF'],
      idealFor: 'Einzelne Mediziner, Medizinstudenten oder kleine Praxen',
      features: [
        { text: '30 medizinische Simulationen pro Monat', included: true },
        { text: '2 Bonus-Simulationen inklusive', included: true },
        { text: '1 kostenlose Testsimulation', included: true },
        { text: 'Zugang zur Standard-Simulationsbibliothek', included: true },
        { text: 'Grundlegende Analysen und Fortschrittserfassung', included: true },
        { text: 'E-Mail-Support (48-Stunden-Reaktionszeit)', included: true },
        { text: 'Erweiterte Simulationsbibliothek', included: false },
        { text: 'Prioritäts-Support', included: false },
        { text: 'Erweiterte Analysen', included: false },
      ],
    },
    {
      id: 'professional',
      name: 'Profi-Tarif',
      price: 75,
      currency: '€',
      period: 'Monat',
      simulations: 60,
      bonusSimulations: 3,
      totalSimulations: 63,
      recommended: true,
      icon: Crown,
      gradient: ['#10B981', '#047857'],
      idealFor: 'Aktive Mediziner, Abteilungsleiter oder mittelgroße Einrichtungen',
      features: [
        { text: '60 medizinische Simulationen pro Monat', included: true },
        { text: '3 Bonus-Simulationen inklusive', included: true },
        { text: '1 kostenlose Testsimulation', included: true },
        { text: 'Erweiterte Simulationsbibliothek mit Premium-Szenarien', included: true },
        { text: 'Erweiterte Analysen und detaillierte Berichte', included: true },
        { text: 'Prioritäts-E-Mail-Support (24-Stunden-Reaktionszeit)', included: true },
        { text: 'Fortschrittserfassung mit Leistungseinblicken', included: true },
        { text: 'Export-Funktionen für Berichte', included: true },
        { text: 'Mehrbenutzerverwaltung', included: false },
      ],
    },
    {
      id: 'enterprise',
      name: 'Unternehmens-Tarif',
      price: 100,
      currency: '€',
      period: 'Monat',
      simulations: 90,
      bonusSimulations: 5,
      totalSimulations: 95,
      icon: Users,
      gradient: ['#8B5CF6', '#6D28D9'],
      idealFor: 'Große medizinische Einrichtungen, Krankenhäuser, Medizinische Fakultäten oder Ausbildungszentren',
      features: [
        { text: '90 medizinische Simulationen pro Monat', included: true },
        { text: '5 Bonus-Simulationen inklusive', included: true },
        { text: '1 kostenlose Testsimulation', included: true },
        { text: 'Vollständiger Zugang zur Simulationsbibliothek', included: true },
        { text: 'Premium-Szenarien und Fallstudien', included: true },
        { text: 'Umfassendes Analyse-Dashboard', included: true },
        { text: 'Prioritäts-Support mit dediziertem Account Manager', included: true },
        { text: 'Individuelle Berichte und Datenexport', included: true },
        { text: 'Mehrbenutzerverwaltung', included: true },
        { text: 'Erweiterte Fortschrittserfassung mit Team-Einblicken', included: true },
      ],
    },
  ];

  const keyBenefits = [
    {
      icon: Shield,
      title: 'Risikofreier Test',
      description: 'Jeder Tarif beinhaltet 1 komplett kostenlose Simulation ohne Zahlungsverpflichtung und vollständigen Zugang zu allen Features.',
      color: '#10B981',
    },
    {
      icon: Calendar,
      title: 'Flexible Abrechnung',
      description: 'Monatliche Abrechnungszyklen mit der Möglichkeit, jederzeit zu kündigen, Tarife zu upgraden oder downgraden ohne Strafgebühren.',
      color: '#3B82F6',
    },
    {
      icon: BarChart3,
      title: 'Simulations-Kreditsystem',
      description: 'Monatliche Kredite setzen sich am Abrechnungsdatum zurück. Bonus-Simulationen sind automatisch in Ihrer monatlichen Zuteilung enthalten.',
      color: '#F59E0B',
    },
    {
      icon: Shield,
      title: 'Sicherheit & Compliance',
      description: 'HIPAA-konforme Datenverarbeitung mit Ende-zu-Ende-Verschlüsselung und sicherer Cloud-Speicherung für alle Simulationen.',
      color: '#EF4444',
    },
  ];

  const handleSelectPlan = (planId: string) => {
    onSelectPlan?.(planId);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 24,
      paddingTop: 48,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 32,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    planCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      margin: 16,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    recommendedCard: {
      borderColor: '#10B981',
      borderWidth: 2,
    },
    planHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    planIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    planName: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 4,
    },
    planPrice: {
      fontSize: 36,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 8,
    },
    planPeriod: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    simulationInfo: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    simulationText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.text,
      textAlign: 'center',
    },
    totalSimulations: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.primary,
      textAlign: 'center',
      marginTop: 4,
    },
    idealFor: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 20,
    },
    featuresList: {
      marginBottom: 24,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    featureText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      marginLeft: 12,
      flex: 1,
      lineHeight: 20,
    },
    featureIncluded: {
      color: colors.text,
    },
    featureNotIncluded: {
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    selectButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: '#FFFFFF',
    },
    recommendedBadge: {
      position: 'absolute',
      top: -8,
      right: 16,
      backgroundColor: '#10B981',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    recommendedText: {
      fontSize: 12,
      fontFamily: 'Inter-Bold',
      color: '#FFFFFF',
    },
    benefitsSection: {
      margin: 16,
      marginTop: 32,
    },
    benefitsTitle: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    benefitCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.2 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    benefitHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    benefitIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    benefitTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    benefitDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });

  return (
    <ScrollView style={dynamicStyles.container} showsVerticalScrollIndicator={false}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>KP Med</Text>
        <Text style={dynamicStyles.headerSubtitle}>
          Umfassende Abo-Stufen, die für verschiedene Nutzungsanforderungen entwickelt wurden - von Einzelpraktikern bis hin zu medizinischen Fachkräften und Institutionen mit hohem Volumen.
        </Text>
      </View>

      {plans.map((plan) => (
        <View key={plan.id} style={[dynamicStyles.planCard, plan.recommended && dynamicStyles.recommendedCard]}>
          {plan.recommended && (
            <View style={dynamicStyles.recommendedBadge}>
              <Text style={dynamicStyles.recommendedText}>EMPFOHLEN</Text>
            </View>
          )}
          
          <View style={dynamicStyles.planHeader}>
            <LinearGradient
              colors={plan.gradient}
              style={dynamicStyles.planIcon}
            >
              <plan.icon size={28} color="#FFFFFF" />
            </LinearGradient>
            <Text style={dynamicStyles.planName}>{plan.name}</Text>
            <Text style={dynamicStyles.planPrice}>
              {plan.currency}{plan.price}
            </Text>
            <Text style={dynamicStyles.planPeriod}>pro {plan.period}</Text>
          </View>

          <View style={dynamicStyles.simulationInfo}>
            <Text style={dynamicStyles.simulationText}>
              {plan.simulations} Simulationen + {plan.bonusSimulations} Bonus
            </Text>
            <Text style={dynamicStyles.totalSimulations}>
              Gesamt: {plan.totalSimulations} Simulationen monatlich
            </Text>
          </View>

          <Text style={dynamicStyles.idealFor}>
            Ideal für: {plan.idealFor}
          </Text>

          <View style={dynamicStyles.featuresList}>
            {plan.features.map((feature, index) => (
              <View key={index} style={dynamicStyles.featureItem}>
                <CheckCircle 
                  size={16} 
                  color={feature.included ? '#10B981' : colors.textSecondary} 
                />
                <Text style={[
                  dynamicStyles.featureText,
                  feature.included ? dynamicStyles.featureIncluded : dynamicStyles.featureNotIncluded
                ]}>
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={dynamicStyles.selectButton}
            onPress={() => handleSelectPlan(plan.id)}
          >
            <LinearGradient
              colors={plan.gradient}
              style={[dynamicStyles.selectButton, { margin: 0 }]}
            >
              <Text style={dynamicStyles.selectButtonText}>
                {plan.name} wählen
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ))}

      <View style={dynamicStyles.benefitsSection}>
        <Text style={dynamicStyles.benefitsTitle}>Hauptvorteile aller Tarife</Text>
        
        {keyBenefits.map((benefit, index) => (
          <View key={index} style={dynamicStyles.benefitCard}>
            <View style={dynamicStyles.benefitHeader}>
              <View style={[dynamicStyles.benefitIcon, { backgroundColor: benefit.color + '20' }]}>
                <benefit.icon size={20} color={benefit.color} />
              </View>
              <Text style={dynamicStyles.benefitTitle}>{benefit.title}</Text>
            </View>
            <Text style={dynamicStyles.benefitDescription}>{benefit.description}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}