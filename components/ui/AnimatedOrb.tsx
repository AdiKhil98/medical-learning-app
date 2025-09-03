import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface AnimatedOrbProps {
  onPress: () => void;
  isActive: boolean;
  size?: number;
}

export default function AnimatedOrb({ onPress, isActive, size = 180 }: AnimatedOrbProps) {
  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);
  const pulseScale = useSharedValue(1);
  const innerRotation = useSharedValue(0);

  useEffect(() => {
    // Continuous slow rotation (like the Spline original)
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // Counter-rotating inner elements
    innerRotation.value = withRepeat(
      withTiming(-360, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );

    if (isActive) {
      // Active state animations
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0.6, { duration: 1500 })
        ),
        -1,
        true
      );

      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      // Idle state
      scale.value = withTiming(1, { duration: 500 });
      glowOpacity.value = withTiming(0.6, { duration: 500 });
      pulseScale.value = withTiming(1, { duration: 500 });
    }
  }, [isActive]);

  // Animated styles
  const mainOrbStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value * pulseScale.value }
    ],
  }));

  const innerOrbStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${innerRotation.value}deg` },
      { scale: interpolate(pulseScale.value, [1, 1.05], [1, 1.1]) }
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={[styles.container, { width: size * 1.5, height: size * 1.5 }]}>
      {/* Outer glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size * 0.7,
          },
          glowStyle
        ]}
      />

      {/* Main touchable orb */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[styles.orbTouchable, { width: size, height: size }]}
      >
        {/* Rotating outer layer */}
        <Animated.View 
          style={[
            styles.orbLayer,
            { width: size, height: size },
            mainOrbStyle
          ]}
        >
          <Image
            source={require('@/assets/images/celestial-orb.png')}
            style={[styles.orbImage, { width: size, height: size }]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Counter-rotating inner layer for depth */}
        <Animated.View 
          style={[
            styles.innerLayer,
            { 
              width: size * 0.8, 
              height: size * 0.8,
              borderRadius: size * 0.4 
            },
            innerOrbStyle
          ]}
        />
      </TouchableOpacity>

      {/* Additional floating particles for active state */}
      {isActive && (
        <View style={styles.particleContainer}>
          {[...Array(6)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${20 + i * 10}%`,
                  top: `${25 + i * 8}%`,
                  animationDelay: `${i * 200}ms`
                }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 0.8,
    elevation: 20,
  },
  orbTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    position: 'relative',
  },
  orbLayer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbImage: {
    borderRadius: 90, // Will be overridden by dynamic size
  },
  innerLayer: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  particleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 1,
  },
});