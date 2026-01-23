import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X, ChevronDown, ChevronUp, Shield, Zap, Target, Lock } from 'lucide-react-native';

interface SubscriptionPlansEnhancedProps {
  onSelectPlan?: (planId: string) => void;
  currentPlanId?: string | null;
}

interface Plan {
  id: string;
  name: string;
  icon: string;
  description: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  originalQuarterlyPrice: number;
  savings: number;
  popular?: boolean;
  ctaText: string;
  mainFeatures: FeatureCategory[];
  expandedFeatures: FeatureCategory[];
}

interface Feature {
  text: string;
  included: boolean;
}

interface FeatureCategory {
  title: string;
  features: Feature[];
}

// Plans data - simplified to two subscription options
const PLANS_DATA: Plan[] = [
  {
    id: 'monthly',
    name: 'Monatlich',
    icon: '🚀',
    description: 'Flexibel monatlich kündbar',
    monthlyPrice: 100,
    quarterlyPrice: 100,
    originalQuarterlyPrice: 100,
    savings: 0,
    ctaText: 'Jetzt abonnieren',
    mainFeatures: [
      {
        title: '✨ Vollzugang',
        features: [
          { text: 'Unbegrenzte FSP-Simulationen', included: true },
          { text: 'Unbegrenzte KP-Simulationen', included: true },
          { text: 'Zugang zu allen Fachgebieten', included: true },
          { text: 'Detailliertes Feedback nach jeder Simulation', included: true },
        ],
      },
      {
        title: '📊 Fortschrittsverfolgung',
        features: [
          { text: 'Vollständige Verlaufsübersicht', included: true },
          { text: 'Leistungsstatistiken im Dashboard', included: true },
          { text: 'Kategorie-Analyse deiner Stärken & Schwächen', included: true },
        ],
      },
    ],
    expandedFeatures: [
      {
        title: '📚 Lernmaterialien',
        features: [
          { text: 'Zugang zu Lernressourcen', included: true },
          { text: 'Prüfungstipps & Best Practices', included: true },
          { text: 'Musterbeispiele erfolgreicher Gespräche', included: true },
        ],
      },
      {
        title: '🎯 Support',
        features: [{ text: 'E-Mail Support innerhalb 24h', included: true }],
      },
    ],
  },
  {
    id: 'quarterly',
    name: '3 Monate',
    icon: '👑',
    description: 'Spare 100€ gegenüber monatlicher Zahlung',
    monthlyPrice: 200,
    quarterlyPrice: 200,
    originalQuarterlyPrice: 300,
    savings: 100,
    popular: true,
    ctaText: 'Beste Wahl - Jetzt sparen',
    mainFeatures: [
      {
        title: '✨ Vollzugang',
        features: [
          { text: 'Unbegrenzte FSP-Simulationen', included: true },
          { text: 'Unbegrenzte KP-Simulationen', included: true },
          { text: 'Zugang zu allen Fachgebieten', included: true },
          { text: 'Detailliertes Feedback nach jeder Simulation', included: true },
        ],
      },
      {
        title: '📊 Fortschrittsverfolgung',
        features: [
          { text: 'Vollständige Verlaufsübersicht', included: true },
          { text: 'Leistungsstatistiken im Dashboard', included: true },
          { text: 'Kategorie-Analyse deiner Stärken & Schwächen', included: true },
        ],
      },
    ],
    expandedFeatures: [
      {
        title: '📚 Lernmaterialien',
        features: [
          { text: 'Zugang zu Lernressourcen', included: true },
          { text: 'Prüfungstipps & Best Practices', included: true },
          { text: 'Musterbeispiele erfolgreicher Gespräche', included: true },
        ],
      },
      {
        title: '🎯 Support',
        features: [{ text: 'E-Mail Support innerhalb 24h', included: true }],
      },
    ],
  },
];

// FAQs data - moved outside component for better performance
const FAQS_DATA = [
  {
    question: 'Kann ich jederzeit kündigen?',
    answer:
      'Ja, absolut! Beim monatlichen Abo können Sie jederzeit zum Monatsende kündigen. Beim 3-Monats-Abo ist eine Kündigung nach Ablauf der 3 Monate möglich. Es gibt keine versteckten Gebühren oder Kündigungsfristen.',
  },
  {
    question: 'Was passiert nach der 5-tägigen Testphase?',
    answer:
      'Nach Ablauf Ihrer kostenlosen 5-Tage-Testphase werden die Simulationen gesperrt. Sie können weiterhin auf die Bibliothek und andere Inhalte zugreifen. Um unbegrenzten Zugang zu Simulationen zu erhalten, wählen Sie ein Abonnement.',
  },
  {
    question: 'Wie funktioniert die 14-Tage Geld-zurück-Garantie?',
    answer:
      'Wenn Sie innerhalb der ersten 14 Tage nach dem Abschluss nicht zufrieden sind, erstatten wir Ihnen den vollen Betrag zurück - ohne Fragen zu stellen. Senden Sie einfach eine E-Mail an unseren Support.',
  },
  {
    question: 'Was ist der Unterschied zwischen den beiden Abos?',
    answer:
      'Beide Abonnements bieten den gleichen Funktionsumfang mit unbegrenzten Simulationen. Der einzige Unterschied ist die Laufzeit und der Preis: Das 3-Monats-Abo für 200€ spart Ihnen 100€ gegenüber 3 einzelnen Monaten à 100€.',
  },
];

export default function SubscriptionPlansEnhanced({ onSelectPlan, currentPlanId }: SubscriptionPlansEnhancedProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const handleSelectPlan = (planId: string) => {
    if (!onSelectPlan) {
      return;
    }

    onSelectPlan(planId);
  };

  const toggleExpand = (planId: string) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        scrollContent: {
          flexGrow: 1,
        },
        gradient: {
          width: '100%',
        },
        contentWrapper: {
          padding: isMobile ? 20 : 40,
          paddingTop: 40,
          paddingBottom: 40,
        },
        header: {
          alignItems: 'center',
          marginBottom: 40,
        },
        headerTitle: {
          fontSize: width < 360 ? 24 : isMobile ? 28 : 52,
          fontWeight: '800',
          color: '#fff',
          textAlign: 'center',
          marginBottom: 16,
          textShadowColor: 'rgba(0,0,0,0.1)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 20,
        },
        headerSubtitle: {
          fontSize: isMobile ? 16 : 20,
          color: '#fff',
          opacity: 0.95,
          textAlign: 'center',
          maxWidth: 700,
          lineHeight: 28,
        },
        billingToggle: {
          alignItems: 'center',
          marginBottom: 40,
        },
        billingOptions: {
          flexDirection: 'row',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 50,
          padding: 6,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',
        },
        billingOption: {
          paddingVertical: isMobile ? 12 : 14,
          paddingHorizontal: isMobile ? 20 : 32,
          borderRadius: 40,
        },
        billingOptionActive: {
          backgroundColor: '#fff',
        },
        billingText: {
          fontWeight: '600',
          color: '#fff',
          fontSize: isMobile ? 13 : 15,
        },
        billingTextActive: {
          color: '#ff7854',
        },
        savingsBadge: {
          backgroundColor: '#22c55e',
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderRadius: 30,
          marginTop: 20,
        },
        savingsBadgeText: {
          color: '#fff',
          fontWeight: '700',
          fontSize: 14,
        },
        pricingGrid: {
          flexDirection: isMobile ? 'column' : 'row',
          marginBottom: 60,
          justifyContent: 'center',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          width: '100%',
        },
        pricingCard: {
          backgroundColor: '#fff',
          borderRadius: 24,
          padding: isMobile ? 24 : 40,
          width: isMobile ? '100%' : undefined,
          flex: isMobile ? undefined : 1,
          maxWidth: isMobile ? '100%' : 400,
          marginBottom: 30,
          marginRight: isMobile ? 0 : 15,
          marginLeft: isMobile ? 0 : 15,
        },
        popularCard: {
          borderWidth: 3,
          borderColor: '#ff7854',
          transform: isMobile ? [] : [{ scale: 1.05 }],
        },
        popularBadge: {
          position: 'absolute',
          top: -15,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 10,
        },
        popularBadgeText: {
          backgroundColor: '#ff7854',
          color: '#fff',
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderRadius: 30,
          fontWeight: '800',
          fontSize: 12,
        },
        planHeader: {
          alignItems: 'center',
          marginBottom: 30,
        },
        planIcon: {
          width: 60,
          height: 60,
          backgroundColor: '#ff7854',
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        },
        planIconText: {
          fontSize: 28,
        },
        planName: {
          fontSize: 28,
          fontWeight: '800',
          color: '#1f2937',
          marginBottom: 8,
        },
        planDescription: {
          color: '#6b7280',
          fontSize: 15,
          textAlign: 'center',
          lineHeight: 22,
        },
        priceSection: {
          alignItems: 'center',
          marginBottom: 30,
          paddingBottom: 30,
          borderBottomWidth: 2,
          borderBottomColor: '#f3f4f6',
        },
        priceRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          marginBottom: 8,
        },
        originalPrice: {
          textDecorationLine: 'line-through',
          color: '#9ca3af',
          fontSize: 18,
          marginRight: 5,
        },
        currency: {
          fontSize: 24,
          fontWeight: '700',
          color: '#ff7854',
          marginRight: 5,
        },
        amount: {
          fontSize: 56,
          fontWeight: '900',
          color: '#1f2937',
          marginRight: 5,
        },
        period: {
          fontSize: 18,
          color: '#6b7280',
          fontWeight: '500',
        },
        priceNote: {
          color: '#9ca3af',
          fontSize: 13,
          textAlign: 'center',
        },
        currentPlanBadge: {
          backgroundColor: '#10B981',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          marginBottom: 12,
          alignSelf: 'center',
        },
        currentPlanText: {
          color: '#fff',
          fontSize: 14,
          fontWeight: '600',
          textAlign: 'center',
        },
        ctaButton: {
          width: '100%',
          paddingVertical: 18,
          borderRadius: 14,
          alignItems: 'center',
          marginBottom: 30,
        },
        ctaButtonDisabled: {
          opacity: 0.7,
        },
        ctaButtonText: {
          color: '#fff',
          fontSize: 17,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        featuresList: {
          width: '100%',
        },
        featureCategory: {
          marginBottom: 20,
          width: '100%',
        },
        categoryTitle: {
          fontWeight: '700',
          color: '#1f2937',
          fontSize: 14,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 12,
        },
        featureItem: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: 12,
          width: '100%',
        },
        featureItemUnavailable: {
          opacity: 0.4,
        },
        featureIcon: {
          width: 24,
          height: 24,
          backgroundColor: '#ff7854',
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 2,
          marginRight: 12,
        },
        featureIconDisabled: {
          backgroundColor: '#e5e7eb',
        },
        featureIconText: {
          color: '#fff',
          fontWeight: '700',
          fontSize: 14,
        },
        featureText: {
          color: '#4b5563',
          fontSize: 15,
          lineHeight: 22,
          flex: 1,
        },
        featureTextDisabled: {
          color: '#9ca3af',
        },
        expandButton: {
          width: '100%',
          padding: 12,
          backgroundColor: '#f9fafb',
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 10,
          marginTop: 15,
        },
        expandButtonText: {
          color: '#6b7280',
          fontWeight: '600',
          fontSize: 14,
          textAlign: 'center',
        },
        trustSection: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 24,
          padding: 40,
          marginBottom: 60,
          alignItems: 'center',
        },
        trustTitle: {
          fontSize: 32,
          fontWeight: '800',
          color: '#1f2937',
          marginBottom: 10,
          textAlign: 'center',
        },
        trustSubtitle: {
          fontSize: 16,
          color: '#6b7280',
          marginBottom: 30,
          textAlign: 'center',
        },
        trustBadges: {
          flexDirection: isMobile ? 'column' : 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
        },
        trustBadge: {
          alignItems: 'center',
          marginRight: isMobile ? 0 : 25,
          marginLeft: isMobile ? 0 : 25,
          marginBottom: isMobile ? 20 : 0,
        },
        trustIcon: {
          width: 60,
          height: 60,
          backgroundColor: '#ff7854',
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        },
        trustText: {
          fontWeight: '600',
          color: '#1f2937',
          fontSize: 15,
        },
        faqSection: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 24,
          padding: isMobile ? 20 : 40,
          marginBottom: 60,
        },
        faqTitle: {
          fontSize: isMobile ? 28 : 40,
          fontWeight: '800',
          color: '#1f2937',
          marginBottom: 12,
          textAlign: 'center',
        },
        faqSubtitle: {
          fontSize: 18,
          color: '#6b7280',
          marginBottom: 40,
          textAlign: 'center',
        },
        faqList: {
          marginTop: 0,
        },
        faqItem: {
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 24,
          borderWidth: 2,
          borderColor: '#f3f4f6',
          marginBottom: 16,
        },
        faqItemActive: {
          borderColor: '#ff7854',
        },
        faqQuestion: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        faqQuestionText: {
          fontWeight: '700',
          color: '#1f2937',
          fontSize: 17,
          flex: 1,
          marginRight: 20,
        },
        faqIcon: {
          width: 32,
          height: 32,
          backgroundColor: '#ff7854',
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
        },
        faqAnswer: {
          marginTop: 16,
          color: '#6b7280',
          fontSize: 15,
          lineHeight: 24,
        },
        footer: {
          alignItems: 'center',
          paddingBottom: 40,
        },
        footerText: {
          color: '#fff',
          fontSize: 14,
          opacity: 0.9,
          textAlign: 'center',
        },
        footerSubtext: {
          color: '#fff',
          fontSize: 14,
          opacity: 0.8,
          marginTop: 10,
          textAlign: 'center',
        },
      }),
    [isMobile]
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <LinearGradient
        colors={['#ff9a56', '#ff6b6b', '#ff8e53']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Wählen Sie Ihren perfekten Plan</Text>
            <Text style={styles.headerSubtitle}>
              Bereiten Sie sich optimal auf Ihre Fachsprachprüfung vor. Flexibel, umfassend und effektiv.
            </Text>
          </View>

          {/* Pricing Cards */}
          <View style={styles.pricingGrid}>
            {PLANS_DATA.map((plan) => (
              <View key={plan.id} style={[styles.pricingCard, plan.popular && styles.popularCard]}>
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>⭐ BELIEBTESTE WAHL</Text>
                  </View>
                )}

                {/* Plan Header */}
                <View style={styles.planHeader}>
                  <View style={styles.planIcon}>
                    <Text style={styles.planIconText}>{plan.icon}</Text>
                  </View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>

                {/* Price Section */}
                <View style={styles.priceSection}>
                  <View style={styles.priceRow}>
                    {plan.savings > 0 && <Text style={styles.originalPrice}>€{plan.originalQuarterlyPrice}</Text>}
                    <Text style={styles.currency}>€</Text>
                    <Text style={styles.amount}>{plan.monthlyPrice}</Text>
                    <Text style={styles.period}>{plan.id === 'quarterly' ? '/3 Monate' : '/Monat'}</Text>
                  </View>
                  <Text style={styles.priceNote}>
                    {plan.id === 'quarterly'
                      ? `€${(plan.monthlyPrice / 3).toFixed(2)}/Monat • Spare €${plan.savings}`
                      : 'Monatlich kündbar'}
                  </Text>
                </View>

                {/* Current Plan Badge */}
                {currentPlanId === plan.id && (
                  <View style={styles.currentPlanBadge}>
                    <Text style={styles.currentPlanText}>✓ Aktueller Plan</Text>
                  </View>
                )}

                {/* CTA Button */}
                <TouchableOpacity
                  onPress={() => handleSelectPlan(plan.id)}
                  activeOpacity={0.9}
                  disabled={currentPlanId === plan.id}
                >
                  <LinearGradient
                    colors={
                      currentPlanId === plan.id
                        ? ['#9CA3AF', '#6B7280']
                        : plan.popular
                          ? ['#ff7854', '#ff6b6b']
                          : ['#ff9a56', '#ff6b6b']
                    }
                    style={[styles.ctaButton, currentPlanId === plan.id && styles.ctaButtonDisabled]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.ctaButtonText}>
                      {currentPlanId === plan.id ? 'Aktueller Plan' : plan.ctaText}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Features List */}
                <View style={styles.featuresList}>
                  {plan.mainFeatures.map((category, catIndex) => (
                    <View key={catIndex} style={styles.featureCategory}>
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                      {category.features.map((feature, featIndex) => (
                        <View
                          key={featIndex}
                          style={[styles.featureItem, !feature.included && styles.featureItemUnavailable]}
                        >
                          <View style={[styles.featureIcon, !feature.included && styles.featureIconDisabled]}>
                            <Text style={styles.featureIconText}>{feature.included ? '✓' : '✗'}</Text>
                          </View>
                          <Text style={[styles.featureText, !feature.included && styles.featureTextDisabled]}>
                            {feature.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}

                  {/* Expanded Features */}
                  {plan.expandedFeatures.length > 0 && (
                    <>
                      {expandedPlan === plan.id &&
                        plan.expandedFeatures.map((category, catIndex) => (
                          <View key={catIndex} style={styles.featureCategory}>
                            <Text style={styles.categoryTitle}>{category.title}</Text>
                            {category.features.map((feature, featIndex) => (
                              <View key={featIndex} style={styles.featureItem}>
                                <View style={styles.featureIcon}>
                                  <Text style={styles.featureIconText}>✓</Text>
                                </View>
                                <Text style={styles.featureText}>{feature.text}</Text>
                              </View>
                            ))}
                          </View>
                        ))}

                      <TouchableOpacity style={styles.expandButton} onPress={() => toggleExpand(plan.id)}>
                        <Text style={styles.expandButtonText}>
                          {expandedPlan === plan.id ? '− Weniger anzeigen' : '+ Alle Features anzeigen'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Trust Section */}
          <View style={styles.trustSection}>
            <Text style={styles.trustTitle}>Vertrauen Sie unserer Expertise</Text>
            <Text style={styles.trustSubtitle}>Tausende Ärzte haben sich bereits erfolgreich vorbereitet</Text>
            <View style={styles.trustBadges}>
              <View style={styles.trustBadge}>
                <View style={styles.trustIcon}>
                  <Lock size={28} color="#fff" />
                </View>
                <Text style={styles.trustText}>100% Datenschutz</Text>
              </View>
              <View style={styles.trustBadge}>
                <View style={styles.trustIcon}>
                  <Zap size={28} color="#fff" />
                </View>
                <Text style={styles.trustText}>Sofortiger Zugang</Text>
              </View>
              <View style={styles.trustBadge}>
                <View style={styles.trustIcon}>
                  <Text style={{ fontSize: 28 }}>💯</Text>
                </View>
                <Text style={styles.trustText}>14 Tage Geld-zurück</Text>
              </View>
              <View style={styles.trustBadge}>
                <View style={styles.trustIcon}>
                  <Target size={28} color="#fff" />
                </View>
                <Text style={styles.trustText}>Prüfungsnah</Text>
              </View>
            </View>
          </View>

          {/* FAQ Section */}
          <View style={styles.faqSection}>
            <Text style={styles.faqTitle}>Häufig gestellte Fragen</Text>
            <Text style={styles.faqSubtitle}>Alles, was Sie über unsere Pläne wissen müssen</Text>

            <View style={styles.faqList}>
              {FAQS_DATA.map((faq, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.faqItem, expandedFAQ === index && styles.faqItemActive]}
                  onPress={() => toggleFAQ(index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.faqQuestion}>
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <View style={styles.faqIcon}>
                      {expandedFAQ === index ? (
                        <ChevronUp size={14} color="#fff" />
                      ) : (
                        <ChevronDown size={14} color="#fff" />
                      )}
                    </View>
                  </View>
                  {expandedFAQ === index && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2024 FSP & KP Simulation. Alle Rechte vorbehalten.</Text>
            <Text style={styles.footerSubtext}>Fragen? Kontaktieren Sie uns unter support@kpmed.de</Text>
          </View>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}
