import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, Alert, Linking } from 'react-native';
import SimulationDisclaimerModal from '@/components/simulation/SimulationDisclaimerModal';
import SimulationInstructionsModal from '@/components/ui/SimulationInstructionsModal';
import { ChevronLeft, MessageCircle, Info } from 'lucide-react-native';
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
  const [showInstructions, setShowInstructions] = useState(false);
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
        console.log('🔄 Voice state updated:', {
          isInitialized: newState.isInitialized,
          isRecording: newState.isRecording,
          isProcessing: newState.isProcessing
        });
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

  // Initialize simulation with usage tracking
  const initializeSimulation = async () => {
    console.log('🏥 KP: Initializing medical simulation');
    
    // Check if user can use simulation
    if (!canUseSimulation()) {
      console.log('❌ KP: Simulation limit reached');
      Alert.alert(
        'Simulationslimit erreicht',
        `Sie haben Ihr Simulationslimit erreicht. ${getSimulationStatusText()}`,
        [{ text: 'OK' }]
      );
      return false;
    }

    try {
      // Track simulation usage
      await useSimulation('kp');
      
      // Start simulation timer
      resetTimer();
      
      console.log('✅ KP: Medical simulation initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Error initializing simulation:', error);
      Alert.alert(
        'Fehler',
        'Simulation konnte nicht initialisiert werden.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleStartRecording = () => {
    console.log('🎤 Starting custom microphone recording');
    
    // Use Web Speech API directly like the original approach, but with better integration
    if (!navigator.mediaDevices || !window.webkitSpeechRecognition) {
      Alert.alert('Fehler', 'Spracheingabe wird von Ihrem Browser nicht unterstützt.');
      return;
    }

    try {
      // Request microphone permission and start recognition
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log('🎤 Microphone access granted');
          
          // Stop the stream immediately - we just needed permission
          stream.getTracks().forEach(track => track.stop());
          
          // Start speech recognition
          const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition;
          if (!SpeechRecognition) {
            throw new Error('Speech recognition not supported');
          }
          
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'de-DE';
          
          recognition.onstart = () => {
            console.log('🎤 Speech recognition started');
            setVoiceState(prev => ({ ...prev, isRecording: true }));
          };
          
          recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript;
              }
            }
            
            if (finalTranscript) {
              console.log('🗣️ Final transcript:', finalTranscript);
              handleSpeechResult(finalTranscript);
            }
          };
          
          recognition.onerror = (event: any) => {
            console.error('❌ Speech recognition error:', event.error);
            setVoiceState(prev => ({ ...prev, isRecording: false, error: event.error }));
          };
          
          recognition.onend = () => {
            console.log('🎤 Speech recognition ended');
            setVoiceState(prev => ({ ...prev, isRecording: false }));
          };
          
          recognition.start();
          
        })
        .catch(error => {
          console.error('❌ Microphone permission denied:', error);
          Alert.alert('Fehler', 'Mikrofon-Zugriff erforderlich für Spracheingabe.');
        });
        
    } catch (error) {
      console.error('❌ Error starting speech recognition:', error);
      Alert.alert('Fehler', 'Spracheingabe konnte nicht gestartet werden.');
    }
  };

  // Handle speech recognition result
  const handleSpeechResult = (transcript: string) => {
    console.log('📝 Processing speech result:', transcript);
    
    // Send to hidden Voiceflow widget
    if (window.voiceflow && window.voiceflow.chat && window.voiceflow.chat.interact) {
      setVoiceState(prev => ({ ...prev, isProcessing: true, currentMessage: `Sie: ${transcript}` }));
      
      window.voiceflow.chat.interact({
        type: 'text',
        payload: transcript
      }).then((response: any) => {
        console.log('🤖 Voiceflow raw response:', response);
        
        // Try multiple ways to extract response text
        let responseText = '';
        
        if (response && Array.isArray(response) && response.length > 0) {
          const firstResponse = response[0];
          
          // Try different response formats
          if (firstResponse.type === 'speak' && firstResponse.payload) {
            responseText = firstResponse.payload.message || firstResponse.payload;
          } else if (firstResponse.payload && firstResponse.payload.message) {
            responseText = firstResponse.payload.message;
          } else if (firstResponse.payload && typeof firstResponse.payload === 'string') {
            responseText = firstResponse.payload;
          } else if (typeof firstResponse === 'string') {
            responseText = firstResponse;
          }
          
          // Fallback - check all response items for text
          if (!responseText) {
            for (const item of response) {
              if (item.type === 'speak' || item.type === 'text') {
                responseText = item.payload?.message || item.payload || item.text || '';
                if (responseText) break;
              }
            }
          }
        }
        
        console.log('📤 Extracted response text:', responseText);
        
        if (responseText && typeof responseText === 'string' && responseText.trim()) {
          speakResponse(responseText);
          setVoiceState(prev => ({ 
            ...prev, 
            isProcessing: false,
            currentMessage: `KI: ${responseText}`
          }));
        } else {
          console.warn('⚠️ No valid response text found in Voiceflow response');
          setVoiceState(prev => ({ 
            ...prev, 
            isProcessing: false,
            currentMessage: 'KI: Antwort erhalten, aber kein Text extrahiert.'
          }));
        }
      }).catch((error: any) => {
        console.error('❌ Voiceflow interaction error:', error);
        setVoiceState(prev => ({ 
          ...prev, 
          isProcessing: false,
          currentMessage: 'Fehler bei der Kommunikation mit der KI.' 
        }));
      });
    } else {
      console.error('❌ Voiceflow widget not available for interaction');
      setVoiceState(prev => ({ 
        ...prev, 
        isProcessing: false,
        currentMessage: 'Voiceflow Widget nicht verfügbar.' 
      }));
    }
  };

  // Speak response using Web Speech API
  const speakResponse = (text: string) => {
    console.log('🔊 Speaking response:', text);
    
    if (window.speechSynthesis) {
      // Cancel any current speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.8; // Slightly slower for better clarity
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Wait for voices to load and find the best German voice
      const speakWithVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('🎯 Available voices:', voices.length);
        
        // Find German voice (prefer neural or premium voices)
        const germanVoices = voices.filter(voice => voice.lang.startsWith('de'));
        console.log('🇩🇪 German voices found:', germanVoices.length);
        
        if (germanVoices.length > 0) {
          // Prefer specific high-quality German voices
          const preferredVoice = germanVoices.find(voice => 
            voice.name.includes('Google') || 
            voice.name.includes('Microsoft') || 
            voice.name.includes('Neural') ||
            voice.name.includes('Premium')
          ) || germanVoices[0];
          
          utterance.voice = preferredVoice;
          console.log('🎤 Using voice:', preferredVoice.name);
        }
        
        utterance.onstart = () => {
          console.log('🔊 Speech synthesis started');
        };
        
        utterance.onend = () => {
          console.log('✅ Speech synthesis completed');
        };
        
        utterance.onerror = (event) => {
          console.error('❌ Speech synthesis error:', event);
        };
        
        window.speechSynthesis.speak(utterance);
      };
      
      // Check if voices are already loaded
      if (window.speechSynthesis.getVoices().length > 0) {
        speakWithVoice();
      } else {
        // Wait for voices to load
        const voicesLoadedHandler = () => {
          speakWithVoice();
          window.speechSynthesis.removeEventListener('voiceschanged', voicesLoadedHandler);
        };
        window.speechSynthesis.addEventListener('voiceschanged', voicesLoadedHandler);
      }
    } else {
      console.error('❌ Speech synthesis not available');
    }
  };

  const handleStopRecording = () => {
    console.log('🎤 Stopping recording');
    
    // Try to stop voice interaction
    if (window.voiceflow && window.voiceflow.chat) {
      try {
        // Look for stop button or end voice interaction
        setTimeout(() => {
          const stopButton = document.querySelector('[aria-label*="stop"], [title*="stop"], .vfrc-stop-button');
          if (stopButton) {
            console.log('🛑 Found stop button, clicking it');
            (stopButton as HTMLElement).click();
          }
        }, 100);
      } catch (error) {
        console.error('❌ Error stopping voice:', error);
      }
    }

    // Update UI state
    setVoiceState(prev => ({ ...prev, isRecording: false }));
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

  // Load Voiceflow widget using the working method from test page
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('📦 Loading Voiceflow widget for KP medical simulation');
      
      // Use the exact same approach as the working test page
      (function(d, t) {
        const v = d.createElement(t);
        const s = d.getElementsByTagName(t)[0];
        
        v.onload = function() {
          console.log('✅ Voiceflow script loaded successfully');
          
          if (window.voiceflow && window.voiceflow.chat) {
            window.voiceflow.chat.load({
              verify: { projectID: '68c3061be0c49c3ff98ceb9e' },
              url: 'https://general-runtime.voiceflow.com',
              versionID: 'production',
              voice: {
                url: "https://runtime-api.voiceflow.com"
              },
              assistant: {
                position: 'bottom-left',
                spacing: {
                  side: 24,
                  bottom: 24
                }
              }
            });
            
            console.log('✅ Voiceflow widget loaded and should be visible');
            
            // Initialize simulation tracking
            initializeSimulation().then((success) => {
              if (success) {
                setSimulationStarted(true);
                setVoiceflowLoaded(true);
                console.log('🎯 KP simulation ready - widget should appear in bottom-right!');
              }
            });
          } else {
            console.error('❌ Voiceflow not available after script load');
          }
        };
        
        v.onerror = function(error) {
          console.error('❌ Failed to load Voiceflow script:', error);
        };
        
        v.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
        v.type = "text/javascript";
        s.parentNode.insertBefore(v, s);
      })(document, 'script');
    }
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

            {/* Instructions Button */}
            <TouchableOpacity 
              style={styles.instructionsButton}
              onPress={() => setShowInstructions(true)}
            >
              <Info size={20} color="#3b82f6" />
              <Text style={styles.instructionsButtonText}>Über die Simulation</Text>
            </TouchableOpacity>
            
            {/* Timer Display */}
            {simulationStarted && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{formattedTime}</Text>
              </View>
            )}
            
            {/* Clean interface - only Voiceflow widget */}
            <View style={styles.mainContent}>
              {/* Widget loads automatically - no UI needed */}
            </View>
            
            <View style={styles.spacer} />
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Instructions Modal */}
      <SimulationInstructionsModal
        visible={showInstructions}
        onClose={() => setShowInstructions(false)}
        simulationType="KP"
      />
      
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
    top: 70,
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
  instructionsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    zIndex: 10,
  },
  instructionsButtonText: {
    color: '#3b82f6',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginLeft: 4,
  },
  testButton: {
    backgroundColor: '#f97316',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  voiceflowInstructions: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  instructionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  startButton: {
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  startButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  spacer: {
    height: 100,
  },
  instructionSubText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
  },
});