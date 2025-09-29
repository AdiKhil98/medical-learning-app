import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Text, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import SubscriptionPlans from '../components/ui/SubscriptionPlans';
import { useTheme } from '../contexts/ThemeContext';

export default function SubscriptionPage() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const handleSelectPlan = (planId: string) => {
    console.log('Selected plan:', planId);

    // Lemon Squeezy checkout URLs for each plan
    const checkoutUrls: Record<string, string> = {
      'basic': 'https://kpmed.lemonsqueezy.com/buy/b45b24cd-f6c7-48b5-8f7d-f08d6b793e20?enabled=1006948',
      'professional': 'https://kpmed.lemonsqueezy.com/buy/cf4938e1-62b0-47f8-9d39-4a60807594d6?enabled=1006934',
      'unlimited': 'https://kpmed.lemonsqueezy.com/buy/7fca01cc-1a9a-4f8d-abda-cc939f375320?enabled=1006947'
    };

    if (planId === 'free') {
      // Free plan - no checkout needed
      alert('Der kostenlose Plan ist bereits aktiv!');
      return;
    }

    const checkoutUrl = checkoutUrls[planId];
    if (checkoutUrl) {
      // Open Lemon Squeezy checkout
      openLemonSqueezyCheckout(checkoutUrl);
    } else {
      alert(`Plan "${planId}" ist noch nicht verfügbar`);
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
    router.back();
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