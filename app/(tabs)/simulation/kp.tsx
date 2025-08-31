import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, Alert, Linking } from 'react-native';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSimulationTimer } from '@/hooks/useSimulationTimer';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
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

export default function KPSimulationScreen() {
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
      console.log('🔄 Starting Voiceflow script load...');
      
      const script = document.createElement('script');
      script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
      script.type = 'text/javascript';
      script.onload = () => {
        console.log('📦 Voiceflow script loaded from CDN');
        
        try {
          if (window.voiceflow && window.voiceflow.chat) {
            console.log('✅ Voiceflow object found, initializing...');
            window.voiceflow.chat.load({
              verify: { projectID: '68b40ab270a53105f6701677' },
              url: 'https://general-runtime.voiceflow.com',
              versionID: 'production',
              voice: {
                url: 'https://runtime-api.voiceflow.com'
              }
            });
            setVoiceflowLoaded(true);
            console.log('🚀 Voiceflow chat loaded successfully with config:', {
              projectID: '68b40ab270a53105f6701677',
              versionID: '68b40ab270a53105f6701678'
            });
            
            // Set up multiple detection methods for widget interaction
            const startSimulationTimer = () => {
              if (!simulationStarted) {
                console.log('🚀 Starting KP simulation timer');
                setSimulationStarted(true);
                resetTimer();
              }
            };
            
            // Method 1: Listen for Voiceflow events
            const messageListener = (event) => {
              if (event.data && typeof event.data === 'object') {
                console.log('📬 KP Message received:', event.data);
                if (event.data.type && event.data.type.startsWith('voiceflow:')) {
                  console.log(`🔍 KP Voiceflow Event: ${event.data.type}`);
                  startSimulationTimer();
                }
              }
            };
            
            window.addEventListener('message', messageListener);
            window.kpMessageListener = messageListener;
            
            // Method 2: Monitor widget DOM changes and interactions
            const startWidgetMonitoring = () => {
              let monitoringInterval = null;
              let hasStarted = false;
              
              const checkWidgetInteraction = () => {
                if (hasStarted) return;
                
                // Look for Voiceflow widget elements
                const widgetContainer = document.querySelector('[data-testid="chat"]') || 
                                       document.querySelector('.vfrc-widget') ||
                                       document.querySelector('#voiceflow-chat');
                
                if (widgetContainer) {
                  // Check if widget has messages or input
                  const hasMessages = widgetContainer.querySelector('.vfrc-message') || 
                                     widgetContainer.querySelector('[role="log"]') ||
                                     widgetContainer.textContent.length > 100;
                  
                  const isInputActive = widgetContainer.querySelector('input:focus') ||
                                       widgetContainer.querySelector('textarea:focus');
                  
                  if (hasMessages || isInputActive) {
                    console.log('👁️ KP Widget interaction detected via DOM monitoring');
                    hasStarted = true;
                    startSimulationTimer();
                    if (monitoringInterval) {
                      clearInterval(monitoringInterval);
                    }
                  }
                }
              };
              
              // Start monitoring after widget loads
              setTimeout(() => {
                monitoringInterval = setInterval(checkWidgetInteraction, 1000);
                window.kpMonitoringInterval = monitoringInterval;
                
                // Stop monitoring after 5 minutes to prevent resource waste
                setTimeout(() => {
                  if (monitoringInterval) {
                    clearInterval(monitoringInterval);
                  }
                }, 300000);
              }, 2000);
            };
            
            startWidgetMonitoring();
            
          } else {
            console.error('❌ Voiceflow object not found on window');
            setTimeout(() => {
              if (window.voiceflow && window.voiceflow.chat) {
                console.log('⏰ Voiceflow found after delay, initializing...');
                window.voiceflow.chat.load({
                  verify: { projectID: '68b40ab270a53105f6701677' },
                  url: 'https://general-runtime.voiceflow.com',
                  versionID: 'production',
                  voice: {
                    url: 'https://runtime-api.voiceflow.com'
                  }
                });
                setVoiceflowLoaded(true);
                console.log('🚀 Voiceflow loaded after delay');
              }
            }, 1000);
          }
        } catch (error) {
          console.error('❌ Error loading Voiceflow:', error);
        }
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load Voiceflow script from CDN:', error);
        console.error('Script URL:', script.src);
      };
      
      console.log('📡 Adding Voiceflow script to document head...');
      document.head.appendChild(script);
      
      return () => {
        // Cleanup script
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
        // Cleanup event listener and monitoring
        if (window.kpMessageListener) {
          window.removeEventListener('message', window.kpMessageListener);
          delete window.kpMessageListener;
        }
        if (window.kpMonitoringInterval) {
          clearInterval(window.kpMonitoringInterval);
          delete window.kpMonitoringInterval;
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
    console.log('⏹️ KP Simulation ended by user');
    
    // Close Voiceflow widget if open
    if (Platform.OS === 'web' && window.voiceflow && window.voiceflow.chat) {
      try {
        if (window.voiceflow.chat.close) {
          window.voiceflow.chat.close();
        }
      } catch (error) {
        console.error('❌ Error closing Voiceflow chat:', error);
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
          console.log('✅ Voiceflow chat widget auto-opened');
        }, 1000);
      } catch (error) {
        console.error('❌ Error auto-opening Voiceflow chat:', error);
      }
    } else if (voiceflowLoaded && Platform.OS !== 'web') {
      // Mobile: Open in external browser
      const voiceflowUrl = `https://creator.voiceflow.com/prototype/68b40ab270a53105f6701677`;
      Linking.canOpenURL(voiceflowUrl).then(supported => {
        if (supported) {
          Linking.openURL(voiceflowUrl);
          console.log('📱 Opened Voiceflow in external browser');
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
      console.log('🧹 KP Simulation cleanup - AGGRESSIVE widget removal');
      
      // Stop simulation
      setSimulationStarted(false);
      
      // Cleanup monitoring interval
      if (window.kpMonitoringInterval) {
        clearInterval(window.kpMonitoringInterval);
        delete window.kpMonitoringInterval;
      }
      
      // Aggressive widget removal - try multiple approaches
      const forceRemoveWidget = () => {
        console.log('💯 KP Force removing widget...');
        
        // Method 1: Voiceflow API calls
        if (window.voiceflow && window.voiceflow.chat) {
          try {
            console.log('🔧 KP Calling Voiceflow hide/close/destroy methods');
            window.voiceflow.chat.hide && window.voiceflow.chat.hide();
            window.voiceflow.chat.close && window.voiceflow.chat.close();
            window.voiceflow.chat.destroy && window.voiceflow.chat.destroy();
          } catch (error) {
            console.error('❌ KP Voiceflow API cleanup error:', error);
          }
        }
        
        // Method 2: DOM removal - more aggressive selectors
        const selectors = [
          '[data-testid="chat"]',
          '.vfrc-widget',
          '.vfrc-chat',
          '#voiceflow-chat',
          'iframe[src*="voiceflow"]',
          'iframe[src*="general-runtime"]',
          '[id*="voiceflow"]',
          '[class*="voiceflow"]',
          '[class*="vfrc"]',
          '.widget-container',
          'div[style*="z-index: 1000"]', // Common widget z-index
          'div[style*="position: fixed"]' // Fixed position widgets
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (element && element.parentNode) {
              console.log(`🗑️ KP Removing DOM element: ${selector}`);
              element.style.display = 'none';
              element.parentNode.removeChild(element);
            }
          });
        });
        
        // Method 3: Find and remove any suspicious floating elements
        const allDivs = document.querySelectorAll('div');
        allDivs.forEach(div => {
          const style = window.getComputedStyle(div);
          if (style.position === 'fixed' && 
              (style.zIndex > 999 || div.textContent.includes('Voiceflow') || div.innerHTML.includes('chat'))) {
            console.log('🔍 KP Removing suspicious floating element');
            div.style.display = 'none';
            if (div.parentNode) {
              div.parentNode.removeChild(div);
            }
          }
        });
      };
      
      // Run cleanup immediately and with delays
      forceRemoveWidget();
      setTimeout(forceRemoveWidget, 100);
      setTimeout(forceRemoveWidget, 500);
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
              <View style={styles.textContent}>
                <Text style={styles.heading}>KP Simulation</Text>
                <Text style={styles.description}>
                  {simulationStarted 
                    ? (Platform.OS === 'web' 
                        ? "Die KI-Simulation läuft! Interagieren Sie mit dem Chat-Widget, um zu beginnen." 
                        : "Die Simulation läuft - der KI-Chat wurde im Browser geöffnet."
                      )
                    : "Bereit für Ihre medizinische KI-Simulation? Das Chat-Widget öffnet sich automatisch. Klicken Sie darauf, um die Simulation zu starten."
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
  simulationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 8,
  },
  simulationButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#1d4ed8',
  },
  simulationButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#3b82f6',
  },
  simulationButtonTextActive: {
    color: '#ffffff',
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
});