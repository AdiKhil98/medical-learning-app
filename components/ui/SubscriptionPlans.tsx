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
      id: 'free',
      name: 'Kostenlos',
      price: 0,
      yearlyPrice: 0,
      currency: '€',
      period: 'Einmalig',
      simulations: '3',
      badge: '3',
      costPerSimulation: 'Kostenlos für immer',
      icon: Star,
      gradient: ['#6b7280', '#4b5563'],
      features: [
        { text: '3 Medizinische Simulationen (einmalig)', included: true },
        { text: 'Grundlegende Funktionen', included: true },
        { text: 'Standard Bibliothek', included: true },
        { text: 'E-Mail Support', included: false },
        { text: 'Erweiterte Analysen', included: false },
        { text: 'Premium Bibliothek', included: false },
        { text: 'Prioritäts-Support', included: false },
        { text: 'Export Funktionen', included: false },
      ],
    },
    {
      id: 'basic',
      name: 'Basis-Plan',
      price: 50,
      yearlyPrice: 35,
      currency: '€',
      period: 'Monat',
      simulations: '30',
      badge: '30',
      costPerSimulation: 'Nur 1,67€ pro Simulation',
      icon: Star,
      gradient: ['#3b82f6', '#1e40af'],
      features: [
        { text: '30 Medizinische Simulationen pro Monat', included: true },
        { text: '14-Tage kostenlose Testversion', included: true },
        { text: 'Grundlegende Analysen', included: true },
        { text: 'E-Mail Support', included: true },
        { text: 'Mobile App Zugang', included: true },
        { text: 'Standard Bibliothek', included: true },
        { text: 'Prioritäts-Support', included: false },
        { text: 'Erweiterte Analysen', included: false },
      ],
    },
    {
      id: 'professional',
      name: 'Profi-Plan',
      price: 75,
      yearlyPrice: 52,
      currency: '€',
      period: 'Monat',
      simulations: '60',
      badge: '60',
      costPerSimulation: 'Nur 1,25€ pro Simulation',
      recommended: true,
      icon: Crown,
      gradient: ['#3b82f6', '#1e40af'],
      features: [
        { text: '60 Medizinische Simulationen pro Monat', included: true },
        { text: '14-Tage kostenlose Testversion', included: true },
        { text: 'Erweiterte Analysen & Berichte', included: true },
        { text: 'Prioritäts-Support (24h)', included: true },
        { text: 'Mobile & Web App', included: true },
        { text: 'Premium Bibliothek', included: true },
        { text: 'Export Funktionen', included: true },
        { text: 'Personalisierte Lernpfade', included: true },
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
        { text: '14-Tage kostenlose Testversion', included: true },
        { text: 'Vollständige Analytics Suite', included: true },
        { text: 'VIP Support & Account Manager', included: true },
        { text: 'Alle Plattformen', included: true },
        { text: 'Komplette Bibliothek', included: true },
        { text: 'Erweiterte Exports', included: true },
        { text: 'KI-Powered Insights', included: true },
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
      backgroundColor: 'transparent',
    },
    heroSection: {
      paddingHorizontal: 24,
      paddingVertical: 40,
      alignItems: 'center',
    },
    heroTitle: {
      fontSize: isTablet ? 36 : 28,
      fontWeight: '800',
      color: '#15803d',
      textAlign: 'center',
      marginBottom: 12,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#16a34a',
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
      shadowColor: '#16a34a',
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
      backgroundColor: '#16a34a',
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
      backgroundColor: 'rgba(22, 163, 74, 0.1)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: '#16a34a',
    },
    badgeText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#15803d',
    },
    savingsBadge: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
    savingsBadgeText: {
      color: '#ffffff',
    },
    cardsContainer: {
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardsRow: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 16,
      marginBottom: 16,
      justifyContent: 'center',
      alignItems: isTablet ? 'flex-start' : 'center',
    },
    planCard: {
      backgroundColor: '#ffffff',
      borderRadius: 24,
      padding: 24,
      width: isTablet ? (width - 80) / 2 : width - 32,
      maxWidth: isTablet ? 360 : 400,
      shadowColor: '#16a34a',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(22, 163, 74, 0.1)',
      position: 'relative',
    },
    recommendedCard: {
      borderColor: '#16a34a',
      borderWidth: 2,
      transform: isTablet ? [{ scale: 1.02 }] : [{ scale: 1 }],
      shadowOpacity: 0.2,
      shadowRadius: 32,
    },
    planBadge: {
      position: 'absolute',
      top: 24,
      right: 24,
      backgroundColor: '#16a34a',
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
      color: '#15803d',
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
      backgroundColor: '#16a34a',
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
      backgroundColor: '#16a34a',
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#16a34a',
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
      backgroundColor: '#16a34a',
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
    <LinearGradient
      colors={['#f0fdf4', '#dcfce7', '#bbf7d0']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
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
        {/* First Row - Free and Basic */}
        <View style={dynamicStyles.cardsRow}>
          {plans.slice(0, 2).map((plan) => (
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
                  {plan.id === 'free' ? 'Kostenlos' : `${plan.currency}${getPrice(plan)}`}
                  {plan.id !== 'free' && (
                    <Text style={dynamicStyles.planPeriod}>/Monat</Text>
                  )}
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
        
        {/* Second Row - Professional and Unlimited */}
        <View style={dynamicStyles.cardsRow}>
          {plans.slice(2, 4).map((plan) => (
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
                  {plan.id === 'free' ? 'Kostenlos' : `${plan.currency}${getPrice(plan)}`}
                  {plan.id !== 'free' && (
                    <Text style={dynamicStyles.planPeriod}>/Monat</Text>
                  )}
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
      </View>
      
      <View style={dynamicStyles.spacer} />
      </ScrollView>
    </LinearGradient>
  );
}