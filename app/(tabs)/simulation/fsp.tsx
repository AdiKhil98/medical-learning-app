import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Clock, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createFSPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import { stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';
import { simulationTracker } from '@/lib/simulationTrackingService';
import InfoModal from '@/components/ui/InfoModal';

export default function FSPSimulationScreen() {
  const router = useRouter();
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [usageMarked, setUsageMarked] = useState(false); // Track if we've marked usage at 10min
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null); // For security heartbeat
  const [showInfoModal, setShowInfoModal] = useState(false);

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

    // Method 1: Monitor for MediaStream creation and termination
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
    if (originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = async function(constraints) {
        console.log('🎤 FSP: MediaStream requested with constraints:', constraints);
        
        if (constraints?.audio) {
          try {
            const stream = await originalGetUserMedia.call(this, constraints);
            
            if (!timerActive) {
              console.log('🎯 FSP: Audio stream granted - voice call starting!');
              console.log('⏰ FSP: Starting 20-minute timer due to voice call');
              startSimulationTimer();
            }

            // Monitor stream tracks for when they end
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track, index) => {
              console.log(`🎤 FSP: Monitoring audio track ${index + 1}`);
              
              track.addEventListener('ended', () => {
                console.log(`🔇 FSP: Audio track ${index + 1} ended - call likely finished`);
                
                // Check current timer state from the React ref
                const currentTimerActive = timerInterval.current !== null;
                console.log(`🔍 FSP: Track ended - checking timer interval:`, {
                  timerIntervalExists: !!timerInterval.current,
                  shouldStopTimer: currentTimerActive
                });
                
                if (currentTimerActive) {
                  console.log('🔇 FSP: Audio track ended - stopping timer');
                  stopSimulationTimer();
                } else {
                  console.log('⏰ FSP: Timer already stopped, no action needed');
                }
              });

              // Also monitor for track being stopped manually
              const originalStop = track.stop.bind(track);
              track.stop = () => {
                console.log(`🔇 FSP: Audio track ${index + 1} stopped manually`);
                originalStop();
                
                // Check current timer state immediately
                const currentTimerActive = timerInterval.current !== null;
                console.log(`🔍 FSP: Track stopped - checking timer interval:`, {
                  timerIntervalExists: !!timerInterval.current,
                  shouldStopTimer: currentTimerActive
                });
                
                if (currentTimerActive) {
                  console.log('🔇 FSP: Audio track stopped - stopping timer');
                  stopSimulationTimer();
                } else {
                  console.log('⏰ FSP: Timer already stopped, no action needed');
                }
              };
            });

            return stream;
          } catch (error) {
            console.log('❌ FSP: Failed to get audio stream:', error);
            throw error;
          }
        }
        
        return originalGetUserMedia.call(this, constraints);
      };
    }

    // Method 2: Simple click detection as backup
    const clickListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Only trigger on voiceflow-chat container clicks
      if (target.closest('#voiceflow-chat') && !timerActive) {
        console.log('🎯 FSP: Click detected on Voiceflow widget - waiting for voice call...');
        // Don't start timer immediately, wait for actual mic access
      }
    };

    document.addEventListener('click', clickListener, true);

    // Store references for cleanup
    (window as any).fspClickListener = clickListener;
    (window as any).fspOriginalGetUserMedia = originalGetUserMedia;
  };

  // Start the 20-minute simulation timer
  const startSimulationTimer = async () => {
    if (timerActive) return; // Already running
    
    console.log('⏰ FSP: Starting 20-minute simulation timer');
    
    try {
      // Check if user can start simulation and get session token
      const canStart = await simulationTracker.canStartSimulation('fsp');
      if (!canStart.allowed) {
        Alert.alert('Simulation Limit', canStart.message || 'Cannot start simulation');
        return;
      }

      // Start simulation tracking in database
      const result = await simulationTracker.startSimulation('fsp');
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to start simulation tracking');
        return;
      }

      setSessionToken(result.sessionToken || null);
      setUsageMarked(false);
      
      // Start heartbeat monitoring for security
      if (result.sessionToken) {
        startHeartbeat(result.sessionToken);
      }
      
    } catch (error) {
      console.error('❌ FSP: Failed to start simulation tracking:', error);
      // Continue with timer anyway for UX, but log the error
    }

    setTimerActive(true);
    setTimeRemaining(20 * 60); // Reset to 20 minutes
    
    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        // Mark as used at 10-minute mark (when timer shows 10:00 remaining)
        if (prev <= 600 && prev >= 595 && !usageMarked && sessionToken) { // Around 10:00 remaining = 10 minutes elapsed
          const clientElapsed = (20 * 60) - prev; // Calculate client-side elapsed time
          console.log('🔍 DEBUG: 10-minute mark reached (timer at', prev, 'seconds), marking as used');
          console.log('🔍 DEBUG: Client calculated elapsed time:', clientElapsed, 'seconds');
          markSimulationAsUsed(clientElapsed);
        }
        
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

  // Mark simulation as used at 10-minute mark with server-side validation
  const markSimulationAsUsed = async (clientElapsedSeconds: number) => {
    if (!sessionToken || usageMarked) return;
    
    console.log('📊 FSP: Marking simulation as used at 10-minute mark');
    console.log('🔍 DEBUG: Client elapsed seconds being sent:', clientElapsedSeconds);
    
    try {
      const result = await simulationTracker.markSimulationUsed(sessionToken, clientElapsedSeconds);
      if (result.success) {
        setUsageMarked(true);
        console.log('✅ FSP: Simulation usage recorded in database with server validation');
      } else {
        console.error('❌ FSP: Failed to mark simulation as used:', result.error);
        // If server-side validation fails, this could be a security issue
        if (result.error?.includes('Server validation')) {
          console.warn('🛡️ SECURITY: Server-side validation failed - possible time manipulation');
        }
      }
    } catch (error) {
      console.error('❌ FSP: Error marking simulation as used:', error);
    }
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

  // Start heartbeat monitoring for session security
  const startHeartbeat = (sessionToken: string) => {
    console.log('💓 FSP: Starting heartbeat monitoring');
    
    heartbeatInterval.current = setInterval(async () => {
      try {
        const result = await simulationTracker.sendHeartbeat(sessionToken);
        if (!result.success) {
          console.warn('💓 FSP: Heartbeat failed:', result.error);
          // Don't stop the timer on heartbeat failure, just log it
        }
      } catch (error) {
        console.error('💓 FSP: Heartbeat error:', error);
      }
    }, 30000); // Send heartbeat every 30 seconds
  };

  // Stop heartbeat monitoring
  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      console.log('💓 FSP: Stopping heartbeat monitoring');
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  // Stop the simulation timer
  const stopSimulationTimer = async (reason: 'completed' | 'aborted' = 'completed') => {
    console.log('🛑 FSP: Stopping simulation timer');
    
    // Stop heartbeat monitoring
    stopHeartbeat();
    
    // Update status in database if we have a session token
    if (sessionToken) {
      try {
        const elapsedSeconds = (20 * 60) - timeRemaining;
        
        // Determine the appropriate status based on usage and reason
        let finalStatus: 'completed' | 'aborted' | 'incomplete' = reason;
        
        if (reason === 'completed') {
          // If completed naturally (timer finished), it's completed
          finalStatus = 'completed';
        } else if (reason === 'aborted') {
          // If aborted, check if it was before 10-minute mark
          if (!usageMarked) {
            finalStatus = 'incomplete'; // Ended before reaching 10-minute usage mark
            console.log('📊 FSP: Marking as incomplete - ended before 10-minute mark');
          } else {
            finalStatus = 'aborted'; // Ended after 10-minute mark, still counts as used
            console.log('📊 FSP: Marking as aborted - ended after 10-minute mark');
          }
        }
        
        await simulationTracker.updateSimulationStatus(sessionToken, finalStatus as any, elapsedSeconds);
        console.log(`📊 FSP: Simulation marked as ${finalStatus} in database (${elapsedSeconds}s elapsed)`);
      } catch (error) {
        console.error('❌ FSP: Error updating simulation status:', error);
      }
    }
    
    // Reset simulation state to allow restart
    resetSimulationState();
    
    // After a short delay, reinitialize the conversation monitoring for restart
    setTimeout(() => {
      if (voiceflowController.current) {
        console.log('🔄 FSP: Reinitializing conversation monitoring after stop');
        setupConversationMonitoring();
      }
    }, 1000);
  };

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('🧹 FSP: Cleanup started');
      
      // Stop heartbeat monitoring
      stopHeartbeat();
      
      // Stop timer and mark as aborted (sync version for cleanup)
      if (timerActive && sessionToken) {
        simulationTracker.updateSimulationStatus(sessionToken, 'aborted', (20 * 60) - timeRemaining)
          .then(() => console.log('📊 FSP: Session marked as aborted during cleanup'))
          .catch(error => console.error('❌ FSP: Error during cleanup:', error));
      }
      
      // Remove event listeners
      if ((window as any).fspClickListener) {
        document.removeEventListener('click', (window as any).fspClickListener, true);
        delete (window as any).fspClickListener;
      }

      // Restore original getUserMedia function
      if ((window as any).fspOriginalGetUserMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = (window as any).fspOriginalGetUserMedia;
        delete (window as any).fspOriginalGetUserMedia;
      }
      
      // Cleanup Voiceflow controller
      if (voiceflowController.current) {
        console.log('🔧 FSP: Cleaning up Voiceflow controller');
        voiceflowController.current.destroy();
        voiceflowController.current = null;
      }
      
      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        console.log('🌍 FSP: Running global Voiceflow cleanup with force=true');
        globalVoiceflowCleanup(true); // Force cleanup even on simulation page
      }
      
      console.log('✅ FSP: Cleanup completed');
    };
  }, []);

  // Handle navigation away from page with immediate cleanup
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive) {
        e.preventDefault();
        e.returnValue = 'Simulation läuft. Möchten Sie wirklich die Seite verlassen?';
        return e.returnValue;
      }
    };

    // Enhanced visibility change handler for immediate widget cleanup
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' || document.hidden) {
        console.log('🔄 FSP: Page becoming hidden - immediate widget cleanup');
        performImmediateCleanup();
      }
    };

    // Handle route changes (for single-page apps)
    const handlePopState = () => {
      console.log('🔄 FSP: Navigation detected - immediate widget cleanup');
      performImmediateCleanup();
    };

    if (Platform.OS === 'web') {
      if (timerActive) {
        window.addEventListener('beforeunload', handleBeforeUnload);
      }
      
      // Add listeners for immediate cleanup on navigation
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [timerActive]);

  // Immediate cleanup function for navigation events
  const performImmediateCleanup = () => {
    try {
      console.log('⚡ FSP: Performing immediate cleanup');
      
      // Immediately hide and destroy Voiceflow widget
      if (window.voiceflow?.chat) {
        window.voiceflow.chat.hide();
        window.voiceflow.chat.close && window.voiceflow.chat.close();
      }
      
      // Force remove widget elements immediately
      const widgetSelectors = [
        '[id*="voiceflow"]',
        '[class*="voiceflow"]',
        '[class*="vfrc"]',
        '#voiceflow-chat',
        '.vfrc-widget',
        '.vfrc-chat'
      ];
      
      widgetSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.remove();
          console.log(`🗑️ FSP: Immediately removed element: ${selector}`);
        });
      });
      
      // Stop any active media streams
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🔇 FSP: Stopped audio track during immediate cleanup');
          });
        })
        .catch(() => {});
      
      console.log('✅ FSP: Immediate cleanup completed');
    } catch (error) {
      console.error('❌ FSP: Error during immediate cleanup:', error);
    }
  };

  // Reset simulation state for restart
  const resetSimulationState = () => {
    console.log('🔄 FSP: Resetting simulation state for restart');
    
    // Reset all state variables
    setTimerActive(false);
    setTimeRemaining(20 * 60);
    setSessionToken(null);
    setUsageMarked(false);
    
    // Clear any existing intervals
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    
    // Reset getUserMedia override if it exists
    if ((window as any).fspOriginalGetUserMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = (window as any).fspOriginalGetUserMedia;
      delete (window as any).fspOriginalGetUserMedia;
    }
    
    console.log('✅ FSP: Simulation state reset completed');
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle info button press
  const handleInfoPress = () => {
    setShowInfoModal(true);
  };

  // FSP Simulation info content
  const fspInfoContent = `# 🏥 FSP-Prüfung Simulationsleitfaden
## Willkommen zu Ihrem Fachsprachprüfungs-Training!

### 📋 **Was ist diese Simulation?**
Dies ist eine umfassende Trainingsumgebung zur Vorbereitung auf die **Fachsprachprüfung (FSP)** - die medizinische Deutschprüfung für ausländische Ärzte in Deutschland. Unsere Simulation bildet die echte Prüfungserfahrung ab und hilft Ihnen, Selbstvertrauen aufzubauen und Ihre Leistung zu verbessern.

---

## 🚀 **So funktioniert die Simulation**

### **Schritt 1: Benutzer-ID Verifizierung** 🔐
- Geben Sie zunächst Ihre zugewiesene Benutzer-ID an
- Dies stellt sicher, dass Ihre Auswertung korrekt in Ihrem persönlichen Konto erscheint
- Ihr Fortschritt und Ihre Ergebnisse werden für kontinuierliche Verbesserung verfolgt

### **Schritt 2: Fallauswahl** 📂
- Wählen Sie aus verschiedenen medizinischen Fällen zum Üben
- Auswahl nach Fachgebiet (Innere Medizin, Notfallmedizin, Neurologie)
- Wählen Sie spezifische Themen, die Sie stärken möchten

### **Schritt 3: Patientenanamnese** 👨‍⚕️💬 **(10 Minuten)**
Hier beginnt der Kern Ihres Trainings:
- **Start:** Begrüßen Sie Ihren Patienten professionell auf Deutsch
- **Während:** Erheben Sie eine umfassende Anamnese
  - Hauptbeschwerde
  - Aktuelle Symptome
  - Vorgeschichte
  - Medikamente
  - Allergien
  - Sozialanamnese
- **Ende:** Sagen Sie **"Ich bin fertig"** oder **"Ich habe keine weiteren Fragen"** um diese Phase abzuschließen
- Ihr Gespräch wird automatisch zur Auswertung gesendet

### **Schritt 4: Prüfergespräch** 👩‍⚕️📊 **(10 Minuten)**
Treffen Sie Dr. Hoffmann, den Oberarzt:
- **Vorstellung:** Erzählen Sie dem Prüfer über sich und Ihren Hintergrund
- **Fallbesprechung:** Beantworten Sie Fragen zu:
  - Ihren Diagnoseüberlegungen
  - Behandlungsplanung
  - Patientenkommunikationsansatz
  - Medizinischer Fachterminologie auf Deutsch
- **Ende:** Sagen Sie **"Ich bin fertig"** oder **"Können wir das beenden?"** wenn Sie bereit sind
- Dieses Gespräch wird ebenfalls ausgewertet

---

## 📊 **Ihre personalisierte Auswertung**

### Was Sie erhalten:
Kurz nach Abschluss der Simulation finden Sie Ihre detaillierte Auswertung im **Fortschrittsbereich** Ihres Kontos:

✅ **Leistungsanalyse**
- Identifizierte Stärken in Ihrer Kommunikation
- Bereiche mit nachgewiesener Kompetenz

📈 **Verbesserungsmöglichkeiten**
- Spezifische Sprachkorrekturen
- Feedback zur medizinischen Terminologie
- Vorschläge zur Kommunikationstechnik

💡 **Umsetzbare nächste Schritte**
- Gezielte Übungsempfehlungen
- Ressourcen zur Verbesserung
- Tipps für den Prüfungserfolg

---

## ⏱️ **Zeitübersicht**
- **Gesamtdauer:** 20 Minuten
- **Patientenanamnese:** 10 Minuten
- **Prüfergespräch:** 10 Minuten
- **Auswertungslieferung:** Innerhalb weniger Minuten nach Abschluss

---

## 💪 **Profi-Tipps für den Erfolg**
1. **Sprechen Sie natürlich** - Dies ist ein Gespräch, kein Skript
2. **Verwenden Sie professionelles medizinisches Deutsch** - Demonstrieren Sie Ihre Fachsprache
3. **Seien Sie gründlich aber effizient** - Decken Sie alle wichtigen Punkte innerhalb der Zeitlimits ab
4. **Bleiben Sie ruhig** - Die Simulation ist darauf ausgelegt, Ihnen beim Lernen und Verbessern zu helfen

---

## 🎯 **Bereit zu beginnen?**
Ihre Reise zum FSP-Erfolg beginnt mit Übung. Jede Simulation baut Ihr Selbstvertrauen und Ihre Kompetenz auf. Denken Sie daran: Jede Sitzung macht Sie besser auf die echte Prüfung vorbereitet!

**Halten Sie Ihre Benutzer-ID bereit und lassen Sie uns mit Ihrem Training beginnen! Viel Erfolg!** 🌟

---

*Hinweis: Diese Simulation bietet eine realistische Prüfungserfahrung mit hochwertigem, personalisiertem Feedback, um Ihre Vorbereitung auf die Fachsprachprüfung zu beschleunigen.*`;

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

        {/* Info button in header */}
        <TouchableOpacity
          style={styles.headerInfoButton}
          onPress={handleInfoPress}
          activeOpacity={0.7}
        >
          <Info size={20} color="white" />
        </TouchableOpacity>
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

      <View style={styles.content}>
        {/* Widget Area */}
        <View style={styles.widgetArea}>
          {/* Widget loads here automatically */}
        </View>
      </View>

      {/* Info Modal */}
      <InfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="FSP-Prüfung Simulationsleitfaden"
        content={fspInfoContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  headerInfoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  widgetArea: {
    flex: 1,
    // This area is where the Voiceflow widget will appear
  },
});