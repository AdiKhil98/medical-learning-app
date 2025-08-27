import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}

export default function Card({ children, title, style }: CardProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
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
      color: colors.text,
    },
  });

  return (
    <View style={[dynamicStyles.card, style]}>
      {title && <Text style={dynamicStyles.title}>{title}</Text>}
      {children}
    </View>
  );
}