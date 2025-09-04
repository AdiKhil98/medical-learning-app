import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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

const { width } = Dimensions.get('window');

interface CelestialOrbProps {
  onPress: () => void;
  isActive: boolean;
  size?: number;
  theme?: 'green' | 'blue';
}

export default function CelestialOrb({ 
  onPress, 
  isActive, 
  size = 160,
  theme = 'green'
}: CelestialOrbProps) {
  // Animation values
  const mainRotation = useSharedValue(0);
  const innerRotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowIntensity = useSharedValue(0.3);
  const flowAnimation = useSharedValue(0);
  const ringScale1 = useSharedValue(1);
  const ringScale2 = useSharedValue(1);
  const ringOpacity1 = useSharedValue(0);
  const ringOpacity2 = useSharedValue(0);
  const energyFlow = useSharedValue(0);

  // Theme colors
  const colors = {
    green: {
      outer: ['#1a5f3f', '#2d8659', '#4CAF50'],
      inner: ['#66BB6A', '#81C784', '#A5D6A7'],
      accent: ['#E8F5E8', '#C8E6C9', '#FFFFFF'],
      glow: '#4CAF50'
    },
    blue: {
      outer: ['#1a237e', '#3949ab', '#3f51b5'],
      inner: ['#5c6bc0', '#7986cb', '#9fa8da'],
      accent: ['#e8eaf6', '#c5cae9', '#FFFFFF'],
      glow: '#3f51b5'
    }
  };

  const currentColors = colors[theme];

  useEffect(() => {
    // Continuous rotation
    mainRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    innerRotation.value = withRepeat(
      withTiming(-360, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );

    // Flow animation
    flowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
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

      glowIntensity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500 }),
          withTiming(0.4, { duration: 1500 })
        ),
        -1,
        true
      );

      // Energy rings
      ringScale1.value = withRepeat(
        withTiming(3, { duration: 3000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );

      ringOpacity1.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 0 }),
          withTiming(0, { duration: 3000 })
        ),
        -1,
        false
      );

      ringScale2.value = withRepeat(
        withTiming(2.5, { duration: 4000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );

      ringOpacity2.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 500 }),
          withTiming(0, { duration: 3500 })
        ),
        -1,
        false
      );

      energyFlow.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      // Idle state
      scale.value = withTiming(1, { duration: 500 });
      glowIntensity.value = withTiming(0.3, { duration: 500 });
      ringOpacity1.value = withTiming(0, { duration: 500 });
      ringOpacity2.value = withTiming(0, { duration: 500 });
      energyFlow.value = withTiming(0.2, { duration: 500 });
    }
  }, [isActive]);

  // Animated styles
  const mainOrbStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${mainRotation.value}deg` },
      { scale: scale.value }
    ],
  }));

  const innerOrbStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${innerRotation.value}deg` },
      { scale: interpolate(flowAnimation.value, [0, 1], [0.8, 1.2]) }
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale1.value }],
    opacity: ringOpacity1.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale2.value }],
    opacity: ringOpacity2.value,
  }));

  const energyFlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(energyFlow.value, [0, 1], [0.3, 0.8]),
    transform: [
      { scale: interpolate(energyFlow.value, [0, 1], [1, 1.1]) }
    ]
  }));

  return (
    <View style={[styles.container, { width: size * 2, height: size * 2 }]}>
      {/* Energy rings */}
      <Animated.View 
        style={[
          styles.energyRing, 
          { width: size * 1.5, height: size * 1.5, borderRadius: size * 0.75 },
          ring1Style
        ]}
      >
        <LinearGradient
          colors={[`${currentColors.glow}60`, `${currentColors.glow}20`, 'transparent']}
          style={[styles.ringGradient, { borderRadius: size * 0.75 }]}
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.energyRing, 
          { width: size * 1.3, height: size * 1.3, borderRadius: size * 0.65 },
          ring2Style
        ]}
      >
        <LinearGradient
          colors={[`${currentColors.glow}40`, `${currentColors.glow}15`, 'transparent']}
          style={[styles.ringGradient, { borderRadius: size * 0.65 }]}
        />
      </Animated.View>

      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          { 
            width: size * 1.4, 
            height: size * 1.4, 
            borderRadius: size * 0.7,
            shadowColor: currentColors.glow
          },
          glowStyle
        ]}
      />

      {/* Main orb container */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[styles.orbTouchable, { width: size, height: size }]}
      >
        <Animated.View 
          style={[
            styles.mainOrb, 
            { width: size, height: size, borderRadius: size / 2 },
            mainOrbStyle
          ]}
        >
          {/* Outer shell */}
          <LinearGradient
            colors={currentColors.outer}
            style={[styles.orbShell, { borderRadius: size / 2 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Inner flowing energy */}
          <Animated.View 
            style={[
              styles.innerEnergy,
              { 
                width: size * 0.7, 
                height: size * 0.7, 
                borderRadius: size * 0.35 
              },
              innerOrbStyle,
              energyFlowStyle
            ]}
          >
            <LinearGradient
              colors={currentColors.inner}
              style={[styles.energyGradient, { borderRadius: size * 0.35 }]}
              start={{ x: 0.2, y: 0.2 }}
              end={{ x: 0.8, y: 0.8 }}
            />
          </Animated.View>

          {/* Core light */}
          <View 
            style={[
              styles.core,
              { 
                width: size * 0.3, 
                height: size * 0.3, 
                borderRadius: size * 0.15 
              }
            ]}
          >
            <LinearGradient
              colors={currentColors.accent}
              style={[styles.coreGradient, { borderRadius: size * 0.15 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </View>

          {/* Celestial particles */}
          <View style={styles.particleField}>
            {[...Array(12)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.particle,
                  {
                    left: `${15 + (i * 6)}%`,
                    top: `${20 + (i * 5)}%`,
                    opacity: isActive ? 0.7 : 0.3,
                    backgroundColor: currentColors.accent[2]
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  energyRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGradient: {
    width: '100%',
    height: '100%',
  },
  glow: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 1,
    elevation: 20,
  },
  orbTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mainOrb: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.3,
    elevation: 15,
    position: 'relative',
  },
  orbShell: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  innerEnergy: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  energyGradient: {
    width: '100%',
    height: '100%',
  },
  core: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.8,
    elevation: 10,
  },
  coreGradient: {
    width: '100%',
    height: '100%',
  },
  particleField: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 2,
    shadowOpacity: 0.8,
  },
});