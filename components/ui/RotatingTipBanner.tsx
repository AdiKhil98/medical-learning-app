import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { X, Lightbulb } from 'lucide-react-native';

// Tips array - always relevant regardless of simulation phase
const SIMULATION_TIPS = [
  {
    id: 1,
    icon: '🎤',
    text: 'Sprechen Sie klar und deutlich ins Mikrofon',
  },
  {
    id: 2,
    icon: '➡️',
    text: "'Ich habe keine weitere Fragen' → wechselt zur nächsten Phase",
  },
  {
    id: 3,
    icon: '📍',
    text: 'Mikrofon-Widget: unten rechts (rotes Telefon-Symbol)',
  },
  {
    id: 4,
    icon: '⏱️',
    text: 'Nehmen Sie sich Zeit - Qualität vor Geschwindigkeit',
  },
  {
    id: 5,
    icon: '📧',
    text: 'Ihre Bewertung kommt per E-Mail nach der Simulation',
  },
  {
    id: 6,
    icon: '🏥',
    text: 'Verwenden Sie deutsche Fachbegriffe',
  },
  {
    id: 7,
    icon: '❓',
    text: 'Bei Unklarheiten: Nachfragen ist erlaubt',
  },
  {
    id: 8,
    icon: '📋',
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

  // Rotate tips every 60 seconds
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change tip
        setCurrentTipIndex((prev) => (prev + 1) % SIMULATION_TIPS.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isVisible, fadeAnim]);

  // Handle visibility prop changes
  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleShow = () => {
    setIsVisible(true);
  };

  // Show small button when dismissed
  if (!isVisible) {
    return (
      <TouchableOpacity style={styles.showButton} onPress={handleShow}>
        <Lightbulb size={18} color="#6366f1" />
      </TouchableOpacity>
    );
  }

  const currentTip = SIMULATION_TIPS[currentTipIndex];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.tipIcon}>{currentTip.icon}</Text>
      </View>

      <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
        <Text style={styles.tipLabel}>Tipp</Text>
        <Text style={styles.tipText}>{currentTip.text}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
        <X size={16} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipIcon: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284c7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  showButton: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
});

export default RotatingTipBanner;
