import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}

// FIX: Create static styles once outside component - NEVER recreate StyleSheet on render!
const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    marginBottom: 12,
  },
});

// FIX: Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(function Card({ children, title, style }: CardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, style]}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      {children}
    </View>
  );
});