import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '@/constants/tokens';
import { colors } from '@/constants/colors';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}

// FIX: Create static styles once outside component - NEVER recreate StyleSheet on render!
// FIX: Use design tokens for consistent spacing, shadows, and typography
const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.md,
  },
});

// FIX: Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(function Card({ children, title, style }: CardProps) {
  
  return (
    <View style={[styles.card, { backgroundColor: colors.card }, style]}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      {children}
    </View>
  );
});