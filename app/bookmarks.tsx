import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import BookmarksList from '@/components/ui/BookmarksList';

export default function BookmarksPage() {
  const router = useRouter();
  const { colors } = useTheme();

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
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
      alignSelf: 'flex-start',
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#B87E70',
      marginLeft: 8,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.headerContainer}>
        <TouchableOpacity
          style={dynamicStyles.backButton}
          onPress={handleGoBack}
        >
          <ArrowLeft size={20} color="#B87E70" />
          <Text style={dynamicStyles.backButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
      <BookmarksList />
    </SafeAreaView>
  );
}