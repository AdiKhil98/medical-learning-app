import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import MedicalContentTransformer from '@/components/ui/MedicalContentTransformer';
import { colors } from '@/constants/colors';

export default function TransformContentScreen() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Zurück</Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Content Transformation
        </Text>
      </View>

      <MedicalContentTransformer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
});