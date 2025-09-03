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

interface SplineOrbProps {
  onPress: () => void;
  isActive: boolean;
  size?: number;
  activeColor?: string[];
  inactiveColor?: string[];
}

export default function SplineOrb({ 
  onPress, 
  isActive, 
  size = 120,
  activeColor = ['#4CAF50', '#66BB6A', '#81C784'],
  inactiveColor = ['#E0E0E0', '#BDBDBD', '#9E9E9E']
}: SplineOrbProps) {
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.2);
  const innerScale = useSharedValue(1);
  const outerRing1 = useSharedValue(1);
  const outerRing2 = useSharedValue(1);
  const ringOpacity1 = useSharedValue(0);
  const ringOpacity2 = useSharedValue(0);
  const pulseBeat = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Main orb pulsing
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      // Continuous rotation
      rotation.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );

      // Enhanced shadow when active
      shadowOpacity.value = withTiming(0.6, { duration: 500 });

      // Inner core pulsing
      innerScale.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500 }),
          withTiming(1.2, { duration: 1500 })
        ),
        -1,
        true
      );

      // Outer rings animation
      outerRing1.value = withRepeat(
        withTiming(2.5, { duration: 2500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );

      ringOpacity1.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(0, { duration: 2500 })
        ),
        -1,
        false
      );

      // Second ring with delay
      outerRing2.value = withRepeat(
        withTiming(2.2, { duration: 3000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );

      ringOpacity2.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500 }),
          withTiming(0, { duration: 2500 })
        ),
        -1,
        false
      );

      // Heartbeat-like pulse
      pulseBeat.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(1.05, { duration: 100 }),
          withTiming(1, { duration: 100 }),
          withTiming(1.03, { duration: 100 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        false
      );
    } else {
      // Reset animations when inactive
      scale.value = withTiming(1, { duration: 300 });
      rotation.value = withTiming(0, { duration: 500 });
      shadowOpacity.value = withTiming(0.2, { duration: 300 });
      innerScale.value = withTiming(1, { duration: 300 });
      outerRing1.value = withTiming(1, { duration: 300 });
      outerRing2.value = withTiming(1, { duration: 300 });
      ringOpacity1.value = withTiming(0, { duration: 300 });
      ringOpacity2.value = withTiming(0, { duration: 300 });
      pulseBeat.value = withTiming(1, { duration: 300 });
    }
  }, [isActive]);

  // Animated styles
  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * pulseBeat.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: shadowOpacity.value,
  }));

  const innerCoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: outerRing1.value }],
    opacity: ringOpacity1.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: outerRing2.value }],
    opacity: ringOpacity2.value,
  }));

  const currentColors = isActive ? activeColor : inactiveColor;

  return (
    <View style={[styles.container, { width: size * 2, height: size * 2 }]}>
      {/* Outer pulsing rings */}
      <Animated.View 
        style={[
          styles.outerRing, 
          { width: size, height: size, borderRadius: size / 2 },
          ring1Style
        ]}
      >
        <LinearGradient
          colors={[`${currentColors[0]}40`, `${currentColors[1]}20`]}
          style={[styles.ringGradient, { borderRadius: size / 2 }]}
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.outerRing, 
          { width: size, height: size, borderRadius: size / 2 },
          ring2Style
        ]}
      >
        <LinearGradient
          colors={[`${currentColors[1]}30`, `${currentColors[2]}15`]}
          style={[styles.ringGradient, { borderRadius: size / 2 }]}
        />
      </Animated.View>

      {/* Main orb */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.orbTouchable, { width: size, height: size }]}
      >
        <Animated.View 
          style={[
            styles.orb, 
            { width: size, height: size, borderRadius: size / 2 },
            orbAnimatedStyle,
            shadowStyle
          ]}
        >
          <LinearGradient
            colors={currentColors}
            style={[styles.orbGradient, { borderRadius: size / 2 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Inner glowing core */}
          <Animated.View 
            style={[
              styles.innerCore,
              { 
                width: size * 0.4, 
                height: size * 0.4, 
                borderRadius: (size * 0.4) / 2 
              },
              innerCoreStyle
            ]}
          >
            <LinearGradient
              colors={isActive ? ['#FFFFFF', currentColors[0]] : ['#F5F5F5', currentColors[2]]}
              style={[styles.coreGradient, { borderRadius: (size * 0.4) / 2 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          {/* Subtle particle effects */}
          <View style={styles.particleContainer}>
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.particle,
                  {
                    left: `${20 + (i * 10)}%`,
                    top: `${25 + (i * 8)}%`,
                    opacity: isActive ? 0.6 : 0.2,
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
  outerRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGradient: {
    width: '100%',
    height: '100%',
  },
  orbTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  orb: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCore: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coreGradient: {
    width: '100%',
    height: '100%',
  },
  particleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
});