import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  textColor?: string;
}

export default function Logo({ size = 'medium', showText = true, textColor }: LogoProps) {
  const { colors, isDarkMode } = useTheme();
  
  const getSize = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 48;
      case 'medium':
      default:
        return 36;
    }
  };

  const iconSize = getSize();
  
  // Use provided textColor, or default to white in dark mode, dark blue in light mode
  const finalTextColor = textColor || (isDarkMode ? '#FFFFFF' : '#0D2B3E');

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/kpmed-logo-transparent.png')}
        style={[styles.logo, { width: iconSize, height: iconSize }]}
        resizeMode="contain"
      />
      {showText && (
        <Text style={[
          styles.text,
          { color: finalTextColor },
          size === 'small' && styles.textSmall,
          size === 'large' && styles.textLarge
        ]}>
          KP Med
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    marginRight: 8,
  },
  text: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
  },
  textSmall: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 28,
  },
});