import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import {
  X,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Mic,
  Clock,
  Mail,
  Stethoscope,
  HelpCircle,
  ListChecks,
  AlertCircle,
  Phone,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Tip categories with proper icons and detailed content
const SIMULATION_TIPS = [
  {
    id: 1,
    category: 'wichtig',
    icon: AlertCircle,
    iconColor: '#fbbf24',
    title: 'Wichtigster Satz',
    text: '"Ich habe keine weitere Fragen"',
    subtext: 'Dieser Satz beendet jede Phase und führt Sie zum nächsten Schritt',
  },
  {
    id: 2,
    category: 'bedienung',
    icon: Phone,
    iconColor: '#f87171',
    title: 'Mikrofon starten',
    text: 'Rotes Telefon-Symbol unten rechts',
    subtext: 'Tippen Sie darauf, um die Sprachverbindung zu starten',
  },
  {
    id: 3,
    category: 'tipp',
    icon: Mic,
    iconColor: '#60a5fa',
    title: 'Deutlich sprechen',
    text: 'Klar und in normalem Tempo sprechen',
    subtext: 'Die KI versteht Sie besser bei deutlicher Aussprache',
  },
  {
    id: 4,
    category: 'tipp',
    icon: Clock,
    iconColor: '#60a5fa',
    title: 'Zeit nehmen',
    text: 'Qualität vor Geschwindigkeit',
    subtext: 'Sie haben 20 Minuten - nutzen Sie die Zeit für gründliche Anamnese',
  },
  {
    id: 5,
    category: 'tipp',
    icon: Stethoscope,
    iconColor: '#60a5fa',
    title: 'Fachsprache nutzen',
    text: 'Deutsche medizinische Fachbegriffe verwenden',
    subtext: 'Z.B. "Dyspnoe" statt "Atemnot", "Cephalgie" statt "Kopfschmerzen"',
  },
  {
    id: 6,
    category: 'tipp',
    icon: ListChecks,
    iconColor: '#60a5fa',
    title: 'Strukturiert vorgehen',
    text: 'Systematische Anamnese durchführen',
    subtext: 'Aktuelle Beschwerden → Vorerkrankungen → Medikamente → Soziales',
  },
  {
    id: 7,
    category: 'tipp',
    icon: HelpCircle,
    iconColor: '#60a5fa',
    title: 'Nachfragen erlaubt',
    text: 'Bei Unklarheiten ruhig nachfragen',
    subtext: 'Der Patient beantwortet Ihre Fragen gerne ausführlicher',
  },
  {
    id: 8,
    category: 'info',
    icon: Mail,
    iconColor: '#a78bfa',
    title: 'Bewertung per E-Mail',
    text: 'Detailliertes Feedback nach der Simulation',
    subtext: 'Sie erhalten eine ausführliche Auswertung innerhalb von 24 Stunden',
  },
];

const ROTATION_INTERVAL_MS = 30000; // 30 seconds

// Category badge colors
const CATEGORY_STYLES = {
  wichtig: { bg: '#fef3c7', text: '#92400e', label: 'WICHTIG' },
  bedienung: { bg: '#fee2e2', text: '#991b1b', label: 'BEDIENUNG' },
  tipp: { bg: '#dbeafe', text: '#1e40af', label: 'TIPP' },
  info: { bg: '#ede9fe', text: '#5b21b6', label: 'INFO' },
};

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
    const slideOut = direction === 'next' ? -20 : 20;
    const slideIn = direction === 'next' ? 20 : -20;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: slideOut,
        duration: 120,
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
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          goToNext();
        } else if (gestureState.dx > 40) {
          goToPrev();
        }
      },
    })
  ).current;

  // Auto-rotate tips
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteraction.current;
      if (timeSinceInteraction >= ROTATION_INTERVAL_MS) {
        goToNext();
      }
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isVisible]);

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

  // Collapsed state - small floating button
  if (!isVisible) {
    return (
      <TouchableOpacity style={styles.showButton} onPress={handleShow}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.showButtonGradient}
        >
          <Lightbulb size={18} color="#ffffff" />
        </LinearGradient>
        <View style={styles.showButtonBadge}>
          <Text style={styles.showButtonBadgeText}>?</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const currentTip = SIMULATION_TIPS[currentTipIndex];
  const categoryStyle = CATEGORY_STYLES[currentTip.category as keyof typeof CATEGORY_STYLES];
  const IconComponent = currentTip.icon;

  return (
    <Animated.View style={[styles.container]} {...panResponder.panHandlers}>
      {/* Main card */}
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.header}>
          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
            <Text style={[styles.categoryText, { color: categoryStyle.text }]}>{categoryStyle.label}</Text>
          </View>

          {/* Counter */}
          <Text style={styles.counter}>
            {currentTipIndex + 1} von {SIMULATION_TIPS.length}
          </Text>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Content row */}
        <View style={styles.contentRow}>
          {/* Left nav */}
          <TouchableOpacity
            style={styles.navButton}
            onPress={goToPrev}
            hitSlop={{ top: 20, bottom: 20, left: 10, right: 5 }}
          >
            <ChevronLeft size={24} color="#6366f1" />
          </TouchableOpacity>

          {/* Icon and text */}
          <Animated.View
            style={[
              styles.mainContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Icon circle */}
            <View style={[styles.iconCircle, { backgroundColor: `${currentTip.iconColor}15` }]}>
              <IconComponent size={28} color={currentTip.iconColor} strokeWidth={2} />
            </View>

            {/* Text content */}
            <View style={styles.textContent}>
              <Text style={styles.title}>{currentTip.title}</Text>
              <Text style={styles.mainText}>{currentTip.text}</Text>
              <Text style={styles.subText}>{currentTip.subtext}</Text>
            </View>
          </Animated.View>

          {/* Right nav */}
          <TouchableOpacity
            style={styles.navButton}
            onPress={goToNext}
            hitSlop={{ top: 20, bottom: 20, left: 5, right: 10 }}
          >
            <ChevronRight size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {SIMULATION_TIPS.map((tip, index) => {
            const isActive = index === currentTipIndex;
            return (
              <TouchableOpacity
                key={tip.id}
                onPress={() => goToTip(index)}
                hitSlop={{ top: 8, bottom: 8, left: 3, right: 3 }}
              >
                <View
                  style={[
                    styles.dot,
                    isActive && styles.dotActive,
                    isActive && { backgroundColor: currentTip.iconColor },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Swipe hint - only show on first tip */}
        {currentTipIndex === 0 && <Text style={styles.swipeHint}>← Wischen oder tippen Sie die Pfeile →</Text>}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  counter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  mainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  dotActive: {
    width: 20,
    borderRadius: 4,
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
  },
  showButton: {
    position: 'absolute',
    right: 16,
    top: 8,
    zIndex: 100,
  },
  showButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  showButtonBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  showButtonBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default RotatingTipBanner;
