import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Mic, MicOff, Volume2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface VoiceMicrophoneProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  onInitialize: () => void;
  isInitialized: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  conversationText?: string;
  size?: number;
}

const { width } = Dimensions.get('window');

export default function VoiceMicrophone({
  onStartRecording,
  onStopRecording,
  onInitialize,
  isInitialized,
  isRecording,
  isProcessing,
  conversationText,
  size = 120
}: VoiceMicrophoneProps) {
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const rippleAnimation = useRef(new Animated.Value(0)).current;
  const [showConversation, setShowConversation] = useState(false);

  // Pulse animation for idle state
  useEffect(() => {
    if (isInitialized && !isRecording && !isProcessing) {
      const pulseSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseSequence.start();
      return () => pulseSequence.stop();
    } else {
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isInitialized, isRecording, isProcessing]);

  // Recording ripple effect
  useEffect(() => {
    if (isRecording) {
      const rippleSequence = Animated.loop(
        Animated.timing(rippleAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      rippleSequence.start();
      return () => {
        rippleSequence.stop();
        rippleAnimation.setValue(0);
      };
    }
  }, [isRecording]);

  // Show conversation text effect
  useEffect(() => {
    if (conversationText && conversationText.trim()) {
      setShowConversation(true);
      const timer = setTimeout(() => {
        setShowConversation(false);
      }, 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [conversationText]);

  const handlePress = () => {
    if (!isInitialized) {
      onInitialize();
      return;
    }

    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
      // Press animation
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const getMicrophoneIcon = () => {
    if (isProcessing) {
      return <Volume2 size={size * 0.4} color="#ffffff" />;
    }
    if (isRecording) {
      return <MicOff size={size * 0.4} color="#ffffff" />;
    }
    return <Mic size={size * 0.4} color="#ffffff" />;
  };

  const getStatusText = () => {
    if (!isInitialized) return 'Zum Initialisieren tippen';
    if (isProcessing) return 'Verarbeitung...';
    if (isRecording) return 'Aufnahme läuft - Zum Stoppen tippen';
    return 'Zum Sprechen tippen';
  };

  const getStatusColor = () => {
    if (!isInitialized) return '#f59e0b';
    if (isProcessing) return '#3b82f6';
    if (isRecording) return '#ef4444';
    return '#22c55e';
  };

  const getGradientColors = () => {
    if (!isInitialized) return ['#fbbf24', '#f59e0b'];
    if (isProcessing) return ['#60a5fa', '#3b82f6'];
    if (isRecording) return ['#f87171', '#ef4444'];
    return ['#4ade80', '#22c55e'];
  };

  return (
    <View style={styles.container}>
      {/* Conversation Text Overlay */}
      {showConversation && conversationText && (
        <Animated.View 
          style={[
            styles.conversationOverlay,
            {
              opacity: showConversation ? 1 : 0,
            }
          ]}
        >
          <View style={styles.conversationBubble}>
            <Text style={styles.conversationText}>{conversationText}</Text>
          </View>
        </Animated.View>
      )}

      {/* Recording Ripple Effects */}
      {isRecording && (
        <>
          <Animated.View
            style={[
              styles.ripple,
              {
                width: size * 2,
                height: size * 2,
                borderRadius: size,
                transform: [
                  {
                    scale: rippleAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.5],
                    }),
                  },
                ],
                opacity: rippleAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ripple,
              {
                width: size * 1.6,
                height: size * 1.6,
                borderRadius: size * 0.8,
                transform: [
                  {
                    scale: rippleAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
                opacity: rippleAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 0],
                }),
              },
            ]}
          />
        </>
      )}

      {/* Main Microphone Button */}
      <Animated.View
        style={[
          {
            transform: [
              { scale: Animated.multiply(pulseAnimation, scaleAnimation) },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.microphoneButton, { width: size, height: size, borderRadius: size / 2 }]}
          onPress={handlePress}
          activeOpacity={0.8}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={getGradientColors()}
            style={[styles.gradientButton, { width: size, height: size, borderRadius: size / 2 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {getMicrophoneIcon()}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Status Text */}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Visual indicators */}
      <View style={styles.indicatorContainer}>
        <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.indicatorText}>
          {!isInitialized ? 'Bereit' : isRecording ? 'Aufnahme' : isProcessing ? 'Verarbeitung' : 'Aktiv'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 20,
  },
  conversationOverlay: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  conversationBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  conversationText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    lineHeight: 22,
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  microphoneButton: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  gradientButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  indicatorText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});