import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';

interface ModernMedicalCardProps {
  title: string;
  icon: React.ComponentType<any>;
  gradient: string[];
  hoverGradient: string[];
  hasContent?: boolean;
  onPress?: () => void;
}

export default function ModernMedicalCard({
  title,
  icon: IconComponent,
  gradient,
  hoverGradient,
  hasContent = false,
  onPress,
}: ModernMedicalCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const iconRotateAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isPressed, setIsPressed] = useState(false);

  // Calculate progress (mock - in real app, this would come from props)
  const progress = hasContent ? 100 : 0;

  useEffect(() => {
    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1000,
      delay: 200,
      useNativeDriver: false,
    }).start();

    // Continuous glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [progress]);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }),
      Animated.spring(translateYAnim, {
        toValue: -12,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }),
      Animated.timing(iconRotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: 1.15,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(arrowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }),
      Animated.timing(iconRotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(arrowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const iconRotate = iconRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '6deg'],
  });

  const arrowTranslate = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.touchable}
      >
        <View style={styles.cardContainer}>
          {/* Main Gradient Card */}
          <LinearGradient
            colors={isPressed ? hoverGradient : gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Grid Pattern Overlay */}
            <View style={styles.gridPattern} />

            {/* Glowing Orb Effect */}
            <Animated.View
              style={[
                styles.glowingOrb,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            />

            {/* BEREIT Corner Badge */}
            {hasContent && (
              <View style={styles.cornerBadge}>
                <Text style={styles.cornerBadgeText}>BEREIT</Text>
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>
              {/* Glass Morphism Icon Container */}
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [
                      { rotate: iconRotate },
                      { scale: iconScaleAnim },
                    ],
                  },
                ]}
              >
                <View style={styles.iconGlass}>
                  <IconComponent size={56} color="#FFFFFF" strokeWidth={2} />
                </View>
              </Animated.View>

              {/* Title */}
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>

              {/* Description (optional) */}
              <Text style={styles.description} numberOfLines={2}>
                Medizinische Kategorie
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: progressWidth },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>

              {/* Modern Button */}
              <View style={styles.button}>
                <LinearGradient
                  colors={isPressed ? ['#FFFFFF', '#FFFFFF'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={[styles.buttonText, isPressed && styles.buttonTextPressed]}>
                    {hasContent ? 'BEREIT' : 'ANSEHEN'}
                  </Text>
                  <Animated.View
                    style={{
                      transform: [{ translateX: arrowTranslate }],
                    }}
                  >
                    <ChevronRight size={20} color={isPressed ? gradient[0] : '#FFFFFF'} strokeWidth={3} />
                  </Animated.View>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>

          {/* Enhanced Shadow (outside gradient for better effect) */}
          <Animated.View
            style={[
              styles.shadowLayer,
              {
                shadowColor: gradient[1],
                shadowOpacity: isPressed ? 0.5 : 0.3,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 24,
  },
  touchable: {
    borderRadius: 24,
  },
  cardContainer: {
    position: 'relative',
    borderRadius: 24,
  },
  card: {
    minHeight: 320,
    borderRadius: 24,
    padding: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  shadowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 40,
    elevation: 20,
    zIndex: -1,
  },
  // Grid Pattern
  gridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: 'transparent',
    // You could add a pattern image here if needed
  },
  // Glowing Orb
  glowingOrb: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 0.8,
  },
  // Corner Badge
  cornerBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 10,
  },
  cornerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  // Content
  content: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 5,
  },
  // Glass Morphism Icon
  iconContainer: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  iconGlass: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  // Title
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  // Description
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 20,
  },
  // Progress Bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    minWidth: 40,
  },
  // Modern Button
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  buttonTextPressed: {
    color: '#EF4444',
  },
});
