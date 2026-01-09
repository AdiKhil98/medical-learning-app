import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Lock, CreditCard, Shield, CheckCircle } from 'lucide-react-native';

interface TrustBadgesProps {
  variant?: 'horizontal' | 'grid';
  size?: 'small' | 'medium' | 'large';
}

export default function TrustBadges({ variant = 'horizontal', size = 'medium' }: TrustBadgesProps) {
  const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
  const fontSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;

  const badges = [
    {
      icon: Lock,
      text: 'SSL Verschlüsselt',
      color: '#10B981',
    },
    {
      icon: CreditCard,
      text: 'Sichere Zahlung',
      color: '#3B82F6',
    },
    {
      icon: Shield,
      text: 'DSGVO Konform',
      color: '#8B5CF6',
    },
    {
      icon: CheckCircle,
      text: 'Datenschutz',
      color: '#F59E0B',
    },
  ];

  const containerStyle = variant === 'horizontal' ? styles.containerHorizontal : styles.containerGrid;
  const badgeStyle = variant === 'horizontal' ? styles.badgeHorizontal : styles.badgeGrid;

  return (
    <View style={containerStyle}>
      {badges.map((badge, index) => {
        const Icon = badge.icon;
        return (
          <View key={index} style={[badgeStyle, size === 'small' && styles.badgeSmall]}>
            <Icon size={iconSize} color={badge.color} strokeWidth={2} />
            <Text style={[styles.badgeText, { fontSize, color: badge.color }]}>{badge.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  containerHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  containerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  badgeHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  badgeSmall: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  badgeText: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
});
