import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { X, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    text: '"Ich habe keine weitere Fragen" → nächste Phase',
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
    text: 'Nehmen Sie sich Zeit - Qualität zählt',
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

const ROTATION_INTERVAL_MS = 45000; // 45 seconds auto-rotation

interface RotatingTipBannerProps {
  visible?: boolean;
  onDismiss?: () => void;
}

export const RotatingTipBanner: React.FC<RotatingTipBannerProps> = ({ visible = true, onDismiss }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const lastInteraction = useRef(Date.now());

  // Navigate to next tip
  const goToNext = () => {
    lastInteraction.current = Date.now();
    animateTransition('next');
  };

  // Navigate to previous tip
  const goToPrev = () => {
    lastInteraction.current = Date.now();
    animateTransition('prev');
  };

  // Navigate to specific tip
  const goToTip = (index: number) => {
    if (index === currentTipIndex) return;
    lastInteraction.current = Date.now();
    const direction = index > currentTipIndex ? 'next' : 'prev';
    animateTransition(direction, index);
  };

  // Animate transition between tips
  const animateTransition = (direction: 'next' | 'prev', specificIndex?: number) => {
    const slideOut = direction === 'next' ? -30 : 30;
    const slideIn = direction === 'next' ? 30 : -30;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: slideOut,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (specificIndex !== undefined) {
        setCurrentTipIndex(specificIndex);
      } else {
        setCurrentTipIndex((prev) =>
          direction === 'next'
            ? (prev + 1) % SIMULATION_TIPS.length
            : (prev - 1 + SIMULATION_TIPS.length) % SIMULATION_TIPS.length
        );
      }
      slideAnim.setValue(slideIn);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          goToNext();
        } else if (gestureState.dx > 50) {
          goToPrev();
        }
      },
    })
  ).current;

  // Auto-rotate tips (resets after manual interaction)
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteraction.current;
      if (timeSinceInteraction >= ROTATION_INTERVAL_MS) {
        animateTransition('next');
      }
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isVisible]);

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
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} {...panResponder.panHandlers}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Left arrow - tap to go previous */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToPrev}
          hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
        >
          <ChevronLeft size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Center content */}
        <View style={styles.centerContent}>
          {/* Emoji circle */}
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{currentTip.emoji}</Text>
          </View>

          {/* Text content */}
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
              <Text style={styles.counter}>
                {currentTipIndex + 1}/{SIMULATION_TIPS.length}
              </Text>
            </View>
            <Text style={styles.tipText} numberOfLines={2}>
              {currentTip.text}
            </Text>
          </Animated.View>
        </View>

        {/* Right arrow - tap to go next */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToNext}
          hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
        >
          <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Dismiss button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Progress dots - tappable */}
        <View style={styles.dotsContainer}>
          {SIMULATION_TIPS.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToTip(index)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <View style={[styles.dot, index === currentTipIndex && styles.dotActive]} />
            </TouchableOpacity>
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
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    minHeight: 85,
  },
  navButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  emoji: {
    fontSize: 20,
  },
  contentContainer: {
    flex: 1,
    paddingRight: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
    marginRight: 6,
  },
  titleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  titleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  counter: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 'auto',
    marginRight: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 18,
    fontWeight: '500',
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 16,
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
