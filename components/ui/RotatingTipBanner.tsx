import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { X, Lightbulb } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Tips array - always relevant regardless of simulation phase
const SIMULATION_TIPS = [
  {
    id: 1,
    emoji: '🎤',
    title: 'Mikrofon',
    text: 'Sprechen Sie klar und deutlich',
  },
  {
    id: 2,
    emoji: '➡️',
    title: 'Nächste Phase',
    text: '"Ich habe keine weitere Fragen" → wechselt zur nächsten Phase',
  },
  {
    id: 3,
    emoji: '📍',
    title: 'Widget',
    text: 'Mikrofon-Button: unten rechts (rotes Symbol)',
  },
  {
    id: 4,
    emoji: '⏱️',
    title: 'Tempo',
    text: 'Nehmen Sie sich Zeit - Qualität vor Geschwindigkeit',
  },
  {
    id: 5,
    emoji: '📧',
    title: 'Bewertung',
    text: 'Ergebnis kommt per E-Mail nach der Simulation',
  },
  {
    id: 6,
    emoji: '🏥',
    title: 'Fachsprache',
    text: 'Verwenden Sie deutsche Fachbegriffe',
  },
  {
    id: 7,
    emoji: '❓',
    title: 'Nachfragen',
    text: 'Bei Unklarheiten: Nachfragen ist erlaubt',
  },
  {
    id: 8,
    emoji: '📋',
    title: 'Struktur',
    text: 'Strukturieren Sie Ihre Antworten logisch',
  },
];

const ROTATION_INTERVAL_MS = 60000; // 60 seconds

interface RotatingTipBannerProps {
  visible?: boolean;
  onDismiss?: () => void;
}

export const RotatingTipBanner: React.FC<RotatingTipBannerProps> = ({ visible = true, onDismiss }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the emoji
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Rotate tips every 60 seconds with slide animation
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      // Slide out and fade
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change tip
        setCurrentTipIndex((prev) => (prev + 1) % SIMULATION_TIPS.length);
        // Reset position
        slideAnim.setValue(20);
        // Slide in and fade
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isVisible, fadeAnim, slideAnim]);

  // Handle visibility prop changes
  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  const handleShow = () => {
    setIsVisible(true);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Show small button when dismissed
  if (!isVisible) {
    return (
      <TouchableOpacity style={styles.showButton} onPress={handleShow}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.showButtonGradient}
        >
          <Lightbulb size={16} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const currentTip = SIMULATION_TIPS[currentTipIndex];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Left side - Emoji with pulse */}
        <Animated.View style={[styles.emojiContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.emoji}>{currentTip.emoji}</Text>
        </Animated.View>

        {/* Middle - Content */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.labelRow}>
            <Text style={styles.label}>TIPP</Text>
            <View style={styles.titleBadge}>
              <Text style={styles.titleText}>{currentTip.title}</Text>
            </View>
          </View>
          <Text style={styles.tipText} numberOfLines={2}>
            {currentTip.text}
          </Text>
        </Animated.View>

        {/* Right side - Dismiss */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Progress dots */}
        <View style={styles.dotsContainer}>
          {SIMULATION_TIPS.map((_, index) => (
            <View key={index} style={[styles.dot, index === currentTipIndex && styles.dotActive]} />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    minHeight: 80,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 22,
  },
  contentContainer: {
    flex: 1,
    paddingRight: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    marginRight: 8,
  },
  titleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  titleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  tipText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 6,
    marginLeft: 4,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  showButton: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginVertical: 8,
  },
  showButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default RotatingTipBanner;
