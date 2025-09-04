import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
        {/* Rotating outer layer - Main orb shell */}
        <Animated.View 
          style={[
            styles.orbLayer,
            { width: size, height: size, borderRadius: size / 2 },
            mainOrbStyle
          ]}
        >
          <LinearGradient
            colors={['rgba(135, 206, 250, 0.3)', 'rgba(176, 196, 222, 0.5)', 'rgba(255, 255, 255, 0.8)']}
            style={[styles.orbGradient, { width: size, height: size, borderRadius: size / 2 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          
          {/* Outer crystalline pattern */}
          <View style={[styles.crystallinePattern, { width: size, height: size, borderRadius: size / 2 }]}>
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.crystallineEdge,
                  {
                    transform: [{ rotate: `${i * 45}deg` }],
                    width: size * 0.9,
                    height: 2,
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Counter-rotating inner core */}
        <Animated.View 
          style={[
            styles.innerCore,
            { 
              width: size * 0.6, 
              height: size * 0.6,
              borderRadius: size * 0.3 
            },
            innerOrbStyle
          ]}
        >
          <LinearGradient
            colors={['rgba(30, 144, 255, 0.8)', 'rgba(135, 206, 250, 0.6)', 'rgba(255, 255, 255, 0.9)']}
            style={[styles.coreGradient, { width: '100%', height: '100%', borderRadius: size * 0.3 }]}
            start={{ x: 0.2, y: 0.2 }}
            end={{ x: 0.8, y: 0.8 }}
          />
          
          {/* Central bright core */}
          <View style={[styles.centralCore, { 
            width: size * 0.2, 
            height: size * 0.2, 
            borderRadius: size * 0.1 
          }]} />
        </Animated.View>
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
    backgroundColor: 'rgba(135, 206, 250, 0.4)',
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 25,
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
    shadowColor: 'rgba(255, 255, 255, 0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 0.6,
    elevation: 15,
  },
  orbGradient: {
    position: 'absolute',
  },
  crystallinePattern: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  crystallineEdge: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  innerCore: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    shadowOpacity: 0.7,
    elevation: 10,
  },
  coreGradient: {
    position: 'absolute',
  },
  centralCore: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 1,
    elevation: 8,
  },
  particleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 3,
    shadowOpacity: 0.8,
  },
});