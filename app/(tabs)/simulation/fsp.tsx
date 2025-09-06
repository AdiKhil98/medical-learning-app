import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, Alert, Linking } from 'react-native';
import SimulationDisclaimerModal from '@/components/simulation/SimulationDisclaimerModal';
import { ChevronLeft, Mic } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSimulationTimer } from '@/hooks/useSimulationTimer';
import { useSubscription } from '@/hooks/useSubscription';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedOrb from '@/components/ui/AnimatedOrb';
import { createFSPController, VoiceflowController } from '@/utils/voiceflowIntegration';
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
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const scrollViewRef = useRef(null);
  const voiceflowController = useRef<VoiceflowController | null>(null);
  
  const { formattedTime, isTimeUp, resetTimer } = useSimulationTimer({
    isActive: simulationStarted,
    onTimeUp: () => {
      setSimulationStarted(false);
    }
  });

  const { canUseSimulation, useSimulation, getSimulationStatusText } = useSubscription();

  // Standard Voiceflow initialization - shows widget in default position
  const initializeVoiceflow = () => {
    console.log('✅ FSP Voiceflow object found, initializing...');
    
    const config = {
      verify: { projectID: '68b40ab94a5a50553729c86b' },
      url: 'https://general-runtime.voiceflow.com',
      versionID: '68b40ab94a5a50553729c86c',
      voice: {
        url: 'https://runtime-api.voiceflow.com'
      }
    };
    
    console.log('🔧 Loading FSP Voiceflow with standard config:', config);
    
    try {
      window.voiceflow.chat.load(config);
      setVoiceflowLoaded(true);
      console.log('🚀 FSP Voiceflow chat loaded successfully');
    } catch (error) {
      console.error('❌ Error loading FSP Voiceflow:', error);
    }
  };

  // Handle orb click - start simulation programmatically
  const handleOrbPress = async () => {
    if (simulationStarted) return;
    
    // Check if user can use simulation
    if (!canUseSimulation()) {
      Alert.alert(
        'Simulationslimit erreicht',
        `Sie haben Ihr Simulationslimit erreicht. ${getSimulationStatusText()}`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      console.log('🚀 Starting FSP simulation via orb click');
      
      // Track simulation usage
      await useSimulation('fsp');
      
      // Start simulation timer
      setSimulationStarted(true);
      resetTimer();
      
      // Show Voiceflow widget in default position
      if (Platform.OS === 'web' && window.voiceflow && window.voiceflow.chat) {
        try {
          setTimeout(() => {
            if (window.voiceflow.chat.open) {
              window.voiceflow.chat.open();
            } else if (window.voiceflow.chat.show) {
              window.voiceflow.chat.show();
            }
            console.log('✅ FSP Voiceflow chat opened');
          }, 1000);
        } catch (error) {
          console.error('❌ Error opening FSP Voiceflow chat:', error);
        }
      }
      
    } catch (error) {
      console.error('Error starting simulation:', error);
      Alert.alert(
        'Fehler',
        'Simulation konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
        [{ text: 'OK' }]
      );
    }
  };

  // Load Voiceflow script and set up event listeners
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="voiceflow.com/widget-next/bundle.mjs"]');
      if (existingScript) {
        console.log('🔄 FSP Voiceflow script already loaded, initializing...');
        // Initialize immediately if script exists
        if (window.voiceflow && window.voiceflow.chat) {
          initializeVoiceflow();
        } else {
          // Wait a bit for script to be ready
          setTimeout(() => {
            if (window.voiceflow && window.voiceflow.chat) {
              initializeVoiceflow();
            }
          }, 1000);
        }
        return;
      }
      
      console.log('🔄 Starting FSP Voiceflow script load...');
      
      const script = document.createElement('script');
      script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
      script.type = 'text/javascript';
      script.onload = () => {
        console.log('📦 FSP Voiceflow script loaded from CDN');
        
        try {
          if (window.voiceflow && window.voiceflow.chat) {
            initializeVoiceflow();
            
            // Set up multiple detection methods for widget interaction
            const startSimulationTimer = async () => {
              if (!simulationStarted) {
                // Check if user can use simulation
                if (!canUseSimulation()) {
                  Alert.alert(
                    'Simulationslimit erreicht',
                    `Sie haben Ihr Simulationslimit erreicht. ${getSimulationStatusText()}`,
                    [{ text: 'OK' }]
                  );
                  return;
                }

                try {
                  console.log('🚀 Starting FSP simulation timer');
                  
                  // Track simulation usage
                  await useSimulation('fsp');
                  
                  setSimulationStarted(true);
                  resetTimer();
                } catch (error) {
                  console.error('Error starting simulation:', error);
                  Alert.alert(
                    'Fehler',
                    'Simulation konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
                    [{ text: 'OK' }]
                  );
                }
              }
            };
            
            // Method 1: Listen for Voiceflow events
            const messageListener = (event) => {
              if (event.data && typeof event.data === 'object') {
                console.log('📬 FSP Message received:', event.data);
                if (event.data.type && event.data.type.startsWith('voiceflow:')) {
                  console.log(`🔍 FSP Voiceflow Event: ${event.data.type}`);
                  startSimulationTimer();
                }
              }
            };
            
            window.addEventListener('message', messageListener);
            window.fspMessageListener = messageListener;
            
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
                    console.log('👁️ FSP Widget interaction detected via DOM monitoring');
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
                window.fspMonitoringInterval = monitoringInterval;
                
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
            console.error('❌ FSP Voiceflow object not found on window');
            setTimeout(() => {
              if (window.voiceflow && window.voiceflow.chat) {
                console.log('⏰ FSP Voiceflow found after delay, initializing...');
                initializeVoiceflow();
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

  // Component cleanup - hide widget when leaving page
  useEffect(() => {
    return () => {
      console.log('🧹 FSP Simulation cleanup - hiding widget');
      
      if (Platform.OS === 'web' && window.voiceflow && window.voiceflow.chat) {
        try {
          if (window.voiceflow.chat.hide) {
            window.voiceflow.chat.hide();
          } else if (window.voiceflow.chat.close) {
            window.voiceflow.chat.close();
          }
          console.log('✅ FSP Voiceflow widget hidden on cleanup');
        } catch (error) {
          console.error('❌ Error hiding FSP Voiceflow widget:', error);
        }
      }
    };
  }, []);

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
  
  // Show disclaimer when Voiceflow is loaded
  useEffect(() => {
    if (voiceflowLoaded && !simulationStarted) {
      setShowDisclaimer(true);
    }
  }, [voiceflowLoaded, simulationStarted]);
  
  const handleDisclaimerAccept = () => {
    setShowDisclaimer(false);
    
    if (Platform.OS === 'web' && window.voiceflow && window.voiceflow.chat) {
      try {
        setTimeout(() => {
          if (window.voiceflow.chat.open) {
            window.voiceflow.chat.open();
          } else if (window.voiceflow.chat.show) {
            window.voiceflow.chat.show();
          }
          console.log('✅ FSP Voiceflow chat widget opened after disclaimer');
        }, 500);
      } catch (error) {
        console.error('❌ Error opening FSP Voiceflow chat:', error);
      }
    } else if (Platform.OS !== 'web') {
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
  };
  
  const handleDisclaimerDecline = () => {
    setShowDisclaimer(false);
    router.back();
  };
  
  // Cleanup widget when component unmounts or navigating away
  useEffect(() => {
    return () => {
      console.log('🧹 FSP Simulation cleanup - AGGRESSIVE widget removal');
      
      // Stop simulation
      setSimulationStarted(false);
      
      // Cleanup monitoring interval
      if (window.fspMonitoringInterval) {
        clearInterval(window.fspMonitoringInterval);
        delete window.fspMonitoringInterval;
      }
      
      // Aggressive widget removal - try multiple approaches
      const forceRemoveWidget = () => {
        console.log('💯 FSP Force removing widget...');
        
        // Method 1: Voiceflow API calls
        if (window.voiceflow && window.voiceflow.chat) {
          try {
            console.log('🔧 FSP Calling Voiceflow hide/close/destroy methods');
            window.voiceflow.chat.hide && window.voiceflow.chat.hide();
            window.voiceflow.chat.close && window.voiceflow.chat.close();
            window.voiceflow.chat.destroy && window.voiceflow.chat.destroy();
          } catch (error) {
            console.error('❌ FSP Voiceflow API cleanup error:', error);
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
              console.log(`🗑️ FSP Removing DOM element: ${selector}`);
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
            console.log('🔍 FSP Removing suspicious floating element');
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
              {/* Animated Celestial Orb */}
              <View style={styles.orbContainer}>
                <AnimatedOrb
                  onPress={handleOrbPress}
                  isActive={simulationStarted}
                  size={160}
                />
              </View>
              
              <View style={styles.textContent}>
                <Text style={styles.heading}>FSP Simulation</Text>
                <Text style={styles.description}>
                  {simulationStarted 
                    ? "Die Sprach-Simulation ist aktiv! Sprechen Sie mit dem virtuellen Assistenten."
                    : "Bereit für Ihre medizinische Sprach-Simulation? Klicken Sie auf den Orb, um zu beginnen."
                  }
                </Text>
                
                <View style={styles.voiceflowStatus}>
                  <Text style={[styles.statusText, { 
                    color: simulationStarted 
                      ? '#3b82f6' 
                      : (voiceflowLoaded ? '#6366f1' : '#f59e0b') 
                  }]}>
                    {simulationStarted 
                      ? '🎙️ Sprach-Simulation läuft!'
                      : (voiceflowLoaded ? '✅ Bereit zum Starten' : '⏳ Initialisierung...')
                    }
                  </Text>
                </View>
                
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
                  <Text style={[styles.statusText, { color: '#3b82f6' }]}>Aufnahme</Text>
                </View>
              )}
            </View>
            
            <View style={styles.spacer} />
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Disclaimer Modal */}
      <SimulationDisclaimerModal
        visible={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onDecline={handleDisclaimerDecline}
        simulationType="FSP"
      />
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
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
    zIndex: 5,
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