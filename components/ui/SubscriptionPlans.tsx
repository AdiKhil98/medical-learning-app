import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Star, Crown, Infinity, Shield, Calendar, BarChart3 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

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
  yearlyPrice: number;
  currency: string;
  period: string;
  simulations: number | string;
  badge: string;
  features: PlanFeature[];
  recommended?: boolean;
  icon: React.ComponentType<any>;
  gradient: string[];
  costPerSimulation?: string;
}

export default function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const { colors, isDarkMode } = useTheme();
  const [isYearly, setIsYearly] = useState(false);

  const plans: SubscriptionPlan[] = [
    {
      id: 'basic',
      name: 'Basis-Plan',
      price: 50,
      yearlyPrice: 35,
      currency: '€',
      period: 'Monat',
      simulations: '30K',
      badge: '30K',
      costPerSimulation: 'Nur 1,67€ pro Simulation',
      icon: Star,
      gradient: ['#3b82f6', '#1e40af'],
      features: [
        { text: '30 Medizinische Simulationen', included: true },
        { text: 'Grundlegende Analysen', included: true },
        { text: 'E-Mail Support', included: true },
        { text: 'Mobile App Zugang', included: true },
        { text: 'Standard Bibliothek', included: true },
        { text: 'Prioritäts-Support', included: false },
        { text: 'Erweiterte Analysen', included: false },
        { text: 'Team Management', included: false },
      ],
    },
    {
      id: 'professional',
      name: 'Profi-Plan',
      price: 75,
      yearlyPrice: 52,
      currency: '€',
      period: 'Monat',
      simulations: '60K',
      badge: '60K',
      costPerSimulation: 'Nur 1,25€ pro Simulation',
      recommended: true,
      icon: Crown,
      gradient: ['#3b82f6', '#1e40af'],
      features: [
        { text: '60 Medizinische Simulationen', included: true },
        { text: 'Erweiterte Analysen & Berichte', included: true },
        { text: 'Prioritäts-Support (24h)', included: true },
        { text: 'Mobile & Web App', included: true },
        { text: 'Premium Bibliothek', included: true },
        { text: 'Export Funktionen', included: true },
        { text: 'Personalisierte Lernpfade', included: true },
        { text: 'Team Management', included: false },
      ],
    },
    {
      id: 'unlimited',
      name: 'Unlimited-Plan',
      price: 150,
      yearlyPrice: 105,
      currency: '€',
      period: 'Monat',
      simulations: 'Unbegrenzt',
      badge: '∞',
      costPerSimulation: 'Unbegrenzte Simulationen',
      icon: Infinity,
      gradient: ['#3b82f6', '#1e40af'],
      features: [
        { text: 'Unbegrenzte Simulationen', included: true },
        { text: 'Vollständige Analytics Suite', included: true },
        { text: 'VIP Support & Account Manager', included: true },
        { text: 'Alle Plattformen', included: true },
        { text: 'Komplette Bibliothek', included: true },
        { text: 'Erweiterte Exports', included: true },
        { text: 'KI-Powered Insights', included: true },
        { text: 'Team Management Pro', included: true },
      ],
    },
  ];

  const getPrice = (plan: SubscriptionPlan) => {
    return isYearly ? plan.yearlyPrice : plan.price;
  };

  const getSavings = () => {
    const yearlySavings = Math.round(((plans[0].price * 12 - plans[0].yearlyPrice * 12) / (plans[0].price * 12)) * 100);
    return yearlySavings;
  };

  const handleSelectPlan = (planId: string) => {
    onSelectPlan?.(planId);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
    },
    heroSection: {
      paddingHorizontal: 24,
      paddingVertical: 40,
      alignItems: 'center',
    },
    heroTitle: {
      fontSize: isTablet ? 36 : 28,
      fontWeight: '800',
      color: '#1e40af',
      textAlign: 'center',
      marginBottom: 12,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#3b82f6',
      textAlign: 'center',
      marginBottom: 32,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 16,
      padding: 6,
      marginBottom: 24,
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    toggleOption: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      minWidth: 100,
    },
    toggleOptionActive: {
      backgroundColor: '#3b82f6',
    },
    toggleText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      color: '#6b7280',
    },
    toggleTextActive: {
      color: '#ffffff',
    },
    badgesContainer: {
      flexDirection: isTablet ? 'row' : 'column',
      alignItems: 'center',
      marginBottom: 32,
      gap: 12,
    },
    badge: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: '#3b82f6',
    },
    badgeText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1e40af',
    },
    savingsBadge: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
    savingsBadgeText: {
      color: '#ffffff',
    },
    cardsContainer: {
      flexDirection: isTablet ? 'row' : 'column',
      paddingHorizontal: isTablet ? 24 : 16,
      gap: isTablet ? 24 : 16,
      alignItems: isTablet ? 'flex-start' : 'center',
      justifyContent: 'center',
    },
    planCard: {
      backgroundColor: '#ffffff',
      borderRadius: 24,
      padding: 32,
      width: isTablet ? (width - 120) / 3 : width - 32,
      maxWidth: 400,
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.1)',
      position: 'relative',
    },
    recommendedCard: {
      borderColor: '#3b82f6',
      borderWidth: 2,
      transform: isTablet ? [{ scale: 1.05 }] : [{ scale: 1 }],
      shadowOpacity: 0.2,
      shadowRadius: 32,
    },
    planBadge: {
      position: 'absolute',
      top: 24,
      right: 24,
      backgroundColor: '#3b82f6',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      minWidth: 50,
      alignItems: 'center',
    },
    planBadgeText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    planHeader: {
      alignItems: 'center',
      marginBottom: 32,
    },
    planName: {
      fontSize: 24,
      fontWeight: '700',
      color: '#1f2937',
      marginBottom: 16,
      textAlign: 'center',
    },
    priceContainer: {
      alignItems: 'center',
      marginBottom: 8,
    },
    planPrice: {
      fontSize: 48,
      fontWeight: '800',
      color: '#1e40af',
      lineHeight: 56,
    },
    planPeriod: {
      fontSize: 16,
      color: '#6b7280',
      marginLeft: 4,
    },
    costPerSimulation: {
      fontSize: 14,
      color: '#10b981',
      fontWeight: '600',
      marginTop: 8,
    },
    featuresTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: 20,
      textAlign: 'center',
    },
    featuresList: {
      marginBottom: 32,
      gap: 12,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#3b82f6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    checkIconDisabled: {
      backgroundColor: '#e5e7eb',
    },
    featureText: {
      fontSize: 15,
      lineHeight: 20,
      flex: 1,
    },
    featureIncluded: {
      color: '#1f2937',
      fontWeight: '500',
    },
    featureNotIncluded: {
      color: '#9ca3af',
    },
    selectButton: {
      backgroundColor: '#3b82f6',
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    selectButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    recommendedBadge: {
      position: 'absolute',
      top: -12,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    recommendedBadgeInner: {
      backgroundColor: '#3b82f6',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
    },
    recommendedText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    spacer: {
      height: 60,
    },
  });

  return (
    <ScrollView style={dynamicStyles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={dynamicStyles.heroSection}>
        <Text style={dynamicStyles.heroTitle}>MEISTERN SIE IHRE{"\n"}KENNTNISPRÜFUNG</Text>
        <Text style={dynamicStyles.heroSubtitle}>WIR HABEN DEN PERFEKTEN PLAN FÜR SIE</Text>
        
        {/* Toggle Switch */}
        <View style={dynamicStyles.toggleContainer}>
          <TouchableOpacity
            style={[dynamicStyles.toggleOption, !isYearly && dynamicStyles.toggleOptionActive]}
            onPress={() => setIsYearly(false)}
          >
            <Text style={[dynamicStyles.toggleText, !isYearly && dynamicStyles.toggleTextActive]}>
              MONATLICH
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.toggleOption, isYearly && dynamicStyles.toggleOptionActive]}
            onPress={() => setIsYearly(true)}
          >
            <Text style={[dynamicStyles.toggleText, isYearly && dynamicStyles.toggleTextActive]}>
              JÄHRLICH
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Feature Badges */}
        <View style={dynamicStyles.badgesContainer}>
          <View style={dynamicStyles.badge}>
            <Text style={dynamicStyles.badgeText}>14-TAGE KOSTENLOSE TESTVERSION</Text>
          </View>
          <View style={dynamicStyles.badge}>
            <Text style={dynamicStyles.badgeText}>JEDERZEIT KÜNDBAR</Text>
          </View>
          {isYearly && (
            <View style={[dynamicStyles.badge, dynamicStyles.savingsBadge]}>
              <Text style={[dynamicStyles.badgeText, dynamicStyles.savingsBadgeText]}>
                SPAREN SIE BIS ZU {getSavings()}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Pricing Cards */}
      <View style={dynamicStyles.cardsContainer}>
        {plans.map((plan) => (
          <View key={plan.id} style={[dynamicStyles.planCard, plan.recommended && dynamicStyles.recommendedCard]}>
            {plan.recommended && (
              <View style={dynamicStyles.recommendedBadge}>
                <View style={dynamicStyles.recommendedBadgeInner}>
                  <Text style={dynamicStyles.recommendedText}>BELIEBTESTE WAHL</Text>
                </View>
              </View>
            )}
            
            {/* Badge */}
            <View style={dynamicStyles.planBadge}>
              <Text style={dynamicStyles.planBadgeText}>{plan.badge}</Text>
            </View>
            
            <View style={dynamicStyles.planHeader}>
              <Text style={dynamicStyles.planName}>{plan.name}</Text>
              <View style={dynamicStyles.priceContainer}>
                <Text style={dynamicStyles.planPrice}>
                  {plan.currency}{getPrice(plan)}
                  <Text style={dynamicStyles.planPeriod}>/Monat</Text>
                </Text>
              </View>
              {plan.costPerSimulation && (
                <Text style={dynamicStyles.costPerSimulation}>{plan.costPerSimulation}</Text>
              )}
            </View>

            <Text style={dynamicStyles.featuresTitle}>Was ist enthalten</Text>
            
            <View style={dynamicStyles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={dynamicStyles.featureItem}>
                  <View style={[dynamicStyles.checkIcon, !feature.included && dynamicStyles.checkIconDisabled]}>
                    {feature.included && <Check size={12} color="#ffffff" />}
                  </View>
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
              <Text style={dynamicStyles.selectButtonText}>Abonnieren</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      
      <View style={dynamicStyles.spacer} />
    </ScrollView>
  );
}