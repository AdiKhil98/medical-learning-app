import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Star, Crown, Infinity, Shield, Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isMobile = width < 600;

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
  keyFeatures: string[];  // Top 3-4 key differentiators
  allFeatures: PlanFeature[];  // Full feature list for comparison
  recommended?: boolean;
  icon: React.ComponentType<any>;
  gradient: string[];
  savings?: string;
  ctaText: string;
}

export default function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const { colors, isDarkMode } = useTheme();
  const [isYearly, setIsYearly] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

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
      ctaText: 'Kostenlos starten',
      icon: Star,
      gradient: ['#9ca3af', '#6b7280'],
      keyFeatures: [
        '3 Medizinische Simulationen',
        'Grundlegende Funktionen',
        'Standard Bibliothek',
      ],
      allFeatures: [
        { text: '3 Medizinische Simulationen (einmalig)', included: true },
        { text: 'Grundlegende Funktionen', included: true },
        { text: 'Standard Bibliothek', included: true },
        { text: 'E-Mail Support', included: false },
        { text: 'Erweiterte Analysen', included: false },
        { text: 'Premium Bibliothek', included: false },
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
      recommended: true,
      ctaText: 'Jetzt starten',
      savings: 'Sparen Sie €180 jährlich',
      icon: Crown,
      gradient: ['#B15740', '#A04A35'],
      keyFeatures: [
        '30 Simulationen pro Monat',
        '14-Tage kostenlose Testversion',
        'E-Mail Support',
        'Mobile App Zugang',
      ],
      allFeatures: [
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
      id: 'unlimited',
      name: 'Unlimited',
      price: 150,
      yearlyPrice: 105,
      currency: '€',
      period: 'Monat',
      simulations: 'Unbegrenzt',
      badge: '∞',
      ctaText: 'Jetzt upgraden',
      savings: 'Sparen Sie €540 jährlich',
      icon: Infinity,
      gradient: ['#7C3AED', '#5B21B6'],
      keyFeatures: [
        'Unbegrenzte Simulationen',
        'VIP Support & Account Manager',
        'KI-Powered Insights',
        'Alle Premium Features',
      ],
      allFeatures: [
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

  const getYearlySavingsPercent = () => {
    // Calculate based on Basis plan
    const monthlyTotal = plans[1].price * 12;
    const yearlyTotal = plans[1].yearlyPrice * 12;
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
  };

  const handleSelectPlan = (planId: string) => {
    onSelectPlan?.(planId);
  };

  const toggleExpandPlan = (planId: string) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    heroSection: {
      paddingHorizontal: 24,
      paddingVertical: 32,
      alignItems: 'center',
      backgroundColor: '#F9F6F2',
    },
    heroTitle: {
      fontSize: isMobile ? 24 : isTablet ? 36 : 32,
      fontWeight: '800',
      color: '#1f2937',
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '500',
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 24,
    },
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      shadowColor: 'rgba(0,0,0,0.08)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 3,
    },
    toggleOption: {
      paddingHorizontal: isMobile ? 16 : 24,
      paddingVertical: 10,
      borderRadius: 8,
      minWidth: isMobile ? 80 : 110,
    },
    toggleOptionActive: {
      backgroundColor: '#B15740',
    },
    toggleText: {
      fontSize: isMobile ? 13 : 15,
      fontWeight: '600',
      textAlign: 'center',
      color: '#6b7280',
    },
    toggleTextActive: {
      color: '#ffffff',
    },
    savingsBadge: {
      backgroundColor: '#10B981',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginTop: 8,
    },
    savingsBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    trustSignals: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 12,
      marginTop: 16,
      alignItems: 'center',
    },
    trustBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    trustText: {
      fontSize: 13,
      color: '#6B7280',
      fontWeight: '500',
    },
    cardsContainer: {
      paddingHorizontal: 16,
      paddingVertical: 32,
      alignItems: 'center',
    },
    cardsRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 20 : 16,
      justifyContent: 'center',
      alignItems: 'stretch',
      width: '100%',
      maxWidth: 1200,
    },
    planCard: {
      backgroundColor: '#F9F6F2',
      borderRadius: 20,
      padding: 24,
      flex: isMobile ? 0 : 1,
      maxWidth: isMobile ? 380 : 360,
      width: '100%',
      shadowColor: 'rgba(0,0,0,0.08)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 2,
      borderColor: 'transparent',
      position: 'relative',
    },
    recommendedCard: {
      borderColor: '#B15740',
      borderWidth: 3,
      backgroundColor: '#FFFFFF',
      transform: isMobile ? [] : [{ scale: 1.05 }],
      shadowColor: 'rgba(177, 87, 64, 0.2)',
      shadowRadius: 20,
      elevation: 10,
    },
    recommendedBadge: {
      position: 'absolute',
      top: -14,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    recommendedBadgeInner: {
      backgroundColor: '#B15740',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      shadowColor: 'rgba(177, 87, 64, 0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 5,
    },
    recommendedText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: 1,
    },
    planBadge: {
      position: 'absolute',
      top: 20,
      right: 20,
      backgroundColor: '#B87E70',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      minWidth: 44,
      alignItems: 'center',
    },
    planBadgeText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#ffffff',
    },
    planHeader: {
      alignItems: 'center',
      marginBottom: 24,
      marginTop: 8,
    },
    planName: {
      fontSize: 22,
      fontWeight: '700',
      color: '#1f2937',
      marginBottom: 16,
      textAlign: 'center',
    },
    priceContainer: {
      alignItems: 'center',
      marginBottom: 8,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    planPrice: {
      fontSize: isMobile ? 52 : 56,
      fontWeight: '900',
      color: '#B15740',
      lineHeight: isMobile ? 56 : 60,
    },
    planPeriod: {
      fontSize: 16,
      color: '#9ca3af',
      fontWeight: '500',
      marginLeft: 4,
    },
    savings: {
      fontSize: 14,
      color: '#10B981',
      fontWeight: '700',
      marginTop: 8,
    },
    keyFeaturesTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: 12,
    },
    keyFeaturesList: {
      marginBottom: 20,
      gap: 10,
    },
    keyFeatureItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#B15740',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    keyFeatureText: {
      fontSize: 14,
      color: '#374151',
      fontWeight: '500',
      flex: 1,
    },
    expandButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      marginBottom: 16,
    },
    expandButtonText: {
      fontSize: 13,
      color: '#B15740',
      fontWeight: '600',
      marginRight: 4,
    },
    expandedFeatures: {
      marginBottom: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    featureText: {
      fontSize: 13,
      flex: 1,
    },
    featureIncluded: {
      color: '#4b5563',
    },
    featureNotIncluded: {
      color: '#d1d5db',
    },
    checkIconDisabled: {
      backgroundColor: '#e5e7eb',
    },
    selectButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(177, 87, 64, 0.3)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: 12,
    },
    selectButtonGradient: {
      width: '100%',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    selectButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 0.3,
    },
    trustSignalText: {
      fontSize: 12,
      color: '#6b7280',
      textAlign: 'center',
      fontWeight: '500',
    },
    spacer: {
      height: 40,
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView style={dynamicStyles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={dynamicStyles.heroSection}>
          <Text style={dynamicStyles.heroTitle}>Der richtige Plan für Ihren Erfolg</Text>
          <Text style={dynamicStyles.heroSubtitle}>Wählen Sie den Plan, der am besten zu Ihnen passt</Text>

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

          {isYearly && (
            <View style={dynamicStyles.savingsBadge}>
              <Text style={dynamicStyles.savingsBadgeText}>
                ✨ SPAREN SIE BIS ZU {getYearlySavingsPercent()}%
              </Text>
            </View>
          )}

          {/* Trust Signals */}
          <View style={dynamicStyles.trustSignals}>
            <View style={dynamicStyles.trustBadge}>
              <Shield size={16} color="#10B981" />
              <Text style={dynamicStyles.trustText}>14-Tage kostenlose Testversion</Text>
            </View>
            <View style={dynamicStyles.trustBadge}>
              <Check size={16} color="#10B981" />
              <Text style={dynamicStyles.trustText}>Jederzeit kündbar</Text>
            </View>
          </View>
        </View>

        {/* Pricing Cards */}
        <View style={dynamicStyles.cardsContainer}>
          <View style={dynamicStyles.cardsRow}>
            {plans.map((plan) => (
              <View key={plan.id} style={[
                dynamicStyles.planCard,
                plan.recommended && dynamicStyles.recommendedCard
              ]}>
                {plan.recommended && (
                  <View style={dynamicStyles.recommendedBadge}>
                    <View style={dynamicStyles.recommendedBadgeInner}>
                      <Text style={dynamicStyles.recommendedText}>EMPFOHLEN</Text>
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
                    <View style={dynamicStyles.priceRow}>
                      <Text style={dynamicStyles.planPrice}>
                        {plan.id === 'free' ? 'Frei' : `${plan.currency}${getPrice(plan)}`}
                      </Text>
                      {plan.id !== 'free' && (
                        <Text style={dynamicStyles.planPeriod}>/Monat</Text>
                      )}
                    </View>
                  </View>
                  {isYearly && plan.savings && (
                    <Text style={dynamicStyles.savings}>{plan.savings}</Text>
                  )}
                </View>

                <Text style={dynamicStyles.keyFeaturesTitle}>Wichtigste Vorteile</Text>

                <View style={dynamicStyles.keyFeaturesList}>
                  {plan.keyFeatures.map((feature, index) => (
                    <View key={index} style={dynamicStyles.keyFeatureItem}>
                      <View style={dynamicStyles.checkIcon}>
                        <Check size={12} color="#ffffff" strokeWidth={3} />
                      </View>
                      <Text style={dynamicStyles.keyFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Expand Button */}
                <TouchableOpacity
                  style={dynamicStyles.expandButton}
                  onPress={() => toggleExpandPlan(plan.id)}
                >
                  <Text style={dynamicStyles.expandButtonText}>
                    {expandedPlan === plan.id ? 'Weniger anzeigen' : 'Alle Funktionen anzeigen'}
                  </Text>
                  {expandedPlan === plan.id ? (
                    <ChevronUp size={16} color="#B15740" />
                  ) : (
                    <ChevronDown size={16} color="#B15740" />
                  )}
                </TouchableOpacity>

                {/* Expanded Features */}
                {expandedPlan === plan.id && (
                  <View style={dynamicStyles.expandedFeatures}>
                    {plan.allFeatures.map((feature, index) => (
                      <View key={index} style={dynamicStyles.featureItem}>
                        <View style={[
                          dynamicStyles.checkIcon,
                          !feature.included && dynamicStyles.checkIconDisabled
                        ]}>
                          {feature.included && <Check size={10} color="#ffffff" />}
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
                )}

                <TouchableOpacity
                  onPress={() => handleSelectPlan(plan.id)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={plan.gradient}
                    style={dynamicStyles.selectButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={dynamicStyles.selectButtonText}>{plan.ctaText}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={dynamicStyles.trustSignalText}>
                  {plan.id === 'free' ? 'Keine Kreditkarte erforderlich' : 'Jederzeit kündbar'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={dynamicStyles.spacer} />
      </ScrollView>
    </View>
  );
}
