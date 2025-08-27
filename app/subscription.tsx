import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import SubscriptionPlans from '../components/ui/SubscriptionPlans';
import { useTheme } from '../contexts/ThemeContext';

export default function SubscriptionPage() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const handleSelectPlan = (planId: string) => {
    // Handle plan selection logic here
    console.log('Selected plan:', planId);
    
    // You can navigate to a checkout page or show a modal
    // For example:
    // router.push(`/checkout?plan=${planId}`);
    
    // Or show an alert/modal for now
    alert(`${planId} Plan ausgewählt`);
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
      backgroundColor: 'rgba(255,255,255,0.9)',
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1e40af',
      marginLeft: 8,
    },
    content: {
      flex: 1,
    },
  });

  return (
    <LinearGradient
      colors={['#ffffff', '#f0f8ff']}
      style={{ flex: 1 }}
    >
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
              <ArrowLeft size={20} color="#1e40af" />
              <Text style={dynamicStyles.backButtonText}>Zurück</Text>
            </TouchableOpacity>
          </View>
          
          <View style={dynamicStyles.content}>
            <SubscriptionPlans onSelectPlan={handleSelectPlan} />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}