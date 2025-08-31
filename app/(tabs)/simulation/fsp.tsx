import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, Alert, Linking } from 'react-native';
import { ChevronLeft, Mic } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSimulationTimer } from '@/hooks/useSimulationTimer';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Floating particles component
function FloatingParticles() {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    delay: Math.random() * 5000,
    duration: 3000 + Math.random() * 4000,
  }));

  return (
    <View style={styles.particlesContainer}>
      {particles.map((particle) => (
        <FloatingParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

function FloatingParticle({ particle }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.2);
  const scale = useSharedValue(1);

  useEffect(() => {
    const animate = () => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-20, { duration: particle.duration / 2 }),
          withTiming(0, { duration: particle.duration / 2 })
        ),
        -1,
        false
      );
      
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: particle.duration / 2 }),
          withTiming(0.2, { duration: particle.duration / 2 })
        ),
        -1,
        false
      );
      
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: particle.duration / 2 }),
          withTiming(1, { duration: particle.duration / 2 })
        ),
        -1,
        false
      );
    };

    const timeout = setTimeout(animate, particle.delay);
    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          top: particle.y,
        },
        animatedStyle,
      ]}
    />
  );
}

// Animated microphone button component
function MicrophoneButton({ onPress, isActive }) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const ringScale1 = useSharedValue(1);
  const ringScale2 = useSharedValue(1);
  const ringOpacity1 = useSharedValue(0);
  const ringOpacity2 = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
      ringScale1.value = withRepeat(
        withTiming(2, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      ringOpacity1.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 0 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        false
      );
      ringScale2.value = withRepeat(
        withTiming(2.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      ringOpacity2.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(0.6, { duration: 0 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
      rotation.value = withTiming(0, { duration: 300 });
      ringOpacity1.value = withTiming(0, { duration: 300 });
      ringOpacity2.value = withTiming(0, { duration: 300 });
    }
  }, [isActive]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  const ring1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale1.value }],
    opacity: ringOpacity1.value,
  }));

  const ring2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale2.value }],
    opacity: ringOpacity2.value,
  }));

  return (
    <View style={styles.microphoneContainer}>
      <Animated.View style={[styles.ring, ring1AnimatedStyle]} />
      <Animated.View style={[styles.ring, ring2AnimatedStyle]} />
      
      <TouchableOpacity
        style={styles.microphoneButton}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.microphoneButtonInner, buttonAnimatedStyle]}>
          {isActive ? (
            <View style={styles.stopIcon} />
          ) : (
            <Mic size={32} color="#1e40af" />
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

export default function FSPSimulationScreen() {
  const router = useRouter();
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [voiceflowLoaded, setVoiceflowLoaded] = useState(false);
  const scrollViewRef = useRef(null);
  
  const { formattedTime, isTimeUp, resetTimer } = useSimulationTimer({
    isActive: simulationStarted,
    onTimeUp: () => {
      setSimulationStarted(false);
    }
  });

  // Load Voiceflow script and set up event listeners
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('🔄 Starting FSP Voiceflow script load...');
      
      const script = document.createElement('script');
      script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
      script.type = 'text/javascript';
      script.onload = () => {
        console.log('📦 FSP Voiceflow script loaded from CDN');
        
        try {
          if (window.voiceflow && window.voiceflow.chat) {
            console.log('✅ FSP Voiceflow object found, initializing...');
            window.voiceflow.chat.load({
              verify: { projectID: '68b40ab94a5a50553729c86b' },
              url: 'https://general-runtime.voiceflow.com',
              versionID: '68b40ab94a5a50553729c86c',
              voice: {
                url: 'https://runtime-api.voiceflow.com'
              }
            });
            setVoiceflowLoaded(true);
            console.log('🚀 FSP Voiceflow chat loaded successfully with config:', {
              projectID: '68b40ab94a5a50553729c86b',
              versionID: '68b40ab94a5a50553729c86c'
            });
            
            // Set up event listeners for widget interactions
            const handleVoiceflowEvent = (eventType, data) => {
              console.log(`🔍 FSP Voiceflow Event: ${eventType}`, data);
              if (!simulationStarted && (eventType === 'voiceflow:open' || eventType === 'voiceflow:interact' || eventType === 'voiceflow:launch')) {
                console.log('🚀 Starting FSP simulation timer');
                setSimulationStarted(true);
                resetTimer();
              }
            };
            
            // Listen for all possible Voiceflow events
            const messageListener = (event) => {
              // Debug: log all messages to see what we're receiving
              if (event.data && typeof event.data === 'object') {
                console.log('📬 FSP Message received:', event.data);
                
                if (event.data.type && event.data.type.startsWith('voiceflow:')) {
                  handleVoiceflowEvent(event.data.type, event.data);
                }
              }
            };
            
            window.addEventListener('message', messageListener);
            
            // Store the listener for cleanup
            window.fspMessageListener = messageListener;
            
          } else {
            console.error('❌ FSP Voiceflow object not found on window');
            setTimeout(() => {
              if (window.voiceflow && window.voiceflow.chat) {
                console.log('⏰ FSP Voiceflow found after delay, initializing...');
                window.voiceflow.chat.load({
                  verify: { projectID: '68b40ab94a5a50553729c86b' },
                  url: 'https://general-runtime.voiceflow.com',
                  versionID: '68b40ab94a5a50553729c86c',
                  voice: {
                    url: 'https://runtime-api.voiceflow.com'
                  }
                });
                setVoiceflowLoaded(true);
                console.log('🚀 FSP Voiceflow loaded after delay');
              }
            }, 1000);
          }
        } catch (error) {
          console.error('❌ Error loading FSP Voiceflow:', error);
        }
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load FSP Voiceflow script from CDN:', error);
        console.error('Script URL:', script.src);
      };
      
      console.log('📡 Adding FSP Voiceflow script to document head...');
      document.head.appendChild(script);
      
      return () => {
        // Cleanup script
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
        // Cleanup event listener
        if (window.fspMessageListener) {
          window.removeEventListener('message', window.fspMessageListener);
          delete window.fspMessageListener;
        }
      };
    }
  }, [simulationStarted, resetTimer]);

  // Handle back button and navigation prevention
  useEffect(() => {
    const handleBackPress = () => {
      if (simulationStarted) {
        // Prevent navigation during simulation
        Alert.alert(
          'Simulation läuft',
          'Sie können die Simulation nicht verlassen, während sie läuft. Möchten Sie die Simulation beenden?',
          [
            { text: 'Weiter', style: 'cancel' },
            { 
              text: 'Simulation beenden', 
              onPress: () => {
                setSimulationStarted(false);
                resetTimer();
                router.back();
              }
            }
          ]
        );
        return true; // Prevent default back action
      }
      return false; // Allow normal navigation
    };

    // Note: This would typically use a back handler library for React Native
    // For web, we can use beforeunload event
    if (Platform.OS === 'web' && simulationStarted) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Simulation läuft. Möchten Sie wirklich die Seite verlassen?';
        return e.returnValue;
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [simulationStarted, router, resetTimer]);

  const handleEndSimulation = () => {
    setSimulationStarted(false);
    resetTimer();
    console.log('⏹️ FSP Simulation ended by user');
    
    // Close Voiceflow widget if open
    if (Platform.OS === 'web' && window.voiceflow && window.voiceflow.chat) {
      try {
        if (window.voiceflow.chat.close) {
          window.voiceflow.chat.close();
        }
      } catch (error) {
        console.error('❌ Error closing FSP Voiceflow chat:', error);
      }
    }
  };
  
  // Auto-open Voiceflow widget when component mounts and voiceflow is loaded
  useEffect(() => {
    if (voiceflowLoaded && Platform.OS === 'web' && window.voiceflow && window.voiceflow.chat) {
      try {
        setTimeout(() => {
          if (window.voiceflow.chat.open) {
            window.voiceflow.chat.open();
          } else if (window.voiceflow.chat.show) {
            window.voiceflow.chat.show();
          }
          console.log('✅ FSP Voiceflow chat widget auto-opened');
        }, 1000);
      } catch (error) {
        console.error('❌ Error auto-opening FSP Voiceflow chat:', error);
      }
    } else if (voiceflowLoaded && Platform.OS !== 'web') {
      // Mobile: Open in external browser
      const voiceflowUrl = `https://creator.voiceflow.com/prototype/68b40ab94a5a50553729c86b`;
      Linking.canOpenURL(voiceflowUrl).then(supported => {
        if (supported) {
          Linking.openURL(voiceflowUrl);
          console.log('📱 Opened FSP Voiceflow in external browser');
        } else {
          Alert.alert(
            'Browser öffnen',
            'Um den KI-Assistenten zu verwenden, öffnen Sie bitte Ihren Browser.',
            [{ text: 'OK' }]
          );
        }
      }).catch(error => {
        console.error('❌ Error opening browser:', error);
        Alert.alert(
          'Fehler',
          'Der Browser konnte nicht geöffnet werden.',
          [{ text: 'OK' }]
        );
      });
    }
  }, [voiceflowLoaded]);
  
  // Cleanup widget when component unmounts or navigating away
  useEffect(() => {
    return () => {
      console.log('🧹 FSP Simulation cleanup - hiding Voiceflow widget');
      if (Platform.OS === 'web' && window.voiceflow && window.voiceflow.chat) {
        try {
          if (window.voiceflow.chat.hide) {
            window.voiceflow.chat.hide();
          } else if (window.voiceflow.chat.close) {
            window.voiceflow.chat.close();
          }
        } catch (error) {
          console.error('❌ Error hiding Voiceflow widget during cleanup:', error);
        }
      }
      // Reset simulation state
      setSimulationStarted(false);
    };
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Calm gradient background */}
        <LinearGradient
          colors={['#f8fafc', '#e2e8f0']}
          style={styles.gradientBackground}
        />
        
        {/* Floating particles */}
        <FloatingParticles />
        
        {/* Subtle pattern overlay */}
        <View style={styles.patternOverlay} />
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                if (simulationStarted) {
                  Alert.alert(
                    'Simulation beenden',
                    'Sie können die Simulation nicht verlassen, während sie läuft. Möchten Sie die Simulation beenden?',
                    [
                      { text: 'Abbrechen', style: 'cancel' },
                      { 
                        text: 'Simulation beenden',
                        onPress: () => {
                          setSimulationStarted(false);
                          resetTimer();
                          router.back();
                        }
                      }
                    ]
                  );
                } else {
                  router.back();
                }
              }}
            >
              <ChevronLeft size={24} color="#1e40af" />
              <Text style={styles.backButtonText}>Zurück</Text>
            </TouchableOpacity>
            
            {/* Timer Display */}
            {simulationStarted && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{formattedTime}</Text>
              </View>
            )}
            
            {/* Main content */}
            <View style={styles.mainContent}>
              <MicrophoneButton 
                onPress={() => {}}
                isActive={simulationStarted}
              />
              
              <View style={styles.textContent}>
                <Text style={styles.heading}>FSP Simulation</Text>
                <Text style={styles.description}>
                  {simulationStarted 
                    ? (Platform.OS === 'web' 
                        ? "Die Sprach-Simulation läuft - der Voiceflow Chat sollte sich automatisch öffnen" 
                        : "Die Simulation läuft - der KI-Chat wurde im Browser geöffnet"
                      )
                    : "Bereit für Ihre medizinische Sprach-Simulation? Klicken Sie das Mikrofon, um mit dem KI-Assistenten zu sprechen."
                  }
                </Text>
                
                {Platform.OS === 'web' ? (
                  <View style={styles.voiceflowStatus}>
                    <Text style={[styles.statusText, { color: voiceflowLoaded ? '#22c55e' : '#f59e0b' }]}>
                      {voiceflowLoaded ? '✅ Voiceflow bereit' : '⏳ Voiceflow lädt...'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.voiceflowStatus}>
                    <Text style={[styles.statusText, { color: '#3b82f6' }]}>
                      📱 Mobile: Chat öffnet im Browser
                    </Text>
                  </View>
                )}
                
                {simulationStarted && (
                  <TouchableOpacity
                    style={styles.endSimulationButton}
                    onPress={handleEndSimulation}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.endSimulationButtonText}>
                      Simulation beenden
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Status indicator */}
              {simulationStarted && (
                <View style={styles.statusIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.statusText}>Simulation aktiv</Text>
                </View>
              )}
            </View>
            
            <View style={styles.spacer} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  patternOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    opacity: 0.1,
    backgroundColor: 'transparent',
  },
  particlesContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    opacity: 0.4,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    flexGrow: 1,
    minHeight: height,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    zIndex: 10,
  },
  backButtonText: {
    color: '#1e40af',
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginLeft: 4,
  },
  timerContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    zIndex: 10,
  },
  timerText: {
    color: '#1e40af',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  mainContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  microphoneContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    top: 0,
    left: 0,
  },
  microphoneButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(219, 234, 254, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  microphoneButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#1e40af',
    borderRadius: 4,
  },
  voiceflowStatus: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  textContent: {
    alignItems: 'center',
    maxWidth: 350,
    marginBottom: 24,
  },
  heading: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginTop: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  spacer: {
    height: 100,
  },
  endSimulationButton: {
    backgroundColor: '#ef4444',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  endSimulationButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
  },
});