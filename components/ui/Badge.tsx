import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/constants/tokens';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
}

export default function Badge({ text, variant = 'primary' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{text}</Text>
    </View>
  );
}

// FIX: Replace 10 hardcoded colors with MEDICAL_COLORS
// FIX: Apply design tokens for spacing, border radius, and typography
const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xl,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: 'Inter-Medium',
  },
  primary: {
    backgroundColor: MEDICAL_COLORS.veryLightCoral,
  },
  secondary: {
    backgroundColor: MEDICAL_COLORS.lightCoral,
  },
  success: {
    backgroundColor: MEDICAL_COLORS.lightGreen,
  },
  warning: {
    backgroundColor: MEDICAL_COLORS.veryLightPink,
  },
  error: {
    backgroundColor: MEDICAL_COLORS.lightCoral,
  },
  text_primary: {
    color: MEDICAL_COLORS.primary,
  },
  text_secondary: {
    color: MEDICAL_COLORS.oldRose,
  },
  text_success: {
    color: MEDICAL_COLORS.success,
  },
  text_warning: {
    color: MEDICAL_COLORS.secondary,
  },
  text_error: {
    color: MEDICAL_COLORS.brownRust,
  },
});