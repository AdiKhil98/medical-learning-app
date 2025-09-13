import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Clock, Users, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createFSPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import { stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';

export default function FSPSimulationScreen() {
  const router = useRouter();
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize Voiceflow widget when component mounts
  useEffect(() => {
    const initializeVoiceflow = async () => {
      if (Platform.OS === 'web') {
        console.log('🏥 FSP: Initializing medical simulation');
        
        // Stop global cleanup to allow widget
        stopGlobalVoiceflowCleanup();
        
        // Create and load controller
        const controller = createFSPController();
        voiceflowController.current = controller;
        
        try {
          const loaded = await controller.loadWidget();
          if (loaded) {
            console.log('✅ FSP: Voiceflow widget loaded successfully');
            
            // Make sure widget is visible and functional
            setTimeout(() => {
              if (window.voiceflow?.chat) {
                window.voiceflow.chat.show();
                console.log('👁️ FSP: Widget made visible');
              }
            }, 1000);
            
            // Set up conversation monitoring
            setupConversationMonitoring();
          }
        } catch (error) {
          console.error('❌ FSP: Failed to load Voiceflow widget:', error);
        }
      }
    };

    initializeVoiceflow();
  }, []);

  // Set up monitoring for conversation start
  const setupConversationMonitoring = () => {
    console.log('🔍 FSP: Setting up passive microphone detection...');

    // Method 1: Listen for custom Voiceflow events from the widget
    const voiceflowEventListener = (event: CustomEvent) => {
      console.log('🎯 FSP: Voiceflow event detected:', event.type, event.detail);
      if (!timerActive) {
        startSimulationTimer();
      }
    };

    window.addEventListener('voiceflowWidgetOpened', voiceflowEventListener as EventListener);
    window.addEventListener('voiceflowUserInteraction', voiceflowEventListener as EventListener);
    window.addEventListener('voiceflowDOMActivity', voiceflowEventListener as EventListener);
    
    // Method 2: Listen for ALL window messages - comprehensive logging
    const messageListener = (event: MessageEvent) => {
      // Log ALL messages to see what's actually being sent
      if (event.data) {
        console.log('📨 FSP: Window message received:', {
          type: event.data.type,
          action: event.data.action,
          event: event.data.event,
          source: event.data.source,
          origin: event.origin,
          data: event.data
        });
      }
      
      if (event.data && typeof event.data === 'object') {
        // Check for any Voiceflow-related activity
        if (
          event.data.type?.includes('voiceflow') ||
          event.data.type?.includes('chat') ||
          event.data.type?.includes('call') ||
          event.data.source?.includes('voiceflow') ||
          event.data.action === 'start' ||
          event.data.event === 'start' ||
          (event.data.message && (
            event.data.message.includes('start') ||
            event.data.message.includes('call') ||
            event.data.message.includes('conversation')
          ))
        ) {
          console.log('🎯 FSP: Potential conversation start detected via message:', event.data);
          if (!timerActive) {
            startSimulationTimer();
          }
        }
      }
    };

    // Method 3: Comprehensive click detection with logging
    const clickListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Log EVERY click to see if we're capturing anything at all
      console.log('🖱️ FSP: ANY click detected:', {
        tagName: target.tagName,
        className: target.className,
        textContent: target.textContent?.slice(0, 30),
        id: target.id
      });
      
      // Check if click was on the specific "Start a call" button or its children
      const startCallButton = target.closest('button.vfrc-button');
      const hasStartCallText = target.textContent?.includes('Start a call') || 
                              target.closest('*')?.textContent?.includes('Start a call');

      if (startCallButton && hasStartCallText) {
        console.log('🎯 FSP: "Start a call" button clicked!', {
          button: startCallButton,
          className: startCallButton.className,
          textContent: startCallButton.textContent
        });
        
        if (!timerActive) {
          console.log('⏰ FSP: Starting 20-minute timer due to Start a call button click');
          startSimulationTimer();
        }
      }

      // Check for ANY button with vfrc class
      const anyVfrcButton = target.closest('button');
      if (anyVfrcButton && anyVfrcButton.className.includes('vfrc')) {
        console.log('🔍 FSP: VFRC button clicked (backup detection):', {
          className: anyVfrcButton.className,
          textContent: anyVfrcButton.textContent?.slice(0, 50)
        });
        
        if (!timerActive && anyVfrcButton.textContent?.includes('Start')) {
          console.log('⏰ FSP: Starting timer due to Start button detection');
          startSimulationTimer();
        }
      }
    };

    // Method 4: Periodic DOM check for widget changes
    const domChecker = setInterval(() => {
      if (!timerActive) {
        const voiceflowElements = document.querySelectorAll('[class*="vfrc"], [class*="voiceflow"]');
        if (voiceflowElements.length > 0) {
          voiceflowElements.forEach((element, index) => {
            if (index < 3) { // Log first 3 elements only
              console.log(`🔍 FSP: Found Voiceflow element ${index + 1}:`, {
                className: element.className,
                textContent: element.textContent?.slice(0, 100),
                visible: (element as HTMLElement).offsetWidth > 0
              });
            }
          });
        }
      }
    }, 5000); // Check every 5 seconds

    window.addEventListener('message', messageListener);
    document.addEventListener('click', clickListener, true);

    // Store references for cleanup
    (window as any).fspVoiceflowListener = voiceflowEventListener;
    (window as any).fspMessageListener = messageListener;
    (window as any).fspClickListener = clickListener;
    (window as any).fspDomChecker = domChecker;
  };

  // Start the 20-minute simulation timer
  const startSimulationTimer = () => {
    if (timerActive) return; // Already running
    
    console.log('⏰ FSP: Starting 20-minute simulation timer');
    setTimerActive(true);
    setTimeRemaining(20 * 60); // Reset to 20 minutes
    
    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          console.log('⏰ FSP: Timer finished - 20 minutes elapsed');
          console.log('🔚 FSP: Automatically ending Voiceflow conversation');
          endVoiceflowConversation();
          stopSimulationTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End the Voiceflow conversation
  const endVoiceflowConversation = () => {
    try {
      // Method 1: Try to close the Voiceflow widget
      if (window.voiceflow?.chat) {
        console.log('🔚 FSP: Attempting to close Voiceflow widget');
        window.voiceflow.chat.close && window.voiceflow.chat.close();
        window.voiceflow.chat.hide && window.voiceflow.chat.hide();
      }

      // Method 2: Try to stop any active media streams
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then((stream) => {
          console.log('🔚 FSP: Stopping active audio streams');
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {
          // No active streams, which is fine
        });

      // Method 3: Try to find and click any "End call" or "Hang up" buttons
      setTimeout(() => {
        const endButtons = document.querySelectorAll('button');
        for (const button of endButtons) {
          const buttonText = button.textContent?.toLowerCase();
          if (buttonText?.includes('end') || buttonText?.includes('hang') || buttonText?.includes('stop')) {
            console.log('🔚 FSP: Found potential end call button, clicking it');
            button.click();
            break;
          }
        }
      }, 500);

    } catch (error) {
      console.error('❌ FSP: Error ending Voiceflow conversation:', error);
    }
  };

  // Stop the simulation timer
  const stopSimulationTimer = () => {
    console.log('🛑 FSP: Stopping simulation timer');
    setTimerActive(false);
    
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('🧹 FSP: Cleanup started');
      
      // Stop timer
      stopSimulationTimer();
      
      // Remove event listeners
      if ((window as any).fspVoiceflowListener) {
        window.removeEventListener('voiceflowWidgetOpened', (window as any).fspVoiceflowListener);
        window.removeEventListener('voiceflowUserInteraction', (window as any).fspVoiceflowListener);
        window.removeEventListener('voiceflowDOMActivity', (window as any).fspVoiceflowListener);
        delete (window as any).fspVoiceflowListener;
      }

      if ((window as any).fspMessageListener) {
        window.removeEventListener('message', (window as any).fspMessageListener);
        delete (window as any).fspMessageListener;
      }
      
      if ((window as any).fspClickListener) {
        document.removeEventListener('click', (window as any).fspClickListener, true);
        delete (window as any).fspClickListener;
      }

      if ((window as any).fspDomChecker) {
        clearInterval((window as any).fspDomChecker);
        delete (window as any).fspDomChecker;
      }
      
      // Cleanup Voiceflow controller
      if (voiceflowController.current) {
        console.log('🔧 FSP: Cleaning up Voiceflow controller');
        voiceflowController.current.destroy();
        voiceflowController.current = null;
      }
      
      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        console.log('🌍 FSP: Running global Voiceflow cleanup');
        globalVoiceflowCleanup();
      }
      
      console.log('✅ FSP: Cleanup completed');
    };
  }, []);

  // Handle navigation away from page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive) {
        e.preventDefault();
        e.returnValue = 'Simulation läuft. Möchten Sie wirklich die Seite verlassen?';
        return e.returnValue;
      }
    };

    if (Platform.OS === 'web' && timerActive) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [timerActive]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button and title */}
      <LinearGradient
        colors={['#ef4444', '#dc2626']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Mic size={24} color="white" />
          <Text style={styles.headerTitle}>FSP-Simulation</Text>
        </View>
        
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      {/* Timer display - only show when active */}
      {timerActive && (
        <View style={styles.timerContainer}>
          <Clock size={16} color="white" />
          <Text style={styles.timerText}>
            Simulation läuft: {formatTime(timeRemaining)}
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Instructions Section - only show when timer is not active */}
        {!timerActive && (
          <View style={styles.instructionsSection}>
            <View style={styles.instructionsHeader}>
              <Users size={20} color="#ef4444" />
              <Text style={styles.instructionsTitle}>Anweisungen</Text>
            </View>
            
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.instructionText}>
                  Klicken Sie auf "Start a call" im Widget unten, um das Patientengespräch zu beginnen
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.instructionText}>
                  Sie haben 20 Minuten Zeit für die komplette FSP-Simulation
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.instructionText}>
                  Führen Sie ein natürliches Gespräch - stellen Sie Fragen und hören Sie aufmerksam zu
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.instructionText}>
                  Zeigen Sie Empathie und professionelle Kommunikationsfähigkeiten
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <AlertTriangle size={16} color="#f59e0b" />
                <Text style={styles.instructionText}>
                  Verlassen Sie diese Seite nicht während der laufenden Simulation
                </Text>
              </View>
            </View>

            <View style={styles.tipBox}>
              <Text style={styles.tipTitle}>💡 Tipp</Text>
              <Text style={styles.tipText}>
                Behandeln Sie den virtuellen Patienten wie einen echten Menschen. Aktives Zuhören und empathische Kommunikation sind entscheidend für eine erfolgreiche FSP.
              </Text>
            </View>
          </View>
        )}
        
        {/* Widget Area */}
        <View style={styles.widgetArea}>
          {/* Widget loads here automatically */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerPlaceholder: {
    width: 40, // Same as back button to center the title
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 12,
    borderRadius: 12,
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  instructionsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  instructionsList: {
    gap: 12,
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  tipBox: {
    backgroundColor: '#fef7cd',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  widgetArea: {
    minHeight: 400,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});