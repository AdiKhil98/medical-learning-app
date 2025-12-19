import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X, AlertCircle } from 'lucide-react-native';
import SubscriptionPlansEnhanced from '../components/ui/SubscriptionPlansEnhanced';

import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionService } from '@/services/subscriptionService';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';

// Variant ID mappings - centralized
const VARIANT_TO_PLAN: Record<number, string> = {
  1006948: 'basic',
  1006934: 'professional',
  1006947: 'unlimited',
};

const PLAN_TO_VARIANT: Record<string, number> = {
  basic: 1006948,
  professional: 1006934,
  unlimited: 1006947,
};

// Checkout URL builder
const getCheckoutUrl = (planId: string, userEmail: string): string => {
  const encodedEmail = encodeURIComponent(userEmail || '');
  const checkoutUrls: Record<string, string> = {
    basic: `https://kpmed.lemonsqueezy.com/buy/b45b24cd-f6c7-48b5-8f7d-f08d6b793e20?enabled=1006948&checkout[email]=${encodedEmail}`,
    professional: `https://kpmed.lemonsqueezy.com/buy/cf4938e1-62b0-47f8-9d39-4a60807594d6?enabled=1006934&checkout[email]=${encodedEmail}`,
    unlimited: `https://kpmed.lemonsqueezy.com/buy/7fca01cc-1a9a-4f8d-abda-cc939f375320?enabled=1006947&checkout[email]=${encodedEmail}`,
  };
  return checkoutUrls[planId] || '';
};

export default function SubscriptionPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { user } = useAuth();
  const { checkAccess } = useSubscription(user?.id);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingCurrentPlan, setIsLoadingCurrentPlan] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [currentVariantId, setCurrentVariantId] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Load current subscription on mount
  useEffect(() => {
    const loadCurrentSubscription = async () => {
      if (!user?.id) {
        setIsLoadingCurrentPlan(false);
        return;
      }

      try {
        const { data: subscription, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'on_trial'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          logger.error('Failed to load current subscription', error);
          setIsLoadingCurrentPlan(false);
          return;
        }

        if (subscription) {
          const planId = VARIANT_TO_PLAN[subscription.lemonsqueezy_variant_id];
          setCurrentPlanId(planId || null);
          setCurrentVariantId(subscription.lemonsqueezy_variant_id);
          logger.info('Current subscription loaded', {
            planId,
            variantId: subscription.lemonsqueezy_variant_id,
          });
        } else {
          setCurrentPlanId(null);
          setCurrentVariantId(null);
        }
      } catch (error) {
        logger.error('Error loading current subscription', error);
      } finally {
        setIsLoadingCurrentPlan(false);
      }
    };

    loadCurrentSubscription();
  }, [user?.id]);

  const handleSelectPlan = async (planId: string) => {
    console.log('═══════════════════════════════════════');
    console.log('🎯 SUBSCRIPTION UPGRADE FLOW STARTED');
    console.log('═══════════════════════════════════════');
    console.log('👤 User ID:', user?.id);
    console.log('📧 User Email:', user?.email);
    console.log('📊 Current Plan ID:', currentPlanId);
    console.log('📊 Current Variant ID:', currentVariantId);
    console.log('🎯 Target Plan:', planId);
    console.log('🔄 Is Updating:', isUpdating);
    console.log('═══════════════════════════════════════');

    logger.info('Plan selection initiated', {
      planId,
      userId: user?.id,
      isUpdating,
      currentPlanId,
      component: 'SubscriptionPage',
    });

    // Prevent spamming
    if (isUpdating) {
      logger.warn('Plan selection blocked - already updating', { planId });
      return;
    }

    if (!user?.id) {
      logger.warn('Plan selection blocked - user not authenticated', { planId });
      Alert.alert('Fehler', 'Sie müssen angemeldet sein, um ein Abonnement zu ändern.');
      return;
    }

    // Check if user is already on this plan
    if (currentPlanId === planId) {
      logger.warn('Plan selection blocked - already on this plan', { planId });
      Alert.alert(
        'Bereits abonniert',
        `Sie haben bereits den ${planId.toUpperCase()}-Plan. Um zu einem anderen Plan zu wechseln, wählen Sie bitte einen anderen Plan aus.`
      );
      return;
    }

    if (planId === 'free') {
      logger.info('Free plan selected, delegating to handleFreePlanSelection', { userId: user.id });
      await handleFreePlanSelection();
      return;
    }

    const newVariantId = PLAN_TO_VARIANT[planId];
    logger.debug('Mapped plan to variant ID', { planId, variantId: newVariantId });

    if (!newVariantId) {
      logger.error('Invalid plan ID - no variant mapping found', new Error('Invalid plan'), {
        planId,
        availablePlans: Object.keys(PLAN_TO_VARIANT),
      });
      Alert.alert('Fehler', `Plan "${planId}" ist noch nicht verfügbar`);
      return;
    }

    setIsUpdating(true);
    setLoadingMessage('Überprüfe aktuelles Abonnement...');

    try {
      logger.debug('Checking for existing subscription', { userId: user.id });

      // STEP 1: Check if user has active subscription
      const { data: existingSubscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'on_trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) {
        logger.error('Subscription check failed', subError, {
          userId: user.id,
          operation: 'check_subscription',
        });
        Alert.alert('Fehler', 'Fehler beim Überprüfen des Abonnements');
        setIsUpdating(false);
        return;
      }

      console.log('───────────────────────────────────────');
      console.log('✅ SUBSCRIPTION CHECK COMPLETE');
      console.log('───────────────────────────────────────');
      console.log('Has Active Subscription:', !!existingSubscription);
      console.log('Subscription ID:', existingSubscription?.id);
      console.log('Subscription Status:', existingSubscription?.status);
      console.log('Current Plan:', existingSubscription?.tier || existingSubscription?.plan_name);
      console.log('Lemon Squeezy Sub ID:', existingSubscription?.lemonsqueezy_subscription_id);
      console.log('───────────────────────────────────────');

      logger.info('Subscription check complete', {
        hasSubscription: !!existingSubscription,
        subscriptionId: existingSubscription?.id,
        currentPlan: existingSubscription?.plan_name,
      });

      // STEP 2A: User has active subscription → UPGRADE/DOWNGRADE
      if (existingSubscription) {
        logger.info('Upgrading/downgrading existing subscription', {
          currentPlan: existingSubscription.plan_name,
          targetPlan: planId,
          targetVariantId: newVariantId,
        });
        setLoadingMessage('Abo wird aktualisiert...');

        let response;
        let result;
        let functionCallFailed = false;

        try {
          logger.debug('Calling Netlify function to change plan', {
            endpoint: '/.netlify/functions/change-plan',
            userId: user.id,
            newVariantId,
          });

          response = await fetch('/.netlify/functions/change-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              newVariantId,
            }),
          });

          logger.apiCall('/.netlify/functions/change-plan', 'POST', response.status, {
            userId: user.id,
            newVariantId,
          });

          // Check if we got a 404 (function not found) - this happens when running locally
          if (response.status === 404) {
            functionCallFailed = true;
            logger.warn('Netlify function not found (404) - running locally', {
              endpoint: '/.netlify/functions/change-plan',
            });
          } else {
            result = await response.json();
            logger.debug('Netlify function response received', {
              status: response.status,
              resultPreview: JSON.stringify(result).substring(0, 100),
            });
          }
        } catch (fetchError: any) {
          functionCallFailed = true;
          logger.error('Netlify function call failed', fetchError, {
            endpoint: '/.netlify/functions/change-plan',
            userId: user.id,
            newVariantId,
          });
        }

        // If Netlify function failed (running locally or network error), offer checkout redirect
        if (functionCallFailed) {
          setIsUpdating(false);
          setLoadingMessage('');

          Alert.alert(
            'Plan-Änderung nicht verfügbar',
            'Sie haben bereits ein aktives Abonnement. Um den Plan zu ändern, wenden Sie sich bitte an den Support oder kündigen Sie Ihr aktuelles Abo zuerst.',
            [
              {
                text: 'OK',
                style: 'cancel',
              },
            ]
          );
          return;
        }

        if (!response.ok) {
          logger.error('Plan change failed:', result);
          Alert.alert('Fehler', result.message || result.error || 'Fehler beim Ändern des Plans');
          setIsUpdating(false);
          return;
        }

        logger.info('✅ Plan changed successfully:', result);
        setLoadingMessage('Erfolgreich! Aktualisiere Daten...');

        // Refresh subscription data
        await checkAccess();

        // Update current plan state
        setCurrentPlanId(planId);
        setCurrentVariantId(newVariantId);

        Alert.alert('Erfolgreich!', 'Ihr Plan wurde erfolgreich geändert. Die Änderung wird in Kürze aktiv.', [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)/dashboard');
            },
          },
        ]);
      }
      // STEP 2B: User has NO subscription → NEW CHECKOUT
      else {
        logger.info('🆕 FREE USER CHECKOUT FLOW TRIGGERED', {
          userId: user.id,
          userEmail: user.email,
          targetPlan: planId,
          targetVariantId: newVariantId,
        });

        setLoadingMessage('Weiterleitung zum Checkout...');

        const checkoutUrl = getCheckoutUrl(planId, user?.email || '');

        console.log('🔗 CHECKOUT URL GENERATED:', checkoutUrl);
        console.log('📧 USER EMAIL FOR CHECKOUT:', user?.email);
        console.log('🎯 PLAN ID:', planId);

        if (checkoutUrl) {
          try {
            console.log('🚀 ATTEMPTING TO OPEN CHECKOUT URL...');
            await Linking.openURL(checkoutUrl);
            console.log('✅ CHECKOUT URL OPENED SUCCESSFULLY');

            // Give user feedback about successful checkout redirect
            Alert.alert(
              'Weiterleitung erfolgreich',
              'Sie werden zur Checkout-Seite weitergeleitet. Bitte schließen Sie den Kaufvorgang ab, um Ihr Abonnement zu aktivieren.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    router.replace('/(tabs)/dashboard');
                  },
                },
              ]
            );
          } catch (linkError: any) {
            console.error('❌ ERROR OPENING CHECKOUT URL:', linkError);
            logger.error('Error opening checkout URL:', linkError, {
              checkoutUrl,
              planId,
              userEmail: user?.email,
            });
            Alert.alert('Fehler', 'Fehler beim Öffnen der Checkout-Seite');
          }
        } else {
          console.error('❌ NO CHECKOUT URL GENERATED!', {
            planId,
            userEmail: user?.email,
            availablePlans: Object.keys(PLAN_TO_VARIANT),
          });
          logger.error('No checkout URL found for plan:', planId);
          Alert.alert('Fehler', 'Checkout-URL nicht gefunden');
        }
      }
    } catch (error: any) {
      logger.error('Error in handleSelectPlan:', error);
      Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsUpdating(false);
      setLoadingMessage('');
    }
  };

  const handleFreePlanSelection = async () => {
    if (!user?.id) {
      Alert.alert('Fehler', 'Sie müssen angemeldet sein, um ein Abonnement zu ändern.');
      return;
    }

    setIsUpdating(true);
    setLoadingMessage('Wechsel zum kostenlosen Plan...');

    try {
      logger.info('🎯 Starting free plan selection...');
      const result = await SubscriptionService.updateUserSubscription(user.id, 'free');
      logger.info('📊 Update result:', result);

      if (result.success) {
        logger.info('✅ Free plan update successful');
        setLoadingMessage('Erfolgreich! Aktualisiere Daten...');

        // Refresh subscription data
        await checkAccess();

        Alert.alert(
          'Erfolgreich!',
          'Sie wurden erfolgreich zum kostenlosen Plan gewechselt. Sie haben wieder 3 kostenlose Simulationen.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Go back to dashboard
                router.replace('/(tabs)/dashboard');
              },
            },
          ]
        );
      } else {
        logger.info('❌ Free plan update failed:', result.error);
        setErrorModal({
          visible: true,
          title: 'Nicht verfügbar',
          message: result.error || 'Fehler beim Wechseln zum kostenlosen Plan',
        });
      }
    } catch (error) {
      logger.error('Error switching to free plan:', error);
      Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsUpdating(false);
      setLoadingMessage('');
    }
  };

  const handleGoBack = () => {
    // Try to go back, if no history then go to dashboard
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        safeArea: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 16,
          paddingTop: 60,
        },
        backButton: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 12,
          backgroundColor: 'rgba(249, 246, 242, 0.95)',
          shadowColor: 'rgba(181,87,64,0.3)',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        backButtonText: {
          fontSize: 16,
          fontWeight: '600',
          color: '#B87E70',
          marginLeft: 8,
        },
        content: {
          flex: 1,
        },
        loadingOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        loadingContainer: {
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 32,
          alignItems: 'center',
          minWidth: 200,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 10,
        },
        loadingText: {
          marginTop: 16,
          fontSize: 16,
          fontWeight: '600',
          color: '#333',
          textAlign: 'center',
          lineHeight: 22,
        },
        // Error Modal Styles - matching website aesthetic
        errorOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        },
        errorContainer: {
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          width: '100%',
          maxWidth: isMobile ? 280 : 400,
          marginHorizontal: isMobile ? 20 : 0,
          shadowColor: 'rgba(181,87,64,0.3)',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 15,
          overflow: 'hidden',
        },
        errorHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 24,
          paddingBottom: 16,
          backgroundColor: 'rgba(249, 246, 242, 0.3)',
        },
        errorTitleContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        errorIcon: {
          marginRight: 12,
        },
        errorTitle: {
          fontSize: 20,
          fontWeight: '700',
          color: '#2C2C2C',
          flex: 1,
        },
        closeButton: {
          padding: 8,
          borderRadius: 20,
          backgroundColor: 'rgba(184, 126, 112, 0.1)',
        },
        errorMessage: {
          fontSize: 16,
          lineHeight: 24,
          color: '#4A4A4A',
          paddingHorizontal: 24,
          paddingVertical: 8,
          textAlign: 'left',
        },
        errorActions: {
          padding: 24,
          paddingTop: 20,
        },
        errorButton: {
          borderRadius: 12,
          overflow: 'hidden',
        },
        errorButtonGradient: {
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignItems: 'center',
        },
        errorButtonText: {
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }),
    [isMobile]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={dynamicStyles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={dynamicStyles.container}>
          <View style={dynamicStyles.header}>
            <TouchableOpacity
              style={[dynamicStyles.backButton, isUpdating && { opacity: 0.5 }]}
              onPress={handleGoBack}
              disabled={isUpdating}
              accessibilityRole="button"
              accessibilityLabel="Zurück zur vorherigen Seite"
              accessibilityHint="Navigiert zurück zum Dashboard"
            >
              <ArrowLeft size={20} color="#B87E70" />
              <Text style={dynamicStyles.backButtonText}>Zurück</Text>
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.content}>
            {isLoadingCurrentPlan ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#B15740" />
                <Text style={{ marginTop: 16, color: '#6B7280' }}>Lade Ihre Abo-Informationen...</Text>
              </View>
            ) : (
              <SubscriptionPlansEnhanced onSelectPlan={handleSelectPlan} currentPlanId={currentPlanId} />
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Loading Modal */}
      <Modal
        visible={isUpdating}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => {}}
        accessibilityViewIsModal={true}
      >
        <View style={dynamicStyles.loadingOverlay} accessibilityLiveRegion="polite">
          <View style={dynamicStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={dynamicStyles.loadingText} accessibilityLiveRegion="polite">
              {loadingMessage || 'Wird verarbeitet...'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Custom Error Modal */}
      <Modal visible={errorModal.visible} transparent={true} animationType="fade" statusBarTranslucent={true}>
        <View style={dynamicStyles.errorOverlay}>
          <View style={dynamicStyles.errorContainer}>
            {/* Header with close button */}
            <View style={dynamicStyles.errorHeader}>
              <View style={dynamicStyles.errorTitleContainer}>
                <AlertCircle size={24} color="#D32F2F" style={dynamicStyles.errorIcon} />
                <Text style={dynamicStyles.errorTitle}>{errorModal.title}</Text>
              </View>
              <TouchableOpacity
                style={dynamicStyles.closeButton}
                onPress={() => setErrorModal({ visible: false, title: '', message: '' })}
              >
                <X size={24} color="#B87E70" />
              </TouchableOpacity>
            </View>

            {/* Message */}
            <Text style={dynamicStyles.errorMessage}>{errorModal.message}</Text>

            {/* Action buttons */}
            <View style={dynamicStyles.errorActions}>
              <TouchableOpacity
                style={dynamicStyles.errorButton}
                onPress={() => setErrorModal({ visible: false, title: '', message: '' })}
              >
                <LinearGradient
                  colors={['#B87E70', '#A0645A']}
                  style={dynamicStyles.errorButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={dynamicStyles.errorButtonText}>Verstanden</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
