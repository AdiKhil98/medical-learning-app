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
  HelpCircle,
  ListChecks,
  AlertCircle,
  Phone,
  MessageSquare,
  Heart,
  Languages,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// FSP-specific tips - focused on language and communication skills
const SIMULATION_TIPS = [
  {
    id: 1,
    category: 'wichtig',
    icon: AlertCircle,
    iconColor: '#fbbf24',
    title: 'Wichtigster Satz',
    text: '"Ich habe keine weitere Fragen"',
    subtext: 'Dieser Satz beendet jede Phase und führt Sie zum Prüfergespräch',
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
    category: 'fsp',
    icon: Languages,
    iconColor: '#10b981',
    title: 'Sprachliche Kompetenz',
    text: 'FSP prüft Ihre deutsche Sprachfähigkeit',
    subtext: 'Medizinische Korrektheit ist zweitrangig - Kommunikation zählt!',
  },
  {
    id: 4,
    category: 'fsp',
    icon: MessageSquare,
    iconColor: '#10b981',
    title: 'Patientenverständlich',
    text: 'Erklären Sie in einfacher Sprache',
    subtext: 'Vermeiden Sie Fachbegriffe gegenüber dem Patienten, erklären Sie verständlich',
  },
  {
    id: 5,
    category: 'fsp',
    icon: Heart,
    iconColor: '#10b981',
    title: 'Empathie zeigen',
    text: 'Zeigen Sie Verständnis für den Patienten',
    subtext: '"Ich verstehe, dass Sie besorgt sind" - Empathie wird bewertet',
  },
  {
    id: 6,
    category: 'tipp',
    icon: Mic,
    iconColor: '#60a5fa',
    title: 'Deutlich sprechen',
    text: 'Klar und in normalem Tempo sprechen',
    subtext: 'Die KI versteht Sie besser bei deutlicher Aussprache',
  },
  {
    id: 7,
    category: 'tipp',
    icon: ListChecks,
    iconColor: '#60a5fa',
    title: 'Strukturiert vorgehen',
    text: 'Systematische Anamnese durchführen',
    subtext: 'Begrüßung → Beschwerden → Fragen → Zusammenfassung → Verabschiedung',
  },
  {
    id: 8,
    category: 'tipp',
    icon: HelpCircle,
    iconColor: '#60a5fa',
    title: 'Nachfragen erlaubt',
    text: 'Bei Unklarheiten ruhig nachfragen',
    subtext: '"Können Sie das genauer beschreiben?" zeigt gute Kommunikation',
  },
  {
    id: 9,
    category: 'tipp',
    icon: Clock,
    iconColor: '#60a5fa',
    title: 'Zeit nehmen',
    text: 'Qualität vor Geschwindigkeit',
    subtext: 'Sie haben 20 Minuten - nutzen Sie die Zeit für gute Kommunikation',
  },
  {
    id: 10,
    category: 'info',
    icon: Mail,
    iconColor: '#a78bfa',
    title: 'Bewertung per E-Mail',
    text: 'Feedback zu Ihrer Sprachkompetenz',
    subtext: 'Sie erhalten eine ausführliche Auswertung innerhalb von 24 Stunden',
  },
];

const ROTATION_INTERVAL_MS = 30000;

// Category badge colors - added FSP-specific category
const CATEGORY_STYLES = {
  wichtig: { bg: '#fef3c7', text: '#92400e', label: 'WICHTIG' },
  bedienung: { bg: '#fee2e2', text: '#991b1b', label: 'BEDIENUNG' },
  fsp: { bg: '#d1fae5', text: '#065f46', label: 'FSP-FOKUS' },
  tipp: { bg: '#dbeafe', text: '#1e40af', label: 'TIPP' },
  info: { bg: '#ede9fe', text: '#5b21b6', label: 'INFO' },
};

interface RotatingTipBannerFSPProps {
  visible?: boolean;
  onDismiss?: () => void;
}

export const RotatingTipBannerFSP: React.FC<RotatingTipBannerFSPProps> = ({ visible = true, onDismiss }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const lastInteraction = useRef(Date.now());

  const goToNext = () => {
    lastInteraction.current = Date.now();
    animateTransition('next');
  };

  const goToPrev = () => {
    lastInteraction.current = Date.now();
    animateTransition('prev');
  };

  const goToTip = (index: number) => {
    if (index === currentTipIndex) return;
    lastInteraction.current = Date.now();
    const direction = index > currentTipIndex ? 'next' : 'prev';
    animateTransition(direction, index);
  };

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

  if (!isVisible) {
    return (
      <TouchableOpacity style={styles.showButton} onPress={handleShow}>
        <LinearGradient
          colors={['#10b981', '#059669']}
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
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
            <Text style={[styles.categoryText, { color: categoryStyle.text }]}>{categoryStyle.label}</Text>
          </View>

          <Text style={styles.counter}>
            {currentTipIndex + 1} von {SIMULATION_TIPS.length}
          </Text>

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
          <TouchableOpacity
            style={styles.navButton}
            onPress={goToPrev}
            hitSlop={{ top: 20, bottom: 20, left: 10, right: 5 }}
          >
            <ChevronLeft size={24} color="#10b981" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.mainContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${currentTip.iconColor}15` }]}>
              <IconComponent size={28} color={currentTip.iconColor} strokeWidth={2} />
            </View>

            <View style={styles.textContent}>
              <Text style={styles.title}>{currentTip.title}</Text>
              <Text style={styles.mainText}>{currentTip.text}</Text>
              <Text style={styles.subText}>{currentTip.subtext}</Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={styles.navButton}
            onPress={goToNext}
            hitSlop={{ top: 20, bottom: 20, left: 5, right: 10 }}
          >
            <ChevronRight size={24} color="#10b981" />
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
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
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
    backgroundColor: '#f0fdf4',
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
    shadowColor: '#10b981',
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

export default RotatingTipBannerFSP;
