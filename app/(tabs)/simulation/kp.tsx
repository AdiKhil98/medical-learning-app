import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, Alert, Linking } from 'react-native';
import SimulationDisclaimerModal from '@/components/simulation/SimulationDisclaimerModal';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSimulationTimer } from '@/hooks/useSimulationTimer';
import { useSubscription } from '@/hooks/useSubscription';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedOrb from '@/components/ui/AnimatedOrb';
import { createKPController, VoiceflowController } from '@/utils/voiceflowIntegration';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');


export default function KPSimulationScreen() {
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
    console.log('✅ Voiceflow object found, initializing...');
    
    const config = {
      verify: { projectID: '68b40ab270a53105f6701677' },
      url: 'https://general-runtime.voiceflow.com',
      versionID: 'production',
      voice: {
        url: 'https://runtime-api.voiceflow.com'
      }
    };
    
    console.log('🔧 Loading Voiceflow with standard config:', config);
    
    try {
      window.voiceflow.chat.load(config);
      setVoiceflowLoaded(true);
      console.log('🚀 Voiceflow chat loaded successfully');
    } catch (error) {
      console.error('❌ Error loading Voiceflow:', error);
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
      console.log('🚀 Starting KP simulation via orb click');
      
      // Track simulation usage
      await useSimulation('kp');
      
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
            console.log('✅ Voiceflow chat opened');
          }, 1000);
        } catch (error) {
          console.error('❌ Error opening Voiceflow chat:', error);
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

  // Load Voiceflow script - simplified approach
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if already loaded
      if (window.voiceflow && window.voiceflow.chat) {
        console.log('🔄 Voiceflow already available, initializing...');
        initializeVoiceflow();
        return;
      }
      
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="voiceflow.com/widget-next/bundle.mjs"]');
      if (existingScript) {
        console.log('🔄 Voiceflow script exists, waiting for load...');
        const checkReady = () => {
          if (window.voiceflow && window.voiceflow.chat) {
            initializeVoiceflow();
          } else {
            setTimeout(checkReady, 500);
          }
        };
        checkReady();
        return;
      }
      
      console.log('🔄 Loading Voiceflow script...');
      const script = document.createElement('script');
      script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
      script.type = 'text/javascript';
      script.onload = () => {
        console.log('📦 Voiceflow script loaded');
        if (window.voiceflow && window.voiceflow.chat) {
          initializeVoiceflow();
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
        if ((window as any).kpMessageListener) {
          window.removeEventListener('message', (window as any).kpMessageListener);
          delete (window as any).kpMessageListener;
        }
        if ((window as any).kpMonitoringInterval) {
          clearInterval((window as any).kpMonitoringInterval);
          delete (window as any).kpMonitoringInterval;
        }
      };
    }
  }, [simulationStarted, resetTimer]);

  // Component cleanup - hide widget when leaving page
  useEffect(() => {
    return () => {
      console.log('🧹 KP Simulation cleanup - hiding widget');
      
      if (Platform.OS === 'web' && window.voiceflow && window.voiceflow.chat) {
        try {
          if (window.voiceflow.chat.hide) {
            window.voiceflow.chat.hide();
          } else if (window.voiceflow.chat.close) {
            window.voiceflow.chat.close();
          }
          console.log('✅ Voiceflow widget hidden on cleanup');
        } catch (error) {
          console.error('❌ Error hiding Voiceflow widget:', error);
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
  
  // Show disclaimer when Voiceflow is loaded - DISABLED
  // useEffect(() => {
  //   if (voiceflowLoaded && !simulationStarted) {
  //     setShowDisclaimer(true);
  //   }
  // }, [voiceflowLoaded, simulationStarted]);
  
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
          console.log('✅ KP Voiceflow chat widget opened after disclaimer');
        }, 500);
      } catch (error) {
        console.error('❌ Error opening KP Voiceflow chat:', error);
      }
    } else if (Platform.OS !== 'web') {
      // Mobile: Open in external browser
      const voiceflowUrl = `https://creator.voiceflow.com/prototype/68b40ab270a53105f6701677`;
      Linking.canOpenURL(voiceflowUrl).then(supported => {
        if (supported) {
          Linking.openURL(voiceflowUrl);
          console.log('📱 Opened KP Voiceflow in external browser');
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
      console.log('🧹 KP Simulation cleanup - AGGRESSIVE widget removal');
      
      // Stop simulation
      setSimulationStarted(false);
      
      // Cleanup monitoring interval
      if ((window as any).kpMonitoringInterval) {
        clearInterval((window as any).kpMonitoringInterval);
        delete (window as any).kpMonitoringInterval;
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

  // Animated values for the background elements
  const floatingOrb1 = useSharedValue(0);
  const floatingOrb2 = useSharedValue(0);
  const floatingOrb3 = useSharedValue(0);
  const backgroundScale = useSharedValue(1);

  // Initialize animations
  useEffect(() => {
    floatingOrb1.value = withRepeat(
      withTiming(1, { duration: 4000 }),
      -1,
      true
    );
    floatingOrb2.value = withRepeat(
      withTiming(1, { duration: 6000 }),
      -1,
      true
    );
    floatingOrb3.value = withRepeat(
      withTiming(1, { duration: 5000 }),
      -1,
      true
    );
    backgroundScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 8000 }),
        withTiming(1, { duration: 8000 })
      ),
      -1,
      false
    );
  }, []);

  // Animated styles
  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: floatingOrb1.value * 20 - 10 },
      { translateY: floatingOrb1.value * 25 - 12.5 },
      { rotate: `${floatingOrb1.value * 360}deg` },
      { scale: 0.9 + floatingOrb1.value * 0.2 },
    ],
    opacity: 0.7 + floatingOrb1.value * 0.3,
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: floatingOrb2.value * -20 + 10 },
      { translateY: floatingOrb2.value * -25 + 12.5 },
      { rotate: `${floatingOrb2.value * -270}deg` },
      { scale: 0.8 + floatingOrb2.value * 0.4 },
    ],
    opacity: 0.6 + floatingOrb2.value * 0.4,
  }));

  const orb3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: floatingOrb3.value * 15 - 7.5 },
      { translateY: floatingOrb3.value * -20 + 10 },
      { scale: 0.7 + floatingOrb3.value * 0.6 },
    ],
    opacity: 0.5 + floatingOrb3.value * 0.5,
  }));

  const backgroundScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backgroundScale.value }],
  }));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Sky blue gradient background */}
        <LinearGradient
          colors={['#e6f3ff', '#b3d9ff', '#80c7ff']}
          style={styles.skyBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Central organic sphere */}
        <Animated.View style={[styles.centralSphere, backgroundScaleStyle]}>
          <LinearGradient
            colors={['rgba(0, 162, 255, 0.15)', 'rgba(255, 140, 70, 0.1)']}
            style={styles.sphereGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {/* Inner core */}
          <View style={styles.sphereCore}>
            <LinearGradient
              colors={['rgba(0, 162, 255, 0.8)', 'rgba(255, 140, 70, 0.6)']}
              style={styles.coreGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </View>
          {/* Particle dots overlay */}
          <View style={styles.particleLayer}>
            {[...Array(50)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.particle,
                  {
                    left: `${Math.random() * 90 + 5}%`,
                    top: `${Math.random() * 90 + 5}%`,
                    opacity: 0.3 + Math.random() * 0.7,
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>
        
        {/* Floating smaller orbs */}
        <Animated.View style={[styles.floatingOrb, styles.orb1, orb1Style]}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.6)', 'rgba(0, 162, 255, 0.2)']}
            style={styles.orbGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <Animated.View style={[styles.floatingOrb, styles.orb2, orb2Style]}>
          <LinearGradient
            colors={['rgba(255, 140, 70, 0.4)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.orbGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        
        {/* Light rays */}
        <View style={styles.lightRay} />
        
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
                    ? "Die KI-Simulation ist aktiv! Sprechen Sie mit dem virtuellen Assistenten."
                    : "Bereit für Ihre medizinische KI-Simulation? Klicken Sie auf den Orb, um zu beginnen."
                  }
                </Text>
              </View>

              {/* Animated Celestial Orb */}
              <View style={styles.orbContainer}>
                <AnimatedOrb
                  onPress={handleOrbPress}
                  isActive={simulationStarted}
                  size={160}
                />
              </View>

              {/* Status indicator */}
              <View style={styles.voiceflowStatus}>
                <Text style={[styles.statusText, { 
                  color: simulationStarted 
                    ? '#22c55e' 
                    : (voiceflowLoaded ? '#4CAF50' : '#f59e0b') 
                }]}>
                  {simulationStarted 
                    ? '🎙️ Simulation läuft - Sprechen Sie!'
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

              {/* Recording indicator */}
              {simulationStarted && (
                <View style={styles.statusIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={[styles.statusText, { color: '#22c55e' }]}>Aktiv</Text>
                </View>
              )}
            </View>
            
            <View style={styles.spacer} />
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Disclaimer Modal - DISABLED */}
      {false && (
        <SimulationDisclaimerModal
          visible={showDisclaimer}
          onAccept={handleDisclaimerAccept}
          onDecline={handleDisclaimerDecline}
          simulationType="KP"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f3ff',
  },
  skyBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    width: '100%',
  },
  centralSphere: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: '25%',
    left: '50%',
    marginLeft: -150,
    shadowColor: 'rgba(0, 162, 255, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 15,
  },
  sphereGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 150,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sphereCore: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: '50%',
    left: '50%',
    marginTop: -60,
    marginLeft: -60,
  },
  coreGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  particleLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 150,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  lightRay: {
    position: 'absolute',
    width: 2,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    top: '10%',
    right: '20%',
    transform: [{ rotate: '45deg' }],
    opacity: 0.6,
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 100,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  orb1: {
    width: 80,
    height: 80,
    top: '15%',
    left: '10%',
  },
  orb2: {
    width: 60,
    height: 60,
    top: '70%',
    right: '15%',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
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
  voiceflowStatus: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    backdropFilter: 'blur(10px)',
  },
  endSimulationButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  textContent: {
    alignItems: 'center',
    maxWidth: 350,
    marginBottom: 24,
  },
  heading: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#1e40af',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: '#374151',
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
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    backdropFilter: 'blur(10px)',
    marginTop: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    backgroundColor: '#22c55e',
    borderRadius: 4,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  spacer: {
    height: 100,
  },
});