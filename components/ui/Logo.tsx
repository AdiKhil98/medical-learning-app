import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Plus, Stethoscope, Heart, Hexagon } from 'lucide-react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  textColor?: string;
  variant?: 'modern' | 'badge' | 'minimalist' | 'premium' | 'medical';
  animated?: boolean;
  onPress?: () => void;
}

export default function Logo({
  size = 'medium',
  showText = true,
  textColor,
  variant = 'premium',
  animated = true,
  onPress,
}: LogoProps) {
  const { colors, isDarkMode } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [isHovered, setIsHovered] = useState(false);
  const hoverScale = useRef(new Animated.Value(1)).current;

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 56;
      case 'medium':
      default:
        return 44;
    }
  };

  const iconSize = getIconSize();

  // Use provided textColor, or default to white in dark mode, dark green in light mode
  const finalTextColor = textColor || (isDarkMode ? '#FFFFFF' : '#2E7D32');

  useEffect(() => {
    if (animated) {
      // Pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      // Rotate animation for plus icon
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      );

      pulseAnimation.start();
      if (variant === 'minimalist') {
        rotateAnimation.start();
      }
    }
  }, [animated, variant]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderLogo = () => {
    const Container = onPress ? TouchableOpacity : View;

    switch (variant) {
      case 'modern':
        return (
          <Container style={styles.container} onPress={onPress}>
            <Animated.View style={[styles.modernIconContainer, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#4CAF50', '#66BB6A']}
                style={[styles.modernIcon, { width: iconSize, height: iconSize }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Stethoscope size={iconSize * 0.5} color="white" />
              </LinearGradient>
            </Animated.View>
            {showText && (
              <View style={styles.modernTextContainer}>
                <Text
                  style={[
                    styles.modernBrand,
                    { color: finalTextColor, fontSize: size === 'small' ? 18 : size === 'large' ? 32 : 24 },
                  ]}
                >
                  KP|MED
                </Text>
                <Text style={[styles.modernTagline, { color: finalTextColor }]}>MEDICAL EXCELLENCE</Text>
              </View>
            )}
          </Container>
        );

      case 'badge':
        return (
          <Container style={styles.container} onPress={onPress}>
            <Animated.View style={[styles.badgeContainer, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#4CAF50', '#66BB6A']}
                style={[styles.badgeBackground, { width: iconSize, height: iconSize }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Shield size={iconSize * 0.5} color="white" />
              </LinearGradient>
            </Animated.View>
            {showText && (
              <View style={styles.badgeTextContainer}>
                <Text
                  style={[
                    styles.badgeTitle,
                    { color: finalTextColor, fontSize: size === 'small' ? 18 : size === 'large' ? 28 : 22 },
                  ]}
                >
                  KPMed
                </Text>
                <Text style={[styles.badgeSubtitle, { color: finalTextColor }]}>Prüfungsvorbereitung</Text>
              </View>
            )}
          </Container>
        );

      case 'minimalist':
        return (
          <Container style={styles.container} onPress={onPress}>
            <Animated.View style={[styles.minimalistContainer, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#4CAF50', '#66BB6A']}
                style={[styles.minimalistBackground, { width: iconSize * 0.8, height: iconSize * 0.8 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.minimalistText, { fontSize: iconSize * 0.35 }]}>KP</Text>
                <Animated.View style={[styles.plusIcon, { transform: [{ rotate }] }]}>
                  <Plus size={iconSize * 0.25} color="white" strokeWidth={3} />
                </Animated.View>
              </LinearGradient>
            </Animated.View>
            {showText && size !== 'small' && (
              <Text style={[styles.minimalistTagline, { color: finalTextColor }]}>Medical Training Platform</Text>
            )}
          </Container>
        );

      case 'medical':
        const handleMouseEnter = () => {
          setIsHovered(true);
          Animated.spring(hoverScale, {
            toValue: 1.05,
            useNativeDriver: true,
            friction: 3,
          }).start();
        };

        const handleMouseLeave = () => {
          setIsHovered(false);
          Animated.spring(hoverScale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 3,
          }).start();
        };

        return (
          <Container
            style={styles.container}
            onPress={onPress}
            {...(Platform.OS === 'web' && {
              onMouseEnter: handleMouseEnter,
              onMouseLeave: handleMouseLeave,
              style: { cursor: onPress ? 'pointer' : 'default' } as any,
            })}
          >
            <Animated.View
              style={[
                styles.medicalContainer,
                {
                  transform: [{ scale: hoverScale }],
                },
              ]}
            >
              {/* Professional logo branding with gradient text (web only) */}
              <View style={styles.medicalLogoContainer}>
                {showText && Platform.OS === 'web' ? (
                  <View
                    style={{
                      background: 'linear-gradient(135deg, #FF8C42 0%, #FF6B6B 100%)' as any,
                      WebkitBackgroundClip: 'text' as any,
                      WebkitTextFillColor: 'transparent' as any,
                      backgroundClip: 'text' as any,
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontWeight: '800',
                      fontSize: size === 'small' ? 22 : size === 'large' ? 32 : 26,
                      letterSpacing: -0.5,
                      textAlign: 'center' as any,
                      transition: 'all 0.3s ease' as any,
                    }}
                  >
                    KP Med
                  </View>
                ) : showText ? (
                  <Text
                    style={[
                      styles.medicalBrandText,
                      {
                        fontSize: size === 'small' ? 22 : size === 'large' ? 32 : 26,
                        fontFamily: 'Inter',
                      },
                    ]}
                  >
                    KP Med
                  </Text>
                ) : null}
              </View>
            </Animated.View>
          </Container>
        );

      case 'premium':
      default:
        return (
          <Container style={styles.container} onPress={onPress}>
            <View style={styles.premiumLogoSection}>
              <Animated.View style={[styles.premiumContainer, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                  colors={['#B8755C', '#E2827F', '#B87E70']}
                  style={[styles.premiumBackground, { width: iconSize, height: iconSize }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Heart size={iconSize * 0.5} color="white" fill="white" strokeWidth={2} />
                </LinearGradient>
                <View
                  style={[
                    styles.premiumOverlay,
                    {
                      width: iconSize * 0.5,
                      height: iconSize * 0.3,
                      top: iconSize * 0.35,
                    },
                  ]}
                >
                  <Text style={[styles.premiumInitials, { fontSize: iconSize * 0.18 }]}>KP</Text>
                </View>
              </Animated.View>
              {showText && (
                <View style={styles.premiumTextContainer}>
                  <Text
                    style={[
                      styles.premiumText,
                      {
                        color: finalTextColor,
                        fontSize: size === 'small' ? 20 : size === 'large' ? 32 : 26,
                      },
                    ]}
                  >
                    KP Med
                  </Text>
                  {(size === 'large' || size === 'medium') && (
                    <Text style={[styles.premiumSubtext, { color: finalTextColor }]}>
                      Professional Medical Training
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Container>
        );
    }
  };

  return renderLogo();
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modern Variant (KP|MED)
  modernIconContainer: {
    marginRight: 12,
  },
  modernIcon: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modernTextContainer: {
    alignItems: 'flex-start',
  },
  modernBrand: {
    fontFamily: 'System',
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  modernTagline: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.8,
    marginTop: -2,
  },

  // Badge Variant
  badgeContainer: {
    marginRight: 10,
  },
  badgeBackground: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeTextContainer: {
    alignItems: 'flex-start',
  },
  badgeTitle: {
    fontFamily: 'System',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  badgeSubtitle: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
    marginTop: -2,
  },

  // Minimalist Variant (KP+)
  minimalistContainer: {
    marginRight: 8,
  },
  minimalistBackground: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  minimalistText: {
    fontFamily: 'System',
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  plusIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#66BB6A',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  minimalistTagline: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.6,
    marginLeft: 4,
  },

  // Medical Variant - Professional branding (no button background)
  medicalContainer: {
    position: 'relative',
  },
  medicalLogoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicalBrandText: {
    fontFamily: 'System',
    fontWeight: '800',
    color: '#FB923C', // Orange-400 for brand color
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  // Premium Variant
  premiumLogoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumContainer: {
    marginRight: 12,
    position: 'relative',
  },
  premiumBackground: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(184, 117, 92, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumOverlay: {
    position: 'absolute',
    left: '50%',
    marginLeft: -12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumInitials: {
    fontFamily: 'System',
    fontWeight: '800',
    color: '#B8755C',
    letterSpacing: 0.5,
  },
  premiumTextContainer: {
    alignItems: 'flex-start',
  },
  premiumText: {
    fontFamily: 'System',
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  premiumSubtext: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.7,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
