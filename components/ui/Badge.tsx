import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  primary: {
    backgroundColor: '#E6F1F8',
  },
  secondary: {
    backgroundColor: '#EDFAFC',
  },
  success: {
    backgroundColor: '#ECFDF5',
  },
  warning: {
    backgroundColor: '#FFFBEB',
  },
  error: {
    backgroundColor: '#FEF2F2',
  },
  text_primary: {
    color: '#0077B6',
  },
  text_secondary: {
    color: '#48CAE4',
  },
  text_success: {
    color: '#22C55E',
  },
  text_warning: {
    color: '#F59E0B',
  },
  text_error: {
    color: '#EF4444',
  },
});