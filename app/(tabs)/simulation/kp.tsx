import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, Alert, Linking } from 'react-native';
import SimulationDisclaimerModal from '@/components/simulation/SimulationDisclaimerModal';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSimulationTimer } from '@/hooks/useSimulationTimer';
import { useSubscription } from '@/hooks/useSubscription';
import { createKPController, VoiceflowController } from '@/utils/voiceflowIntegration';
import { VoiceInteractionService, VoiceInteractionState } from '@/utils/voiceIntegration';
import VoiceMicrophone from '@/components/ui/VoiceMicrophone';
import { LinearGradient } from 'expo-linear-gradient';


export default function KPSimulationScreen() {
  const router = useRouter();
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [voiceflowLoaded, setVoiceflowLoaded] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const scrollViewRef = useRef(null);
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const voiceService = useRef<VoiceInteractionService | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceInteractionState>({
    isInitialized: false,
    isRecording: false,
    isProcessing: false,
    currentMessage: '',
    conversationHistory: [],
    error: null,
  });
  
  const { formattedTime, isTimeUp, resetTimer } = useSimulationTimer({
    isActive: simulationStarted,
    onTimeUp: () => {
      setSimulationStarted(false);
    }
  });

  const { canUseSimulation, useSimulation, getSimulationStatusText } = useSubscription();

  // Initialize voice interaction service
  const initializeVoiceService = async () => {
    try {
      console.log('🎤 Initializing KP voice service...');
      
      // Create Voiceflow controller
      const controller = createKPController();
      voiceflowController.current = controller;
      
      // Create voice interaction service
      const service = new VoiceInteractionService(controller);
      voiceService.current = service;
      
      // Subscribe to voice state changes
      const unsubscribe = service.subscribe((newState) => {
        setVoiceState(newState);
        if (newState.isInitialized && !simulationStarted) {
          setSimulationStarted(true);
          setVoiceflowLoaded(true);
        }
      });
      
      // Store unsubscribe function for cleanup
      (service as any).unsubscribe = unsubscribe;
      
      console.log('✅ KP Voice service created successfully');
      return service;
    } catch (error) {
      console.error('❌ Error initializing KP voice service:', error);
      setVoiceState(prev => ({ 
        ...prev, 
        error: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
      return null;
    }
  };

  // Voice microphone event handlers
  const handleInitializeVoice = async () => {
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
      console.log('🚀 Initializing KP voice simulation');
      
      // Track simulation usage
      await useSimulation('kp');
      
      // Start simulation timer
      resetTimer();
      
      // Initialize voice service
      const service = await initializeVoiceService();
      if (service) {
        await service.initialize();
        console.log('✅ Voice simulation initialized successfully');
      }
      
    } catch (error) {
      console.error('❌ Error initializing voice simulation:', error);
      Alert.alert(
        'Fehler',
        'Sprach-Simulation konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStartRecording = () => {
    if (voiceService.current) {
      voiceService.current.startRecording();
    }
  };

  const handleStopRecording = () => {
    if (voiceService.current) {
      voiceService.current.stopRecording();
    }
  };

  // Cleanup voice service on unmount
  useEffect(() => {
    return () => {
      if (voiceService.current) {
        if ((voiceService.current as any).unsubscribe) {
          (voiceService.current as any).unsubscribe();
        }
        voiceService.current.destroy();
        voiceService.current = null;
      }
    };
  }, []);

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
    console.log('⏹️ KP Voice Simulation ended by user');
    
    // Stop voice service
    if (voiceService.current) {
      voiceService.current.stopRecording();
      if ((voiceService.current as any).unsubscribe) {
        (voiceService.current as any).unsubscribe();
      }
      voiceService.current.destroy();
      voiceService.current = null;
    }
    
    // Reset voice state
    setVoiceState({
      isInitialized: false,
      isRecording: false,
      isProcessing: false,
      currentMessage: '',
      conversationHistory: [],
      error: null,
    });
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


  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        
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
            
            {/* Main content - Voice Microphone Interface */}
            <View style={styles.mainContent}>
              <VoiceMicrophone
                onInitialize={handleInitializeVoice}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                isInitialized={voiceState.isInitialized}
                isRecording={voiceState.isRecording}
                isProcessing={voiceState.isProcessing}
                conversationText={voiceState.currentMessage}
                size={160}
              />
              
              {/* Error Display */}
              {voiceState.error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{voiceState.error}</Text>
                </View>
              )}
              
              {/* End Simulation Button */}
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
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    flexGrow: 1,
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
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  endSimulationButton: {
    backgroundColor: '#ef4444',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#dc2626',
    shadowColor: '#ef4444',
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
  spacer: {
    height: 100,
  },
});