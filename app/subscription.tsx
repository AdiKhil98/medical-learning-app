import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
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
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    backButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.text,
      marginLeft: 8,
    },
    content: {
      flex: 1,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={handleGoBack}
          >
            <ArrowLeft size={20} color={colors.text} />
            <Text style={dynamicStyles.backButtonText}>Zurück</Text>
          </TouchableOpacity>
        </View>
        
        <View style={dynamicStyles.content}>
          <SubscriptionPlans onSelectPlan={handleSelectPlan} />
        </View>
      </View>
    </SafeAreaView>
  );
}