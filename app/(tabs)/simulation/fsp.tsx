import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Clock, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createFSPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import { stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';
import { simulationTracker } from '@/lib/simulationTrackingService';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import InlineInstructions from '@/components/ui/InlineInstructions';
import { InlineContent, Section, Paragraph, BoldText, Step, InfoBox, TimeItem, TipsList, HighlightBox, TimeBadge } from '@/components/ui/InlineContent';

export default function FSPSimulationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { canUseSimulation, subscriptionStatus, recordUsage, getSubscriptionInfo, checkAccess } = useSubscription(user?.id);
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState(20 * 60); // 20 minutes in seconds
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const [sessionToken, setSessionToken] = React.useState<string | null>(null);
  const [usageMarked, setUsageMarked] = React.useState(false); // Track if we've marked usage at 10min
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null); // For security heartbeat

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
        Alert.alert('Simulationslimit', canStart.message || 'Simulation kann nicht gestartet werden');
        return;
      }

      // Start simulation tracking in database
      const result = await simulationTracker.startSimulation('fsp');
      if (!result.success) {
        Alert.alert('Fehler', result.error || 'Simulation-Tracking konnte nicht gestartet werden');
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

  // Check simulation access on page load
  useEffect(() => {
    if (user && !canUseSimulation) {
      const info = getSubscriptionInfo();
      Alert.alert(
        'Simulationslimit erreicht',
        subscriptionStatus?.message || 'Sie haben Ihr Simulationslimit erreicht.',
        [
          {
            text: info?.canUpgrade ? 'Plan upgraden' : 'OK',
            onPress: () => {
              if (info?.canUpgrade) {
                router.push('/subscription');
              } else {
                router.back();
              }
            }
          }
        ]
      );
    }
  }, [user, canUseSimulation]); // Removed subscriptionStatus and getSubscriptionInfo to prevent re-render loop

  // Handle navigation away from page with immediate cleanup
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive) {
        e.preventDefault();
        e.returnValue = 'Simulation läuft. Möchten Sie wirklich die Seite verlassen?';
        return e.returnValue;
      }
    };

    // Enhanced visibility change handler for navigation blocking
    const handleVisibilityChange = () => {
      if (timerActive && (document.visibilityState === 'hidden' || document.hidden)) {
        console.log('🚫 FSP: Attempted to leave page during simulation - BLOCKED');
        // For mobile apps, prevent backgrounding during simulation
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Simulation läuft',
            'Sie können die App nicht verlassen, während die Simulation läuft.',
            [{ text: 'OK' }]
          );
        }
        return false;
      }
    };

    // Handle route changes - BLOCK during active simulation
    const handlePopState = (e: PopStateEvent) => {
      if (timerActive) {
        console.log('🚫 FSP: Navigation blocked - simulation in progress');
        e.preventDefault();
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
        Alert.alert(
          'Simulation läuft',
          'Sie können die Seite nicht verlassen, während die Simulation läuft.',
          [{ text: 'OK' }]
        );
        return false;
      }
    };

    if (Platform.OS === 'web') {
      if (timerActive) {
        // Block all navigation during simulation
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Add history state to block back button
        window.history.pushState(null, '', window.location.href);
      }

      // Add listeners for navigation blocking
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


  // FSP Simulation inline instructions content
  const fspInstructions = [
    {
      id: 'overview',
      title: 'Überblick',
      content: (
        <InlineContent>
          <Section title="🏥 Was ist die FSP-Simulation?">
            <Paragraph>
              Willkommen zu Ihrem <BoldText>Fachsprachprüfungs-Training</BoldText>! Diese realistische Simulation bereitet Sie optimal auf die FSP vor.
            </Paragraph>

            <HighlightBox type="info">
              🎯 <BoldText>Hauptzweck:</BoldText> Authentische Prüfungserfahrung sammeln und Selbstvertrauen aufbauen
            </HighlightBox>

            <Paragraph>
              <BoldText>Ihre Vorteile auf einen Blick:</BoldText>
            </Paragraph>

            <View style={{ marginLeft: 16 }}>
              <Paragraph>• Realistische Patientengespräche</Paragraph>
              <Paragraph>• Professionelle Prüfersituationen</Paragraph>
              <Paragraph>• Sofortiges, detailliertes Feedback</Paragraph>
              <Paragraph>• Gezieltes Kompetenz-Training</Paragraph>
            </View>

            <InfoBox>
              📋 Diese Simulation testet Ihre medizinische Kommunikationskompetenz in authentischen Situationen
            </InfoBox>
          </Section>
        </InlineContent>
      )
    },
    {
      id: 'process',
      title: 'Ablauf',
      content: (
        <InlineContent>
          <Section title="📋 Simulation in 4 Schritten">
            <Step
              number="1"
              title="🔐 Benutzer-ID Verifizierung"
              description="Geben Sie zunächst Ihre zugewiesene Benutzer-ID an"
              details={[
                "Sichert korrekte Zuordnung zu Ihrem Konto",
                "Ermöglicht personalisierte Fortschrittsverfolgung"
              ]}
            />

            <Step
              number="2"
              title="📂 Fallauswahl"
              description="Wählen Sie gezielt medizinische Fälle zum Training"
              details={[
                "Auswahl nach <BoldText>Fachgebiet</BoldText>: Innere Medizin, Notfall, Neurologie",
                "Fokus auf persönliche Schwerpunkte möglich"
              ]}
            />

            <Step
              number="3"
              title="👨‍⚕️ Patientenanamnese"
              description={
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text>Führen Sie ein authentisches Patientengespräch</Text>
                  <TimeBadge>(10 Min)</TimeBadge>
                </View>
              }
              details={[
                "<BoldText>Start:</BoldText> Professionelle Begrüßung auf Deutsch",
                "<BoldText>Während:</BoldText> Vollständige Anamnese erheben (Hauptbeschwerde, Symptome, Vorgeschichte, Medikation, Allergien)",
                "<BoldText>Ende:</BoldText> <BoldText>Sagen Sie 'Ich bin fertig'</BoldText> zum Abschluss",
                "Automatische Übertragung zur Auswertung"
              ]}
            />

            <Step
              number="4"
              title="👩‍⚕️ Prüfergespräch"
              description={
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text>Gespräch mit Dr. Hoffmann (Oberarzt)</Text>
                  <TimeBadge>(10 Min)</TimeBadge>
                </View>
              }
              details={[
                "<BoldText>Vorstellung:</BoldText> Berichten Sie über Ihren Hintergrund",
                "<BoldText>Fallbesprechung:</BoldText> Diskutieren Sie Diagnose und Behandlung",
                "<BoldText>Fachwissen:</BoldText> Medizinische Terminologie anwenden",
                "<BoldText>Ende:</BoldText> <BoldText>Sagen Sie 'Ich bin fertig'</BoldText> oder <BoldText>'Können wir das beenden?'</BoldText>"
              ]}
            />
          </Section>
        </InlineContent>
      )
    },
    {
      id: 'evaluation',
      title: 'Bewertung',
      content: (
        <InlineContent>
          <Section title="📊 Ihre Auswertung">
            <Paragraph>
              Nach der Simulation erhalten Sie eine detaillierte Analyse im <BoldText>Fortschrittsbereich</BoldText> Ihres Kontos.
            </Paragraph>

            <HighlightBox type="success">
              ⚡ <BoldText>Schnelle Auswertung:</BoldText> Ergebnisse innerhalb weniger Minuten verfügbar
            </HighlightBox>

            <Step
              number="✅"
              title="Stärkenanalyse"
              description="Ihre erkannten Kompetenzen:"
              details={[
                "Kommunikationsstärken identifiziert",
                "Fachliche Kompetenz bestätigt",
                "Erfolgreiche Gesprächsführung dokumentiert"
              ]}
            />

            <Step
              number="📈"
              title="Optimierungsfelder"
              description="Gezielte Verbesserungsempfehlungen:"
              details={[
                "Konkrete Sprachkorrekturen",
                "Terminologie-Feedback",
                "Kommunikationstechniken verfeinern"
              ]}
            />

            <Step
              number="💡"
              title="Nächste Schritte"
              description="Ihr persönlicher Erfolgsplan:"
              details={[
                "Individuell abgestimmte Übungen",
                "Zusätzliche Lernressourcen",
                "Praxis-Tipps für die echte Prüfung"
              ]}
            />
          </Section>

          <Section title="⏱️ Zeitplan im Überblick">
            <View style={{ backgroundColor: 'rgba(181, 87, 64, 0.05)', padding: 16, borderRadius: 12, marginVertical: 8 }}>
              <TimeItem label="📅 Gesamtdauer" time="20 Minuten" />
              <TimeItem label="👨‍⚕️ Patientenanamnese" time="10 Minuten" />
              <TimeItem label="👩‍⚕️ Prüfergespräch" time="10 Minuten" />
              <TimeItem label="📊 Auswertung verfügbar" time="2-5 Minuten nach Abschluss" />
            </View>
          </Section>
        </InlineContent>
      )
    },
    {
      id: 'tips',
      title: 'Tipps',
      content: (
        <InlineContent>
          <Section title="💡 Erfolgstipps">
            <HighlightBox type="warning">
              🎯 <BoldText>Profi-Strategien für maximalen Lernerfolg</BoldText>
            </HighlightBox>

            <View style={{ marginVertical: 8 }}>
              <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#22c55e' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#16a34a', marginBottom: 8 }}>1. 🗣️ Natürlich kommunizieren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Sprechen Sie authentisch</BoldText> – führen Sie ein echtes Gespräch, kein auswendig gelerntes Skript.
                </Text>
              </View>

              <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#2563eb', marginBottom: 8 }}>2. ⚕️ Fachsprache demonstrieren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Zeigen Sie Ihr medizinisches Deutsch</BoldText> – verwenden Sie präzise Fachterminologie souverän.
                </Text>
              </View>

              <View style={{ backgroundColor: 'rgba(251, 146, 60, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#fb923c' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ea580c', marginBottom: 8 }}>3. ⏰ Effizient strukturieren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Gründlich, aber zeitbewusst</BoldText> – alle wichtigen Punkte in der verfügbaren Zeit abdecken.
                </Text>
              </View>

              <View style={{ backgroundColor: 'rgba(168, 85, 247, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#a855f7' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#9333ea', marginBottom: 8 }}>4. 🧘‍♀️ Ruhe bewahren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Entspannt bleiben</BoldText> – die Simulation unterstützt Ihr Lernen und Ihre Entwicklung.
                </Text>
              </View>
            </View>
          </Section>

          <Section title="🚀 Jetzt starten?">
            <Paragraph>
              Jede Simulation bringt Sie Ihrem FSP-Erfolg näher. <BoldText>Vertrauen Sie dem Prozess</BoldText> – jede Übung stärkt Ihre Kompetenz!
            </Paragraph>

            <HighlightBox type="success">
              🌟 <BoldText>Bereit zum Training?</BoldText> Halten Sie Ihre Benutzer-ID bereit und starten Sie Ihr professionelles FSP-Training!
            </HighlightBox>

            <View style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(184, 126, 112, 0.05)', borderRadius: 8 }}>
              <Text style={{ fontSize: 13, fontStyle: 'italic', color: '#B87E70', lineHeight: 20 }}>
                💼 Diese Simulation bietet authentische Prüfungserfahrung mit sofortigem, professionellem Feedback für optimale FSP-Vorbereitung.
              </Text>
            </View>
          </Section>
        </InlineContent>
      )
    }
  ];

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

        <View style={styles.headerSpacer} />
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
        {/* Inline Instructions Panel */}
        <View style={styles.instructionsContainer}>
          <InlineInstructions tabs={fspInstructions} />
        </View>

        {/* Widget Area */}
        <View style={styles.widgetArea}>
          {/* Widget loads here automatically */}
        </View>
      </View>
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
  headerSpacer: {
    width: 40, // Same width as back button for symmetry
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
    flexDirection: 'column',
  },
  instructionsContainer: {
    flex: 2, // Takes up 2/3 of available space
    minHeight: 300,
  },
  widgetArea: {
    flex: 1, // Takes up 1/3 of available space
    minHeight: 200,
    // This area is where the Voiceflow widget will appear
  },
});