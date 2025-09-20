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
    backgroundColor: '#FDF7F6',  // Very light coral
  },
  secondary: {
    backgroundColor: '#FBEEEC',  // Light coral
  },
  success: {
    backgroundColor: '#ECFDF5',
  },
  warning: {
    backgroundColor: '#FDF8F7',  // Very light Tonys Pink background
  },
  error: {
    backgroundColor: '#FBEEEC',  // Light coral for error background
  },
  text_primary: {
    color: '#E2827F',  // Burning Sand
  },
  text_secondary: {
    color: '#B87E70',  // Old Rose
  },
  text_success: {
    color: '#22C55E',
  },
  text_warning: {
    color: '#E5877E',  // Tonys Pink for warning text
  },
  text_error: {
    color: '#B15740',  // Brown Rust for error text
  },
});