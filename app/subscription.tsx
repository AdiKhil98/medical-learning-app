import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Text, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import SubscriptionPlans from '../components/ui/SubscriptionPlans';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionService } from '@/services/subscriptionService';
import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionPage() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { checkAccess } = useSubscription(user?.id);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelectPlan = async (planId: string) => {
    console.log('Selected plan:', planId);

    if (!user?.id) {
      Alert.alert('Fehler', 'Sie müssen angemeldet sein, um ein Abonnement zu ändern.');
      return;
    }

    // Lemon Squeezy checkout URLs for paid plans
    const checkoutUrls: Record<string, string> = {
      'basic': 'https://kpmed.lemonsqueezy.com/buy/b45b24cd-f6c7-48b5-8f7d-f08d6b793e20?enabled=1006948',
      'professional': 'https://kpmed.lemonsqueezy.com/buy/cf4938e1-62b0-47f8-9d39-4a60807594d6?enabled=1006934',
      'unlimited': 'https://kpmed.lemonsqueezy.com/buy/7fca01cc-1a9a-4f8d-abda-cc939f375320?enabled=1006947'
    };

    if (planId === 'free') {
      // Handle free plan - update database directly
      await handleFreePlanSelection();
      return;
    }

    // For paid plans, show choice: instant switch or go to checkout
    Alert.alert(
      'Plan wählen',
      `Möchten Sie sofort zum ${planId.toUpperCase()}-Plan wechseln oder zur Zahlungsseite gehen?`,
      [
        {
          text: 'Abbrechen',
          style: 'cancel'
        },
        {
          text: 'Sofort wechseln',
          onPress: () => handleInstantPlanSwitch(planId)
        },
        {
          text: 'Zur Zahlung',
          onPress: () => {
            const checkoutUrl = checkoutUrls[planId];
            if (checkoutUrl) {
              openLemonSqueezyCheckout(checkoutUrl);
            } else {
              Alert.alert('Fehler', `Plan "${planId}" ist noch nicht verfügbar`);
            }
          }
        }
      ]
    );
  };

  const handleFreePlanSelection = async () => {
    setIsUpdating(true);
    try {
      const result = await SubscriptionService.updateUserSubscription(user!.id, 'free');

      if (result.success) {
        Alert.alert(
          'Erfolgreich!',
          'Sie wurden erfolgreich zum kostenlosen Plan gewechselt. Sie haben wieder 3 kostenlose Simulationen.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh subscription data
                checkAccess();
                // Go back to dashboard
                router.replace('/(tabs)/dashboard');
              }
            }
          ]
        );
      } else {
        Alert.alert('Fehler', result.error || 'Fehler beim Wechseln zum kostenlosen Plan');
      }
    } catch (error) {
      console.error('Error switching to free plan:', error);
      Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInstantPlanSwitch = async (planId: string) => {
    setIsUpdating(true);
    try {
      const result = await SubscriptionService.updateUserSubscription(user!.id, planId);

      if (result.success) {
        const planDetails = SubscriptionService.getPlanDetails(planId);
        const limitText = planDetails?.simulationLimit
          ? `${planDetails.simulationLimit} Simulationen pro Monat`
          : 'Unbegrenzte Simulationen';

        Alert.alert(
          'Erfolgreich!',
          `Sie wurden erfolgreich zum ${planId.toUpperCase()}-Plan gewechselt. ${limitText}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh subscription data
                checkAccess();
                // Go back to dashboard
                router.replace('/(tabs)/dashboard');
              }
            }
          ]
        );
      } else {
        Alert.alert('Fehler', result.error || 'Fehler beim Wechseln des Plans');
      }
    } catch (error) {
      console.error('Error switching plan:', error);
      Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsUpdating(false);
    }
  };

  const openLemonSqueezyCheckout = (checkoutUrl: string) => {
    try {
      Linking.openURL(checkoutUrl);
    } catch (error) {
      console.error('Error opening checkout:', error);
      alert('Fehler beim Öffnen der Checkout-Seite');
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

  const dynamicStyles = StyleSheet.create({
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
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={dynamicStyles.safeArea}>
        <StatusBar 
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={dynamicStyles.container}>
          <View style={dynamicStyles.header}>
            <TouchableOpacity
              style={dynamicStyles.backButton}
              onPress={handleGoBack}
            >
              <ArrowLeft size={20} color="#B87E70" />  {/* Old Rose */}
              <Text style={dynamicStyles.backButtonText}>Zurück</Text>
            </TouchableOpacity>
          </View>
          
          <View style={dynamicStyles.content}>
            <SubscriptionPlans onSelectPlan={handleSelectPlan} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}