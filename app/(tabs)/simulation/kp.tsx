import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Brain, Clock, Target, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createKPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import { stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';

export default function KPSimulationScreen() {
  const router = useRouter();
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize Voiceflow widget when component mounts
  useEffect(() => {
    const initializeVoiceflow = async () => {
      if (Platform.OS === 'web') {
        console.log('🏥 KP: Initializing medical simulation');
        
        // Stop global cleanup to allow widget
        stopGlobalVoiceflowCleanup();
        
        // Create and load controller
        const controller = createKPController();
        voiceflowController.current = controller;
        
        try {
          const loaded = await controller.loadWidget();
          if (loaded) {
            console.log('✅ KP: Voiceflow widget loaded successfully');
            
            // Make sure widget is visible and functional
            setTimeout(() => {
              if (window.voiceflow?.chat) {
                window.voiceflow.chat.show();
                console.log('👁️ KP: Widget made visible');
              }
            }, 1000);
            
            // Set up conversation monitoring
            setupConversationMonitoring();
          }
        } catch (error) {
          console.error('❌ KP: Failed to load Voiceflow widget:', error);
        }
      }
    };

    initializeVoiceflow();
  }, []);

  // Set up monitoring for conversation start
  const setupConversationMonitoring = () => {
    console.log('🔍 KP: Setting up microphone-based call detection...');

    // Method 1: Monitor microphone access (most reliable indicator of voice call start)
    const monitorMicrophoneAccess = () => {
      // Check if microphone is currently active
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then((stream) => {
          console.log('🎤 KP: Microphone access granted - voice call likely started!');
          if (!timerActive) {
            console.log('⏰ KP: Starting 20-minute timer due to microphone activation');
            startSimulationTimer();
          }
          // Stop the stream to avoid keeping mic on
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {
          // No microphone access yet, which is normal
        });
    };

    // Method 2: Monitor navigator.mediaDevices for permission changes
    const monitorPermissionChanges = async () => {
      if (navigator.permissions) {
        try {
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          micPermission.onchange = () => {
            console.log('🔄 KP: Microphone permission changed to:', micPermission.state);
            if (micPermission.state === 'granted' && !timerActive) {
              console.log('🎤 KP: Microphone permission granted - checking for active call...');
              setTimeout(monitorMicrophoneAccess, 500); // Small delay to let call start
            }
          };
        } catch (error) {
          console.log('⚠️ KP: Permission API not available');
        }
      }
    };

    // Method 3: Fallback click detection on voiceflow container
    const clickListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Only trigger on voiceflow-chat container clicks
      if (target.closest('#voiceflow-chat') && !timerActive) {
        console.log('🎯 KP: Click detected on Voiceflow widget');
        // Wait a moment for potential microphone access, then check
        setTimeout(() => {
          if (!timerActive) {
            monitorMicrophoneAccess();
          }
        }, 1000);
      }
    };

    // Set up monitoring
    monitorPermissionChanges();
    
    // Periodically check for microphone access (less frequent than before)
    const micChecker = setInterval(() => {
      if (!timerActive) {
        monitorMicrophoneAccess();
      }
    }, 2000); // Check every 2 seconds

    document.addEventListener('click', clickListener, true);

    // Store references for cleanup
    (window as any).kpClickListener = clickListener;
    (window as any).kpMicChecker = micChecker;
  };

  // Start the 20-minute simulation timer
  const startSimulationTimer = () => {
    if (timerActive) return; // Already running
    
    console.log('⏰ KP: Starting 20-minute simulation timer');
    setTimerActive(true);
    setTimeRemaining(20 * 60); // Reset to 20 minutes
    
    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          console.log('⏰ KP: Timer finished - 20 minutes elapsed');
          stopSimulationTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stop the simulation timer
  const stopSimulationTimer = () => {
    console.log('🛑 KP: Stopping simulation timer');
    setTimerActive(false);
    
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('🧹 KP: Cleanup started');
      
      // Stop timer
      stopSimulationTimer();
      
      // Remove event listeners
      if ((window as any).kpClickListener) {
        document.removeEventListener('click', (window as any).kpClickListener, true);
        delete (window as any).kpClickListener;
      }

      if ((window as any).kpMicChecker) {
        clearInterval((window as any).kpMicChecker);
        delete (window as any).kpMicChecker;
      }
      
      // Cleanup Voiceflow controller
      if (voiceflowController.current) {
        console.log('🔧 KP: Cleaning up Voiceflow controller');
        voiceflowController.current.destroy();
        voiceflowController.current = null;
      }
      
      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        console.log('🌍 KP: Running global Voiceflow cleanup');
        globalVoiceflowCleanup();
      }
      
      console.log('✅ KP: Cleanup completed');
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
        colors={['#4338ca', '#3730a3']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Brain size={24} color="white" />
          <Text style={styles.headerTitle}>KP-Simulation</Text>
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
              <Target size={20} color="#4338ca" />
              <Text style={styles.instructionsTitle}>Anweisungen</Text>
            </View>
            
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.instructionText}>
                  Klicken Sie auf "Start a call" im Widget unten, um die Simulation zu beginnen
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.instructionText}>
                  Sie haben 20 Minuten Zeit für die komplette KP-Simulation
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.instructionText}>
                  Sprechen Sie klar und deutlich - das System analysiert Ihre Antworten in Echtzeit
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
                Geben Sie strukturierte und fundierte Antworten. Die KI bewertet sowohl Fachkompetenz als auch Kommunikationsfähigkeit.
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
    backgroundColor: '#f8fafc',
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