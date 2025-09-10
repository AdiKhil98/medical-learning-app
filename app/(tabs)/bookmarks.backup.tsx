import React from 'react';
import { SafeAreaView, StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Heart } from 'lucide-react-native';

const BookmarksScreen: React.FC = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Heart size={48} color={colors.primary} fill={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          Favoriten
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Ihre gespeicherten medizinischen Inhalte
        </Text>
        <Text style={[styles.comingSoon, { color: colors.textSecondary }]}>
          Feature wird geladen...
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  comingSoon: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default BookmarksScreen;